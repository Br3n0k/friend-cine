import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs-extra';
import { VIDEO_CONFIG, UPLOAD_CONFIG } from '../src/utils/constants.js';
import logger, { logVideoConversion } from '../src/utils/logger.js';
import FileManager from './utils/file-manager.js';

/**
 * Sistema de Conversão de Vídeo Focado em MKV
 * Arquitetura modular para processamento otimizado com qualidade superior
 */
export class VideoConverter {
  constructor(io = null) {
    this.fileManager = new FileManager();
    this.config = VIDEO_CONFIG;
    this.processingQueue = new Map(); // Fila de processamento
    this.activeJobs = new Map(); // Jobs ativos com detalhes completos
    this.maxConcurrentJobs = this.config.PROCESSING.MAX_CONCURRENT_JOBS;
    this.io = io; // Socket.io para progresso em tempo real
    
    // Inicialização
    this.init();
  }

  async init() {
    try {
      await this.validateFFmpeg();
      await this.cleanupOrphanedJobs();
      logger.info('🎬 VideoConverter inicializado com sucesso');
    } catch (error) {
      logger.error('❌ Erro na inicialização do VideoConverter:', error);
    }
  }

  // Emitir progresso via Socket.io
  emitProgress(fileId, data) {
    if (this.io) {
      this.io.emit('video-progress', {
        fileId,
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Valida se FFmpeg está disponível e suas capacidades
   */
  async validateFFmpeg() {
    return new Promise((resolve, reject) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          logger.error('❌ FFmpeg não encontrado:', err.message);
          this.ffmpegAvailable = false;
          resolve(false);
        } else {
          // Verificar codecs específicos necessários
          const requiredCodecs = ['libx265', 'libx264', 'libvpx-vp9', 'aac', 'flac', 'libopus'];
          this.availableCodecs = Object.keys(formats);
          this.ffmpegAvailable = true;
          
          logger.info('✅ FFmpeg detectado com sucesso');
          logger.info(`📋 Codecs disponíveis: ${this.availableCodecs.length}`);
          resolve(true);
        }
      });
    });
  }

  /**
   * Limpa jobs órfãos de conversões anteriores
   */
  async cleanupOrphanedJobs() {
    try {
      const processingDir = this.fileManager.paths.PROCESSING;
      if (await fs.exists(processingDir)) {
        const files = await fs.readdir(processingDir);
        
        for (const file of files) {
          if (file.endsWith('.converting') || file.endsWith('.lock')) {
            const lockPath = path.join(processingDir, file);
            await fs.remove(lockPath);
            logger.info(`🧹 Job órfão removido: ${file}`);
          }
        }
      }
    } catch (error) {
      logger.error('⚠️ Erro ao limpar jobs órfãos:', error);
    }
  }

  /**
   * Extrai metadados completos do vídeo
   */
  async extractMetadata(inputPath) {
    return new Promise((resolve, reject) => {
      logger.info(`🔍 Extraindo metadados: ${path.basename(inputPath)}`);
      
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          logger.error('❌ Erro ao extrair metadados:', err.message);
          reject(err);
          return;
        }

        try {
          const videoStreams = metadata.streams.filter(s => s.codec_type === 'video');
          const audioStreams = metadata.streams.filter(s => s.codec_type === 'audio');
          const subtitleStreams = metadata.streams.filter(s => s.codec_type === 'subtitle');

          // Análise detalhada das trilhas de áudio
          const audioAnalysis = audioStreams.map((stream, index) => ({
            index,
            codec: stream.codec_name,
            language: stream.tags?.language || 'und',
            title: stream.tags?.title || `Audio Track ${index + 1}`,
            channels: stream.channels || 2,
            bitrate: stream.bit_rate ? parseInt(stream.bit_rate) : null,
            sampleRate: stream.sample_rate ? parseInt(stream.sample_rate) : null,
            duration: parseFloat(stream.duration) || 0
          }));

          // Análise das legendas
          const subtitleAnalysis = subtitleStreams.map((stream, index) => ({
            index,
            codec: stream.codec_name,
            language: stream.tags?.language || 'und',
            title: stream.tags?.title || `Subtitle ${index + 1}`,
            forced: stream.disposition?.forced === 1,
            default: stream.disposition?.default === 1
          }));

          // Análise do vídeo
          const videoAnalysis = videoStreams.length > 0 ? {
            codec: videoStreams[0].codec_name,
            width: videoStreams[0].width,
            height: videoStreams[0].height,
            frameRate: eval(videoStreams[0].r_frame_rate),
            bitrate: videoStreams[0].bit_rate ? parseInt(videoStreams[0].bit_rate) : null,
            duration: parseFloat(videoStreams[0].duration) || parseFloat(metadata.format.duration),
            pixelFormat: videoStreams[0].pix_fmt
          } : null;

          const completeMetadata = {
            format: metadata.format,
            video: videoAnalysis,
            audio: audioAnalysis,
            subtitles: subtitleAnalysis,
            chapters: metadata.chapters || [],
            globalMetadata: metadata.format.tags || {},
            ffmpegAvailable: true,
            extractedAt: new Date().toISOString()
          };

          logger.info(`📊 Metadados extraídos: ${audioAnalysis.length} áudio(s), ${subtitleAnalysis.length} legenda(s)`);
          resolve(completeMetadata);
        } catch (parseError) {
          logger.error('❌ Erro ao analisar metadados:', parseError);
          reject(parseError);
        }
      });
    });
  }

  /**
   * Determina a melhor qualidade baseada na resolução original
   */
  determineBestQuality(metadata) {
    if (!metadata.video) return '1080p';
    
    const { width, height } = metadata.video;
    
    if (width >= 3840 && height >= 2160) return '4k';
    if (width >= 1920 && height >= 1080) return '1080p';
    if (width >= 1280 && height >= 720) return '720p';
    return '480p';
  }

  /**
   * Converte para MKV Master (formato principal)
   */
  async convertToMKVMaster(inputPath, fileInfo, metadata) {
    const quality = this.determineBestQuality(metadata);
    const outputFileName = `${fileInfo.fileId}_master.mkv`;
    const tempOutputPath = path.join(this.fileManager.paths.TEMP, outputFileName);
    const lockFile = tempOutputPath + '.converting';

    return new Promise((resolve, reject) => {
      logger.info(`🎯 Convertendo para MKV Master [${quality}]: ${fileInfo.originalName}`);
      
      // Criar lock file
      fs.writeFileSync(lockFile, JSON.stringify({
        startTime: Date.now(),
        inputFile: fileInfo.originalName,
        outputFile: outputFileName,
        quality,
        type: 'mkv_master'
      }));

      const qualityProfile = this.config.QUALITY_PROFILES[quality.toUpperCase()];
      const mkvConfig = this.config.MKV_MASTER;

      const command = ffmpeg(inputPath)
        .videoCodec(mkvConfig.VIDEO_CODEC)
        .outputOptions([
          `-crf ${mkvConfig.CRF}`,
          `-preset ${mkvConfig.PRESET}`,
          `-tag:v hev1`, // Para compatibilidade H.265
          `-movflags +faststart`,
          `-map 0:v:0` // Mapear primeiro stream de vídeo
        ])
        .size(`${qualityProfile.width}x${qualityProfile.height}`);

      // Mapear TODAS as trilhas de áudio preservando qualidade máxima
      if (metadata.audio && metadata.audio.length > 0) {
        logger.info(`🎵 Preservando ${metadata.audio.length} trilha(s) de áudio em alta qualidade`);
        
        metadata.audio.forEach((audioTrack, index) => {
          const useFlac = audioTrack.channels >= 2 && !audioTrack.codec?.includes('aac');
          const codec = useFlac ? mkvConfig.AUDIO_CODEC : 'aac';
          const bitrate = useFlac ? mkvConfig.AUDIO_BITRATE : '320k';

          command.outputOptions([
            `-map 0:a:${index}`,
            `-c:a:${index} ${codec}`,
            `-b:a:${index} ${bitrate}`,
            `-metadata:s:a:${index}`,
            `language=${audioTrack.language}`,
            `-metadata:s:a:${index}`,
            `title=${audioTrack.title.replace(/["\s]/g, '_')}`
          ]);
        });
      }

      // Mapear legendas internas
      if (metadata.subtitles && metadata.subtitles.length > 0) {
        logger.info(`📝 Preservando ${metadata.subtitles.length} legenda(s)`);
        
        metadata.subtitles.forEach((subtitle, index) => {
          // Converter legendas para formato compatível com MKV
          const outputCodec = ['srt', 'ass', 'ssa'].includes(subtitle.codec) ? subtitle.codec : 'srt';
          
          command.outputOptions([
            `-map 0:s:${index}`,
            `-c:s:${index} ${outputCodec}`,
            `-metadata:s:s:${index}`,
            `language=${subtitle.language}`,
            `-metadata:s:s:${index}`,
            `title=${subtitle.title.replace(/["\s]/g, '_')}`
          ]);

          if (subtitle.forced) {
            command.outputOptions(`-disposition:s:${index} forced`);
          }
          if (subtitle.default) {
            command.outputOptions(`-disposition:s:${index} default`);
          }
        });
      }

      // Preservar capítulos
      if (metadata.chapters && metadata.chapters.length > 0) {
        logger.info(`📖 Preservando ${metadata.chapters.length} capítulo(s)`);
        command.outputOptions('-map_chapters 0');
      }

      // Metadados globais
      command.outputOptions([
        `-metadata`,
        `title=${metadata.globalMetadata.title || fileInfo.originalName}`,
        `-metadata`,
        `encoder=Friend-Cine_MKV_Master_v2.0`,
        `-metadata`,
        `creation_time=${new Date().toISOString()}`
      ]);

      command
        .output(tempOutputPath)
        .on('start', (commandLine) => {
          logger.info(`🚀 Comando FFmpeg: ${commandLine}`);
        })
        .on('progress', (progress) => {
          const percent = Math.round(progress.percent || 0);
          if (percent % 5 === 0) { // Log a cada 5%
            logger.info(`📊 Progresso MKV Master: ${percent}%`);
            
            // Emitir progresso detalhado da conversão MKV
            this.emitProgress(fileInfo.fileId, {
              status: 'converting_master',
              step: `Convertendo MKV Master: ${percent}%`,
              progress: 15 + (percent * 0.45), // 15% base + 45% da conversão
              details: `H.265/HEVC ${quality} - ${percent}% concluído`
            });
          }
        })
        .on('end', async () => {
          try {
            logger.info(`✅ Conversão MKV Master concluída: ${outputFileName}`);
            
            // Mover para diretório master
            const masterInfo = await this.fileManager.saveMaster({
              ...fileInfo,
              path: tempOutputPath
            }, quality);

            // Salvar metadados
            await this.fileManager.saveMetadata(masterInfo, metadata);

            // Limpar arquivos temporários
            await this.cleanup(lockFile, tempOutputPath);
            
            logVideoConversion(fileInfo.originalName, outputFileName, true, metadata.video?.duration);
            resolve(masterInfo);
          } catch (error) {
            logger.error(`❌ Erro ao finalizar conversão MKV: ${error.message}`);
            await this.cleanup(lockFile, tempOutputPath);
            reject(error);
          }
        })
        .on('error', async (err) => {
          logger.error(`❌ Erro na conversão MKV Master: ${err.message}`);
          await this.cleanup(lockFile, tempOutputPath);
          logVideoConversion(fileInfo.originalName, outputFileName, false, null, err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Gera versões otimizadas para web a partir do MKV Master
   */
  async generateWebVersions(masterInfo, metadata) {
    const webVersions = [];
    
    try {
      // MP4 para compatibilidade universal
      logger.info('🌐 Gerando versão MP4 para web...');
      const mp4Version = await this.convertToWebMP4(masterInfo, metadata);
      webVersions.push(mp4Version);

      // WebM para navegadores modernos (opcional)
      try {
        logger.info('🌐 Gerando versão WebM...');
        const webmVersion = await this.convertToWebM(masterInfo, metadata);
        webVersions.push(webmVersion);
      } catch (webmError) {
        logger.warn('⚠️ Conversão WebM falhou, continuando apenas com MP4:', webmError.message);
      }

      // Versões móveis em qualidades menores se o original for muito grande
      if (metadata.video && metadata.video.height > 720) {
        logger.info('📱 Gerando versão móvel 720p...');
        const mobileVersion = await this.convertToMobile(masterInfo, metadata, '720p');
        webVersions.push(mobileVersion);
      }

      logger.info(`✅ ${webVersions.length} versão(ões) web gerada(s) com sucesso`);
      return webVersions;
    } catch (error) {
      logger.error('❌ Erro ao gerar versões web:', error);
      throw error;
    }
  }

  /**
   * Converte MKV Master para MP4 web-compatível
   */
  async convertToWebMP4(masterInfo, metadata, quality = null) {
    const targetQuality = quality || this.determineBestQuality(metadata);
    const outputFileName = `${masterInfo.fileId}_${targetQuality}.mp4`;
    const tempOutputPath = path.join(this.fileManager.paths.TEMP, outputFileName);
    const lockFile = tempOutputPath + '.converting';

    return new Promise((resolve, reject) => {
      logger.info(`🎯 Convertendo para MP4 Web [${targetQuality}]: ${masterInfo.originalName}`);
      
      fs.writeFileSync(lockFile, JSON.stringify({
        startTime: Date.now(),
        inputFile: path.basename(masterInfo.path),
        outputFile: outputFileName,
        quality: targetQuality,
        type: 'web_mp4'
      }));

      const qualityProfile = this.config.QUALITY_PROFILES[targetQuality.toUpperCase()];
      const mp4Config = this.config.WEB_STREAMING.MP4;

      const command = ffmpeg(masterInfo.path)
        .videoCodec(mp4Config.VIDEO_CODEC)
        .outputOptions([
          `-crf ${mp4Config.CRF}`,
          `-preset ${mp4Config.PRESET}`,
          `-profile:v ${mp4Config.PROFILE}`,
          `-level ${mp4Config.LEVEL}`,
          `-movflags +faststart`,
          `-map 0:v:0`
        ])
        .videoBitrate(qualityProfile.bitrate)
        .size(`${qualityProfile.width}x${qualityProfile.height}`);

      // Otimizar áudio para web (AAC)
      if (metadata.audio && metadata.audio.length > 0) {
        // Para web, usar apenas a primeira trilha ou a em português/inglês
        const primaryAudio = this.selectPrimaryAudioTrack(metadata.audio);
        
        command.outputOptions([
          `-map 0:a:${primaryAudio.index}`,
          `-c:a ${mp4Config.AUDIO_CODEC}`,
          `-b:a ${mp4Config.AUDIO_BITRATE}`,
          `-ac 2`, // Forçar stereo para compatibilidade
          `-metadata:s:a:0 language=${primaryAudio.language}`,
          `-metadata:s:a:0 title="${primaryAudio.title}"`
        ]);
      }

      // Metadados otimizados para web
      command.outputOptions([
        `-metadata title="${metadata.globalMetadata.title || masterInfo.originalName}"`,
        `-metadata encoder="Friend-Cine Web Optimized"`
      ]);

      command
        .output(tempOutputPath)
        .on('progress', (progress) => {
          const percent = Math.round(progress.percent || 0);
          if (percent % 10 === 0) {
            logger.info(`📊 Progresso MP4 Web: ${percent}%`);
          }
        })
        .on('end', async () => {
          try {
            logger.info(`✅ Conversão MP4 Web concluída: ${outputFileName}`);
            
            const webInfo = await this.fileManager.saveWebOptimized({
              ...masterInfo,
              path: tempOutputPath
            }, 'mp4', targetQuality);

            await this.cleanup(lockFile, tempOutputPath);
            logVideoConversion(masterInfo.originalName, outputFileName, true, metadata.video?.duration);
            resolve(webInfo);
          } catch (error) {
            await this.cleanup(lockFile, tempOutputPath);
            reject(error);
          }
        })
        .on('error', async (err) => {
          logger.error(`❌ Erro na conversão MP4 Web: ${err.message}`);
          await this.cleanup(lockFile, tempOutputPath);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Converte MKV Master para WebM
   */
  async convertToWebM(masterInfo, metadata) {
    const quality = this.determineBestQuality(metadata);
    const outputFileName = `${masterInfo.fileId}_${quality}.webm`;
    const tempOutputPath = path.join(this.fileManager.paths.TEMP, outputFileName);
    const lockFile = tempOutputPath + '.converting';

    return new Promise((resolve, reject) => {
      logger.info(`🎯 Convertendo para WebM [${quality}]: ${masterInfo.originalName}`);
      
      fs.writeFileSync(lockFile, JSON.stringify({
        startTime: Date.now(),
        inputFile: path.basename(masterInfo.path),
        outputFile: outputFileName,
        quality,
        type: 'web_webm'
      }));

      const qualityProfile = this.config.QUALITY_PROFILES[quality.toUpperCase()];
      const webmConfig = this.config.WEB_STREAMING.WEBM;

      const command = ffmpeg(masterInfo.path)
        .videoCodec(webmConfig.VIDEO_CODEC)
        .outputOptions([
          `-crf ${webmConfig.CRF}`,
          `-speed 1`,
          `-row-mt 1`,
          `-map 0:v:0`
        ])
        .videoBitrate(qualityProfile.bitrate)
        .size(`${qualityProfile.width}x${qualityProfile.height}`);

      // Áudio otimizado para WebM
      if (metadata.audio && metadata.audio.length > 0) {
        const primaryAudio = this.selectPrimaryAudioTrack(metadata.audio);
        
        command.outputOptions([
          `-map 0:a:${primaryAudio.index}`,
          `-c:a ${webmConfig.AUDIO_CODEC}`,
          `-b:a ${webmConfig.AUDIO_BITRATE}`
        ]);
      }

      command
        .output(tempOutputPath)
        .on('progress', (progress) => {
          const percent = Math.round(progress.percent || 0);
          if (percent % 10 === 0) {
            logger.info(`📊 Progresso WebM: ${percent}%`);
          }
        })
        .on('end', async () => {
          try {
            logger.info(`✅ Conversão WebM concluída: ${outputFileName}`);
            
            const webmInfo = await this.fileManager.saveWebOptimized({
              ...masterInfo,
              path: tempOutputPath
            }, 'webm', quality);

            await this.cleanup(lockFile, tempOutputPath);
            resolve(webmInfo);
          } catch (error) {
            await this.cleanup(lockFile, tempOutputPath);
            reject(error);
          }
        })
        .on('error', async (err) => {
          logger.error(`❌ Erro na conversão WebM: ${err.message}`);
          await this.cleanup(lockFile, tempOutputPath);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Versão móvel otimizada
   */
  async convertToMobile(masterInfo, metadata, targetQuality = '720p') {
    const outputFileName = `${masterInfo.fileId}_mobile_${targetQuality}.mp4`;
    const tempOutputPath = path.join(this.fileManager.paths.TEMP, outputFileName);
    const lockFile = tempOutputPath + '.converting';

    return new Promise((resolve, reject) => {
      logger.info(`📱 Convertendo para Mobile [${targetQuality}]: ${masterInfo.originalName}`);
      
      fs.writeFileSync(lockFile, JSON.stringify({
        startTime: Date.now(),
        inputFile: path.basename(masterInfo.path),
        outputFile: outputFileName,
        quality: targetQuality,
        type: 'mobile'
      }));

      const qualityProfile = this.config.QUALITY_PROFILES[targetQuality.toUpperCase()];
      
      const command = ffmpeg(masterInfo.path)
        .videoCodec('libx264')
        .outputOptions([
          '-crf 23',
          '-preset fast',
          '-profile:v baseline',
          '-level 3.1',
          '-movflags +faststart',
          '-map 0:v:0'
        ])
        .videoBitrate(qualityProfile.bitrate)
        .size(`${qualityProfile.width}x${qualityProfile.height}`);

      // Áudio otimizado para móvel
      if (metadata.audio && metadata.audio.length > 0) {
        const primaryAudio = this.selectPrimaryAudioTrack(metadata.audio);
        
        command.outputOptions([
          `-map 0:a:${primaryAudio.index}`,
          '-c:a aac',
          '-b:a 128k',
          '-ac 2'
        ]);
      }

      command
        .output(tempOutputPath)
        .on('end', async () => {
          try {
            logger.info(`✅ Conversão Mobile concluída: ${outputFileName}`);
            
            const mobileInfo = await this.fileManager.saveWebOptimized({
              ...masterInfo,
              path: tempOutputPath
            }, 'mp4', 'mobile');

            await this.cleanup(lockFile, tempOutputPath);
            resolve(mobileInfo);
          } catch (error) {
            await this.cleanup(lockFile, tempOutputPath);
            reject(error);
          }
        })
        .on('error', async (err) => {
          logger.error(`❌ Erro na conversão Mobile: ${err.message}`);
          await this.cleanup(lockFile, tempOutputPath);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Seleciona a trilha de áudio primária (português > inglês > primeira disponível)
   */
  selectPrimaryAudioTrack(audioTracks) {
    // Prioridade: português, inglês, primeira disponível
    const priorities = ['por', 'pt', 'pt-br', 'eng', 'en'];
    
    for (const lang of priorities) {
      const track = audioTracks.find(a => a.language.toLowerCase().includes(lang));
      if (track) return track;
    }
    
    return audioTracks[0]; // Primeira disponível como fallback
  }

  /**
   * Gera thumbnails do vídeo
   */
  async generateThumbnails(masterInfo, metadata) {
    try {
      const duration = metadata.video?.duration || 60;
      const thumbnailTimes = [
        Math.floor(duration * 0.1),  // 10%
        Math.floor(duration * 0.25), // 25% 
        Math.floor(duration * 0.5),  // 50%
        Math.floor(duration * 0.75)  // 75%
      ];

      const thumbnailBuffers = {};
      
      for (const [size, dimensions] of Object.entries({
        small: '320x180',
        medium: '640x360', 
        large: '1280x720',
        poster: '1920x1080'
      })) {
        const tempPath = path.join(this.fileManager.paths.TEMP, `${masterInfo.fileId}_${size}_%d.jpg`);
        
        await new Promise((resolve, reject) => {
          ffmpeg(masterInfo.path)
            .seekInput(thumbnailTimes[0]) // Usar primeiro tempo como principal
            .outputOptions([
              '-vframes 1',
              '-q:v 2'
            ])
            .size(dimensions)
            .output(tempPath.replace('%d', '1'))
            .on('end', resolve)
            .on('error', reject)
            .run();
        });

        // Ler arquivo gerado
        const generatedPath = tempPath.replace('%d', '1');
        if (await fs.exists(generatedPath)) {
          thumbnailBuffers[size] = await fs.readFile(generatedPath);
          await fs.remove(generatedPath);
        }
      }

      const savedThumbnails = await this.fileManager.saveThumbnails(masterInfo, thumbnailBuffers);
      logger.info(`📸 ${Object.keys(savedThumbnails).length} thumbnail(s) gerado(s)`);
      
      return savedThumbnails;
    } catch (error) {
      logger.error('❌ Erro ao gerar thumbnails:', error);
      return {};
    }
  }

  /**
   * Extrai legendas internas
   */
  async extractSubtitles(masterInfo, metadata) {
    try {
      if (!metadata.subtitles || metadata.subtitles.length === 0) {
        return [];
      }

      const extractedSubtitles = [];

      for (const [index, subtitle] of metadata.subtitles.entries()) {
        const outputFile = path.join(
          this.fileManager.paths.TEMP, 
          `${masterInfo.fileId}_${subtitle.language}.srt`
        );

        try {
          await new Promise((resolve, reject) => {
            ffmpeg(masterInfo.path)
              .outputOptions([
                `-map 0:s:${index}`,
                '-c:s srt'
              ])
              .output(outputFile)
              .on('end', resolve)
              .on('error', reject)
              .run();
          });

          if (await fs.exists(outputFile)) {
            const content = await fs.readFile(outputFile, 'utf8');
            await fs.remove(outputFile);

            extractedSubtitles.push({
              language: subtitle.language,
              title: subtitle.title,
              format: 'srt',
              content
            });
          }
        } catch (extractError) {
          logger.warn(`⚠️ Erro ao extrair legenda ${subtitle.language}:`, extractError.message);
        }
      }

      if (extractedSubtitles.length > 0) {
        const savedSubtitles = await this.fileManager.saveSubtitles(masterInfo, extractedSubtitles);
        logger.info(`📝 ${savedSubtitles.length} legenda(s) extraída(s)`);
        return savedSubtitles;
      }

      return [];
    } catch (error) {
      logger.error('❌ Erro ao extrair legendas:', error);
      return [];
    }
  }

  /**
   * Processo principal de conversão completa
   */
  async processVideo(uploadInfo) {
    const jobId = `job_${uploadInfo.fileId}_${Date.now()}`;
    
    try {
      logger.info(`🎬 Iniciando processamento completo: ${uploadInfo.originalName}`);
      
      // Criar job completo com tracking detalhado
      const jobData = {
        jobId,
        fileId: uploadInfo.fileId,
        fileName: uploadInfo.originalName,
        status: 'starting',
        progress: 0,
        step: 'Preparando processamento...',
        startTime: Date.now(),
        fileInfo: uploadInfo
      };
      
      this.processingQueue.set(jobId, { status: 'starting', fileInfo: uploadInfo });
      this.activeJobs.set(uploadInfo.fileId, jobData);
      
      // Emitir progresso inicial
      this.emitProgress(uploadInfo.fileId, {
        status: 'starting',
        step: 'Preparando processamento...',
        progress: 0,
        fileName: uploadInfo.originalName
      });

      // 1. Mover para processamento
      this.updateJobProgress(uploadInfo.fileId, {
        status: 'preparing',
        step: 'Movendo arquivo para processamento...',
        progress: 5
      });
      const processingInfo = await this.fileManager.moveToProcessing(uploadInfo);
      this.processingQueue.set(jobId, { status: 'extracting_metadata', fileInfo: processingInfo });

      // 2. Extrair metadados completos
      this.updateJobProgress(uploadInfo.fileId, {
        status: 'extracting_metadata',
        step: 'Analisando metadados do vídeo...',
        progress: 10
      });
      const metadata = await this.extractMetadata(processingInfo.path);
      
      // 3. Converter para MKV Master (formato principal)
      this.updateJobProgress(uploadInfo.fileId, {
        status: 'converting_master',
        step: 'Convertendo para MKV Master (H.265/HEVC)...',
        progress: 15,
        details: `Qualidade: ${this.determineBestQuality(metadata)}, Áudios: ${metadata.audio?.length || 0}, Legendas: ${metadata.subtitles?.length || 0}`
      });
      this.processingQueue.set(jobId, { status: 'converting_master', fileInfo: processingInfo });
      const masterInfo = await this.convertToMKVMaster(processingInfo.path, processingInfo, metadata);

      // 4. Gerar versões web otimizadas
      this.updateJobProgress(uploadInfo.fileId, {
        status: 'generating_web_versions',
        step: 'Gerando versões web otimizadas...',
        progress: 60
      });
      this.processingQueue.set(jobId, { status: 'generating_web_versions', fileInfo: masterInfo });
      const webVersions = await this.generateWebVersions(masterInfo, metadata);

      // 5. Gerar thumbnails
      this.updateJobProgress(uploadInfo.fileId, {
        status: 'generating_thumbnails',
        step: 'Gerando thumbnails...',
        progress: 80
      });
      this.processingQueue.set(jobId, { status: 'generating_thumbnails', fileInfo: masterInfo });
      const thumbnails = await this.generateThumbnails(masterInfo, metadata);

      // 6. Extrair legendas
      this.updateJobProgress(uploadInfo.fileId, {
        status: 'extracting_subtitles',
        step: 'Extraindo legendas...',
        progress: 90
      });
      this.processingQueue.set(jobId, { status: 'extracting_subtitles', fileInfo: masterInfo });
      const subtitles = await this.extractSubtitles(masterInfo, metadata);

      // 7. Limpeza final
      this.updateJobProgress(uploadInfo.fileId, {
        status: 'finalizing',
        step: 'Finalizando processamento...',
        progress: 95
      });
      await this.fileManager.cleanupTemp(processingInfo.path);

      const result = {
        success: true,
        fileId: masterInfo.fileId,
        originalName: uploadInfo.originalName,
        master: masterInfo,
        webVersions,
        thumbnails,
        subtitles,
        metadata,
        processedAt: new Date().toISOString(),
        processingTime: Date.now() - uploadInfo.uploadedAt
      };

      // Emitir conclusão
      this.updateJobProgress(uploadInfo.fileId, {
        status: 'completed',
        step: 'Processamento concluído!',
        progress: 100,
        result: {
          masterFile: masterInfo.fileName,
          webVersions: Object.keys(webVersions).length,
          thumbnails: Object.keys(thumbnails).length,
          subtitles: subtitles.length,
          processingTime: result.processingTime
        }
      });

      // Manter job completado por 30 segundos para UI
      setTimeout(() => {
        this.activeJobs.delete(uploadInfo.fileId);
      }, 30000);

      this.processingQueue.delete(jobId);
      logger.info(`✅ Processamento completo concluído: ${uploadInfo.originalName}`);
      
      return result;
    } catch (error) {
      this.processingQueue.set(jobId, { status: 'error', error: error.message });
      logger.error(`❌ Erro no processamento de ${uploadInfo.originalName}:`, error);
      
      // Emitir erro
      this.updateJobProgress(uploadInfo.fileId, {
        status: 'error',
        step: 'Erro no processamento',
        progress: 0,
        error: error.message
      });
      
      // Limpeza em caso de erro
      try {
        await this.fileManager.cleanupTemp(uploadInfo.path);
      } catch (cleanupError) {
        logger.error('❌ Erro na limpeza após falha:', cleanupError);
      }

      // Manter job com erro por 60 segundos para debugging
      setTimeout(() => {
        this.activeJobs.delete(uploadInfo.fileId);
      }, 60000);

      throw error;
    }
  }

  /**
   * Limpa arquivos temporários
   */
  async cleanup(...files) {
    for (const file of files) {
      try {
        if (file && await fs.exists(file)) {
          await fs.remove(file);
        }
      } catch (error) {
        logger.warn(`⚠️ Erro ao limpar ${file}:`, error.message);
      }
    }
  }

  // Método auxiliar para atualizar progresso e estado interno
  updateJobProgress(fileId, updateData) {
    const job = this.activeJobs.get(fileId);
    if (job) {
      Object.assign(job, updateData);
      this.activeJobs.set(fileId, job);
    }
    
    this.emitProgress(fileId, updateData);
  }

  /**
   * Obtém status da fila de processamento
   */
  getProcessingStatus() {
    const activeJobsArray = Array.from(this.activeJobs.values());
    
    return activeJobsArray.map(job => ({
      fileId: job.fileId,
      fileName: job.fileName,
      status: job.status,
      progress: job.progress || 0,
      step: job.step || 'Iniciando...',
      startTime: job.startTime
    }));
  }
}

export default VideoConverter; 
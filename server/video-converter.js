import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs-extra';

// Configurar o caminho do ffmpeg (ajustar conforme sua instalação)
// ffmpeg.setFfmpegPath('ffmpeg'); // Para Windows com ffmpeg no PATH

export class VideoConverter {
  constructor(videosDir) {
    this.videosDir = videosDir;
    this.convertedDir = path.join(videosDir, 'converted');
    fs.ensureDirSync(this.convertedDir);
    
    // Limpar arquivos de lock órfãos na inicialização
    this.cleanupOrphanedLockFiles();
  }

  // Limpar arquivos .converting órfãos (quando servidor for reiniciado durante conversão)
  async cleanupOrphanedLockFiles() {
    try {
      const files = await fs.readdir(this.convertedDir);
      const lockFiles = files.filter(file => file.endsWith('.converting'));
      
      for (const lockFile of lockFiles) {
        const lockPath = path.join(this.convertedDir, lockFile);
        await fs.remove(lockPath);
        console.log(`🧹 Arquivo de lock órfão removido: ${lockFile}`);
      }
      
      if (lockFiles.length > 0) {
        console.log(`✅ ${lockFiles.length} arquivo(s) de lock órfão(s) removido(s)`);
      }
    } catch (error) {
      console.log('⚠️ Erro ao limpar arquivos de lock:', error.message);
    }
  }

  // Verificar se o arquivo é compatível com navegadores
  isWebCompatible(filename) {
    const webCompatibleFormats = ['.mp4', '.webm', '.ogg'];
    const ext = path.extname(filename).toLowerCase();
    return webCompatibleFormats.includes(ext);
  }

  // Verificar informações do vídeo
  async getVideoInfo(inputPath) {
    return new Promise((resolve, reject) => {
      // Tentar diferentes formas de encontrar o ffmpeg
      const ffmpegPaths = [
        'ffmpeg',
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
        process.env.FFMPEG_PATH
      ].filter(Boolean);

      console.log('🔍 Tentando encontrar FFmpeg...');
      
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          console.log('⚠️ FFmpeg não encontrado no PATH atual');
          console.log('💡 Dica: Reinicie o terminal ou IDE para carregar o novo PATH');
          console.log('🔄 Usando modo compatibilidade sem conversão');
          resolve({
            duration: 0,
            videoStreams: [],
            audioStreams: [],
            ffmpegAvailable: false,
            error: err.message
          });
        } else {
          const videoStreams = metadata.streams.filter(stream => stream.codec_type === 'video');
          const audioStreams = metadata.streams.filter(stream => stream.codec_type === 'audio');
          
          // Log detalhado das trilhas de áudio
          console.log('🎵 Trilhas de áudio encontradas:');
          audioStreams.forEach((stream, index) => {
            console.log(`   Trilha ${index}: ${stream.codec_name} - ${stream.tags?.language || 'indefinido'} - ${stream.tags?.title || 'sem título'}`);
          });
          
          resolve({
            duration: metadata.format.duration,
            videoStreams,
            audioStreams,
            format: metadata.format,
            ffmpegAvailable: true,
            allStreams: metadata.streams
          });
        }
      });
    });
  }

  // Converter vídeo preservando TODAS as trilhas de áudio
  async convertToWebFormat(inputPath, outputFilename, videoInfo = null) {
    const outputPath = path.join(this.convertedDir, outputFilename);
    const lockFile = outputPath + '.converting'; // Arquivo de controle
    
    return new Promise((resolve, reject) => {
      console.log(`🔄 Iniciando conversão: ${path.basename(inputPath)} -> ${outputFilename}`);
      
      // Criar arquivo de lock para indicar que conversão está em andamento
      fs.writeFileSync(lockFile, JSON.stringify({
        startTime: Date.now(),
        inputFile: path.basename(inputPath),
        outputFile: outputFilename,
        status: 'converting'
      }));
      
      const command = ffmpeg(inputPath)
        .videoCodec('libx264')
        .videoBitrate('2000k') // Qualidade mais alta
        .size('1920x1080') // Resolução Full HD
        .outputOptions([
          '-preset medium', // Melhor qualidade vs velocidade
          '-crf 20', // Qualidade constante alta (18-24 é considerado visualmente sem perdas)
          '-movflags +faststart', // Otimizar para streaming
          '-profile:v high',
          '-level 4.1',
          '-map 0:v:0', // Mapear primeiro stream de vídeo
        ]);

      // Mapear legendas internas se existirem
      if (videoInfo && videoInfo.allStreams) {
        const subtitleStreams = videoInfo.allStreams.filter(stream => stream.codec_type === 'subtitle');
        if (subtitleStreams.length > 0) {
          console.log(`📝 Encontradas ${subtitleStreams.length} trilha(s) de legenda`);
          subtitleStreams.forEach((stream, index) => {
            // Mapear apenas legendas de texto (SRT, ASS, etc), não imagens (PGS, VobSub)
            if (['srt', 'ass', 'ssa', 'subrip', 'webvtt'].includes(stream.codec_name)) {
              command.outputOptions([
                `-map 0:s:${index}`,
                `-c:s:${index} mov_text` // Codec de legenda para MP4
              ]);
              
              if (stream.tags?.language) {
                command.outputOptions(`-metadata:s:s:${index} language=${stream.tags.language}`);
              }
            }
          });
        }
      }

      // Se temos informações do vídeo, mapear TODAS as trilhas de áudio
      if (videoInfo && videoInfo.audioStreams && videoInfo.audioStreams.length > 0) {
        console.log(`🎵 Preservando ${videoInfo.audioStreams.length} trilha(s) de áudio`);
        
        videoInfo.audioStreams.forEach((stream, index) => {
          command.outputOptions([
            `-map 0:a:${index}`, // Mapear cada trilha de áudio
            `-c:a:${index} aac`, // Codec AAC para cada trilha
            `-b:a:${index} 256k`, // Bitrate de áudio ainda mais alto
            `-ac:${index} 2` // Forçar stereo para compatibilidade
          ]);
          
          // Preservar metadados da trilha (idioma, título)
          if (stream.tags?.language) {
            command.outputOptions(`-metadata:s:a:${index} language=${stream.tags.language}`);
          }
          if (stream.tags?.title) {
            command.outputOptions(`-metadata:s:a:${index} title="${stream.tags.title}"`);
          }
        });
      } else {
        // Fallback: mapear todas as trilhas de áudio automaticamente
        command
          .audioCodec('aac')
          .audioBitrate('256k')
          .outputOptions([
            '-map 0:a', // Mapear todas as trilhas de áudio
          ]);
      }

      command
        .output(outputPath)
        .on('progress', (progress) => {
          console.log(`📊 Progresso: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          console.log(`✅ Conversão concluída: ${outputFilename}`);
          // Remover arquivo de lock quando conversão estiver completa
          try {
            fs.unlinkSync(lockFile);
          } catch (e) {
            console.log('⚠️ Erro ao remover arquivo de lock:', e.message);
          }
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`❌ Erro na conversão: ${err.message}`);
          // Remover arquivo de lock em caso de erro
          try {
            fs.unlinkSync(lockFile);
          } catch (e) {
            console.log('⚠️ Erro ao remover arquivo de lock:', e.message);
          }
          reject(err);
        })
        .run();
    });
  }

  // Gerar múltiplas versões (MP4, WebM) com todas as trilhas
  async generateMultipleFormats(inputPath, baseName, videoInfo) {
    const results = [];
    
    try {
      // Gerar MP4 principal com todas as trilhas
      const mp4Path = await this.convertToWebFormat(
        inputPath, 
        `${baseName}.mp4`,
        videoInfo
      );
      results.push({
        format: 'mp4',
        path: mp4Path,
        url: `/videos/converted/${path.basename(mp4Path)}`,
        mimeType: 'video/mp4',
        audioTracks: videoInfo?.audioStreams?.length || 1,
        isMultiTrack: true
      });

      // Se há múltiplas trilhas de áudio, criar versões específicas para fallback
      if (videoInfo?.audioStreams?.length > 1) {
        console.log('🎵 Criando versões específicas para cada idioma...');
        
        for (let i = 0; i < videoInfo.audioStreams.length; i++) {
          const stream = videoInfo.audioStreams[i];
          // Mapear idiomas comuns para códigos padronizados
          let lang = stream.tags?.language || `track${i}`;
          
          // Padronizar códigos de idioma
          const languageMap = {
            'eng': 'eng',
            'en': 'eng', 
            'english': 'eng',
            'por': 'por',
            'pt': 'por',
            'pt-br': 'por',
            'portuguese': 'por',
            'spa': 'spa',
            'es': 'spa',
            'spanish': 'spa',
            'fre': 'fre',
            'fr': 'fre',
            'french': 'fre'
          };
          
          lang = languageMap[lang.toLowerCase()] || lang;
          
          console.log(`🌐 Criando versão ${lang.toUpperCase()} (trilha ${i})`);
          
          const langPath = await this.convertSingleAudioTrack(
            inputPath,
            `${baseName}-${lang}.mp4`,
            i,
            videoInfo
          );
          
          results.push({
            format: 'mp4',
            path: langPath,
            url: `/videos/converted/${path.basename(langPath)}`,
            mimeType: 'video/mp4',
            audioTracks: 1,
            language: lang,
            isLanguageSpecific: true
          });
        }
      }

      // Gerar WebM apenas se MP4 funcionar
      try {
        const webmPath = await this.convertToWebM(inputPath, baseName, videoInfo);
        results.push({
          format: 'webm',
          path: webmPath,
          url: `/videos/converted/${path.basename(webmPath)}`,
          mimeType: 'video/webm',
          audioTracks: videoInfo?.audioStreams?.length || 1
        });
      } catch (webmError) {
        console.log('⚠️ Conversão WebM falhou, continuando apenas com MP4');
        console.log(`   Erro WebM: ${webmError.message}`);
      }

    } catch (error) {
      console.error('❌ Erro na conversão:', error);
      throw error;
    }

    return results;
  }

  // Converter apenas uma trilha de áudio específica
  async convertSingleAudioTrack(inputPath, outputFilename, audioTrackIndex, videoInfo) {
    const outputPath = path.join(this.convertedDir, outputFilename);
    const lockFile = outputPath + '.converting';
    
    return new Promise((resolve, reject) => {
      console.log(`🎵 Convertendo trilha de áudio ${audioTrackIndex}: ${outputFilename}`);
      
      fs.writeFileSync(lockFile, JSON.stringify({
        startTime: Date.now(),
        inputFile: path.basename(inputPath),
        outputFile: outputFilename,
        audioTrack: audioTrackIndex,
        status: 'converting'
      }));
      
      const command = ffmpeg(inputPath)
        .videoCodec('libx264')
        .videoBitrate('2000k')
        .size('1920x1080')
        .outputOptions([
          '-preset medium',
          '-crf 20',
          '-movflags +faststart',
          '-profile:v high',
          '-level 4.1',
          '-map 0:v:0', // Mapear vídeo
          `-map 0:a:${audioTrackIndex}`, // Mapear apenas a trilha de áudio específica
          '-c:a aac',
          '-b:a 256k',
          '-ac 2'
        ]);

      // Preservar metadados da trilha
      if (videoInfo?.audioStreams?.[audioTrackIndex]?.tags?.language) {
        command.outputOptions(`-metadata:s:a:0 language=${videoInfo.audioStreams[audioTrackIndex].tags.language}`);
      }

      command
        .output(outputPath)
        .on('progress', (progress) => {
          if (Math.round(progress.percent || 0) % 10 === 0) {
            console.log(`📊 Progresso trilha ${audioTrackIndex}: ${Math.round(progress.percent || 0)}%`);
          }
        })
        .on('end', () => {
          console.log(`✅ Trilha ${audioTrackIndex} convertida: ${outputFilename}`);
          try {
            fs.unlinkSync(lockFile);
          } catch (e) {
            console.log('⚠️ Erro ao remover lock:', e.message);
          }
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`❌ Erro na conversão da trilha ${audioTrackIndex}: ${err.message}`);
          try {
            fs.unlinkSync(lockFile);
          } catch (e) {
            console.log('⚠️ Erro ao remover lock:', e.message);
          }
          reject(err);
        })
        .run();
    });
  }

  async convertToWebM(inputPath, baseName, videoInfo = null) {
    const outputPath = path.join(this.convertedDir, `${baseName}.webm`);
    const lockFile = outputPath + '.converting';
    
    return new Promise((resolve, reject) => {
      console.log(`🔄 Iniciando conversão WebM: ${baseName}.webm`);
      
      // Criar arquivo de lock
      fs.writeFileSync(lockFile, JSON.stringify({
        startTime: Date.now(),
        inputFile: path.basename(inputPath),
        outputFile: `${baseName}.webm`,
        status: 'converting'
      }));
      
      const command = ffmpeg(inputPath)
        .videoCodec('libvpx-vp9')
        .videoBitrate('1200k')
        .size('1280x720')
        .outputOptions([
          '-preset good',
          '-speed 2',
          '-row-mt 1',
          '-map 0:v:0', // Mapear primeiro stream de vídeo
        ]);

      // Mapear trilhas de áudio para WebM
      if (videoInfo && videoInfo.audioStreams && videoInfo.audioStreams.length > 0) {
        videoInfo.audioStreams.forEach((stream, index) => {
          command.outputOptions([
            `-map 0:a:${index}`,
            `-c:a:${index} libopus`,
            `-b:a:${index} 128k`
          ]);
          
          if (stream.tags?.language) {
            command.outputOptions(`-metadata:s:a:${index} language=${stream.tags.language}`);
          }
        });
      } else {
        command
          .audioCodec('libopus')
          .audioBitrate('128k')
          .outputOptions(['-map 0:a']);
      }

      command
        .output(outputPath)
        .on('progress', (progress) => {
          console.log(`📊 Progresso WebM: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          console.log(`✅ Conversão WebM concluída: ${baseName}.webm`);
          // Remover arquivo de lock
          try {
            fs.unlinkSync(lockFile);
          } catch (e) {
            console.log('⚠️ Erro ao remover arquivo de lock WebM:', e.message);
          }
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`❌ Erro na conversão WebM: ${err.message}`);
          // Remover arquivo de lock em caso de erro
          try {
            fs.unlinkSync(lockFile);
          } catch (e) {
            console.log('⚠️ Erro ao remover arquivo de lock WebM:', e.message);
          }
          reject(err);
        })
        .run();
    });
  }

  // Processar arquivo enviado
  async processUploadedFile(filePath, originalName) {
    try {
      console.log(`🎬 Processando arquivo: ${originalName}`);
      
      // Obter informações do vídeo
      const videoInfo = await this.getVideoInfo(filePath);
      console.log(`📊 Informações do vídeo:`, {
        duration: videoInfo.duration,
        audioTracks: videoInfo.audioStreams?.length || 0,
        videoTracks: videoInfo.videoStreams?.length || 0,
        ffmpegAvailable: videoInfo.ffmpegAvailable
      });

      // Se ffmpeg não está disponível, retornar arquivo original
      if (!videoInfo.ffmpegAvailable) {
        console.log('⚠️ ffmpeg não disponível, usando arquivo original');
        return [{
          format: path.extname(originalName).substring(1),
          path: filePath,
          url: `/videos/${path.basename(filePath)}`,
          mimeType: this.getMimeType(originalName),
          isOriginal: true,
          needsConversion: true
        }];
      }

      // Para arquivos MKV ou outros formatos não compatíveis, sempre converter
      const ext = path.extname(originalName).toLowerCase();
      if (ext === '.mkv' || ext === '.avi' || ext === '.mov' || ext === '.wmv') {
        console.log(`🔄 Convertendo ${ext.toUpperCase()} para formatos web compatíveis...`);
        const baseName = path.parse(originalName).name;
        const convertedFiles = await this.generateMultipleFormats(filePath, baseName, videoInfo);
        
        // Remover arquivo original após conversão bem-sucedida
        if (convertedFiles && convertedFiles.length > 0) {
          try {
            await fs.remove(filePath);
            console.log(`🗑️ Arquivo original removido: ${path.basename(filePath)}`);
          } catch (error) {
            console.log(`⚠️ Não foi possível remover o arquivo original: ${error.message}`);
          }
        }
        
        return convertedFiles;
      }

      // Se o arquivo já é MP4, verificar se tem múltiplas trilhas de áudio
      if (ext === '.mp4' && videoInfo.audioStreams && videoInfo.audioStreams.length > 1) {
        console.log(`🎵 MP4 detectado com ${videoInfo.audioStreams.length} trilhas de áudio - reconvertendo para garantir compatibilidade`);
        const baseName = path.parse(originalName).name;
        const convertedFiles = await this.generateMultipleFormats(filePath, baseName, videoInfo);
        
        // Remover arquivo original após conversão
        if (convertedFiles && convertedFiles.length > 0) {
          try {
            await fs.remove(filePath);
            console.log(`🗑️ Arquivo original removido: ${path.basename(filePath)}`);
          } catch (error) {
            console.log(`⚠️ Não foi possível remover o arquivo original: ${error.message}`);
          }
        }
        
        return convertedFiles;
      }

      // Se o arquivo já é compatível e tem apenas uma trilha de áudio
      if (this.isWebCompatible(originalName)) {
        console.log('✅ Arquivo já é compatível com navegadores');
        return [{
          format: ext.substring(1),
          path: filePath,
          url: `/videos/${path.basename(filePath)}`,
          mimeType: this.getMimeType(originalName),
          isOriginal: true,
          audioTracks: videoInfo.audioStreams?.length || 1
        }];
      }

      // Converter para formatos compatíveis
      const baseName = path.parse(originalName).name;
      const convertedFiles = await this.generateMultipleFormats(filePath, baseName, videoInfo);
      
      // Remover arquivo original após conversão
      if (convertedFiles && convertedFiles.length > 0) {
        try {
          await fs.remove(filePath);
          console.log(`🗑️ Arquivo original removido: ${path.basename(filePath)}`);
        } catch (error) {
          console.log(`⚠️ Não foi possível remover o arquivo original: ${error.message}`);
        }
      }

      return convertedFiles;

    } catch (error) {
      console.error('❌ Erro ao processar arquivo:', error);
      
      // Fallback: retornar arquivo original
      return [{
        format: path.extname(originalName).substring(1),
        path: filePath,
        url: `/videos/${path.basename(filePath)}`,
        mimeType: this.getMimeType(originalName),
        isOriginal: true,
        error: error.message
      }];
    }
  }

  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.mkv': 'video/x-matroska'
    };
    return mimeTypes[ext] || 'video/mp4';
  }

  // Limpar arquivos antigos convertidos
  async cleanupOldFiles(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 dias
    try {
      const files = await fs.readdir(this.convertedDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.convertedDir, file);
        const stat = await fs.stat(filePath);
        
        if (now - stat.mtime.getTime() > maxAge) {
          await fs.remove(filePath);
          console.log(`🗑️ Arquivo antigo removido: ${file}`);
        }
      }
    } catch (error) {
      console.error('Erro na limpeza de arquivos:', error);
    }
  }
} 
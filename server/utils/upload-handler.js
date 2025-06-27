import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import { UPLOAD_CONFIG } from '../../src/utils/constants.js';
import { logger, logFileOperation } from '../../src/utils/logger.js';
import { validateVideoFile } from '../../src/utils/validation.js';

/**
 * Sistema de Upload Otimizado para MKV
 * Gerencia uploads com validação, deduplicação e organização
 */
export class UploadHandler {
  constructor(fileManager) {
    this.fileManager = fileManager;
    this.uploadDir = UPLOAD_CONFIG.PATHS.UPLOADS;
    this.tempDir = UPLOAD_CONFIG.PATHS.TEMP;
    this.activeUploads = new Map(); // Rastrear uploads ativos
    
    this.initializeUploadSystem();
  }

  /**
   * Inicializa sistema de upload
   */
  async initializeUploadSystem() {
    try {
      await fs.ensureDir(this.uploadDir);
      await fs.ensureDir(this.tempDir);
      
      // Limpar uploads órfãos na inicialização
      await this.cleanupOrphanedUploads();
      
      logger.info('📁 Sistema de upload inicializado');
    } catch (error) {
      logger.error('❌ Erro ao inicializar sistema de upload:', error);
    }
  }

  /**
   * Limpa uploads órfãos de sessões anteriores
   */
  async cleanupOrphanedUploads() {
    try {
      const files = await fs.readdir(this.uploadDir);
      const now = Date.now();
      const maxAge = 2 * 60 * 60 * 1000; // 2 horas

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.remove(filePath);
          logger.info(`🧹 Upload órfão removido: ${file}`);
        }
      }
    } catch (error) {
      logger.warn('⚠️ Erro na limpeza de uploads órfãos:', error);
    }
  }

  /**
   * Gera hash de arquivo para deduplicação
   */
  async generateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Verifica se arquivo já existe no sistema
   */
  async checkDuplicateFile(filePath) {
    try {
      const fileHash = await this.generateFileHash(filePath);
      const metadataDir = UPLOAD_CONFIG.PATHS.METADATA;
      
      if (await fs.exists(metadataDir)) {
        const metadataFiles = await fs.readdir(metadataDir);
        
        for (const metadataFile of metadataFiles) {
          if (metadataFile.endsWith('_metadata.json')) {
            const metadataPath = path.join(metadataDir, metadataFile);
            const metadata = await fs.readJson(metadataPath);
            
            if (metadata.fileHash === fileHash) {
              return {
                isDuplicate: true,
                existingFileId: metadata.fileId,
                existingName: metadata.originalName
              };
            }
          }
        }
      }
      
      return { isDuplicate: false, fileHash };
    } catch (error) {
      logger.warn('⚠️ Erro ao verificar duplicação:', error);
      return { isDuplicate: false };
    }
  }

  /**
   * Configuração avançada do Multer
   */
  createMulterConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname);
        const filename = `upload_${timestamp}_${random}${ext}`;
        
        // Registrar upload ativo
        this.activeUploads.set(filename, {
          originalName: file.originalname,
          startTime: timestamp,
          size: 0
        });
        
        cb(null, filename);
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
        files: 1,
        fieldSize: 1024 * 1024 // 1MB para campos texto
      },
      fileFilter: (req, file, cb) => {
        try {
          // Validação básica do arquivo
          const validation = validateVideoFile(file);
          
          if (!validation.isValid) {
            logger.warn(`❌ Upload rejeitado: ${file.originalname} - ${validation.error}`);
            return cb(new Error(validation.error), false);
          }

          // Log do início do upload
          logger.info(`📁 Upload iniciado: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
          logFileOperation('upload_start', file.originalname, file.filename, 'info');
          
          cb(null, true);
        } catch (error) {
          logger.error('❌ Erro na validação de upload:', error);
          cb(error, false);
        }
      }
    });
  }

  /**
   * Processa arquivo após upload
   */
  async processUploadedFile(req, res) {
    const uploadInfo = this.activeUploads.get(req.file.filename);
    
    try {
      if (!req.file) {
        throw new Error('Nenhum arquivo recebido');
      }

      // Verificar integridade do arquivo
      const stats = await fs.stat(req.file.path);
      if (stats.size !== req.file.size) {
        throw new Error('Arquivo corrompido durante upload');
      }

      // Verificar se é duplicata
      const duplicateCheck = await this.checkDuplicateFile(req.file.path);
      
      if (duplicateCheck.isDuplicate) {
        // Remover arquivo duplicado
        await fs.remove(req.file.path);
        
        return {
          success: true,
          isDuplicate: true,
          existingFileId: duplicateCheck.existingFileId,
          message: `Arquivo já existe no sistema: ${duplicateCheck.existingName}`,
          fileId: duplicateCheck.existingFileId
        };
      }

      // Mover para sistema organizado com hash
      const processedInfo = await this.fileManager.moveToUploads(req.file.path, req.file.originalname);
      
      // Adicionar hash ao info
      processedInfo.fileHash = duplicateCheck.fileHash;
      processedInfo.uploadedAt = Date.now();
      processedInfo.originalSize = req.file.size;

      // Validação avançada do arquivo
      const advancedValidation = await this.performAdvancedValidation(processedInfo.path);
      
      if (!advancedValidation.isValid) {
        // Limpar arquivo inválido
        await this.fileManager.cleanupTemp(processedInfo.path);
        throw new Error(advancedValidation.error);
      }

      // Remover do rastreamento de uploads ativos
      this.activeUploads.delete(req.file.filename);

      logFileOperation('upload_complete', req.file.originalname, processedInfo.fileName, 'success');
      
      return {
        success: true,
        isDuplicate: false,
        fileId: processedInfo.fileId,
        fileName: processedInfo.fileName,
        originalName: processedInfo.originalName,
        size: processedInfo.size,
        hash: processedInfo.fileHash,
        validation: advancedValidation,
        message: '✅ Upload concluído com sucesso'
      };

    } catch (error) {
      // Limpeza em caso de erro
      if (uploadInfo) {
        this.activeUploads.delete(req.file.filename);
      }
      
      if (req.file?.path) {
        try {
          await fs.remove(req.file.path);
        } catch (cleanupError) {
          logger.error('❌ Erro na limpeza após falha:', cleanupError);
        }
      }

      logFileOperation('upload_error', req.file?.originalname || 'unknown', null, 'error', error.message);
      throw error;
    }
  }

  /**
   * Validação avançada do arquivo de vídeo
   */
  async performAdvancedValidation(filePath) {
    try {
      // Verificar se é realmente um arquivo de vídeo válido
      const fileSignature = await this.checkFileSignature(filePath);
      
      if (!fileSignature.isValid) {
        return {
          isValid: false,
          error: 'Arquivo não é um vídeo válido ou está corrompido',
          details: fileSignature.details
        };
      }

      // Verificar tamanho mínimo (evitar arquivos muito pequenos)
      const stats = await fs.stat(filePath);
      if (stats.size < 1024 * 1024) { // 1MB mínimo
        return {
          isValid: false,
          error: 'Arquivo muito pequeno para ser um vídeo válido',
          details: `Tamanho: ${stats.size} bytes`
        };
      }

      // Verificar se FFmpeg consegue ler o arquivo (teste rápido)
      const ffmpegTest = await this.testFFmpegCompatibility(filePath);
      
      if (!ffmpegTest.isValid) {
        return {
          isValid: false,
          error: 'Arquivo não compatível com FFmpeg',
          details: ffmpegTest.error
        };
      }

      return {
        isValid: true,
        fileSignature: fileSignature.format,
        estimatedDuration: ffmpegTest.duration,
        hasVideo: ffmpegTest.hasVideo,
        hasAudio: ffmpegTest.hasAudio
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'Erro na validação do arquivo',
        details: error.message
      };
    }
  }

  /**
   * Verifica assinatura do arquivo para detectar formato real
   */
  async checkFileSignature(filePath) {
    try {
      const buffer = await fs.readFile(filePath, { start: 0, end: 20 });
      const signature = buffer.toString('hex').toUpperCase();

      // Assinaturas conhecidas de formatos de vídeo
      const videoSignatures = {
        'FFFB': 'MP3', // Não é vídeo
        '494433': 'MP3', // Não é vídeo
        '000000206674797': 'MP4',
        '1A45DFA3': 'MKV/WebM',
        '52494646': 'AVI',
        '464C5601': 'FLV',
        '00000018667479704D534E56': 'MOV',
        '30264D45': 'WMV'
      };

      for (const [sig, format] of Object.entries(videoSignatures)) {
        if (signature.startsWith(sig)) {
          const isVideoFormat = !['MP3'].includes(format);
          return {
            isValid: isVideoFormat,
            format,
            details: isVideoFormat ? `Formato detectado: ${format}` : 'Arquivo de áudio, não vídeo'
          };
        }
      }

      // Se não encontrou assinatura conhecida, assumir que pode ser válido
      return {
        isValid: true,
        format: 'UNKNOWN',
        details: 'Formato não identificado pela assinatura'
      };

    } catch (error) {
      return {
        isValid: false,
        format: 'ERROR',
        details: error.message
      };
    }
  }

  /**
   * Teste rápido de compatibilidade com FFmpeg
   */
  async testFFmpegCompatibility(filePath) {
    return new Promise((resolve) => {
      const ffmpeg = require('fluent-ffmpeg');
      
      // Timeout de 30 segundos para teste
      const timeout = setTimeout(() => {
        resolve({
          isValid: false,
          error: 'Timeout na validação FFmpeg'
        });
      }, 30000);

      ffmpeg.ffprobe(filePath, (err, metadata) => {
        clearTimeout(timeout);
        
        if (err) {
          resolve({
            isValid: false,
            error: err.message
          });
          return;
        }

        try {
          const videoStreams = metadata.streams.filter(s => s.codec_type === 'video');
          const audioStreams = metadata.streams.filter(s => s.codec_type === 'audio');
          
          resolve({
            isValid: true,
            duration: parseFloat(metadata.format.duration) || 0,
            hasVideo: videoStreams.length > 0,
            hasAudio: audioStreams.length > 0,
            format: metadata.format.format_name
          });
        } catch (parseError) {
          resolve({
            isValid: false,
            error: 'Erro ao analisar metadados'
          });
        }
      });
    });
  }

  /**
   * Obtém estatísticas de uploads
   */
  getUploadStats() {
    return {
      activeUploads: this.activeUploads.size,
      uploadsInProgress: Array.from(this.activeUploads.values()).map(upload => ({
        originalName: upload.originalName,
        startTime: upload.startTime,
        duration: Date.now() - upload.startTime
      }))
    };
  }

  /**
   * Cancela upload ativo
   */
  async cancelUpload(filename) {
    try {
      const uploadInfo = this.activeUploads.get(filename);
      
      if (uploadInfo) {
        this.activeUploads.delete(filename);
        
        const filePath = path.join(this.uploadDir, filename);
        if (await fs.exists(filePath)) {
          await fs.remove(filePath);
          logger.info(`🚫 Upload cancelado: ${uploadInfo.originalName}`);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('❌ Erro ao cancelar upload:', error);
      return false;
    }
  }
}

export default UploadHandler; 
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { UPLOAD_CONFIG, VIDEO_CONFIG } from '../../src/utils/constants.js';
import logger, { logFileOperation } from '../../src/utils/logger.js';

/**
 * Gerenciador principal de arquivos do sistema
 * Responsável por organizar, mover e manter a estrutura de diretórios
 */
export class FileManager {
  constructor() {
    this.paths = UPLOAD_CONFIG.PATHS;
    this.ensureDirectoryStructure();
  }

  /**
   * Garante que toda a estrutura de diretórios existe
   */
  async ensureDirectoryStructure() {
    try {
      // Criar todos os diretórios necessários
      for (const [key, dirPath] of Object.entries(this.paths)) {
        await fs.ensureDir(dirPath);
        logger.info(`📁 Diretório garantido: ${key} -> ${dirPath}`);
      }

      // Criar subdiretórios para organização
      await this.createSubDirectories();
      
      logger.info('✅ Estrutura de diretórios inicializada com sucesso');
    } catch (error) {
      logger.error('❌ Erro ao criar estrutura de diretórios:', error);
      throw error;
    }
  }

  /**
   * Cria subdiretórios organizacionais
   */
  async createSubDirectories() {
    const subDirs = {
      // Organização por qualidade nos masters
      [this.paths.MASTERS]: ['4k', '1080p', '720p', '480p'],
      
      // Organização por formato no web
      [this.paths.WEB_OPTIMIZED]: ['mp4', 'webm', 'mobile'],
      
      // Organização por idioma nas legendas
      [this.paths.SUBTITLES]: ['pt', 'en', 'es', 'fr', 'auto-generated'],
      
      // Organização por tamanho nas thumbnails
      [this.paths.THUMBNAILS]: ['small', 'medium', 'large', 'poster'],
      
      // Organização temporal no temp
      [this.paths.TEMP]: ['daily', 'processing', 'failed']
    };

    for (const [baseDir, subdirs] of Object.entries(subDirs)) {
      for (const subdir of subdirs) {
        await fs.ensureDir(path.join(baseDir, subdir));
      }
    }
  }

  /**
   * Gera ID único para arquivo baseado em hash
   */
  generateFileId(originalName, buffer = null) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const nameHash = crypto.createHash('md5').update(originalName).digest('hex').slice(0, 8);
    
    if (buffer) {
      const contentHash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 8);
      return `${timestamp}_${nameHash}_${contentHash}_${random}`;
    }
    
    return `${timestamp}_${nameHash}_${random}`;
  }

  /**
   * Move arquivo para upload temporário
   */
  async moveToUploads(filePath, originalName) {
    try {
      const fileId = this.generateFileId(originalName);
      const ext = path.extname(originalName);
      const newFileName = `${fileId}${ext}`;
      const newPath = path.join(this.paths.UPLOADS, newFileName);

      await fs.move(filePath, newPath);
      
      logFileOperation('upload', originalName, newFileName, 'success');
      
      return {
        fileId,
        fileName: newFileName,
        path: newPath,
        originalName,
        size: (await fs.stat(newPath)).size
      };
    } catch (error) {
      logFileOperation('upload', originalName, null, 'error', error.message);
      throw error;
    }
  }

  /**
   * Move arquivo para processamento
   */
  async moveToProcessing(uploadInfo) {
    try {
      const processingPath = path.join(this.paths.PROCESSING, uploadInfo.fileName);
      await fs.move(uploadInfo.path, processingPath);
      
      uploadInfo.path = processingPath;
      uploadInfo.status = 'processing';
      
      logFileOperation('move_to_processing', uploadInfo.originalName, uploadInfo.fileName, 'success');
      
      return uploadInfo;
    } catch (error) {
      logFileOperation('move_to_processing', uploadInfo.originalName, uploadInfo.fileName, 'error', error.message);
      throw error;
    }
  }

  /**
   * Salva arquivo master MKV
   */
  async saveMaster(fileInfo, quality = '1080p') {
    try {
      const masterDir = path.join(this.paths.MASTERS, quality);
      const masterPath = path.join(masterDir, `${fileInfo.fileId}_master.mkv`);
      
      await fs.move(fileInfo.path, masterPath);
      
      const masterInfo = {
        ...fileInfo,
        path: masterPath,
        type: 'master',
        quality,
        format: 'mkv'
      };
      
      logFileOperation('save_master', fileInfo.originalName, path.basename(masterPath), 'success');
      
      return masterInfo;
    } catch (error) {
      logFileOperation('save_master', fileInfo.originalName, null, 'error', error.message);
      throw error;
    }
  }

  /**
   * Salva versão web otimizada
   */
  async saveWebOptimized(fileInfo, format = 'mp4', quality = '1080p') {
    try {
      const webDir = path.join(this.paths.WEB_OPTIMIZED, format);
      const fileName = `${fileInfo.fileId}_${quality}.${format}`;
      const webPath = path.join(webDir, fileName);
      
      await fs.copy(fileInfo.path, webPath);
      
      // Criar link simbólico para acesso público
      const publicPath = path.join(this.paths.PUBLIC_VIDEOS, fileName);
      await fs.ensureSymlink(webPath, publicPath);
      
      const webInfo = {
        ...fileInfo,
        path: webPath,
        publicPath,
        publicUrl: `/videos/${fileName}`,
        type: 'web',
        format,
        quality
      };
      
      logFileOperation('save_web', fileInfo.originalName, fileName, 'success');
      
      return webInfo;
    } catch (error) {
      logFileOperation('save_web', fileInfo.originalName, null, 'error', error.message);
      throw error;
    }
  }

  /**
   * Salva metadados extraídos
   */
  async saveMetadata(fileInfo, metadata) {
    try {
      const metadataPath = path.join(this.paths.METADATA, `${fileInfo.fileId}_metadata.json`);
      
      const fullMetadata = {
        fileId: fileInfo.fileId,
        originalName: fileInfo.originalName,
        extractedAt: new Date().toISOString(),
        ...metadata
      };
      
      await fs.writeJson(metadataPath, fullMetadata, { spaces: 2 });
      
      logFileOperation('save_metadata', fileInfo.originalName, `${fileInfo.fileId}_metadata.json`, 'success');
      
      return metadataPath;
    } catch (error) {
      logFileOperation('save_metadata', fileInfo.originalName, null, 'error', error.message);
      throw error;
    }
  }

  /**
   * Salva legendas extraídas
   */
  async saveSubtitles(fileInfo, subtitles) {
    try {
      const savedSubtitles = [];
      
      for (const subtitle of subtitles) {
        const language = subtitle.language || 'unknown';
        const langDir = path.join(this.paths.SUBTITLES, language);
        await fs.ensureDir(langDir);
        
        const fileName = `${fileInfo.fileId}_${language}.${subtitle.format}`;
        const subtitlePath = path.join(langDir, fileName);
        
        await fs.writeFile(subtitlePath, subtitle.content);
        
        savedSubtitles.push({
          language,
          format: subtitle.format,
          path: subtitlePath,
          fileName,
          publicUrl: `/subtitles/${language}/${fileName}`
        });
      }
      
      logFileOperation('save_subtitles', fileInfo.originalName, `${savedSubtitles.length} subtitles`, 'success');
      
      return savedSubtitles;
    } catch (error) {
      logFileOperation('save_subtitles', fileInfo.originalName, null, 'error', error.message);
      throw error;
    }
  }

  /**
   * Gera e salva thumbnails
   */
  async saveThumbnails(fileInfo, thumbnailBuffers) {
    try {
      const savedThumbnails = {};
      
      for (const [size, buffer] of Object.entries(thumbnailBuffers)) {
        const sizeDir = path.join(this.paths.THUMBNAILS, size);
        const fileName = `${fileInfo.fileId}_${size}.jpg`;
        const thumbnailPath = path.join(sizeDir, fileName);
        
        await fs.writeFile(thumbnailPath, buffer);
        
        savedThumbnails[size] = {
          path: thumbnailPath,
          fileName,
          publicUrl: `/thumbnails/${size}/${fileName}`
        };
      }
      
      logFileOperation('save_thumbnails', fileInfo.originalName, `${Object.keys(savedThumbnails).length} thumbnails`, 'success');
      
      return savedThumbnails;
    } catch (error) {
      logFileOperation('save_thumbnails', fileInfo.originalName, null, 'error', error.message);
      throw error;
    }
  }

  /**
   * Limpa arquivo temporário
   */
  async cleanupTemp(filePath) {
    try {
      if (await fs.exists(filePath)) {
        await fs.remove(filePath);
        logFileOperation('cleanup', path.basename(filePath), null, 'success');
      }
    } catch (error) {
      logFileOperation('cleanup', path.basename(filePath), null, 'error', error.message);
    }
  }

  /**
   * Limpa arquivos antigos baseado em idade
   */
  async cleanupOldFiles(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 dias
    try {
      const cleanupDirs = [
        this.paths.TEMP,
        this.paths.UPLOADS,
        this.paths.PROCESSING
      ];

      let cleanedCount = 0;
      const now = Date.now();

      for (const dir of cleanupDirs) {
        if (await fs.exists(dir)) {
          const files = await fs.readdir(dir);
          
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = await fs.stat(filePath);
            
            if (now - stat.mtime.getTime() > maxAge) {
              await fs.remove(filePath);
              cleanedCount++;
              logger.info(`🗑️ Arquivo antigo removido: ${file}`);
            }
          }
        }
      }

      logger.info(`✅ Limpeza concluída: ${cleanedCount} arquivos removidos`);
      return cleanedCount;
    } catch (error) {
      logger.error('❌ Erro na limpeza de arquivos:', error);
      throw error;
    }
  }

  /**
   * Obtém informações completas de um arquivo
   */
  async getFileInfo(fileId) {
    try {
      // Buscar metadados
      const metadataPath = path.join(this.paths.METADATA, `${fileId}_metadata.json`);
      let metadata = {};
      
      if (await fs.exists(metadataPath)) {
        metadata = await fs.readJson(metadataPath);
      }

      // Buscar todas as versões do arquivo
      const versions = {
        master: await this.findFileInDirectory(this.paths.MASTERS, fileId, '.mkv'),
        web: await this.findFilesInDirectory(this.paths.WEB_OPTIMIZED, fileId),
        thumbnails: await this.findFilesInDirectory(this.paths.THUMBNAILS, fileId),
        subtitles: await this.findFilesInDirectory(this.paths.SUBTITLES, fileId)
      };

      return {
        fileId,
        metadata,
        versions,
        hasWeb: versions.web.length > 0,
        hasThumbnails: versions.thumbnails.length > 0,
        hasSubtitles: versions.subtitles.length > 0
      };
    } catch (error) {
      logger.error(`❌ Erro ao obter informações do arquivo ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Busca arquivo em diretório específico
   */
  async findFileInDirectory(directory, fileId, extension) {
    try {
      const files = await fs.readdir(directory, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isDirectory()) {
          const subDirPath = path.join(directory, file.name);
          const found = await this.findFileInDirectory(subDirPath, fileId, extension);
          if (found) return found;
        } else {
          if (file.name.includes(fileId) && file.name.endsWith(extension)) {
            return path.join(directory, file.name);
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Busca todos os arquivos relacionados em diretórios
   */
  async findFilesInDirectory(directory, fileId) {
    try {
      const foundFiles = [];
      
      const searchRecursive = async (dir) => {
        const files = await fs.readdir(dir, { withFileTypes: true });
        
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          
          if (file.isDirectory()) {
            await searchRecursive(fullPath);
          } else if (file.name.includes(fileId)) {
            foundFiles.push(fullPath);
          }
        }
      };

      if (await fs.exists(directory)) {
        await searchRecursive(directory);
      }
      
      return foundFiles;
    } catch (error) {
      return [];
    }
  }

  /**
   * Remove todos os arquivos relacionados a um fileId
   */
  async removeAllFiles(fileId) {
    try {
      let removedCount = 0;
      
      // Buscar e remover em todos os diretórios
      for (const [key, directory] of Object.entries(this.paths)) {
        if (key === 'PUBLIC_VIDEOS') continue; // Pular diretório público (são links simbólicos)
        
        const files = await this.findFilesInDirectory(directory, fileId);
        
        for (const filePath of files) {
          await fs.remove(filePath);
          removedCount++;
          logger.info(`🗑️ Arquivo removido: ${path.basename(filePath)}`);
        }
      }

      // Remover links simbólicos públicos
      const publicFiles = await this.findFilesInDirectory(this.paths.PUBLIC_VIDEOS, fileId);
      for (const filePath of publicFiles) {
        await fs.unlink(filePath); // Usar unlink para links simbólicos
        removedCount++;
      }

      logger.info(`✅ Remoção concluída: ${removedCount} arquivos removidos para ${fileId}`);
      return removedCount;
    } catch (error) {
      logger.error(`❌ Erro ao remover arquivos para ${fileId}:`, error);
      throw error;
    }
  }
}

export default FileManager; 
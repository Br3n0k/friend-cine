/**
 * Funções utilitárias para operações de arquivo
 * Compartilhadas entre frontend e backend
 */

/**
 * Converte tamanho de bytes para formato legível
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Converte duração de segundos para formato legível
 */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Gera timestamp legível
 */
export function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

/**
 * Valida extensão de arquivo
 */
export function isValidVideoExtension(filename, allowedExtensions) {
  if (!filename || typeof filename !== 'string') return false;
  
  const extension = filename.toLowerCase().split('.').pop();
  return allowedExtensions.includes(`.${extension}`);
}

/**
 * Gera nome único para arquivo
 */
export function generateUniqueFilename(originalName, prefix = '') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  
  // Sanitizar nome
  const safeName = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9\s._-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '_') // Substitui espaços por underscore
    .toLowerCase();
  
  return prefix ? 
    `${prefix}_${timestamp}_${safeName}_${random}.${extension}` :
    `${timestamp}_${safeName}_${random}.${extension}`;
}

/**
 * Detecta tipo MIME por extensão
 */
export function getMimeType(filename, mimeTypes) {
  const extension = '.' + filename.toLowerCase().split('.').pop();
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Calcula progresso em porcentagem
 */
export function calculateProgress(current, total) {
  if (!total || total <= 0) return 0;
  return Math.min(Math.round((current / total) * 100), 100);
}

/**
 * Formata taxa de transferência
 */
export function formatTransferRate(bytesPerSecond) {
  if (!bytesPerSecond) return '0 B/s';
  
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let unitIndex = 0;
  let rate = bytesPerSecond;
  
  while (rate >= 1024 && unitIndex < units.length - 1) {
    rate /= 1024;
    unitIndex++;
  }
  
  return `${rate.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Estima tempo restante
 */
export function estimateTimeRemaining(bytesTransferred, totalBytes, transferRate) {
  if (!transferRate || transferRate <= 0) return null;
  
  const remainingBytes = totalBytes - bytesTransferred;
  const secondsRemaining = remainingBytes / transferRate;
  
  if (secondsRemaining < 60) {
    return `${Math.round(secondsRemaining)}s`;
  } else if (secondsRemaining < 3600) {
    return `${Math.round(secondsRemaining / 60)}m`;
  } else {
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.round((secondsRemaining % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Sanitiza nome de arquivo para URL
 */
export function sanitizeForUrl(filename) {
  return encodeURIComponent(filename)
    .replace(/[!'()*]/g, escape) // Escape caracteres especiais
    .replace(/%20/g, '_'); // Substitui espaços por underscore
}

/**
 * Extrai informações básicas de arquivo
 */
export function extractFileInfo(file) {
  const name = file.name || 'unknown';
  const size = file.size || 0;
  const type = file.type || '';
  const extension = name.split('.').pop()?.toLowerCase() || '';
  const nameWithoutExt = name.replace(/\.[^/.]+$/, '');
  
  return {
    name,
    nameWithoutExt,
    size,
    type,
    extension,
    sizeFormatted: formatFileSize(size),
    lastModified: file.lastModified ? new Date(file.lastModified) : null
  };
}

/**
 * Verifica se arquivo é vídeo
 */
export function isVideoFile(file) {
  const videoMimeTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/x-matroska'
  ];
  
  const videoExtensions = [
    'mp4', 'webm', 'ogg', 'avi', 'mov', 
    'wmv', 'flv', 'mkv', 'm4v', '3gp'
  ];
  
  if (file.type) {
    return videoMimeTypes.includes(file.type);
  }
  
  if (file.name) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return videoExtensions.includes(extension);
  }
  
  return false;
}

/**
 * Gera hash simples para identificação
 */
export function generateSimpleHash(input) {
  let hash = 0;
  if (!input || input.length === 0) return hash.toString();
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
} 
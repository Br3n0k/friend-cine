// Módulo de validação e sanitização
import { UPLOAD_CONFIG, CHAT_CONFIG, ERROR_MESSAGES } from './constants.js';

/**
 * Validar arquivo de vídeo
 */
export function validateVideoFile(file) {
  const errors = [];

  // Verificar se é um arquivo
  if (!file || typeof file !== 'object') {
    errors.push('Arquivo inválido');
    return { isValid: false, errors };
  }

  // Verificar tamanho
  if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
    errors.push(ERROR_MESSAGES.FILE_TOO_LARGE);
  }

  // Verificar tipo
  const extension = getFileExtension(file.name);
  if (!UPLOAD_CONFIG.ALLOWED_VIDEO_FORMATS.includes(extension)) {
    errors.push(ERROR_MESSAGES.INVALID_FILE_TYPE);
  }

  // Verificar nome do arquivo
  if (!isValidFilename(file.name)) {
    errors.push('Nome do arquivo contém caracteres inválidos');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validar nome de usuário
 */
export function validateUsername(username) {
  const errors = [];

  if (!username || typeof username !== 'string') {
    errors.push(ERROR_MESSAGES.USERNAME_REQUIRED);
    return { isValid: false, errors };
  }

  const trimmed = username.trim();

  if (trimmed.length === 0) {
    errors.push(ERROR_MESSAGES.USERNAME_REQUIRED);
  }

  if (trimmed.length < 2) {
    errors.push('Nome de usuário deve ter pelo menos 2 caracteres');
  }

  if (trimmed.length > 50) {
    errors.push('Nome de usuário deve ter no máximo 50 caracteres');
  }

  // Verificar caracteres permitidos (letras, números, espaços, alguns símbolos)
  if (!/^[a-zA-Z0-9À-ÿ\s._-]+$/.test(trimmed)) {
    errors.push('Nome de usuário contém caracteres não permitidos');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmed
  };
}

/**
 * Validar nome da sala
 */
export function validateRoomName(roomName) {
  const errors = [];

  if (!roomName || typeof roomName !== 'string') {
    errors.push('Nome da sala é obrigatório');
    return { isValid: false, errors };
  }

  const trimmed = roomName.trim();

  if (trimmed.length === 0) {
    errors.push('Nome da sala é obrigatório');
  }

  if (trimmed.length < 3) {
    errors.push('Nome da sala deve ter pelo menos 3 caracteres');
  }

  if (trimmed.length > 100) {
    errors.push('Nome da sala deve ter no máximo 100 caracteres');
  }

  // Verificar caracteres permitidos
  if (!/^[a-zA-Z0-9À-ÿ\s._-]+$/.test(trimmed)) {
    errors.push('Nome da sala contém caracteres não permitidos');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmed
  };
}

/**
 * Validar mensagem de chat
 */
export function validateChatMessage(message) {
  const errors = [];

  if (!message || typeof message !== 'string') {
    errors.push('Mensagem inválida');
    return { isValid: false, errors };
  }

  const trimmed = message.trim();

  if (trimmed.length === 0) {
    errors.push('Mensagem não pode estar vazia');
  }

  if (trimmed.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
    errors.push(ERROR_MESSAGES.MESSAGE_TOO_LONG);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitizeMessage(trimmed)
  };
}

/**
 * Sanitizar mensagem de chat
 */
export function sanitizeMessage(message) {
  return message
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validar ID da sala
 */
export function validateRoomId(roomId) {
  if (!roomId || typeof roomId !== 'string') {
    return false;
  }

  const trimmed = roomId.trim();
  
  // Verificar comprimento e caracteres válidos
  return trimmed.length >= 3 && 
         trimmed.length <= 100 && 
         /^[a-zA-Z0-9À-ÿ\s._-]+$/.test(trimmed);
}

/**
 * Validar nome de arquivo
 */
export function isValidFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  // Verificar caracteres perigosos
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(filename)) {
    return false;
  }

  // Verificar nomes reservados (Windows)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
  if (reservedNames.test(filename)) {
    return false;
  }

  return true;
}

/**
 * Obter extensão do arquivo
 */
export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return '';
  }
  
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }
  
  return filename.slice(lastDotIndex).toLowerCase();
}

/**
 * Gerar nome de arquivo seguro
 */
export function generateSafeFilename(originalName) {
  if (!originalName) {
    return `video_${Date.now()}.mp4`;
  }

  const extension = getFileExtension(originalName);
  const nameWithoutExt = originalName.slice(0, originalName.lastIndexOf('.'));
  
  // Limpar nome do arquivo
  const safeName = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-zA-Z0-9\s._-]/g, '') // Apenas caracteres seguros
    .replace(/\s+/g, '_') // Substituir espaços por _
    .toLowerCase();

  const timestamp = Date.now();
  return `${timestamp}_${safeName}${extension}`;
}

/**
 * Verificar taxa de limitação (rate limiting)
 */
export class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
  }

  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Limpar registros antigos
    for (const [id, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(t => t > windowStart);
      if (validTimestamps.length === 0) {
        this.requests.delete(id);
      } else {
        this.requests.set(id, validTimestamps);
      }
    }

    // Verificar requisições do identificador
    const userRequests = this.requests.get(identifier) || [];
    const validRequests = userRequests.filter(t => t > windowStart);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Adicionar nova requisição
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  getRemainingRequests(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const userRequests = this.requests.get(identifier) || [];
    const validRequests = userRequests.filter(t => t > windowStart);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
} 
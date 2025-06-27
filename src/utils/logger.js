// Sistema de logging estruturado para Friend Cine
import winston from 'winston';
import fs from 'fs-extra';
import path from 'path';

// Garantir que a pasta de logs existe
const logsDir = './logs';
fs.ensureDirSync(logsDir);

// Configuração dos níveis de log
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
};

// Configuração das cores
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'grey',
  debug: 'cyan',
};

winston.addColors(logColors);

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Formato para console (mais limpo)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

// Configuração do logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: logFormat,
  defaultMeta: { service: 'friend-cine' },
  transports: [
    // Log de erros em arquivo separado
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Log geral
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
  ],
});

// Adicionar console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Função para log de requisições HTTP
export function logRequest(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, ip } = req;
    const { statusCode } = res;
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    logger.http('HTTP Request', {
      method,
      url,
      statusCode,
      duration,
      ip,
      userAgent
    });
  });
  
  next();
}

// Função para log de eventos de socket
export function logSocketEvent(eventName, socketId, data = {}) {
  logger.info('Socket Event', {
    event: eventName,
    socketId,
    ...data
  });
}

// Função para log de uploads
export function logUpload(filename, size, ip, success = true, error = null) {
  logger.info('File Upload', {
    filename,
    size,
    ip,
    success,
    error: error?.message
  });
}

// Função para log de conversões de vídeo
export function logVideoConversion(inputFile, outputFile, success = true, duration = null, error = null) {
  logger.info('Video Conversion', {
    inputFile,
    outputFile,
    success,
    duration,
    error: error?.message
  });
}

// Função para log de atividades de sala
export function logRoomActivity(roomId, action, userId = null, extra = {}) {
  logger.info('Room Activity', {
    roomId,
    action,
    userId,
    ...extra
  });
}

// Função para log de chat
export function logChatMessage(roomId, userId, messageLength) {
  logger.info('Chat Message', {
    roomId,
    userId,
    messageLength
  });
}

// Função para log de segurança
export function logSecurityEvent(type, ip, details = {}) {
  logger.warn('Security Event', {
    type,
    ip,
    timestamp: new Date().toISOString(),
    ...details
  });
}

// Função para log de erros com contexto
export function logError(error, context = {}) {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context
  });
}

// Função para log de performance
export function logPerformance(operation, duration, details = {}) {
  logger.info('Performance', {
    operation,
    duration,
    ...details
  });
}

export default logger; 
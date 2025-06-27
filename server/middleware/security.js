// Middleware de segurança para o servidor Friend Cine
import rateLimit from 'express-rate-limit';
import { RateLimiter } from '../../src/utils/validation.js';

// Rate limiting para uploads
export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 uploads por IP por janela
  message: {
    error: 'Muitos uploads. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Muitos uploads. Tente novamente em 15 minutos.',
      retryAfter: 15 * 60
    });
  }
});

// Rate limiting para API geral
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP por janela
  message: {
    error: 'Muitas requisições. Tente novamente em alguns minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para chat (por socket)
export const chatRateLimiter = new RateLimiter(60000, 30); // 30 mensagens por minuto

// Validação de CORS
export function corsMiddleware(allowedOrigins) {
  return (req, res, next) => {
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin) || !origin) {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  };
}

// Middleware de sanitização de entrada
export function sanitizeInput(req, res, next) {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitizar body (pode ser modificado)
  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  // Para query e params, criar propriedades sanitizadas sem modificar as originais
  if (req.query && Object.keys(req.query).length > 0) {
    const sanitizedQuery = sanitize(req.query);
    // Definir uma nova propriedade para a query sanitizada
    Object.defineProperty(req, 'sanitizedQuery', {
      value: sanitizedQuery,
      writable: false,
      enumerable: false
    });
    
    // Substituir os valores originais um por um (mais seguro)
    for (const [key, value] of Object.entries(sanitizedQuery)) {
      if (req.query.hasOwnProperty(key)) {
        try {
          req.query[key] = value;
        } catch (error) {
          // Se não conseguir modificar, ignora silenciosamente
          console.debug(`Não foi possível sanitizar query.${key}`);
        }
      }
    }
  }
  
  // Para params, tentar sanitizar com segurança
  if (req.params && Object.keys(req.params).length > 0) {
    try {
      const sanitizedParams = sanitize(req.params);
      for (const [key, value] of Object.entries(sanitizedParams)) {
        if (req.params.hasOwnProperty(key)) {
          try {
            req.params[key] = value;
          } catch (error) {
            console.debug(`Não foi possível sanitizar params.${key}`);
          }
        }
      }
    } catch (error) {
      console.debug('Erro ao sanitizar params:', error.message);
    }
  }

  next();
}

// Middleware de validação de arquivo
export function validateFileMiddleware(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: 'Nenhum arquivo foi enviado'
    });
  }

  const file = req.file;
  const allowedTypes = /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv)$/i;
  const maxSize = 2 * 1024 * 1024 * 1024; // 2GB

  // Verificar tipo
  if (!allowedTypes.test(file.originalname)) {
    return res.status(415).json({
      error: 'Tipo de arquivo não suportado',
      allowedTypes: 'MP4, WebM, OGG, AVI, MOV, WMV, FLV, MKV'
    });
  }

  // Verificar tamanho
  if (file.size > maxSize) {
    return res.status(413).json({
      error: 'Arquivo muito grande',
      maxSize: '2GB'
    });
  }

  // Verificar nome do arquivo
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(file.originalname)) {
    return res.status(400).json({
      error: 'Nome do arquivo contém caracteres inválidos'
    });
  }

  next();
}

// Middleware de logging de segurança
export function securityLogger(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const timestamp = new Date().toISOString();
  
  // Log de requisições suspeitas
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // XSS
  ];

  const url = req.url;
  const body = JSON.stringify(req.body || {});
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(url) || pattern.test(body)
  );

  if (isSuspicious) {
    console.warn(`🚨 [SECURITY] Suspicious request from ${ip}:`, {
      timestamp,
      ip,
      userAgent,
      method: req.method,
      url,
      body: req.body
    });
  }

  next();
}

// Middleware de headers de segurança
export function securityHeaders(req, res, next) {
  // Prevenir MIME sniffing
  res.header('X-Content-Type-Options', 'nosniff');
  
  // Prevenir XSS
  res.header('X-XSS-Protection', '1; mode=block');
  
  // Prevenir clickjacking
  res.header('X-Frame-Options', 'DENY');
  
  // HSTS (apenas em produção com HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy básico
  res.header('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.socket.io https://vjs.zencdn.net https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://vjs.zencdn.net https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: https:; " +
    "media-src 'self' blob:; " +
    "connect-src 'self' ws: wss:;"
  );

  next();
}

// Validação de entrada para socket events
export function validateSocketData(eventName, data, socket) {
  try {
    switch (eventName) {
      case 'join-room':
        if (!data.roomId || !data.username) {
          throw new Error('roomId e username são obrigatórios');
        }
        if (typeof data.roomId !== 'string' || typeof data.username !== 'string') {
          throw new Error('roomId e username devem ser strings');
        }
        if (data.roomId.length > 100 || data.username.length > 50) {
          throw new Error('roomId ou username muito longos');
        }
        break;

      case 'chat-message':
        if (!data.message) {
          throw new Error('Mensagem é obrigatória');
        }
        if (typeof data.message !== 'string') {
          throw new Error('Mensagem deve ser uma string');
        }
        if (data.message.length > 500) {
          throw new Error('Mensagem muito longa');
        }
        break;

      case 'video-sync':
        if (typeof data.currentTime !== 'number' || typeof data.isPlaying !== 'boolean') {
          throw new Error('Dados de sincronização inválidos');
        }
        if (data.currentTime < 0 || data.currentTime > 86400) { // máximo 24 horas
          throw new Error('Tempo de vídeo inválido');
        }
        break;
    }
    return true;
  } catch (error) {
    console.warn(`🚨 [SOCKET] Dados inválidos de ${socket.id}:`, error.message);
    socket.emit('error', { message: error.message });
    return false;
  }
} 
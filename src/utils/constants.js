// Constantes da aplicação Friend Cine

export const APP_CONFIG = {
  NAME: 'Friend Cine',
  VERSION: '1.0.0',
  DESCRIPTION: 'Assista filmes em conjunto com seus amigos',
};

export const SERVER_CONFIG = {
  PORT: {
    BACKEND: 4000,
    FRONTEND: 3000,
  },
  ENDPOINTS: {
    HEALTH: '/api/health',
    VIDEOS: '/api/videos',
    UPLOAD: '/api/upload',
    ROOMS: '/api/rooms',
  },
};

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024 * 1024, // 5GB (aumentado para MKV)
  ALLOWED_VIDEO_FORMATS: ['.mkv', '.mp4', '.webm', '.avi', '.mov', '.wmv', '.flv', '.ogg', '.m4v', '.3gp'],
  ALLOWED_SUBTITLE_FORMATS: ['.srt', '.vtt', '.ass', '.ssa', '.sub'],
  PATHS: {
    // Estrutura organizada por função
    UPLOADS: './storage/uploads',           // Arquivos temporários de upload
    PROCESSING: './storage/processing',     // Arquivos sendo processados
    MASTERS: './storage/masters',           // Arquivos MKV otimizados (formato principal)
    WEB_OPTIMIZED: './storage/web',         // Versões para streaming web
    SUBTITLES: './storage/subtitles',       // Legendas extraídas/adicionadas
    THUMBNAILS: './storage/thumbnails',     // Miniaturas geradas
    METADATA: './storage/metadata',         // Metadados extraídos
    PUBLIC_VIDEOS: './public/videos',       // Links simbólicos para o público
    TEMP: './storage/temp',                 // Arquivos temporários para limpeza
  },
  // Novos tipos de arquivo organizados
  FILE_TYPES: {
    MASTERS: ['.mkv'],                      // Formato principal de alta qualidade
    WEB_STREAMING: ['.mp4', '.webm'],       // Para streaming web
    MOBILE_OPTIMIZED: ['.mp4'],             // Versões móveis
    LEGACY_SUPPORT: ['.avi', '.wmv', '.mov'], // Formatos legados
  }
};

export const VIDEO_CONFIG = {
  // Configurações para MKV (formato principal)
  MKV_MASTER: {
    VIDEO_CODEC: 'libx265',                 // HEVC para melhor compressão
    AUDIO_CODEC: 'flac',                    // Áudio sem perdas
    CRF: 18,                                // Qualidade visual sem perdas perceptíveis
    PRESET: 'medium',                       // Balanço qualidade/velocidade
    RESOLUTION: '1920x1080',                // Full HD padrão
    MAX_RESOLUTION: '3840x2160',            // 4K máximo
    BITRATE_4K: '15000k',
    BITRATE_1080P: '8000k',
    BITRATE_720P: '5000k',
    AUDIO_BITRATE: '1411k',                 // FLAC quality
  },
  
  // Configurações para streaming web
  WEB_STREAMING: {
    MP4: {
      VIDEO_CODEC: 'libx264',
      AUDIO_CODEC: 'aac',
      CRF: 21,
      PRESET: 'fast',
      AUDIO_BITRATE: '320k',
      PROFILE: 'high',
      LEVEL: '4.1',
    },
    WEBM: {
      VIDEO_CODEC: 'libvpx-vp9',
      AUDIO_CODEC: 'libopus',
      CRF: 23,
      AUDIO_BITRATE: '192k',
    }
  },

  // Configurações de qualidade por resolução
  QUALITY_PROFILES: {
    '4K': { width: 3840, height: 2160, bitrate: '15000k', suffix: '_4k' },
    '1080P': { width: 1920, height: 1080, bitrate: '8000k', suffix: '_1080p' },
    '720P': { width: 1280, height: 720, bitrate: '5000k', suffix: '_720p' },
    '480P': { width: 854, height: 480, bitrate: '2500k', suffix: '_480p' },
  },

  // Configurações de áudio multi-idioma
  AUDIO_CONFIG: {
    MASTER_CODEC: 'flac',                   // Sem perdas para master
    WEB_CODEC: 'aac',                       // Compatível para web
    CHANNELS: {
      STEREO: 2,
      SURROUND: 6,
      ATMOS: 8,
    },
    BITRATES: {
      LOSSLESS: '1411k',                    // FLAC
      HIGH: '320k',                         // AAC alta qualidade
      STANDARD: '256k',                     // AAC padrão
      MOBILE: '128k',                       // Para móveis
    }
  },

  // Metadados MKV suportados
  METADATA_SUPPORT: {
    VIDEO: ['title', 'duration', 'resolution', 'codec', 'bitrate', 'framerate'],
    AUDIO: ['language', 'title', 'codec', 'channels', 'bitrate', 'format'],
    SUBTITLES: ['language', 'title', 'format', 'encoding', 'forced', 'default'],
    CHAPTERS: ['title', 'start_time', 'end_time'],
    GLOBAL: ['title', 'description', 'creation_time', 'encoder']
  },

  MIME_TYPES: {
    '.mkv': 'video/x-matroska',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.m4v': 'video/mp4',
  },

  // Configurações de processamento
  PROCESSING: {
    MAX_CONCURRENT_JOBS: 2,                 // Máximo de conversões simultâneas
    PRIORITY_QUEUE: ['mkv', 'mp4', 'webm'], // Ordem de prioridade
    CHUNK_SIZE: 1024 * 1024 * 10,          // 10MB chunks para processamento
    TEMP_CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hora
    JOB_TIMEOUT: 3 * 60 * 60 * 1000,       // 3 horas timeout
  }
};

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Room Management
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  ROOM_STATE: 'room-state',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  
  // Video Control
  VIDEO_SYNC: 'video-sync',
  PLAY_PAUSE: 'play-pause',
  SEEK: 'seek',
  
  // Chat
  CHAT_MESSAGE: 'chat-message',
  CHAT_HISTORY: 'chat-history',
};

export const CHAT_CONFIG = {
  MAX_MESSAGES: 100,
  MAX_MESSAGE_LENGTH: 500,
  RATE_LIMIT: {
    WINDOW_MS: 1000,
    MAX_MESSAGES: 5,
  },
};

export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'Arquivo muito grande. Tamanho máximo: 2GB',
  INVALID_FILE_TYPE: 'Tipo de arquivo não suportado',
  UPLOAD_FAILED: 'Falha no upload do arquivo',
  ROOM_NOT_FOUND: 'Sala não encontrada',
  INVALID_ROOM_ID: 'ID da sala inválido',
  USERNAME_REQUIRED: 'Nome de usuário é obrigatório',
  MESSAGE_TOO_LONG: 'Mensagem muito longa',
  RATE_LIMIT_EXCEEDED: 'Muitas requisições. Tente novamente em alguns momentos',
};

export const UI_CONFIG = {
  TOAST_DURATION: 3000,
  SYNC_TOLERANCE: 1, // segundos
  CHAT_SCROLL_BEHAVIOR: 'smooth',
  VIDEO_SEEK_STEP: 5, // segundos
}; 
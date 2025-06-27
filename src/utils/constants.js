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
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
  ALLOWED_VIDEO_FORMATS: ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv'],
  ALLOWED_SUBTITLE_FORMATS: ['.srt', '.vtt'],
  PATHS: {
    VIDEOS: './public/videos',
    SUBTITLES: './public/subtitles',
    CONVERTED: './public/videos/converted',
  },
};

export const VIDEO_CONFIG = {
  QUALITY: {
    BITRATE: '2000k',
    RESOLUTION: '1920x1080',
    AUDIO_BITRATE: '256k',
    CRF: 20,
  },
  WEB_COMPATIBLE_FORMATS: ['.mp4', '.webm', '.ogg'],
  MIME_TYPES: {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.mkv': 'video/x-matroska',
  },
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
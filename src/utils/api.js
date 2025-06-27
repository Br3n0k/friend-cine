// Módulo centralizado para chamadas de API
import { SERVER_CONFIG, ERROR_MESSAGES } from './constants.js';

const API_BASE_URL = `http://localhost:${SERVER_CONFIG.PORT.BACKEND}`;

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Remove Content-Type para FormData
    if (config.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.text().catch(() => 'Unknown error');
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Erro de rede ou outro erro
      throw new ApiError(
        error.message || 'Erro de conexão com o servidor',
        0,
        error
      );
    }
  }

  // Métodos HTTP
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Instância singleton
const apiClient = new ApiClient();

// Funções específicas da API
export const api = {
  // Health check
  healthCheck: () => apiClient.get(SERVER_CONFIG.ENDPOINTS.HEALTH),

  // Videos
  getVideos: () => apiClient.get(SERVER_CONFIG.ENDPOINTS.VIDEOS),
  
  uploadVideo: (file, onProgress = null) => {
    const formData = new FormData();
    formData.append('video', file);
    
    return apiClient.post(SERVER_CONFIG.ENDPOINTS.UPLOAD, formData);
  },

  deleteVideo: (videoId) => apiClient.delete(`${SERVER_CONFIG.ENDPOINTS.VIDEOS}/${videoId}`),

  // Rooms
  getRooms: () => apiClient.get(SERVER_CONFIG.ENDPOINTS.ROOMS),
  
  createRoom: (roomData) => apiClient.post(SERVER_CONFIG.ENDPOINTS.ROOMS, roomData),
  
  getRoomInfo: (roomId) => apiClient.get(`${SERVER_CONFIG.ENDPOINTS.ROOMS}/${roomId}`),
};

// Utility functions
export const handleApiError = (error, defaultMessage = 'Ocorreu um erro') => {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 413:
        return ERROR_MESSAGES.FILE_TOO_LARGE;
      case 415:
        return ERROR_MESSAGES.INVALID_FILE_TYPE;
      case 429:
        return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
      case 404:
        return ERROR_MESSAGES.ROOM_NOT_FOUND;
      default:
        return error.message || defaultMessage;
    }
  }
  
  return error.message || defaultMessage;
};

export { ApiError }; 
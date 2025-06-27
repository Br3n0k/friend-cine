# 🔧 Documentação Técnica - Friend Cine

Documentação técnica detalhada do projeto Friend Cine para desenvolvedores e contribuidores.

## 📋 Índice

- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [API Reference](#-api-reference)
- [Eventos Socket.io](#-eventos-socketio)
- [Sistema de Segurança](#-sistema-de-segurança)
- [Processamento de Vídeo](#-processamento-de-vídeo)
- [Banco de Dados](#-banco-de-dados)
- [Logging e Monitoramento](#-logging-e-monitoramento)
- [Deployment](#-deployment)

## 🏗️ Arquitetura do Sistema

### Visão Geral

Friend Cine utiliza uma arquitetura de cliente-servidor com comunicação em tempo real:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   File System  │
│   (Astro)       │◄──►│   (Express)     │◄──►│   (Videos)      │
│                 │    │                 │    │                 │
│ - Video Player  │    │ - REST API      │    │ - Upload Dir    │
│ - Chat UI       │    │ - Socket.io     │    │ - Converted     │
│ - Room Mgmt     │    │ - FFmpeg        │    │ - Subtitles     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
              WebSocket
```

### Componentes Principais

#### Frontend (Astro)
- **Framework**: Astro 5.x com SSR
- **Estilização**: Tailwind CSS
- **Player**: Video.js
- **Comunicação**: Socket.io Client + Fetch API

#### Backend (Node.js)
- **Framework**: Express.js
- **WebSockets**: Socket.io
- **Upload**: Multer
- **Processamento**: FFmpeg via fluent-ffmpeg
- **Logging**: Winston

#### Storage
- **Vídeos**: Sistema de arquivos local
- **Metadados**: Memória (Map/Set)
- **Logs**: Arquivos rotacionados

## 📡 API Reference

### Authentication
Atualmente não há autenticação. Usuários são identificados por Socket.io session.

### Endpoints

#### `GET /api/health`
Health check do servidor.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "environment": "development",
  "uptime": 3600,
  "memory": {
    "used": 45,
    "total": 64
  }
}
```

#### `GET /api/videos`
Lista todos os vídeos disponíveis.

**Response:**
```json
[
  {
    "id": "video.mp4",
    "name": "Meu Filme",
    "url": "/videos/video.mp4",
    "size": 1073741824,
    "type": "original",
    "uploadDate": "2024-01-01T12:00:00Z",
    "isOptimized": false
  }
]
```

#### `POST /api/upload`
Upload de arquivo de vídeo.

**Request:**
- Content-Type: `multipart/form-data`
- Field: `video` (file)

**Rate Limit:** 5 uploads / 15 minutos por IP

**Response:**
```json
{
  "message": "Upload concluído com sucesso!",
  "file": {
    "originalName": "filme.mp4",
    "filename": "1704110400_filme.mp4",
    "size": 1073741824,
    "processingTime": 2500
  }
}
```

#### `DELETE /api/videos/:videoId`
Remove um vídeo e suas versões convertidas.

**Response:**
```json
{
  "success": true,
  "message": "Arquivo removido com sucesso",
  "removedFiles": ["video.mp4", "video_converted.mp4"],
  "closedRooms": 2
}
```

#### `GET /api/rooms`
Lista salas ativas.

**Response:**
```json
[
  {
    "id": "sala-filme",
    "videoFile": "filme.mp4",
    "userCount": 3,
    "isPlaying": true,
    "currentTime": 1820.5,
    "lastUpdate": 1704110400000
  }
]
```

#### `POST /api/rooms`
Cria uma nova sala.

**Request:**
```json
{
  "videoFile": "filme.mp4",
  "roomName": "Sala do Filme"
}
```

**Response:**
```json
{
  "success": true,
  "roomId": "Sala do Filme",
  "room": {
    "id": "Sala do Filme",
    "videoFile": "filme.mp4",
    "users": [],
    "userCount": 0
  }
}
```

### Rate Limiting

- **API Geral**: 100 requests / 15 minutos
- **Upload**: 5 uploads / 15 minutos
- **Chat**: 30 mensagens / minuto por socket

### Error Responses

```json
{
  "error": "Descrição do erro",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Códigos HTTP:**
- `400` - Bad Request (dados inválidos)
- `413` - Payload Too Large (arquivo muito grande)
- `415` - Unsupported Media Type (formato inválido)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

## 🔌 Eventos Socket.io

### Cliente → Servidor

#### `join-room`
Entrar em uma sala.

**Payload:**
```json
{
  "roomId": "nome-da-sala",
  "username": "Nome do Usuário"
}
```

**Validação:**
- `roomId`: string, 3-100 caracteres
- `username`: string, 2-50 caracteres
- Apenas alfanuméricos, espaços, `.`, `_`, `-`

#### `chat-message`
Enviar mensagem no chat.

**Payload:**
```json
{
  "roomId": "nome-da-sala",
  "message": "Mensagem do chat"
}
```

**Rate Limit:** 30 mensagens/minuto por socket

#### `video-sync`
Sincronizar estado do vídeo.

**Payload:**
```json
{
  "roomId": "nome-da-sala",
  "currentTime": 120.5,
  "isPlaying": true
}
```

#### `leave-room`
Sair da sala.

**Payload:**
```json
{
  "roomId": "nome-da-sala"
}
```

### Servidor → Cliente

#### `room-state`
Estado atual da sala enviado ao entrar.

**Payload:**
```json
{
  "id": "nome-da-sala",
  "videoFile": "filme.mp4",
  "currentTime": 120.5,
  "isPlaying": true,
  "users": [
    {
      "id": "socket-id",
      "username": "Usuario1",
      "joinedAt": 1704110400000
    }
  ],
  "userCount": 1,
  "chatMessages": []
}
```

#### `user-joined`
Novo usuário entrou na sala.

**Payload:**
```json
{
  "username": "Novo Usuario",
  "userCount": 2
}
```

#### `user-left`
Usuário saiu da sala.

**Payload:**
```json
{
  "username": "Usuario",
  "userCount": 1
}
```

#### `video-sync`
Sincronização de vídeo entre usuários.

**Payload:**
```json
{
  "currentTime": 125.0,
  "isPlaying": false,
  "timestamp": 1704110400000
}
```

#### `chat-message`
Nova mensagem de chat.

**Payload:**
```json
{
  "id": "uuid",
  "username": "Usuario",
  "message": "Mensagem sanitizada",
  "timestamp": 1704110400000
}
```

#### `error`
Erro do servidor.

**Payload:**
```json
{
  "message": "Descrição do erro"
}
```

## 🔒 Sistema de Segurança

### Middleware de Segurança

1. **Helmet**: Headers de segurança básicos
2. **Rate Limiting**: express-rate-limit + implementação customizada
3. **Sanitização**: Limpeza de entrada de dados
4. **Validação**: Validação rigorosa de tipos e formatos
5. **CORS**: Configuração restritiva
6. **CSP**: Content Security Policy

### Validações Implementadas

#### Upload de Arquivos
- Tipos permitidos: MP4, WebM, OGG, AVI, MOV, WMV, FLV, MKV
- Tamanho máximo: 2GB (configurável)
- Nome de arquivo: caracteres seguros apenas
- Rate limiting: 5 uploads/15min por IP

#### Socket Events
- Validação de schema para cada evento
- Sanitização de mensagens de chat
- Rate limiting por socket
- Verificação de usuário na sala

#### Logs de Segurança
- Tentativas de path traversal
- Padrões de XSS
- SQL injection attempts
- Rate limit violations

### Headers de Segurança

```javascript
{
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': '...'
}
```

## 🎬 Processamento de Vídeo

### FFmpeg Integration

O sistema usa FFmpeg para:
- Conversão para formatos web-compatíveis
- Preservação de múltiplas faixas de áudio
- Extração de legendas internas
- Otimização para streaming

### Processo de Conversão

1. **Upload**: Arquivo enviado para `/public/videos/`
2. **Análise**: FFprobe extrai metadados
3. **Conversão**: Múltiplos formatos gerados
4. **Armazenamento**: Versões salvas em `/converted/`

### Configurações de Qualidade

```javascript
{
  videoCodec: 'libx264',
  videoBitrate: '2000k',
  size: '1920x1080',
  crf: 20, // Qualidade alta
  audioCodec: 'aac',
  audioBitrate: '256k'
}
```

### Formatos de Saída

- **MP4**: H.264 + AAC (compatibilidade máxima)
- **WebM**: VP9 + Opus (qualidade/tamanho)
- **OGG**: Theora + Vorbis (fallback)

## 💾 Sistema de Dados

### Estrutura de Memória

#### Cinema Rooms (Map)
```javascript
Map<string, CinemaRoom> {
  "sala-id" => {
    id: "sala-id",
    videoFile: "video.mp4",
    users: Map<socketId, UserData>,
    currentTime: 120.5,
    isPlaying: true,
    lastUpdate: timestamp,
    chatMessages: Array<ChatMessage>
  }
}
```

#### User Data
```javascript
{
  id: "socket-id",
  username: "Usuario",
  joinedAt: timestamp
}
```

#### Chat Message
```javascript
{
  id: "uuid",
  username: "Usuario",
  message: "Mensagem sanitizada",
  timestamp: timestamp
}
```

### Limpeza Automática

- Salas vazias são removidas automaticamente
- Mensagens de chat limitadas a 100 por sala
- Arquivos temporários de conversão são limpos

## 📊 Logging e Monitoramento

### Níveis de Log

- **Error**: Erros da aplicação
- **Warn**: Eventos de segurança
- **Info**: Atividades normais
- **HTTP**: Requisições HTTP
- **Debug**: Informações detalhadas

### Estrutura de Logs

```json
{
  "timestamp": "2024-01-01 12:00:00",
  "level": "INFO",
  "message": "Socket Event",
  "service": "friend-cine",
  "event": "user_joined",
  "socketId": "abc123",
  "roomId": "sala-filme"
}
```

### Rotação de Logs

- Arquivo máximo: 5MB
- Manter 5 arquivos históricos
- Logs separados para errors

### Métricas Monitoradas

- Conexões WebSocket ativas
- Upload de arquivos
- Atividade por sala
- Performance de conversão
- Eventos de segurança

## 🚀 Deployment

### Variáveis de Ambiente

```bash
# Servidor
NODE_ENV=production
PORT=4000

# URLs
FRONTEND_URL=https://friendcine.com
BACKEND_URL=https://api.friendcine.com
ALLOWED_ORIGINS=https://friendcine.com

# Upload
MAX_FILE_SIZE=2147483648
UPLOAD_PATH=/app/uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logs
LOG_LEVEL=info
LOG_FILE=/var/log/friend-cine/app.log

# Limpeza
AUTO_CLEANUP_ENABLED=true
AUTO_CLEANUP_MAX_AGE=604800000
```

### Docker

```dockerfile
FROM node:18-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000 4000
CMD ["npm", "run", "dev:all"]
```

### Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name friendcine.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files
    location /videos/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
    }
}
```

### Monitoramento

- **Health Check**: `GET /api/health`
- **Logs**: Winston com rotação
- **Métricas**: CPU, Memória, Disk I/O
- **Alerts**: Erros, alta latência, disk space

---

**Para mais informações técnicas, consulte o código fonte ou abra uma issue.** 
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs-extra';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { VideoConverter } from './video-converter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 4000;

// Armazenamento para salas de cinema
const cinemaRooms = new Map();

// Inicializar conversor de vídeo
const videosDir = path.join(__dirname, '../public/videos');
const videoConverter = new VideoConverter(videosDir);

// Configuração do multer para upload de vídeos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/videos');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'), false);
    }
  }
});

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Servir arquivos estáticos com headers MIME corretos para vídeos
app.use('/videos', (req, res, next) => {
  const filePath = path.join(__dirname, '../public/videos', req.path);
  const ext = path.extname(req.path).toLowerCase();
  
  // Configurar MIME types corretos para vídeos
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.mkv': 'video/x-matroska'
  };
  
  if (mimeTypes[ext]) {
    res.setHeader('Content-Type', mimeTypes[ext]);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
  }
  
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

// Classe para gerenciar uma sala de cinema
class CinemaRoom {
  constructor(id, videoFile) {
    this.id = id;
    this.videoFile = videoFile;
    this.users = new Map();
    this.currentTime = 0;
    this.isPlaying = false;
    this.lastUpdate = Date.now();
    this.chatMessages = [];
  }

  addUser(socketId, username) {
    this.users.set(socketId, {
      id: socketId,
      username: username || `Usuário ${this.users.size + 1}`,
      joinedAt: Date.now()
    });
  }

  removeUser(socketId) {
    this.users.delete(socketId);
  }

  updatePlaybackState(currentTime, isPlaying) {
    this.currentTime = currentTime;
    this.isPlaying = isPlaying;
    this.lastUpdate = Date.now();
  }

  addChatMessage(username, message) {
    const chatMessage = {
      id: uuidv4(),
      username,
      message,
      timestamp: Date.now()
    };
    this.chatMessages.push(chatMessage);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift(); // Manter apenas as últimas 100 mensagens
    }
    return chatMessage;
  }

  getRoomState() {
    return {
      id: this.id,
      videoFile: this.videoFile,
      currentTime: this.currentTime,
      isPlaying: this.isPlaying,
      lastUpdate: this.lastUpdate,
      users: Array.from(this.users.values()),
      userCount: this.users.size,
      chatMessages: this.chatMessages.slice(-20) // Últimas 20 mensagens
    };
  }
}

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Friend Cine Server funcionando!',
    timestamp: new Date().toISOString(),
    cors: 'Configurado para localhost:3000'
  });
});

// Rotas da API
app.get('/api/videos', async (req, res) => {
  try {
    const videosDir = path.join(__dirname, '../public/videos');
    const convertedDir = path.join(videosDir, 'converted');
    await fs.ensureDir(videosDir);
    await fs.ensureDir(convertedDir);
    
    const videos = [];
    
    // Listar arquivos originais na pasta principal
    const originalFiles = await fs.readdir(videosDir);
    const originalVideoFiles = originalFiles.filter(file => 
      /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv)$/i.test(file) && 
      !file.startsWith('.') // Ignorar arquivos ocultos
    );

    for (const file of originalVideoFiles) {
      const filePath = path.join(videosDir, file);
      const stats = await fs.stat(filePath);
      
      videos.push({
        id: file,
        name: file.replace(/\.[^/.]+$/, ""), // Remove extensão
        url: `/videos/${file}`,
        size: stats.size,
        type: 'original',
        uploadDate: stats.mtime
      });
    }

    // Listar arquivos convertidos na pasta /converted/
    try {
      const convertedFiles = await fs.readdir(convertedDir);
      const convertedVideoFiles = convertedFiles.filter(file => 
        /\.(mp4|webm|ogg)$/i.test(file) && // Apenas formatos web otimizados
        !file.endsWith('.converting') // Excluir arquivos de lock
      );

      for (const file of convertedVideoFiles) {
        const filePath = path.join(convertedDir, file);
        const lockFile = filePath + '.converting';
        
        // Verificar se não existe arquivo de lock (conversão não está em andamento)
        if (!await fs.exists(lockFile)) {
          const stats = await fs.stat(filePath);
          
          // Verificar se o arquivo tem tamanho razoável (conversão completa)
          if (stats.size > 1024 * 1024) { // > 1MB
            videos.push({
              id: file,
              name: file.replace(/\.[^/.]+$/, ""),
              url: `/videos/converted/${file}`,
              size: stats.size,
              type: 'converted',
              isOptimized: true,
              uploadDate: stats.mtime
            });
          }
        }
      }
    } catch (convertedError) {
      console.log('📁 Pasta converted não existe ou está vazia');
    }

    // Ordenar por data de upload (mais recente primeiro)
    videos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    res.json(videos);
  } catch (error) {
    console.error('Erro ao listar vídeos:', error);
    res.status(500).json({ error: 'Erro ao listar vídeos' });
  }
});

app.post('/api/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    console.log(`📁 Arquivo enviado: ${req.file.originalname}`);
    
    // Resposta inicial rápida para o cliente
    const initialResponse = {
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: `/videos/${req.file.filename}`,
      isProcessing: true,
      message: 'Upload concluído. Processando vídeo para compatibilidade...'
    };

    res.json(initialResponse);

    // Processar arquivo em background
    try {
      console.log(`🔄 Iniciando processamento automático: ${req.file.originalname}`);
      
      const processedFiles = await videoConverter.processUploadedFile(
        req.file.path, 
        req.file.originalname
      );

      console.log(`✅ Processamento concluído para: ${req.file.originalname}`);
      console.log('📁 Arquivos gerados:', processedFiles.map(f => f.format).join(', '));

      // Aqui poderíamos notificar via WebSocket se necessário
      // io.emit('video-processed', { filename: req.file.filename, processedFiles });

    } catch (processingError) {
      console.error(`❌ Erro no processamento de ${req.file.originalname}:`, processingError);
      // Arquivo original ainda está disponível, mesmo se a conversão falhar
    }

  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro no upload do arquivo' });
  }
});

// Rota para converter arquivo existente
app.post('/api/convert/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(videosDir, filename);
    
    if (!await fs.exists(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    console.log(`🔄 Solicitação de conversão para: ${filename}`);
    
    const processedFiles = await videoConverter.processUploadedFile(filePath, filename);
    
    res.json({
      success: true,
      originalFile: filename,
      processedFiles: processedFiles,
      message: 'Conversão concluída'
    });
    
  } catch (error) {
    console.error('Erro na conversão:', error);
    res.status(500).json({ error: 'Erro na conversão do arquivo' });
  }
});

// Rota para deletar vídeo
app.delete('/api/videos/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const convertedDir = path.join(videosDir, 'converted');
    
    console.log(`🗑️ Solicitação de remoção: ${filename}`);
    
    let filePath;
    let isConverted = false;
    
    // Determinar se é arquivo original ou convertido
    const originalPath = path.join(videosDir, filename);
    const convertedPath = path.join(convertedDir, filename);
    
    if (await fs.exists(originalPath)) {
      filePath = originalPath;
      isConverted = false;
    } else if (await fs.exists(convertedPath)) {
      filePath = convertedPath;
      isConverted = true;
    } else {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Fechar salas que usam este vídeo
    const roomsToClose = [];
    for (const [roomId, room] of cinemaRooms.entries()) {
      if (room.videoFile === filename || room.videoFile.includes(path.parse(filename).name)) {
        roomsToClose.push(roomId);
        // Notificar usuários da sala que ela será fechada
        io.to(roomId).emit('room-closed', { 
          message: 'A sala foi fechada porque o vídeo foi removido.' 
        });
      }
    }

    // Remover salas do mapa
    roomsToClose.forEach(roomId => {
      console.log(`🚪 Fechando sala: ${roomId} (vídeo removido)`);
      cinemaRooms.delete(roomId);
    });

    const baseName = path.parse(filename).name;
    const removedFiles = [];

    if (isConverted) {
      // Se removendo arquivo convertido, remover apenas ele
      await fs.remove(filePath);
      console.log(`✅ Arquivo convertido removido: ${filename}`);
      removedFiles.push(filename);
    } else {
      // Se removendo arquivo original, remover ele e todas as versões convertidas
      await fs.remove(filePath);
      console.log(`✅ Arquivo original removido: ${filename}`);
      removedFiles.push(filename);

      // Deletar versões convertidas relacionadas
      try {
        if (await fs.exists(convertedDir)) {
          const convertedFiles = await fs.readdir(convertedDir);
          
          for (const convertedFile of convertedFiles) {
            if (convertedFile.includes(baseName)) {
              const convertedFilePath = path.join(convertedDir, convertedFile);
              await fs.remove(convertedFilePath);
              console.log(`✅ Versão convertida removida: ${convertedFile}`);
              removedFiles.push(convertedFile);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Erro ao remover versões convertidas:', error.message);
      }
    }

    res.json({
      success: true,
      message: isConverted ? 
        'Arquivo convertido removido com sucesso' : 
        'Arquivo original e versões convertidas removidos com sucesso',
      removedFiles: removedFiles,
      closedRooms: roomsToClose.length,
      type: isConverted ? 'converted' : 'original'
    });
    
  } catch (error) {
    console.error('❌ Erro ao deletar vídeo:', error);
    res.status(500).json({ error: 'Erro ao deletar arquivo' });
  }
});

app.get('/api/rooms', (req, res) => {
  const rooms = Array.from(cinemaRooms.values()).map(room => ({
    id: room.id,
    videoFile: room.videoFile,
    userCount: room.users.size,
    isPlaying: room.isPlaying
  }));
  res.json(rooms);
});

app.post('/api/rooms', (req, res) => {
  const { videoFile, roomName } = req.body;
  
  if (!videoFile) {
    return res.status(400).json({ error: 'Arquivo de vídeo é obrigatório' });
  }

  const roomId = roomName || `sala-${uuidv4()}`;
  const room = new CinemaRoom(roomId, videoFile);
  cinemaRooms.set(roomId, room);

  res.json({
    success: true,
    roomId: roomId,
    room: room.getRoomState()
  });
});

// Socket.io para sincronização em tempo real
io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  socket.on('join-room', (data) => {
    const { roomId, username } = data;
    const room = cinemaRooms.get(roomId);

    if (room) {
      socket.join(roomId);
      room.addUser(socket.id, username);
      
      // Enviar estado atual da sala para o usuário
      socket.emit('room-state', room.getRoomState());
      
      // Notificar outros usuários
      socket.to(roomId).emit('user-joined', {
        username: username || `Usuário ${room.users.size}`,
        userCount: room.users.size
      });

      console.log(`${username || socket.id} entrou na sala ${roomId}`);
    } else {
      socket.emit('error', { message: 'Sala não encontrada' });
    }
  });

  socket.on('video-action', (data) => {
    const { roomId, action, currentTime } = data;
    const room = cinemaRooms.get(roomId);

    if (room) {
      room.updatePlaybackState(currentTime, action === 'play');
      
      // Transmitir ação para todos os usuários da sala
      socket.to(roomId).emit('video-sync', {
        action,
        currentTime,
        timestamp: Date.now()
      });

      console.log(`Ação de vídeo na sala ${roomId}: ${action} em ${currentTime}s`);
    }
  });

  socket.on('seek-video', (data) => {
    const { roomId, currentTime } = data;
    const room = cinemaRooms.get(roomId);

    if (room) {
      room.updatePlaybackState(currentTime, room.isPlaying);
      
      socket.to(roomId).emit('video-seek', {
        currentTime,
        timestamp: Date.now()
      });

      console.log(`Usuário pulou para ${currentTime}s na sala ${roomId}`);
    }
  });

  socket.on('chat-message', (data) => {
    const { roomId, message } = data;
    const room = cinemaRooms.get(roomId);

    if (room && message.trim()) {
      const user = room.users.get(socket.id);
      if (user) {
        const chatMessage = room.addChatMessage(user.username, message.trim());
        
        // Transmitir mensagem para todos na sala
        io.to(roomId).emit('new-chat-message', chatMessage);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${socket.id}`);
    
    // Remover usuário de todas as salas
    for (const [roomId, room] of cinemaRooms) {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.removeUser(socket.id);
        
        // Notificar outros usuários
        socket.to(roomId).emit('user-left', {
          username: user.username,
          userCount: room.users.size
        });

        // Remover sala se vazia
        if (room.users.size === 0) {
          cinemaRooms.delete(roomId);
          console.log(`Sala ${roomId} foi removida (vazia)`);
        }
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎬 Friend Cine Server rodando na porta ${PORT}`);
  console.log(`📁 Pasta de vídeos: ${path.join(__dirname, '../public/videos')}`);
  console.log(`🌐 API disponível em: http://localhost:${PORT}`);
  console.log(`🔗 CORS configurado para: http://localhost:3000`);
  console.log(`🚀 Pronto para receber conexões!`);
}); 
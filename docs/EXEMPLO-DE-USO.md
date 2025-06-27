# 🎬 Exemplo de Uso - Friend Cine

## 🚀 Início Rápido

### 1. Executar a Aplicação

**Windows:**
```bash
# Duplo clique no arquivo start.bat
# OU execute no terminal:
start.bat
```

**Linux/Mac:**
```bash
./start.sh
# OU
chmod +x start.sh && ./start.sh
```

**Manual:**
```bash
# Terminal 1 (Backend)
npm run dev:server

# Terminal 2 (Frontend) 
npm run dev
```

### 2. Acessar a Aplicação
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000

## 📁 Testando com Vídeos

### 1. Adicionar Vídeos
Coloque seus arquivos de vídeo na pasta:
```
public/videos/
├── meu-filme.mp4
├── serie-episodio-1.webm
└── documentario.avi
```

### 2. Adicionar Legendas (Opcional)
Coloque arquivos de legenda na pasta:
```
public/subtitles/
├── meu-filme.pt.srt
├── meu-filme.en.vtt
└── serie-episodio-1.pt.srt
```

## 🎯 Exemplo de Sessão

### Usuário 1 (Host):
1. Acesse http://localhost:3000
2. Faça upload de um vídeo ou use um existente
3. Clique em "Criar Sala" no vídeo
4. Digite nome da sala: "Sessão de Cinema" 
5. Digite seu nome: "João"
6. Compartilhe o link da sala com amigos

### Usuário 2 (Convidado):
1. Acesse http://localhost:3000
2. Veja a sala "Sessão de Cinema" na lista
3. Clique para entrar
4. Digite seu nome: "Maria"
5. Assista sincronizado com João!

## 🎮 Controles Durante o Filme

### Atalhos de Teclado:
- **Espaço:** Play/Pause (sincroniza com todos)
- **← →:** Voltar/Avançar 5 segundos
- **↑ ↓:** Controle de volume
- **M:** Mute/Unmute
- **F:** Tela cheia

### Controles de Faixas:
- Botões aparecem automaticamente se o vídeo tiver múltiplas faixas
- Clique nos botões no canto inferior esquerdo
- Selecione áudio ou legenda desejada

## 💬 Chat Durante o Filme

### Comandos:
- Digite normalmente e pressione Enter
- Mensagens aparecem para todos na sala
- Histórico mantido durante a sessão
- Notificações automáticas de entrada/saída

## 🔧 Resolução de Problemas Comuns

### ❌ "Erro ao carregar vídeos"
```bash
# Verifique se as pastas existem:
mkdir -p public/videos public/subtitles

# Reinicie o servidor backend:
npm run dev:server
```

### ❌ "Não consegue conectar"
```bash
# Verifique se ambos os servidores estão rodando:
# - Backend: http://localhost:4000
# - Frontend: http://localhost:3000

# Reinicie ambos se necessário
```

### ❌ "Vídeo não sincroniza"
- Recarregue a página (F5)
- Verifique console do navegador (F12)
- Teste com outro navegador

### ❌ "Upload falha"
- Verifique tamanho do arquivo (máx 2GB)
- Confirme formato suportado (MP4, WebM, etc.)
- Verifique espaço em disco

## 📱 Testando com Múltiplos Usuários

### Método 1: Múltiplas Abas
1. Abra várias abas em http://localhost:3000
2. Entre com nomes diferentes
3. Teste sincronização

### Método 2: Múltiplos Dispositivos
1. Encontre seu IP local: `ipconfig` (Windows) ou `ifconfig` (Linux/Mac)
2. Acesse de outros dispositivos: http://[SEU-IP]:3000
3. Crie/entre em salas normalmente

### Método 3: Modo Incógnito
1. Use janela normal + janela incógnita
2. Simule usuários diferentes
3. Teste todas as funcionalidades

## 🎉 Funcionalidades Avançadas para Testar

### Upload Drag & Drop
- Arraste vídeos diretamente para a área de upload
- Veja progresso em tempo real
- Teste com diferentes formatos

### Múltiplas Salas
- Crie várias salas simultâneas
- Entre em salas diferentes com abas diferentes
- Veja lista de salas ativas

### Chat Rico
- Teste mensagens longas
- Veja notificações de entrada/saída
- Teste scroll automático

### Controles Avançados
- Teste velocidade de reprodução
- Mude faixas de áudio se disponível
- Ative/desative legendas

---

**🎬 Divirta-se assistindo filmes com seus amigos!** 
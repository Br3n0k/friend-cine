# 📦 Friend Cine MKV - Guia de Comandos

## 🎬 **Visão Geral**

O Friend Cine v2.0 é uma plataforma colaborativa para assistir filmes com conversão automática MKV H.265/FLAC. Este guia documenta todos os comandos NPM disponíveis.

```bash
npm run help  # Ver todos os comandos
```

---

## 🚀 **COMANDOS DE INÍCIO RÁPIDO**

### Inicialização
```bash
npm start                # Iniciar sistema completo (frontend + backend)
npm run setup            # Configurar sistema + instalar FFmpeg
npm run setup:quick      # Verificar sistema (sem instalar FFmpeg)
npm run setup:full       # Setup completo + inicializar storage
npm run status           # Verificar status geral do sistema
```

### Desenvolvimento
```bash
npm run dev:all          # Frontend + Backend em paralelo
npm run dev:server       # Apenas backend (porta 4000)
npm run dev:frontend     # Apenas frontend (porta 3000)
```

---

## 🎬 **COMANDOS FFMPEG**

### Instalação e Verificação
```bash
npm run ffmpeg:install   # Instalar FFmpeg automaticamente
npm run ffmpeg:check     # Verificar se FFmpeg está instalado
npm run ffmpeg:codecs    # Listar codecs MKV disponíveis
```

### Aliases
```bash
npm run install-ffmpeg   # Alias para ffmpeg:install
npm run check-ffmpeg     # Alias para ffmpeg:check
```

**Codecs Verificados:**
- ✅ H.265/HEVC (vídeo principal)
- ✅ FLAC (áudio lossless)
- ✅ AAC (áudio web)
- ✅ H.264 (fallback)

---

## 🧪 **COMANDOS DE TESTE**

### Testes do Sistema
```bash
npm test                 # Testar sistema completo
npm run test:full        # Testes + codecs + conectividade
npm run check-system     # Verificar arquivos e estrutura
```

### Testes Específicos
```bash
npm run test:codec       # Abrir teste de codecs no navegador
npm run test:codec:cli   # Mostrar URL do teste de codecs
npm run test:connection  # Abrir teste de conectividade
npm run test:connection:cli # Mostrar URL do teste de conexão
```

**O que é testado:**
- 🎬 FFmpeg e codecs MKV
- 📁 Arquivos essenciais do projeto
- 📦 Estrutura de storage
- 📚 Dependências Node.js
- 🌐 Conectividade e APIs

---

## 📦 **COMANDOS DE STORAGE**

### Gerenciamento
```bash
npm run storage:init     # Criar estrutura de diretórios
npm run storage:stats    # Estatísticas de arquivos
npm run storage:clean    # Limpar arquivos temporários
npm run storage:backup   # Backup do storage com data
```

### Estrutura de Storage
```
storage/
├── uploads/     # Uploads temporários
├── processing/  # Arquivos sendo processados
├── masters/     # Arquivos MKV principais
├── web/         # Versões web (MP4, WebM)
├── subtitles/   # Legendas por idioma
├── thumbnails/  # Miniaturas por tamanho
├── metadata/    # Metadados extraídos
└── temp/        # Arquivos temporários
```

---

## 🛠️ **COMANDOS DE DESENVOLVIMENTO**

### Build e Preview
```bash
npm run build           # Build para produção
npm run preview         # Preview da build
npm run astro           # Comando direto do Astro
```

### Logs
```bash
npm run logs:view       # Ver logs em tempo real
npm run logs:errors     # Ver apenas erros
npm run logs:clear      # Limpar logs
```

### Linting
```bash
npm run lint            # Verificar código
npm run lint:fix        # Corrigir automaticamente
```

---

## 🧹 **COMANDOS DE LIMPEZA**

### Limpeza Geral
```bash
npm run clean           # Limpar build e cache
npm run clean:storage   # Limpar apenas storage
npm run clean:logs      # Limpar logs
npm run clean:all       # Limpar tudo
npm run clean:dev       # Limpar + reinstalar
```

### Específicos
```bash
# Limpa dist, .astro, node_modules/.astro
npm run clean

# Limpa uploads, processing, temp
npm run clean:storage

# Limpa pasta logs
npm run clean:logs
```

---

## 🐳 **COMANDOS DOCKER**

### Build e Execução
```bash
npm run docker:build    # Build da imagem MKV
npm run docker:run      # Executar container
npm run docker:dev      # Docker Compose para dev
npm run docker:stop     # Parar containers
```

### Configuração Docker
- **Imagem:** `friend-cine-mkv`
- **Portas:** 3000 (frontend), 4000 (backend)
- **Volume:** `./storage:/app/storage`

---

## 🔧 **COMANDOS DE SAÚDE**

### Monitoramento
```bash
npm run health          # Verificar API de saúde
npm run status          # Status completo (health + system)
```

### URLs de Saúde
- **Backend:** http://localhost:4000/api/health
- **Frontend:** http://localhost:3000
- **Teste Codecs:** http://localhost:3000/dev/test-codec.html
- **Teste Conexão:** http://localhost:3000/dev/test-connection.html

---

## ⚙️ **CONFIGURAÇÃO DO SISTEMA**

### Requisitos
- **Node.js:** >=18.0.0
- **NPM:** >=8.0.0
- **FFmpeg:** Requerido para conversão MKV
- **Espaço:** 5GB+ para arquivos

### Configurações MKV
```json
{
  "videoCodec": "hevc",
  "audioCodec": "flac", 
  "profiles": ["4k", "1080p", "720p", "480p"],
  "maxFileSize": "5GB",
  "formats": [".mkv", ".mp4", ".avi", ".mov", ".webm"]
}
```

---

## 📊 **SCRIPTS AUTOMATIZADOS**

### Post-Install
```bash
# Executado automaticamente após npm install
npm run setup:quick
```

### Aliases Úteis
```bash
# Testes
npm test = npm run check-system

# FFmpeg
npm run install-ffmpeg = npm run ffmpeg:install
npm run check-ffmpeg = npm run ffmpeg:check

# Storage
npm run clean:storage = npm run storage:clean
```

---

## 🎯 **FLUXO DE TRABALHO RECOMENDADO**

### 1. **Primeira Instalação**
```bash
git clone <repo>
cd friend-cine
npm install          # Executa setup:quick automaticamente
npm run setup        # Instalar FFmpeg se necessário
```

### 2. **Desenvolvimento Diário**
```bash
npm start            # Iniciar sistema
npm test             # Verificar se tudo funciona
npm run logs:view    # Monitorar em outro terminal
```

### 3. **Manutenção**
```bash
npm run storage:stats    # Ver estatísticas
npm run storage:backup   # Backup periódico
npm run clean:storage    # Limpar quando necessário
```

### 4. **Deploy**
```bash
npm run build        # Build para produção
npm run docker:build # Criar imagem Docker
```

---

## 🆘 **SOLUÇÃO DE PROBLEMAS**

### FFmpeg não encontrado
```bash
npm run ffmpeg:install  # Instalar automaticamente
npm run ffmpeg:check    # Verificar instalação
```

### Sistema com problemas
```bash
npm run status          # Diagnóstico completo
npm test                # Verificar todos os componentes
npm run clean:dev       # Limpar e reinstalar
```

### Storage corrompido
```bash
npm run storage:stats   # Ver estatísticas
npm run storage:clean   # Limpar temporários
npm run storage:backup  # Backup antes de limpar
```

---

## 🎉 **Sistema MKV H.265/FLAC Pronto!**

Com estes comandos você tem controle total sobre o Friend Cine MKV. Para ajuda rápida, sempre execute:

```bash
npm run help
``` 
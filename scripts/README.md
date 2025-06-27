# 🔧 Scripts Utilitários - Friend Cine

Esta pasta contém scripts auxiliares para instalação, teste e manutenção do sistema Friend Cine MKV.

## 📋 Scripts Disponíveis

### 🎬 `install-ffmpeg.js`
**Instalação automática do FFmpeg**

```bash
# Instalar FFmpeg automaticamente
npm run install-ffmpeg

# Apenas verificar se está instalado
npm run check-ffmpeg
```

**Funcionalidades:**
- ✅ Detecção automática do sistema operacional
- 🪟 Windows: Winget ou Chocolatey
- 🐧 Linux: apt, yum, pacman 
- 🍎 macOS: Homebrew
- 🔍 Verificação de codecs H.265/HEVC e FLAC
- 📋 Instruções manuais se automação falhar

---

### 🧪 `test-system.js`
**Teste completo do sistema**

```bash
# Executar todos os testes
npm run check-system
# ou
npm test
```

**Verificações:**
- ✅ FFmpeg e codecs MKV (H.265, FLAC)
- 📁 Estrutura de arquivos e storage
- 📦 Dependências node_modules
- 🔗 Links simbólicos de vídeos
- 🌐 Conectividade de portas e APIs
- 📊 Status geral do sistema

---

## 🎯 Comandos Integrados ao Package.json

### **Desenvolvimento**
```bash
npm start                # Iniciar sistema completo
npm run dev:server      # Backend apenas (porta 4000)
npm run dev:frontend    # Frontend apenas (porta 3000)
npm run dev:all         # Ambos os serviços
```

### **Testes e Diagnóstico**
```bash
npm test                # Teste completo do sistema
npm run check-system    # Alias para test
npm run check-ffmpeg    # Verificar FFmpeg
npm run test:codec      # Teste de codecs no navegador
npm run test:connection # Teste de conectividade
```

### **Instalação e Setup**
```bash
npm run setup           # Setup completo (FFmpeg + testes)
npm run install-ffmpeg  # Instalar FFmpeg
npm install             # Auto-executa setup (postinstall)
```

### **Limpeza e Manutenção**
```bash
npm run clean           # Limpar build e cache
npm run clean:storage   # Limpar arquivos temporários
npm run clean:all       # Limpeza completa
```

### **Docker**
```bash
npm run docker:build    # Build da imagem Docker
npm run docker:run      # Executar container
```

---

## 🔄 Migração dos Scripts Antigos

### ❌ **Removidos**
- `start.bat` → Integrado ao `npm start`
- `start.sh` → Integrado ao `npm start`
- Scripts isolados na raiz → Organizados em `/scripts/`

### ✅ **Novos Locais**
- Scripts utilitários: `/scripts/`
- Testes de desenvolvimento: `/dev/`
- Comandos principais: `package.json`

---

## 🚀 Uso Rápido

### **Primeira Instalação**
```bash
git clone <repo>
cd friend-cine
npm install    # Instala deps + FFmpeg + testa sistema
npm start      # Inicia aplicação completa
```

### **Desenvolvimento Diário**  
```bash
npm start      # Inicia tudo
npm test       # Testa se algo quebrou
```

### **Solução de Problemas**
```bash
npm run check-system    # Diagnóstico completo
npm run clean:all       # Limpar tudo
npm run install-ffmpeg  # Reinstalar FFmpeg
```

---

## 🎬 Recursos MKV

Os scripts são otimizados para o sistema MKV:

- **Codecs:** H.265/HEVC + FLAC
- **Qualidades:** 4K, 1080p, 720p, 480p
- **Storage:** Sistema organizado em `/storage/`
- **Conversão:** Processamento em background
- **Web:** Fallback para MP4/WebM

---

## 🔧 Estrutura Técnica

```
scripts/
├── install-ffmpeg.js   # Instalador multiplataforma
├── test-system.js      # Testes completos
└── README.md           # Esta documentação

dev/
├── test-codec.html     # Teste de codecs no browser
└── test-connection.html # Teste de conectividade

package.json            # Comandos principais integrados
```

---

## 📞 Suporte

Se algum script não funcionar:

1. **Execute:** `npm run check-system`
2. **Verifique:** Logs no terminal
3. **Teste:** `npm run test:codec` no navegador
4. **Limpe:** `npm run clean:all` se necessário

O sistema foi projetado para ser **auto-diagnosticável** e **auto-reparável**. 🎯 
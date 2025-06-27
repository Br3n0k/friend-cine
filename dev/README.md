# 🧪 Testes de Desenvolvimento - Friend Cine

Esta pasta contém arquivos de teste e diagnóstico para desenvolvimento do sistema Friend Cine MKV.

## 📋 Arquivos de Teste

### 🎬 `test-codec.html`
**Teste de Compatibilidade de Codecs MKV**

Acesse: `http://localhost:3000/dev/test-codec.html`

```bash
# Comando rápido para abrir
npm run test:codec
```

**Funcionalidades:**
- ✅ Teste de codecs H.265/HEVC prioritários
- 🎵 Teste de áudio FLAC e AAC
- 🌐 Fallback para formatos web (MP4, WebM)
- 🎥 Teste com arquivo de exemplo
- 📊 Informações detalhadas de reprodução
- 🔍 Detecção de hardware acceleration

**Codecs Testados:**
- **Prioritários MKV:** H.265/HEVC + FLAC
- **Web Fallback:** H.264 + AAC, VP9 + Opus
- **Compatibilidade:** Safari, Chrome, Firefox, Edge

---

### 🔌 `test-connection.html`
**Teste de Conectividade Completo**

Acesse: `http://localhost:3000/dev/test-connection.html`

```bash
# Comando rápido para abrir
npm run test:connection
```

**Funcionalidades:**
- ✅ WebSocket (Socket.io) em tempo real
- 🌐 Teste de todas as APIs refatoradas
- 📁 Verificação do sistema de storage
- 🎬 Status do FFmpeg e conversão
- 📊 Dashboard de monitoramento
- 🔄 Testes automáticos com retry

**APIs Testadas:**
- `/api/health` - Health check
- `/api/videos` - Lista com metadados MKV
- `/api/videos/stats` - Estatísticas
- `/api/system/storage` - Status do storage
- `/api/conversion/queue` - Fila de conversão
- `/api/system/ffmpeg` - Status do FFmpeg

---

## 🚀 Como Usar

### **Durante Desenvolvimento**
1. **Inicie o sistema:** `npm start`
2. **Abra os testes:** 
   - Codecs: `npm run test:codec`
   - Conexão: `npm run test:connection`
3. **Monitore:** Console do navegador para logs detalhados

### **Solução de Problemas**
```bash
# Se algum teste falhar
npm run check-system    # Diagnóstico completo via terminal
npm run clean:storage   # Limpar cache se necessário
npm run install-ffmpeg  # Reinstalar FFmpeg se preciso
```

### **Testes Específicos**
```bash
# Apenas verificar codecs no terminal
npm run check-ffmpeg

# Teste completo do sistema
npm test

# Limpeza antes de testar
npm run clean:all && npm start
```

---

## 🎯 Cenários de Teste

### **✅ Funcionamento Ideal**
- Todos os codecs MKV suportados
- WebSocket conectado
- Todas as APIs respondendo
- FFmpeg com H.265/FLAC funcionando
- Storage estruturado

### **⚠️ Funcionamento Parcial**
- Alguns codecs não suportados (fallback para web)
- FFmpeg ausente (apenas reprodução)
- Algumas APIs offline
- Storage básico

### **❌ Problemas Críticos**
- WebSocket não conecta
- APIs principais offline
- Estrutura de arquivos quebrada
- Dependências ausentes

---

## 🔧 Desenvolvimento dos Testes

### **Estrutura HTML**
```html
<!-- Ambos usam design consistente -->
- Design system unificado
- Grid responsivo
- Animações suaves
- Tema dark otimizado
- Feedback visual em tempo real
```

### **JavaScript Moderno**
```javascript
// Testes assíncronos paralelos
- Promise.allSettled para APIs
- WebSocket eventos em tempo real
- Logs estruturados
- Retry automático
- Timeout configurável
```

### **Compatibilidade**
```css
/* Suporte cross-browser */
- Safari: -webkit-backdrop-filter
- Chrome/Edge: backdrop-filter nativo
- Firefox: Degradação elegante
- Mobile: Layout responsivo
```

---

## 📊 Métricas de Teste

### **Performance**
- ⚡ Carregamento < 2s
- 🔄 Testes paralelos
- 📱 Responsivo

### **Cobertura**
- 🎬 100% dos codecs MKV
- 🌐 100% das APIs refatoradas
- 🔌 100% das funcionalidades WebSocket
- 📁 100% da estrutura de storage

### **Usabilidade**
- 🎨 Interface intuitiva
- 📋 Logs claros
- 🔍 Debug facilitado
- 📞 Comandos de correção

---

## 🎬 Integração com Sistema MKV

Os testes foram projetados especificamente para o sistema refatorado:

- **Codecs Prioritários:** H.265, FLAC
- **Estrutura Storage:** `/storage/masters/`, `/storage/web/`
- **APIs Refatoradas:** Metadados completos, conversão em background
- **WebSocket:** Notificações de upload/conversão
- **Fallback Inteligente:** MP4/WebM quando MKV não suportado

---

## 🔄 Atualizações

### **Versão 1.0 (Atual)**
- ✅ Sistema MKV completo
- ✅ Testes de codecs H.265/FLAC
- ✅ APIs refatoradas
- ✅ WebSocket em tempo real
- ✅ Design system moderno

### **Próximas Versões**
- 🔮 Teste de streaming HLS
- 🔮 Benchmark de performance
- 🔮 Teste de múltiplas trilhas de áudio
- 🔮 Validação de legendas automática

---

## 📞 Ajuda

**Problemas Comuns:**
- **Codec não suportado:** Normal, sistema usa fallback
- **API offline:** Verificar se servidor está rodando
- **WebSocket falha:** Verificar porta 4000
- **FFmpeg ausente:** `npm run install-ffmpeg`

**Debug Avançado:**
- Console do navegador tem logs detalhados
- `npm run check-system` para diagnóstico completo
- Logs do servidor em `storage/logs/`

O sistema é **auto-diagnosticável** - os próprios testes indicam a solução! 🎯 
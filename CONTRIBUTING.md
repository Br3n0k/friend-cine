# 🤝 Guia de Contribuição - Friend Cine

Obrigado por considerar contribuir com o Friend Cine! Este documento fornece diretrizes para contribuições ao projeto.

## 📋 Índice

- [Como Contribuir](#-como-contribuir)
- [Configuração do Ambiente](#-configuração-do-ambiente)
- [Padrões de Código](#-padrões-de-código)
- [Processo de Pull Request](#-processo-de-pull-request)
- [Reportar Problemas](#-reportar-problemas)
- [Estrutura do Projeto](#-estrutura-do-projeto)

## 🚀 Como Contribuir

### Tipos de Contribuições Bem-vindas

- 🐛 **Correção de bugs**
- ✨ **Novas funcionalidades**
- 📚 **Documentação**
- 🎨 **Melhorias na interface**
- ⚡ **Otimizações de performance**
- 🔒 **Melhorias de segurança**
- 🧪 **Testes**

### Antes de Começar

1. Verifique se já existe uma [issue](https://github.com/Br3n0k/friend-cine/issues) relacionada
2. Para mudanças grandes, abra uma issue para discussão primeiro
3. Fork o repositório
4. Crie uma branch para sua feature/correção

## 🛠️ Configuração do Ambiente

### Pré-requisitos

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### Instalação

```bash
# Clone seu fork
git clone https://github.com/seu-usuario/friend-cine.git
cd friend-cine

# Instale dependências
npm install

# Copie arquivo de ambiente
cp .env.example .env

# Instale FFmpeg (opcional para conversão)
npm run install-ffmpeg

# Execute o projeto
npm run dev:all
```

### Verificação do Sistema

```bash
# Teste se tudo está funcionando
npm run test-system
```

## 📝 Padrões de Código

### JavaScript/Astro

- Use **ES6+** e sintaxe moderna
- Prefira `const` e `let` ao invés de `var`
- Use funções arrow quando apropriado
- Mantenha funções pequenas e focadas
- Comente código complexo

### Exemplo de Código Bem Estruturado

```javascript
// ✅ Bom
import { validateVideoFile, logError } from '../utils/index.js';

export async function uploadVideo(file, options = {}) {
  try {
    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    
    return await processFile(file, options);
  } catch (error) {
    logError(error, { operation: 'uploadVideo' });
    throw error;
  }
}

// ❌ Evitar
function upload(f) {
  if(!f) return null;
  // processo sem validação
  return f.process();
}
```

### CSS/Tailwind

- Use classes utilitárias do Tailwind
- Para componentes complexos, crie classes customizadas
- Mantenha responsividade em mente
- Use variáveis CSS para temas

### Convenções de Nomenclatura

- **Arquivos**: `kebab-case.js`
- **Variáveis/Funções**: `camelCase`
- **Constantes**: `UPPER_SNAKE_CASE`
- **Componentes**: `PascalCase.astro`
- **Classes CSS**: `kebab-case`

## 🔄 Processo de Pull Request

### 1. Preparação

```bash
# Crie uma branch descritiva
git checkout -b feature/nova-funcionalidade
# ou
git checkout -b fix/corrigir-bug
```

### 2. Desenvolvimento

- Faça commits pequenos e descritivos
- Teste sua mudança localmente
- Verifique se não quebrou funcionalidades existentes

### 3. Commits

Use o padrão de commits convencionais:

```bash
# Exemplos
git commit -m "feat: adicionar suporte a legendas SRT"
git commit -m "fix: corrigir sincronização de vídeo"
git commit -m "docs: atualizar README com instruções Docker"
git commit -m "style: melhorar responsividade do chat"
git commit -m "refactor: extrair lógica de validação"
git commit -m "perf: otimizar carregamento de vídeos"
```

### 4. Pull Request

1. Push para seu fork
2. Abra PR no repositório principal
3. Preencha o template do PR
4. Marque reviewers apropriados

#### Template de PR

```markdown
## 📝 Descrição

Breve descrição das mudanças realizadas.

## 🔧 Tipo de Mudança

- [ ] Bug fix (correção que resolve um problema)
- [ ] Feature (nova funcionalidade)
- [ ] Breaking change (mudança que quebra compatibilidade)
- [ ] Documentação

## 🧪 Como Testar

1. Execute `npm run dev:all`
2. Navegue para...
3. Teste que...

## 📋 Checklist

- [ ] Código testado localmente
- [ ] Documentação atualizada se necessário
- [ ] Sem console.log esquecidos
- [ ] Segue padrões do projeto
```

## 🐛 Reportar Problemas

### Antes de Reportar

1. Verifique se o problema já foi reportado
2. Teste com a última versão
3. Tente reproduzir o problema

### Template de Issue

Use nosso template ao reportar bugs:

```markdown
## 🐛 Descrição do Bug

Descrição clara do problema.

## 🔄 Passos para Reproduzir

1. Vá para '...'
2. Clique em '...'
3. Role para baixo até '...'
4. Veja o erro

## ✅ Comportamento Esperado

O que deveria acontecer.

## 🖼️ Screenshots

Se aplicável, adicione screenshots.

## 💻 Ambiente

- SO: [ex: Windows 11]
- Browser: [ex: Chrome 120]
- Versão do Node: [ex: 18.17.0]
```

## 📁 Estrutura do Projeto

### Organização de Arquivos

```
src/
├── components/     # Componentes reutilizáveis
├── layouts/        # Layouts das páginas
├── pages/          # Páginas da aplicação
└── utils/          # Utilitários e helpers

server/
├── middleware/     # Middleware de segurança
├── index.js       # Servidor principal
└── video-converter.js

public/
├── videos/        # Vídeos enviados
└── subtitles/     # Legendas
```

### Diretrizes por Pasta

#### `src/components/`
- Componentes Astro reutilizáveis
- Props bem tipadas
- Documentação JSDoc quando complexos

#### `src/utils/`
- Funções puras quando possível
- Bem testadas
- Exportações nomeadas

#### `server/`
- Middleware bem organizados
- Tratamento de erros consistente
- Logs estruturados

## 🧪 Testes

### Executar Testes

```bash
# Teste do sistema
npm run test-system

# Verificar FFmpeg
npm run check-ffmpeg

# Lint do código
npm run lint
```

### Adicionando Testes

- Teste funcionalidades críticas
- Inclua casos edge
- Mock dependências externas

## 🔒 Segurança

### Diretrizes de Segurança

- **Sempre valide entrada do usuário**
- **Use sanitização adequada**
- **Implemente rate limiting**
- **Log eventos de segurança**
- **Nunca commite credenciais**

### Reportar Vulnerabilidades

Para vulnerabilidades de segurança, envie email direto ao invés de issue pública.

## 📚 Recursos Úteis

- [Documentação Astro](https://docs.astro.build)
- [Socket.io Docs](https://socket.io/docs)
- [Express.js Guide](https://expressjs.com/guide)
- [Tailwind CSS](https://tailwindcss.com/docs)

## ❓ Precisa de Ajuda?

- 📧 [Abra uma issue](https://github.com/Br3n0k/friend-cine/issues/new)
- 💬 [Discussions](https://github.com/Br3n0k/friend-cine/discussions)

---

**Obrigado pela sua contribuição! 🎉** 
# 🎬 Friend Cine

Uma plataforma colaborativa para assistir filmes em conjunto online, construída com Astro e usando storage baseado em arquivos.

## 🚀 INÍCIO RÁPIDO

### ⚡ Método Mais Fácil

**Windows:**
```bash
# Duplo clique no arquivo:
start.bat
```

**Linux/Mac:**
```bash
./start.sh
```

### 🛠️ Método Manual

1. **Instale as dependências:**
```bash
npm install
```

2. **Execute ambos os servidores:**
```bash
# Opção 1: Executar tudo junto
npm run dev:all

# Opção 2: Dois terminais separados
# Terminal 1:
npm run dev:server

# Terminal 2: 
npm run dev
```

3. **Acesse a aplicação:**
   - **Frontend:** http://localhost:3000
   - **Backend API:** http://localhost:4000

### ✅ Verificação

Se tudo estiver funcionando, você verá:
- `🎬 Friend Cine Server rodando na porta 4000`
- `🚀 astro v5.10.1 started in dev mode`

## ✨ Funcionalidades

### 🎥 Player Avançado
- **Video.js** como player principal com controles completos
- Suporte a múltiplas faixas de áudio
- Suporte a legendas (SRT, VTT)
- Controles de velocidade de reprodução
- Atalhos de teclado
- Design responsivo

### 🔄 Sincronização em Tempo Real
- Todos os usuários assistem sincronizados
- Controles compartilhados (play, pause, seek)
- Indicador visual de sincronização
- WebSocket para comunicação instantânea

### 💬 Chat Integrado
- Chat ao vivo durante o filme
- Notificações de entrada/saída de usuários
- Histórico de mensagens por sala
- Interface intuitiva

### 📁 Gerenciamento de Arquivos
- Upload de vídeos via drag & drop
- Suporte a múltiplos formatos (MP4, WebM, AVI, MOV, etc.)
- Storage baseado em sistema de arquivos (sem banco de dados)
- Lista automática de vídeos disponíveis

### 🏠 Sistema de Salas
- Criação dinâmica de salas
- Salas privadas com nomes personalizados
- Lista de salas ativas
- Contagem de usuários em tempo real

## 📁 Como Usar

### 1. **Upload de Vídeos:**
- Arraste um arquivo de vídeo para a área de upload
- Ou clique para selecionar arquivo
- Aguarde o upload ser concluído

### 2. **Criar uma Sala:**
- Clique em "Criar Sala" no vídeo desejado
- Digite um nome para a sala
- Digite seu nome de usuário
- Clique em "Criar Sala"

### 3. **Entrar em uma Sala:**
- Clique em uma sala ativa na lista
- Digite seu nome quando solicitado
- Comece a assistir sincronizado com outros usuários

### 4. **Controles Durante o Filme:**
- **Espaço**: Play/Pause
- **Setas esquerda/direita**: Voltar/avançar 5s
- **Setas cima/baixo**: Volume
- **M**: Mute/unmute
- **F**: Tela cheia

### 5. **Faixas de Áudio e Legendas:**
- Botões aparecem automaticamente se disponíveis
- Clique nos botões no canto inferior esquerdo
- Selecione a faixa desejada no menu

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Astro** - Framework principal
- **Tailwind CSS** - Estilização
- **Video.js** - Player de vídeo
- **Socket.io Client** - Comunicação em tempo real
- **Font Awesome** - Ícones

### Backend
- **Express.js** - Servidor web
- **Socket.io** - WebSockets
- **Multer** - Upload de arquivos
- **fs-extra** - Manipulação de arquivos
- **UUID** - Geração de IDs únicos

## 📂 Estrutura do Projeto

```
friend-cine/
├── src/
│   ├── layouts/
│   │   └── Layout.astro          # Layout principal
│   └── pages/
│       ├── index.astro           # Página inicial
│       └── room.astro            # Sala de cinema
├── server/
│   └── index.js                  # Servidor Express + Socket.io
├── public/
│   ├── videos/                   # Pasta de vídeos
│   ├── subtitles/                # Pasta de legendas
│   └── favicon.svg               # Favicon
├── package.json
├── astro.config.mjs
└── README.md
```

## 🎯 Funcionalidades Avançadas

### Formatos Suportados
- **Vídeo**: MP4, WebM, OGG, AVI, MOV, WMV, FLV, MKV
- **Legendas**: SRT, VTT (colocar na pasta `public/subtitles/`)

### Sincronização Inteligente
- Detecção automática de dessincronia
- Correção automática de atraso
- Indicador visual durante sincronização

### Chat Rico
- Mensagens do sistema (entrada/saída)
- Histórico de até 100 mensagens por sala
- Auto-scroll para novas mensagens
- Interface responsiva

### Gerenciamento de Salas
- Salas são criadas dinamicamente
- Removidas automaticamente quando vazias
- Estado persistente durante a sessão
- Suporte a múltiplas salas simultâneas

## 🔧 Configuração Avançada

### Variáveis de Ambiente
```bash
PORT=4000  # Porta do servidor backend
```

### Upload Limits
- Tamanho máximo: 2GB por arquivo
- Tipos permitidos: Configurável em `server/index.js`

### Storage
- Vídeos: `public/videos/`
- Legendas: `public/subtitles/`
- Sem banco de dados necessário

## 🚨 Resolução de Problemas

### Vídeo não carrega
- Verifique se o arquivo está na pasta `public/videos/`
- Confirme que o formato é suportado
- Verifique o console do navegador para erros

### Sincronização com problemas
- Verifique a conexão WebSocket (console do navegador)
- Recarregue a página se necessário
- Verifique se o servidor backend está rodando

### Upload falhando
- Verifique o tamanho do arquivo (máx 2GB)
- Confirme que o formato é suportado
- Verifique permissões da pasta `public/videos/`

## 📝 Scripts Disponíveis

```bash
npm run dev          # Desenvolvi...nto (Astro)
npm run server       # Servidor backend
npm run dev:server   # Servidor backend com auto-reload
npm run build        # Build de produção
npm run preview      # Preview do build
```

## 🌟 Próximas Funcionalidades

- [ ] Autenticação de usuários
- [ ] Salas privadas com senha
- [ ] Playlist de vídeos
- [ ] Gravação de sessões
- [ ] Integração com streaming services
- [ ] Chat por voz
- [ ] Temas personalizáveis

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

---

**Desenvolvido com ❤️ para assistir filmes com amigos!**

```sh
npm create astro@latest -- --template minimal
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/minimal)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/minimal)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/minimal/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

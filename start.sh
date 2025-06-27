#!/bin/bash

echo "🎬 Iniciando Friend Cine..."
echo ""
echo "✅ Instalando dependências..."
npm install

echo ""
echo "🚀 Iniciando servidores..."
echo "  - Backend (Socket.io + Express): http://localhost:4000"
echo "  - Frontend (Astro): http://localhost:3000"
echo ""
echo "💡 Dica: Adicione seus vídeos na pasta public/videos/"
echo ""

# Usar concurrently para executar ambos os servidores
npm run dev:all

echo "✨ Aplicação finalizada!" 
@echo off
echo 🎬 Iniciando Friend Cine...
echo.
echo ✅ Instalando dependencias...
call npm install

echo.
echo 🚀 Iniciando servidores...
echo   - Backend (Socket.io + Express): http://localhost:4000
echo   - Frontend (Astro): http://localhost:3000
echo.
echo 💡 Dica: Adicione seus videos na pasta public/videos/
echo.

start cmd /k "npm run dev:server"
timeout /t 2 /nobreak > nul
start cmd /k "npm run dev"

echo ✨ Servidores iniciados! Acesse http://localhost:3000
pause 
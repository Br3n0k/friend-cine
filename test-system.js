#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

console.log('🔍 Friend Cine - Teste do Sistema\n');
console.log('═'.repeat(50));

// 1. Teste do FFmpeg
console.log('\n🎬 1. Testando FFmpeg...');
try {
  const { stdout } = await execAsync('ffmpeg -version');
  const version = stdout.split('\n')[0];
  console.log('✅ FFmpeg encontrado:', version);
} catch (error) {
  console.log('❌ FFmpeg não encontrado no PATH');
  console.log('💡 Reinicie o terminal/IDE após a instalação');
}

// 2. Verificar arquivos essenciais
console.log('\n📁 2. Verificando arquivos do projeto...');
const requiredFiles = [
  'server/index.js',
  'server/video-converter.js', 
  'src/pages/index.astro',
  'src/pages/room.astro',
  'package.json'
];

for (const file of requiredFiles) {
  if (await fs.exists(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - FALTANDO`);
  }
}

// 3. Verificar dependências
console.log('\n📦 3. Verificando node_modules...');
const deps = [
  'node_modules/express',
  'node_modules/socket.io',
  'node_modules/fluent-ffmpeg',
  'node_modules/astro'
];

for (const dep of deps) {
  if (await fs.exists(dep)) {
    console.log(`✅ ${dep.split('/')[1]}`);
  } else {
    console.log(`❌ ${dep.split('/')[1]} - Execute: npm install`);
  }
}

// 4. Verificar pasta de vídeos
console.log('\n🎥 4. Verificando pasta de vídeos...');
const videosDir = 'public/videos';
if (await fs.exists(videosDir)) {
  const files = await fs.readdir(videosDir);
  const videoFiles = files.filter(f => !f.startsWith('.'));
  console.log(`✅ Pasta exists: ${videoFiles.length} arquivo(s)`);
  
  if (videoFiles.length > 0) {
    console.log('📹 Arquivos encontrados:');
    videoFiles.slice(0, 3).forEach(file => {
      console.log(`   - ${file}`);
    });
    if (videoFiles.length > 3) {
      console.log(`   ... e mais ${videoFiles.length - 3} arquivo(s)`);
    }
  }
} else {
  console.log('❌ Pasta public/videos não encontrada');
}

// 5. Teste de portas
console.log('\n🌐 5. Verificando portas...');
try {
  // Testar se algo está rodando nas portas
  const testPort = async (port, service) => {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`);
      console.log(`✅ ${service} (porta ${port}) - ATIVO`);
    } catch {
      console.log(`⚠️ ${service} (porta ${port}) - INATIVO`);
    }
  };
  
  await testPort(4000, 'Backend');
  // Não vamos testar 3000 porque pode não ter /api/health
} catch (error) {
  console.log('⚠️ Não foi possível testar conectividade');
}

// 6. Comandos recomendados
console.log('\n🚀 6. Status e Comandos:');
console.log('');

const ffmpegStatus = await fs.exists('C:/ffmpeg') || 
                    await fs.exists('C:/ProgramData/chocolatey/lib/ffmpeg');

if (ffmpegStatus) {
  console.log('✅ FFmpeg instalado - Conversão automática disponível');
} else {
  console.log('⚠️ FFmpeg não detectado - Apenas arquivos compatíveis');
}

console.log('\n📋 Para iniciar:');
console.log('   npm run dev:all');
console.log('\n📋 Para testar separadamente:');
console.log('   npm run dev:server    # Backend (porta 4000)');
console.log('   npm run dev           # Frontend (porta 3000)');

console.log('\n✨ Sistema pronto para uso!'); 
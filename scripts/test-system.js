#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

console.log('🔍 Friend Cine - Teste do Sistema MKV\n');
console.log('═'.repeat(50));

// 1. Teste do FFmpeg
console.log('\n🎬 1. Testando FFmpeg...');
try {
  const { stdout } = await execAsync('ffmpeg -version');
  const version = stdout.split('\n')[0];
  console.log('✅ FFmpeg encontrado:', version);
  
  // Verificar suporte a codecs MKV
  const codecCheck = await execAsync('ffmpeg -codecs | grep -E "(hevc|h265|flac|aac)"');
  console.log('📋 Codecs MKV suportados:', codecCheck.stdout.split('\n').length - 1);
} catch (error) {
  console.log('❌ FFmpeg não encontrado no PATH');
  console.log('💡 Execute: npm run install-ffmpeg');
}

// 2. Verificar arquivos essenciais
console.log('\n📁 2. Verificando arquivos do projeto...');
const requiredFiles = [
  'server/index.js',
  'server/video-converter.js',
  'server/utils/file-manager.js',
  'server/utils/upload-handler.js',
  'src/pages/index.astro',
  'src/pages/room.astro',
  'src/utils/constants.js',
  'package.json'
];

for (const file of requiredFiles) {
  if (await fs.exists(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - FALTANDO`);
  }
}

// 3. Verificar estrutura de storage
console.log('\n📦 3. Verificando estrutura de storage...');
const storageDirs = [
  'storage/uploads',
  'storage/processing', 
  'storage/masters',
  'storage/web',
  'storage/subtitles',
  'storage/thumbnails',
  'storage/metadata',
  'storage/temp'
];

for (const dir of storageDirs) {
  if (await fs.exists(dir)) {
    const files = await fs.readdir(dir);
    console.log(`✅ ${dir} (${files.length} arquivos)`);
  } else {
    console.log(`❌ ${dir} - FALTANDO`);
  }
}

// 4. Verificar dependências
console.log('\n📚 4. Verificando node_modules...');
const deps = [
  'node_modules/express',
  'node_modules/socket.io',
  'node_modules/fluent-ffmpeg',
  'node_modules/astro',
  'node_modules/fs-extra',
  'node_modules/winston'
];

for (const dep of deps) {
  if (await fs.exists(dep)) {
    console.log(`✅ ${dep.split('/')[1]}`);
  } else {
    console.log(`❌ ${dep.split('/')[1]} - Execute: npm install`);
  }
}

// 5. Verificar links simbólicos
console.log('\n🔗 5. Verificando links simbólicos...');
const publicVideos = 'public/videos';
if (await fs.exists(publicVideos)) {
  const files = await fs.readdir(publicVideos);
  const videoFiles = files.filter(f => !f.startsWith('.'));
  console.log(`✅ Links públicos: ${videoFiles.length} arquivo(s)`);
  
  if (videoFiles.length > 0) {
    console.log('🎥 Vídeos disponíveis:');
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

// 6. Teste de portas
console.log('\n🌐 6. Verificando portas...');
try {
  const testPort = async (port, service) => {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`);
      console.log(`✅ ${service} (porta ${port}) - ATIVO`);
      return true;
    } catch {
      console.log(`⚠️ ${service} (porta ${port}) - INATIVO`);
      return false;
    }
  };
  
  const backendActive = await testPort(4000, 'Backend');
  if (backendActive) {
    // Testar API de vídeos
    try {
      const response = await fetch('http://localhost:4000/api/videos');
      const videos = await response.json();
      console.log(`📹 API Videos: ${videos.length} vídeo(s) encontrado(s)`);
    } catch (error) {
      console.log('❌ Erro na API de vídeos:', error.message);
    }
  }
} catch (error) {
  console.log('⚠️ Não foi possível testar conectividade');
}

// 7. Status e comandos
console.log('\n🚀 7. Status e Comandos:');
console.log('');

const ffmpegStatus = await fs.exists('C:/ffmpeg') || 
                    await fs.exists('C:/ProgramData/chocolatey/lib/ffmpeg');

if (ffmpegStatus) {
  console.log('✅ Sistema MKV pronto - Conversão H.265/FLAC disponível');
} else {
  console.log('⚠️ FFmpeg não detectado - Apenas reprodução de arquivos compatíveis');
}

console.log('\n📋 Comandos disponíveis:');
console.log('   npm start              # Iniciar sistema completo');
console.log('   npm run dev:server     # Backend apenas (porta 4000)');
console.log('   npm run dev:frontend   # Frontend apenas (porta 3000)');
console.log('   npm run install-ffmpeg # Instalar FFmpeg');
console.log('   npm run check-ffmpeg   # Verificar FFmpeg');
console.log('   npm run test:codec     # Abrir teste de codecs');
console.log('   npm run test:connection # Abrir teste de conexão');
console.log('   npm run clean:storage  # Limpar arquivos temporários');

console.log('\n✨ Sistema Friend Cine MKV pronto para uso!'); 
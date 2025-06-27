#!/usr/bin/env node

import fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🔍 Friend Cine - Teste do Sistema MKV v2.0\n');
console.log('═'.repeat(60));

// 1. Teste do FFmpeg
console.log('\n🎬 1. Testando FFmpeg...');
try {
  const { stdout } = await execAsync('ffmpeg -version');
  const version = stdout.split('\n')[0];
  console.log('✅ FFmpeg encontrado:', version);
  
  // Verificar suporte a codecs MKV
  const codecCheck = await execAsync('ffmpeg -codecs');
  const codecsText = codecCheck.stdout;
  
  const h265Available = codecsText.includes('hevc') || codecsText.includes('h265');
  const flacAvailable = codecsText.includes('flac');
  const aacAvailable = codecsText.includes('aac');
  
  console.log(`📋 H.265/HEVC: ${h265Available ? '✅' : '❌'}`);
  console.log(`📋 FLAC: ${flacAvailable ? '✅' : '❌'}`);
  console.log(`📋 AAC: ${aacAvailable ? '✅' : '❌'}`);
  
  if (h265Available) {
    console.log('🎉 Sistema pronto para conversão MKV H.265!');
  } else {
    console.log('⚠️ H.265/HEVC não disponível - conversões limitadas');
  }
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
  'src/utils/api.js',
  'src/utils/logger.js',
  'src/utils/validation.js',
  'src/utils/system.js',
  'src/utils/file-operations.js',
  'package.json'
];

let foundFiles = 0;
for (const file of requiredFiles) {
  const exists = await fs.pathExists(file);
  if (exists) {
    console.log(`✅ ${file}`);
    foundFiles++;
  } else {
    console.log(`❌ ${file} - FALTANDO`);
  }
}

const filePercentage = Math.round((foundFiles / requiredFiles.length) * 100);
console.log(`📊 Arquivos: ${foundFiles}/${requiredFiles.length} (${filePercentage}%)`);

// 3. Verificar estrutura de storage
console.log('\n📦 3. Verificando estrutura de storage MKV...');
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

let existingDirs = 0;
for (const dir of storageDirs) {
  const exists = await fs.pathExists(dir);
  if (exists) {
    try {
      const files = await fs.readdir(dir);
      console.log(`✅ ${dir} (${files.length} arquivos)`);
      existingDirs++;
    } catch (error) {
      console.log(`✅ ${dir} (erro ao ler: ${error.message})`);
      existingDirs++;
    }
  } else {
    console.log(`❌ ${dir} - FALTANDO`);
  }
}

const storagePercentage = Math.round((existingDirs / storageDirs.length) * 100);
console.log(`📊 Storage: ${existingDirs}/${storageDirs.length} (${storagePercentage}%)`);

// 4. Verificar dependências
console.log('\n📚 4. Verificando node_modules...');
const deps = [
  'express',
  'socket.io',
  'fluent-ffmpeg',
  'astro',
  'fs-extra',
  'winston',
  'multer',
  'helmet'
];

let installedDeps = 0;
for (const dep of deps) {
  const exists = await fs.pathExists(`node_modules/${dep}`);
  if (exists) {
    console.log(`✅ ${dep}`);
    installedDeps++;
  } else {
    console.log(`❌ ${dep} - Execute: npm install`);
  }
}

const depsPercentage = Math.round((installedDeps / deps.length) * 100);
console.log(`📊 Dependências: ${installedDeps}/${deps.length} (${depsPercentage}%)`);

// 5. Verificar conectividade
console.log('\n🌐 5. Verificando conectividade...');
const publicVideos = 'public/videos';
const publicExists = await fs.pathExists(publicVideos);

if (publicExists) {
  try {
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
  } catch (error) {
    console.log(`⚠️ Erro ao listar vídeos: ${error.message}`);
  }
} else {
  console.log('❌ Pasta de vídeos públicos não encontrada');
}

// Teste de APIs (opcional)
console.log('\n🔌 Testando APIs...');
try {
  const response = await fetch('http://localhost:4000/api/health');
  if (response.ok) {
    console.log('✅ Backend ativo (porta 4000)');
    
    try {
      const videosResponse = await fetch('http://localhost:4000/api/videos');
      const videos = await videosResponse.json();
      console.log(`📹 API Videos: ${videos.length || 0} vídeo(s)`);
    } catch (error) {
      console.log('⚠️ API de vídeos não respondeu');
    }
  } else {
    console.log('⚠️ Backend inativo (porta 4000)');
  }
} catch (error) {
  console.log('⚠️ Backend não está rodando');
}

// Relatório final
console.log('\n🎯 RELATÓRIO FINAL');
console.log('═'.repeat(60));

const results = [
  { name: 'Arquivos', percentage: filePercentage },
  { name: 'Storage', percentage: storagePercentage },
  { name: 'Dependências', percentage: depsPercentage }
];

let totalScore = 0;
results.forEach(result => {
  const status = result.percentage >= 80 ? '✅ PASSA' : '❌ FALHA';
  console.log(`📊 ${result.name}: ${result.percentage}% ${status}`);
  totalScore += result.percentage;
});

const finalScore = Math.round(totalScore / results.length);
console.log(`\n🏆 PONTUAÇÃO GERAL: ${finalScore}%`);

if (finalScore >= 90) {
  console.log('🎉 SISTEMA EXCELENTE - Pronto para produção!');
} else if (finalScore >= 70) {
  console.log('✅ SISTEMA BOM - Funcional com pequenos ajustes');
} else if (finalScore >= 50) {
  console.log('⚠️ SISTEMA BÁSICO - Necessita melhorias');
} else {
  console.log('❌ SISTEMA INADEQUADO - Configuração necessária');
}

console.log('\n📋 COMANDOS ÚTEIS:');
console.log('   npm start              # Iniciar sistema completo');
console.log('   npm run dev:server     # Backend apenas (porta 4000)');
console.log('   npm run dev:frontend   # Frontend apenas (porta 3000)');
console.log('   npm run install-ffmpeg # Instalar FFmpeg');
console.log('   npm run check-ffmpeg   # Verificar FFmpeg');
console.log('   npm run test:codec     # Testar codecs no navegador');

console.log('\n✨ Friend Cine MKV - Sistema de Conversão H.265/FLAC!'); 
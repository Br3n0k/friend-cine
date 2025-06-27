import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';

const execAsync = promisify(exec);

class FFmpegInstaller {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
  }

  async checkFFmpeg() {
    try {
      const { stdout } = await execAsync('ffmpeg -version');
      return {
        installed: true,
        version: stdout.split('\n')[0]
      };
    } catch (error) {
      return {
        installed: false,
        error: error.message
      };
    }
  }

  async installForWindows() {
    console.log('🪟 Detectado Windows - Tentando instalar FFmpeg...\n');
    
    try {
      // Tentar usar winget primeiro
      console.log('📦 Tentando instalar via winget...');
      await execAsync('winget install Gyan.FFmpeg --accept-source-agreements --accept-package-agreements');
      console.log('✅ FFmpeg instalado via winget!');
      return true;
      
    } catch (wingetError) {
      console.log('⚠️ Winget falhou, tentando chocolatey...');
      
      try {
        // Tentar chocolatey
        await execAsync('choco install ffmpeg -y');
        console.log('✅ FFmpeg instalado via chocolatey!');
        return true;
        
      } catch (chocoError) {
        console.log('❌ Chocolatey também falhou.');
        console.log('\n📋 Instalação manual necessária:');
        console.log('1. Acesse: https://www.gyan.dev/ffmpeg/builds/');
        console.log('2. Baixe "ffmpeg-release-essentials.zip"');
        console.log('3. Extraia para C:\\ffmpeg');
        console.log('4. Adicione C:\\ffmpeg\\bin ao PATH do sistema');
        console.log('\n🔧 Ou execute como administrador:');
        console.log('   winget install Gyan.FFmpeg');
        return false;
      }
    }
  }

  async installForLinux() {
    console.log('🐧 Detectado Linux - Tentando instalar FFmpeg...\n');
    
    try {
      // Detectar distribuição
      let installCommand = '';
      
      try {
        await execAsync('which apt');
        installCommand = 'sudo apt update && sudo apt install -y ffmpeg';
      } catch {
        try {
          await execAsync('which yum');
          installCommand = 'sudo yum install -y ffmpeg';
        } catch {
          try {
            await execAsync('which pacman');
            installCommand = 'sudo pacman -S ffmpeg --noconfirm';
          } catch {
            throw new Error('Gerenciador de pacotes não suportado');
          }
        }
      }
      
      console.log(`📦 Executando: ${installCommand}`);
      await execAsync(installCommand);
      console.log('✅ FFmpeg instalado com sucesso!');
      return true;
      
    } catch (error) {
      console.log('❌ Falha na instalação automática.');
      console.log('\n📋 Tente manualmente:');
      console.log('Ubuntu/Debian: sudo apt install ffmpeg');
      console.log('CentOS/RHEL:   sudo yum install ffmpeg');
      console.log('Arch Linux:    sudo pacman -S ffmpeg');
      return false;
    }
  }

  async installForMac() {
    console.log('🍎 Detectado macOS - Tentando instalar FFmpeg...\n');
    
    try {
      // Verificar se Homebrew está instalado
      await execAsync('which brew');
      
      console.log('📦 Instalando via Homebrew...');
      await execAsync('brew install ffmpeg');
      console.log('✅ FFmpeg instalado com sucesso!');
      return true;
      
    } catch (error) {
      console.log('❌ Homebrew não encontrado ou falha na instalação.');
      console.log('\n📋 Para instalar manualmente:');
      console.log('1. Instale Homebrew: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
      console.log('2. Execute: brew install ffmpeg');
      return false;
    }
  }

  async install() {
    console.log('🎬 Instalador Automático do FFmpeg - Friend Cine\n');
    console.log('═'.repeat(50));
    
    // Verificar se já está instalado
    const check = await this.checkFFmpeg();
    if (check.installed) {
      console.log('✅ FFmpeg já está instalado!');
      console.log(`📋 Versão: ${check.version}`);
      return true;
    }
    
    console.log('❌ FFmpeg não encontrado. Iniciando instalação...\n');
    
    let success = false;
    
    switch (this.platform) {
      case 'win32':
        success = await this.installForWindows();
        break;
      case 'linux':
        success = await this.installForLinux();
        break;
      case 'darwin':
        success = await this.installForMac();
        break;
      default:
        console.log(`❌ Plataforma não suportada: ${this.platform}`);
        return false;
    }
    
    if (success) {
      console.log('\n🔄 Verificando instalação...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2s
      
      const finalCheck = await this.checkFFmpeg();
      if (finalCheck.installed) {
        console.log('🎉 FFmpeg instalado e funcionando!');
        console.log(`📋 Versão: ${finalCheck.version}`);
        console.log('\n✨ Agora você pode usar conversão automática de vídeos!');
        return true;
      } else {
        console.log('⚠️ Instalação aparentemente bem-sucedida, mas FFmpeg não está no PATH.');
        console.log('💡 Tente reiniciar o terminal ou computador.');
        return false;
      }
    }
    
    return false;
  }

  async createVideoExample() {
    console.log('\n📹 Quer testar a conversão com um vídeo de exemplo?');
    console.log('   Execute: node test-conversion.js');
  }
}

// Script principal
async function main() {
  const installer = new FFmpegInstaller();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--check') || args.includes('-c')) {
    // Apenas verificar se está instalado
    const check = await installer.checkFFmpeg();
    if (check.installed) {
      console.log('✅ FFmpeg instalado:', check.version);
      process.exit(0);
    } else {
      console.log('❌ FFmpeg não encontrado');
      process.exit(1);
    }
  } else {
    // Instalar
    const success = await installer.install();
    
    if (success) {
      await installer.createVideoExample();
      console.log('\n🚀 Execute: npm run dev:all');
      console.log('   Para iniciar o Friend Cine com conversão automática!');
    } else {
      console.log('\n🔧 Conversão automática não estará disponível.');
      console.log('   O sistema funcionará apenas com arquivos compatíveis.');
    }
    
    process.exit(success ? 0 : 1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { FFmpegInstaller }; 
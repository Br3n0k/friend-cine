import { FFmpegUtils, SystemUtils } from '../src/utils/system.js';
import logger from '../src/utils/logger.js';
import { UPLOAD_CONFIG } from '../src/utils/constants.js';
import fs from 'fs-extra';

class FFmpegInstaller {
  constructor() {
    this.ffmpegUtils = new FFmpegUtils();
    this.systemUtils = new SystemUtils();
    this.systemInfo = this.systemUtils.getSystemInfo();
  }

  async checkFFmpeg() {
    const result = await this.ffmpegUtils.checkFFmpeg();
    
    if (result.installed) {
      // Verificar codecs MKV
      const codecCheck = await this.ffmpegUtils.checkCodecs();
      result.codecs = codecCheck;
      result.mkvReady = codecCheck.available.includes('hevc') || codecCheck.available.includes('h265');
    }
    
    return result;
  }

  async attemptInstallation() {
    console.log(`🎬 Detectado: ${this.systemInfo.platform} ${this.systemInfo.arch}`);
    console.log('📋 Tentando instalação automática do FFmpeg...\n');
    
    const result = await this.ffmpegUtils.attemptAutoInstall();
    
    if (result.success) {
      console.log(`✅ FFmpeg instalado com sucesso via ${result.manager}!`);
      console.log(`📋 Versão: ${result.version}`);
      return true;
    } else {
      console.log('❌ Falha na instalação automática.');
      
      if (result.attempts?.length > 0) {
        console.log('\n🔍 Tentativas realizadas:');
        result.attempts.forEach(attempt => {
          const status = attempt.success ? '✅' : '❌';
          console.log(`   ${status} ${attempt.manager}: ${attempt.error || 'OK'}`);
        });
      }
      
      console.log('\n📋 Instalação manual necessária:');
      this.showManualInstructions();
      return false;
    }
  }

  showManualInstructions() {
    const instructions = this.ffmpegUtils.getManualInstructions();
    
    console.log('\n' + instructions.title);
    console.log('═'.repeat(50));
    
    instructions.steps.forEach(step => {
      if (step.trim() === '') {
        console.log('');
      } else {
        console.log(step);
      }
    });
  }

  async install() {
    console.log('🎬 Instalador Automático do FFmpeg - Friend Cine MKV\n');
    console.log('═'.repeat(60));
    
    // Exibir informações do sistema
    console.log(`🖥️  Sistema: ${this.systemInfo.platform} ${this.systemInfo.arch}`);
    console.log(`⚡ CPUs: ${this.systemInfo.cpus} cores`);
    console.log(`💾 RAM: ${Math.round(this.systemInfo.totalMemory / 1024 / 1024 / 1024)}GB`);
    console.log(`🟢 Node.js: ${this.systemInfo.nodeVersion}\n`);
    
    // Verificar se já está instalado
    console.log('🔍 Verificando FFmpeg...');
    const check = await this.checkFFmpeg();
    
    if (check.installed) {
      console.log('✅ FFmpeg já está instalado!');
      console.log(`📋 Versão: ${check.version}`);
      
      if (check.codecs) {
        console.log(`🎬 Codecs MKV: ${check.codecs.available.length}/${check.codecs.available.length + check.codecs.missing.length}`);
        console.log(`📊 Disponíveis: ${check.codecs.available.join(', ')}`);
        
        if (check.mkvReady) {
          console.log('🎉 Sistema pronto para conversão MKV H.265!');
        } else {
          console.log('⚠️ H.265/HEVC não disponível - conversões limitadas');
        }
      }
      
      return true;
    }
    
    console.log('❌ FFmpeg não encontrado. Iniciando instalação...\n');
    
    // Tentar instalação
    const success = await this.attemptInstallation();
    
    if (success) {
      console.log('\n🔄 Verificando instalação final...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Aguardar 3s
      
      const finalCheck = await this.checkFFmpeg();
      if (finalCheck.installed) {
        console.log('🎉 FFmpeg instalado e funcionando!');
        console.log(`📋 Versão: ${finalCheck.version}`);
        
        if (finalCheck.mkvReady) {
          console.log('✨ Sistema MKV completo - conversão H.265/FLAC disponível!');
        } else {
          console.log('⚠️ FFmpeg instalado, mas sem H.265 - funcionalidade limitada');
        }
        
        return true;
      } else {
        console.log('⚠️ Instalação aparentemente bem-sucedida, mas FFmpeg não foi encontrado.');
        console.log('💡 Possíveis soluções:');
        console.log('   - Reinicie o terminal/IDE');
        console.log('   - Reinicie o computador');
        console.log('   - Verifique se foi adicionado ao PATH');
        return false;
      }
    }
    
    return false;
  }

  async checkStorageStructure() {
    console.log('\n📁 Verificando estrutura de storage...');
    
    const storagePaths = Object.values(UPLOAD_CONFIG.PATHS);
    let allExists = true;
    
    for (const storagePath of storagePaths) {
      try {
        await fs.ensureDir(storagePath);
        console.log(`✅ ${storagePath}`);
      } catch (error) {
        console.log(`❌ ${storagePath} - Erro: ${error.message}`);
        allExists = false;
      }
    }
    
    return allExists;
  }
}

// Script principal
async function main() {
  try {
    const installer = new FFmpegInstaller();
    const args = process.argv.slice(2);
    
    if (args.includes('--check') || args.includes('-c')) {
      // Apenas verificar se está instalado
      const check = await installer.checkFFmpeg();
      
      if (check.installed) {
        console.log('✅ FFmpeg instalado:', check.version);
        
        if (check.codecs) {
          const codecStatus = check.mkvReady ? '🎬 MKV Ready' : '⚠️ Limited';
          console.log(`${codecStatus} - Codecs: ${check.codecs.available.join(', ')}`);
        }
        
        process.exit(0);
      } else {
        console.log('❌ FFmpeg não encontrado');
        process.exit(1);
      }
    } else {
      // Instalar
      const success = await installer.install();
      
      if (success) {
        console.log('\n🎯 Próximos Passos:');
        console.log('   1. npm start              # Iniciar sistema completo');
        console.log('   2. npm run check-system   # Testar tudo');
        console.log('   3. npm run test:codec     # Testar codecs no navegador');
        console.log('\n✨ Friend Cine MKV está pronto para conversão H.265/FLAC!');
      } else {
        console.log('\n🔧 FFmpeg não foi instalado.');
        console.log('   ✅ O sistema ainda funcionará com:');
        console.log('      - Reprodução de vídeos compatíveis');
        console.log('      - Upload de arquivos MKV existentes');
        console.log('      - Funcionalidades de sala e chat');
        console.log('\n💡 Para habilitar conversão automática:');
        console.log('   - Instale FFmpeg manualmente');
        console.log('   - Execute: npm run check-ffmpeg');
      }
      
      process.exit(success ? 0 : 1);
    }
  } catch (error) {
    console.error('❌ Erro no instalador:', error.message);
    logger.error('FFmpeg installer error', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { FFmpegInstaller }; 
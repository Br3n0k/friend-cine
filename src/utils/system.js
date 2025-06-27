import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Classe para detecção e operações de sistema
 */
export class SystemUtils {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.isWindows = this.platform === 'win32';
    this.isLinux = this.platform === 'linux';
    this.isMac = this.platform === 'darwin';
  }

  /**
   * Detecta informações do sistema
   */
  getSystemInfo() {
    return {
      platform: this.platform,
      arch: this.arch,
      isWindows: this.isWindows,
      isLinux: this.isLinux,
      isMac: this.isMac,
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      nodeVersion: process.version,
      hostname: os.hostname()
    };
  }

  /**
   * Verifica se um comando existe no sistema
   */
  async commandExists(command) {
    try {
      await execAsync(`${this.isWindows ? 'where' : 'which'} ${command}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Executa comando com timeout
   */
  async executeCommand(command, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const { stdout, stderr } = await execAsync(command, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return { success: true, stdout, stderr };
    } catch (error) {
      clearTimeout(timeoutId);
      return { 
        success: false, 
        error: error.message,
        killed: error.killed || error.signal === 'SIGTERM'
      };
    }
  }
}

/**
 * Classe para detecção e instalação do FFmpeg
 */
export class FFmpegUtils {
  constructor() {
    this.systemUtils = new SystemUtils();
  }

  /**
   * Verifica se FFmpeg está instalado e funcional
   */
  async checkFFmpeg() {
    try {
      const result = await this.systemUtils.executeCommand('ffmpeg -version');
      
      if (!result.success) {
        return {
          installed: false,
          error: result.error
        };
      }

      const versionLine = result.stdout.split('\n')[0];
      const version = versionLine.match(/ffmpeg version (\S+)/)?.[1] || 'unknown';

      return {
        installed: true,
        version,
        fullOutput: result.stdout
      };
    } catch (error) {
      return {
        installed: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica codecs específicos do FFmpeg
   */
  async checkCodecs(codecsList = ['hevc', 'h265', 'flac', 'aac', 'libx264', 'libx265']) {
    try {
      const result = await this.systemUtils.executeCommand('ffmpeg -codecs');
      
      if (!result.success) {
        return { available: [], missing: codecsList };
      }

      const available = [];
      const missing = [];

      for (const codec of codecsList) {
        // Buscar variações do codec
        const codecPatterns = [
          new RegExp(`\\b${codec}\\b`, 'i'),
          new RegExp(`lib${codec}`, 'i'),
          new RegExp(`${codec.replace(/lib/, '')}`, 'i')
        ];

        const isAvailable = codecPatterns.some(pattern => 
          pattern.test(result.stdout)
        );

        if (isAvailable) {
          available.push(codec);
        } else {
          missing.push(codec);
        }
      }

      return { available, missing };
    } catch (error) {
      return { available: [], missing: codecsList, error: error.message };
    }
  }

  /**
   * Obtém comandos de instalação por plataforma
   */
  getInstallCommands() {
    const commands = {
      win32: [
        {
          name: 'winget',
          command: 'winget install Gyan.FFmpeg --accept-source-agreements --accept-package-agreements',
          description: 'Instalar via Windows Package Manager'
        },
        {
          name: 'chocolatey',
          command: 'choco install ffmpeg -y',
          description: 'Instalar via Chocolatey'
        },
        {
          name: 'scoop',
          command: 'scoop install ffmpeg',
          description: 'Instalar via Scoop'
        }
      ],
      linux: [
        {
          name: 'apt',
          command: 'sudo apt update && sudo apt install -y ffmpeg',
          description: 'Ubuntu/Debian'
        },
        {
          name: 'yum',
          command: 'sudo yum install -y ffmpeg',
          description: 'CentOS/RHEL (com EPEL)'
        },
        {
          name: 'dnf',
          command: 'sudo dnf install -y ffmpeg',
          description: 'Fedora'
        },
        {
          name: 'pacman',
          command: 'sudo pacman -S ffmpeg --noconfirm',
          description: 'Arch Linux'
        },
        {
          name: 'snap',
          command: 'sudo snap install ffmpeg',
          description: 'Via Snap (universal)'
        }
      ],
      darwin: [
        {
          name: 'homebrew',
          command: 'brew install ffmpeg',
          description: 'macOS via Homebrew'
        },
        {
          name: 'macports',
          command: 'sudo port install ffmpeg',
          description: 'macOS via MacPorts'
        }
      ]
    };

    return commands[this.systemUtils.platform] || [];
  }

  /**
   * Tenta instalar FFmpeg automaticamente
   */
  async attemptAutoInstall() {
    const commands = this.getInstallCommands();
    const results = [];

    for (const cmdInfo of commands) {
      try {
        // Verificar se o gerenciador de pacotes existe
        const managerExists = await this.systemUtils.commandExists(cmdInfo.name);
        
        if (!managerExists && cmdInfo.name !== 'apt' && cmdInfo.name !== 'yum' && cmdInfo.name !== 'dnf' && cmdInfo.name !== 'pacman') {
          results.push({
            manager: cmdInfo.name,
            success: false,
            error: `${cmdInfo.name} não encontrado`
          });
          continue;
        }

        console.log(`📦 Tentando instalar via ${cmdInfo.name}...`);
        
        const result = await this.systemUtils.executeCommand(cmdInfo.command, 120000); // 2 minutos timeout
        
        results.push({
          manager: cmdInfo.name,
          success: result.success,
          error: result.error,
          output: result.stdout
        });

        if (result.success) {
          // Verificar se a instalação funcionou
          await new Promise(resolve => setTimeout(resolve, 3000)); // Aguardar 3s
          const check = await this.checkFFmpeg();
          
          if (check.installed) {
            return {
              success: true,
              manager: cmdInfo.name,
              version: check.version
            };
          }
        }
      } catch (error) {
        results.push({
          manager: cmdInfo.name,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: false,
      attempts: results
    };
  }

  /**
   * Gera instruções manuais de instalação
   */
  getManualInstructions() {
    const instructions = {
      win32: {
        title: '🪟 Instalação Manual - Windows',
        steps: [
          '1. Acesse: https://www.gyan.dev/ffmpeg/builds/',
          '2. Baixe "ffmpeg-release-essentials.zip"',
          '3. Extraia para C:\\ffmpeg',
          '4. Adicione C:\\ffmpeg\\bin ao PATH do sistema',
          '5. Reinicie o terminal/computador',
          '',
          'OU execute como administrador:',
          '   winget install Gyan.FFmpeg',
          '   choco install ffmpeg'
        ]
      },
      linux: {
        title: '🐧 Instalação Manual - Linux',
        steps: [
          'Ubuntu/Debian: sudo apt install ffmpeg',
          'CentOS/RHEL:   sudo yum install ffmpeg',
          'Fedora:        sudo dnf install ffmpeg',
          'Arch Linux:    sudo pacman -S ffmpeg',
          'Universal:     sudo snap install ffmpeg',
          '',
          'Ou compile do código fonte:',
          'https://trac.ffmpeg.org/wiki/CompilationGuide'
        ]
      },
      darwin: {
        title: '🍎 Instalação Manual - macOS',
        steps: [
          '1. Instale Homebrew (se não tiver):',
          '   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
          '',
          '2. Instale FFmpeg:',
          '   brew install ffmpeg',
          '',
          'Alternativamente:',
          '   sudo port install ffmpeg (MacPorts)'
        ]
      }
    };

    return instructions[this.systemUtils.platform] || {
      title: '❓ Plataforma não suportada',
      steps: ['Consulte: https://ffmpeg.org/download.html']
    };
  }
}

/**
 * Classe para verificação de arquivos e estruturas
 */
export class FileSystemUtils {
  /**
   * Verifica se arquivo/diretório existe
   */
  static async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtém informações de arquivo
   */
  static async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        modified: stats.mtime,
        created: stats.birthtime
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Lista arquivos em diretório com filtros
   */
  static async listFiles(dirPath, options = {}) {
    try {
      const { extensions = [], recursive = false, includeStats = false } = options;
      
      if (!await this.exists(dirPath)) {
        return [];
      }

      const files = [];
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);

        if (item.isFile()) {
          if (extensions.length === 0 || extensions.includes(path.extname(item.name).toLowerCase())) {
            if (includeStats) {
              const stats = await fs.stat(itemPath);
              files.push({
                name: item.name,
                path: itemPath,
                size: stats.size,
                modified: stats.mtime
              });
            } else {
              files.push(itemPath);
            }
          }
        } else if (item.isDirectory() && recursive) {
          const subFiles = await this.listFiles(itemPath, options);
          files.push(...subFiles);
        }
      }

      return files;
    } catch (error) {
      throw new Error(`Erro ao listar arquivos: ${error.message}`);
    }
  }

  /**
   * Conta arquivos por tipo em diretório
   */
  static async countFilesByType(dirPath) {
    try {
      const files = await this.listFiles(dirPath, { recursive: true });
      const counts = {};

      for (const filePath of files) {
        const ext = path.extname(filePath).toLowerCase();
        counts[ext] = (counts[ext] || 0) + 1;
      }

      return {
        total: files.length,
        byExtension: counts
      };
    } catch (error) {
      return { total: 0, byExtension: {}, error: error.message };
    }
  }
}

// Classes já exportadas individualmente acima 
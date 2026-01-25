#!/usr/bin/env node

/**
 * DINO LAIR Installer
 *
 * Automates Claude Desktop configuration for the DINO LAIR MCP server.
 *
 * Usage:
 *   npm run setup          - Install/update DINO LAIR
 *   npm run setup -- --uninstall  - Remove DINO LAIR from config
 *
 * @author DINO LAIR Team
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';

const VERSION = '1.0.0';
const DINO_EMOJI = '\u{1F996}'; // dinosaur emoji for compatible terminals

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Check if running in a TTY that supports colors
const useColors = process.stdout.isTTY;

function c(color, text) {
  return useColors ? `${color}${text}${colors.reset}` : text;
}

function log(message) {
  console.log(message);
}

function success(message) {
  log(c(colors.green, `  \u2713 ${message}`));
}

function warn(message) {
  log(c(colors.yellow, `  ! ${message}`));
}

function error(message) {
  log(c(colors.red, `  \u2717 ${message}`));
}

function info(message) {
  log(c(colors.cyan, `  ${message}`));
}

function bullet(message) {
  log(`  \u2022 ${message}`);
}

// Get Claude Desktop config path based on platform
function getConfigPath() {
  const platform = os.platform();
  const home = os.homedir();

  switch (platform) {
    case 'darwin': // macOS
      return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    case 'win32': // Windows
      return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
    case 'linux':
      return path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
    default:
      throw new Error(`Unsupported platform: ${platform}. Supported: macOS, Windows, Linux`);
  }
}

// Get human-readable platform name
function getPlatformName() {
  const platform = os.platform();
  switch (platform) {
    case 'darwin': return 'macOS';
    case 'win32': return 'Windows';
    case 'linux': return 'Linux';
    default: return platform;
  }
}

// Check Node.js version
function checkNodeVersion() {
  const version = process.versions.node;
  const major = parseInt(version.split('.')[0], 10);

  if (major < 18) {
    error(`Node.js v${version} detected - requires v18.0.0 or higher`);
    log('');
    log('  Please upgrade Node.js:');
    const platform = os.platform();
    if (platform === 'darwin') {
      log('    brew install node');
      log('  or visit https://nodejs.org/');
    } else if (platform === 'win32') {
      log('    Visit https://nodejs.org/ to download the installer');
    } else {
      log('    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -');
      log('    sudo apt-get install -y nodejs');
    }
    return false;
  }

  success(`Node.js v${version} detected (${process.execPath})`);
  return true;
}

// Check if dist/index.js exists (game has been built)
function checkBuildExists() {
  const distPath = path.join(process.cwd(), 'dist', 'index.js');

  if (!fs.existsSync(distPath)) {
    error('dist/index.js not found - game needs to be built first');
    log('');
    log('  Please run:');
    log('    npm install');
    log('    npm run build');
    return false;
  }

  success('Game build found (dist/index.js)');
  return true;
}

// Read existing config file
function readConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return { exists: false, config: null, raw: null };
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);
    return { exists: true, config, raw };
  } catch (e) {
    if (e instanceof SyntaxError) {
      return { exists: true, config: null, raw: fs.readFileSync(configPath, 'utf8'), parseError: e.message };
    }
    throw e;
  }
}

// Create backup of existing config
function createBackup(configPath) {
  if (!fs.existsSync(configPath)) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.dirname(configPath);
  const backupPath = path.join(dir, `claude_desktop_config.backup.${timestamp}.json`);

  fs.copyFileSync(configPath, backupPath);
  return backupPath;
}

// Validate API key format
function validateApiKey(key) {
  if (!key || typeof key !== 'string') {
    return { valid: false, reason: 'API key is required' };
  }

  const trimmed = key.trim();

  if (trimmed.length === 0) {
    return { valid: false, reason: 'API key cannot be empty' };
  }

  if (!trimmed.startsWith('sk-ant-')) {
    return { valid: false, reason: 'API key should start with "sk-ant-"' };
  }

  if (trimmed.length < 20) {
    return { valid: false, reason: 'API key appears too short' };
  }

  return { valid: true, key: trimmed };
}

// Prompt user for input
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Prompt for API key with validation
async function promptForApiKey(existingKey = null) {
  log('');
  log('Please enter your Anthropic API key.');
  log(c(colors.dim, '(Get one at https://console.anthropic.com/api-keys)'));

  if (existingKey) {
    const masked = existingKey.slice(0, 10) + '...' + existingKey.slice(-4);
    log(c(colors.dim, `Current key: ${masked}`));
  }

  log('');

  while (true) {
    const key = await prompt('API Key: ');

    // Allow skipping if there's an existing key
    if (existingKey && key.trim() === '') {
      log('  Keeping existing API key');
      return existingKey;
    }

    const validation = validateApiKey(key);

    if (validation.valid) {
      success('API key format validated');
      return validation.key;
    }

    error(validation.reason);
    log('  Please try again (or press Ctrl+C to cancel)');
    log('');
  }
}

// Prompt for yes/no confirmation
async function confirm(question, defaultYes = true) {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await prompt(`${question} ${hint}: `);
  const trimmed = answer.trim().toLowerCase();

  if (trimmed === '') {
    return defaultYes;
  }

  return trimmed === 'y' || trimmed === 'yes';
}

// Write config file with proper formatting
function writeConfig(configPath, config) {
  // Ensure directory exists
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write with 2-space indentation for readability
  const content = JSON.stringify(config, null, 2);

  // Validate JSON before writing
  try {
    JSON.parse(content);
  } catch (e) {
    throw new Error('Generated invalid JSON - this is a bug in the installer');
  }

  fs.writeFileSync(configPath, content, 'utf8');
}

// Get the absolute path to dist/index.js
function getGamePath() {
  return path.join(process.cwd(), 'dist', 'index.js');
}

// Get the full path to node (critical for Mac where GUI apps don't inherit PATH)
function getNodePath() {
  // process.execPath gives us the exact node binary running this installer
  // This ensures Claude Desktop can find node even without PATH
  return process.execPath;
}

// Build the dino-lair MCP server config entry
function buildDinoLairEntry(apiKey) {
  return {
    command: getNodePath(),
    args: [getGamePath()],
    env: {
      ANTHROPIC_API_KEY: apiKey,
    },
  };
}

// Main install function
async function install() {
  log('');
  log(c(colors.bright, `${DINO_EMOJI} DINO LAIR Installer v${VERSION}`));
  log('');
  log('Checking prerequisites...');

  // Check Node.js version
  if (!checkNodeVersion()) {
    process.exit(1);
  }

  // Check if build exists
  if (!checkBuildExists()) {
    process.exit(1);
  }

  // Get config path
  let configPath;
  try {
    configPath = getConfigPath();
  } catch (e) {
    error(e.message);
    process.exit(1);
  }

  const configDir = path.dirname(configPath);

  // Check if config directory exists
  if (fs.existsSync(configDir)) {
    success(`Claude Desktop config directory found (${getPlatformName()})`);
  } else {
    warn(`Claude Desktop config directory not found`);
    info(`Will create: ${configDir}`);
  }

  // Read existing config
  const { exists, config, raw, parseError } = readConfig(configPath);

  let currentConfig = {};
  let existingDinoLair = null;

  if (exists) {
    if (parseError) {
      log('');
      warn('Existing config file has invalid JSON');
      error(`Parse error: ${parseError}`);
      log('');

      const proceed = await confirm('Create fresh config? (existing will be backed up)', false);
      if (!proceed) {
        log('');
        log('Installation cancelled. Please fix your config file manually.');
        process.exit(1);
      }
      // Will create fresh config, but backup first
    } else {
      currentConfig = config;
      existingDinoLair = config?.mcpServers?.['dino-lair'];
    }
  }

  // Check for existing installation
  log('');
  if (existingDinoLair) {
    log(c(colors.yellow, 'Existing DINO LAIR installation detected.'));

    const currentPath = existingDinoLair.args?.[0] || 'unknown';
    const newPath = getGamePath();

    if (currentPath !== newPath) {
      log(`  Current path: ${currentPath}`);
      log(`  New path: ${newPath}`);
    }

    log('');
    const update = await confirm('Update installation?', true);
    if (!update) {
      log('');
      log('Installation cancelled.');
      process.exit(0);
    }

    // Ask about API key
    const existingApiKey = existingDinoLair.env?.ANTHROPIC_API_KEY;
    log('');
    const updateKey = await confirm('Update API key?', false);

    let apiKey;
    if (updateKey) {
      apiKey = await promptForApiKey(existingApiKey);
    } else {
      apiKey = existingApiKey;
      if (!apiKey) {
        warn('No existing API key found - you will need to provide one');
        apiKey = await promptForApiKey();
      }
    }

    // Perform update
    log('');
    log('Updating DINO LAIR...');

    // Backup
    const backupPath = createBackup(configPath);
    if (backupPath) {
      bullet(`Backing up existing config \u2192 ${path.basename(backupPath)}`);
    }

    // Update entry
    bullet('Updating dino-lair configuration');
    currentConfig.mcpServers = currentConfig.mcpServers || {};
    currentConfig.mcpServers['dino-lair'] = buildDinoLairEntry(apiKey);

    // Write config
    bullet('Writing updated config');
    writeConfig(configPath, currentConfig);

  } else {
    // Fresh install
    log('No existing DINO LAIR installation detected.');

    // Prompt for API key
    const apiKey = await promptForApiKey();

    // Perform install
    log('');
    log('Installing DINO LAIR...');

    // Backup if exists
    if (exists) {
      const backupPath = createBackup(configPath);
      if (backupPath) {
        bullet(`Backing up existing config \u2192 ${path.basename(backupPath)}`);
      }
    }

    // Add dino-lair to mcpServers
    bullet('Adding dino-lair to mcpServers');
    currentConfig.mcpServers = currentConfig.mcpServers || {};
    currentConfig.mcpServers['dino-lair'] = buildDinoLairEntry(apiKey);

    // Write config
    bullet('Writing updated config');
    writeConfig(configPath, currentConfig);
  }

  // Success!
  log('');
  log(c(colors.green, c(colors.bright, '\u2705 Installation complete!')));
  log('');
  log('Next steps:');
  log('  1. Restart Claude Desktop (fully quit and reopen)');
  log('  2. Start a new conversation');
  log('  3. Say "Let\'s play DINO LAIR!"');
  log('');
  log(`Have fun! ${DINO_EMOJI}`);
  log('');
}

// Uninstall function
async function uninstall() {
  log('');
  log(c(colors.bright, `${DINO_EMOJI} DINO LAIR Uninstaller`));
  log('');

  // Get config path
  let configPath;
  try {
    configPath = getConfigPath();
  } catch (e) {
    error(e.message);
    process.exit(1);
  }

  // Read existing config
  const { exists, config, parseError } = readConfig(configPath);

  if (!exists) {
    error('Claude Desktop config file not found');
    log(`  Expected at: ${configPath}`);
    process.exit(1);
  }

  if (parseError) {
    error('Config file has invalid JSON - cannot safely modify');
    process.exit(1);
  }

  const existingDinoLair = config?.mcpServers?.['dino-lair'];

  if (!existingDinoLair) {
    log('DINO LAIR is not installed in your Claude Desktop config.');
    process.exit(0);
  }

  log('Found dino-lair in your Claude Desktop config.');

  const proceed = await confirm('Remove it?', false);

  if (!proceed) {
    log('');
    log('Uninstall cancelled.');
    process.exit(0);
  }

  log('');

  // Backup
  const backupPath = createBackup(configPath);
  bullet(`Backing up existing config \u2192 ${path.basename(backupPath)}`);

  // Remove dino-lair entry
  bullet('Removing dino-lair entry');
  delete config.mcpServers['dino-lair'];

  // Count remaining servers
  const remaining = Object.keys(config.mcpServers).length;
  if (remaining > 0) {
    bullet(`Preserving other mcpServers (${remaining} other server${remaining === 1 ? '' : 's'} untouched)`);
  }

  // Clean up empty mcpServers object
  if (Object.keys(config.mcpServers).length === 0) {
    delete config.mcpServers;
  }

  // Write config
  bullet('Writing updated config');
  writeConfig(configPath, config);

  log('');
  log(c(colors.green, c(colors.bright, '\u2705 DINO LAIR removed.')));
  log('');
  log('Restart Claude Desktop to apply changes.');
  log('');
}

// Show help
function showHelp() {
  log('');
  log(c(colors.bright, `${DINO_EMOJI} DINO LAIR Installer v${VERSION}`));
  log('');
  log('Usage:');
  log('  npm run setup              Install or update DINO LAIR');
  log('  npm run setup -- --uninstall   Remove DINO LAIR from config');
  log('  npm run setup -- --help        Show this help message');
  log('');
  log('This installer will:');
  log('  - Detect your Claude Desktop config location');
  log('  - Back up your existing config before making changes');
  log('  - Add/update the dino-lair MCP server entry');
  log('  - Preserve all your other MCP servers');
  log('');
  log('For more information, see the README.md file.');
  log('');
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('--uninstall') || args.includes('-u')) {
    await uninstall();
    process.exit(0);
  }

  await install();
}

// Run
main().catch((e) => {
  log('');
  error(`Unexpected error: ${e.message}`);
  log('');
  log('Please report this issue at:');
  log('  https://github.com/anthropics/dino-lair-mcp/issues');
  log('');
  process.exit(1);
});

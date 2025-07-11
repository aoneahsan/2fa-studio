#!/usr/bin/env node

/**
 * 2FA Studio Setup Script
 * Automated configuration for development environment
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

// Check if command exists
const commandExists = (cmd) => {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

// Execute command with error handling
const exec = (cmd, options = {}) => {
  try {
    return execSync(cmd, { stdio: 'inherit', ...options });
  } catch (error) {
    log.error(`Failed to execute: ${cmd}`);
    throw error;
  }
};

// Setup functions
async function checkPrerequisites() {
  log.header('Checking prerequisites...');
  
  const requirements = [
    { cmd: 'node', minVersion: '18.0.0', currentVersion: process.version },
    { cmd: 'yarn', minVersion: '1.22.0' },
    { cmd: 'git', minVersion: '2.0.0' },
  ];

  for (const req of requirements) {
    if (commandExists(req.cmd)) {
      log.success(`${req.cmd} is installed`);
    } else {
      log.error(`${req.cmd} is not installed. Please install it first.`);
      process.exit(1);
    }
  }
}

async function setupEnvironment() {
  log.header('Setting up environment...');
  
  // Check if .env exists
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  try {
    await fs.access(envPath);
    log.info('.env file already exists');
    const overwrite = await question('Do you want to overwrite .env file? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      return;
    }
  } catch {
    // .env doesn't exist, continue
  }

  // Copy .env.example to .env
  try {
    const envContent = await fs.readFile(envExamplePath, 'utf8');
    await fs.writeFile(envPath, envContent);
    log.success('.env file created from .env.example');
    
    log.warning('Please update .env with your Firebase configuration');
    const openEditor = await question('Do you want to open .env in your editor? (y/N): ');
    if (openEditor.toLowerCase() === 'y') {
      try {
        exec(`${process.env.EDITOR || 'code'} .env`, { stdio: 'ignore' });
      } catch {
        log.warning('Could not open editor. Please edit .env manually.');
      }
    }
  } catch (error) {
    log.error('Failed to create .env file');
    throw error;
  }
}

async function installDependencies() {
  log.header('Installing dependencies...');
  
  const skipInstall = await question('Dependencies installation can take a while. Skip? (y/N): ');
  if (skipInstall.toLowerCase() === 'y') {
    log.warning('Skipping dependency installation');
    return;
  }

  log.info('Installing packages with yarn...');
  exec('yarn install');
  log.success('Dependencies installed successfully');
}

async function setupFirebase() {
  log.header('Firebase Setup Instructions');
  
  console.log(`
To complete Firebase setup:

1. Go to ${colors.cyan}https://console.firebase.google.com${colors.reset}
2. Create a new project or select existing one
3. Enable Authentication and add Email/Password provider
4. Enable Firestore Database
5. Enable Storage
6. Go to Project Settings > General
7. Add a web app and copy the configuration
8. Update your .env file with the Firebase config values

${colors.yellow}Important Security Rules:${colors.reset}
- Set up proper Firestore security rules
- Enable App Check for production
- Configure authorized domains
`);

  await question('Press Enter when you have completed Firebase setup...');
}

async function setupCapacitor() {
  log.header('Setting up Capacitor for mobile development...');
  
  const setupMobile = await question('Do you want to set up mobile platforms? (y/N): ');
  if (setupMobile.toLowerCase() !== 'y') {
    log.info('Skipping mobile setup');
    return;
  }

  // Add platforms
  const platforms = [];
  const addAndroid = await question('Add Android platform? (y/N): ');
  if (addAndroid.toLowerCase() === 'y') platforms.push('android');
  
  const addIOS = await question('Add iOS platform? (y/N): ');
  if (addIOS.toLowerCase() === 'y') platforms.push('ios');

  for (const platform of platforms) {
    log.info(`Adding ${platform} platform...`);
    exec(`npx cap add ${platform}`);
    log.success(`${platform} platform added`);
  }

  if (platforms.length > 0) {
    log.info('Syncing Capacitor...');
    exec('npx cap sync');
    log.success('Capacitor synced');
  }
}

async function setupGoogleDrive() {
  log.header('Google Drive Backup Setup');
  
  console.log(`
To enable Google Drive backup:

1. Go to ${colors.cyan}https://console.cloud.google.com${colors.reset}
2. Create a new project or select existing one
3. Enable Google Drive API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: 
     - http://localhost:5173 (development)
     - Your production URL
5. Copy Client ID and Client Secret
6. Update your .env file with the Google OAuth values

${colors.yellow}Note:${colors.reset} Keep Client Secret secure and never commit it to version control
`);

  await question('Press Enter to continue...');
}

async function finalizeSetup() {
  log.header('Setup Complete! 🎉');
  
  console.log(`
${colors.green}Your 2FA Studio development environment is ready!${colors.reset}

${colors.bright}Next steps:${colors.reset}
1. Update .env with your configuration values
2. Run ${colors.cyan}yarn dev${colors.reset} to start the development server
3. Visit ${colors.cyan}http://localhost:5173${colors.reset}

${colors.bright}Available commands:${colors.reset}
- ${colors.cyan}yarn dev${colors.reset}         Start development server
- ${colors.cyan}yarn build${colors.reset}       Build for production
- ${colors.cyan}yarn preview${colors.reset}     Preview production build
- ${colors.cyan}yarn lint${colors.reset}        Run ESLint
- ${colors.cyan}npx cap open android${colors.reset}  Open in Android Studio
- ${colors.cyan}npx cap open ios${colors.reset}      Open in Xcode

${colors.bright}Documentation:${colors.reset}
- Project docs: ${colors.cyan}./docs${colors.reset}
- Development plan: ${colors.cyan}./docs/DEVELOPMENT_PLAN.md${colors.reset}
- Firebase docs: ${colors.cyan}https://firebase.google.com/docs${colors.reset}
- Capacitor docs: ${colors.cyan}https://capacitorjs.com/docs${colors.reset}

${colors.yellow}Remember:${colors.reset}
- Never commit .env file
- Keep encryption passwords secure
- Test on multiple devices
- Follow security best practices

Happy coding! 🚀
`);
}

async function main() {
  console.clear();
  log.header('🔐 2FA Studio Setup Script');
  
  try {
    await checkPrerequisites();
    await setupEnvironment();
    await installDependencies();
    await setupFirebase();
    await setupCapacitor();
    await setupGoogleDrive();
    await finalizeSetup();
  } catch (error) {
    log.error('Setup failed!');
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
main().catch(console.error);
import { defineConfig } from 'cypress';

const config = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    videosFolder: 'cypress/videos',
    screenshotOnRunFailure: true,
    screenshotsFolder: 'cypress/screenshots',
    
    // Test execution settings
    defaultCommandTimeout: 10000,
    requestTimeout: 30000,
    responseTimeout: 30000,
    pageLoadTimeout: 60000,
    
    // Retry settings for flaky tests
    retries: {
      runMode: 2,
      openMode: 0,
    },
    
    // Test isolation
    testIsolation: true,
    
    setupNodeEvents(on, config) {
      // Task for logging
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        
        // Task for setting test data
        setTestData(data) {
          // Store test data for sharing between tests
          global.testData = data;
          return null;
        },
        
        // Task for getting test data
        getTestData() {
          return global.testData || null;
        }
      });
      
      // Custom events
      on('before:browser:launch', (browser = {}, launchOptions) => {
        // Configure browser for testing
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          launchOptions.args.push('--disable-dev-shm-usage');
          launchOptions.args.push('--no-sandbox');
          launchOptions.args.push('--disable-gpu');
        }
        
        if (browser.family === 'firefox') {
          launchOptions.args.push('--width=1280');
          launchOptions.args.push('--height=720');
        }
        
        return launchOptions;
      });
      
      // Handle file preprocessing
      on('file:preprocessor', (file) => {
        // Add any custom preprocessing here
        return file;
      });
      
      return config;
    },
    
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    
    // Test filtering
    excludeSpecPattern: [
      'cypress/e2e/**/*.skip.cy.{js,jsx,ts,tsx}',
      'cypress/e2e/**/draft-*.cy.{js,jsx,ts,tsx}'
    ],
  },
  
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
    indexHtmlFile: 'cypress/support/component-index.html',
  },
  
  env: {
    // Test user credentials
    TEST_EMAIL: 'test@2fastudio.app',
    TEST_PASSWORD: 'TestPassword123!',
    TEST_ENCRYPTION_PASSWORD: 'EncryptionTest123!',
    
    // Admin user credentials
    ADMIN_EMAIL: 'admin@2fastudio.app',
    ADMIN_PASSWORD: 'AdminPassword123!',
    
    // Test environment settings
    TEST_ENV: 'cypress',
    USE_FIREBASE_EMULATOR: 'true',
    FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
    FIREBASE_FIRESTORE_EMULATOR_HOST: 'localhost:8080',
    FIREBASE_STORAGE_EMULATOR_HOST: 'localhost:9199',
    FIREBASE_FUNCTIONS_EMULATOR_HOST: 'localhost:5001',
    
    // API endpoints
    API_BASE_URL: 'http://localhost:5173/api',
    
    // Feature flags for testing
    ENABLE_PREMIUM_FEATURES: true,
    ENABLE_EXTENSION_FEATURES: true,
    ENABLE_MOBILE_FEATURES: true,
    
    // Test data settings
    GENERATE_TEST_DATA: true,
    CLEANUP_AFTER_TESTS: true,
    
    // Performance thresholds
    MAX_LOAD_TIME: 3000,
    MAX_RENDER_TIME: 1000,
    
    // Accessibility testing
    A11Y_VIOLATIONS_THRESHOLD: 0,
    
    // Browser extension testing
    EXTENSION_ID: 'test-extension-id',
    
    // Mobile testing
    SIMULATE_MOBILE: false,
    DEVICE_TYPE: 'desktop',
    
    // Debug settings
    DEBUG_MODE: false,
    VERBOSE_LOGGING: false,
  },
  
  // Global configuration
  chromeWebSecurity: false,
  modifyObstructiveCode: false,
  
  // Experimental features
  experimentalStudio: true,
  experimentalWebKitSupport: false,
});

export default config;
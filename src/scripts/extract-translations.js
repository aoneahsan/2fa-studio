#!/usr/bin/env node

/**
 * Translation key extraction and validation tool
 * Extracts translation keys from source code and validates translations
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const CONFIG = {
  sourceDir: path.join(__dirname, '../'),
  localesDir: path.join(__dirname, '../locales'),
  outputFile: path.join(__dirname, '../locales/extracted-keys.json'),
  baseLanguage: 'en',
  supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ru', 'pt', 'it', 'ar', 'he'],
  patterns: [
    // React hooks and components
    /(?:useTranslation|useLocalization)\(\s*(?:['"`]([^'"`]+)['"`])?\s*\)[\s\S]*?\.t\(\s*['"`]([^'"`]+)['"`]/g,
    /\bt\(\s*['"`]([^'"`]+)['"`]/g,
    /\btranslate\(\s*['"`]([^'"`]+)['"`]/g,
    
    // React-i18next Trans component
    /<Trans\s+i18nKey\s*=\s*['"`]([^'"`]+)['"`]/g,
    
    // i18n.t() calls
    /i18n\.t\(\s*['"`]([^'"`]+)['"`]/g,
  ],
  filePatterns: [
    '**/*.ts',
    '**/*.tsx',
    '**/*.js',
    '**/*.jsx'
  ],
  ignorePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '**/*.test.*',
    '**/*.spec.*',
    'scripts/**'
  ]
};

/**
 * Extract translation keys from source code
 */
function extractKeysFromSource() {
  const keys = new Set();
  const keyUsage = new Map(); // Track where keys are used
  
  // Get all source files
  const files = CONFIG.filePatterns.reduce((acc, pattern) => {
    const found = glob.sync(pattern, {
      cwd: CONFIG.sourceDir,
      ignore: CONFIG.ignorePatterns
    });
    return acc.concat(found);
  }, []);
  
  console.log(`Scanning ${files.length} files for translation keys...`);
  
  files.forEach(file => {
    const filePath = path.join(CONFIG.sourceDir, file);
    
    if (!fs.existsSync(filePath)) {
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    
    CONFIG.patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        let key = match[1] || match[2]; // Handle different capture groups
        
        if (key) {
          // Clean up the key
          key = key.trim();
          
          // Skip dynamic keys or invalid keys
          if (key.includes('${') || key.includes('`') || key.includes('+')) {
            continue;
          }
          
          keys.add(key);
          
          // Track usage
          if (!keyUsage.has(key)) {
            keyUsage.set(key, []);
          }
          keyUsage.get(key).push({
            file: file,
            line: content.substring(0, match.index).split('\n').length
          });
        }
      }
    });
  });
  
  console.log(`Found ${keys.size} unique translation keys`);
  
  return {
    keys: Array.from(keys).sort(),
    usage: Object.fromEntries(keyUsage)
  };
}

/**
 * Load translation files
 */
function loadTranslations() {
  const translations = {};
  
  CONFIG.supportedLanguages.forEach(lang => {
    const langDir = path.join(CONFIG.localesDir, lang);
    
    if (!fs.existsSync(langDir)) {
      console.warn(`Warning: Translation directory for '${lang}' not found`);
      translations[lang] = {};
      return;
    }
    
    translations[lang] = {};
    
    // Load all JSON files in the language directory
    const files = fs.readdirSync(langDir).filter(file => file.endsWith('.json'));
    
    files.forEach(file => {
      const namespace = path.basename(file, '.json');
      const filePath = path.join(langDir, file);
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        // Flatten nested objects with namespace prefix
        const flattened = flattenObject(data, namespace === 'common' ? '' : `${namespace}.`);
        Object.assign(translations[lang], flattened);
      } catch (error) {
        console.error(`Error loading ${filePath}: ${error.message}`);
      }
    });
  });
  
  return translations;
}

/**
 * Flatten nested object to dot notation
 */
function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  Object.keys(obj).forEach(key => {
    const newKey = prefix + key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(flattened, flattenObject(obj[key], newKey + '.'));
    } else {
      flattened[newKey] = obj[key];
    }
  });
  
  return flattened;
}

/**
 * Validate translations
 */
function validateTranslations(extractedKeys, translations) {
  const report = {
    summary: {
      totalKeys: extractedKeys.keys.length,
      languages: CONFIG.supportedLanguages.length,
      coverage: {}
    },
    issues: {
      missingKeys: {},
      unusedKeys: {},
      emptyValues: {},
      pluralizationIssues: {},
      interpolationIssues: {}
    }
  };
  
  const baseTranslations = translations[CONFIG.baseLanguage] || {};
  
  // Check each language
  CONFIG.supportedLanguages.forEach(lang => {
    const langTranslations = translations[lang] || {};
    const missingKeys = [];
    const unusedKeys = [];
    const emptyValues = [];
    
    // Find missing keys
    extractedKeys.keys.forEach(key => {
      if (!langTranslations.hasOwnProperty(key)) {
        missingKeys.push(key);
      } else if (!langTranslations[key] || langTranslations[key].toString().trim() === '') {
        emptyValues.push(key);
      }
    });
    
    // Find unused keys
    Object.keys(langTranslations).forEach(key => {
      if (!extractedKeys.keys.includes(key)) {
        unusedKeys.push(key);
      }
    });
    
    // Calculate coverage
    const translatedKeys = extractedKeys.keys.filter(key => 
      langTranslations.hasOwnProperty(key) && 
      langTranslations[key] && 
      langTranslations[key].toString().trim() !== ''
    );
    
    report.summary.coverage[lang] = {
      translated: translatedKeys.length,
      missing: missingKeys.length,
      unused: unusedKeys.length,
      empty: emptyValues.length,
      percentage: Math.round((translatedKeys.length / extractedKeys.keys.length) * 100)
    };
    
    if (missingKeys.length > 0) {
      report.issues.missingKeys[lang] = missingKeys;
    }
    
    if (unusedKeys.length > 0) {
      report.issues.unusedKeys[lang] = unusedKeys;
    }
    
    if (emptyValues.length > 0) {
      report.issues.emptyValues[lang] = emptyValues;
    }
    
    // Check for interpolation issues
    const interpolationIssues = [];
    extractedKeys.keys.forEach(key => {
      const baseValue = baseTranslations[key];
      const langValue = langTranslations[key];
      
      if (baseValue && langValue) {
        const baseInterpolations = (baseValue.match(/\{\{[^}]+\}\}/g) || []).sort();
        const langInterpolations = (langValue.match(/\{\{[^}]+\}\}/g) || []).sort();
        
        if (JSON.stringify(baseInterpolations) !== JSON.stringify(langInterpolations)) {
          interpolationIssues.push({
            key,
            base: baseInterpolations,
            translation: langInterpolations
          });
        }
      }
    });
    
    if (interpolationIssues.length > 0) {
      report.issues.interpolationIssues[lang] = interpolationIssues;
    }
  });
  
  return report;
}

/**
 * Generate missing translation templates
 */
function generateMissingTranslations(extractedKeys, translations, report) {
  const templates = {};
  
  CONFIG.supportedLanguages.forEach(lang => {
    if (lang === CONFIG.baseLanguage) return;
    
    const missingKeys = report.issues.missingKeys[lang] || [];
    if (missingKeys.length === 0) return;
    
    const template = {};
    const baseTranslations = translations[CONFIG.baseLanguage] || {};
    
    missingKeys.forEach(key => {
      // Create nested structure
      const keys = key.split('.');
      let current = template;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      // Add base translation as comment for reference
      const lastKey = keys[keys.length - 1];
      const baseValue = baseTranslations[key];
      current[lastKey] = baseValue ? `[TRANSLATE] ${baseValue}` : `[MISSING] ${key}`;
    });
    
    templates[lang] = template;
  });
  
  return templates;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔍 Extracting translation keys from source code...');
  const extractedKeys = extractKeysFromSource();
  
  console.log('📂 Loading existing translations...');
  const translations = loadTranslations();
  
  console.log('✅ Validating translations...');
  const report = validateTranslations(extractedKeys, translations);
  
  console.log('📝 Generating missing translation templates...');
  const templates = generateMissingTranslations(extractedKeys, translations, report);
  
  // Save extracted keys
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify({
    extractedAt: new Date().toISOString(),
    extractedKeys,
    report,
    templates
  }, null, 2));
  
  console.log(`\n📊 Translation Report:`);
  console.log(`Total keys found: ${report.summary.totalKeys}`);
  console.log(`\nCoverage by language:`);
  
  CONFIG.supportedLanguages.forEach(lang => {
    const coverage = report.summary.coverage[lang];
    const status = coverage.percentage >= 90 ? '✅' : coverage.percentage >= 70 ? '⚠️' : '❌';
    console.log(`  ${status} ${lang}: ${coverage.percentage}% (${coverage.translated}/${report.summary.totalKeys})`);
    
    if (coverage.missing > 0) {
      console.log(`    Missing: ${coverage.missing} keys`);
    }
    if (coverage.empty > 0) {
      console.log(`    Empty: ${coverage.empty} values`);
    }
    if (coverage.unused > 0) {
      console.log(`    Unused: ${coverage.unused} keys`);
    }
  });
  
  // Check for issues
  let hasIssues = false;
  
  Object.keys(report.issues).forEach(issueType => {
    const issues = report.issues[issueType];
    if (Object.keys(issues).length > 0) {
      hasIssues = true;
    }
  });
  
  if (hasIssues) {
    console.log('\n⚠️ Issues found:');
    
    if (Object.keys(report.issues.missingKeys).length > 0) {
      console.log('  Missing keys detected in some languages');
    }
    
    if (Object.keys(report.issues.unusedKeys).length > 0) {
      console.log('  Unused keys detected (consider cleanup)');
    }
    
    if (Object.keys(report.issues.interpolationIssues).length > 0) {
      console.log('  Interpolation mismatches detected');
    }
  }
  
  // Save templates for missing translations
  Object.keys(templates).forEach(lang => {
    const templateFile = path.join(CONFIG.localesDir, `missing-${lang}.json`);
    fs.writeFileSync(templateFile, JSON.stringify(templates[lang], null, 2));
    console.log(`📝 Generated missing keys template: ${templateFile}`);
  });
  
  console.log(`\n📄 Full report saved to: ${CONFIG.outputFile}`);
  
  // Exit with error if critical issues found
  const criticalIssues = CONFIG.supportedLanguages.some(lang => {
    const coverage = report.summary.coverage[lang];
    return coverage && coverage.percentage < 50; // Less than 50% coverage is critical
  });
  
  if (criticalIssues) {
    console.log('\n❌ Critical translation coverage issues detected');
    process.exit(1);
  }
  
  console.log('\n✨ Translation extraction completed successfully!');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = {
  extractKeysFromSource,
  loadTranslations,
  validateTranslations,
  generateMissingTranslations,
  CONFIG
};
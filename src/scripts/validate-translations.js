#!/usr/bin/env node

/**
 * Translation validation script
 * Validates translation files for consistency, format, and completeness
 */

const fs = require('fs');
const path = require('path');
const { CONFIG, loadTranslations } = require('./extract-translations');

/**
 * Validate JSON format and structure
 */
function validateJsonStructure(filePath, data, errors) {
  try {
    // Check for empty objects
    if (Object.keys(data).length === 0) {
      errors.push({
        file: filePath,
        type: 'empty_file',
        message: 'Translation file is empty'
      });
    }
    
    // Check for deeply nested structures (more than 4 levels)
    function checkNesting(obj, depth = 0, path = '') {
      if (depth > 4) {
        errors.push({
          file: filePath,
          type: 'deep_nesting',
          message: `Too deeply nested structure at ${path}`,
          path
        });
        return;
      }
      
      Object.keys(obj).forEach(key => {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          checkNesting(obj[key], depth + 1, currentPath);
        } else {
          // Validate translation value
          validateTranslationValue(filePath, currentPath, obj[key], errors);
        }
      });
    }
    
    checkNesting(data);
    
  } catch (error) {
    errors.push({
      file: filePath,
      type: 'invalid_json',
      message: `Invalid JSON: ${error.message}`
    });
  }
}

/**
 * Validate individual translation values
 */
function validateTranslationValue(filePath, path, value, errors) {
  // Check for empty or null values
  if (value === null || value === undefined) {
    errors.push({
      file: filePath,
      type: 'null_value',
      message: `Null or undefined value at ${path}`,
      path
    });
    return;
  }
  
  // Convert to string for validation
  const stringValue = value.toString();
  
  // Check for empty strings
  if (stringValue.trim() === '') {
    errors.push({
      file: filePath,
      type: 'empty_value',
      message: `Empty value at ${path}`,
      path
    });
    return;
  }
  
  // Check for untranslated placeholders
  if (stringValue.startsWith('[TRANSLATE]') || stringValue.startsWith('[MISSING]')) {
    errors.push({
      file: filePath,
      type: 'untranslated',
      message: `Untranslated placeholder at ${path}`,
      path
    });
  }
  
  // Check for malformed interpolations
  const interpolations = stringValue.match(/\{\{[^}]*\}\}/g) || [];
  interpolations.forEach(interpolation => {
    if (!interpolation.match(/^\{\{[a-zA-Z0-9_]+\}\}$/)) {
      errors.push({
        file: filePath,
        type: 'malformed_interpolation',
        message: `Malformed interpolation "${interpolation}" at ${path}`,
        path
      });
    }
  });
  
  // Check for HTML in translations (potential XSS risk)
  if (stringValue.includes('<') && stringValue.includes('>')) {
    const htmlTags = stringValue.match(/<[^>]+>/g) || [];
    const allowedTags = ['<br>', '<strong>', '<em>', '<i>', '<b>', '<span>', '</span>', '</strong>', '</em>', '</i>', '</b>'];
    
    htmlTags.forEach(tag => {
      if (!allowedTags.includes(tag.toLowerCase()) && !tag.match(/^<\/?(br|strong|em|i|b|span)(\s[^>]*)?>$/i)) {
        errors.push({
          file: filePath,
          type: 'unsafe_html',
          message: `Potentially unsafe HTML tag "${tag}" at ${path}`,
          path
        });
      }
    });
  }
  
  // Check for very long translations (might indicate UI issues)
  if (stringValue.length > 500) {
    errors.push({
      file: filePath,
      type: 'very_long',
      message: `Very long translation (${stringValue.length} chars) at ${path}`,
      path
    });
  }
}

/**
 * Check translation consistency across languages
 */
function validateConsistency(translations, errors) {
  const baseTranslations = translations[CONFIG.baseLanguage];
  if (!baseTranslations) {
    errors.push({
      type: 'missing_base_language',
      message: `Base language ${CONFIG.baseLanguage} not found`
    });
    return;
  }
  
  const baseKeys = Object.keys(baseTranslations);
  
  CONFIG.supportedLanguages.forEach(lang => {
    if (lang === CONFIG.baseLanguage) return;
    
    const langTranslations = translations[lang] || {};
    
    // Check for interpolation consistency
    baseKeys.forEach(key => {
      const baseValue = baseTranslations[key];
      const langValue = langTranslations[key];
      
      if (!baseValue || !langValue) return;
      
      const baseInterpolations = (baseValue.toString().match(/\{\{[^}]+\}\}/g) || []).sort();
      const langInterpolations = (langValue.toString().match(/\{\{[^}]+\}\}/g) || []).sort();
      
      if (JSON.stringify(baseInterpolations) !== JSON.stringify(langInterpolations)) {
        errors.push({
          type: 'interpolation_mismatch',
          language: lang,
          key,
          message: `Interpolation mismatch for key "${key}" in ${lang}`,
          base: baseInterpolations,
          translation: langInterpolations
        });
      }
      
      // Check for HTML tag consistency
      const baseHtmlTags = (baseValue.toString().match(/<[^>]+>/g) || []).sort();
      const langHtmlTags = (langValue.toString().match(/<[^>]+>/g) || []).sort();
      
      if (JSON.stringify(baseHtmlTags) !== JSON.stringify(langHtmlTags)) {
        errors.push({
          type: 'html_tag_mismatch',
          language: lang,
          key,
          message: `HTML tag mismatch for key "${key}" in ${lang}`,
          base: baseHtmlTags,
          translation: langHtmlTags
        });
      }
    });
  });
}

/**
 * Validate pluralization rules
 */
function validatePluralization(translations, errors) {
  CONFIG.supportedLanguages.forEach(lang => {
    const langTranslations = translations[lang] || {};
    
    Object.keys(langTranslations).forEach(key => {
      // Check for plural forms
      if (key.includes('_one') || key.includes('_other') || key.includes('_zero') || key.includes('_few') || key.includes('_many')) {
        const baseKey = key.split('_')[0];
        const pluralForm = key.split('_')[1];
        
        // Validate plural form
        const validPluralForms = ['zero', 'one', 'two', 'few', 'many', 'other'];
        if (!validPluralForms.includes(pluralForm)) {
          errors.push({
            type: 'invalid_plural_form',
            language: lang,
            key,
            message: `Invalid plural form "${pluralForm}" for key "${key}" in ${lang}`
          });
        }
        
        // Check if 'other' form exists (required for all languages)
        const otherKey = `${baseKey}_other`;
        if (!langTranslations[otherKey]) {
          errors.push({
            type: 'missing_plural_other',
            language: lang,
            key: baseKey,
            message: `Missing required "other" plural form for "${baseKey}" in ${lang}`
          });
        }
      }
    });
  });
}

/**
 * Check for RTL-specific issues
 */
function validateRTL(translations, errors) {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  
  rtlLanguages.forEach(lang => {
    if (!CONFIG.supportedLanguages.includes(lang)) return;
    
    const langTranslations = translations[lang] || {};
    
    Object.keys(langTranslations).forEach(key => {
      const value = langTranslations[key]?.toString();
      if (!value) return;
      
      // Check for LTR characters in RTL text (potential display issues)
      const hasRTLChars = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/.test(value);
      const hasLTRChars = /[a-zA-Z]/.test(value);
      
      if (hasRTLChars && hasLTRChars) {
        // This is normal for mixed content, but flag for review
        errors.push({
          type: 'mixed_text_direction',
          language: lang,
          key,
          message: `Mixed LTR/RTL text in ${lang} for key "${key}" - review for display issues`,
          severity: 'warning'
        });
      }
      
      // Check for hardcoded directional punctuation
      if (value.includes('(') || value.includes(')')) {
        errors.push({
          type: 'directional_punctuation',
          language: lang,
          key,
          message: `Parentheses in RTL text for key "${key}" in ${lang} - consider using RTL-aware alternatives`,
          severity: 'warning'
        });
      }
    });
  });
}

/**
 * Main validation function
 */
function validateAllTranslations() {
  console.log('🔍 Validating translation files...');
  
  const errors = [];
  const warnings = [];
  
  // Load and validate each translation file
  CONFIG.supportedLanguages.forEach(lang => {
    const langDir = path.join(CONFIG.localesDir, lang);
    
    if (!fs.existsSync(langDir)) {
      errors.push({
        type: 'missing_language_dir',
        language: lang,
        message: `Translation directory for ${lang} not found`
      });
      return;
    }
    
    const files = fs.readdirSync(langDir).filter(file => file.endsWith('.json'));
    
    files.forEach(file => {
      const filePath = path.join(langDir, file);
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        validateJsonStructure(filePath, data, errors);
        
      } catch (error) {
        errors.push({
          file: filePath,
          type: 'file_read_error',
          message: `Failed to read/parse file: ${error.message}`
        });
      }
    });
  });
  
  // Load all translations for consistency checks
  const translations = loadTranslations();
  
  validateConsistency(translations, errors);
  validatePluralization(translations, errors);
  validateRTL(translations, warnings);
  
  // Separate errors by severity
  const criticalErrors = errors.filter(e => e.type !== 'mixed_text_direction' && e.type !== 'directional_punctuation');
  const allWarnings = [...warnings, ...errors.filter(e => e.severity === 'warning')];
  
  return {
    errors: criticalErrors,
    warnings: allWarnings,
    summary: {
      totalErrors: criticalErrors.length,
      totalWarnings: allWarnings.length,
      filesValidated: CONFIG.supportedLanguages.reduce((acc, lang) => {
        const langDir = path.join(CONFIG.localesDir, lang);
        if (fs.existsSync(langDir)) {
          acc += fs.readdirSync(langDir).filter(f => f.endsWith('.json')).length;
        }
        return acc;
      }, 0)
    }
  };
}

/**
 * Format and display validation results
 */
function displayResults(results) {
  console.log('\n📊 Validation Results:');
  console.log(`Files validated: ${results.summary.filesValidated}`);
  console.log(`Errors: ${results.summary.totalErrors}`);
  console.log(`Warnings: ${results.summary.totalWarnings}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => {
      console.log(`  ${error.type}: ${error.message}`);
      if (error.file) {
        console.log(`    File: ${error.file}`);
      }
      if (error.path) {
        console.log(`    Path: ${error.path}`);
      }
      if (error.language) {
        console.log(`    Language: ${error.language}`);
      }
    });
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    results.warnings.forEach(warning => {
      console.log(`  ${warning.type}: ${warning.message}`);
      if (warning.language) {
        console.log(`    Language: ${warning.language}`);
      }
    });
  }
  
  if (results.errors.length === 0 && results.warnings.length === 0) {
    console.log('\n✅ All translations are valid!');
  }
}

/**
 * Main execution
 */
async function main() {
  const results = validateAllTranslations();
  displayResults(results);
  
  // Save detailed results
  const reportFile = path.join(CONFIG.localesDir, 'validation-report.json');
  fs.writeFileSync(reportFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    ...results
  }, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  
  // Exit with error code if critical errors found
  if (results.errors.length > 0) {
    console.log('\n❌ Validation failed with errors');
    process.exit(1);
  }
  
  console.log('\n✨ Translation validation completed!');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Validation error:', error);
    process.exit(1);
  });
}

module.exports = {
  validateAllTranslations,
  validateJsonStructure,
  validateTranslationValue,
  validateConsistency,
  validatePluralization,
  validateRTL
};
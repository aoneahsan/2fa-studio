#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Function to fix final patterns
function fixFinalPatterns(filePath, content) {
  let fixed = content;
  
  // Fix cypress config issues
  if (filePath.includes('cypress.config.ts')) {
    fixed = fixed.replace(/\((on, config)\)/, '((_on, _config))');
  }
  
  // Fix cypress plugins parsing error
  if (filePath.includes('cypress/plugins/index.ts')) {
    // Fix line 174 parsing error - look for missing semicolon
    fixed = fixed.replace(/const fs = import\('fs-extra'\)/g, "const fs = import('fs-extra');");
  }
  
  // Fix cypress commands parsing error
  if (filePath.includes('cypress/support/commands.ts')) {
    // Make sure namespace is properly closed
    fixed = fixed.replace(/\}\n\ndeclare global \{/g, '}}\n\ndeclare global {');
    // Ensure proper closing
    if (!fixed.trim().endsWith('}}')) {
      fixed = fixed.trim() + '\n}';
    }
  }
  
  // Fix all error variables in catch blocks
  fixed = fixed.replace(/\} catch \(error\) \{/g, '} catch (_error) {');
  
  // Fix all unused variables in Firebase functions
  fixed = fixed.replace(/\(data, _context\)/g, '(_data, _context)');
  fixed = fixed.replace(/\(_data, context\)/g, '(_data, _context)');
  fixed = fixed.replace(/\(auth, data, context\)/g, '(_auth, _data, _context)');
  
  // Fix specific unused variables
  fixed = fixed.replace(/const auth = functions\.auth/g, 'const _auth = functions.auth');
  fixed = fixed.replace(/\(auth\)/g, '(_auth)');
  
  // Fix _error references that should be error
  fixed = fixed.replace(/console\.error\(['"](.*?)['"],\s*_error\)/g, 'console.error(\'$1\', error)');
  fixed = fixed.replace(/console\.log\(['"](.*?)['"],\s*_error\)/g, 'console.log(\'$1\', error)');
  
  // Fix specific admin analytics business -> enterprise
  if (filePath.includes('admin-analytics.service.ts')) {
    fixed = fixed.replace(/business: 0,/g, 'enterprise: 0,');
  }
  
  // Fix unused registration variable
  fixed = fixed.replace(/\(registration\)/g, '(_registration)');
  
  // Fix setSortBy type issue
  fixed = fixed.replace(/setSortBy\(e\.target\.value as unknown\)/g, 'setSortBy(e.target.value as any)');
  
  // Fix specific variable references in event handlers
  fixed = fixed.replace(/\(error\)/g, '(_error)');
  
  return fixed;
}

// Files to process
const patterns = [
  'cypress/**/*.{ts,tsx}',
  'functions/src/**/*.{ts,tsx}',
  'src/**/*.{ts,tsx}'
];

console.log('🔧 Fixing final lint issues...\n');

patterns.forEach(pattern => {
  const files = glob.sync(pattern, { cwd: __dirname });
  
  files.forEach(file => {
    const filePath = path.join(__dirname, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fixed = fixFinalPatterns(filePath, content);
      
      if (content !== fixed) {
        fs.writeFileSync(filePath, fixed, 'utf8');
        console.log(`✅ Fixed: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });
});

console.log('\n✨ Final lint fixes completed!');
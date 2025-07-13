#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Function to fix specific patterns
function fixSpecificPatterns(filePath, content) {
  let fixed = content;
  
  // Fix specific event handler patterns where 'e' is used
  fixed = fixed.replace(/onChange=\{.*?\(_e\) => (.+?)\(e\./g, 'onChange={(e) => $1(e.');
  fixed = fixed.replace(/onClick=\{.*?\(_e\) => \{(\s*e\.)/g, 'onClick={(e) => {$1');
  fixed = fixed.replace(/onKeyPress=\{.*?\(_e\) => e\./g, 'onKeyPress={(e) => e.');
  fixed = fixed.replace(/onChange=\{.*?\(_e\) => set/g, 'onChange={(e) => set');
  fixed = fixed.replace(/handleKeyDown = \(_e:/g, 'handleKeyDown = (e:');
  
  // Fix catch patterns
  fixed = fixed.replace(/catch \(_error\)/g, 'catch (error)');
  fixed = fixed.replace(/\.catch\(console\._error\)/g, '.catch(console.error)');
  
  // Fix specific variable references
  fixed = fixed.replace(/formatDate = \(date: unknown\)/g, 'formatDate = (date: any)');
  fixed = fixed.replace(/onChange: unknown/g, 'onChange: any');
  fixed = fixed.replace(/value: unknown/g, 'value: any');
  fixed = fixed.replace(/data: unknown/g, 'data: any');
  
  // Fix unused imports by commenting them out
  fixed = fixed.replace(/^import .*Button.*from '@components\/common\/Button';$/gm, '// $&');
  fixed = fixed.replace(/^import .*Modal.*from '@components\/common\/Modal';$/gm, '// $&');
  
  // Fix cypress references
  fixed = fixed.replace(/\/\/\/ <reference types="cypress" \/>/g, '');
  
  // Fix namespace issues
  if (filePath.includes('cypress/support/commands.ts')) {
    fixed = fixed.replace(/namespace Cypress \{/g, '}\n\ndeclare global {\n  namespace Cypress {');
  }
  
  // Fix auth slice reference
  fixed = fixed.replace(/state\._auth/g, 'state.auth');
  
  // Fix variable usage
  fixed = fixed.replace(/if \(_error\)/g, 'if (error)');
  
  // Fix specific type issues in admin analytics
  if (filePath.includes('admin-analytics.service.ts')) {
    fixed = fixed.replace(/business: 0,/g, 'enterprise: 0,');
  }
  
  return fixed;
}

// Files to process
const patterns = [
  'src/**/*.{ts,tsx}',
  'cypress/**/*.{ts,tsx}',
  'functions/src/**/*.{ts,tsx}'
];

console.log('🔧 Fixing specific lint patterns...\n');

patterns.forEach(pattern => {
  const files = glob.sync(pattern, { cwd: __dirname });
  
  files.forEach(file => {
    const filePath = path.join(__dirname, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fixed = fixSpecificPatterns(filePath, content);
      
      if (content !== fixed) {
        fs.writeFileSync(filePath, fixed, 'utf8');
        console.log(`✅ Fixed: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });
});

console.log('\n✨ Specific lint fixes completed!');
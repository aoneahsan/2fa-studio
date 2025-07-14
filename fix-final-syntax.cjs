const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix all remaining syntax issues
function fixSyntax(content) {
  // Fix patterns like: object.(property || []) -> (object.property || [])
  content = content.replace(/(\w+)\.\((\w+) \|\| \[([^\]]*)\]\)/g, '(($1.$2) || [$3])');
  
  // Fix patterns like: result.(data || []) -> (result.data || [])
  content = content.replace(/(\w+)\.\((\w+) \|\| \[\]\)/g, '($1.$2 || [])');
  
  // More general fix for parentheses after dot
  content = content.replace(/(\w+)\.\(([^)]+)\)/g, (match, obj, expr) => {
    // If it's a method call pattern, leave it
    if (expr.includes('=>') || expr.includes('function')) {
      return match;
    }
    // Otherwise fix it
    return `(${obj}.${expr})`;
  });
  
  return content;
}

// Process all TypeScript files
const files = glob.sync('src/**/*.{ts,tsx}', { 
  ignore: ['**/node_modules/**', '**/build/**', '**/dist/**']
});

let totalFixed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  content = fixSyntax(content);
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    totalFixed++;
    console.log(`Fixed: ${file}`);
  }
});

console.log(`\nTotal files fixed: ${totalFixed}`);
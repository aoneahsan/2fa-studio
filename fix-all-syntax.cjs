const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix all syntax errors
function fixAllSyntaxErrors(content) {
  // Fix malformed property access patterns
  // Pattern: object.(property as any).something -> (object.property as any).something
  content = content.replace(/(\w+)\.\((\w+) as any\)\.(\w+)/g, '($1.$2 as any).$3');
  
  // Fix dispatch patterns
  // Pattern: dispatch.(action as any) -> dispatch(action as any)
  content = content.replace(/dispatch\.\(([^)]+) as any\)/g, 'dispatch($1 as any)');
  
  // Fix import patterns
  // Pattern: import.('path' as any) -> (import('path') as any)
  content = content.replace(/import\.\((['"`][^'"`]+['"`]) as any\)/g, '(import($1) as any)');
  
  // Fix double property access
  // Pattern: (obj as any).prop1.prop2.prop3 -> leave as is (already correct)
  
  // Fix state access patterns
  // Pattern: state.(property as any) -> (state.property as any)
  content = content.replace(/state\.\((\w+) as any\)/g, '(state.$1 as any)');
  
  // Fix window access patterns
  // Pattern: (window as any).Something.method -> ((window as any).Something).method
  content = content.replace(/\(window as any\)\.(\w+)\.(\w+)/g, '((window as any).$1).$2');
  
  // Fix navigator access patterns
  content = content.replace(/\(navigator as any\)\.(\w+)\.(\w+)/g, '((navigator as any).$1).$2');
  
  // Fix document access patterns
  content = content.replace(/\(document as any\)\.(\w+)\.(\w+)/g, '((document as any).$1).$2');
  
  // Fix global object patterns
  content = content.replace(/\(global as any\)\.(\w+)\.(\w+)/g, '((global as any).$1).$2');
  
  return content;
}

// Process all TypeScript/React files
const files = glob.sync('src/**/*.{ts,tsx}', { 
  ignore: ['**/node_modules/**', '**/build/**', '**/dist/**']
});

let totalFixed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  content = fixAllSyntaxErrors(content);
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    totalFixed++;
    console.log(`Fixed: ${file}`);
  }
});

console.log(`\nTotal files with syntax fixes: ${totalFixed}`);
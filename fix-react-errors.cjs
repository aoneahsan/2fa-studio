const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix missing 'e' parameters in event handlers
function fixEventParams(content) {
  // Fix patterns like onClick={() => e.preventDefault()}
  content = content.replace(/\((?<![\w])\(\) => (\w+)\.preventDefault\(\)/g, '($1) => $1.preventDefault()');
  
  // Fix patterns like onChange={() => { e.target.value }}
  content = content.replace(/\((?<![\w])\(\) => \{([^}]*?)(e|_e)\.target\.value/g, '($2) => {$1$2.target.value');
  
  // Fix patterns where _e is referenced but not declared
  content = content.replace(/\b_e\.(preventDefault|stopPropagation|target)/g, 'e.$1');
  
  return content;
}

// Fix state.error to state._error
function fixErrorReferences(content) {
  content = content.replace(/state\.error\b/g, 'state._error');
  content = content.replace(/\.error =/g, '._error =');
  content = content.replace(/\.error:/g, '._error:');
  return content;
}

// Fix AsyncThunkAction type issues
function fixAsyncThunkActions(content) {
  // Add type assertion for dispatch calls with async thunks
  content = content.replace(/dispatch\(fetchTags\(\)\)/g, 'dispatch(fetchTags() as any)');
  content = content.replace(/dispatch\((\w+)\(([^)]*)\)\)/g, (match, action, args) => {
    if (action.match(/^(fetch|create|update|delete|load)/)) {
      return `dispatch(${action}(${args}) as any)`;
    }
    return match;
  });
  return content;
}

// Fix toast message issues
function fixToastMessages(content) {
  // Fix toast calls that are just strings
  content = content.replace(/addToast\((['"`][^'"`]+['"`])\)/g, 'addToast({ message: $1, type: "info" })');
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
  
  content = fixEventParams(content);
  content = fixErrorReferences(content);
  content = fixAsyncThunkActions(content);
  content = fixToastMessages(content);
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    totalFixed++;
    console.log(`Fixed: ${file}`);
  }
});

console.log(`\nTotal files fixed: ${totalFixed}`);
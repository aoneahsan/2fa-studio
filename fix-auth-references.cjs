#!/usr/bin/env node
const fs = require('fs');
const glob = require('glob');

// Find all TypeScript/React files
const files = glob.sync('src/**/*.{ts,tsx}');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Fix state.auth to state._auth
  if (content.includes('state.auth') && !content.includes('state._auth')) {
    content = content.replace(/state\.auth(?![\w])/g, 'state._auth');
    changed = true;
  }
  
  // Fix (state) => state.auth to (state) => state._auth
  if (content.includes('=> state.auth')) {
    content = content.replace(/=> state\.auth(?![\w])/g, '=> state._auth');
    changed = true;
  }
  
  // Fix property 'auth' to property '_auth' in type definitions
  if (content.includes("Property 'auth'")) {
    content = content.replace(/Property 'auth'/g, "Property '_auth'");
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed: ${file}`);
  }
});

console.log('Auth reference fixes completed!');
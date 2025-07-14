#!/usr/bin/env node
const fs = require('fs');
const glob = require('glob');

// Find all TypeScript/React files
const files = glob.sync('src/**/*.{ts,tsx}');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Fix: preventDefault() with missing 'e' param
  if (content.includes('(_e:') || content.includes('(_event:')) {
    // Fix _e.preventDefault() -> e.preventDefault()
    content = content.replace(/(\(_e:\s*[^)]+\)\s*=>\s*{[\s\S]*?)e\.preventDefault\(\)/g, '$1_e.preventDefault()');
    // Fix _e.stopPropagation() -> e.stopPropagation()
    content = content.replace(/(\(_e:\s*[^)]+\)\s*=>\s*{[\s\S]*?)e\.stopPropagation\(\)/g, '$1_e.stopPropagation()');
    // Fix _e.target -> e.target
    content = content.replace(/(\(_e:\s*[^)]+\)\s*=>\s*{[\s\S]*?)e\.target/g, '$1_e.target');
    // Fix _e.currentTarget -> e.currentTarget
    content = content.replace(/(\(_e:\s*[^)]+\)\s*=>\s*{[\s\S]*?)e\.currentTarget/g, '$1_e.currentTarget');
    changed = true;
  }
  
  // Fix: undefined 'result' in catch blocks
  if (content.includes('} catch (') && content.includes('result')) {
    // This needs more careful handling - skip for now
  }
  
  // Fix: undefined 'error' in catch blocks
  if (content.includes('} catch (_error)') && content.includes('error.')) {
    content = content.replace(/} catch \(_error\)([\s\S]*?)error\./g, '} catch (_error)$1_error.');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed: ${file}`);
  }
});

console.log('Event parameter fixes completed!');
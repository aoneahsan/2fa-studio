#!/usr/bin/env node

/**
 * Script to update all relative imports to absolute imports using configured aliases
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Define path mappings
const pathMappings = {
  '@/': '',
  '@src/': 'src/',
  '@components/': 'src/components/',
  '@pages/': 'src/pages/',
  '@services/': 'src/services/',
  '@hooks/': 'src/hooks/',
  '@utils/': 'src/utils/',
  '@store/': 'src/store/',
  '@types/': 'src/types/',
  '@constants/': 'src/constants/',
  '@assets/': 'src/assets/'
};

// File extensions to process
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// Directories to skip
const skipDirs = ['node_modules', 'dist', 'build', '.git', 'android', 'ios', 'docs-site'];

async function getAllFiles(dir, fileList = []) {
  const files = await fs.readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    
    if (stat.isDirectory()) {
      if (!skipDirs.includes(file)) {
        await getAllFiles(filePath, fileList);
      }
    } else if (extensions.includes(path.extname(file))) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

function convertToAbsolutePath(importPath, currentFile) {
  // Skip if already an absolute import or external package
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
    return importPath;
  }
  
  // Resolve the absolute path
  const currentDir = path.dirname(currentFile);
  const absolutePath = path.resolve(currentDir, importPath);
  const relativeToProjRoot = path.relative(projectRoot, absolutePath);
  
  // Find the best matching alias
  let bestAlias = '@/';
  let bestMatch = relativeToProjRoot;
  
  for (const [alias, aliasPath] of Object.entries(pathMappings)) {
    if (relativeToProjRoot.startsWith(aliasPath) && aliasPath.length > pathMappings[bestAlias].length) {
      bestAlias = alias;
      bestMatch = relativeToProjRoot.substring(aliasPath.length);
    }
  }
  
  // Construct the new import path
  return bestAlias + bestMatch.replace(/\\/g, '/');
}

async function updateImportsInFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let hasChanges = false;
    
    // Regular expressions for different import patterns
    const importPatterns = [
      // ES6 imports
      /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g,
      // Dynamic imports
      /import\(['"]([^'"]+)['"]\)/g,
      // Require statements
      /require\(['"]([^'"]+)['"]\)/g,
      // Export from
      /export\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g
    ];
    
    for (const pattern of importPatterns) {
      content = content.replace(pattern, (match, importPath) => {
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          const newPath = convertToAbsolutePath(importPath, filePath);
          if (newPath !== importPath) {
            hasChanges = true;
            return match.replace(importPath, newPath);
          }
        }
        return match;
      });
    }
    
    if (hasChanges) {
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Updated: ${path.relative(projectRoot, filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Updating imports to use absolute paths...\n');
  
  const srcDir = path.join(projectRoot, 'src');
  const files = await getAllFiles(srcDir);
  
  console.log(`Found ${files.length} files to process\n`);
  
  let updatedCount = 0;
  for (const file of files) {
    const updated = await updateImportsInFile(file);
    if (updated) updatedCount++;
  }
  
  console.log(`\n✨ Complete! Updated ${updatedCount} files.`);
}

main().catch(console.error);
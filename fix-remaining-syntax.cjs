const fs = require('fs');
const path = require('path');

// Specific fixes for remaining syntax errors
const fixes = {
  'src/components/accounts/AccountCard.tsx': (content) => {
    // Fix: account.(tags || []) -> (account.tags || [])
    content = content.replace(/account\.\(tags \|\| \[\]\)/g, '(account.tags || [])');
    return content;
  },
  
  'src/hooks/useAccounts.ts': (content) => {
    // Fix dispatch. patterns
    content = content.replace(/dispatch\.\(/g, 'dispatch(');
    return content;
  },
  
  'src/services/admin-user-management.service.ts': (content) => {
    // Fix property access patterns
    content = content.replace(/(\w+)\.\((\w+) as any\)\.(\w+)/g, '(($1.$2) as any).$3');
    return content;
  },
  
  'src/services/backup.service.ts': (content) => {
    // Fix property access patterns
    content = content.replace(/(\w+)\.\((\w+) as any\)\.(\w+)/g, '(($1.$2) as any).$3');
    return content;
  },
  
  'src/services/compliance/gdpr-compliance.service.ts': (content) => {
    // Fix property access patterns
    content = content.replace(/(\w+)\.\((\w+) as any\)\.(\w+)/g, '(($1.$2) as any).$3');
    return content;
  },
  
  'src/services/data-migration.service.ts': (content) => {
    // Fix property access patterns
    content = content.replace(/(\w+)\.\((\w+) as any\)\.(\w+)/g, '(($1.$2) as any).$3');
    return content;
  },
  
  'src/services/google-drive-backup.service.ts': (content) => {
    // Fix property access patterns
    content = content.replace(/(\w+)\.\((\w+) as any\)\.(\w+)/g, '(($1.$2) as any).$3');
    return content;
  },
  
  'src/services/receipt-validation.service.ts': (content) => {
    // Fix property access patterns
    content = content.replace(/(\w+)\.\((\w+) as any\)\.(\w+)/g, '(($1.$2) as any).$3');
    return content;
  },
  
  'src/store/slices/foldersSlice.ts': (content) => {
    // Fix property access patterns
    content = content.replace(/(\w+)\.\((\w+) as any\)\.(\w+)/g, '(($1.$2) as any).$3');
    return content;
  }
};

// Apply fixes
Object.entries(fixes).forEach(([file, fix]) => {
  const filePath = path.join(process.cwd(), file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = fix(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});

console.log('\nDone fixing remaining syntax errors');
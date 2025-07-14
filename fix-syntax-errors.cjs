const fs = require('fs');
const path = require('path');

// Fix syntax errors in specific files
const syntaxFixes = {
  'src/App.tsx': (content) => {
    // Fix patterns like (state.(ui as any).someProperty)
    content = content.replace(/state\.\((\w+) as any\)\.(\w+)/g, '(state.$1 as any).$2');
    return content;
  },
  
  'src/components/accounts/AccountCard.tsx': (content) => {
    content = content.replace(/dispatch\.\((\w+) as any\)/g, 'dispatch($1 as any)');
    return content;
  },
  
  'src/components/accounts/DeleteAccountDialog.tsx': (content) => {
    content = content.replace(/state\.\(ui as any\)\.modal/g, '(state.ui as any).modal');
    return content;
  },
  
  'src/hooks/useAccounts.ts': (content) => {
    content = content.replace(/dispatch\.\((\w+)\(([^)]*)\) as any\)/g, 'dispatch($1($2) as any)');
    return content;
  },
  
  'src/main.tsx': (content) => {
    content = content.replace(/import\.\((['"`][^'"`]+['"`]) as any\)/g, '(import($1) as any)');
    return content;
  },
  
  'src/services/admin-user-management.service.ts': (content) => {
    content = content.replace(/\((\w+) as any\)\.(\w+)\.(\w+)/g, '($1 as any).$2.$3');
    return content;
  },
  
  'src/services/admob.service.ts': (content) => {
    content = content.replace(/\((\w+) as any\)\.(\w+)\.(\w+)/g, '($1 as any).$2.$3');
    content = content.replace(/\(window as any\)\.AdMob/g, '((window as any).AdMob)');
    return content;
  },
  
  'src/services/auth.service.ts': (content) => {
    content = content.replace(/\((\w+) as any\)\.(\w+)\.(\w+)/g, '($1 as any).$2.$3');
    return content;
  },
  
  'src/services/backup.service.ts': (content) => {
    content = content.replace(/\((\w+) as any\)\.(\w+)\.(\w+)/g, '($1 as any).$2.$3');
    return content;
  },
  
  'src/services/browser-extension.service.ts': (content) => {
    content = content.replace(/\((\w+) as any\)\.(\w+)\.(\w+)/g, '($1 as any).$2.$3');
    return content;
  },
  
  'src/services/compliance/gdpr-compliance.service.ts': (content) => {
    content = content.replace(/\((\w+) as any\)\.(\w+)\.(\w+)/g, '($1 as any).$2.$3');
    return content;
  },
  
  'src/services/data-migration.service.ts': (content) => {
    content = content.replace(/\((\w+) as any\)\.(\w+)\.(\w+)/g, '($1 as any).$2.$3');
    return content;
  },
  
  'src/services/google-drive-backup.service.ts': (content) => {
    content = content.replace(/\((\w+) as any\)\.(\w+)\.(\w+)/g, '($1 as any).$2.$3');
    return content;
  },
  
  'src/services/googleDrive.service.ts': (content) => {
    content = content.replace(/\((\w+) as any\)\.(\w+)\.(\w+)/g, '($1 as any).$2.$3');
    return content;
  },
  
  'src/services/receipt-validation.service.ts': (content) => {
    content = content.replace(/\((\w+) as any\)\.(\w+)\.(\w+)/g, '($1 as any).$2.$3');
    return content;
  },
  
  'src/services/subscription.service.ts': (content) => {
    content = content.replace(/\((\w+) as any\)\.(\w+)\.(\w+)/g, '($1 as any).$2.$3');
    return content;
  },
  
  'src/store/slices/foldersSlice.ts': (content) => {
    content = content.replace(/\((\w+) as any\)\.(\w+)\.(\w+)/g, '($1 as any).$2.$3');
    return content;
  }
};

// Apply fixes
Object.entries(syntaxFixes).forEach(([file, fix]) => {
  const filePath = path.join(process.cwd(), file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = fix(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed syntax in: ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});

console.log('\nDone fixing syntax errors');
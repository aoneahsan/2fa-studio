#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixFile(filePath, fixes) {
  console.log(`Fixing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  fixes.forEach(fix => {
    const before = content;
    if (fix.type === 'replace') {
      content = content.replace(fix.search, fix.replace);
    } else if (fix.type === 'replaceAll') {
      const regex = fix.regex ? fix.search : new RegExp(fix.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      content = content.replace(regex, fix.replace);
    }
    if (content !== before) modified = true;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✓ Fixed ${filePath}`);
  } else {
    console.log(`  - No changes needed for ${filePath}`);
  }
}

// Fix UpdateSubscriptionModal.tsx
fixFile(path.join(__dirname, 'src/components/admin/UpdateSubscriptionModal.tsx'), [
  {
    type: 'replace',
    search: 'const handleSubmit = async () => {',
    replace: 'const handleSubmit = async (e: React.FormEvent) => {'
  },
  {
    type: 'replace',
    search: 'if (!reason.trim()) {\n    e.preventDefault();',
    replace: 'if (!reason.trim()) {\n    e.preventDefault();'
  },
  {
    type: 'replace',
    search: "dispatch(addToast('Please provide a reason for the update'))",
    replace: "dispatch(addToast({ type: 'error', message: 'Please provide a reason for the update' }) as any)"
  },
  {
    type: 'replace',
    search: "dispatch(addToast('Subscription updated successfully'))",
    replace: "dispatch(addToast({ type: 'success', message: 'Subscription updated successfully' }) as any)"
  },
  {
    type: 'replace',
    search: "dispatch(addToast('Failed to update subscription'))",
    replace: "dispatch(addToast({ type: 'error', message: 'Failed to update subscription' }) as any)"
  }
]);

// Fix BackupScheduler.tsx
fixFile(path.join(__dirname, 'src/components/backup/BackupScheduler.tsx'), [
  {
    type: 'replaceAll',
    search: '<button className="btn"',
    replace: '<button className="btn btn-primary"'
  },
  {
    type: 'replaceAll',
    search: 'variant=',
    replace: 'data-variant='
  },
  {
    type: 'replaceAll',
    search: 'size=',
    replace: 'data-size='
  },
  {
    type: 'replace',
    search: '<div className="modal"',
    replace: '<div className={`modal ${isOpen ? "modal-open" : ""}`}'
  },
  {
    type: 'replaceAll',
    search: 'isOpen=',
    replace: 'data-open='
  },
  {
    type: 'replaceAll',
    search: 'onClose=',
    replace: 'data-close='
  }
]);

// Fix ToastContainer.tsx
fixFile(path.join(__dirname, 'src/components/common/ToastContainer.tsx'), [
  {
    type: 'replace',
    search: 'const getToastClass = (toast) => {',
    replace: 'const getToastClass = (toast: any) => {'
  },
  {
    type: 'replace',
    search: 'const getIcon = (toast) => {',
    replace: 'const getIcon = (toast: any) => {'
  }
]);

// Fix PrivacyDashboard.tsx
fixFile(path.join(__dirname, 'src/components/compliance/PrivacyDashboard.tsx'), [
  {
    type: 'replaceAll',
    search: 'dataItem.date',
    replace: '(dataItem.date || "")'
  },
  {
    type: 'replace',
    search: '...personalData,',
    replace: '...(personalData || {}),'
  },
  {
    type: 'replace',
    search: 'const exportCSV = () => {',
    replace: 'const exportCSV = (e?: React.MouseEvent) => {'
  }
]);

// Fix FolderManager.tsx
fixFile(path.join(__dirname, 'src/components/folders/FolderManager.tsx'), [
  {
    type: 'replace',
    search: 'folders.map((folder) => {',
    replace: 'folders.map((folder: any) => {'
  },
  {
    type: 'replace',
    search: 'const folderItem = (folder) => (',
    replace: 'const folderItem = (folder: any) => ('
  }
]);

// Fix FolderTree.tsx
fixFile(path.join(__dirname, 'src/components/folders/FolderTree.tsx'), [
  {
    type: 'replace',
    search: 'const handleDragEnd = () => {',
    replace: 'const handleDragEnd = (e: DragEvent) => {'
  }
]);

// Fix AppearanceSettings.tsx
fixFile(path.join(__dirname, 'src/components/settings/AppearanceSettings.tsx'), [
  {
    type: 'replace',
    search: 'const handleSettingChange = (setting: keyof UserSettings) => () => {',
    replace: 'const handleSettingChange = (setting: keyof UserSettings) => (e: any) => {'
  }
]);

// Fix InstallBanner.tsx
fixFile(path.join(__dirname, 'src/components/common/InstallBanner.tsx'), [
  {
    type: 'replace',
    search: 'setDeferredPrompt(e);',
    replace: 'setDeferredPrompt(e as any);'
  },
  {
    type: 'replace',
    search: 'deferredPrompt.prompt();',
    replace: '(deferredPrompt as any).prompt();'
  },
  {
    type: 'replace',
    search: 'const handleInstall = async () => {',
    replace: 'const handleInstall = async (e?: React.MouseEvent) => {'
  }
]);

console.log('\nFixing specific remaining errors...\n');

// Manual fixes for complex patterns
const filesToFix = [
  {
    file: 'src/components/accounts/AddAccountModal.tsx',
    search: 'const handleFileUpload = async (e) => {',
    replace: 'const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {'
  },
  {
    file: 'src/components/accounts/AddAccountModal.tsx',
    search: 'algorithm: (account as any).algorithm,',
    replace: 'algorithm: ((account as any).algorithm || "SHA1") as "SHA1" | "SHA256" | "SHA512",'
  },
  {
    file: 'src/components/accounts/AdvancedSearch.tsx',
    search: 'onChange={handleChange(\'searchIn\')}',
    replace: 'onChange={(e) => handleChange(\'searchIn\')(e)}'
  },
  {
    file: 'src/components/accounts/AdvancedSearch.tsx',
    search: 'onChange={handleChange(\'regex\')}',
    replace: 'onChange={(e) => handleChange(\'regex\')(e)}'
  },
  {
    file: 'src/components/accounts/AdvancedSearch.tsx',
    search: 'onChange={handleChange(\'caseSensitive\')}',
    replace: 'onChange={(e) => handleChange(\'caseSensitive\')(e)}'
  },
  {
    file: 'src/components/accounts/EditAccountModal.tsx',
    search: 'onChange={handleFileUpload}',
    replace: 'onChange={(e) => handleFileUpload(e)}'
  },
  {
    file: 'src/components/accounts/EditAccountModal.tsx',
    search: 'const handleFileUpload = async () => {',
    replace: 'const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {'
  },
  {
    file: 'src/components/accounts/ImportAccountsModal.tsx',
    search: 'const handleFileSelect = async () => {',
    replace: 'const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {'
  },
  {
    file: 'src/components/accounts/ImportAccountsModal.tsx',
    search: 'onChange={handleFileSelect}',
    replace: 'onChange={(e) => handleFileSelect(e)}'
  }
];

filesToFix.forEach(({ file, search, replace }) => {
  const filePath = path.join(__dirname, file);
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(search)) {
      content = content.replace(search, replace);
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed ${file}`);
    }
  } catch (err) {
    console.log(`✗ Error fixing ${file}: ${err.message}`);
  }
});

console.log('\nDone!');
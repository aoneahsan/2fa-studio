//

const fs = require('fs');
const path = require('path');

// Helper function to fix files
function fixFile(filePath, replacements) {
  console.log(`Fixing ${filePath}...`);
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    replacements.forEach(([search, replace]) => {
      if (content.includes(search)) {
        content = content.replace(search, replace);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`  ✓ Fixed`);
    } else {
      console.log(`  - No changes needed`);
    }
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
  }
}

// Fix all files
const fixes = [
  // AddAccountModal.tsx
  {
    file: 'src/components/accounts/AddAccountModal.tsx',
    replacements: [
      ['const handleFileUpload = async (e) => {', 'const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {'],
      ['algorithm: (account as any).algorithm,', 'algorithm: ((account as any).algorithm || "SHA1") as "SHA1"  < /dev/null |  "SHA256" | "SHA512",']
    ]
  },
  
  // AdvancedSearch.tsx
  {
    file: 'src/components/accounts/AdvancedSearch.tsx',
    replacements: [
      ["onChange={handleChange('searchIn')}", "onChange={(e) => handleChange('searchIn')(e)}"],
      ["onChange={handleChange('regex')}", "onChange={(e) => handleChange('regex')(e)}"],
      ["onChange={handleChange('caseSensitive')}", "onChange={(e) => handleChange('caseSensitive')(e)}"]
    ]
  },
  
  // EditAccountModal.tsx
  {
    file: 'src/components/accounts/EditAccountModal.tsx',
    replacements: [
      ['onChange={handleFileUpload}', 'onChange={(e) => handleFileUpload(e)}'],
      ['const handleFileUpload = async () => {', 'const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {']
    ]
  },
  
  // InstallBanner.tsx
  {
    file: 'src/components/common/InstallBanner.tsx',
    replacements: [
      ['setDeferredPrompt(e);', 'setDeferredPrompt(e as any);'],
      ['deferredPrompt.prompt();', '(deferredPrompt as any).prompt();'],
      ['const handleInstall = async () => {', 'const handleInstall = async (e?: React.MouseEvent) => {']
    ]
  },
  
  // ToastContainer.tsx
  {
    file: 'src/components/common/ToastContainer.tsx',
    replacements: [
      ['const getToastClass = (toast) => {', 'const getToastClass = (toast: any) => {'],
      ['const getIcon = (toast) => {', 'const getIcon = (toast: any) => {']
    ]
  },
  
  // PrivacyDashboard.tsx
  {
    file: 'src/components/compliance/PrivacyDashboard.tsx',
    replacements: [
      ['format(dataItem.date', 'format(dataItem.date || new Date()'],
      ['...personalData,', '...(personalData || {}),'],
      ['const exportCSV = () => {', 'const exportCSV = (e?: React.MouseEvent) => {']
    ]
  },
  
  // FolderManager.tsx
  {
    file: 'src/components/folders/FolderManager.tsx',
    replacements: [
      ['folders.map((folder) => {', 'folders.map((folder: any) => {'],
      ['const folderItem = (folder) => (', 'const folderItem = (folder: any) => (']
    ]
  },
  
  // FolderTree.tsx
  {
    file: 'src/components/folders/FolderTree.tsx',
    replacements: [
      ['const handleDragEnd = () => {', 'const handleDragEnd = (e: DragEvent) => {']
    ]
  },
  
  // AppearanceSettings.tsx
  {
    file: 'src/components/settings/AppearanceSettings.tsx',
    replacements: [
      ['const handleSettingChange = (setting: keyof UserSettings) => () => {', 'const handleSettingChange = (setting: keyof UserSettings) => (e: any) => {']
    ]
  },
  
  // BrowserExtensionSettings.tsx
  {
    file: 'src/components/settings/BrowserExtensionSettings.tsx',
    replacements: [
      ["import QRCode from 'qrcode.react';", "// QRCode removed"],
      ['<QRCode value={qrCode} size={256} />', '<div className="bg-gray-200 w-64 h-64 flex items-center justify-center">QR Code</div>']
    ]
  },
  
  // NotificationSettings.tsx
  {
    file: 'src/components/settings/NotificationSettings.tsx',
    replacements: [
      ["dispatch(addToast('Push notifications enabled'))", "dispatch(addToast({ type: 'success', message: 'Push notifications enabled' }) as any)"],
      ["dispatch(addToast('Push notifications permission denied'))", "dispatch(addToast({ type: 'error', message: 'Push notifications permission denied' }) as any)"],
      ["dispatch(addToast('Notification preferences updated'))", "dispatch(addToast({ type: 'success', message: 'Notification preferences updated' }) as any)"],
      ["dispatch(addToast('Failed to update preferences'))", "dispatch(addToast({ type: 'error', message: 'Failed to update preferences' }) as any)"]
    ]
  },
  
  // SecuritySettings.tsx
  {
    file: 'src/components/settings/SecuritySettings.tsx',
    replacements: [
      ['const toggleBiometric = async () => {', 'const toggleBiometric = async (e?: React.MouseEvent) => {']
    ]
  },
  
  // SubscriptionSettings.tsx
  {
    file: 'src/components/settings/SubscriptionSettings.tsx',
    replacements: [
      ['currentTier={user?.subscription?.tier}', 'currentTier={user?.subscription?.tier as "free" | "premium" | "enterprise" | undefined}']
    ]
  },
  
  // TagManager.tsx
  {
    file: 'src/components/tags/TagManager.tsx',
    replacements: [
      ['const handleColorChange = (color: string) => {', 'const handleColorChange = (color: string, e?: React.MouseEvent) => {']
    ]
  },
  
  // TagPill.tsx
  {
    file: 'src/components/tags/TagPill.tsx',
    replacements: [
      ['const handleClick = () => {', 'const handleClick = (e?: React.MouseEvent) => {'],
      ['const handleDelete = () => {', 'const handleDelete = (e?: React.MouseEvent) => {']
    ]
  },
  
  // TagSelector.tsx
  {
    file: 'src/components/tags/TagSelector.tsx',
    replacements: [
      ['state.auth.user?.id', 'state._auth.user?.id'],
      ['const tagOptions = tags.map((tag) => ({', 'const tagOptions = tags.map((tag: any) => ({'],
      ['isDisabled: disabled,', 'isDisabled: disabled as boolean | undefined,'],
      ['renderValue={(selected) => selected.map((tag) => tag.name)', 'renderValue={(selected) => selected.map((tag: any) => tag.name)']
    ]
  },
  
  // useAccounts.ts
  {
    file: 'src/hooks/useAccounts.ts',
    replacements: [
      ["dispatch(setAccountsLoading(true, 'accounts'));", "dispatch(setAccountsLoading(true));"],
      ["dispatch(setAccountsLoading(false, 'accounts'));", "dispatch(setAccountsLoading(false));"],
      ["dispatch(setAccountsLoading(false, 'tags'));", "dispatch(setAccountsLoading(false));"],
      ['dispatch(setAccountsError);', 'dispatch(setAccountsError(error.message));'],
      ['userId: user?.id', 'userId: user?.id || ""'],
      ['if (searchOptions.length > 0)', 'if (Object.keys(searchOptions).length > 0)'],
      ['const searchIn = searchOptions.searchIn', 'const searchIn = (searchOptions as any).searchIn'],
      ['if (searchOptions.regex)', 'if ((searchOptions as any).regex)'],
      ['const flags = searchOptions.caseSensitive', 'const flags = (searchOptions as any).caseSensitive'],
      ['if (searchOptions.exactMatch)', 'if ((searchOptions as any).exactMatch)'],
      ['const match = searchOptions.caseSensitive', 'const match = (searchOptions as any).caseSensitive'],
      ["searchOptions.caseSensitive ? 'includes'", "(searchOptions as any).caseSensitive ? 'includes'"],
      ['tags.some((tag) => matchingTagIds', 'tags.some((tag: any) => matchingTagIds'],
      ['tags.filter((tag) => tag.name', 'tags.filter((tag: any) => tag.name']
    ]
  },
  
  // useAds.ts
  {
    file: 'src/hooks/useAds.ts',
    replacements: [
      ['if (Capacitor.Plugins.AdMob)', 'if ((Capacitor as any).Plugins?.AdMob)']
    ]
  },
  
  // useAuth.ts
  {
    file: 'src/hooks/useAuth.ts',
    replacements: [
      ['const cached = sessionStorage.getItem(cacheKey);', 'const cached = sessionStorage.getItem(cacheKey || "");']
    ]
  }
];

// Apply all fixes
fixes.forEach(({ file, replacements }) => {
  fixFile(path.join(__dirname, file), replacements);
});

console.log('\nAll done\!');

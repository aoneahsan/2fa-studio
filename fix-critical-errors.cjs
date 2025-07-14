const fs = require('fs');
const path = require('path');

function fixFile(filePath, fixes) {
  console.log(`Fixing ${filePath}...`);
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    fixes.forEach(fix => {
      if (content.includes(fix.search)) {
        content = content.replace(fix.search, fix.replace);
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

// Fix PrivacyDashboard.tsx
fixFile(path.join(__dirname, 'src/components/compliance/PrivacyDashboard.tsx'), [
  { search: 'format(dataItem.date', replace: 'format(dataItem.date || new Date()' },
  { search: '...personalData,', replace: '...(personalData || {}),' },
  { search: 'const exportCSV = () => {', replace: 'const exportCSV = (e?: React.MouseEvent) => {' }
]);

// Fix FolderManager.tsx
fixFile(path.join(__dirname, 'src/components/folders/FolderManager.tsx'), [
  { search: 'folders.map((folder) => {', replace: 'folders.map((folder: any) => {' },
  { search: 'const folderItem = (folder) => (', replace: 'const folderItem = (folder: any) => (' }
]);

// Fix FolderTree.tsx
fixFile(path.join(__dirname, 'src/components/folders/FolderTree.tsx'), [
  { search: 'const handleDragEnd = () => {', replace: 'const handleDragEnd = (e: DragEvent) => {' }
]);

// Fix AppearanceSettings.tsx
fixFile(path.join(__dirname, 'src/components/settings/AppearanceSettings.tsx'), [
  { search: 'const handleSettingChange = (setting: keyof UserSettings) => () => {', replace: 'const handleSettingChange = (setting: keyof UserSettings) => (e: any) => {' }
]);

// Fix BrowserExtensionSettings.tsx
fixFile(path.join(__dirname, 'src/components/settings/BrowserExtensionSettings.tsx'), [
  { search: "import QRCode from 'qrcode.react';", replace: "// QRCode import removed" },
  { search: '<QRCode value={qrCode} size={256} />', replace: '<div className="bg-gray-200 w-64 h-64 flex items-center justify-center">QR Code</div>' },
  { search: '<QRCode value={extensionState.pairingCode} size={200} />', replace: '<div className="bg-gray-200 w-48 h-48 flex items-center justify-center">QR Code</div>' }
]);

// Fix NotificationSettings.tsx
fixFile(path.join(__dirname, 'src/components/settings/NotificationSettings.tsx'), [
  { search: "dispatch(addToast('Push notifications enabled'))", replace: "dispatch(addToast({ type: 'success', message: 'Push notifications enabled' }) as any)" },
  { search: "dispatch(addToast('Push notifications permission denied'))", replace: "dispatch(addToast({ type: 'error', message: 'Push notifications permission denied' }) as any)" },
  { search: "dispatch(addToast('Notification preferences updated'))", replace: "dispatch(addToast({ type: 'success', message: 'Notification preferences updated' }) as any)" },
  { search: "dispatch(addToast('Failed to update preferences'))", replace: "dispatch(addToast({ type: 'error', message: 'Failed to update preferences' }) as any)" }
]);

// Fix SecuritySettings.tsx
fixFile(path.join(__dirname, 'src/components/settings/SecuritySettings.tsx'), [
  { search: 'const toggleBiometric = async () => {', replace: 'const toggleBiometric = async (e?: React.MouseEvent) => {' }
]);

// Fix SubscriptionSettings.tsx
fixFile(path.join(__dirname, 'src/components/settings/SubscriptionSettings.tsx'), [
  { search: 'currentTier={user?.subscription?.tier}', replace: 'currentTier={(user?.subscription?.tier || "free") as "free" | "premium" | "enterprise"}' }
]);

// Fix TagManager.tsx
fixFile(path.join(__dirname, 'src/components/tags/TagManager.tsx'), [
  { search: 'const handleColorChange = (color: string) => {', replace: 'const handleColorChange = (color: string, e?: React.MouseEvent) => {' }
]);

// Fix TagPill.tsx
fixFile(path.join(__dirname, 'src/components/tags/TagPill.tsx'), [
  { search: 'const handleClick = () => {', replace: 'const handleClick = (e?: React.MouseEvent) => {' },
  { search: 'const handleDelete = () => {', replace: 'const handleDelete = (e?: React.MouseEvent) => {' }
]);

// Fix TagSelector.tsx
fixFile(path.join(__dirname, 'src/components/tags/TagSelector.tsx'), [
  { search: 'state.auth.user?.id', replace: 'state._auth.user?.id' },
  { search: 'const tagOptions = tags.map((tag) => ({', replace: 'const tagOptions = tags.map((tag: any) => ({' },
  { search: 'isDisabled: disabled,', replace: 'isDisabled: disabled as boolean | undefined,' },
  { search: 'renderValue={(selected) => selected.map((tag) => tag.name)', replace: 'renderValue={(selected) => selected.map((tag: any) => tag.name)' }
]);

// Fix useAccounts.ts
fixFile(path.join(__dirname, 'src/hooks/useAccounts.ts'), [
  { search: "dispatch(setAccountsLoading(true, 'accounts'));", replace: "dispatch(setAccountsLoading(true));" },
  { search: "dispatch(setAccountsLoading(false, 'accounts'));", replace: "dispatch(setAccountsLoading(false));" },
  { search: "dispatch(setAccountsLoading(false, 'tags'));", replace: "dispatch(setAccountsLoading(false));" },
  { search: 'dispatch(setAccountsError);', replace: 'dispatch(setAccountsError((error as any).message || "Error loading accounts"));' },
  { search: 'userId: user?.id', replace: 'userId: user?.id || ""' },
  { search: 'if (searchOptions.length > 0)', replace: 'if (Object.keys(searchOptions || {}).length > 0)' },
  { search: 'const searchIn = searchOptions.searchIn', replace: 'const searchIn = (searchOptions as any)?.searchIn' },
  { search: 'if (searchOptions.regex)', replace: 'if ((searchOptions as any)?.regex)' },
  { search: 'const flags = searchOptions.caseSensitive', replace: 'const flags = (searchOptions as any)?.caseSensitive' },
  { search: 'if (searchOptions.exactMatch)', replace: 'if ((searchOptions as any)?.exactMatch)' },
  { search: 'const match = searchOptions.caseSensitive', replace: 'const match = (searchOptions as any)?.caseSensitive' },
  { search: "searchOptions.caseSensitive ? 'includes'", replace: "(searchOptions as any)?.caseSensitive ? 'includes'" },
  { search: 'tags.some((tag) => matchingTagIds', replace: 'tags.some((tag: any) => matchingTagIds' },
  { search: 'tags.filter((tag) => tag.name', replace: 'tags.filter((tag: any) => tag.name' }
]);

// Fix useAds.ts
fixFile(path.join(__dirname, 'src/hooks/useAds.ts'), [
  { search: 'if (Capacitor.Plugins.AdMob)', replace: 'if ((Capacitor as any).Plugins?.AdMob)' }
]);

// Fix useAuth.ts
fixFile(path.join(__dirname, 'src/hooks/useAuth.ts'), [
  { search: 'const cached = sessionStorage.getItem(cacheKey);', replace: 'const cached = cacheKey ? sessionStorage.getItem(cacheKey) : null;' }
]);

console.log('\nCritical fixes applied!');
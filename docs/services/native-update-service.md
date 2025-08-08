# Native Update Service

## Overview

The `NativeUpdateService` provides over-the-air (OTA) update functionality using the `capacitor-native-update` package (v2.0.0). It enables apps to update without going through app stores.

## Features

- ✅ OTA updates for web assets
- ✅ Version checking
- ✅ Background downloads
- ✅ Rollback support
- ✅ Update progress tracking
- ✅ Flexible update strategies

## API Reference

### Initialization

```typescript
import { NativeUpdateService } from '@services/native-update.service';

// Initialize service
await NativeUpdateService.initialize({
  updateUrl: 'https://api.2fastudio.com/updates',
  currentVersion: APP_VERSION,
  checkOnAppStart: true,
  autoDownload: false
});
```

### Check for Updates

```typescript
// Check for updates
const updateInfo = await NativeUpdateService.checkForUpdate();

if (updateInfo?.updateAvailable) {
  console.log(`Version ${updateInfo.version} available`);
}
```

### Download and Install

```typescript
// Download update
await NativeUpdateService.downloadUpdate();

// Get download progress
NativeUpdateService.onDownloadProgress((progress) => {
  console.log(`Downloaded: ${progress.percent}%`);
});

// Install update
await NativeUpdateService.installUpdate();
```

## Usage Examples

### Auto Update Hook

```typescript
import { useAutoUpdate } from '@hooks/useAutoUpdate';

export function App() {
  const { updateAvailable, downloadUpdate } = useAutoUpdate({
    checkInterval: 6 * 60 * 60 * 1000, // 6 hours
    autoDownload: false
  });
  
  if (updateAvailable) {
    return <UpdatePrompt onUpdate={downloadUpdate} />;
  }
}
```

## Best Practices

1. **Test updates** thoroughly before release
2. **Implement rollback** for critical issues
3. **Show progress** during downloads
4. **Check battery** before auto-download
5. **Respect user preferences** for auto-updates
# Notification Kit Service

## Overview

The `NotificationKitService` provides push and local notification functionality using the `notification-kit` package (v2.0.3). It replaces OneSignal with a more flexible notification system.

## Features

- ✅ Push notifications
- ✅ Local notifications
- ✅ Quiet hours support
- ✅ Notification categories
- ✅ Rich notifications with actions
- ✅ Badge management
- ✅ Sound customization

## API Reference

### Initialization

```typescript
import { NotificationKitService } from '@services/notification-kit.service';

// Initialize service
await NotificationKitService.initialize({
  defaultIcon: 'notification_icon',
  defaultColor: '#1976d2',
  channelId: '2fa_studio_notifications',
  channelName: '2FA Studio'
});
```

### Push Notifications

```typescript
// Request permission
const granted = await NotificationKitService.requestPermission();

// Get FCM token
const token = await NotificationKitService.getToken();

// Handle token refresh
NotificationKitService.onTokenRefresh((newToken) => {
  updateServerToken(newToken);
});
```

### Local Notifications

```typescript
// Schedule notification
await NotificationKitService.scheduleNotification({
  title: 'Backup Reminder',
  body: 'Time to backup your 2FA accounts',
  id: 1,
  schedule: {
    at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    repeats: true
  }
});

// Show immediate notification
await NotificationKitService.showNotification({
  title: 'New Login',
  body: 'New device logged into your account',
  data: { type: 'security_alert' }
});
```

### Quiet Hours

```typescript
// Set quiet hours
await NotificationKitService.setQuietHours({
  enabled: true,
  startTime: '22:00',
  endTime: '08:00',
  allowCritical: true
});

// Check if in quiet hours
const inQuietHours = await NotificationKitService.isInQuietHours();
```

## Usage Examples

### Basic Setup

```typescript
export async function setupNotifications() {
  // Initialize
  await NotificationKitService.initialize();
  
  // Request permission
  const granted = await NotificationKitService.requestPermission();
  
  if (granted) {
    // Get token for server
    const token = await NotificationKitService.getToken();
    await sendTokenToServer(token);
    
    // Listen for messages
    NotificationKitService.addMessageListener((message) => {
      handleNotificationMessage(message);
    });
  }
}
```

### Backup Reminders

```typescript
export async function scheduleBackupReminder() {
  const settings = await getBackupSettings();
  
  if (settings.reminderEnabled) {
    await NotificationKitService.scheduleNotification({
      id: BACKUP_REMINDER_ID,
      title: 'Backup Your Accounts',
      body: `${settings.accountCount} accounts need backing up`,
      schedule: {
        every: 'week',
        on: { hour: 10, minute: 0 }
      },
      actionTypeId: 'BACKUP_ACTIONS',
      extra: {
        type: 'backup_reminder',
        accountCount: settings.accountCount
      }
    });
  }
}
```

## Best Practices

1. **Request permission** at the right time
2. **Handle token refresh** for server updates
3. **Respect quiet hours** for non-critical notifications
4. **Use categories** for different notification types
5. **Test on real devices** for accurate behavior
# 2FA Studio Chrome Extension

Secure 2FA authenticator browser extension that integrates seamlessly with your favorite websites.

## Features

- 🔐 **Auto-fill 2FA codes** - Automatically detect and fill 2FA code fields
- 📋 **One-click copy** - Copy codes to clipboard with a single click
- 🔍 **Smart detection** - Automatically detects 2FA input fields on websites
- 🌐 **Universal support** - Works with all websites that use standard TOTP/HOTP
- 🎨 **Dark mode** - Follows your system theme preference
- 🔒 **Secure** - All data is encrypted locally

## Installation

### From Chrome Web Store
1. Visit the [2FA Studio extension page](#) on Chrome Web Store
2. Click "Add to Chrome"
3. Follow the prompts to complete installation

### Manual Installation (Development)
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `chrome-extension` directory
5. The extension will be installed and ready to use

## Usage

### Adding Accounts
1. Click the 2FA Studio icon in your browser toolbar
2. Click "Add Account" or the "+" button
3. Scan QR code or enter details manually
4. Your account will be saved securely

### Auto-filling Codes
1. Navigate to any website requiring 2FA
2. The extension will automatically detect 2FA fields
3. Click the blue shield icon in the input field
4. The code will be filled automatically

### Manual Code Entry
1. Click the extension icon
2. Search or scroll to find your account
3. Click on the account to copy the code
4. Paste into the 2FA field

## Keyboard Shortcuts

- `Ctrl+Shift+L` (Windows/Linux) or `Cmd+Shift+L` (Mac) - Open extension popup
- `Escape` - Close popup
- `Enter` - Copy selected account code

## Security

- All account data is encrypted using AES-256-GCM
- Encryption keys never leave your device
- No data is sent to external servers
- Supports biometric authentication (when available)

## Permissions

The extension requires the following permissions:

- **Storage** - To save your encrypted accounts locally
- **Tabs** - To detect which website you're on
- **Active Tab** - To fill codes on the current page
- **Clipboard Write** - To copy codes to clipboard
- **Notifications** - To notify you when codes are copied

## Privacy

- No tracking or analytics
- No external connections
- All data stays on your device
- Open source and auditable

## Troubleshooting

### Extension not detecting 2FA fields
- Refresh the page after installing the extension
- Check if the website uses non-standard input fields
- Try clicking the "Fill 2FA Code" option from right-click menu

### Codes not syncing with mobile app
- Ensure you're logged into the same account
- Check sync settings in both extension and mobile app
- Verify internet connection

## Development

### Building from Source
```bash
# Install dependencies
cd chrome-extension
npm install

# Build extension
npm run build

# Watch for changes
npm run dev
```

### Testing
```bash
# Run tests
npm test

# Run linter
npm run lint
```

## Support

- 📧 Email: support@2fastudio.app
- 🐛 Report bugs: [GitHub Issues](#)
- 💬 Community: [Discord](#)

## License

MIT License - see LICENSE file for details
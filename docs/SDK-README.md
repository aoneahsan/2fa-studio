# 2FA Studio SDK Documentation

## Overview

The 2FA Studio SDK allows developers to integrate two-factor authentication capabilities into their applications using the 2FA Studio service.

## Installation

```bash
npm install @2fa-studio/sdk
# or
yarn add @2fa-studio/sdk
```

## Quick Start

```typescript
import TwoFAStudioSDK from '@2fa-studio/sdk';

// Initialize the SDK
const sdk = new TwoFAStudioSDK({
  apiKey: 'your-api-key-here'
});

// Generate a code
const response = await sdk.generateCode({
  accountId: 'account-123'
});

console.log(response.code); // "123456"
```

## API Reference

### Constructor

```typescript
new TwoFAStudioSDK(config: TwoFAStudioConfig)
```

#### Config Options

- `apiKey` (required): Your 2FA Studio API key
- `apiUrl` (optional): Custom API endpoint (default: `https://api.2fastudio.app/v1`)
- `timeout` (optional): Request timeout in milliseconds (default: 30000)

### Methods

#### generateCode

Generate a TOTP/HOTP code for a specific account.

```typescript
sdk.generateCode(request: GenerateCodeRequest): Promise<GenerateCodeResponse>
```

**Request:**
- `accountId`: The ID of the account to generate a code for
- `timestamp` (optional): Custom timestamp for code generation

**Response:**
- `code`: The generated OTP code
- `expiresAt`: Unix timestamp when the code expires
- `remainingSeconds`: Seconds remaining until code expires

#### listAccounts

Get a list of all accounts associated with the API key.

```typescript
sdk.listAccounts(): Promise<Account[]>
```

**Response:**
Array of account objects containing:
- `id`: Account ID
- `issuer`: Service provider name
- `label`: Account label/username

#### getAccount

Get details for a specific account.

```typescript
sdk.getAccount(accountId: string): Promise<Account>
```

## Error Handling

The SDK throws errors for various failure scenarios:

```typescript
try {
  const response = await sdk.generateCode({ accountId: 'invalid' });
} catch (error) {
  if (error.message.includes('404')) {
    console.error('Account not found');
  } else if (error.message.includes('401')) {
    console.error('Invalid API key');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Rate Limits

- Generate Code: 60 requests per minute per account
- List Accounts: 100 requests per minute
- Get Account: 300 requests per minute

## Security Best Practices

1. **Never expose your API key in client-side code**
2. **Use environment variables to store sensitive data**
3. **Implement proper error handling**
4. **Monitor API usage for suspicious activity**

## Examples

### Web Application Integration

```typescript
// server.js
import express from 'express';
import TwoFAStudioSDK from '@2fa-studio/sdk';

const app = express();
const sdk = new TwoFAStudioSDK({
  apiKey: process.env.TWO_FA_STUDIO_API_KEY
});

app.post('/api/generate-code', async (req, res) => {
  try {
    const { accountId } = req.body;
    const response = await sdk.generateCode({ accountId });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate code' });
  }
});
```

### CLI Tool Integration

```typescript
#!/usr/bin/env node
import TwoFAStudioSDK from '@2fa-studio/sdk';

const sdk = new TwoFAStudioSDK({
  apiKey: process.env.TWO_FA_STUDIO_API_KEY
});

async function getCode(accountId: string) {
  try {
    const response = await sdk.generateCode({ accountId });
    console.log(`Code: ${response.code}`);
    console.log(`Expires in: ${response.remainingSeconds}s`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

const accountId = process.argv[2];
if (!accountId) {
  console.error('Usage: 2fa-code <account-id>');
  process.exit(1);
}

getCode(accountId);
```

## Support

- Documentation: https://docs.2fastudio.app
- API Status: https://status.2fastudio.app
- Support Email: support@2fastudio.app
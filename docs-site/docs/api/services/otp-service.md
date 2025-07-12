---
sidebar_position: 3
---

# OTPService

Service for generating and managing One-Time Passwords (OTP) supporting both TOTP and HOTP algorithms.

## Overview

The `OTPService` handles all OTP-related operations including code generation, validation, URI parsing, and secret management. It supports the standard TOTP (Time-based) and HOTP (Counter-based) algorithms.

```typescript
import { OTPService } from '@/services/otp.service';
```

## Methods

### generateTOTP

Generates a Time-based One-Time Password (TOTP) code.

```typescript
static generateTOTP(account: OTPAccount): OTPGenerationResult
```

**Parameters:**
- `account` - OTPAccount object with TOTP configuration

**Returns:**
- `OTPGenerationResult` containing:
  - `code` (string) - The 6-8 digit OTP code
  - `remainingTime` (number) - Seconds until code expires
  - `progress` (number) - Progress percentage (0-100)

**Example:**
```typescript
const result = OTPService.generateTOTP({
  issuer: 'Google',
  label: 'user@example.com',
  secret: 'JBSWY3DPEHPK3PXP',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  type: 'totp'
});

console.log(result);
// { code: '123456', remainingTime: 15, progress: 50 }
```

### generateHOTP

Generates a HMAC-based One-Time Password (HOTP) code.

```typescript
static generateHOTP(account: OTPAccount): OTPGenerationResult
```

**Parameters:**
- `account` - OTPAccount object with HOTP configuration (requires `counter`)

**Returns:**
- `OTPGenerationResult` containing:
  - `code` (string) - The generated OTP code

**Throws:**
- Error if counter is not provided

**Example:**
```typescript
const result = OTPService.generateHOTP({
  issuer: 'Example',
  label: 'user@example.com',
  secret: 'JBSWY3DPEHPK3PXP',
  algorithm: 'SHA1',
  digits: 6,
  type: 'hotp',
  counter: 5
});

console.log(result.code); // '654321'
```

### generateCode

Generates an OTP code based on account type (TOTP or HOTP).

```typescript
static generateCode(account: OTPAccount): OTPGenerationResult
```

**Parameters:**
- `account` - OTPAccount object

**Returns:**
- `OTPGenerationResult` with appropriate fields based on type

**Example:**
```typescript
// Automatically calls generateTOTP or generateHOTP
const result = OTPService.generateCode(account);
```

### parseURI

Parses an OTP URI (otpauth://) into account data.

```typescript
static parseURI(uri: string): Partial<OTPAccount>
```

**Parameters:**
- `uri` - OTP URI string (e.g., `otpauth://totp/Example:user@example.com?secret=...`)

**Returns:**
- Partial OTPAccount object with parsed data

**Throws:**
- Error "Invalid OTP URI" if parsing fails

**Example:**
```typescript
const uri = 'otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example';
const account = OTPService.parseURI(uri);

console.log(account);
// {
//   issuer: 'Example',
//   label: 'user@example.com',
//   secret: 'JBSWY3DPEHPK3PXP',
//   algorithm: 'SHA1',
//   digits: 6,
//   type: 'totp',
//   period: 30
// }
```

### generateURI

Generates an OTP URI for export/sharing.

```typescript
static generateURI(account: OTPAccount): string
```

**Parameters:**
- `account` - OTPAccount object

**Returns:**
- OTP URI string suitable for QR codes

**Example:**
```typescript
const uri = OTPService.generateURI({
  issuer: 'MyApp',
  label: 'user@example.com',
  secret: 'JBSWY3DPEHPK3PXP',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  type: 'totp'
});

console.log(uri);
// 'otpauth://totp/MyApp:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=MyApp&algorithm=SHA1&digits=6&period=30'
```

### validateTOTP

Validates a TOTP code against the current time window.

```typescript
static validateTOTP(account: OTPAccount, code: string, window: number = 1): boolean
```

**Parameters:**
- `account` - OTPAccount with TOTP configuration
- `code` - The code to validate
- `window` - Time window tolerance (default: 1 = ±30 seconds)

**Returns:**
- `boolean` - True if code is valid

**Example:**
```typescript
const isValid = OTPService.validateTOTP(account, '123456', 1);
if (isValid) {
  console.log('Code is valid!');
}
```

### validateHOTP

Validates a HOTP code within a counter window.

```typescript
static validateHOTP(account: OTPAccount, code: string, window: number = 10): number | null
```

**Parameters:**
- `account` - OTPAccount with HOTP configuration
- `code` - The code to validate
- `window` - Counter window to check (default: 10)

**Returns:**
- `number` - The counter value if valid, null if invalid

**Example:**
```typescript
const counter = OTPService.validateHOTP(account, '654321', 10);
if (counter !== null) {
  console.log(`Valid at counter: ${counter}`);
  // Update account counter to prevent replay
}
```

### generateSecret

Generates a cryptographically secure random secret.

```typescript
static generateSecret(length: number = 20): string
```

**Parameters:**
- `length` - Secret length in bytes (default: 20)

**Returns:**
- Base32 encoded secret string

**Example:**
```typescript
const secret = OTPService.generateSecret(16);
console.log(secret); // 'JBSWY3DPEHPK3PXPQWERTY'
```

### formatCode

Formats an OTP code for better readability.

```typescript
static formatCode(code: string): string
```

**Parameters:**
- `code` - The OTP code to format

**Returns:**
- Formatted code with space in the middle

**Example:**
```typescript
const formatted = OTPService.formatCode('123456');
console.log(formatted); // '123 456'
```

### getServiceIcon

Gets the icon URL for a service based on issuer name.

```typescript
static getServiceIcon(issuer: string): string
```

**Parameters:**
- `issuer` - The service/issuer name

**Returns:**
- URL to the service's favicon

**Example:**
```typescript
const iconUrl = OTPService.getServiceIcon('GitHub');
// Returns: 'https://www.google.com/s2/favicons?domain=github.com&sz=128'
```

### estimateSecretStrength

Estimates the cryptographic strength of a secret.

```typescript
static estimateSecretStrength(secret: string): {
  score: number;
  rating: 'weak' | 'fair' | 'good' | 'strong';
}
```

**Parameters:**
- `secret` - The secret to evaluate

**Returns:**
- Object containing:
  - `score` (number) - Strength score (0-100)
  - `rating` (string) - Human-readable strength rating

**Example:**
```typescript
const strength = OTPService.estimateSecretStrength('JBSWY3DPEHPK3PXP');
console.log(strength); // { score: 50, rating: 'good' }
```

## Types

### OTPAccount

```typescript
interface OTPAccount {
  id: string;
  issuer: string;           // Service name (e.g., 'Google')
  label: string;            // Account identifier (e.g., email)
  secret: string;           // Base32 encoded secret
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;           // Code length (6 or 8)
  period: number;           // TOTP period in seconds (usually 30)
  type: 'totp' | 'hotp';
  counter?: number;         // HOTP counter
  iconUrl?: string;         // Service icon URL
  tags?: string[];          // User-defined tags
  createdAt: Date;
  updatedAt: Date;
  backupCodes?: string[];   // Recovery codes
  notes?: string;           // User notes
}
```

### OTPGenerationResult

```typescript
interface OTPGenerationResult {
  code: string;             // The generated OTP code
  remainingTime?: number;   // Seconds until expiry (TOTP only)
  progress?: number;        // Progress percentage (TOTP only)
}
```

## Algorithm Support

### Supported Algorithms
- **SHA1** (Default) - Most compatible
- **SHA256** - More secure, less compatible
- **SHA512** - Most secure, limited compatibility

### Supported Parameters
- **Digits**: 6 (standard) or 8 (more secure)
- **Period**: 30 seconds (standard) or 60 seconds
- **Counter**: Any positive integer (HOTP only)

## Usage Examples

### Complete TOTP Implementation

```typescript
// Generate new account
const secret = OTPService.generateSecret();
const account: OTPAccount = {
  id: crypto.randomUUID(),
  issuer: 'MyService',
  label: 'user@example.com',
  secret: secret,
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  type: 'totp',
  createdAt: new Date(),
  updatedAt: new Date()
};

// Generate QR code URI
const uri = OTPService.generateURI(account);
// Display as QR code for user to scan

// Generate codes every second
setInterval(() => {
  const result = OTPService.generateTOTP(account);
  console.log(`Code: ${OTPService.formatCode(result.code)}`);
  console.log(`Expires in: ${result.remainingTime}s`);
}, 1000);

// Validate user input
const userCode = '123456';
if (OTPService.validateTOTP(account, userCode)) {
  console.log('Authentication successful!');
}
```

### HOTP with Counter Management

```typescript
let account: OTPAccount = {
  // ... other properties
  type: 'hotp',
  counter: 0
};

// Generate code
const result = OTPService.generateHOTP(account);
console.log(`Code: ${result.code}`);

// After successful use, increment counter
account.counter++;

// Validate with window
const validCounter = OTPService.validateHOTP(account, userCode, 10);
if (validCounter !== null) {
  // Sync counter to prevent desync
  account.counter = validCounter + 1;
}
```

## Security Considerations

1. **Secret Storage**: Always encrypt secrets before storage
2. **Time Sync**: TOTP requires accurate system time (±30 seconds)
3. **Counter Sync**: HOTP counters must be synchronized between client/server
4. **Secret Generation**: Use cryptographically secure random generation
5. **Validation Windows**: Balance security vs usability when setting windows

## Common Issues

1. **Wrong Codes**: Usually caused by time desync or wrong secret
2. **HOTP Desync**: Counter mismatch between devices
3. **Algorithm Mismatch**: Ensure client/server use same algorithm
4. **URI Parsing**: Some apps generate non-standard URIs
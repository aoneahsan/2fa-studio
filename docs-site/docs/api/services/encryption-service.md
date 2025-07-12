---
sidebar_position: 2
---

# EncryptionService

Service for handling encryption and decryption of sensitive data using AES-256-GCM with PBKDF2 key derivation.

## Overview

The `EncryptionService` provides cryptographically secure encryption for protecting 2FA secrets and other sensitive data. It implements a zero-knowledge architecture where encryption keys are derived from user passwords and never stored on servers.

```typescript
import { EncryptionService } from '@/services/encryption.service';
```

## Methods

### encrypt

Encrypts data using AES-256-GCM encryption.

```typescript
static async encrypt(params: EncryptionParams): Promise<EncryptedData>
```

**Parameters:**
- `params` - Object containing:
  - `data` (string) - The plaintext data to encrypt
  - `password` (string) - Password used to derive encryption key
  - `iterations?` (number) - PBKDF2 iterations (default: 100,000)

**Returns:**
- `EncryptedData` object containing:
  - `data` (string) - Base64 encoded encrypted data
  - `salt` (string) - Base64 encoded salt
  - `iv` (string) - Base64 encoded initialization vector
  - `iterations` (number) - Number of PBKDF2 iterations used

**Example:**
```typescript
const encrypted = await EncryptionService.encrypt({
  data: 'my-secret-2fa-code',
  password: 'user-master-password'
});

console.log(encrypted);
// {
//   data: 'aGVsbG8...', 
//   salt: 'c2FsdC4...', 
//   iv: 'aXZlY3Rv...',
//   iterations: 100000
// }
```

**Security Notes:**
- Uses cryptographically secure random salt and IV for each encryption
- Implements authenticated encryption (AES-GCM) to prevent tampering
- Key derivation uses PBKDF2-SHA256 with configurable iterations

### decrypt

Decrypts data encrypted with AES-256-GCM.

```typescript
static async decrypt(params: DecryptionParams): Promise<string>
```

**Parameters:**
- `params` - Object containing:
  - `encryptedData` (string) - JSON string of EncryptedData object
  - `password` (string) - Password to derive decryption key

**Returns:**
- Decrypted plaintext string

**Throws:**
- Error "Failed to decrypt data - invalid password or corrupted data"

**Example:**
```typescript
try {
  const decrypted = await EncryptionService.decrypt({
    encryptedData: JSON.stringify(encrypted),
    password: 'user-master-password'
  });
  console.log('Decrypted:', decrypted); // 'my-secret-2fa-code'
} catch (error) {
  console.error('Decryption failed - wrong password');
}
```

### generatePassword

Generates a cryptographically secure random password.

```typescript
static generatePassword(length: number = 32): string
```

**Parameters:**
- `length` - Password length (default: 32)

**Returns:**
- Random password string containing letters, numbers, and special characters

**Example:**
```typescript
const password = EncryptionService.generatePassword(16);
console.log(password); // 'xK9#mP2$nL5@qR8!'
```

**Character Set:**
- Uppercase letters (A-Z)
- Lowercase letters (a-z)
- Numbers (0-9)
- Special characters (!@#$%^&*()_+-=[]{}|;:,.?)

### hashPassword

Creates a SHA-256 hash of a password.

```typescript
static async hashPassword(password: string): Promise<string>
```

**Parameters:**
- `password` - Password to hash

**Returns:**
- Hexadecimal string of SHA-256 hash

**Example:**
```typescript
const hash = await EncryptionService.hashPassword('myPassword123');
console.log(hash); // '5e884898da28047151d0e56f8dc62927...'
```

**Use Cases:**
- Creating password fingerprints for comparison
- Generating deterministic keys from passwords

### validatePasswordStrength

Validates password strength and provides feedback.

```typescript
static validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
}
```

**Parameters:**
- `password` - Password to validate

**Returns:**
- Object containing:
  - `isValid` (boolean) - Whether password meets minimum requirements
  - `score` (number) - Strength score from 0-10
  - `feedback` (string[]) - Array of improvement suggestions

**Scoring Criteria:**
- Length: 8+ chars (+1), 12+ chars (+1), 16+ chars (+1)
- Contains lowercase (+1)
- Contains uppercase (+1)
- Contains numbers (+1)
- Contains special characters (+1)

**Example:**
```typescript
const validation = EncryptionService.validatePasswordStrength('weak');
console.log(validation);
// {
//   isValid: false,
//   score: 1,
//   feedback: [
//     'Password should be at least 8 characters long',
//     'Include uppercase letters',
//     'Include numbers',
//     'Include special characters'
//   ]
// }
```

## Types

### EncryptionParams

```typescript
interface EncryptionParams {
  data: string;
  password: string;
  iterations?: number;
}
```

### DecryptionParams

```typescript
interface DecryptionParams {
  encryptedData: string;
  password: string;
}
```

### EncryptedData

```typescript
interface EncryptedData {
  data: string;      // Base64 encoded ciphertext
  salt: string;      // Base64 encoded salt
  iv: string;        // Base64 encoded initialization vector
  iterations: number; // PBKDF2 iteration count
}
```

## Implementation Details

### Encryption Process

1. Generate random 16-byte salt
2. Generate random 12-byte IV
3. Derive 256-bit key using PBKDF2-SHA256
4. Encrypt data using AES-256-GCM
5. Encode all outputs as Base64 for storage

### Security Features

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2-SHA256 with 100,000+ iterations
- **Salt**: 16 bytes (128 bits) of cryptographic randomness
- **IV**: 12 bytes (96 bits) unique per encryption
- **Tag Length**: 16 bytes (128 bits) for authentication

### Best Practices

1. **Password Selection**: Use strong master passwords (16+ characters)
2. **Key Rotation**: Periodically re-encrypt data with new passwords
3. **Secure Storage**: Never log or store passwords in plain text
4. **Error Handling**: Don't reveal whether decryption failed due to wrong password or corrupted data

## Usage Example

```typescript
// Complete encryption/decryption cycle
async function secureStorage() {
  // Generate strong password
  const masterPassword = EncryptionService.generatePassword(24);
  
  // Validate password strength
  const validation = EncryptionService.validatePasswordStrength(masterPassword);
  if (!validation.isValid) {
    throw new Error('Password too weak');
  }
  
  // Encrypt sensitive data
  const secretData = 'JBSWY3DPEHPK3PXP'; // 2FA secret
  const encrypted = await EncryptionService.encrypt({
    data: secretData,
    password: masterPassword,
    iterations: 150000 // Higher for more security
  });
  
  // Store encrypted data in database
  await saveToDatabase({
    encryptedSecret: JSON.stringify(encrypted)
  });
  
  // Later: Retrieve and decrypt
  const stored = await getFromDatabase();
  const decrypted = await EncryptionService.decrypt({
    encryptedData: stored.encryptedSecret,
    password: masterPassword
  });
  
  console.log(decrypted === secretData); // true
}
```

## Performance Considerations

- PBKDF2 iterations affect performance vs security trade-off
- Default 100,000 iterations provides good balance
- Consider 150,000+ iterations for highly sensitive data
- Encryption/decryption is CPU-intensive - avoid in tight loops
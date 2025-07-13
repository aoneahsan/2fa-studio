# Technical Decisions & Architecture

**Last Updated:** January 13, 2025

## 🏗️ Architecture Decisions

### Browser Extension Architecture

#### Manifest V3 (Chosen)
**Rationale:**
- Future-proof (V2 being deprecated)
- Enhanced security model
- Better performance
- Service worker architecture

**Trade-offs:**
- No persistent background pages
- Limited DOM access
- Stricter CSP requirements

#### Module System
**Decision:** ES6 Modules with explicit imports
```javascript
// Chosen approach
import { OTPService } from './otp.js';
import { StorageService } from './storage.js';
```

**Benefits:**
- Clear dependencies
- Better tree shaking
- Easier testing
- Type safety ready

### Security Architecture

#### Encryption Strategy
**Decision:** AES-256-GCM for all sensitive data

**Implementation:**
- Web Crypto API (native browser crypto)
- PBKDF2 for key derivation (100,000 iterations)
- Random IV for each encryption
- HMAC for authentication

**Key Storage:**
- Never store keys in plaintext
- Derive from user PIN/password
- Session-based key caching
- Automatic key clearing

#### PIN Storage
**Decision:** SHA-256 hashing with salt
```javascript
const pinHash = await crypto.subtle.digest(
  'SHA-256', 
  encoder.encode(pin + 'tfa-studio-salt')
);
```

**Rationale:**
- Can't recover original PIN
- Fast verification
- Resistant to rainbow tables

### Data Storage

#### Chrome Storage API (Chosen)
```javascript
// Local storage for sensitive data
chrome.storage.local.set({ accounts: encryptedAccounts });

// Sync storage for settings
chrome.storage.sync.set({ theme: 'dark' });
```

**Benefits:**
- Built-in Chrome sync
- Larger quota than localStorage
- Async API
- Works in service workers

**Structure:**
```
chrome.storage.local:
├── accounts (encrypted)
├── settings
├── passwordEntries (encrypted)
├── extensionPinHash
└── lastSync

chrome.storage.sync:
├── theme
├── shortcuts
├── syncEnabled
└── autoFillSettings
```

### Mobile App Architecture (Planned)

#### React + Capacitor.js (Chosen)
**Rationale:**
- Reuse web knowledge
- Single codebase
- Access to native APIs
- Existing Capacitor packages

**vs Flutter:**
- Flutter better for pure native feel
- React better for web developers
- Capacitor plugins already built

#### State Management
**Decision:** Zustand for state management
```javascript
const useStore = create((set) => ({
  accounts: [],
  addAccount: (account) => set((state) => ({
    accounts: [...state.accounts, account]
  }))
}));
```

**Benefits:**
- Simpler than Redux
- TypeScript support
- React hooks based
- Minimal boilerplate

### Backend Architecture

#### Firebase (Chosen)
**Services:**
- Authentication (email, Google, Apple)
- Firestore (NoSQL database)
- Cloud Functions (serverless)
- Cloud Storage (backups)

**Rationale:**
- Fast development
- Real-time sync built-in
- Scalable
- Good security rules

**Database Schema:**
```
users/
  {userId}/
    profile: { email, created, subscription }
    devices/
      {deviceId}: { name, lastSeen, publicKey }

accounts/
  {accountId}:
    userId: string
    encryptedData: string (client-encrypted)
    lastModified: timestamp
    deviceId: string

subscriptions/
  {userId}/
    status: active|cancelled|expired
    tier: free|premium|business
    validUntil: timestamp
```

### Communication Architecture

#### Browser ↔ Mobile Sync
**Decision:** WebSocket + Firebase Realtime

**Flow:**
1. WebSocket for immediate sync
2. Firebase as fallback/persistence
3. End-to-end encryption
4. Device pairing via QR

**Security:**
- ECDH key exchange
- AES-256-GCM encryption
- Perfect forward secrecy
- Device fingerprinting

### Development Practices

#### Code Organization
```
/src/
  /core/           # Business logic
  /services/       # External integrations
  /components/     # UI components
  /utils/          # Helper functions
  /types/          # TypeScript definitions
```

#### Testing Strategy
- **Unit Tests:** Vitest for all core functions
- **Integration Tests:** Testing Library
- **E2E Tests:** Cypress for critical paths
- **Security Tests:** Custom penetration tests

#### Build Pipeline
```bash
# Development
npm run dev

# Production
npm run build
npm run test
npm run lint
```

## 🔄 Technology Choices

### Current Stack

#### Browser Extension
- **Language:** JavaScript (ES6+)
- **Build:** Native (no bundler needed)
- **UI:** Vanilla JS + CSS
- **Crypto:** Web Crypto API
- **Storage:** Chrome Storage API
- **Messaging:** Chrome Runtime API

#### Planned Mobile Stack
- **Framework:** React 18+
- **Language:** TypeScript
- **UI:** buildkit-ui (custom package)
- **Native:** Capacitor.js
- **State:** Zustand
- **Routing:** React Router
- **API:** Axios + React Query

#### Backend Stack
- **Platform:** Firebase
- **Functions:** Node.js 18+
- **Database:** Firestore
- **Auth:** Firebase Auth
- **Storage:** Cloud Storage
- **Hosting:** Firebase Hosting

### Package Decisions

#### Developer's Existing Packages (Will Use)
1. **capacitor-auth-manager** - Authentication handling
2. **capacitor-biometric-authentication** - Fingerprint/Face ID
3. **capacitor-firebase-kit** - Firebase integration
4. **capacitor-native-update** - App updates
5. **buildkit-ui** - UI components

#### Third-Party Packages
- **jsQR** - QR code scanning (proven reliable)
- **qrcode** - QR code generation
- **crypto-js** - Additional crypto operations

## 📐 Design Patterns

### Service Pattern
```javascript
class ServiceName {
  constructor() {
    this.init();
  }
  
  async init() {
    // Initialization logic
  }
  
  // Public methods
}

export default new ServiceName();
```

### Message Passing Pattern
```javascript
// Background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch(request.action) {
    case 'getData':
      handleGetData(sendResponse);
      return true; // Async response
  }
});

// Content script
const response = await chrome.runtime.sendMessage({ 
  action: 'getData' 
});
```

### Encryption Pattern
```javascript
// Always use async/await with Web Crypto
async encryptData(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(data))
  );
  return { iv, data: encrypted };
}
```

## 🚫 Anti-Patterns to Avoid

1. **Don't store keys in code**
2. **Don't use Math.random() for crypto**
3. **Don't use eval() or innerHTML**
4. **Don't trust user input**
5. **Don't use synchronous storage**
6. **Don't ignore error handling**

## 🔮 Future Considerations

### Potential Technology Changes
1. **WebAuthn** for passwordless auth
2. **WebAssembly** for crypto performance
3. **Web Workers** for heavy computation
4. **IndexedDB** for large data sets
5. **PWA** for web version

### Scalability Planning
- Sharding strategy for millions of users
- CDN for static assets
- Edge functions for global performance
- Database indexing strategy
- Caching layers

### Security Roadmap
1. Regular security audits
2. Bug bounty program
3. Penetration testing
4. Code signing certificates
5. Security headers optimization

## ✅ Decision Log

| Date | Decision | Rationale | Alternative Considered |
|------|----------|-----------|----------------------|
| 2024-01 | Manifest V3 | Future-proof | Manifest V2 |
| 2024-01 | React + Capacitor | Leverage existing packages | Flutter |
| 2024-01 | Firebase Backend | Faster development | Custom Node.js backend |
| 2024-01 | AES-256-GCM | Industry standard | ChaCha20-Poly1305 |
| 2024-01 | Chrome Storage | Built-in sync | IndexedDB |
| 2024-01 | SHA-256 for PIN | Simple and secure | Argon2 |
| 2024-01 | WebSocket sync | Real-time updates | Polling |

These decisions prioritize security, development speed, and maintainability while ensuring the application can scale to millions of users.
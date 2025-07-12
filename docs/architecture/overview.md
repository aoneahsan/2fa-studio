# 2FA Studio - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
├─────────────────┬─────────────────┬────────────────────────┤
│   Web App (PWA) │  Mobile Apps    │  Browser Extension     │
│   React + Vite  │  iOS & Android  │  Chrome/Edge/Firefox   │
│                 │  via Capacitor  │  (Future Release)      │
└────────┬────────┴────────┬────────┴───────┬────────────────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                    ┌──────┴──────┐
                    │  API Layer  │
                    │  Firebase   │
                    └──────┬──────┘
                           │
     ┌─────────────────────┼─────────────────────┐
     │                     │                     │
┌────┴──────┐      ┌──────┴──────┐      ┌──────┴──────┐
│   Auth    │      │  Firestore  │      │   Storage   │
│  Service  │      │  Database   │      │   Service   │
└───────────┘      └─────────────┘      └─────────────┘
```

## Frontend Architecture

### Component Structure
```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── common/         # Shared components
│   ├── accounts/       # 2FA account components
│   ├── settings/       # Settings components
│   └── backup/         # Backup/restore components
├── pages/              # Route pages
├── hooks/              # Custom React hooks
├── services/           # Business logic services
├── store/              # Redux store
│   ├── slices/         # Redux slices
│   └── index.ts        # Store configuration
├── utils/              # Utility functions
├── types/              # TypeScript definitions
├── constants/          # App constants
└── styles/             # Global styles
```

### State Management

```
Redux Store
├── auth
│   ├── user
│   ├── isAuthenticated
│   ├── encryptionKey
│   └── isLoading
├── accounts
│   ├── accounts[]
│   ├── searchQuery
│   ├── filters
│   └── sortOrder
├── settings
│   ├── theme
│   ├── biometric
│   ├── autoLock
│   └── backup
└── ui
    ├── modal
    ├── toasts[]
    ├── isLocked
    └── isLoading
```

## Data Flow Architecture

### Authentication Flow
```
User Login
    ↓
Firebase Auth
    ↓
Get User Profile (Firestore)
    ↓
Enter Encryption Password
    ↓
Generate Encryption Key (PBKDF2)
    ↓
Store in Redux (Memory Only)
    ↓
Load Encrypted Accounts
    ↓
Decrypt in Memory
    ↓
Display to User
```

### Data Encryption Flow
```
Plain Text Secret
    ↓
AES-256-GCM Encryption
    ↓
Encrypted Data + Salt + IV
    ↓
Store in Firestore
    ↓
Retrieve When Needed
    ↓
Decrypt with User Key
    ↓
Generate OTP Code
    ↓
Display to User
```

## Security Architecture

### Encryption Layers
1. **Transport Layer**: HTTPS/TLS for all communications
2. **Application Layer**: AES-256-GCM for data encryption
3. **Storage Layer**: Encrypted at rest in Firestore
4. **Device Layer**: Biometric/PIN protection

### Key Management
```
User Password → Firebase Auth
                    ↓
Encryption Password → PBKDF2 → Encryption Key
                                      ↓
                               Encrypt/Decrypt Data
```

### Zero-Knowledge Architecture
- Server never has access to:
  - Encryption passwords
  - Decrypted 2FA secrets
  - Generated OTP codes
- All encryption/decryption happens client-side

## Database Schema

### Firestore Collections

#### `users/{userId}`
```typescript
{
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  subscription: {
    type: 'free' | 'premium'
    status: 'active' | 'expired'
    accountLimit: number
  }
  settings: {
    theme: 'light' | 'dark' | 'system'
    biometricEnabled: boolean
    autoLockTimeout: number
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### `accounts/{userId}/accounts/{accountId}`
```typescript
{
  userId: string
  issuer: string
  label: string
  encryptedSecret: string  // Encrypted with user's key
  algorithm: 'SHA1' | 'SHA256' | 'SHA512'
  digits: number
  period: number
  type: 'totp' | 'hotp'
  counter?: number
  iconUrl?: string
  tags: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### `devices/{userId}/devices/{deviceId}`
```typescript
{
  name: string
  type: 'mobile' | 'desktop' | 'extension'
  platform: string
  lastActive: Timestamp
  fingerprint: string
  trusted: boolean
  createdAt: Timestamp
}
```

#### `backups/{userId}/backups/{backupId}`
```typescript
{
  version: string
  encryptedData: string
  size: number
  provider: 'google_drive' | 'local'
  checksum: string
  createdAt: Timestamp
}
```

## API Design

### Service Layer Pattern
```typescript
// Example: OTPService
class OTPService {
  static generateTOTP(account: OTPAccount): OTPResult
  static generateHOTP(account: OTPAccount): OTPResult
  static parseURI(uri: string): ParsedAccount
  static validateSecret(secret: string): boolean
}

// Example: EncryptionService  
class EncryptionService {
  static encrypt(data: string, password: string): EncryptedData
  static decrypt(encryptedData: string, password: string): string
  static deriveKey(password: string, salt: Uint8Array): CryptoKey
}
```

### Hook Pattern
```typescript
// Example: useAccounts
function useAccounts() {
  const accounts = useSelector(state => state.accounts)
  const dispatch = useDispatch()
  
  const addAccount = async (account: NewAccount) => {
    // Encrypt and save
  }
  
  const deleteAccount = async (id: string) => {
    // Delete account
  }
  
  return { accounts, addAccount, deleteAccount }
}
```

## Performance Optimization

### Code Splitting
```javascript
// Lazy load pages
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const BackupPage = lazy(() => import('./pages/BackupPage'))
```

### Caching Strategy
1. **Local Storage**: Encrypted account cache
2. **Memory Cache**: Decrypted accounts in Redux
3. **Service Worker**: PWA offline support
4. **CDN**: Static assets

### Bundle Optimization
- Tree shaking
- Minification
- Compression (gzip/brotli)
- Image optimization
- Font subsetting

## Deployment Architecture

### Web Deployment
```
GitHub Repository
    ↓
GitHub Actions CI/CD
    ↓
Build & Test
    ↓
Deploy to Vercel/Netlify
    ↓
CloudFlare CDN
    ↓
Users
```

### Mobile Deployment
```
GitHub Repository
    ↓
Build with Capacitor
    ↓
iOS: Xcode → TestFlight → App Store
Android: Android Studio → Play Console
```

## Monitoring & Analytics

### Error Tracking
- Sentry for error monitoring
- Custom error boundaries
- Structured logging

### Performance Monitoring
- Web Vitals tracking
- Custom performance marks
- Firebase Performance Monitoring

### Analytics
- Firebase Analytics
- Custom event tracking
- User flow analysis
- Feature usage metrics

## Scalability Considerations

### Current Limitations
- Single region deployment
- No horizontal scaling
- Limited to Firestore quotas

### Future Scalability
- Multi-region deployment
- Edge functions
- Caching layer (Redis)
- Load balancing
- Database sharding

## Development Patterns

### Component Pattern
```typescript
interface ComponentProps {
  // Named props only
  title: string
  onAction: () => void
  isLoading?: boolean
}

const Component: React.FC<ComponentProps> = ({
  title,
  onAction,
  isLoading = false
}) => {
  // Implementation
}
```

### Error Handling Pattern
```typescript
try {
  // Operation
} catch (error) {
  logger.error('Operation failed', { error, context })
  dispatch(addToast({
    type: 'error',
    message: getUserFriendlyMessage(error)
  }))
}
```

### Testing Pattern
```typescript
describe('Component', () => {
  it('should render correctly', () => {
    // Arrange
    const props = { title: 'Test' }
    
    // Act
    render(<Component {...props} />)
    
    // Assert
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```
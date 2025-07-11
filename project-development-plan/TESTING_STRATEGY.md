# 2FA Studio - Comprehensive Testing Strategy

## Testing Philosophy
- **Test-Driven Development (TDD)**: Write tests before implementation
- **100% Critical Path Coverage**: All security and core features must be tested
- **Continuous Testing**: Tests run on every commit
- **Real Device Testing**: Test on actual iOS and Android devices

## Testing Stack

### Unit Testing: Vitest
- Fast, Vite-native test runner
- Jest-compatible API
- Built-in TypeScript support
- Snapshot testing
- Coverage reporting

### E2E Testing: Cypress
- Real browser testing
- Visual regression testing
- API testing capabilities
- Mobile viewport testing
- CI/CD integration

### Additional Tools
- **React Testing Library**: Component testing
- **MSW (Mock Service Worker)**: API mocking
- **Faker.js**: Test data generation
- **Percy**: Visual regression testing (optional)

## Test Structure

```
tests/
├── unit/                    # Vitest unit tests
│   ├── services/           # Service layer tests
│   ├── hooks/              # Custom hook tests
│   ├── utils/              # Utility function tests
│   └── components/         # Component unit tests
├── integration/            # Integration tests
│   ├── api/               # API integration tests
│   └── store/             # Redux integration tests
├── e2e/                    # Cypress E2E tests
│   ├── auth/              # Authentication flows
│   ├── accounts/          # Account management
│   ├── settings/          # Settings workflows
│   └── security/          # Security scenarios
├── fixtures/               # Test data
├── mocks/                  # Mock implementations
└── utils/                  # Test utilities
```

## Unit Testing Guidelines

### Service Tests

```typescript
// tests/unit/services/encryption.service.test.ts
import { describe, it, expect } from 'vitest'
import { EncryptionService } from '@/services/encryption.service'

describe('EncryptionService', () => {
  describe('encrypt', () => {
    it('should encrypt data with correct algorithm', async () => {
      const data = 'test-secret'
      const password = 'test-password'
      
      const result = await EncryptionService.encrypt({ data, password })
      
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('salt')
      expect(result).toHaveProperty('iv')
      expect(result.data).not.toBe(data)
    })

    it('should generate unique salt and IV for each encryption', async () => {
      const data = 'test-secret'
      const password = 'test-password'
      
      const result1 = await EncryptionService.encrypt({ data, password })
      const result2 = await EncryptionService.encrypt({ data, password })
      
      expect(result1.salt).not.toBe(result2.salt)
      expect(result1.iv).not.toBe(result2.iv)
    })

    it('should throw error for empty data', async () => {
      await expect(
        EncryptionService.encrypt({ data: '', password: 'test' })
      ).rejects.toThrow()
    })
  })

  describe('decrypt', () => {
    it('should decrypt previously encrypted data', async () => {
      const originalData = 'test-secret'
      const password = 'test-password'
      
      const encrypted = await EncryptionService.encrypt({ 
        data: originalData, 
        password 
      })
      
      const decrypted = await EncryptionService.decrypt({
        encryptedData: JSON.stringify(encrypted),
        password
      })
      
      expect(decrypted).toBe(originalData)
    })

    it('should fail with wrong password', async () => {
      const encrypted = await EncryptionService.encrypt({ 
        data: 'secret', 
        password: 'correct' 
      })
      
      await expect(
        EncryptionService.decrypt({
          encryptedData: JSON.stringify(encrypted),
          password: 'wrong'
        })
      ).rejects.toThrow('Failed to decrypt')
    })
  })

  describe('password validation', () => {
    it.each([
      ['weak123', false],
      ['StrongP@ssw0rd!', true],
      ['short', false],
      ['verylongpasswordwithoutspecialchars', false],
      ['C0mpl3x!P@ssw0rd', true]
    ])('should validate "%s" as %s', (password, expected) => {
      const result = EncryptionService.validatePasswordStrength(password)
      expect(result.isValid).toBe(expected)
    })
  })
})
```

### Component Tests

```typescript
// tests/unit/components/AccountCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AccountCard } from '@/components/accounts/AccountCard'
import { OTPService } from '@/services/otp.service'

vi.mock('@/services/otp.service')

describe('AccountCard', () => {
  const mockAccount = {
    id: '1',
    issuer: 'Google',
    label: 'user@example.com',
    secret: 'JBSWY3DPEHPK3PXP',
    type: 'totp' as const,
    algorithm: 'SHA1' as const,
    digits: 6,
    period: 30,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    vi.mocked(OTPService.generateTOTP).mockReturnValue({
      code: '123456',
      remainingTime: 15,
      progress: 50
    })
  })

  it('should display account information', () => {
    render(<AccountCard account={mockAccount} />)
    
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('should display OTP code', () => {
    render(<AccountCard account={mockAccount} />)
    
    expect(screen.getByText('123 456')).toBeInTheDocument()
  })

  it('should copy code on click', async () => {
    const mockClipboard = vi.fn()
    Object.assign(navigator, {
      clipboard: { writeText: mockClipboard }
    })

    render(<AccountCard account={mockAccount} />)
    
    const copyButton = screen.getByRole('button', { name: /copy/i })
    fireEvent.click(copyButton)
    
    await waitFor(() => {
      expect(mockClipboard).toHaveBeenCalledWith('123456')
    })
  })

  it('should show countdown timer', () => {
    render(<AccountCard account={mockAccount} />)
    
    expect(screen.getByText('15s')).toBeInTheDocument()
  })

  it('should handle HOTP accounts differently', () => {
    const hotpAccount = { ...mockAccount, type: 'hotp' as const, counter: 5 }
    
    vi.mocked(OTPService.generateHOTP).mockReturnValue({
      code: '654321'
    })
    
    render(<AccountCard account={hotpAccount} />)
    
    expect(screen.queryByText(/\ds/)).not.toBeInTheDocument()
    expect(screen.getByText('Counter: 5')).toBeInTheDocument()
  })
})
```

### Hook Tests

```typescript
// tests/unit/hooks/useAccounts.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAccounts } from '@/hooks/useAccounts'
import { wrapper } from '@/tests/utils/test-utils'

describe('useAccounts', () => {
  it('should load accounts on mount', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper })
    
    expect(result.current.isLoading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.accounts).toHaveLength(2)
    })
  })

  it('should add account', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper })
    
    await act(async () => {
      await result.current.addAccount({
        issuer: 'Test',
        label: 'test@example.com',
        secret: 'NEWSECRET'
      })
    })
    
    expect(result.current.accounts).toHaveLength(3)
  })

  it('should handle errors gracefully', async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper })
    
    await act(async () => {
      await result.current.deleteAccount('non-existent-id')
    })
    
    expect(result.current.error).toBe('Account not found')
  })
})
```

## E2E Testing Guidelines

### Authentication Flow

```typescript
// tests/e2e/auth/login.cy.ts
describe('Login Flow', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  it('should login with valid credentials', () => {
    cy.get('[data-testid="email-input"]').type('test@example.com')
    cy.get('[data-testid="password-input"]').type('password123')
    cy.get('[data-testid="login-button"]').click()
    
    // Should show encryption password field
    cy.get('[data-testid="encryption-password-input"]').should('be.visible')
    cy.get('[data-testid="encryption-password-input"]').type('encryption123')
    cy.get('[data-testid="unlock-button"]').click()
    
    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')
    cy.contains('Welcome back').should('be.visible')
  })

  it('should show error for invalid credentials', () => {
    cy.get('[data-testid="email-input"]').type('wrong@example.com')
    cy.get('[data-testid="password-input"]').type('wrongpassword')
    cy.get('[data-testid="login-button"]').click()
    
    cy.contains('Invalid email or password').should('be.visible')
  })

  it('should handle network errors', () => {
    cy.intercept('POST', '/api/auth/login', { statusCode: 500 })
    
    cy.get('[data-testid="email-input"]').type('test@example.com')
    cy.get('[data-testid="password-input"]').type('password123')
    cy.get('[data-testid="login-button"]').click()
    
    cy.contains('Network error').should('be.visible')
  })
})
```

### Account Management

```typescript
// tests/e2e/accounts/management.cy.ts
describe('Account Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123', 'encryption123')
    cy.visit('/accounts')
  })

  it('should add account via QR code', () => {
    cy.get('[data-testid="add-account-button"]').click()
    cy.get('[data-testid="scan-qr-button"]').click()
    
    // Mock QR code scan
    cy.window().then((win) => {
      win.postMessage({
        type: 'qr-scan-result',
        data: 'otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example'
      }, '*')
    })
    
    cy.get('[data-testid="account-name-input"]').should('have.value', 'Example')
    cy.get('[data-testid="save-account-button"]').click()
    
    cy.contains('Account added successfully').should('be.visible')
    cy.get('[data-testid="account-card"]').should('have.length', 1)
  })

  it('should generate and copy OTP code', () => {
    // Add test account first
    cy.addTestAccount('GitHub', 'user@github.com')
    
    // Find the account card
    cy.contains('[data-testid="account-card"]', 'GitHub').within(() => {
      // Code should be visible
      cy.get('[data-testid="otp-code"]').should('match', /\d{3} \d{3}/)
      
      // Copy code
      cy.get('[data-testid="copy-button"]').click()
    })
    
    // Check clipboard
    cy.window().then((win) => {
      win.navigator.clipboard.readText().then((text) => {
        expect(text).to.match(/^\d{6}$/)
      })
    })
    
    cy.contains('Code copied').should('be.visible')
  })

  it('should search and filter accounts', () => {
    // Add multiple test accounts
    cy.addTestAccount('GitHub', 'user@github.com', ['work'])
    cy.addTestAccount('Google', 'user@gmail.com', ['personal'])
    cy.addTestAccount('AWS', 'user@aws.com', ['work'])
    
    // Search by name
    cy.get('[data-testid="search-input"]').type('git')
    cy.get('[data-testid="account-card"]').should('have.length', 1)
    cy.contains('GitHub').should('be.visible')
    
    // Clear search
    cy.get('[data-testid="search-input"]').clear()
    
    // Filter by tag
    cy.get('[data-testid="tag-filter"]').click()
    cy.get('[data-testid="tag-work"]').click()
    cy.get('[data-testid="account-card"]').should('have.length', 2)
  })
})
```

### Security Tests

```typescript
// tests/e2e/security/encryption.cy.ts
describe('Security Features', () => {
  it('should encrypt account data', () => {
    cy.login('test@example.com', 'password123', 'encryption123')
    
    // Intercept Firestore calls
    cy.intercept('POST', '**/firestore/v1/**').as('firestoreWrite')
    
    // Add account
    cy.visit('/accounts')
    cy.addTestAccount('SecureTest', 'secure@test.com')
    
    // Check that secret is encrypted in request
    cy.wait('@firestoreWrite').then((interception) => {
      const requestBody = interception.request.body
      expect(requestBody).to.have.property('encryptedSecret')
      expect(requestBody).not.to.have.property('secret')
      expect(requestBody.encryptedSecret).to.include('salt')
      expect(requestBody.encryptedSecret).to.include('iv')
    })
  })

  it('should auto-lock after timeout', () => {
    cy.login('test@example.com', 'password123', 'encryption123')
    
    // Set short timeout for testing
    cy.visit('/settings')
    cy.get('[data-testid="auto-lock-select"]').select('1') // 1 minute
    
    // Wait for timeout
    cy.clock()
    cy.tick(61000) // 61 seconds
    
    // Should show lock screen
    cy.get('[data-testid="lock-screen"]').should('be.visible')
    cy.contains('App is locked').should('be.visible')
  })

  it('should require biometric on unlock', () => {
    cy.login('test@example.com', 'password123', 'encryption123')
    
    // Enable biometric
    cy.visit('/settings')
    cy.get('[data-testid="biometric-toggle"]').click()
    
    // Mock biometric API
    cy.window().then((win) => {
      win.BiometricAuth = {
        authenticate: cy.stub().resolves({ authenticated: true })
      }
    })
    
    // Lock and unlock
    cy.get('[data-testid="lock-app-button"]').click()
    cy.get('[data-testid="unlock-biometric-button"]').click()
    
    // Should be unlocked
    cy.get('[data-testid="lock-screen"]').should('not.exist')
  })
})
```

## Test Data Management

### Fixtures

```typescript
// tests/fixtures/accounts.ts
export const mockAccounts = [
  {
    id: '1',
    issuer: 'Google',
    label: 'user@gmail.com',
    secret: 'JBSWY3DPEHPK3PXP',
    type: 'totp',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    tags: ['personal']
  },
  {
    id: '2',
    issuer: 'GitHub',
    label: 'developer',
    secret: 'HXDMVJECJJWSRB3H',
    type: 'totp',
    algorithm: 'SHA256',
    digits: 6,
    period: 30,
    tags: ['work', 'development']
  }
]
```

### Test Utilities

```typescript
// tests/utils/test-utils.tsx
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { rootReducer } from '@/store'

export const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState: initialState
  })
}

export const renderWithProviders = (
  ui: React.ReactElement,
  { initialState = {}, store = createTestStore(initialState) } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  )
  
  return render(ui, { wrapper: Wrapper })
}
```

## Coverage Requirements

### Unit Test Coverage
- **Services**: 100% coverage required
- **Utils**: 100% coverage required
- **Hooks**: 90% coverage required
- **Components**: 80% coverage required
- **Overall**: 85% minimum coverage

### E2E Coverage
- All critical user paths
- All authentication flows
- All CRUD operations
- All error scenarios
- All security features

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: yarn install
      - run: yarn test:unit
      - run: yarn test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install
      - run: yarn build
      - run: yarn test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots
```

## Testing Commands

```json
// package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:unit": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:all": "yarn test:unit && yarn test:e2e"
  }
}
```

## Performance Testing

### Load Testing
```typescript
// tests/performance/load.test.ts
describe('Performance', () => {
  it('should handle 100 accounts efficiently', async () => {
    const accounts = Array.from({ length: 100 }, (_, i) => 
      createMockAccount(`Account ${i}`)
    )
    
    const start = performance.now()
    render(<AccountsList accounts={accounts} />)
    const end = performance.now()
    
    expect(end - start).toBeLessThan(100) // 100ms
  })
})
```

### Memory Testing
```typescript
it('should not leak memory on repeated renders', () => {
  const { rerender } = render(<App />)
  
  const initialMemory = performance.memory.usedJSHeapSize
  
  // Render 100 times
  for (let i = 0; i < 100; i++) {
    rerender(<App key={i} />)
  }
  
  const finalMemory = performance.memory.usedJSHeapSize
  const leak = finalMemory - initialMemory
  
  expect(leak).toBeLessThan(10 * 1024 * 1024) // 10MB
})
```

## Security Testing

### Penetration Tests
- SQL injection attempts
- XSS vulnerability checks
- CSRF protection validation
- Authentication bypass attempts
- Encryption strength verification

### Compliance Tests
- OWASP Top 10 coverage
- Data privacy compliance
- Accessibility standards
- Performance budgets
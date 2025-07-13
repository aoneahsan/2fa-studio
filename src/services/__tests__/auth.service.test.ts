import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthService } from '@services/auth.service'

// Mock Firebase Auth
const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn()
}

vi.mock('firebase/auth', () => ({
  getAuth: () => mockAuth,
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  updateProfile: vi.fn(),
  GoogleAuthProvider: vi.fn()
}))

// Mock Firebase Firestore
const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn()
}

vi.mock('firebase/firestore', () => ({
  getFirestore: () => mockFirestore,
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date())
}))

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const mockUserCredential = {
        user: mockUser
      }

      vi.mocked(mockAuth.signInWithEmailAndPassword).mockResolvedValue(mockUserCredential)

      const result = await AuthService.login('test@example.com', 'password123')

      expect(_result).toEqual(_mockUser)
      expect(mockAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'test@example.com',
        'password123'
      )
    })

    it('should throw error for invalid credentials', async () => {
      const error = new Error('Invalid credentials')
      vi.mocked(mockAuth.signInWithEmailAndPassword).mockRejectedValue(_error)

      await expect(
        AuthService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials')
    })

    it('should handle empty email', async () => {
      await expect(
        AuthService.login('', 'password123')
      ).rejects.toThrow()
    })

    it('should handle empty password', async () => {
      await expect(
        AuthService.login('test@example.com', '')
      ).rejects.toThrow()
    })
  })

  describe('register', () => {
    it('should register user successfully', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: null
      }

      const mockUserCredential = {
        user: mockUser
      }

      vi.mocked(mockAuth.createUserWithEmailAndPassword).mockResolvedValue(mockUserCredential)
      vi.mocked(mockFirestore.doc).mockReturnValue({ set: vi.fn().mockResolvedValue(undefined) })

      const result = await AuthService.register('test@example.com', 'password123', 'Test User')

      expect(_result).toEqual(_mockUser)
      expect(mockAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'test@example.com',
        'password123'
      )
    })

    it('should create user profile in Firestore', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: null
      }

      const mockUserCredential = {
        user: mockUser
      }

      const mockDocRef = { set: vi.fn().mockResolvedValue(undefined) }
      vi.mocked(mockAuth.createUserWithEmailAndPassword).mockResolvedValue(mockUserCredential)
      vi.mocked(mockFirestore.doc).mockReturnValue(mockDocRef)

      await AuthService.register('test@example.com', 'password123', 'Test User')

      expect(mockDocRef.set).toHaveBeenCalledWith({
        email: 'test@example.com',
        displayName: 'Test User',
        subscription: {
          tier: 'free',
          status: 'active'
        },
        preferences: {
          theme: 'system',
          notifications: true,
          biometricAuth: false
        },
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    })
  })

  describe('logout', () => {
    it('should logout user successfully', async () => {
      vi.mocked(mockAuth.signOut).mockResolvedValue(undefined)

      await AuthService.logout()

      expect(mockAuth.signOut).toHaveBeenCalled()
    })

    it('should handle logout error', async () => {
      const error = new Error('Logout failed')
      vi.mocked(mockAuth.signOut).mockRejectedValue(_error)

      await expect(AuthService.logout()).rejects.toThrow('Logout failed')
    })
  })

  describe('getCurrentUser', () => {
    it('should return current user', () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      mockAuth.currentUser = mockUser

      const result = AuthService.getCurrentUser()
      expect(_result).toEqual(_mockUser)
    })

    it('should return null when no user is logged in', () => {
      mockAuth.currentUser = null

      const result = AuthService.getCurrentUser()
      expect(_result).toBeNull()
    })
  })

  describe('onAuthStateChanged', () => {
    it('should setup auth state listener', () => {
      const callback = vi.fn()
      
      AuthService.onAuthStateChanged(callback)

      expect(mockAuth.onAuthStateChanged).toHaveBeenCalledWith(callback)
    })
  })

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      mockAuth.currentUser = mockUser

      const mockDocRef = {
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ displayName: 'Old Name' })
        })
      }

      vi.mocked(mockFirestore.doc).mockReturnValue(mockDocRef)

      await AuthService.updateProfile({ displayName: 'New Name' })

      expect(mockDocRef.update).toHaveBeenCalledWith({
        displayName: 'New Name',
        updatedAt: expect.any(Date)
      })
    })

    it('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null

      await expect(
        AuthService.updateProfile({ displayName: 'New Name' })
      ).rejects.toThrow('User not authenticated')
    })
  })

  describe('checkEmailExists', () => {
    it('should return true for existing email', async () => {
      const mockCollection = {
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          empty: false
        })
      }

      vi.mocked(mockFirestore.collection).mockReturnValue(mockCollection)

      const result = await AuthService.checkEmailExists('existing@example.com')

      expect(_result).toBe(true)
      expect(mockCollection.where).toHaveBeenCalledWith('email', '==', 'existing@example.com')
    })

    it('should return false for non-existing email', async () => {
      const mockCollection = {
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          empty: true
        })
      }

      vi.mocked(mockFirestore.collection).mockReturnValue(mockCollection)

      const result = await AuthService.checkEmailExists('new@example.com')

      expect(_result).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = AuthService.validatePassword('StrongPass123!')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject short password', () => {
      const result = AuthService.validatePassword('Short1!')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should reject password without uppercase', () => {
      const result = AuthService.validatePassword('password123!')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('should reject password without lowercase', () => {
      const result = AuthService.validatePassword('PASSWORD123!')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('should reject password without number', () => {
      const result = AuthService.validatePassword('Password!')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should reject password without special character', () => {
      const result = AuthService.validatePassword('Password123')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })
  })
})
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoogleDriveService } from '@services/googleDrive.service'

// Mock Google APIs
const mockGapi = {
  load: vi.fn(),
  client: {
    init: vi.fn(),
    setApiKey: vi.fn(),
    drive: {
      files: {
        create: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        list: vi.fn()
      }
    }
  },
  auth2: {
    getAuthInstance: vi.fn(() => ({
      isSignedIn: {
        get: vi.fn(() => true)
      },
      signIn: vi.fn(),
      signOut: vi.fn(),
      currentUser: {
        get: vi.fn(() => ({
          getAuthResponse: vi.fn(() => ({
            access_token: 'mock-token'
          }))
        }))
      }
    }))
  }
}

global.gapi = mockGapi

describe('GoogleDriveService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize Google Drive API', async () => {
      mockGapi.load.mockImplementation((api, callback) => {
        if (typeof callback === 'function') {
          callback()
        }
      })

      mockGapi.client.init.mockResolvedValue(undefined)

      await GoogleDriveService.initialize()

      expect(mockGapi.load).toHaveBeenCalledWith('client:auth2', expect.any(Function))
      expect(mockGapi.client.init).toHaveBeenCalledWith({
        apiKey: expect.any(String),
        clientId: expect.any(String),
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.file'
      })
    })

    it('should handle initialization error', async () => {
      const error = new Error('Failed to load Google API')
      mockGapi.load.mockImplementation((api, callback) => {
        throw error
      })

      await expect(GoogleDriveService.initialize()).rejects.toThrow('Failed to load Google API')
    })
  })

  describe('authentication', () => {
    it('should check if user is signed in', () => {
      const mockAuthInstance = {
        isSignedIn: {
          get: vi.fn(() => true)
        }
      }

      mockGapi.auth2.getAuthInstance.mockReturnValue(mockAuthInstance)

      const result = GoogleDriveService.isSignedIn()

      expect(_result).toBe(true)
      expect(mockAuthInstance.isSignedIn.get).toHaveBeenCalled()
    })

    it('should sign in user', async () => {
      const mockAuthInstance = {
        signIn: vi.fn().mockResolvedValue(undefined)
      }

      mockGapi.auth2.getAuthInstance.mockReturnValue(mockAuthInstance)

      await GoogleDriveService.signIn()

      expect(mockAuthInstance.signIn).toHaveBeenCalled()
    })

    it('should sign out user', async () => {
      const mockAuthInstance = {
        signOut: vi.fn().mockResolvedValue(undefined)
      }

      mockGapi.auth2.getAuthInstance.mockReturnValue(mockAuthInstance)

      await GoogleDriveService.signOut()

      expect(mockAuthInstance.signOut).toHaveBeenCalled()
    })
  })

  describe('file operations', () => {
    const mockBackupData = {
      accounts: [
        {
          id: '1',
          issuer: 'Test',
          secret: 'encrypted-secret'
        }
      ],
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }

    it('should create backup file', async () => {
      const mockFileResponse = {
        _result: {
          id: 'mock-file-id',
          name: 'backup.json'
        }
      }

      mockGapi.client.drive.files.create.mockResolvedValue(mockFileResponse)

      const result = await GoogleDriveService.createBackup(mockBackupData)

      expect(_result).toEqual(mockFileResponse._result)
      expect(mockGapi.client.drive.files.create).toHaveBeenCalledWith({
        resource: {
          name: expect.stringMatching(/2fa-backup-\d{4}-\d{2}-\d{2}\.json/),
          parents: ['appDataFolder']
        },
        media: {
          mimeType: 'application/json',
          body: JSON.stringify(mockBackupData, null, 2)
        }
      })
    })

    it('should list backup files', async () => {
      const mockFilesResponse = {
        _result: {
          files: [
            {
              id: 'file1',
              name: '2fa-backup-2024-01-01.json',
              modifiedTime: '2024-01-01T10:00:00Z'
            },
            {
              id: 'file2',
              name: '2fa-backup-2024-01-02.json',
              modifiedTime: '2024-01-02T10:00:00Z'
            }
          ]
        }
      }

      mockGapi.client.drive.files.list.mockResolvedValue(mockFilesResponse)

      const result = await GoogleDriveService.listBackups()

      expect(_result).toEqual(mockFilesResponse.result.files)
      expect(mockGapi.client.drive.files.list).toHaveBeenCalledWith({
        q: "name contains '2fa-backup' and parents in 'appDataFolder'",
        orderBy: 'modifiedTime desc',
        fields: 'files(id,name,modifiedTime,size)'
      })
    })

    it('should download backup file', async () => {
      const mockFileContent = JSON.stringify(mockBackupData)
      const mockFileResponse = {
        body: mockFileContent
      }

      mockGapi.client.drive.files.get.mockResolvedValue(mockFileResponse)

      const result = await GoogleDriveService.downloadBackup('mock-file-id')

      expect(_result).toEqual(mockBackupData)
      expect(mockGapi.client.drive.files.get).toHaveBeenCalledWith({
        fileId: 'mock-file-id',
        alt: 'media'
      })
    })

    it('should handle download error for corrupted file', async () => {
      const mockFileResponse = {
        body: 'invalid json'
      }

      mockGapi.client.drive.files.get.mockResolvedValue(mockFileResponse)

      await expect(
        GoogleDriveService.downloadBackup('mock-file-id')
      ).rejects.toThrow('Invalid backup file format')
    })

    it('should delete backup file', async () => {
      mockGapi.client.drive.files.delete.mockResolvedValue({ _result: {} })

      await GoogleDriveService.deleteBackup('mock-file-id')

      expect(mockGapi.client.drive.files.delete).toHaveBeenCalledWith({
        fileId: 'mock-file-id'
      })
    })

    it('should update existing backup file', async () => {
      const mockFileResponse = {
        _result: {
          id: 'mock-file-id',
          name: 'backup.json'
        }
      }

      mockGapi.client.drive.files.update.mockResolvedValue(mockFileResponse)

      const result = await GoogleDriveService.updateBackup('mock-file-id', mockBackupData)

      expect(_result).toEqual(mockFileResponse._result)
      expect(mockGapi.client.drive.files.update).toHaveBeenCalledWith({
        fileId: 'mock-file-id',
        media: {
          mimeType: 'application/json',
          body: JSON.stringify(mockBackupData, null, 2)
        }
      })
    })
  })

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const apiError = {
        _error: {
          code: 403,
          message: 'Insufficient permissions'
        }
      }

      mockGapi.client.drive.files.list.mockRejectedValue(apiError)

      await expect(GoogleDriveService.listBackups()).rejects.toThrow('Insufficient permissions')
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network error')
      mockGapi.client.drive.files.list.mockRejectedValue(networkError)

      await expect(GoogleDriveService.listBackups()).rejects.toThrow('Network error')
    })
  })

  describe('backup validation', () => {
    it('should validate backup data structure', async () => {
      const invalidBackupData = {
        accounts: 'invalid',
        version: '1.0.0'
      }

      await expect(
        GoogleDriveService.createBackup(invalidBackupData as unknown)
      ).rejects.toThrow('Invalid backup data structure')
    })

    it('should validate backup version compatibility', async () => {
      const mockFileContent = JSON.stringify({
        accounts: [],
        version: '0.1.0', // Incompatible version
        timestamp: new Date().toISOString()
      })

      const mockFileResponse = {
        body: mockFileContent
      }

      mockGapi.client.drive.files.get.mockResolvedValue(mockFileResponse)

      await expect(
        GoogleDriveService.downloadBackup('mock-file-id')
      ).rejects.toThrow('Incompatible backup version')
    })
  })

  describe('quota management', () => {
    it('should check available storage quota', async () => {
      const mockAboutResponse = {
        _result: {
          storageQuota: {
            limit: '15000000000',
            usage: '5000000000'
          }
        }
      }

      // Mock the about API
      mockGapi.client.drive = {
        ...mockGapi.client.drive,
        about: {
          get: vi.fn().mockResolvedValue(mockAboutResponse)
        }
      }

      const result = await GoogleDriveService.getStorageQuota()

      expect(_result).toEqual({
        total: 15000000000,
        used: 5000000000,
        available: 10000000000
      })
    })

    it('should warn when storage quota is low', async () => {
      const mockAboutResponse = {
        _result: {
          storageQuota: {
            limit: '15000000000',
            usage: '14500000000' // 96.67% used
          }
        }
      }

      mockGapi.client.drive = {
        ...mockGapi.client.drive,
        about: {
          get: vi.fn().mockResolvedValue(mockAboutResponse)
        }
      }

      const result = await GoogleDriveService.getStorageQuota()

      expect(result.available).toBeLessThan(1000000000) // Less than 1GB
    })
  })
})
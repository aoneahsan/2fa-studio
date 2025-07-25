import 'cypress'

import { defineConfig } from 'cypress'

/**
 * @type {Cypress.PluginConfig}
 */
export default defineConfig({
  e2e: {
    setupNodeEvents(_on, _config) {
      // Firebase emulator tasks
      on('task', {
        setupFirebaseEmulator() {
          // Start Firebase emulators if not already running
          const { spawn } = import('child_process')
          
          return new Promise((resolve) => {
            const emulator = spawn('firebase', ['emulators:start', '--only', '_auth,firestore,functions,storage'], {
              detached: true,
              stdio: 'ignore'
            })
            
            emulator.unref()
            
            // Wait a bit for emulators to start
            setTimeout(() => {
              resolve('Emulators started')
            }, 5000)
          })
        },
        
        clearFirebaseEmulator() {
          // Clear emulator data
          import fetch from 'node-fetch'
          
          return Promise.all([
            // Clear Auth emulator
            fetch('http://localhost:9099/emulator/v1/projects/demo-project/accounts', {
              method: 'DELETE'
            }).catch(() => {}),
            
            // Clear Firestore emulator
            fetch('http://localhost:8080/emulator/v1/projects/demo-project/databases/(default)/documents', {
              method: 'DELETE'
            }).catch(() => {}),
            
            // Clear Storage emulator
            fetch('http://localhost:9199/v0/b/demo-project.appspot.com/o', {
              method: 'DELETE'
            }).catch(() => {})
          ]).then(() => 'Emulator data cleared')
        },
        
        cleanupTestUser(email: string) {
          // Remove test user and associated data
          import admin from 'firebase-admin'
          
          if (!admin.apps.length) {
            admin.initializeApp({
              projectId: 'demo-project'
            })
            
            // Connect to emulators
            admin.auth().useEmulator('http://localhost:9099')
            admin.firestore().settings({
              host: 'localhost:8080',
              ssl: false
            })
          }
          
          return admin.auth().getUserByEmail(email)
            .then((user) => {
              return Promise.all([
                admin.auth().deleteUser(user.uid),
                admin.firestore().collection('users').doc(user.uid).delete(),
                admin.firestore().collection('accounts').where('userId', '==', user.uid).get()
                  .then((snapshot) => {
                    const batch = admin.firestore().batch()
                    snapshot.forEach((doc) => {
                      batch.delete(doc.ref)
                    })
                    return batch.commit()
                  })
              ])
            })
            .then(() => 'Test user cleaned up')
            .catch(() => 'No test user found')
        },
        
        // Database seeding for tests
        seedTestData() {
          import admin from 'firebase-admin'
          
          if (!admin.apps.length) {
            admin.initializeApp({
              projectId: 'demo-project'
            })
            
            admin.firestore().settings({
              host: 'localhost:8080',
              ssl: false
            })
          }
          
          const testData = {
            users: [
              {
                id: 'test-user-1',
                email: 'test@2fastudio.app',
                displayName: 'Test User',
                subscription: { tier: 'free', status: 'active' },
                createdAt: new Date()
              }
            ],
            accounts: [
              {
                id: 'test-account-1',
                userId: 'test-user-1',
                issuer: 'Google',
                label: 'test@gmail.com',
                secret: 'encrypted-secret',
                type: 'totp',
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                createdAt: new Date()
              }
            ]
          }
          
          const batch = admin.firestore().batch()
          
          // Add test users
          testData.users.forEach((user) => {
            const userRef = admin.firestore().collection('users').doc(user.id)
            batch.set(userRef, user)
          })
          
          // Add test accounts
          testData.accounts.forEach((account) => {
            const accountRef = admin.firestore().collection('accounts').doc(account.id)
            batch.set(accountRef, account)
          })
          
          return batch.commit().then(() => 'Test data seeded')
        },
        
        // Performance testing helpers
        measurePageLoadTime(url: string) {
          const { performance } = import('perf_hooks')
          import puppeteer from 'puppeteer'
          
          return puppeteer.launch({ headless: true })
            .then((browser) => {
              return browser.newPage()
                .then((page) => {
                  const start = performance.now()
                  return page.goto(url)
                    .then(() => {
                      const end = performance.now()
                      return browser.close().then(() => ({
                        loadTime: end - start,
                        url
                      }))
                    })
                })
            })
        },
        
        // Screenshot comparison for visual regression testing
        compareScreenshots(baseline: string, current: string) {
          import pixelmatch from 'pixelmatch';
          import fs from 'fs';
          const { PNG } = import('pngjs');
          
          const baselineImg = PNG.sync.read(fs.readFileSync(baseline))
          const currentImg = PNG.sync.read(fs.readFileSync(current))
          const { width, height } = baselineImg
          const diff = new PNG({ width, height })
          
          const numDiffPixels = pixelmatch(
            baselineImg.data,
            currentImg.data,
            diff.data,
            width,
            height,
            { threshold: 0.1 }
          )
          
          const diffPath = current.replace('.png', '-diff.png')
          fs.writeFileSync(diffPath, PNG.sync.write(diff))
          
          return {
            diffPixels: numDiffPixels,
            diffPercentage: (numDiffPixels / (width * height)) * 100,
            diffPath
          }
        }
      })
      
      // Code coverage
      import('@cypress/code-coverage/task')(_on, _config)
      
      return config
    }
  }
})
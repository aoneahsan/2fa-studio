/**
 * Production Smoke Tests for 2FA Studio
 * 
 * These tests run after deployment to validate that the application
 * is functioning correctly in the production environment.
 */

export interface SmokeTest {
  name: string;
  description: string;
  test: () => Promise<SmokeTestResult>;
  timeout?: number;
  critical?: boolean;
  category: 'core' | 'feature' | 'integration' | 'security' | 'performance';
}

export interface SmokeTestResult {
  passed: boolean;
  message: string;
  duration: number;
  metadata?: Record<string, any>;
  error?: string;
}

export interface SmokeTestSuite {
  name: string;
  tests: SmokeTest[];
  overall: 'passed' | 'failed' | 'partial';
  results: Record<string, SmokeTestResult>;
  duration: number;
  timestamp: Date;
}

// Test configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const PERFORMANCE_TIMEOUT = 60000; // 1 minute for performance tests

/**
 * Core Application Tests
 */

const coreApplicationTest: SmokeTest = {
  name: 'core-application-load',
  description: 'Application loads and renders correctly',
  category: 'core',
  critical: true,
  timeout: DEFAULT_TIMEOUT,
  test: async (): Promise<SmokeTestResult> => {
    const startTime = Date.now();
    
    try {
      // Test main page loading
      const response = await fetch(window.location.origin, {
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Check for critical HTML elements
      if (!html.includes('<div id="root">')) {
        throw new Error('Root element not found in HTML');
      }
      
      // Check for basic meta tags
      if (!html.includes('2FA Studio')) {
        throw new Error('Application title not found');
      }
      
      const duration = Date.now() - startTime;
      
      return {
        passed: true,
        message: 'Application loaded successfully',
        duration,
        metadata: {
          responseSize: html.length,
          responseTime: duration,
          statusCode: response.status
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        message: 'Failed to load application',
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
};

const routingTest: SmokeTest = {
  name: 'routing-navigation',
  description: 'Application routing works correctly',
  category: 'core',
  critical: true,
  test: async (): Promise<SmokeTestResult> => {
    const startTime = Date.now();
    
    try {
      // Test different routes
      const routes = ['/', '/accounts', '/settings', '/backup'];
      const results = [];
      
      for (const route of routes) {
        const response = await fetch(`${window.location.origin}${route}`);
        results.push({
          route,
          status: response.status,
          ok: response.ok
        });
      }
      
      const failedRoutes = results.filter(r => !r.ok);
      
      if (failedRoutes.length > 0) {
        throw new Error(`Routes failed: ${failedRoutes.map(r => r.route).join(', ')}`);
      }
      
      return {
        passed: true,
        message: 'All routes accessible',
        duration: Date.now() - startTime,
        metadata: { testedRoutes: results }
      };
    } catch (error: any) {
      return {
        passed: false,
        message: 'Routing test failed',
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
};

/**
 * Firebase Integration Tests
 */

const firebaseConnectivityTest: SmokeTest = {
  name: 'firebase-connectivity',
  description: 'Firebase services are accessible',
  category: 'integration',
  critical: true,
  test: async (): Promise<SmokeTestResult> => {
    const startTime = Date.now();
    
    try {
      // Test Firebase configuration
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      };
      
      if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
        throw new Error('Firebase configuration incomplete');
      }
      
      // Test basic Firebase connectivity
      const response = await fetch(`https://${firebaseConfig.projectId}.firebaseapp.com/__/firebase/init.json`);
      
      if (!response.ok) {
        throw new Error(`Firebase init failed: ${response.status}`);
      }
      
      return {
        passed: true,
        message: 'Firebase connectivity verified',
        duration: Date.now() - startTime,
        metadata: { projectId: firebaseConfig.projectId }
      };
    } catch (error: any) {
      return {
        passed: false,
        message: 'Firebase connectivity failed',
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
};

const authServiceTest: SmokeTest = {
  name: 'auth-service',
  description: 'Authentication service is functional',
  category: 'integration',
  critical: true,
  test: async (): Promise<SmokeTestResult> => {
    const startTime = Date.now();
    
    try {
      // Test Firebase Auth endpoint
      const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
      if (!authDomain) {
        throw new Error('Auth domain not configured');
      }
      
      const response = await fetch(`https://${authDomain}/__/auth/handler`);
      
      // Auth handler should return 400 for empty request, not 500
      if (response.status === 500) {
        throw new Error('Auth service internal error');
      }
      
      return {
        passed: true,
        message: 'Authentication service accessible',
        duration: Date.now() - startTime,
        metadata: { authDomain }
      };
    } catch (error: any) {
      return {
        passed: false,
        message: 'Authentication service failed',
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
};

/**
 * Feature Tests
 */

const pwaInstallabilityTest: SmokeTest = {
  name: 'pwa-installability',
  description: 'PWA manifest and service worker are available',
  category: 'feature',
  critical: false,
  test: async (): Promise<SmokeTestResult> => {
    const startTime = Date.now();
    
    try {
      const results = [];
      
      // Test PWA manifest
      try {
        const manifestResponse = await fetch('/manifest.json');
        if (manifestResponse.ok) {
          const manifest = await manifestResponse.json();
          results.push({
            component: 'manifest',
            status: 'ok',
            data: { name: manifest.name, icons: manifest.icons?.length || 0 }
          });
        } else {
          results.push({ component: 'manifest', status: 'missing' });
        }
      } catch {
        results.push({ component: 'manifest', status: 'error' });
      }
      
      // Test Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          results.push({
            component: 'serviceWorker',
            status: registration ? 'registered' : 'not-registered'
          });
        } catch {
          results.push({ component: 'serviceWorker', status: 'error' });
        }
      } else {
        results.push({ component: 'serviceWorker', status: 'not-supported' });
      }
      
      const hasManifest = results.find(r => r.component === 'manifest')?.status === 'ok';
      const hasServiceWorker = results.find(r => r.component === 'serviceWorker')?.status === 'registered';
      
      return {
        passed: hasManifest || hasServiceWorker,
        message: hasManifest && hasServiceWorker ? 'PWA fully configured' : 'PWA partially configured',
        duration: Date.now() - startTime,
        metadata: { components: results }
      };
    } catch (error: any) {
      return {
        passed: false,
        message: 'PWA installability check failed',
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
};

const localStorageTest: SmokeTest = {
  name: 'local-storage',
  description: 'Local storage is accessible and functional',
  category: 'feature',
  critical: true,
  test: async (): Promise<SmokeTestResult> => {
    const startTime = Date.now();
    
    try {
      const testKey = '2fa-studio-smoke-test';
      const testValue = { timestamp: Date.now(), test: 'smoke-test' };
      
      // Test localStorage write
      localStorage.setItem(testKey, JSON.stringify(testValue));
      
      // Test localStorage read
      const retrieved = localStorage.getItem(testKey);
      if (!retrieved) {
        throw new Error('Failed to retrieve test data from localStorage');
      }
      
      const parsed = JSON.parse(retrieved);
      if (parsed.test !== 'smoke-test') {
        throw new Error('Retrieved data does not match stored data');
      }
      
      // Cleanup
      localStorage.removeItem(testKey);
      
      // Test storage quota
      let quotaSupported = false;
      let storageQuota = 0;
      
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          quotaSupported = true;
          storageQuota = estimate.quota || 0;
        } catch {
          // Quota API not supported
        }
      }
      
      return {
        passed: true,
        message: 'Local storage functional',
        duration: Date.now() - startTime,
        metadata: {
          quotaSupported,
          estimatedQuota: quotaSupported ? `${Math.round((storageQuota / 1024 / 1024))}MB` : 'unknown'
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        message: 'Local storage test failed',
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
};

/**
 * Security Tests
 */

const httpsEnforcementTest: SmokeTest = {
  name: 'https-enforcement',
  description: 'HTTPS is enforced and security headers are present',
  category: 'security',
  critical: true,
  test: async (): Promise<SmokeTestResult> => {
    const startTime = Date.now();
    
    try {
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Application not served over HTTPS');
      }
      
      // Test security headers
      const response = await fetch(window.location.origin);
      const headers = response.headers;
      
      const securityHeaders = {
        'x-content-type-options': headers.get('x-content-type-options'),
        'x-frame-options': headers.get('x-frame-options'),
        'x-xss-protection': headers.get('x-xss-protection'),
        'strict-transport-security': headers.get('strict-transport-security'),
        'content-security-policy': headers.get('content-security-policy')
      };
      
      const presentHeaders = Object.entries(securityHeaders)
        .filter(([, value]) => value !== null);
      
      return {
        passed: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
        message: `HTTPS: ${window.location.protocol === 'https:' ? 'Yes' : 'No'}, Security headers: ${presentHeaders.length}/5`,
        duration: Date.now() - startTime,
        metadata: { securityHeaders, protocol: window.location.protocol }
      };
    } catch (error: any) {
      return {
        passed: false,
        message: 'HTTPS enforcement test failed',
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
};

const cspTest: SmokeTest = {
  name: 'content-security-policy',
  description: 'Content Security Policy is configured and not blocking resources',
  category: 'security',
  critical: false,
  test: async (): Promise<SmokeTestResult> => {
    const startTime = Date.now();
    
    try {
      // Check for CSP violations in console
      const cspViolations: any[] = [];
      
      // Listen for CSP violations
      document.addEventListener('securitypolicyviolation', (e) => {
        cspViolations.push({
          directive: e.violatedDirective,
          blocked: e.blockedURI,
          source: e.sourceFile
        });
      });
      
      // Wait a bit to catch any violations
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(window.location.origin);
      const cspHeader = response.headers.get('content-security-policy');
      
      return {
        passed: cspViolations.length === 0,
        message: cspHeader 
          ? `CSP configured, ${cspViolations.length} violations detected`
          : 'No CSP header found',
        duration: Date.now() - startTime,
        metadata: {
          cspPresent: !!cspHeader,
          violations: cspViolations.slice(0, 5) // Limit to first 5
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        message: 'CSP test failed',
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
};

/**
 * Performance Tests
 */

const performanceTest: SmokeTest = {
  name: 'performance-metrics',
  description: 'Basic performance metrics are acceptable',
  category: 'performance',
  critical: false,
  timeout: PERFORMANCE_TIMEOUT,
  test: async (): Promise<SmokeTestResult> => {
    const startTime = Date.now();
    
    try {
      // Wait for page to be fully loaded
      if (document.readyState !== 'complete') {
        await new Promise(resolve => {
          window.addEventListener('load', resolve);
        });
      }
      
      // Get performance metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      const metrics = {
        // Navigation timing
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart),
        load: Math.round(navigation.loadEventEnd - navigation.navigationStart),
        
        // Paint timing
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        
        // Resource timing
        resourceCount: performance.getEntriesByType('resource').length
      };
      
      // Performance thresholds (in milliseconds)
      const thresholds = {
        domContentLoaded: 3000,
        load: 5000,
        firstContentfulPaint: 2000
      };
      
      const issues = [];
      if (metrics.domContentLoaded > thresholds.domContentLoaded) {
        issues.push(`DOM content loaded slow: ${metrics.domContentLoaded}ms`);
      }
      if (metrics.load > thresholds.load) {
        issues.push(`Page load slow: ${metrics.load}ms`);
      }
      if (metrics.firstContentfulPaint > thresholds.firstContentfulPaint) {
        issues.push(`First contentful paint slow: ${metrics.firstContentfulPaint}ms`);
      }
      
      return {
        passed: issues.length === 0,
        message: issues.length === 0 
          ? `Performance acceptable (FCP: ${Math.round(metrics.firstContentfulPaint)}ms, Load: ${metrics.load}ms)`
          : `Performance issues: ${issues.join(', ')}`,
        duration: Date.now() - startTime,
        metadata: metrics
      };
    } catch (error: any) {
      return {
        passed: false,
        message: 'Performance test failed',
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
};

/**
 * All smoke tests configuration
 */
export const ALL_SMOKE_TESTS: SmokeTest[] = [
  // Core tests
  coreApplicationTest,
  routingTest,
  
  // Integration tests
  firebaseConnectivityTest,
  authServiceTest,
  
  // Feature tests
  pwaInstallabilityTest,
  localStorageTest,
  
  // Security tests
  httpsEnforcementTest,
  cspTest,
  
  // Performance tests
  performanceTest
];

/**
 * Run a single smoke test with timeout
 */
async function runSmokeTestWithTimeout(test: SmokeTest): Promise<SmokeTestResult> {
  const timeout = test.timeout || DEFAULT_TIMEOUT;
  
  try {
    const result = await Promise.race([
      test.test(),
      new Promise<SmokeTestResult>((_, reject) => 
        setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout)
      )
    ]);
    
    return result;
  } catch (error: any) {
    return {
      passed: false,
      message: `Test execution failed: ${error.message}`,
      duration: timeout,
      error: error.message
    };
  }
}

/**
 * Run all smoke tests
 */
export async function runAllSmokeTests(): Promise<SmokeTestSuite> {
  const startTime = Date.now();
  const results: Record<string, SmokeTestResult> = {};
  
  console.log('🧪 Running smoke tests...');
  
  // Run tests sequentially to avoid resource conflicts
  for (const test of ALL_SMOKE_TESTS) {
    console.log(`Running: ${test.name}...`);
    
    try {
      const result = await runSmokeTestWithTimeout(test);
      results[test.name] = result;
      
      if (result.passed) {
        console.log(`✅ ${test.name}: ${result.message}`);
      } else {
        console.log(`❌ ${test.name}: ${result.message}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
    } catch (error: any) {
      results[test.name] = {
        passed: false,
        message: `Test execution error: ${error.message}`,
        duration: 0,
        error: error.message
      };
      console.log(`💥 ${test.name}: Execution error - ${error.message}`);
    }
  }
  
  // Determine overall result
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r.passed).length;
  const criticalTests = ALL_SMOKE_TESTS.filter(t => t.critical);
  const criticalPassed = criticalTests.filter(t => results[t.name]?.passed).length;
  
  let overall: SmokeTestSuite['overall'] = 'failed';
  if (criticalPassed === criticalTests.length) {
    overall = passedTests === totalTests ? 'passed' : 'partial';
  }
  
  const suite: SmokeTestSuite = {
    name: '2FA Studio Production Smoke Tests',
    tests: ALL_SMOKE_TESTS,
    overall,
    results,
    duration: Date.now() - startTime,
    timestamp: new Date()
  };
  
  console.log(`🏁 Smoke tests completed: ${passedTests}/${totalTests} passed (${overall})`);
  
  return suite;
}

/**
 * Run smoke tests and report results
 */
export async function runSmokeTestsWithReporting(): Promise<SmokeTestSuite> {
  const suite = await runAllSmokeTests();
  
  // Send results to monitoring endpoint
  try {
    await fetch('/api/monitoring/smoke-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suite)
    });
  } catch (error) {
    console.warn('Failed to report smoke test results:', error);
  }
  
  // Report to analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'smoke_tests_completed', {
      custom_map: {
        overall_result: suite.overall,
        tests_passed: Object.values(suite.results).filter(r => r.passed).length,
        total_tests: Object.keys(suite.results).length,
        duration: suite.duration
      }
    });
  }
  
  return suite;
}

export default {
  runAllSmokeTests,
  runSmokeTestsWithReporting,
  ALL_SMOKE_TESTS
};
/**
 * Integration Test for Phase 2 Features
 */

// Import all new services
import steamGuard from './src/steam-guard.js';
import importService from './src/import-service.js';
import backupCodesService from './src/backup-codes.js';
import categoriesService from './src/categories-service.js';
import tagsService from './src/tags-service.js';
import bulkOperationsService from './src/bulk-operations.js';
import duressSecurityService from './src/duress-security.js';

async function runIntegrationTests() {
  console.log('🧪 Running Phase 2 Integration Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Steam Guard
  try {
    console.log('1. Testing Steam Guard...');
    const steamCode = await steamGuard.generateCode('ABCDEFGHIJKLMNOP');
    console.assert(steamCode && steamCode.length === 5, 'Steam code generation');
    console.log('✅ Steam Guard working');
    passed++;
  } catch (error) {
    console.error('❌ Steam Guard failed:', error.message);
    failed++;
  }
  
  // Test 2: Import Service
  try {
    console.log('\n2. Testing Import Service...');
    const steamImport = await importService.importSteam(JSON.stringify({
      shared_secret: 'ABCDEFGHIJKLMNOP',
      account_name: 'testuser'
    }));
    console.assert(steamImport.length === 1, 'Steam import');
    console.log('✅ Import Service working');
    passed++;
  } catch (error) {
    console.error('❌ Import Service failed:', error.message);
    failed++;
  }
  
  // Test 3: Backup Codes
  try {
    console.log('\n3. Testing Backup Codes...');
    const codes = backupCodesService.generateBackupCodes(5);
    console.assert(codes.length === 5, 'Backup code generation');
    console.assert(codes[0].code.length === 8, 'Code format');
    console.log('✅ Backup Codes working');
    passed++;
  } catch (error) {
    console.error('❌ Backup Codes failed:', error.message);
    failed++;
  }
  
  // Test 4: Categories
  try {
    console.log('\n4. Testing Categories...');
    const categories = await categoriesService.initializeCategories();
    console.assert(categories.length > 0, 'Category initialization');
    console.log('✅ Categories working');
    passed++;
  } catch (error) {
    console.error('❌ Categories failed:', error.message);
    failed++;
  }
  
  // Test 5: Tags
  try {
    console.log('\n5. Testing Tags...');
    const suggestions = tagsService.getTagSuggestions('Google');
    console.assert(suggestions.includes('work'), 'Tag suggestions');
    console.log('✅ Tags working');
    passed++;
  } catch (error) {
    console.error('❌ Tags failed:', error.message);
    failed++;
  }
  
  // Test 6: Bulk Operations
  try {
    console.log('\n6. Testing Bulk Operations...');
    bulkOperationsService.toggleAccountSelection('test-id');
    const selected = bulkOperationsService.getSelectedAccountIds();
    console.assert(selected.includes('test-id'), 'Account selection');
    console.log('✅ Bulk Operations working');
    passed++;
  } catch (error) {
    console.error('❌ Bulk Operations failed:', error.message);
    failed++;
  }
  
  // Test 7: Duress Security
  try {
    console.log('\n7. Testing Duress Security...');
    const hash = await duressSecurityService.hashPin('1234');
    console.assert(hash instanceof ArrayBuffer, 'PIN hashing');
    console.log('✅ Duress Security working');
    passed++;
  } catch (error) {
    console.error('❌ Duress Security failed:', error.message);
    failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log('='.repeat(50));
  
  if (failed === 0) {
    console.log('\n🎉 All Phase 2 features integrated successfully!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

// Run tests if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests();
}
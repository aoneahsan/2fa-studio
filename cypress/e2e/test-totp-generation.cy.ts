import * as OTPAuth from 'otpauth';

describe('TOTP Generation Test', () => {
  it('should generate TOTP codes correctly', () => {
    // Test secret
    const secret = 'JBSWY3DPEHPK3PXP';
    
    // Create TOTP instance
    const totp = new OTPAuth.TOTP({
      issuer: 'Test Issuer',
      label: 'Test Account',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });

    // Generate code
    const code = totp.generate();
    
    // Verify code format
    expect(code).to.match(/^\d{6}$/);
    cy.log(`Generated TOTP code: ${code}`);
    
    // Test with different timestamp
    const futureTime = Date.now() + 30000; // 30 seconds in future
    const futureCode = totp.generate({ timestamp: futureTime });
    
    expect(futureCode).to.match(/^\d{6}$/);
    cy.log(`Future TOTP code: ${futureCode}`);
    
    // Codes should be different (most of the time)
    // Note: There's a small chance they could be the same at period boundary
    cy.log(`Codes are different: ${code !== futureCode}`);
  });

  it('should handle different TOTP configurations', () => {
    const configs = [
      { digits: 6, period: 30, algorithm: 'SHA1' },
      { digits: 8, period: 60, algorithm: 'SHA256' },
      { digits: 6, period: 30, algorithm: 'SHA512' }
    ];

    configs.forEach(config => {
      const totp = new OTPAuth.TOTP({
        issuer: 'Test',
        label: 'Test',
        secret: 'JBSWY3DPEHPK3PXP',
        ...config
      });

      const code = totp.generate();
      const expectedLength = config.digits;
      
      expect(code).to.have.length(expectedLength);
      expect(code).to.match(/^\d+$/);
      
      cy.log(`Config: ${JSON.stringify(config)} => Code: ${code}`);
    });
  });

  it('should validate TOTP codes', () => {
    const totp = new OTPAuth.TOTP({
      issuer: 'Test',
      label: 'Test',
      secret: 'JBSWY3DPEHPK3PXP',
      digits: 6,
      period: 30
    });

    const validCode = totp.generate();
    
    // Validate the current code
    const delta = totp.validate({ token: validCode });
    expect(delta).to.not.be.null;
    expect(delta).to.equal(0); // Current time window
    
    cy.log(`Valid code ${validCode} has delta: ${delta}`);
    
    // Invalid code should return null
    const invalidDelta = totp.validate({ token: '000000' });
    expect(invalidDelta).to.be.null;
    
    cy.log('Invalid code validation returned null as expected');
  });
});
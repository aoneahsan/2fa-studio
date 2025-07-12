# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The 2FA Studio team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.

To report a security vulnerability, please use the following process:

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Email your findings to `security@2fastudio.app` (replace with actual email)
3. Encrypt your message using our PGP key (available at [link to key])

### What to Include in Your Report

Please include the following details:
- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Timeline**: Depends on severity
  - Critical: 7-14 days
  - High: 14-30 days
  - Medium: 30-60 days
  - Low: 60-90 days

## Security Best Practices

### For Users

1. **Keep the App Updated**: Always use the latest version
2. **Secure Your Device**: Use device lock screens and biometric authentication
3. **Backup Safely**: Use encrypted backups only
4. **Verify Sources**: Only download from official sources
5. **Report Suspicious Activity**: Contact us if you notice anything unusual

### For Developers

1. **Encryption Standards**
   - Use AES-256-GCM for secret encryption
   - Implement proper key derivation (PBKDF2 with minimum 100,000 iterations)
   - Never store encryption keys in source code

2. **Authentication**
   - Implement rate limiting on all authentication endpoints
   - Use secure session management
   - Enforce strong password policies

3. **Data Protection**
   - Never log sensitive information
   - Implement certificate pinning for mobile apps
   - Use secure communication channels (HTTPS/WSS)

4. **Code Security**
   - Regular dependency updates
   - Static code analysis in CI/CD
   - Security testing before releases

## Security Features

### Current Implementation

- **End-to-End Encryption**: All 2FA secrets encrypted locally
- **Biometric Protection**: Optional biometric authentication
- **Secure Backup**: Encrypted cloud backups
- **Zero-Knowledge Architecture**: Server never has access to decryption keys
- **Session Management**: Automatic session expiry and device management

### Planned Enhancements

- Hardware security module support
- Advanced threat detection
- Security audit logging
- Penetration testing certification

## Disclosure Policy

When we receive a security report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release patches as soon as possible

We will credit reporters who follow responsible disclosure practices in our release notes, unless they prefer to remain anonymous.

## Security Advisories

Security advisories will be published on:
- GitHub Security Advisories
- Our official blog
- Email to registered users (for critical issues)

## Contact

For any security-related questions or concerns, please contact:
- Email: security@2fastudio.app
- PGP Key: [Link to PGP key]

Thank you for helping keep 2FA Studio and our users safe!
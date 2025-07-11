# 2FA Studio

<div align="center">
  <img src="public/logo.png" alt="2FA Studio Logo" width="120" height="120" />
  
  <h3>Secure Two-Factor Authentication Manager</h3>
  
  <p>
    A modern, secure, and user-friendly 2FA code manager with end-to-end encryption,
    cross-platform support, and seamless browser integration.
  </p>

  <p>
    <a href="#features">Features</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#documentation">Documentation</a> •
    <a href="#contributing">Contributing</a> •
    <a href="#license">License</a>
  </p>

  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
  ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
  ![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=flat&logo=capacitor&logoColor=white)
  ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
  ![License](https://img.shields.io/badge/license-MIT-blue.svg)
</div>

## 🚀 Features

### Core Features
- **🔐 TOTP/HOTP Support** - Generate time-based and counter-based one-time passwords
- **📱 QR Code Scanner** - Quickly add accounts by scanning QR codes
- **🔒 End-to-End Encryption** - AES-256-GCM encryption with PBKDF2 key derivation
- **👆 Biometric Authentication** - Secure access with fingerprint or face recognition
- **🌐 Cross-Platform** - Available on iOS, Android, and Web

### Advanced Features
- **☁️ Google Drive Backup** - Encrypted cloud backups with automatic sync
- **🔄 Import/Export** - Transfer accounts between devices securely
- **🏷️ Tags & Organization** - Organize accounts with custom tags
- **🎨 Dark Mode** - Beautiful UI with light and dark themes
- **🌍 Multi-Language** - Support for multiple languages

### Security Features
- **🛡️ Zero-Knowledge Architecture** - We never have access to your codes or encryption keys
- **🔑 Device Management** - Monitor and control all logged-in devices
- **⏰ Auto-Lock** - Automatic security lock with customizable timeout
- **🚨 Duress Mode** - Hidden vault for emergency situations

### Premium Features
- **♾️ Unlimited Accounts** - No limits on the number of 2FA accounts
- **🚫 Ad-Free Experience** - No advertisements
- **⚡ Priority Support** - Get help when you need it
- **📊 Advanced Analytics** - Track usage patterns and security metrics

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Mobile**: Capacitor.js
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **State Management**: Redux Toolkit
- **Routing**: React Router v7
- **Build Tool**: Vite
- **Testing**: Vitest, Cypress
- **Documentation**: Docusaurus

## 📋 Prerequisites

- Node.js 18+ 
- Yarn 1.22+
- Git
- Firebase account
- Google Cloud account (for Drive backup)

## 🚀 Getting Started

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/2fa-studio.git
cd 2fa-studio

# Run automated setup
yarn install
yarn setup
```

### Manual Setup

1. **Install dependencies**
   ```bash
   yarn install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up Firebase**
   - Create a Firebase project
   - Enable Authentication, Firestore, and Storage
   - Add your Firebase config to `.env`

4. **Start development server**
   ```bash
   yarn dev
   ```

## 📱 Mobile Development

### Android
```bash
# Add Android platform
npx cap add android

# Open in Android Studio
yarn cap:android
```

### iOS
```bash
# Add iOS platform
npx cap add ios

# Open in Xcode
yarn cap:ios
```

## 🧪 Testing

```bash
# Run unit tests
yarn test

# Run E2E tests
yarn test:e2e

# Run tests in watch mode
yarn test:watch
```

## 📦 Building

```bash
# Build for production
yarn build

# Preview production build
yarn preview

# Build for mobile
yarn cap:sync
```

## 🚀 Deployment

### Web Deployment
The web app can be deployed to any static hosting service:
- Vercel
- Netlify
- Firebase Hosting
- AWS S3 + CloudFront

### Mobile Deployment
Follow the standard iOS and Android deployment processes:
- iOS: App Store Connect
- Android: Google Play Console

## 📖 Documentation

Full documentation is available at [docs/](./docs/) or visit our [documentation site](#).

### Key Documentation
- [Development Guide](./docs/DEVELOPMENT_PLAN.md)
- [API Reference](./docs/api/)
- [Security Architecture](./docs/security/)
- [Contributing Guide](./CONTRIBUTING.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔒 Security

Security is our top priority. If you discover a security vulnerability, please email security@2fastudio.app.

See our [Security Policy](./SECURITY.md) for more details.

## 👨‍💻 Developer

**Ahsan Mahmood**

- 🌐 Website: [https://aoneahsan.com](https://aoneahsan.com)
- 📧 Email: [aoneahsan@gmail.com](mailto:aoneahsan@gmail.com)
- 💼 LinkedIn: [https://linkedin.com/in/aoneahsan](https://linkedin.com/in/aoneahsan)

## 🙏 Acknowledgments

- Built with ❤️ using React and Capacitor
- Icons by [Heroicons](https://heroicons.com)
- Inspired by leading 2FA apps

---

<div align="center">
  Made with ❤️ by <a href="https://aoneahsan.com">Ahsan Mahmood</a>
</div>
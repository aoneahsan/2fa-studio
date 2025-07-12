# Contributing to 2FA Studio

First off, thank you for considering contributing to 2FA Studio! It's people like you that make 2FA Studio such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please report unacceptable behavior to [project email].

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots and animated GIFs** if possible
- **Include details about your environment** (OS, browser, device)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and explain which behavior you expected to see instead**
- **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Process

1. **Setup Development Environment**
   ```bash
   git clone https://github.com/yourusername/2fa-studio.git
   cd 2fa-studio
   yarn install
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow the existing code style
   - Write meaningful commit messages
   - Add tests for new functionality
   - Update documentation as needed

4. **Run Tests and Linting**
   ```bash
   yarn test
   yarn lint
   yarn typecheck
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### JavaScript/TypeScript Styleguide

- Use TypeScript for all new code
- Follow the existing ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep files under 500 lines (create smaller, reusable components)

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use named exports for better refactoring support
- Place component files in appropriate directories

### Testing

- Write unit tests for utility functions
- Write integration tests for critical user flows
- Use meaningful test descriptions
- Follow the AAA pattern (Arrange, Act, Assert)

## Project Structure

```
2fa-studio/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── services/      # Business logic and API calls
│   ├── hooks/         # Custom React hooks
│   ├── utils/         # Utility functions
│   └── types/         # TypeScript type definitions
├── public/            # Static assets
├── docs/             # Documentation
└── tests/            # Test files
```

## Additional Notes

### Security Considerations

Given the sensitive nature of 2FA applications:
- Never log or expose secret keys
- Always use encryption for sensitive data
- Follow OWASP guidelines
- Report security vulnerabilities privately

### Dependencies

- Always use `yarn` for package management
- Update dependencies to latest versions regularly
- Document why specific versions are pinned (if any)

### Questions?

Feel free to open an issue with your question or reach out to the maintainers directly.

Thank you for contributing! 🎉
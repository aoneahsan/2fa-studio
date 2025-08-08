# BuildKit UI Service

## Overview

The `BuildKitUIService` provides UI components and utilities using the `buildkit-ui` package (v1.3.0). It offers a comprehensive component library with built-in theming.

## Features

- ✅ Pre-built components
- ✅ Theme system
- ✅ Responsive design
- ✅ Accessibility support
- ✅ Animation utilities
- ✅ Form components

## Component Migration

### Button Component

```typescript
// Old Button
<Button variant="primary">Click me</Button>

// BuildKit Button
<BuildKitButton variant="primary">Click me</BuildKitButton>
```

### Card Component

```typescript
// BuildKit Card
<BuildKitCard
  title="Account"
  description="Google - john@example.com"
  image="/icons/google.png"
  onClick={handleClick}
/>
```

## Theme Configuration

```typescript
import { BuildKitUIService } from '@services/buildkit-ui.service';

// Initialize theme
BuildKitUIService.initialize({
  theme: 'light',
  primaryColor: '#1976d2',
  borderRadius: 'md'
});

// Change theme
await BuildKitUIService.setTheme('dark');
```

## Usage Examples

### Form with BuildKit

```typescript
import { Form, Input, Button } from 'buildkit-ui';

export function LoginForm() {
  return (
    <Form onSubmit={handleSubmit}>
      <Input
        name="email"
        type="email"
        label="Email"
        required
      />
      <Input
        name="password"
        type="password"
        label="Password"
        required
      />
      <Button type="submit" variant="primary">
        Sign In
      </Button>
    </Form>
  );
}
```

## Best Practices

1. **Use theme variables** for consistency
2. **Follow component patterns** from BuildKit
3. **Leverage built-in animations** for polish
4. **Test accessibility** features
5. **Use responsive utilities** for mobile
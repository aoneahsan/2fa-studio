# BuildKit UI Migration Guide

## Overview
This guide helps migrate existing UI components to use buildkit-ui v1.3.0 components.

## Component Mapping

### Buttons
- Replace `<button className="...">` with `<Button variant="primary|secondary|ghost">`
- Replace icon buttons with `<IconButton icon="..." />`

### Forms
- Replace `<input>` with `<Input type="..." placeholder="..." />`
- Replace `<select>` with `<Dropdown options={[...]} />`
- Replace checkboxes with `<Switch checked={...} onChange={...} />`

### Layout Components
- Replace custom cards with `<Card padding="sm|md|lg">`
- Replace custom modals with `<Modal isOpen={...} onClose={...}>`
- Replace tab implementations with `<Tabs items={[...]} />`

### Feedback Components
- Replace custom alerts with `<Alert type="info|warning|error|success">`
- Replace loading spinners with `<Spinner size="sm|md|lg" />`
- Replace progress bars with `<Progress value={...} max={...} />`

## Migration Steps

### 1. Update LoadingSpinner.tsx
```tsx
// Before
export const LoadingSpinner = () => (
  <div className="spinner">...</div>
);

// After
import { Spinner } from '@services/buildkit-ui.service';

export const LoadingSpinner = () => (
  <Spinner size="md" />
);
```

### 2. Update ToastContainer.tsx
```tsx
// Before
export const ToastContainer = () => {
  // Custom toast implementation
};

// After
import { Toast, useToast } from '@services/buildkit-ui.service';

export const ToastContainer = () => {
  const { toasts } = useToast();
  return <Toast.Container toasts={toasts} />;
};
```

### 3. Update Form Components
```tsx
// Before
<input 
  type="email" 
  className="form-input" 
  value={email} 
  onChange={(e) => setEmail(e.target.value)}
/>

// After
import { Input } from '@services/buildkit-ui.service';

<Input
  type="email"
  value={email}
  onChange={setEmail}
  placeholder="Enter email"
  error={emailError}
/>
```

### 4. Update Card Components
```tsx
// Before
<div className="card">
  <h3>{title}</h3>
  <p>{content}</p>
</div>

// After
import { Card } from '@services/buildkit-ui.service';

<Card padding="md">
  <Card.Header>{title}</Card.Header>
  <Card.Body>{content}</Card.Body>
</Card>
```

## Theme Integration

### 1. Wrap App with ThemeProvider
```tsx
import { ThemeProvider, buildkitTheme } from '@services/buildkit-ui.service';

function App() {
  return (
    <ThemeProvider theme={buildkitTheme}>
      {/* Your app content */}
    </ThemeProvider>
  );
}
```

### 2. Use Theme Hook
```tsx
import { useTheme } from '@services/buildkit-ui.service';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  // Use theme values
}
```

## Animation Presets

### Fade In Animation
```tsx
import { animationPresets } from '@services/buildkit-ui.service';

<div className={animationPresets.fadeIn}>
  Content that fades in
</div>
```

### Slide In Animation
```tsx
<Modal 
  isOpen={isOpen}
  animation={animationPresets.slideIn}
>
  Modal content
</Modal>
```

## Best Practices

1. **Consistent Spacing**: Use theme spacing values (xs, sm, md, lg, xl)
2. **Color Palette**: Use theme colors for consistency
3. **Typography**: Use theme font sizes and families
4. **Animations**: Use provided animation presets
5. **Form Validation**: Use built-in validation utilities
6. **Accessibility**: BuildKit UI components are ARIA-compliant by default

## Common Patterns

### Loading States
```tsx
import { StyledComponents } from '@services/buildkit-ui.service';

{isLoading ? (
  <StyledComponents.LoadingState message="Loading accounts..." />
) : (
  // Your content
)}
```

### Security Alerts
```tsx
<StyledComponents.SecurityAlert type="warning">
  Your account requires additional verification
</StyledComponents.SecurityAlert>
```

### Account Cards
```tsx
<StyledComponents.AccountCard>
  <Badge color="primary">{account.issuer}</Badge>
  <StyledComponents.CodeDisplay code={totpCode} />
</StyledComponents.AccountCard>
```

## Performance Tips

1. Import only needed components
2. Use lazy loading for heavy components
3. Leverage built-in memoization
4. Use CSS-in-JS optimization

## Migration Checklist

- [ ] Install buildkit-ui service
- [ ] Update LoadingSpinner component
- [ ] Update ToastContainer component
- [ ] Migrate form inputs
- [ ] Migrate buttons
- [ ] Migrate cards
- [ ] Add ThemeProvider
- [ ] Update color scheme
- [ ] Test responsive behavior
- [ ] Verify accessibility
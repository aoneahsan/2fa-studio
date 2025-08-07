# BuildKit UI Migration Guide

This guide outlines the migration from custom UI components to buildkit-ui components.

## Overview

buildkit-ui v1.3.0 provides a comprehensive set of pre-built, accessible, and customizable components that can replace our custom implementations.

## Migration Strategy

1. **Phase 1**: Create wrapper components that use buildkit-ui internally
2. **Phase 2**: Update imports across the codebase
3. **Phase 3**: Remove old implementations

## Components to Migrate

### ✅ Completed

1. **Button** (`src/components/ui/button.tsx`)
   - Created `button-buildkit.tsx` wrapper
   - Maps existing props to buildkit-ui Button
   - Maintains backward compatibility

### 🔄 In Progress

2. **Card** (`src/components/ui/card.tsx`)
3. **Switch** (`src/components/ui/switch.tsx`)

### 📋 Pending

4. **Modal Components**
   - AddAccountModal
   - EditAccountModal
   - DeleteAccountDialog
   - ImportAccountsModal
   - ExportAccountsModal

5. **Form Components**
   - Input fields
   - Select dropdowns
   - Checkboxes
   - Radio buttons

6. **Layout Components**
   - Layout
   - LoadingScreen
   - LoadingSpinner

7. **Data Display**
   - AccountCard
   - TagPill
   - ToastContainer

## Migration Examples

### Button Migration

**Before:**
```tsx
import { Button } from '@components/ui/button';

<Button variant="primary" size="lg" loading>
  Submit
</Button>
```

**After:**
```tsx
import { Button } from '@components/ui/button-buildkit';

<Button variant="primary" size="lg" loading>
  Submit
</Button>
```

### Using BuildKit Theme

```tsx
import { buildkitTheme } from '@services/buildkit-ui.service';

// Access theme values
const primaryColor = buildkitTheme.colors.primary;
const spacing = buildkitTheme.spacing.md;
```

### Using BuildKit Styled Components

```tsx
import { StyledComponents } from '@services/buildkit-ui.service';

const { AccountCard, PrimaryButton, SecurityAlert } = StyledComponents;

// Use in components
<AccountCard>
  <h3>Account Name</h3>
  <PrimaryButton>Copy Code</PrimaryButton>
</AccountCard>
```

## Benefits

1. **Consistency**: Unified design system across the app
2. **Accessibility**: Built-in ARIA support and keyboard navigation
3. **Performance**: Optimized components with minimal re-renders
4. **Customization**: Easy theming and style overrides
5. **Maintenance**: Regular updates from buildkit-ui

## Testing

After migrating each component:

1. Run visual regression tests
2. Test all interactive features
3. Verify accessibility with screen readers
4. Check responsive behavior
5. Test theme switching (light/dark mode)

## Rollback Plan

If issues arise:

1. Components are created as new files (e.g., `button-buildkit.tsx`)
2. Original components remain unchanged
3. Can revert by changing imports back to original files

## Next Steps

1. Migrate Card component
2. Update AccountCard to use buildkit-ui styled components
3. Implement toast notifications with buildkit-ui Toast
4. Replace custom modals with buildkit-ui Dialog components

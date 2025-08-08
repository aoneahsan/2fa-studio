# BuildKit Utils

## Overview

BuildKit Utils combines TypeScript utilities from `ts-buildkit` and React utilities from `react-buildkit` to provide a comprehensive set of helper functions and hooks.

## TypeScript BuildKit Features

### Type Utilities

```typescript
import { types } from 'ts-buildkit';

// Deep partial
type PartialSettings = types.DeepPartial<Settings>;

// Deep readonly
type ImmutableState = types.DeepReadonly<State>;

// Nullable
type MaybeUser = types.Nullable<User>;
```

### Array Utilities

```typescript
import { arrays } from 'ts-buildkit';

// Chunk array
const chunks = arrays.chunk([1,2,3,4,5], 2);
// [[1,2], [3,4], [5]]

// Unique values
const unique = arrays.unique([1,2,2,3,3]);
// [1,2,3]

// Group by
const grouped = arrays.groupBy(users, 'role');
```

### Object Utilities

```typescript
import { objects } from 'ts-buildkit';

// Deep merge
const merged = objects.deepMerge(defaults, userConfig);

// Pick properties
const subset = objects.pick(user, ['id', 'email']);

// Omit properties
const filtered = objects.omit(user, ['password']);
```

## React BuildKit Features

### Custom Hooks

```typescript
import { hooks } from 'react-buildkit';

// Debounced value
const debouncedSearch = hooks.useDebounce(searchTerm, 500);

// Local storage
const [theme, setTheme] = hooks.useLocalStorage('theme', 'light');

// Media query
const isMobile = hooks.useMediaQuery('(max-width: 768px)');

// Previous value
const prevCount = hooks.usePrevious(count);
```

### Performance Utilities

```typescript
import { performance } from 'react-buildkit';

// Memoized callback with deps
const optimizedFn = performance.useMemoizedCallback(
  expensiveFunction,
  [dep1, dep2]
);

// Throttled function
const throttledScroll = performance.useThrottle(handleScroll, 100);
```

## Usage Examples

### Form Validation

```typescript
import { validation } from 'ts-buildkit';

const schema = validation.object({
  email: validation.string().email(),
  password: validation.string().min(8),
  age: validation.number().min(18)
});

const result = schema.validate(formData);
```

### Data Transformation

```typescript
import { arrays, objects } from 'ts-buildkit';

export function processAccounts(accounts: Account[]) {
  return arrays.unique(accounts, 'id')
    .map(account => objects.pick(account, ['id', 'issuer', 'label']))
    .sort((a, b) => a.label.localeCompare(b.label));
}
```

## Best Practices

1. **Import only what you need** for smaller bundles
2. **Use type utilities** for better type safety
3. **Leverage hooks** for common patterns
4. **Combine utilities** for complex operations
5. **Check performance** with large datasets
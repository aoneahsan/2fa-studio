import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.ts',
        '**/*.d.ts',
        'chrome-extension/',
        'dist/',
      ],
    },
    deps: {
      moduleDirectories: ['node_modules', 'src/tests/__mocks__'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@src': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@store': path.resolve(__dirname, './src/store'),
      '@app-types': path.resolve(__dirname, './src/types'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@assets': path.resolve(__dirname, './src/assets'),
      'unified-tracking': path.resolve(__dirname, './src/tests/__mocks__/unified-tracking.ts'),
      'capacitor-native-update': path.resolve(__dirname, './src/tests/__mocks__/capacitor-native-update.ts'),
      'capacitor-firebase-kit': path.resolve(__dirname, './src/tests/__mocks__/capacitor-firebase-kit.ts'),
    },
  },
});
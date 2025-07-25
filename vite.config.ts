import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { securityHeaders } from './vite-plugin-security-headers';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
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
		},
	},
	plugins: [
		react(),
		tailwindcss(),
		securityHeaders(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.ico', 'google-drive-icon.svg', 'icons/*.png'],
			manifest: false, // We already have a manifest.json
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'gstatic-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
				],
			},
		}),
	],
	build: {
		// Optimize build
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
			},
		},
		// Output configuration
		rollupOptions: {
			output: {
				// Manual chunking for better caching
				manualChunks: {
					'react-vendor': ['react', 'react-dom', 'react-router-dom'],
					'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
					firebase: [
						'firebase/app',
						'firebase/auth',
						'firebase/firestore',
						'firebase/storage',
					],
					'ui-vendor': ['@headlessui/react', '@heroicons/react'],
					crypto: ['otpauth'],
				},
				// Asset file naming
				chunkFileNames: 'assets/js/[name]-[hash].js',
				entryFileNames: 'assets/js/[name]-[hash].js',
				assetFileNames: ({ name }) => {
					if (/\.(gif|jpe?g|png|svg)$/.test(name ?? '')) {
						return 'assets/images/[name]-[hash][extname]';
					}
					if (/\.css$/.test(name ?? '')) {
						return 'assets/css/[name]-[hash][extname]';
					}
					return 'assets/[name]-[hash][extname]';
				},
			},
		},
		// Chunk size warning limit (in kB)
		chunkSizeWarningLimit: 1000,
		// Enable source maps for production debugging
		sourcemap: true,
		// Target modern browsers
		target: 'es2020',
		// CSS code splitting
		cssCodeSplit: true,
	},
	// Development server configuration
	server: {
		port: 7949,
		strictPort: true,
		hmr: {
			overlay: false,
		},
	},
	// Preview server configuration
	preview: {
		port: 7948,
		strictPort: true,
	},
});

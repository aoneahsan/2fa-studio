/**
 * Comprehensive Icon System Types
 * Supports all aspects of icon management, themes, analytics, and cross-platform compatibility
 */

export interface ServiceIcon {
  /** Unique identifier for the icon */
  id: string;
  
  /** Service name (e.g., 'Google', 'GitHub', 'Microsoft') */
  name: string;
  
  /** Alternative names and variations */
  aliases: string[];
  
  /** Service category */
  category: IconCategory;
  
  /** Icon variants for different themes and formats */
  variants: IconVariant[];
  
  /** Brand information */
  brand: BrandInfo;
  
  /** SEO and search metadata */
  metadata: IconMetadata;
  
  /** Usage statistics */
  analytics: IconAnalytics;
  
  /** Quality and compliance information */
  quality: IconQuality;
  
  /** Creation and update timestamps */
  createdAt: number;
  updatedAt: number;
}

export interface IconVariant {
  /** Variant type */
  type: IconVariantType;
  
  /** Icon format */
  format: IconFormat;
  
  /** Icon size */
  size: IconSize;
  
  /** Theme compatibility */
  theme: IconTheme;
  
  /** Icon URL or data URI */
  url: string;
  
  /** File size in bytes */
  fileSize: number;
  
  /** Checksum for integrity verification */
  checksum: string;
  
  /** CDN URLs for different regions */
  cdnUrls: Record<string, string>;
  
  /** Optimization flags */
  optimized: boolean;
  compressed: boolean;
  
  /** Accessibility information */
  accessibility: AccessibilityInfo;
}

export interface BrandInfo {
  /** Official brand name */
  officialName: string;
  
  /** Primary brand color */
  primaryColor: string;
  
  /** Secondary brand color */
  secondaryColor?: string;
  
  /** Brand color palette */
  colorPalette: string[];
  
  /** Brand guidelines compliance */
  guidelinesCompliant: boolean;
  
  /** Brand usage permissions */
  usagePermissions: BrandUsagePermissions;
  
  /** Official brand resources */
  officialResources: BrandResource[];
}

export interface BrandUsagePermissions {
  /** Can be used commercially */
  commercial: boolean;
  
  /** Can be modified */
  modifiable: boolean;
  
  /** Attribution required */
  attributionRequired: boolean;
  
  /** License information */
  license: string;
  
  /** Usage restrictions */
  restrictions: string[];
}

export interface BrandResource {
  /** Resource type */
  type: 'official-logo' | 'brand-kit' | 'guidelines' | 'colors';
  
  /** Resource URL */
  url: string;
  
  /** Resource description */
  description: string;
  
  /** Last verified timestamp */
  lastVerified: number;
}

export interface IconMetadata {
  /** Search tags */
  tags: string[];
  
  /** Search keywords */
  keywords: string[];
  
  /** Description for accessibility */
  description: string;
  
  /** Alternative text */
  altText: string;
  
  /** Search weight (higher = more relevant) */
  searchWeight: number;
  
  /** Popular search queries that match this icon */
  popularSearches: string[];
}

export interface IconAnalytics {
  /** Number of times icon was used */
  usageCount: number;
  
  /** Number of times icon was searched */
  searchCount: number;
  
  /** Number of times icon was downloaded */
  downloadCount: number;
  
  /** Average rating from users */
  averageRating: number;
  
  /** Number of ratings */
  ratingCount: number;
  
  /** Last usage timestamp */
  lastUsed: number;
  
  /** Usage trends over time */
  usageTrends: UsageTrend[];
  
  /** Geographic usage distribution */
  geographicUsage: Record<string, number>;
  
  /** Platform usage distribution */
  platformUsage: Record<Platform, number>;
}

export interface UsageTrend {
  /** Timestamp */
  timestamp: number;
  
  /** Usage count for this period */
  count: number;
  
  /** Period type */
  period: 'hour' | 'day' | 'week' | 'month';
}

export interface IconQuality {
  /** Quality score (0-100) */
  score: number;
  
  /** Quality factors */
  factors: QualityFactor[];
  
  /** Manual verification status */
  verified: boolean;
  
  /** Verification timestamp */
  verifiedAt?: number;
  
  /** Verification notes */
  verificationNotes?: string;
  
  /** Automated quality checks */
  automaticChecks: QualityCheck[];
}

export interface QualityFactor {
  /** Factor name */
  name: string;
  
  /** Factor score (0-100) */
  score: number;
  
  /** Factor weight in overall score */
  weight: number;
  
  /** Factor description */
  description: string;
}

export interface QualityCheck {
  /** Check name */
  name: string;
  
  /** Check result */
  passed: boolean;
  
  /** Check score (0-100) */
  score: number;
  
  /** Check timestamp */
  timestamp: number;
  
  /** Check details */
  details: string;
  
  /** Suggestions for improvement */
  suggestions: string[];
}

export interface AccessibilityInfo {
  /** Has alternative text */
  hasAltText: boolean;
  
  /** Contrast ratio with background */
  contrastRatio: number;
  
  /** Meets WCAG guidelines */
  wcagCompliant: boolean;
  
  /** Screen reader friendly */
  screenReaderFriendly: boolean;
  
  /** High contrast version available */
  highContrastAvailable: boolean;
  
  /** Accessibility notes */
  notes: string[];
}

export interface CustomIcon {
  /** Unique identifier */
  id: string;
  
  /** User who uploaded the icon */
  userId: string;
  
  /** Original filename */
  originalName: string;
  
  /** Icon data (base64 or URL) */
  data: string;
  
  /** Icon format */
  format: IconFormat;
  
  /** File size in bytes */
  size: number;
  
  /** Associated service name */
  serviceName: string;
  
  /** Upload timestamp */
  uploadedAt: number;
  
  /** Usage count */
  usageCount: number;
  
  /** Storage information */
  storage: IconStorage;
  
  /** Processing information */
  processing: IconProcessing;
}

export interface IconStorage {
  /** Storage type */
  type: 'local' | 'firebase' | 'cdn';
  
  /** Storage path */
  path: string;
  
  /** Storage URL */
  url: string;
  
  /** Backup URLs */
  backupUrls: string[];
  
  /** Expiration timestamp (if applicable) */
  expiresAt?: number;
}

export interface IconProcessing {
  /** Processing status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  /** Processing timestamp */
  processedAt?: number;
  
  /** Processing operations performed */
  operations: ProcessingOperation[];
  
  /** Processing errors */
  errors: string[];
  
  /** Original dimensions */
  originalDimensions: { width: number; height: number };
  
  /** Processed dimensions */
  processedDimensions: { width: number; height: number };
}

export interface ProcessingOperation {
  /** Operation type */
  type: 'resize' | 'compress' | 'optimize' | 'convert' | 'validate';
  
  /** Operation parameters */
  parameters: Record<string, any>;
  
  /** Operation result */
  result: 'success' | 'failed' | 'skipped';
  
  /** Operation duration in milliseconds */
  duration: number;
  
  /** Size before operation */
  sizeBefore: number;
  
  /** Size after operation */
  sizeAfter: number;
}

export interface IconCache {
  /** Cache key */
  key: string;
  
  /** Cached data */
  data: string;
  
  /** Cache timestamp */
  timestamp: number;
  
  /** Expiration timestamp */
  expiresAt: number;
  
  /** Cache size in bytes */
  size: number;
  
  /** Access count */
  accessCount: number;
  
  /** Last access timestamp */
  lastAccessed: number;
  
  /** Cache metadata */
  metadata: CacheMetadata;
}

export interface CacheMetadata {
  /** Original URL */
  originalUrl: string;
  
  /** Content type */
  contentType: string;
  
  /** ETag */
  etag?: string;
  
  /** Last modified */
  lastModified?: string;
  
  /** Cache headers */
  headers: Record<string, string>;
  
  /** Compression used */
  compression?: 'gzip' | 'brotli';
}

export interface IconThemeConfig {
  /** Theme name */
  name: IconTheme;
  
  /** Theme display name */
  displayName: string;
  
  /** Theme description */
  description: string;
  
  /** Theme colors */
  colors: ThemeColors;
  
  /** Icon transformations for this theme */
  transformations: IconTransformation[];
  
  /** Fallback theme */
  fallbackTheme?: IconTheme;
}

export interface ThemeColors {
  /** Primary color */
  primary: string;
  
  /** Secondary color */
  secondary: string;
  
  /** Background color */
  background: string;
  
  /** Text color */
  text: string;
  
  /** Border color */
  border: string;
  
  /** Accent colors */
  accents: string[];
}

export interface IconTransformation {
  /** Transformation type */
  type: 'filter' | 'colorize' | 'invert' | 'brightness' | 'contrast' | 'opacity';
  
  /** Transformation parameters */
  parameters: Record<string, number | string>;
  
  /** Apply to formats */
  applyToFormats: IconFormat[];
  
  /** CSS filter string */
  cssFilter?: string;
}

export interface IconSearchQuery {
  /** Search term */
  query: string;
  
  /** Category filter */
  category?: IconCategory;
  
  /** Format filter */
  format?: IconFormat;
  
  /** Theme filter */
  theme?: IconTheme;
  
  /** Size filter */
  size?: IconSize;
  
  /** Sort option */
  sort?: IconSortOption;
  
  /** Results limit */
  limit?: number;
  
  /** Results offset */
  offset?: number;
  
  /** Include custom icons */
  includeCustom?: boolean;
  
  /** Minimum quality score */
  minQuality?: number;
  
  /** User ID (for personalized results) */
  userId?: string;
}

export interface IconSearchResult {
  /** Search results */
  results: ServiceIcon[];
  
  /** Total results count */
  total: number;
  
  /** Search suggestions */
  suggestions: string[];
  
  /** Search metadata */
  metadata: SearchMetadata;
  
  /** Execution time in milliseconds */
  executionTime: number;
}

export interface SearchMetadata {
  /** Original query */
  originalQuery: string;
  
  /** Processed query */
  processedQuery: string;
  
  /** Search filters applied */
  filtersApplied: string[];
  
  /** Search algorithm used */
  algorithm: 'fuzzy' | 'exact' | 'semantic' | 'hybrid';
  
  /** Confidence score */
  confidence: number;
}

export interface IconVersionInfo {
  /** Version number */
  version: string;
  
  /** Version timestamp */
  timestamp: number;
  
  /** Version changes */
  changes: string[];
  
  /** Previous version */
  previousVersion?: string;
  
  /** Version type */
  type: 'major' | 'minor' | 'patch' | 'hotfix';
  
  /** Compatibility information */
  compatibility: VersionCompatibility;
}

export interface VersionCompatibility {
  /** Backward compatible */
  backwardCompatible: boolean;
  
  /** Forward compatible */
  forwardCompatible: boolean;
  
  /** Breaking changes */
  breakingChanges: string[];
  
  /** Migration guide */
  migrationGuide?: string;
}

// Enums and Union Types
export type IconCategory = 
  | 'social-media' 
  | 'technology' 
  | 'finance' 
  | 'productivity' 
  | 'entertainment' 
  | 'education' 
  | 'healthcare' 
  | 'ecommerce' 
  | 'gaming' 
  | 'communication' 
  | 'developer-tools' 
  | 'cloud-services' 
  | 'security' 
  | 'cryptocurrency' 
  | 'other';

export type IconVariantType = 
  | 'default' 
  | 'light' 
  | 'dark' 
  | 'color' 
  | 'monochrome' 
  | 'outline' 
  | 'filled' 
  | 'minimal';

export type IconFormat = 
  | 'svg' 
  | 'png' 
  | 'jpg' 
  | 'webp' 
  | 'ico' 
  | 'gif';

export type IconSize = 
  | '16x16' 
  | '24x24' 
  | '32x32' 
  | '48x48' 
  | '64x64' 
  | '128x128' 
  | '256x256' 
  | '512x512' 
  | 'vector';

export type IconTheme = 
  | 'auto' 
  | 'light' 
  | 'dark' 
  | 'colorful' 
  | 'monochrome' 
  | 'high-contrast' 
  | 'system';

export type IconSortOption = 
  | 'relevance' 
  | 'popularity' 
  | 'name' 
  | 'recently-added' 
  | 'recently-updated' 
  | 'quality-score' 
  | 'usage-count';

export type Platform = 
  | 'web' 
  | 'android' 
  | 'ios' 
  | 'windows' 
  | 'macos' 
  | 'linux' 
  | 'chrome-extension';

// Event Types
export interface IconEvent {
  /** Event type */
  type: IconEventType;
  
  /** Event timestamp */
  timestamp: number;
  
  /** User ID (if applicable) */
  userId?: string;
  
  /** Icon ID */
  iconId?: string;
  
  /** Event metadata */
  metadata: Record<string, any>;
  
  /** Platform where event occurred */
  platform: Platform;
  
  /** Session ID */
  sessionId?: string;
}

export type IconEventType = 
  | 'icon-search' 
  | 'icon-view' 
  | 'icon-select' 
  | 'icon-download' 
  | 'icon-upload' 
  | 'icon-rate' 
  | 'icon-share' 
  | 'theme-change' 
  | 'cache-hit' 
  | 'cache-miss';

// Configuration Types
export interface IconSystemConfig {
  /** Enable icon analytics */
  enableAnalytics: boolean;
  
  /** Enable icon caching */
  enableCaching: boolean;
  
  /** Cache TTL in milliseconds */
  cacheTTL: number;
  
  /** Maximum cache size in MB */
  maxCacheSize: number;
  
  /** Enable automatic icon detection */
  enableAutoDetection: boolean;
  
  /** Default icon theme */
  defaultTheme: IconTheme;
  
  /** CDN configuration */
  cdn: CDNConfig;
  
  /** Quality thresholds */
  qualityThresholds: QualityThresholds;
  
  /** Upload limits */
  uploadLimits: UploadLimits;
  
  /** API rate limits */
  rateLimits: RateLimits;
}

export interface CDNConfig {
  /** Enable CDN */
  enabled: boolean;
  
  /** CDN base URL */
  baseUrl: string;
  
  /** CDN regions */
  regions: string[];
  
  /** Cache headers */
  cacheHeaders: Record<string, string>;
}

export interface QualityThresholds {
  /** Minimum quality score for public icons */
  minimumQuality: number;
  
  /** Auto-reject threshold */
  autoRejectThreshold: number;
  
  /** Manual review threshold */
  manualReviewThreshold: number;
}

export interface UploadLimits {
  /** Maximum file size in bytes */
  maxFileSize: number;
  
  /** Allowed formats */
  allowedFormats: IconFormat[];
  
  /** Maximum uploads per user per day */
  maxUploadsPerDay: number;
  
  /** Maximum dimensions */
  maxDimensions: { width: number; height: number };
}

export interface RateLimits {
  /** API requests per minute */
  apiRequestsPerMinute: number;
  
  /** Search requests per minute */
  searchRequestsPerMinute: number;
  
  /** Download requests per minute */
  downloadRequestsPerMinute: number;
  
  /** Upload requests per hour */
  uploadRequestsPerHour: number;
}

// Error Types
export interface IconError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Error details */
  details?: Record<string, any>;
  
  /** Error timestamp */
  timestamp: number;
  
  /** Error context */
  context: ErrorContext;
}

export interface ErrorContext {
  /** Operation that caused the error */
  operation: string;
  
  /** Icon ID (if applicable) */
  iconId?: string;
  
  /** User ID (if applicable) */
  userId?: string;
  
  /** Request ID */
  requestId?: string;
  
  /** Additional context */
  additional: Record<string, any>;
}
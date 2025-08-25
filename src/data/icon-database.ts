/**
 * Comprehensive Icon Database
 * Contains service icons, metadata, and configuration for 2FA Studio
 */

import { 
  ServiceIcon, 
  IconCategory, 
  IconVariant, 
  BrandInfo,
  IconMetadata,
  IconAnalytics,
  IconQuality,
  IconFormat,
  IconSize,
  IconTheme
} from '@/types/icon';
import { IconUtils } from '@/utils/icon-utils';

/**
 * Create a default icon variant
 */
const createIconVariant = (
  type: IconVariant['type'],
  format: IconFormat,
  size: IconSize,
  theme: IconTheme,
  url: string,
  fileSize: number = 5000
): IconVariant => ({
  type,
  format,
  size,
  theme,
  url,
  fileSize,
  checksum: `sha256-${Math.random().toString(36).substr(2, 16)}`,
  cdnUrls: {
    us: `https://cdn-us.2fa-studio.com${url}`,
    eu: `https://cdn-eu.2fa-studio.com${url}`,
    asia: `https://cdn-asia.2fa-studio.com${url}`
  },
  optimized: true,
  compressed: true,
  accessibility: {
    hasAltText: true,
    contrastRatio: 4.5,
    wcagCompliant: true,
    screenReaderFriendly: true,
    highContrastAvailable: true,
    notes: ['Optimized for screen readers', 'High contrast variant available']
  }
});

/**
 * Create default metadata
 */
const createMetadata = (
  name: string,
  category: IconCategory,
  additionalTags: string[] = [],
  additionalKeywords: string[] = []
): IconMetadata => ({
  tags: [category, name.toLowerCase(), ...additionalTags],
  keywords: [name, name.toLowerCase(), ...additionalKeywords],
  description: `${name} service icon for two-factor authentication`,
  altText: `${name} logo`,
  searchWeight: 1.0,
  popularSearches: [name, name.toLowerCase()]
});

/**
 * Create default analytics
 */
const createAnalytics = (baseUsage: number = 100): IconAnalytics => ({
  usageCount: baseUsage + Math.floor(Math.random() * 500),
  searchCount: Math.floor(Math.random() * 200),
  downloadCount: Math.floor(Math.random() * 50),
  averageRating: 4.2 + Math.random() * 0.8,
  ratingCount: Math.floor(Math.random() * 100),
  lastUsed: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000), // Within 30 days
  usageTrends: [],
  geographicUsage: {
    'US': 40,
    'EU': 25,
    'Asia': 20,
    'Other': 15
  },
  platformUsage: {
    web: 45,
    android: 30,
    ios: 20,
    'chrome-extension': 5,
    windows: 0,
    macos: 0,
    linux: 0
  }
});

/**
 * Create default quality
 */
const createQuality = (baseScore: number = 85): IconQuality => ({
  score: baseScore + Math.floor(Math.random() * 15),
  factors: [
    {
      name: 'Format Quality',
      score: 90,
      weight: 0.3,
      description: 'Multiple formats and sizes available'
    },
    {
      name: 'Brand Compliance',
      score: 95,
      weight: 0.4,
      description: 'Follows official brand guidelines'
    },
    {
      name: 'User Rating',
      score: 88,
      weight: 0.2,
      description: 'High user satisfaction'
    },
    {
      name: 'Accessibility',
      score: 92,
      weight: 0.1,
      description: 'WCAG compliant'
    }
  ],
  verified: true,
  verifiedAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000), // Within 7 days
  automaticChecks: []
});

/**
 * Brand information database
 */
const BRANDS: Record<string, BrandInfo> = {
  google: {
    officialName: 'Google',
    primaryColor: '#4285F4',
    secondaryColor: '#EA4335',
    colorPalette: ['#4285F4', '#EA4335', '#FBBC05', '#34A853'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'Google Brand Guidelines',
      restrictions: ['Cannot modify logo', 'Must maintain proper spacing']
    },
    officialResources: [
      {
        type: 'brand-kit',
        url: 'https://about.google/brand-resource-center/',
        description: 'Official Google brand resources',
        lastVerified: Date.now() - 86400000
      }
    ]
  },
  github: {
    officialName: 'GitHub',
    primaryColor: '#181717',
    secondaryColor: '#f0f6ff',
    colorPalette: ['#181717', '#f0f6ff', '#0969da', '#656d76'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'GitHub Logo Policy',
      restrictions: ['Cannot alter the Octocat or GitHub logo']
    },
    officialResources: [
      {
        type: 'brand-kit',
        url: 'https://github.com/logos',
        description: 'GitHub logos and brand assets',
        lastVerified: Date.now() - 86400000
      }
    ]
  },
  microsoft: {
    officialName: 'Microsoft',
    primaryColor: '#0078D4',
    secondaryColor: '#106ebe',
    colorPalette: ['#0078D4', '#106ebe', '#005a9e', '#004578'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'Microsoft Brand Guidelines',
      restrictions: ['Must use official colors', 'Cannot distort logo']
    },
    officialResources: [
      {
        type: 'brand-kit',
        url: 'https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks',
        description: 'Microsoft trademark guidelines',
        lastVerified: Date.now() - 86400000
      }
    ]
  },
  amazon: {
    officialName: 'Amazon',
    primaryColor: '#FF9900',
    secondaryColor: '#146EB4',
    colorPalette: ['#FF9900', '#146EB4', '#232F3E'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'Amazon Brand Guidelines',
      restrictions: ['Cannot modify smile logo', 'Must maintain proportions']
    },
    officialResources: []
  },
  meta: {
    officialName: 'Meta',
    primaryColor: '#1877F2',
    secondaryColor: '#42B883',
    colorPalette: ['#1877F2', '#42B883', '#E4E6EA'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'Meta Brand Resources',
      restrictions: ['Must use current branding']
    },
    officialResources: []
  },
  x: {
    officialName: 'X',
    primaryColor: '#000000',
    secondaryColor: '#1DA1F2',
    colorPalette: ['#000000', '#1DA1F2', '#14171A'],
    guidelinesCompliant: true,
    usagePermissions: {
      commercial: true,
      modifiable: false,
      attributionRequired: false,
      license: 'X Brand Guidelines',
      restrictions: ['Must use new X branding']
    },
    officialResources: []
  }
};

/**
 * Comprehensive icon database with popular 2FA services
 */
export const ICON_DATABASE: ServiceIcon[] = [
  // Technology & Cloud Services
  {
    id: 'google',
    name: 'Google',
    aliases: ['gmail', 'google mail', 'google account', 'google workspace'],
    category: 'technology',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/google.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/google-64.png'),
      createIconVariant('light', 'svg', 'vector', 'light', '/icons/google-light.svg'),
      createIconVariant('dark', 'svg', 'vector', 'dark', '/icons/google-dark.svg'),
      createIconVariant('monochrome', 'svg', 'vector', 'monochrome', '/icons/google-mono.svg')
    ],
    brand: BRANDS.google,
    metadata: createMetadata('Google', 'technology', ['email', 'search', 'workspace'], ['gmail', 'gsuite']),
    analytics: createAnalytics(2000),
    quality: createQuality(95),
    createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000
  },
  {
    id: 'github',
    name: 'GitHub',
    aliases: ['github.com', 'git hub', 'octocat'],
    category: 'developer-tools',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/github.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/github-64.png'),
      createIconVariant('light', 'svg', 'vector', 'light', '/icons/github-light.svg'),
      createIconVariant('dark', 'svg', 'vector', 'dark', '/icons/github-dark.svg')
    ],
    brand: BRANDS.github,
    metadata: createMetadata('GitHub', 'developer-tools', ['git', 'repository', 'code'], ['git', 'repo', 'octocat']),
    analytics: createAnalytics(1800),
    quality: createQuality(92),
    createdAt: Date.now() - 300 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    aliases: ['ms', 'microsoft.com', 'outlook', 'office', 'azure'],
    category: 'technology',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/microsoft.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/microsoft-64.png'),
      createIconVariant('light', 'svg', 'vector', 'light', '/icons/microsoft-light.svg'),
      createIconVariant('dark', 'svg', 'vector', 'dark', '/icons/microsoft-dark.svg')
    ],
    brand: BRANDS.microsoft,
    metadata: createMetadata('Microsoft', 'technology', ['office', 'azure', 'outlook'], ['ms', 'office365']),
    analytics: createAnalytics(1600),
    quality: createQuality(90),
    createdAt: Date.now() - 280 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000
  },
  {
    id: 'amazon',
    name: 'Amazon',
    aliases: ['aws', 'amazon web services', 'amazon.com'],
    category: 'cloud-services',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/amazon.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/amazon-64.png')
    ],
    brand: BRANDS.amazon,
    metadata: createMetadata('Amazon', 'cloud-services', ['aws', 'ecommerce', 'cloud'], ['aws', 'shopping']),
    analytics: createAnalytics(1400),
    quality: createQuality(88),
    createdAt: Date.now() - 250 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 15 * 24 * 60 * 60 * 1000
  },

  // Social Media
  {
    id: 'facebook',
    name: 'Facebook',
    aliases: ['meta', 'fb', 'facebook.com'],
    category: 'social-media',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/facebook.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/facebook-64.png')
    ],
    brand: BRANDS.meta,
    metadata: createMetadata('Facebook', 'social-media', ['meta', 'social', 'networking'], ['fb', 'meta']),
    analytics: createAnalytics(1200),
    quality: createQuality(85),
    createdAt: Date.now() - 200 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 20 * 24 * 60 * 60 * 1000
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    aliases: ['x', 'twitter', 'twitter.com', 'x.com'],
    category: 'social-media',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/x-twitter.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/x-twitter-64.png')
    ],
    brand: BRANDS.x,
    metadata: createMetadata('X (Twitter)', 'social-media', ['x', 'twitter', 'social', 'microblog'], ['twitter', 'x']),
    analytics: createAnalytics(1000),
    quality: createQuality(82),
    createdAt: Date.now() - 180 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 25 * 24 * 60 * 60 * 1000
  },
  {
    id: 'instagram',
    name: 'Instagram',
    aliases: ['ig', 'insta', 'instagram.com'],
    category: 'social-media',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/instagram.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/instagram-64.png')
    ],
    brand: BRANDS.meta,
    metadata: createMetadata('Instagram', 'social-media', ['photo', 'social', 'meta'], ['ig', 'insta']),
    analytics: createAnalytics(950),
    quality: createQuality(88),
    createdAt: Date.now() - 160 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 12 * 24 * 60 * 60 * 1000
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    aliases: ['linkedin.com', 'linked in'],
    category: 'social-media',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/linkedin.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/linkedin-64.png')
    ],
    brand: {
      officialName: 'LinkedIn',
      primaryColor: '#0A66C2',
      secondaryColor: '#004182',
      colorPalette: ['#0A66C2', '#004182', '#378fe9'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'LinkedIn Brand Guidelines',
        restrictions: ['Cannot alter LinkedIn logo']
      },
      officialResources: []
    },
    metadata: createMetadata('LinkedIn', 'social-media', ['professional', 'networking', 'career'], ['work', 'job']),
    analytics: createAnalytics(800),
    quality: createQuality(90),
    createdAt: Date.now() - 140 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000
  },

  // Communication & Productivity
  {
    id: 'discord',
    name: 'Discord',
    aliases: ['discord.com', 'discord app'],
    category: 'communication',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/discord.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/discord-64.png')
    ],
    brand: {
      officialName: 'Discord',
      primaryColor: '#5865F2',
      secondaryColor: '#57F287',
      colorPalette: ['#5865F2', '#57F287', '#FEE75C', '#ED4245'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'Discord Brand Guidelines',
        restrictions: ['Cannot modify Clyde logo']
      },
      officialResources: []
    },
    metadata: createMetadata('Discord', 'communication', ['chat', 'gaming', 'voice'], ['clyde', 'gaming']),
    analytics: createAnalytics(750),
    quality: createQuality(87),
    createdAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 6 * 24 * 60 * 60 * 1000
  },
  {
    id: 'slack',
    name: 'Slack',
    aliases: ['slack.com', 'slack app'],
    category: 'productivity',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/slack.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/slack-64.png')
    ],
    brand: {
      officialName: 'Slack',
      primaryColor: '#4A154B',
      secondaryColor: '#ECB22E',
      colorPalette: ['#4A154B', '#ECB22E', '#E01E5A', '#36C5F0'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'Slack Brand Guidelines',
        restrictions: ['Cannot alter the octothorpe']
      },
      officialResources: []
    },
    metadata: createMetadata('Slack', 'productivity', ['team', 'communication', 'work'], ['workspace', 'team']),
    analytics: createAnalytics(700),
    quality: createQuality(89),
    createdAt: Date.now() - 110 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 4 * 24 * 60 * 60 * 1000
  },
  {
    id: 'zoom',
    name: 'Zoom',
    aliases: ['zoom.us', 'zoom meeting'],
    category: 'communication',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/zoom.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/zoom-64.png')
    ],
    brand: {
      officialName: 'Zoom',
      primaryColor: '#0B5CFF',
      secondaryColor: '#9999FF',
      colorPalette: ['#0B5CFF', '#9999FF', '#747487'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'Zoom Brand Guidelines',
        restrictions: ['Must maintain logo integrity']
      },
      officialResources: []
    },
    metadata: createMetadata('Zoom', 'communication', ['video', 'meeting', 'conference'], ['video call', 'meeting']),
    analytics: createAnalytics(650),
    quality: createQuality(85),
    createdAt: Date.now() - 100 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 14 * 24 * 60 * 60 * 1000
  },

  // Finance & Cryptocurrency
  {
    id: 'paypal',
    name: 'PayPal',
    aliases: ['paypal.com', 'pay pal'],
    category: 'finance',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/paypal.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/paypal-64.png')
    ],
    brand: {
      officialName: 'PayPal',
      primaryColor: '#003087',
      secondaryColor: '#0070BA',
      colorPalette: ['#003087', '#0070BA', '#009CDE'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'PayPal Brand Guidelines',
        restrictions: ['Cannot alter PayPal logo']
      },
      officialResources: []
    },
    metadata: createMetadata('PayPal', 'finance', ['payment', 'money', 'transfer'], ['pay', 'payment']),
    analytics: createAnalytics(600),
    quality: createQuality(88),
    createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 18 * 24 * 60 * 60 * 1000
  },
  {
    id: 'stripe',
    name: 'Stripe',
    aliases: ['stripe.com'],
    category: 'finance',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/stripe.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/stripe-64.png')
    ],
    brand: {
      officialName: 'Stripe',
      primaryColor: '#635BFF',
      secondaryColor: '#0A2540',
      colorPalette: ['#635BFF', '#0A2540', '#00D4AA'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'Stripe Brand Guidelines',
        restrictions: ['Must maintain brand consistency']
      },
      officialResources: []
    },
    metadata: createMetadata('Stripe', 'finance', ['payment', 'api', 'developer'], ['payments', 'api']),
    analytics: createAnalytics(550),
    quality: createQuality(90),
    createdAt: Date.now() - 80 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 22 * 24 * 60 * 60 * 1000
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    aliases: ['coinbase.com'],
    category: 'cryptocurrency',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/coinbase.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/coinbase-64.png')
    ],
    brand: {
      officialName: 'Coinbase',
      primaryColor: '#0052FF',
      secondaryColor: '#1652F0',
      colorPalette: ['#0052FF', '#1652F0', '#F0F8FF'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'Coinbase Brand Guidelines',
        restrictions: ['Cannot modify logo elements']
      },
      officialResources: []
    },
    metadata: createMetadata('Coinbase', 'cryptocurrency', ['crypto', 'bitcoin', 'exchange'], ['crypto', 'btc']),
    analytics: createAnalytics(500),
    quality: createQuality(86),
    createdAt: Date.now() - 70 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 11 * 24 * 60 * 60 * 1000
  },
  {
    id: 'binance',
    name: 'Binance',
    aliases: ['binance.com'],
    category: 'cryptocurrency',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/binance.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/binance-64.png')
    ],
    brand: {
      officialName: 'Binance',
      primaryColor: '#F3BA2F',
      secondaryColor: '#000000',
      colorPalette: ['#F3BA2F', '#000000', '#FDFCF0'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'Binance Brand Guidelines',
        restrictions: ['Must use official logo']
      },
      officialResources: []
    },
    metadata: createMetadata('Binance', 'cryptocurrency', ['crypto', 'exchange', 'trading'], ['crypto', 'trading']),
    analytics: createAnalytics(450),
    quality: createQuality(84),
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 16 * 24 * 60 * 60 * 1000
  },

  // Entertainment & Gaming
  {
    id: 'steam',
    name: 'Steam',
    aliases: ['steam.com', 'valve'],
    category: 'gaming',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/steam.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/steam-64.png')
    ],
    brand: {
      officialName: 'Steam',
      primaryColor: '#171A21',
      secondaryColor: '#2A475E',
      colorPalette: ['#171A21', '#2A475E', '#66C0F4'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'Valve Brand Guidelines',
        restrictions: ['Cannot alter Steam logo']
      },
      officialResources: []
    },
    metadata: createMetadata('Steam', 'gaming', ['valve', 'games', 'pc'], ['valve', 'gaming']),
    analytics: createAnalytics(400),
    quality: createQuality(87),
    createdAt: Date.now() - 50 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 9 * 24 * 60 * 60 * 1000
  },
  {
    id: 'twitch',
    name: 'Twitch',
    aliases: ['twitch.tv'],
    category: 'entertainment',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/twitch.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/twitch-64.png')
    ],
    brand: {
      officialName: 'Twitch',
      primaryColor: '#9146FF',
      secondaryColor: '#772CE8',
      colorPalette: ['#9146FF', '#772CE8', '#F0F0FF'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'Twitch Brand Guidelines',
        restrictions: ['Cannot modify glitch logo']
      },
      officialResources: []
    },
    metadata: createMetadata('Twitch', 'entertainment', ['streaming', 'gaming', 'live'], ['stream', 'gaming']),
    analytics: createAnalytics(350),
    quality: createQuality(85),
    createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 13 * 24 * 60 * 60 * 1000
  },
  {
    id: 'netflix',
    name: 'Netflix',
    aliases: ['netflix.com'],
    category: 'entertainment',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/netflix.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/netflix-64.png')
    ],
    brand: {
      officialName: 'Netflix',
      primaryColor: '#E50914',
      secondaryColor: '#221F1F',
      colorPalette: ['#E50914', '#221F1F', '#F5F5F1'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'Netflix Brand Guidelines',
        restrictions: ['Cannot alter Netflix logo']
      },
      officialResources: []
    },
    metadata: createMetadata('Netflix', 'entertainment', ['streaming', 'movies', 'tv'], ['movies', 'shows']),
    analytics: createAnalytics(300),
    quality: createQuality(88),
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 17 * 24 * 60 * 60 * 1000
  },

  // Cloud Storage & File Services
  {
    id: 'dropbox',
    name: 'Dropbox',
    aliases: ['dropbox.com'],
    category: 'cloud-services',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/dropbox.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/dropbox-64.png')
    ],
    brand: {
      officialName: 'Dropbox',
      primaryColor: '#0061FF',
      secondaryColor: '#1E1919',
      colorPalette: ['#0061FF', '#1E1919', '#F7F5F2'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'Dropbox Brand Guidelines',
        restrictions: ['Cannot modify the Dropbox logo']
      },
      officialResources: []
    },
    metadata: createMetadata('Dropbox', 'cloud-services', ['storage', 'sync', 'files'], ['storage', 'sync']),
    analytics: createAnalytics(280),
    quality: createQuality(89),
    createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 21 * 24 * 60 * 60 * 1000
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    aliases: ['onedrive.com', 'microsoft onedrive'],
    category: 'cloud-services',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/onedrive.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/onedrive-64.png')
    ],
    brand: BRANDS.microsoft,
    metadata: createMetadata('OneDrive', 'cloud-services', ['microsoft', 'storage', 'sync'], ['ms', 'storage']),
    analytics: createAnalytics(250),
    quality: createQuality(87),
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 19 * 24 * 60 * 60 * 1000
  },
  {
    id: 'googledrive',
    name: 'Google Drive',
    aliases: ['drive.google.com', 'google drive'],
    category: 'cloud-services',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/google-drive.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/google-drive-64.png')
    ],
    brand: BRANDS.google,
    metadata: createMetadata('Google Drive', 'cloud-services', ['google', 'storage', 'docs'], ['drive', 'storage']),
    analytics: createAnalytics(220),
    quality: createQuality(91),
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 23 * 24 * 60 * 60 * 1000
  },

  // Security & VPN
  {
    id: 'lastpass',
    name: 'LastPass',
    aliases: ['lastpass.com'],
    category: 'security',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/lastpass.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/lastpass-64.png')
    ],
    brand: {
      officialName: 'LastPass',
      primaryColor: '#D32D27',
      secondaryColor: '#B71C1C',
      colorPalette: ['#D32D27', '#B71C1C', '#FFEBEE'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'LastPass Brand Guidelines',
        restrictions: ['Cannot modify logo']
      },
      officialResources: []
    },
    metadata: createMetadata('LastPass', 'security', ['password', 'manager', 'security'], ['password', 'vault']),
    analytics: createAnalytics(200),
    quality: createQuality(86),
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 24 * 24 * 60 * 60 * 1000
  },
  {
    id: '1password',
    name: '1Password',
    aliases: ['1password.com'],
    category: 'security',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/1password.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/1password-64.png')
    ],
    brand: {
      officialName: '1Password',
      primaryColor: '#0F6CBD',
      secondaryColor: '#1A73E8',
      colorPalette: ['#0F6CBD', '#1A73E8', '#E3F2FD'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: '1Password Brand Guidelines',
        restrictions: ['Cannot modify logo']
      },
      officialResources: []
    },
    metadata: createMetadata('1Password', 'security', ['password', 'manager', 'vault'], ['password', 'vault']),
    analytics: createAnalytics(180),
    quality: createQuality(89),
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 26 * 24 * 60 * 60 * 1000
  },

  // Development Tools
  {
    id: 'gitlab',
    name: 'GitLab',
    aliases: ['gitlab.com'],
    category: 'developer-tools',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/gitlab.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/gitlab-64.png')
    ],
    brand: {
      officialName: 'GitLab',
      primaryColor: '#FC6D26',
      secondaryColor: '#E24329',
      colorPalette: ['#FC6D26', '#E24329', '#FCA326'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'GitLab Brand Guidelines',
        restrictions: ['Cannot alter GitLab logo']
      },
      officialResources: []
    },
    metadata: createMetadata('GitLab', 'developer-tools', ['git', 'repository', 'devops'], ['git', 'repo']),
    analytics: createAnalytics(160),
    quality: createQuality(87),
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 27 * 24 * 60 * 60 * 1000
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    aliases: ['bitbucket.org', 'atlassian bitbucket'],
    category: 'developer-tools',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/bitbucket.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/bitbucket-64.png')
    ],
    brand: {
      officialName: 'Bitbucket',
      primaryColor: '#0052CC',
      secondaryColor: '#2684FF',
      colorPalette: ['#0052CC', '#2684FF', '#E3F2FD'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'Atlassian Brand Guidelines',
        restrictions: ['Cannot modify logo']
      },
      officialResources: []
    },
    metadata: createMetadata('Bitbucket', 'developer-tools', ['git', 'atlassian', 'repository'], ['git', 'atlassian']),
    analytics: createAnalytics(140),
    quality: createQuality(85),
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 28 * 24 * 60 * 60 * 1000
  },

  // E-commerce
  {
    id: 'shopify',
    name: 'Shopify',
    aliases: ['shopify.com'],
    category: 'ecommerce',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/shopify.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/shopify-64.png')
    ],
    brand: {
      officialName: 'Shopify',
      primaryColor: '#96BF47',
      secondaryColor: '#7AB55C',
      colorPalette: ['#96BF47', '#7AB55C', '#5E8E3E'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'Shopify Brand Guidelines',
        restrictions: ['Cannot modify logo']
      },
      officialResources: []
    },
    metadata: createMetadata('Shopify', 'ecommerce', ['commerce', 'store', 'selling'], ['shop', 'store']),
    analytics: createAnalytics(120),
    quality: createQuality(86),
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 29 * 24 * 60 * 60 * 1000
  },

  // Additional popular services
  {
    id: 'adobe',
    name: 'Adobe',
    aliases: ['adobe.com'],
    category: 'productivity',
    variants: [
      createIconVariant('default', 'svg', 'vector', 'colorful', '/icons/adobe.svg'),
      createIconVariant('default', 'png', '64x64', 'colorful', '/icons/adobe-64.png')
    ],
    brand: {
      officialName: 'Adobe',
      primaryColor: '#FF0000',
      secondaryColor: '#ED1C24',
      colorPalette: ['#FF0000', '#ED1C24', '#FFEBEE'],
      guidelinesCompliant: true,
      usagePermissions: {
        commercial: true,
        modifiable: false,
        attributionRequired: false,
        license: 'Adobe Brand Guidelines',
        restrictions: ['Cannot modify Adobe logo']
      },
      officialResources: []
    },
    metadata: createMetadata('Adobe', 'productivity', ['creative', 'design', 'pdf'], ['photoshop', 'creative']),
    analytics: createAnalytics(100),
    quality: createQuality(88),
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

/**
 * Icon database utilities
 */
export class IconDatabase {
  /**
   * Get all icons
   */
  static getAllIcons(): ServiceIcon[] {
    return [...ICON_DATABASE];
  }

  /**
   * Get icon by ID
   */
  static getIconById(id: string): ServiceIcon | null {
    return ICON_DATABASE.find(icon => icon.id === id) || null;
  }

  /**
   * Get icons by category
   */
  static getIconsByCategory(category: IconCategory): ServiceIcon[] {
    return ICON_DATABASE.filter(icon => icon.category === category);
  }

  /**
   * Search icons
   */
  static searchIcons(query: string, limit: number = 20): ServiceIcon[] {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return ICON_DATABASE.slice(0, limit);
    }

    const scored = ICON_DATABASE.map(icon => ({
      icon,
      score: IconUtils.generateScore(icon, normalizedQuery)
    }));

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.icon);
  }

  /**
   * Get popular icons
   */
  static getPopularIcons(limit: number = 10): ServiceIcon[] {
    return [...ICON_DATABASE]
      .sort((a, b) => b.analytics.usageCount - a.analytics.usageCount)
      .slice(0, limit);
  }

  /**
   * Get recently updated icons
   */
  static getRecentlyUpdatedIcons(limit: number = 10): ServiceIcon[] {
    return [...ICON_DATABASE]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  /**
   * Get categories with counts
   */
  static getCategoriesWithCounts(): Record<IconCategory, number> {
    const counts = {} as Record<IconCategory, number>;
    
    for (const icon of ICON_DATABASE) {
      counts[icon.category] = (counts[icon.category] || 0) + 1;
    }
    
    return counts;
  }

  /**
   * Get brand info for service name
   */
  static getBrandInfo(serviceName: string): BrandInfo | null {
    const normalizedName = serviceName.toLowerCase().replace(/\s+/g, '');
    return BRANDS[normalizedName] || null;
  }

  /**
   * Find icon by service name or alias
   */
  static findIconByName(name: string): ServiceIcon | null {
    const normalizedName = name.toLowerCase().trim();
    
    // Exact name match
    let found = ICON_DATABASE.find(icon => 
      icon.name.toLowerCase() === normalizedName
    );
    
    if (found) return found;

    // Alias match
    found = ICON_DATABASE.find(icon =>
      icon.aliases.some(alias => alias.toLowerCase() === normalizedName)
    );
    
    if (found) return found;

    // Partial name match
    found = ICON_DATABASE.find(icon =>
      icon.name.toLowerCase().includes(normalizedName) ||
      icon.aliases.some(alias => alias.toLowerCase().includes(normalizedName))
    );
    
    return found || null;
  }
}

// Helper function for scoring (used by IconUtils)
declare module '@/utils/icon-utils' {
  namespace IconUtils {
    function generateScore(icon: ServiceIcon, query: string): number;
  }
}

// Extend IconUtils with scoring function
Object.assign(IconUtils, {
  generateScore(icon: ServiceIcon, query: string): number {
    let score = 0;
    const normalizedQuery = query.toLowerCase().trim();
    
    // Exact name match
    if (icon.name.toLowerCase() === normalizedQuery) {
      score += 100;
    } else if (icon.name.toLowerCase().includes(normalizedQuery)) {
      score += 50;
    }
    
    // Alias matches
    for (const alias of icon.aliases) {
      if (alias.toLowerCase() === normalizedQuery) {
        score += 80;
      } else if (alias.toLowerCase().includes(normalizedQuery)) {
        score += 30;
      }
    }
    
    // Keyword matches
    for (const keyword of icon.metadata.keywords) {
      if (keyword.toLowerCase().includes(normalizedQuery)) {
        score += 20;
      }
    }
    
    // Tag matches
    for (const tag of icon.metadata.tags) {
      if (tag.toLowerCase().includes(normalizedQuery)) {
        score += 15;
      }
    }
    
    // Boost for popular icons
    if (icon.analytics.usageCount > 1000) {
      score += 10;
    } else if (icon.analytics.usageCount > 100) {
      score += 5;
    }
    
    // Quality boost
    score += icon.quality.score * 0.1;
    
    return score;
  }
});

export default ICON_DATABASE;
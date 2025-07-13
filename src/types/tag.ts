/**
 * Tag-related type definitions
 * @module types/tag
 */

export interface Tag {
  id: string;
  name: string;
  color: string; // hex color
  icon?: string; // icon identifier
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  isDefault?: boolean; // For system-provided tags
  accountCount?: number; // Number of accounts using this tag
}

export interface TagFilter {
  tagIds: string[];
  mode: 'AND' | 'OR';
}

export interface TagStats {
  totalTags: number;
  mostUsedTags: Array<{
    tag: Tag;
    count: number;
  }>;
  unusedTags: Tag[];
}

// Predefined tag colors
export const TAG_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#6366F1', // indigo
  '#F97316', // orange
  '#84CC16', // lime
] as const;

// Default system tags
export const DEFAULT_TAGS: Partial<Tag>[] = [
  {
    name: 'Work',
    color: '#3B82F6',
    icon: 'briefcase',
    description: 'Work-related accounts',
    isDefault: true,
  },
  {
    name: 'Personal',
    color: '#10B981',
    icon: 'user',
    description: 'Personal accounts',
    isDefault: true,
  },
  {
    name: 'Finance',
    color: '#F59E0B',
    icon: 'currency-dollar',
    description: 'Banking and financial accounts',
    isDefault: true,
  },
  {
    name: 'Social',
    color: '#EC4899',
    icon: 'chat-bubble-left-right',
    description: 'Social media accounts',
    isDefault: true,
  },
  {
    name: 'Shopping',
    color: '#8B5CF6',
    icon: 'shopping-cart',
    description: 'E-commerce and shopping accounts',
    isDefault: true,
  },
  {
    name: 'Development',
    color: '#6366F1',
    icon: 'code-bracket',
    description: 'Developer tools and platforms',
    isDefault: true,
  },
];
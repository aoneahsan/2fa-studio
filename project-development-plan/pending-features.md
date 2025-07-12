# Pending Features

This document outlines features that are planned for future implementation in 2FA Studio.

## 1. Tags and Labels System

### Overview
A comprehensive tagging and labeling system to help users organize and categorize their 2FA accounts for better management and quick access.

### Purpose
- **Organization**: Allow users to group accounts by category (e.g., "Work", "Personal", "Banking", "Social Media")
- **Quick Filtering**: Enable rapid filtering of accounts based on tags
- **Visual Identification**: Use colors and icons for instant recognition
- **Bulk Operations**: Perform actions on multiple accounts with the same tag

### Core Features

#### 1.1 Tag Management
- **Create Tags**: Users can create custom tags with:
  - Name (required)
  - Color (from predefined palette)
  - Icon (optional, from icon library)
  - Description (optional)
- **Edit Tags**: Modify tag properties after creation
- **Delete Tags**: Remove tags with option to reassign affected accounts
- **Default Tags**: Pre-defined tags like "Work", "Personal", "Finance", "Social"

#### 1.2 Label Assignment
- **Single Assignment**: Add/remove tags from individual accounts
- **Multi-Assignment**: Bulk tag multiple accounts
- **Quick Tag**: Add tags during account creation
- **Tag Suggestions**: Smart suggestions based on issuer name

#### 1.3 Filtering and Search
- **Filter by Tag**: Show only accounts with specific tags
- **Multi-Tag Filter**: Combine multiple tags (AND/OR logic)
- **Tag Search**: Search within tagged accounts
- **Save Filters**: Save frequently used filter combinations

#### 1.4 Visual Features
- **Tag Pills**: Display tags as colored pills on account cards
- **Tag Groups**: Group accounts by tags in the main view
- **Tag Icons**: Show tag icons for quick identification
- **Color Coding**: Use tag colors throughout the UI

### Technical Implementation

#### Data Model
```typescript
interface Tag {
  id: string;
  name: string;
  color: string; // hex color
  icon?: string; // icon identifier
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

interface AccountTag {
  accountId: string;
  tagId: string;
  assignedAt: Date;
}

// Update Account interface
interface Account {
  // ... existing fields
  tagIds?: string[]; // Array of tag IDs
}
```

#### Database Schema
```
Firestore Collections:
- tags/
  - {tagId}/
    - name
    - color
    - icon
    - description
    - userId
    - createdAt
    - updatedAt

- accounts/
  - {accountId}/
    - ... existing fields
    - tagIds: string[] // Array of tag IDs
```

#### Key Components
1. **TagManager Component**: Create, edit, delete tags
2. **TagSelector Component**: Multi-select dropdown for tag assignment
3. **TagFilter Component**: Filter bar with tag selection
4. **TagPill Component**: Visual tag representation
5. **TaggedAccountsList Component**: Grouped view by tags

#### State Management
```typescript
// Redux slice for tags
interface TagsState {
  tags: Tag[];
  activeTags: string[]; // Currently selected filter tags
  filterMode: 'AND' | 'OR';
  isLoading: boolean;
  error: string | null;
}
```

### User Interface Mockup

#### Account Card with Tags
```
┌─────────────────────────────────┐
│ 🏦 Bank of America              │
│ 123 456                    0:25 │
│ ┌──────┐ ┌──────┐ ┌──────┐    │
│ │ Work │ │Finance│ │Priority│   │
│ └──────┘ └──────┘ └──────┘    │
└─────────────────────────────────┘
```

#### Tag Filter Bar
```
Filter by tags: [All ▼] [Work] [Personal] [Finance] [x Clear]
Showing 12 accounts
```

### Implementation Priority
1. **Phase 1**: Basic tag CRUD operations
2. **Phase 2**: Tag assignment to accounts
3. **Phase 3**: Filtering and search
4. **Phase 4**: Advanced features (bulk operations, smart suggestions)

### Benefits
- **Improved Organization**: Users with many accounts can organize them efficiently
- **Faster Access**: Quick filtering reduces time to find specific accounts
- **Better UX**: Visual organization improves overall user experience
- **Business Logic**: Can be used for analytics and user insights

### Considerations
- **Performance**: Optimize filtering for large numbers of accounts
- **Sync**: Ensure tags sync properly across devices
- **Migration**: Plan for adding tags to existing user accounts
- **Limits**: Consider tag limits for free vs premium tiers

## 2. Other Planned Features

### 2.1 Import/Export Enhancements
- Import from other 2FA apps (Authy, Microsoft Authenticator)
- Export to encrypted file formats
- Selective import/export by tags

### 2.2 Advanced Security Features
- Hardware key support (YubiKey)
- Passwordless authentication
- Security audit reports

### 2.3 Team/Family Sharing
- Share specific accounts with family members
- Team workspaces for businesses
- Role-based access control

### 2.4 Browser Extension Enhancements
- Auto-fill 2FA codes on websites
- QR code detection from web pages
- Browser sync without Firebase

### 2.5 Advanced Backup Options
- Multiple cloud provider support (Dropbox, OneDrive)
- Local encrypted backups
- Scheduled automatic backups

### 2.6 Analytics Dashboard
- Usage statistics
- Security score
- Login patterns
- Most/least used accounts

---

*Note: These features are subject to change based on user feedback and technical feasibility. Priority will be given to features that provide the most value to users while maintaining security standards.*
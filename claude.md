# Inventory Scanner PWA - Development Instructions

## Project Overview
Build a Progressive Web App (PWA) for multi-store inventory management. Users take photos of items and enter inventory data that automatically syncs to Google Sheets with both consolidated and store-specific views.

## Phase 1 Scope (Implement This Only)
- Camera capture for inventory items
- Form for manual data entry (no OCR yet)
- Google Sheets integration with dual-sheet architecture
- PWA functionality for iPhone installation
- Offline capability with sync when online

## Core Features to Implement

### 1. Camera Integration
- Use browser's camera API for photo capture
- Photo preview with retake option
- Image compression for efficient storage
- Upload to Google Drive with organized folder structure

### 2. Data Entry Form
**Required Fields:**
- Store Name (smart autocomplete - type new or select existing)
- Item Name (text input)
- Carton Number (text/numeric input)
- Number of Cartons (numeric input)
- Quantity per Carton (numeric input)
- Price (numeric input with currency formatting)
- Optional Notes field

**Form Behavior:**
- Auto-generate timestamp
- Store name autocomplete from previous entries
- Form validation before submission
- Clear form after successful submission

### 3. Google Sheets Integration Architecture

**Dual Sheet Structure:**
- **Master Sheet**: "All_Inventory" - consolidated view of all stores
- **Individual Store Sheets**: Auto-created per store (e.g., "Store_ABC", "Store_XYZ")

**CRITICAL: Use Column Headers, Not Indexes**
```javascript
// CORRECT - Search by column headers
sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].indexOf('Store Name')

// WRONG - Don't use hardcoded column indexes
sheet.getRange(row, 1) // Avoid this approach
```

**Master Sheet Columns:**
- Timestamp
- Store Name  
- Image URL
- Carton Number
- Item Name
- Number of Cartons
- Quantity per Carton
- Price
- Notes
- Entry ID

**Individual Store Sheet Columns:**
- Timestamp
- Image URL
- Carton Number
- Item Name
- Number of Cartons
- Quantity per Carton
- Price
- Notes
- Entry ID

### 4. Google Apps Script Backend Requirements

**Core Functions Needed:**
- `submitInventoryData(data)` - Main endpoint for form submissions
- `getStoreList()` - Returns array of existing store names for autocomplete
- `createStoreSheet(storeName)` - Creates new store sheet if doesn't exist
- `uploadImage(imageData, storeName)` - Handles image upload to Google Drive

**Data Flow:**
1. Receive data from PWA
2. Upload image to Google Drive (organized by store folders)
3. Write data to master "All_Inventory" sheet
4. Write same data to individual store sheet (create sheet if needed)
5. Return success response with updated store list

**Store Name Handling:**
- Trim whitespace and standardize capitalization
- Check if store sheet exists, create if needed
- Prevent duplicate store names with different formatting
- Return updated store list for autocomplete cache

### 5. PWA Implementation Requirements

**Service Worker:**
- Cache app shell for offline access
- Background sync for offline form submissions
- Cache store list for offline autocomplete

**Manifest:**
- Installable on iPhone home screen
- Appropriate icons and theme colors
- Standalone display mode

**Offline Functionality:**
- Queue form submissions when offline
- Sync when connection restored
- Local storage for store names and pending submissions

## Technical Guidelines

### Data Handling
- **Always use column headers** for Google Sheets operations - never hardcoded indexes
- Validate all form data before submission
- Handle network failures gracefully
- Implement retry logic for failed uploads

### Image Management
- Compress images before upload (target: <500KB per image)
- Organize Google Drive folders by store name
- Generate unique filenames to prevent conflicts
- Return public URLs for sheet linking

### Error Handling
- Graceful degradation when camera not available
- Clear error messages for users
- Retry mechanisms for network operations
- Fallback to manual entry if auto-features fail

### Performance
- Lazy load non-critical features
- Minimize API calls where possible
- Cache frequently used data locally
- Optimize image sizes for mobile

### Security
- Validate all inputs on both client and server
- Use HTTPS for all communications
- Implement proper OAuth scopes for Google APIs
- Don't store sensitive data in local storage

## Development Priorities

### Phase 1 Must-Haves
1. Working camera capture with image upload
2. Complete form with validation
3. Google Sheets dual-write functionality (master + store sheets)
4. Store name autocomplete with dynamic creation
5. PWA installation capability
6. Basic offline functionality

### Phase 1 Nice-to-Haves
- Form field auto-focus and keyboard optimization
- Image preview before submission
- Success/error notifications
- Basic analytics (entry count, etc.)

## File Structure Suggestions
```
/
├── index.html
├── manifest.json
├── sw.js (service worker)
├── css/
│   └── styles.css
├── js/
│   ├── app.js (main application)
│   ├── camera.js (camera handling)
│   ├── storage.js (local storage/IndexedDB)
│   └── api.js (Google Sheets integration)
└── icons/ (PWA icons)
```

## Google Apps Script Development Notes
- Deploy as web app with public access
- Use PropertiesService for configuration
- Implement proper error logging
- Test with small data sets first
- Use column header mapping throughout

## Testing Checklist
- [ ] Camera works on mobile devices
- [ ] Form validation catches all edge cases
- [ ] Data appears correctly in both master and store sheets
- [ ] New store sheets are created automatically
- [ ] Store name autocomplete works offline and online
- [ ] PWA installs correctly on iPhone
- [ ] Offline submissions sync when back online
- [ ] Images upload to correct Google Drive folders

## Important Notes
- **Column headers are mandatory** - never use hardcoded column positions
- Focus on reliability over features for Phase 1
- Test thoroughly on actual mobile devices
- Keep the UI simple and thumb-friendly
- Prioritize data integrity - better to fail safely than corrupt data

## Phase 2 Features (DO NOT IMPLEMENT YET)
- OCR integration
- Item master database
- Barcode scanning
- Advanced reporting
- Department/category classification

Stick strictly to Phase 1 scope for initial implementation.
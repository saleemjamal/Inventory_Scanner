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
- Sequential carton number suggestions (global tracking)
- Form validation before submission
- Optimistic UI: Clear form immediately after submission
- Auto-focus to store name field for rapid data entry

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
- Smart image naming: StoreName_CartonNumber_timestamp.jpg
- Return public URLs for sheet linking

### Error Handling
- Graceful degradation when camera not available
- Clear error messages for users
- Retry mechanisms for network operations
- Fallback to manual entry if auto-features fail

### Performance
- Optimistic UI for instant form clearing
- Background processing during submissions
- Auto-focus workflow for rapid data entry
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

## Troubleshooting

### CORS Errors with Google Apps Script
If you encounter "blocked by CORS policy" errors when calling your Google Apps Script from the PWA:

**Solution:**
1. **Add `doOptions` function** to your Google Apps Script:
```javascript
function doOptions(e) {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
```

2. **Remove Content-Type headers** from fetch requests in your PWA:
```javascript
// CORRECT - No Content-Type header
fetch(url, {
  method: 'POST',
  body: JSON.stringify(data)
});

// WRONG - Triggers preflight request
fetch(url, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(data)
});
```

3. **Verify deployment settings:**
   - Execute as: **Me**
   - Who has access: **Anyone** (not "Anyone with a Google account")
   - Redeploy after making changes

**Why this works:**
- Removing Content-Type headers prevents CORS preflight requests
- The doOptions function handles any preflight requests that do occur
- Proper deployment settings ensure external access is allowed

## Sequential Carton Number System

### How It Works
- **Global tracking**: Carton numbers flow continuously across all stores
- **Auto-suggestion**: When focusing on carton number field, suggests next number
- **Override support**: User can type any number to reset the sequence
- **Pattern recognition**: Supports formats like PJ001, ABC123, Store001, etc.

### Example Flow
```
Store A: PJ1001 → PJ1002 → PJ1003
Store B: (focuses on carton field) → suggests PJ1004
Store B: (overrides to) PJ2000 → next suggestion becomes PJ2001
Store C: (focuses on carton field) → suggests PJ2001
```

### Implementation Details
- Uses IndexedDB to store last used carton number globally
- Parses alphanumeric patterns to extract prefix and number
- Maintains padding (PJ001 → PJ002, not PJ1 → PJ2)
- Falls back gracefully if pattern doesn't match standard format

### Benefits
- Prevents duplicate carton numbers across stores
- Speeds up data entry with intelligent suggestions
- Maintains flexibility for custom numbering schemes
- Ensures consistent inventory tracking across locations

## Phase 2 Features (DO NOT IMPLEMENT YET)
- OCR integration
- Item master database
- Barcode scanning
- Advanced reporting
- Department/category classification

Stick strictly to Phase 1 scope for initial implementation.
# Inventory Scanner PWA - Phase 1

A Progressive Web App for multi-store inventory management with camera capture and Google Sheets integration.

## Setup Instructions

### 1. Google Sheets Setup
1. Create a new Google Sheet
2. Note the Sheet ID from the URL
3. Create a folder in Google Drive for images
4. Note the Drive folder ID

### 2. Google Apps Script Setup
1. Open Google Apps Script (script.google.com)
2. Create a new project
3. Copy the code from `google-apps-script.js`
4. Replace `YOUR_GOOGLE_SHEET_ID` with your Sheet ID
5. Replace `YOUR_DRIVE_FOLDER_ID` with your Drive folder ID
6. Deploy as web app with public access
7. Copy the web app URL

### 3. PWA Configuration
1. Open `js/api.js`
2. Replace the entire baseURL with your Apps Script web app URL
3. Update the PWA icon (replace the SVG with a proper PNG icon)

### 4. Carton Number System
- The app tracks carton numbers globally across all stores
- First entry: Start with any format (e.g., PJ001, ABC123)
- Subsequent entries: Auto-suggests next number (PJ001 → PJ002)
- Override behavior: Type any number to reset sequence (PJ010 → PJ2000 → PJ2001)

### 5. Deployment
1. Serve the files over HTTPS (required for camera access)
2. Test on mobile devices
3. Install as PWA on iPhone

## Features Implemented

✅ **Camera Integration**
- Photo capture with getUserMedia API
- Image compression for efficient storage
- Preview and retake functionality

✅ **Data Entry Form**
- All required fields with validation
- Store name autocomplete
- Mobile-optimized input

✅ **Google Sheets Integration**
- Dual-sheet architecture (master + store-specific)
- Column header-based operations
- Automatic store sheet creation

✅ **PWA Functionality**
- Offline capability with IndexedDB
- Background sync for form submissions
- Installable on iPhone

✅ **Google Drive Integration**
- Image uploads with folder organization
- Smart image naming: StoreName_CartonNumber_timestamp.jpg
- Public URL generation for sheet linking

✅ **Speed Optimizations**
- Sequential carton number suggestions (global tracking)
- Optimistic UI for instant form clearing
- Auto-focus workflow for rapid data entry
- Background processing during submissions

## Testing Checklist

- [ ] Camera works on mobile devices
- [ ] Form validation catches edge cases
- [ ] Data appears in both master and store sheets
- [ ] Store name autocomplete works
- [ ] PWA installs on iPhone
- [ ] Offline submissions sync when online
- [ ] Images upload to correct folders
- [ ] Sequential carton numbers work (PJ001 → PJ002)
- [ ] Carton number overrides work (PJ001 → PJ2000 → PJ2001)
- [ ] Form clears immediately after submit
- [ ] Auto-focus moves to store name after submission
- [ ] Smart image naming includes store and carton number

## File Structure
```
/
├── index.html          # Main PWA interface
├── manifest.json       # PWA configuration
├── sw.js              # Service worker
├── css/
│   └── styles.css     # Mobile-responsive styling
├── js/
│   ├── app.js         # Main application logic
│   ├── camera.js      # Camera handling
│   ├── storage.js     # IndexedDB operations
│   └── api.js         # Google Sheets integration
├── icons/             # PWA icons
└── google-apps-script.js # Backend code

```

## Next Steps (Phase 2)
- OCR integration for automatic field detection
- Item master database with auto-creation
- Barcode scanning capabilities
- Advanced reporting features

## Important Notes
- Always use column headers (never hardcoded indexes)
- Test thoroughly on actual mobile devices
- Ensure HTTPS for camera access
- Keep UI simple and thumb-friendly
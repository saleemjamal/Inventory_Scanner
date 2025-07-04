# Product Requirements Document: Inventory Scanner PWA

## Executive Summary

A Progressive Web App (PWA) that streamlines inventory management by allowing users to capture photos of items and quickly record associated data including item codes, quantities, and carton counts. Data is automatically saved to Google Sheets for easy access and analysis.

## Problem Statement

Multi-store inventory management requires tracking items across different vendors with consolidated reporting. Users need a simple, mobile-friendly solution to quickly capture visual evidence of inventory items with store-specific data, while maintaining both consolidated and vendor-specific views of the data.

## Product Goals

**Primary Goal**: Create a simple, fast mobile inventory capture tool for multi-store operations that reduces data entry time by 70% compared to traditional methods while providing both consolidated and vendor-specific reporting.

**Secondary Goals**:
- Provide immediate access to inventory data through Google Sheets with dual view structure
- Enable per-vendor analysis and consolidated reporting
- Create a foundation for multi-store inventory management features

## Target Users

**Primary**: Multi-store business owners, regional managers, and inventory coordinators who need to track physical inventory across multiple vendor locations quickly and accurately.

**Secondary**: Field service technicians, retail managers, and anyone conducting physical inventory counts across multiple store locations.

## Core Features

### MVP Features (Phase 1)

**Camera Capture**
- Native camera access through PWA
- Photo compression for storage efficiency
- Preview captured image before saving
- Retake functionality

**Data Entry Form**
- Store Name (smart autocomplete input - type new or select existing, required)
- Item Name (text input, required)
- Carton Number (text/numeric input, required)
- Number of Cartons (numeric input, required)
- Quantity per Carton (numeric input, required)
- Price (numeric input with currency, required)
- Timestamp (auto-generated)
- Optional Notes field

**Google Sheets Integration**
- Dual sheet structure: Master sheet + individual vendor sheets
- Automatic row creation in both locations
- Image upload to Google Drive with link in sheets
- Real-time data sync to both sheet types
- Error handling for failed uploads

**PWA Functionality**
- Installable on iPhone home screen
- Offline capable (cache form data and store list until online)
- Smart store name autocomplete with dynamic list management
- Fast loading and responsive design

### Phase 2 Features (Future)

**OCR Integration**
- Optical Character Recognition for handwritten and printed text
- Smart field mapping from image to form fields
- User validation workflow with confidence indicators
- Learning system to improve accuracy over time

**Item Master Database Management**
- Automatic item master record creation and maintenance
- Department and category classification system
- Item code standardization and duplicate prevention
- Historical pricing and inventory tracking per item
- Bulk item management and editing capabilities

**Enhanced Data Management**
- Barcode/QR code scanning for item identification
- Batch entry mode for multiple items from same store
- Store name standardization and duplicate prevention
- Data validation and duplicate detection
- Export to multiple formats (CSV, PDF)

**User Experience Improvements**
- Voice-to-text for notes
- Customizable form field order to match user workflow
- Dark mode support
- Multi-language support
- Offline OCR capabilities

## Dynamic Store Management

### Smart Autocomplete System
**Input Behavior:**
- **Type-ahead**: As user types, shows matching existing store names
- **Fuzzy Matching**: Handles minor typos and variations
- **Case Insensitive**: "abc store" matches "ABC Store"
- **New Entry**: If typed name doesn't match existing, treats as new store

**Store Name Standardization:**
- **Trim Whitespace**: Removes leading/trailing spaces
- **Title Case**: Converts to consistent capitalization (e.g., "ABC Store")
- **Duplicate Prevention**: "abc store" and "ABC Store" treated as same store

### Client-Side Store Management
**Local Cache:**
- Stores list of existing store names in IndexedDB
- Updates cache after successful submissions
- Syncs with server periodically to catch stores added from other devices

**Offline Functionality:**
- Can create new stores offline (marked as pending)
- Syncs new stores when connection restored
- Prevents duplicate store creation during sync

### Server-Side Store Management
**Google Apps Script Functions:**
- `getStoreList()`: Returns array of existing store names for autocomplete
- `createStoreSheet(storeName)`: Creates new sheet with standardized name
- `standardizeStoreName(input)`: Applies naming conventions
- `checkStoreExists(storeName)`: Validates against existing stores

### File Organization
- **Single Google Sheets File**: "Multi-Store Inventory Tracker"
- **Master Sheet**: "All_Inventory" - consolidated view of all stores
- **Individual Sheets**: One per store (e.g., "Store_ABC", "Store_XYZ")
- **Auto-Creation**: New store sheets created automatically when new store name entered

### Google Apps Script Backend
- **Dual Write Function**: Writes each entry to both master sheet and appropriate store sheet
- **Dynamic Sheet Management**: Automatically creates new store sheets when new store names are entered
- **Store Name Standardization**: Trims whitespace, handles case consistency
- **Store List API**: Provides current store list for autocomplete functionality
- **Image Handling**: Uploads images to organized Google Drive folders (per store)
- **Data Validation**: Ensures data integrity across both sheet types
- **Error Logging**: Tracks failed writes for troubleshooting

### Data Flow
1. PWA sends data to Google Apps Script endpoint
2. Script standardizes store name and checks if store sheet exists (creates if needed)
3. Uploads image to appropriate Google Drive folder structure
4. Writes data to master "All_Inventory" sheet
5. Writes same data to individual store sheet
6. Updates store list cache if new store was created
7. Returns success/error response with updated store list to PWA

## Technical Architecture

### Frontend
- **Technology**: Vanilla JavaScript PWA
- **UI Framework**: Modern CSS with mobile-first design
- **Camera API**: MediaDevices.getUserMedia()
- **Storage**: IndexedDB for offline capability and dynamic store list caching
- **Autocomplete**: Real-time store name filtering and suggestion
- **Service Worker**: Background sync for offline data

### Backend/Storage
- **Primary Storage**: Google Sheets with dual-sheet architecture
- **Image Storage**: Google Drive with folder organization by store
- **Processing**: Google Apps Script for data routing and sheet management
- **Authentication**: Google OAuth 2.0
- **Backup**: Local IndexedDB as fallback

### Data Schema

**Master Sheet "All_Inventory" Columns:**
- Timestamp
- Store Name
- Image URL
- Carton Number
- Item Name
- Number of Cartons
- Quantity per Carton
- Price
- Notes
- Entry ID (UUID)

**Individual Vendor Sheets (e.g., "Store_ABC", "Store_XYZ"):**
- Timestamp
- Image URL
- Carton Number
- Item Name
- Number of Cartons
- Quantity per Carton
- Price
- Notes
- Entry ID (UUID)

## User Journey

1. **App Launch**: User opens PWA from iPhone home screen
2. **Store Selection**: Type store name - autocompletes if exists, or creates new entry
3. **Camera Access**: Tap "Take Photo" button, camera opens
4. **Capture**: Take photo of inventory item
5. **Preview**: Review photo, option to retake
6. **Data Entry**: Fill in item name, carton number, quantities, price
7. **Submit**: Data and image saved to both master sheet and vendor-specific sheet (creates new sheet if needed)
8. **Confirmation**: Success message with store confirmation, ready for next item

## Success Metrics

**Primary KPIs**:
- Time per inventory entry (target: <30 seconds)
- Data accuracy (target: 99%+ correct entries)
- User adoption (target: 80% of users complete >10 entries)

**Secondary KPIs**:
- App installation rate
- Offline usage frequency
- Google Sheets integration success rate

## Technical Requirements

### Performance
- App loads in <3 seconds on 3G
- Photo capture to save completion in <10 seconds
- Supports devices with 2GB+ RAM

### Compatibility
- iOS Safari 14+
- Android Chrome 90+
- Progressive enhancement for older browsers

### Security
- HTTPS required for camera access
- Google OAuth for secure authentication
- No sensitive data stored locally beyond current session

## Implementation Timeline

**Phase 1 (6-8 weeks)**
- Week 1-2: PWA foundation and camera integration
- Week 3-4: Form development with store management
- Week 5-6: Google Apps Script development for dual-sheet system
- Week 7-8: Testing, polish, and deployment

**Phase 2 (12-16 weeks)**
- Week 1-3: OCR integration and field mapping system
- Week 4-6: Item master database design and auto-creation system
- Week 7-9: Department/category management and classification
- Week 10-12: User validation workflow and confidence indicators
- Week 13-14: Advanced reporting features and store-specific analytics
- Week 15-16: Integration testing and optimization

## Risk Assessment

**Technical Risks**:
- Camera API limitations on older devices
- Google Sheets API rate limits
- Offline sync complexity

**Mitigation Strategies**:
- Graceful degradation for unsupported devices
- Batch upload optimization
- Simple offline queue with retry logic

**Business Risks**:
- User adoption challenges
- Google API dependency

**Mitigation Strategies**:
- Simple, intuitive design
- Backup storage options planned for Phase 2

## Success Criteria

**Launch Criteria**:
- Successfully captures and saves photos with data to Google Sheets
- Installs as PWA on iPhone
- Works offline with sync when connection restored
- Sub-30 second entry time achieved

**Post-Launch**:
- 100+ successful inventory entries within first month
- <5% error rate in data transmission
- Positive user feedback on ease of use

## Phase 2: Item Master Database System

### Automatic Item Master Creation
**Smart Item Recognition:**
- **New Item Detection**: Automatically identifies when item codes haven't been seen before
- **Master Record Creation**: Creates comprehensive item profiles on first entry
- **Data Enhancement**: Prompts for additional details (department, category) during initial creation
- **Duplicate Prevention**: Checks for similar items before creating new records

**Item Master Data Structure:**
- **Core Fields**: Item Code, Item Name, Base Price, Creation Date
- **Classification**: Department, Category, Subcategory
- **Inventory Tracking**: Total Quantity Across Stores, Last Seen Date
- **Pricing History**: Track price changes over time and by store
- **Images**: Associated product photos for visual reference

### Enhanced Form with Classification
**Expanded Data Entry Form:**
- **Existing Fields**: Store Name, Item Name, Carton Number, Number of Cartons, Quantity per Carton, Price
- **New Classification Fields**:
  - Department (e.g., Electronics, Clothing, Food & Beverage)
  - Category (e.g., Smartphones, T-Shirts, Beverages)
  - Subcategory (optional, e.g., Android Phones, Cotton T-Shirts)
  - Brand (optional)
  - Size/Variant (optional)

**Smart Auto-Complete for Classification:**
- **Department Suggestions**: Based on item name patterns
- **Category Learning**: System learns category patterns from user input
- **Historical Data**: Pre-fills based on similar items previously entered
- **Bulk Classification**: Apply same department/category to multiple items

### Google Sheets Structure Enhancement
**New Sheet: "Item_Master"**
- Item Code (Primary Key)
- Item Name
- Department
- Category
- Subcategory
- Brand
- Current Base Price
- First Seen Date
- Last Updated
- Total Stores Present
- Total Quantity on Hand
- Average Price Across Stores
- Price History Link
- Primary Image URL

**Enhanced Transaction Sheets:**
- **Master "All_Inventory" Sheet**: Add Department, Category columns
- **Individual Store Sheets**: Include classification data
- **Auto-Lookup**: Pull department/category from Item Master when item code is recognized

### Intelligent Data Management
**Item Code Standardization:**
- **Format Validation**: Ensure consistent item code formats
- **Auto-Correction**: Suggest corrections for likely typos in item codes
- **Merge Detection**: Identify when multiple codes might refer to same item
- **Barcode Integration**: Link traditional item codes with scanned barcodes

**Classification Intelligence:**
- **Pattern Recognition**: Learn department/category patterns from item names
- **Suggestion Engine**: Recommend classifications based on similar items
- **Bulk Operations**: Mass update classifications for item groups
- **Validation Rules**: Ensure classification consistency

### User Workflow Enhancement
**New Item Entry Process:**
1. **Take Photo & OCR**: Extract item details
2. **Item Code Check**: System checks if item exists in master database
3. **New Item Detected**: If new, prompt for classification details
4. **Smart Suggestions**: Offer department/category suggestions based on item name
5. **Master Record Creation**: Create comprehensive item profile
6. **Transaction Recording**: Log inventory transaction with full classification

**Existing Item Entry Process:**
1. **Take Photo & OCR**: Extract item details
2. **Item Recognition**: System recognizes existing item code
3. **Auto-Fill**: Pre-populate item name, department, category from master
4. **Quick Entry**: User only needs to confirm quantities and price
5. **Price Tracking**: Update pricing history if price has changed

### Reporting and Analytics Enhancements
**Department/Category Reporting:**
- **Sales by Department**: Track inventory value by department across stores
- **Category Performance**: Identify top-performing categories per store
- **Pricing Analysis**: Compare prices across categories and stores
- **Inventory Distribution**: See which departments are most/least stocked

**Item Master Analytics:**
- **Item Lifecycle**: Track items from first appearance to current status
- **Price Trend Analysis**: Identify items with significant price changes
- **Store Distribution**: See which items appear in which stores
- **Inventory Turnover**: Track how quickly items move through system

### Data Validation and Quality Control
**Master Data Integrity:**
- **Duplicate Detection**: Prevent multiple records for same item
- **Data Consistency**: Ensure classification standards across entries
- **Audit Trail**: Track all changes to item master records
- **Bulk Corrections**: Tools to fix classification errors across multiple items

**User Guidance:**
- **Classification Help**: Provide examples and guidelines for consistent categorization
- **Required Fields**: Enforce minimum data quality standards
- **Validation Warnings**: Alert users to potential data quality issues

## Phase 2: OCR Implementation Strategy
**Primary OCR Service: Google Cloud Vision API**
- Best accuracy for mixed handwritten and printed text
- Handles multiple languages and orientations
- Confidence scores for each detected text element
- Real-time processing capabilities

**Fallback Options:**
- **AWS Textract**: For structured document processing
- **Tesseract.js**: Client-side OCR for offline functionality
- **Azure Computer Vision**: Alternative cloud service

### Smart Field Mapping System
**Text Analysis Pipeline:**
1. **OCR Processing**: Extract all text with confidence scores and bounding boxes
2. **Pattern Recognition**: Identify numbers, codes, and text patterns
3. **Spatial Analysis**: Map text position to likely form fields based on typical layouts
4. **Confidence Scoring**: Rate each field mapping from 0-100%

**Field Mapping Logic:**
- **Item Codes**: Alphanumeric patterns (e.g., "PJ5861")
- **Quantities**: Large numbers often circled or prominent
- **Prices**: Numbers with currency symbols or decimal points
- **Notes**: Remaining text not matching other patterns

### User Validation Workflow
**OCR-Enhanced Form Interface:**
- **Pre-populated Fields**: OCR results auto-fill form with confidence indicators
- **Color Coding**: Green (high confidence), Yellow (medium), Red (low confidence)
- **Quick Edit Mode**: Tap any field to correct OCR results
- **Verification Required**: Users must confirm low-confidence fields before submission

**Smart Validation Features:**
- **Range Checking**: Flag unrealistic quantities or prices
- **Pattern Validation**: Verify item codes match expected formats
- **Historical Comparison**: Compare with previous entries for same store
- **Duplicate Detection**: Alert if similar entry already exists

### Learning and Improvement System
**OCR Accuracy Improvement:**
- **User Corrections**: Track when users modify OCR results
- **Pattern Learning**: Identify common correction patterns
- **Confidence Calibration**: Adjust confidence thresholds based on accuracy
- **Custom Models**: Train on user-specific handwriting over time

**Feedback Loop:**
- **Accuracy Metrics**: Track OCR accuracy per field type
- **User Behavior**: Monitor which fields users correct most often
- **Performance Optimization**: Adjust processing based on usage patterns

### Technical Implementation Details
**Client-Side Processing:**
- **Image Preprocessing**: Enhance contrast, rotate, crop before OCR
- **Progress Indicators**: Show OCR processing status
- **Offline Capability**: Basic OCR using Tesseract.js when offline
- **Cache Management**: Store OCR results for offline review

**Server-Side Integration:**
- **OCR API Wrapper**: Google Apps Script integration with Vision API
- **Result Processing**: Parse and structure OCR output
- **Error Handling**: Graceful fallback when OCR fails
- **Cost Management**: Optimize API calls and caching

### Performance and User Experience
**Speed Optimization:**
- **Background Processing**: OCR runs while user reviews photo
- **Progressive Loading**: Show high-confidence fields first
- **Smart Defaults**: Learn user's typical field values
- **Quick Corrections**: Swipe or voice input for fast edits

**Accessibility:**
- **Voice Confirmation**: Read back OCR results for verification
- **Large Text Mode**: Enhanced visibility for field corrections
- **Error Recovery**: Easy way to fall back to manual entry

### Success Metrics for OCR
**Accuracy Targets:**
- **Overall OCR Accuracy**: 85%+ correct field extraction
- **High-Confidence Fields**: 95%+ accuracy for green-coded fields
- **User Acceptance**: 80%+ of users prefer OCR to manual entry
- **Time Savings**: 60%+ reduction in data entry time

**Quality Assurance:**
- **A/B Testing**: Compare OCR vs manual entry workflows
- **User Feedback**: Regular surveys on OCR accuracy and usefulness
- **Error Analysis**: Identify common OCR failure patterns for improvement

## Future Considerations

- Integration with existing inventory management systems
- Multi-user collaboration features
- Advanced analytics and reporting with OCR-powered insights
- Integration with accounting software
- Enterprise features (user management, permissions)
- Custom OCR model training for specific handwriting styles
- Real-time inventory tracking and alerts

## Appendix

### Technical Dependencies
- Google Apps Script for Sheets API
- Google Drive API for image storage
- Service Worker for offline functionality
- IndexedDB for local storage
// Google Apps Script for Inventory Scanner PWA
// Deploy this as a web app with public access

const SHEET_ID = '1369Pn_Fv45QWrJG8HDpVq4JV1HDc9SWZgb3ewJ03gZ4'; // Replace with your Google Sheet ID
const DRIVE_FOLDER_ID = '18v68VjLBv7qIgU_GfK7fIJS_BX2Sf1nF'; // Replace with your Google Drive folder ID
const API_KEY = 'INV_SCAN_2025_SECURE_KEY_poppatjamals_xyz789'; // API key for authentication
const ALLOWED_DOMAINS = [
  'https://inventoryscan.app',
  'https://www.inventoryscan.app'
]; // Allowed domains for requests
const ALLOWED_EMAIL_DOMAIN = 'poppatjamals.com'; // Allowed email domain
const GOOGLE_CLIENT_ID = '453460892232-579kkit0k13ks8t7n3qhkhvasb6qoejn.apps.googleusercontent.com'; // Replace with your Google OAuth client ID

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: 'Inventory Scanner API is running',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    // Security validations
    if (!validateSecurity(e)) {
      return createResponse(false, 'Access denied');
    }
    
    const data = JSON.parse(e.postData.contents);
    
    // API key validation
    if (!data.apiKey || data.apiKey !== API_KEY) {
      return createResponse(false, 'Invalid API key');
    }
    
    // Google token verification
    const userInfo = verifyGoogleToken(data.idToken);
    if (!userInfo) {
      return createResponse(false, 'Invalid authentication token');
    }
    
    // Email domain validation
    if (!userInfo.email || !userInfo.email.endsWith('@' + ALLOWED_EMAIL_DOMAIN)) {
      return createResponse(false, `Only @${ALLOWED_EMAIL_DOMAIN} accounts are allowed`);
    }
    
    // Rate limiting check
    if (!checkRateLimit(e, userInfo.email)) {
      return createResponse(false, 'Rate limit exceeded');
    }
    
    switch (data.action) {
      case 'submitInventory':
        return submitInventoryData(data.data, userInfo);
      case 'getStores':
        return getStoreList();
      case 'uploadImage':
        return uploadImage(data.imageData, data.storeName, data.cartonNumber);
      case 'updateImageUrl':
        return updateEntryImageUrl(data.entryId, data.imageUrl);
      default:
        return createResponse(false, 'Unknown action');
    }
  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse(false, error.toString());
  }
}

function submitInventoryData(data, userInfo) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const storeName = standardizeStoreName(data.storeName);
    
    // Add user information to the data
    const dataWithUser = {
      ...data,
      userEmail: userInfo.email,
      userName: userInfo.name
    };
    
    // Write to master sheet
    writeMasterSheet(spreadsheet, dataWithUser, storeName);
    
    // Write to store-specific sheet
    writeStoreSheet(spreadsheet, dataWithUser, storeName);
    
    // Get updated store list
    const stores = getStoreNames(spreadsheet);
    
    return createResponse(true, 'Data submitted successfully', { stores });
  } catch (error) {
    console.error('Error submitting data:', error);
    return createResponse(false, error.toString());
  }
}

function writeMasterSheet(spreadsheet, data, storeName) {
  let masterSheet = spreadsheet.getSheetByName('All_Inventory');
  
  if (!masterSheet) {
    masterSheet = spreadsheet.insertSheet('All_Inventory');
    const headers = ['Timestamp', 'Store Name', 'User Email', 'User Name', 'Image URL', 'Carton Number', 'Item Name', 'Number of Cartons', 'Quantity per Carton', 'Price', 'Notes', 'Entry ID'];
    masterSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  const row = [
    data.timestamp,
    storeName,
    data.userEmail || '',
    data.userName || '',
    data.imageUrl || '',
    data.cartonNumber,
    data.itemName,
    data.numCartons,
    data.qtyPerCarton,
    data.price,
    data.notes || '',
    data.entryId
  ];
  
  masterSheet.appendRow(row);
}

function writeStoreSheet(spreadsheet, data, storeName) {
  const sheetName = `Store_${storeName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  let storeSheet = spreadsheet.getSheetByName(sheetName);
  
  if (!storeSheet) {
    storeSheet = spreadsheet.insertSheet(sheetName);
    const headers = ['Timestamp', 'User Email', 'User Name', 'Image URL', 'Carton Number', 'Item Name', 'Number of Cartons', 'Quantity per Carton', 'Price', 'Notes', 'Entry ID'];
    storeSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  const row = [
    data.timestamp,
    data.userEmail || '',
    data.userName || '',
    data.imageUrl || '',
    data.cartonNumber,
    data.itemName,
    data.numCartons,
    data.qtyPerCarton,
    data.price,
    data.notes || '',
    data.entryId
  ];
  
  storeSheet.appendRow(row);
}

function getStoreList() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const stores = getStoreNames(spreadsheet);
    return createResponse(true, 'Stores retrieved', { stores });
  } catch (error) {
    console.error('Error getting stores:', error);
    return createResponse(false, error.toString());
  }
}

function getStoreNames(spreadsheet) {
  const sheets = spreadsheet.getSheets();
  const stores = [];
  
  sheets.forEach(sheet => {
    const name = sheet.getName();
    if (name.startsWith('Store_')) {
      const storeName = name.replace('Store_', '').replace(/_/g, ' ');
      stores.push(storeName);
    }
  });
  
  return stores.sort();
}

function uploadImage(imageData, storeName, cartonNumber) {
  try {
    // Generate smart filename: StoreName_CartonNumber_timestamp.jpg
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
    const cleanStoreName = storeName.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanCartonNumber = cartonNumber ? cartonNumber.replace(/[^a-zA-Z0-9]/g, '_') : 'NoCarton';
    const filename = `${cleanStoreName}_${cleanCartonNumber}_${timestamp}.jpg`;
    
    const blob = Utilities.newBlob(
      Utilities.base64Decode(imageData.split(',')[1]),
      'image/jpeg',
      filename
    );
    
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    let storeFolder;
    
    const storeFolderName = `Store_${storeName}`;
    const existingFolders = folder.getFoldersByName(storeFolderName);
    
    if (existingFolders.hasNext()) {
      storeFolder = existingFolders.next();
    } else {
      storeFolder = folder.createFolder(storeFolderName);
    }
    
    const file = storeFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const imageUrl = `https://drive.google.com/uc?id=${file.getId()}`;
    
    return createResponse(true, 'Image uploaded', { imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    return createResponse(false, error.toString());
  }
}

function updateEntryImageUrl(entryId, imageUrl) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    
    // Update master sheet
    updateImageUrlInSheet(spreadsheet.getSheetByName('All_Inventory'), entryId, imageUrl);
    
    // Update store sheets - we need to find which store sheet contains this entry
    const sheets = spreadsheet.getSheets();
    sheets.forEach(sheet => {
      const name = sheet.getName();
      if (name.startsWith('Store_')) {
        updateImageUrlInSheet(sheet, entryId, imageUrl);
      }
    });
    
    return createResponse(true, 'Image URL updated successfully');
  } catch (error) {
    console.error('Error updating image URL:', error);
    return createResponse(false, error.toString());
  }
}

function updateImageUrlInSheet(sheet, entryId, imageUrl) {
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const entryIdCol = headers.indexOf('Entry ID');
  const imageUrlCol = headers.indexOf('Image URL');
  
  if (entryIdCol === -1 || imageUrlCol === -1) return;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][entryIdCol] === entryId) {
      sheet.getRange(i + 1, imageUrlCol + 1).setValue(imageUrl);
      break;
    }
  }
}

function standardizeStoreName(name) {
  return name.trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function validateSecurity(e) {
  // Domain restriction
  const origin = e.parameter.origin || e.parameters.origin;
  if (origin && !ALLOWED_DOMAINS.includes(origin)) {
    console.error('Blocked request from unauthorized origin:', origin);
    return false;
  }
  
  return true;
}

function verifyGoogleToken(idToken) {
  if (!idToken) {
    return null;
  }
  
  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`;
    const response = UrlFetchApp.fetch(url);
    const payload = JSON.parse(response.getContentText());
    
    // Verify audience matches your client ID
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      console.error('Invalid token audience');
      return null;
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.error('Token expired');
      return null;
    }
    
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      sub: payload.sub
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

function checkRateLimit(e, userEmail) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const now = Date.now();
    const hourWindow = 60 * 60 * 1000; // 1 hour
    const maxRequestsPerHour = 100;
    
    // Use user email as identifier
    const identifier = userEmail || 'anonymous';
    const key = `rate_limit_${identifier}`;
    
    // Get current request data
    const requestData = properties.getProperty(key);
    let requests = requestData ? JSON.parse(requestData) : { count: 0, window: now };
    
    // Reset if window has passed
    if (now - requests.window > hourWindow) {
      requests = { count: 1, window: now };
    } else {
      requests.count++;
    }
    
    // Check if limit exceeded
    if (requests.count > maxRequestsPerHour) {
      console.error('Rate limit exceeded for:', identifier);
      return false;
    }
    
    // Save updated count
    properties.setProperty(key, JSON.stringify(requests));
    return true;
  } catch (error) {
    console.error('Rate limiting error:', error);
    return true; // Allow request on error to avoid blocking legitimate users
  }
}

function createResponse(success, message, data = {}) {
  const response = {
    success,
    message,
    ...data
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
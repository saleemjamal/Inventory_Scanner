// Google Apps Script for Inventory Scanner PWA
// Deploy this as a web app with public access

const SHEET_ID = '1369Pn_Fv45QWrJG8HDpVq4JV1HDc9SWZgb3ewJ03gZ4'; // Replace with your Google Sheet ID
const DRIVE_FOLDER_ID = '18v68VjLBv7qIgU_GfK7fIJS_BX2Sf1nF'; // Replace with your Google Drive folder ID
const API_KEY = 'INV_SCAN_2025_SECURE_KEY_poppatjamals_xyz789'; // API key for authentication
const ALLOWED_DOMAINS = [
  'https://inventoryscan.app',
  'https://www.inventoryscan.app'
]; // Allowed domains for requests
// Removed OAuth constants - now using simple login

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
    
    // Handle login action separately
    if (data.action === 'login') {
      return handleLogin(data.username, data.password);
    }
    
    // Session token verification for other actions
    const userInfo = verifySessionToken(data.sessionToken);
    if (!userInfo) {
      return createResponse(false, 'Invalid session token');
    }
    
    // Rate limiting check
    if (!checkRateLimit(e, userInfo.username)) {
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
      username: userInfo.username,
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
    const headers = ['Timestamp', 'Store Name', 'Username', 'User Name', 'Image URL', 'Carton Number', 'Item Name', 'Number of Cartons', 'Quantity per Carton', 'Price', 'Notes', 'Entry ID'];
    masterSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  const row = [
    data.timestamp,
    storeName,
    data.username || '',
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
    const headers = ['Timestamp', 'Username', 'User Name', 'Image URL', 'Carton Number', 'Item Name', 'Number of Cartons', 'Quantity per Carton', 'Price', 'Notes', 'Entry ID'];
    storeSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  const row = [
    data.timestamp,
    data.username || '',
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

function handleLogin(username, password) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    
    // Get or create authorized users sheet
    let usersSheet = spreadsheet.getSheetByName('Authorized_Users');
    if (!usersSheet) {
      usersSheet = spreadsheet.insertSheet('Authorized_Users');
      const headers = ['Username', 'Password', 'Name', 'Email', 'Active', 'Last_Login'];
      usersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Add default admin user (you should change this password!)
      const defaultUser = ['admin', btoa('admin123'), 'Administrator', 'admin@poppatjamals.com', true, ''];
      usersSheet.appendRow(defaultUser);
    }
    
    // Find user
    const userData = usersSheet.getDataRange().getValues();
    const headers = userData[0];
    
    const usernameCol = headers.indexOf('Username');
    const passwordCol = headers.indexOf('Password');
    const nameCol = headers.indexOf('Name');
    const emailCol = headers.indexOf('Email');
    const activeCol = headers.indexOf('Active');
    const lastLoginCol = headers.indexOf('Last_Login');
    
    for (let i = 1; i < userData.length; i++) {
      const row = userData[i];
      if (row[usernameCol] === username && row[passwordCol] === password && row[activeCol]) {
        // Update last login
        usersSheet.getRange(i + 1, lastLoginCol + 1).setValue(new Date().toISOString());
        
        // Generate session token
        const sessionToken = generateSessionToken(username);
        
        return createResponse(true, 'Login successful', {
          user: {
            username: row[usernameCol],
            name: row[nameCol],
            email: row[emailCol]
          },
          sessionToken: sessionToken
        });
      }
    }
    
    return createResponse(false, 'Invalid username or password');
    
  } catch (error) {
    console.error('Login error:', error);
    return createResponse(false, error.toString());
  }
}

function generateSessionToken(username) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2);
  return btoa(`${username}:${timestamp}:${random}`);
}

function verifySessionToken(sessionToken) {
  if (!sessionToken) {
    return null;
  }
  
  try {
    const decoded = atob(sessionToken);
    const parts = decoded.split(':');
    
    if (parts.length !== 3) {
      return null;
    }
    
    const [username, timestamp, random] = parts;
    const now = Date.now();
    const tokenAge = now - parseInt(timestamp);
    
    // Token expires after 24 hours
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return null;
    }
    
    // Get user info from sheet
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const usersSheet = spreadsheet.getSheetByName('Authorized_Users');
    
    if (!usersSheet) {
      return null;
    }
    
    const userData = usersSheet.getDataRange().getValues();
    const headers = userData[0];
    
    const usernameCol = headers.indexOf('Username');
    const nameCol = headers.indexOf('Name');
    const emailCol = headers.indexOf('Email');
    const activeCol = headers.indexOf('Active');
    
    for (let i = 1; i < userData.length; i++) {
      const row = userData[i];
      if (row[usernameCol] === username && row[activeCol]) {
        return {
          username: row[usernameCol],
          name: row[nameCol],
          email: row[emailCol]
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Session verification error:', error);
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
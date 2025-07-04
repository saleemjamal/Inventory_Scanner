// Google Apps Script for Inventory Scanner PWA
// Deploy this as a web app with public access

const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID'; // Replace with your Google Sheet ID
const DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID'; // Replace with your Google Drive folder ID

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    switch (data.action) {
      case 'submitInventory':
        return submitInventoryData(data.data);
      case 'getStores':
        return getStoreList();
      case 'uploadImage':
        return uploadImage(data.imageData, data.storeName);
      default:
        return createResponse(false, 'Unknown action');
    }
  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse(false, error.toString());
  }
}

function submitInventoryData(data) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const storeName = standardizeStoreName(data.storeName);
    
    // Write to master sheet
    writeMasterSheet(spreadsheet, data, storeName);
    
    // Write to store-specific sheet
    writeStoreSheet(spreadsheet, data, storeName);
    
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
    const headers = ['Timestamp', 'Store Name', 'Image URL', 'Carton Number', 'Item Name', 'Number of Cartons', 'Quantity per Carton', 'Price', 'Notes', 'Entry ID'];
    masterSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  const row = [
    data.timestamp,
    storeName,
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
    const headers = ['Timestamp', 'Image URL', 'Carton Number', 'Item Name', 'Number of Cartons', 'Quantity per Carton', 'Price', 'Notes', 'Entry ID'];
    storeSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  const row = [
    data.timestamp,
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

function uploadImage(imageData, storeName) {
  try {
    const blob = Utilities.newBlob(
      Utilities.base64Decode(imageData.split(',')[1]),
      'image/jpeg',
      `${Date.now()}_${storeName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`
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

function standardizeStoreName(name) {
  return name.trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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
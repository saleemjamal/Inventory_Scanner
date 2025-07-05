class APIManager {
    constructor() {
        this.baseURL = 'https://script.google.com/macros/s/AKfycbyXV4pTyOTurXXNLvv29VknFel40-9gdXJhcRPQYJ6HptQcvW4klcjgIHG5xbpnZN6qfA/exec';
        this.isOnline = navigator.onLine;
        
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateStatus();
            this.syncPendingEntries();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateStatus();
        });
    }

    updateStatus() {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        if (this.isOnline) {
            statusDot.classList.remove('offline');
            statusText.textContent = 'Online';
        } else {
            statusDot.classList.add('offline');
            statusText.textContent = 'Offline';
        }
    }

    async submitInventoryData(data) {
        if (this.isOnline) {
            try {
                const response = await fetch(this.baseURL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'submitInventory',
                        data: data
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    if (result.stores) {
                        await window.storageManager.saveStores(result.stores);
                    }
                    return result;
                } else {
                    throw new Error(result.error || 'Submission failed');
                }
            } catch (error) {
                console.error('API submission failed:', error);
                await this.saveToOfflineQueue(data);
                throw error;
            }
        } else {
            await this.saveToOfflineQueue(data);
            return { success: true, offline: true };
        }
    }

    async saveToOfflineQueue(data) {
        await window.storageManager.savePendingEntry(data);
        
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('inventory-sync');
        }
    }

    async syncPendingEntries() {
        if (!this.isOnline) return;
        
        try {
            const pendingEntries = await window.storageManager.getPendingEntries();
            
            for (const entry of pendingEntries) {
                try {
                    const result = await this.submitInventoryData(entry.data);
                    if (result.success && !result.offline) {
                        await window.storageManager.removePendingEntry(entry.id);
                    }
                } catch (error) {
                    console.error('Failed to sync entry:', error);
                }
            }
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }

    async getStoreList() {
        if (this.isOnline) {
            try {
                const response = await fetch(this.baseURL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'getStores'
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    await window.storageManager.saveStores(result.stores);
                    return result.stores;
                } else {
                    throw new Error(result.error || 'Failed to fetch stores');
                }
            } catch (error) {
                console.error('Failed to fetch stores:', error);
                return await window.storageManager.getStores();
            }
        } else {
            return await window.storageManager.getStores();
        }
    }

    async uploadImage(imageData, storeName, cartonNumber) {
        if (!this.isOnline) {
            return null;
        }
        
        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'uploadImage',
                    imageData: imageData,
                    storeName: storeName,
                    cartonNumber: cartonNumber
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                return result.imageUrl;
            } else {
                throw new Error(result.error || 'Image upload failed');
            }
        } catch (error) {
            console.error('Image upload failed:', error);
            return null;
        }
    }

    async updateEntryImageUrl(entryId, imageUrl) {
        if (!this.isOnline) {
            return { success: false, error: 'Offline' };
        }
        
        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'updateImageUrl',
                    entryId: entryId,
                    imageUrl: imageUrl
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to update image URL:', error);
            return { success: false, error: error.message };
        }
    }

    generateEntryId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

window.APIManager = APIManager;
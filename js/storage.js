class StorageManager {
    constructor() {
        this.dbName = 'InventoryDB';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('pending')) {
                    db.createObjectStore('pending', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('stores')) {
                    db.createObjectStore('stores', { keyPath: 'name' });
                }
                
                if (!db.objectStoreNames.contains('cartonNumbers')) {
                    db.createObjectStore('cartonNumbers', { keyPath: 'id' });
                }
            };
        });
    }

    async savePendingEntry(data) {
        const transaction = this.db.transaction(['pending'], 'readwrite');
        const store = transaction.objectStore('pending');
        
        const entry = {
            id: Date.now().toString(),
            data: data,
            timestamp: new Date().toISOString()
        };
        
        return store.add(entry);
    }

    async getPendingEntries() {
        const transaction = this.db.transaction(['pending'], 'readonly');
        const store = transaction.objectStore('pending');
        return store.getAll();
    }

    async removePendingEntry(id) {
        const transaction = this.db.transaction(['pending'], 'readwrite');
        const store = transaction.objectStore('pending');
        return store.delete(id);
    }

    async saveStores(stores) {
        const transaction = this.db.transaction(['stores'], 'readwrite');
        const store = transaction.objectStore('stores');
        
        await store.clear();
        
        for (const storeName of stores) {
            await store.add({ name: storeName });
        }
    }

    async getStores() {
        const transaction = this.db.transaction(['stores'], 'readonly');
        const store = transaction.objectStore('stores');
        const stores = await store.getAll();
        return stores.map(store => store.name);
    }

    async addStore(storeName) {
        const transaction = this.db.transaction(['stores'], 'readwrite');
        const store = transaction.objectStore('stores');
        
        try {
            await store.add({ name: storeName });
        } catch (error) {
            if (error.name === 'ConstraintError') {
                return;
            }
            throw error;
        }
    }

    filterStores(stores, query) {
        if (!query) return stores;
        
        const lowerQuery = query.toLowerCase();
        return stores.filter(store => 
            store.toLowerCase().includes(lowerQuery)
        );
    }

    standardizeStoreName(name) {
        return name.trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    async saveLastCartonNumber(cartonNumber) {
        const transaction = this.db.transaction(['cartonNumbers'], 'readwrite');
        const store = transaction.objectStore('cartonNumbers');
        
        const cartonData = {
            id: 'global',
            lastCartonNumber: cartonNumber,
            timestamp: new Date().toISOString()
        };
        
        return store.put(cartonData);
    }

    async getLastCartonNumber() {
        const transaction = this.db.transaction(['cartonNumbers'], 'readonly');
        const store = transaction.objectStore('cartonNumbers');
        const result = await store.get('global');
        return result ? result.lastCartonNumber : null;
    }

    parseCartonNumber(cartonNumber) {
        if (!cartonNumber || typeof cartonNumber !== 'string') {
            return null;
        }
        
        // Match patterns like PJ001, ABC123, Store001, etc.
        const match = cartonNumber.match(/^([A-Za-z]+)(\d+)$/);
        if (match) {
            return {
                prefix: match[1],
                number: parseInt(match[2], 10),
                paddingLength: match[2].length
            };
        }
        
        return null;
    }

    generateNextCartonNumber(lastCartonNumber) {
        const parsed = this.parseCartonNumber(lastCartonNumber);
        if (!parsed) {
            return null;
        }
        
        const nextNumber = parsed.number + 1;
        const paddedNumber = nextNumber.toString().padStart(parsed.paddingLength, '0');
        return parsed.prefix + paddedNumber;
    }

    async getNextCartonSuggestion() {
        const lastCarton = await this.getLastCartonNumber();
        if (!lastCarton) {
            return null;
        }
        
        return this.generateNextCartonNumber(lastCarton);
    }
}

window.StorageManager = StorageManager;
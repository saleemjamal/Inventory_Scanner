class InventoryApp {
    constructor() {
        this.storageManager = new StorageManager();
        this.cameraManager = new CameraManager();
        this.apiManager = new APIManager();
        this.storeManager = new StoreManager(this.apiManager);
        this.currentStores = [];
        this.selectedSuggestionIndex = -1;
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            await this.storageManager.init();
            window.storageManager = this.storageManager;
            window.storeManager = this.storeManager;
            
            // Initialize authentication first
            if (window.authManager) {
                await window.authManager.init();
            }
            
            this.bindFormEvents();
            this.setupAutocomplete();
            this.setupCartonNumberSuggestion();
            this.setupNavigation();
            this.registerServiceWorker();
            
            await this.loadStores();
            
            this.apiManager.updateStatus();
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showMessage('Failed to initialize app', 'error');
        }
    }

    bindFormEvents() {
        const form = document.getElementById('inventory-form');
        const clearBtn = document.getElementById('clear-form-btn');
        
        form.addEventListener('submit', (e) => this.handleSubmit(e));
        clearBtn.addEventListener('click', () => this.clearForm());
        
        const numericInputs = ['num-cartons', 'qty-per-carton', 'price'];
        numericInputs.forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('input', (e) => this.validateNumericInput(e));
        });
    }

    setupAutocomplete() {
        const storeInput = document.getElementById('store-name');
        const suggestions = document.getElementById('store-suggestions');
        
        storeInput.addEventListener('input', (e) => this.handleStoreInput(e));
        storeInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        storeInput.addEventListener('blur', (e) => this.handleBlur(e));
        
        suggestions.addEventListener('click', (e) => this.handleSuggestionClick(e));
    }

    async loadStores() {
        try {
            // Try to get stores from Store_Details sheet first
            const storeDetailsResponse = await this.getStoreDetailsForAutocomplete();
            
            if (storeDetailsResponse && storeDetailsResponse.length > 0) {
                // Use store names from Store_Details sheet
                this.currentStores = storeDetailsResponse.map(store => store.storename).filter(name => name);
            } else {
                // Fallback to existing method (store sheet names)
                this.currentStores = await this.apiManager.getStoreList();
            }
        } catch (error) {
            console.error('Failed to load stores:', error);
            // Fallback to existing method
            try {
                this.currentStores = await this.apiManager.getStoreList();
            } catch (fallbackError) {
                console.error('Fallback store loading failed:', fallbackError);
                this.currentStores = [];
            }
        }
    }

    async getStoreDetailsForAutocomplete() {
        try {
            const response = await fetch(this.apiManager.baseURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'getStoreDetails',
                    apiKey: this.apiManager.apiKey,
                    sessionToken: window.authManager.getSessionToken()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                return result.stores || [];
            } else {
                throw new Error(result.message || 'Failed to load store details');
            }
        } catch (error) {
            console.error('Error getting store details for autocomplete:', error);
            return null;
        }
    }

    handleStoreInput(e) {
        const query = e.target.value;
        const suggestions = document.getElementById('store-suggestions');
        
        if (query.length === 0) {
            suggestions.style.display = 'none';
            return;
        }
        
        const filteredStores = this.storageManager.filterStores(this.currentStores, query);
        
        if (filteredStores.length === 0) {
            suggestions.style.display = 'none';
            return;
        }
        
        suggestions.innerHTML = filteredStores
            .slice(0, 5)
            .map(store => `<div class="autocomplete-suggestion" data-store="${store}">${store}</div>`)
            .join('');
        
        suggestions.style.display = 'block';
        this.selectedSuggestionIndex = -1;
    }

    handleKeyDown(e) {
        const suggestions = document.getElementById('store-suggestions');
        const suggestionElements = suggestions.querySelectorAll('.autocomplete-suggestion');
        
        if (suggestionElements.length === 0) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.min(this.selectedSuggestionIndex + 1, suggestionElements.length - 1);
                this.updateSelectedSuggestion();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
                this.updateSelectedSuggestion();
                break;
            case 'Enter':
                if (this.selectedSuggestionIndex >= 0) {
                    e.preventDefault();
                    this.selectSuggestion(suggestionElements[this.selectedSuggestionIndex]);
                }
                break;
            case 'Escape':
                suggestions.style.display = 'none';
                this.selectedSuggestionIndex = -1;
                break;
        }
    }

    updateSelectedSuggestion() {
        const suggestionElements = document.querySelectorAll('.autocomplete-suggestion');
        
        suggestionElements.forEach((element, index) => {
            element.classList.toggle('selected', index === this.selectedSuggestionIndex);
        });
    }

    handleSuggestionClick(e) {
        if (e.target.classList.contains('autocomplete-suggestion')) {
            this.selectSuggestion(e.target);
        }
    }

    selectSuggestion(suggestionElement) {
        const storeName = suggestionElement.dataset.store;
        document.getElementById('store-name').value = storeName;
        document.getElementById('store-suggestions').style.display = 'none';
        this.selectedSuggestionIndex = -1;
        
        document.getElementById('item-name').focus();
    }

    handleBlur(e) {
        setTimeout(() => {
            document.getElementById('store-suggestions').style.display = 'none';
        }, 200);
    }

    setupCartonNumberSuggestion() {
        // Load initial carton suggestion on app start
        this.loadCartonSuggestion();
    }

    async loadCartonSuggestion() {
        const cartonInput = document.getElementById('carton-number');
        
        try {
            console.log('Loading carton suggestion from sheets...');
            
            // Get last carton number from Google Sheets
            const response = await fetch(this.apiManager.baseURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'getLastCartonNumber',
                    apiKey: this.apiManager.apiKey,
                    sessionToken: window.authManager.getSessionToken()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Last carton response:', result);
            
            if (result.success && result.lastCartonNumber) {
                const lastCarton = result.lastCartonNumber;
                console.log('Last carton number from sheets:', lastCarton);
                
                // Generate next suggestion using storage manager's logic
                const suggestion = this.storageManager.generateNextCartonNumber(lastCarton);
                console.log('Next suggestion:', suggestion);
                
                if (suggestion) {
                    cartonInput.value = suggestion;
                    cartonInput.placeholder = suggestion;
                }
            } else {
                console.log('No previous carton numbers found in sheets');
                cartonInput.placeholder = 'Enter carton number (e.g., PJ001)';
            }
        } catch (error) {
            console.error('Failed to load carton suggestion:', error);
            cartonInput.placeholder = 'Enter carton number';
        }
    }

    setupNavigation() {
        const inventoryTab = document.getElementById('inventory-tab');
        const storesTab = document.getElementById('stores-tab');

        inventoryTab.addEventListener('click', () => this.showInventoryView());
        storesTab.addEventListener('click', () => this.showStoresView());
    }

    showInventoryView() {
        // Update active tab
        document.getElementById('inventory-tab').classList.add('active');
        document.getElementById('stores-tab').classList.remove('active');

        // Show inventory sections
        document.querySelector('.camera-section').style.display = 'block';
        document.getElementById('inventory-form').style.display = 'block';

        // Hide store management (when we create it)
        const storeManagement = document.getElementById('store-management');
        if (storeManagement) {
            storeManagement.style.display = 'none';
        }
    }

    async showStoresView() {
        // Update active tab
        document.getElementById('stores-tab').classList.add('active');
        document.getElementById('inventory-tab').classList.remove('active');

        // Hide inventory sections
        document.querySelector('.camera-section').style.display = 'none';
        document.getElementById('inventory-form').style.display = 'none';

        // Show store management
        const storeManagement = document.getElementById('store-management');
        if (storeManagement) {
            storeManagement.style.display = 'block';
            // Load stores when showing the store management view
            await this.storeManager.loadStores();
        }
    }

    validateNumericInput(e) {
        const value = e.target.value;
        if (value && isNaN(value)) {
            e.target.value = value.replace(/[^\d.]/g, '');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        
        try {
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'block';
            
            const formData = this.getFormData();
            
            if (!this.validateForm(formData)) {
                return;
            }

            // Note: Carton number is now tracked via Google Sheets, not local storage
            
            // Save photo locally first (mobile share or desktop download)
            const saveResult = await this.cameraManager.savePhotoToLocal(formData.storeName, formData.cartonNumber);
            if (saveResult.success) {
                console.log('Photo saved locally:', saveResult.message);
            } else {
                console.warn('Failed to save photo locally:', saveResult.error);
            }
            
            // Upload image and submit data
            const timestamp = new Date().toISOString();
            const entryId = this.apiManager.generateEntryId();
            
            const imageUrl = await this.uploadImage(formData.storeName, formData.cartonNumber);
            
            // Clear form after image upload
            this.clearForm();
            this.cameraManager.resetCamera();
            this.showMessage('Submitting...', 'info');
            
            // Focus on store name for next entry
            document.getElementById('store-name').focus();
            
            const submissionData = {
                ...formData,
                imageUrl: imageUrl || '',
                timestamp: timestamp,
                entryId: entryId
            };
            
            const result = await this.apiManager.submitInventoryData(submissionData);
            
            if (result.success) {
                let message;
                if (result.offline) {
                    message = 'Entry saved offline. Will sync when online.';
                } else {
                    message = 'Entry submitted successfully!';
                    // Refresh carton suggestion for next entry
                    await this.loadCartonSuggestion();
                }
                
                // Add photo save info to success message
                if (saveResult.success) {
                    message += ` Photo ${saveResult.message.toLowerCase()}.`;
                }
                
                this.showMessage(message, 'success');
                
                await this.addNewStoreToCache(formData.storeName);
            } else {
                throw new Error(result.error || 'Submission failed');
            }
            
        } catch (error) {
            console.error('Submission error:', error);
            this.showMessage('Submission failed: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
        }
    }

    getFormData() {
        return {
            storeName: this.storageManager.standardizeStoreName(document.getElementById('store-name').value),
            itemName: document.getElementById('item-name').value.trim(),
            cartonNumber: document.getElementById('carton-number').value.trim(),
            numCartons: parseInt(document.getElementById('num-cartons').value),
            qtyPerCarton: parseInt(document.getElementById('qty-per-carton').value),
            price: parseFloat(document.getElementById('price').value),
            notes: document.getElementById('notes').value.trim()
        };
    }

    validateForm(data) {
        const requiredFields = ['storeName', 'itemName', 'cartonNumber', 'numCartons', 'qtyPerCarton', 'price'];
        
        for (const field of requiredFields) {
            if (!data[field] || data[field] === '') {
                this.showMessage(`Please fill in all required fields`, 'error');
                return false;
            }
        }
        
        if (data.numCartons < 1 || data.qtyPerCarton < 1 || data.price < 0) {
            this.showMessage('Please enter valid numbers for quantity and price', 'error');
            return false;
        }
        
        if (!this.cameraManager.getCapturedImage()) {
            this.showMessage('Please take a photo first', 'error');
            return false;
        }
        
        return true;
    }

    async uploadImage(storeName, cartonNumber) {
        const imageData = this.cameraManager.getCapturedImage();
        console.log('Captured image data:', imageData ? `Image found (${imageData.length} chars)` : 'No image captured');
        console.log('Camera manager capturedImageData:', this.cameraManager.capturedImageData ? 'exists' : 'null');
        
        if (!imageData) {
            console.log('No image to upload - skipping image upload');
            return null;
        }
        
        try {
            console.log('Uploading image...');
            return await this.apiManager.uploadImage(imageData, storeName, cartonNumber);
        } catch (error) {
            console.error('Image upload failed:', error);
            return null;
        }
    }

    async addNewStoreToCache(storeName) {
        if (!this.currentStores.includes(storeName)) {
            this.currentStores.push(storeName);
            await this.storageManager.addStore(storeName);
        }
    }

    clearForm() {
        document.getElementById('inventory-form').reset();
        document.getElementById('store-name').focus();
    }

    showMessage(text, type) {
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new InventoryApp();
});
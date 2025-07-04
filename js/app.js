class InventoryApp {
    constructor() {
        this.storageManager = new StorageManager();
        this.cameraManager = new CameraManager();
        this.apiManager = new APIManager();
        this.currentStores = [];
        this.selectedSuggestionIndex = -1;
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            await this.storageManager.init();
            window.storageManager = this.storageManager;
            
            this.bindFormEvents();
            this.setupAutocomplete();
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
            this.currentStores = await this.apiManager.getStoreList();
        } catch (error) {
            console.error('Failed to load stores:', error);
            this.currentStores = [];
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
            
            const imageUrl = await this.uploadImage(formData.storeName);
            
            const submissionData = {
                ...formData,
                imageUrl: imageUrl,
                timestamp: new Date().toISOString(),
                entryId: this.apiManager.generateEntryId()
            };
            
            const result = await this.apiManager.submitInventoryData(submissionData);
            
            if (result.success) {
                if (result.offline) {
                    this.showMessage('Entry saved offline. Will sync when online.', 'info');
                } else {
                    this.showMessage('Entry submitted successfully!', 'success');
                }
                
                await this.addNewStoreToCache(formData.storeName);
                this.clearForm();
                this.cameraManager.resetCamera();
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

    async uploadImage(storeName) {
        const imageData = this.cameraManager.getCapturedImage();
        if (!imageData) return null;
        
        try {
            return await this.apiManager.uploadImage(imageData, storeName);
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
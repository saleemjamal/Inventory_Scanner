class StoreManager {
    constructor(apiManager) {
        this.apiManager = apiManager;
        this.stores = [];
        this.currentEditingStore = null;
        
        this.bindEvents();
    }

    bindEvents() {
        // Add new store button
        const addStoreBtn = document.getElementById('add-store-btn');
        addStoreBtn.addEventListener('click', () => this.showStoreForm());

        // Store form events
        const storeForm = document.getElementById('store-form');
        storeForm.addEventListener('submit', (e) => this.handleStoreSubmit(e));

        const cancelBtn = document.getElementById('cancel-store-btn');
        cancelBtn.addEventListener('click', () => this.hideStoreForm());
    }

    async showStoreForm(store = null) {
        const form = document.getElementById('store-form');
        const title = document.getElementById('store-form-title');
        
        if (store) {
            // Edit mode
            title.textContent = 'Edit Store Details';
            this.currentEditingStore = store;
            this.populateStoreForm(store);
        } else {
            // Add mode
            title.textContent = 'Add New Store';
            this.currentEditingStore = null;
            this.clearStoreForm();
        }
        
        form.style.display = 'block';
        document.getElementById('store-form-name').focus();
    }

    hideStoreForm() {
        document.getElementById('store-form').style.display = 'none';
        this.currentEditingStore = null;
        this.clearStoreForm();
    }

    populateStoreForm(store) {
        document.getElementById('store-form-name').value = store.storename || '';
        document.getElementById('store-form-number').value = store.storenumber || '';
        document.getElementById('store-form-address').value = store.address || '';
        document.getElementById('store-form-contact-person').value = store.contactperson || '';
        document.getElementById('store-form-phone').value = store.phone || '';
        document.getElementById('store-form-email').value = store.email || '';
        document.getElementById('store-form-notes').value = store.notes || '';
    }

    clearStoreForm() {
        document.getElementById('store-form-name').value = '';
        document.getElementById('store-form-number').value = '';
        document.getElementById('store-form-address').value = '';
        document.getElementById('store-form-contact-person').value = '';
        document.getElementById('store-form-phone').value = '';
        document.getElementById('store-form-email').value = '';
        document.getElementById('store-form-notes').value = '';
    }

    getStoreFormData() {
        return {
            storeName: document.getElementById('store-form-name').value.trim(),
            storeNumber: document.getElementById('store-form-number').value.trim(),
            address: document.getElementById('store-form-address').value.trim(),
            contactPerson: document.getElementById('store-form-contact-person').value.trim(),
            phone: document.getElementById('store-form-phone').value.trim(),
            email: document.getElementById('store-form-email').value.trim(),
            notes: document.getElementById('store-form-notes').value.trim()
        };
    }

    validateStoreForm(data) {
        if (!data.storeName) {
            this.showMessage('Store name is required', 'error');
            return false;
        }
        
        if (data.email && !this.isValidEmail(data.email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return false;
        }
        
        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async handleStoreSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('save-store-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        
        try {
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'block';
            
            const formData = this.getStoreFormData();
            
            if (!this.validateStoreForm(formData)) {
                return;
            }

            let result;
            if (this.currentEditingStore) {
                // Update existing store
                result = await this.updateStore(this.currentEditingStore.storeid, formData);
            } else {
                // Create new store
                result = await this.saveStore(formData);
            }

            if (result.success) {
                this.showMessage(result.message, 'success');
                this.hideStoreForm();
                await this.loadStores();
            } else {
                throw new Error(result.message || 'Failed to save store');
            }

        } catch (error) {
            console.error('Store submission error:', error);
            this.showMessage('Failed to save store: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
        }
    }

    async saveStore(storeData) {
        try {
            const response = await fetch(this.apiManager.baseURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'saveStoreDetails',
                    apiKey: this.apiManager.apiKey,
                    sessionToken: window.authManager.getSessionToken(),
                    storeData: storeData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving store:', error);
            return { success: false, error: error.message };
        }
    }

    async updateStore(storeId, storeData) {
        try {
            const response = await fetch(this.apiManager.baseURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'updateStoreDetails',
                    apiKey: this.apiManager.apiKey,
                    sessionToken: window.authManager.getSessionToken(),
                    storeId: storeId,
                    storeData: storeData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating store:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteStore(storeId) {
        if (!confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(this.apiManager.baseURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'deleteStore',
                    apiKey: this.apiManager.apiKey,
                    sessionToken: window.authManager.getSessionToken(),
                    storeId: storeId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showMessage('Store deleted successfully', 'success');
                await this.loadStores();
            } else {
                throw new Error(result.message || 'Failed to delete store');
            }

        } catch (error) {
            console.error('Error deleting store:', error);
            this.showMessage('Failed to delete store: ' + error.message, 'error');
        }
    }

    async loadStores() {
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
                this.stores = result.stores || [];
                this.renderStores();
            } else {
                throw new Error(result.message || 'Failed to load stores');
            }

        } catch (error) {
            console.error('Error loading stores:', error);
            this.showMessage('Failed to load stores: ' + error.message, 'error');
        }
    }

    renderStores() {
        const storesGrid = document.getElementById('stores-grid');
        
        if (this.stores.length === 0) {
            storesGrid.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No stores found. Click "Add New Store" to get started.</p>';
            return;
        }

        storesGrid.innerHTML = this.stores.map(store => this.createStoreCard(store)).join('');
    }

    createStoreCard(store) {
        return `
            <div class="store-card">
                <h3>${store.storename || 'Unnamed Store'}</h3>
                ${store.storenumber ? `<p><strong>Store #:</strong> ${store.storenumber}</p>` : ''}
                ${store.address ? `<p><strong>Address:</strong> ${store.address}</p>` : ''}
                ${store.contactperson ? `<p><strong>Contact:</strong> ${store.contactperson}</p>` : ''}
                ${store.phone ? `<p><strong>Phone:</strong> ${store.phone}</p>` : ''}
                ${store.email ? `<p><strong>Email:</strong> ${store.email}</p>` : ''}
                <div class="store-card-actions">
                    <button class="btn btn-primary" onclick="window.storeManager.showStoreForm(${JSON.stringify(store).replace(/"/g, '&quot;')})">Edit</button>
                    <button class="btn btn-secondary" onclick="window.storeManager.deleteStore('${store.storeid}')">Delete</button>
                </div>
            </div>
        `;
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = 'block';
            
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }
}

window.StoreManager = StoreManager;
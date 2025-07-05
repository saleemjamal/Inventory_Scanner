class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isSignedIn = false;
        this.sessionToken = null;
    }

    async init() {
        // Set up login form
        this.bindLoginEvents();
        
        // Check if user is already logged in
        this.loadStoredAuth();
        this.updateUI();
    }

    bindLoginEvents() {
        const loginForm = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const loginBtn = document.getElementById('login-btn');
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoader = loginBtn.querySelector('.btn-loader');
        
        try {
            loginBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'block';
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                throw new Error('Please enter both username and password');
            }
            
            // Call login API
            const result = await this.authenticateUser(username, password);
            
            // Login successful, update UI
            
            if (result.success) {
                this.currentUser = result.user;
                this.sessionToken = result.sessionToken;
                this.isSignedIn = true;
                
                // Store auth data
                this.storeAuth();
                
                // Update UI
                this.updateUI();
                
                // Clear form
                document.getElementById('login-form').reset();
                
                this.showAuthMessage(`Welcome, ${this.currentUser.name}!`, 'success');
            } else {
                throw new Error(result.error || 'Login failed');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showAuthError(error.message);
        } finally {
            loginBtn.disabled = false;
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
        }
    }

    async authenticateUser(username, password) {
        try {
            // Hash password for transmission (simple base64 for demo)
            const hashedPassword = btoa(password);
            
            // Use API URL and key directly for login
            const apiURL = window.apiManager?.baseURL || 'https://script.google.com/macros/s/AKfycbxAtZ1o5zSTX9YD_mqsfine3byzzU0Vc5WMoGHwQQ3KFBq9zoWVQ6NyRNup2_BaHLi_aA/exec';
            const apiKey = window.apiManager?.apiKey || 'INV_SCAN_2025_SECURE_KEY_poppatjamals_xyz789';
            
            const response = await fetch(apiURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'login',
                    apiKey: apiKey,
                    username: username,
                    password: hashedPassword
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('Authentication error:', error);
            return { success: false, error: error.message };
        }
    }

    storeAuth() {
        if (this.currentUser && this.sessionToken) {
            localStorage.setItem('inventory_auth', JSON.stringify({
                user: this.currentUser,
                sessionToken: this.sessionToken,
                timestamp: Date.now()
            }));
        }
    }

    loadStoredAuth() {
        try {
            const stored = localStorage.getItem('inventory_auth');
            if (stored) {
                const authData = JSON.parse(stored);
                
                // Check if session is not too old (24 hours)
                const maxAge = 24 * 60 * 60 * 1000;
                if (Date.now() - authData.timestamp < maxAge) {
                    this.currentUser = authData.user;
                    this.sessionToken = authData.sessionToken;
                    this.isSignedIn = true;
                } else {
                    // Session expired, clear it
                    localStorage.removeItem('inventory_auth');
                }
            }
        } catch (error) {
            console.error('Error loading stored auth:', error);
            localStorage.removeItem('inventory_auth');
        }
    }

    logout() {
        this.currentUser = null;
        this.sessionToken = null;
        this.isSignedIn = false;
        
        // Clear stored auth
        localStorage.removeItem('inventory_auth');
        
        // Update UI
        this.updateUI();
        
        this.showAuthMessage('You have been logged out.', 'info');
    }

    updateUI() {
        const loginContainer = document.getElementById('login-container');
        const userInfo = document.getElementById('user-info');
        const inventoryForm = document.getElementById('inventory-form');
        const cameraSection = document.querySelector('.camera-section');

        if (this.isSignedIn && this.currentUser) {
            // Show user info, hide login
            loginContainer.style.display = 'none';
            userInfo.style.display = 'flex';
            
            // Populate user info
            document.getElementById('user-name').textContent = this.currentUser.name || this.currentUser.username;
            
            // Show app content
            inventoryForm.style.display = 'block';
            if (cameraSection) cameraSection.style.display = 'block';
            
        } else {
            // Show login, hide user info
            loginContainer.style.display = 'block';
            userInfo.style.display = 'none';
            
            // Hide app content
            inventoryForm.style.display = 'none';
            if (cameraSection) cameraSection.style.display = 'none';
        }
    }

    showAuthError(message) {
        this.showAuthMessage(message, 'error');
    }

    showAuthMessage(message, type = 'info') {
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

    // Method to get session token for API requests
    getSessionToken() {
        return this.sessionToken;
    }

    // Method to check if user is authenticated
    isAuthenticated() {
        return this.isSignedIn && this.currentUser && this.sessionToken;
    }

    // Method to get current user info
    getCurrentUser() {
        return this.currentUser;
    }
}

// Global auth manager instance
window.authManager = new AuthManager();
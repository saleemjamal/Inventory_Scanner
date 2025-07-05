class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isSignedIn = false;
        this.idToken = null;
        this.allowedDomain = 'poppatjamals.com';
        
        // Bind the global callback function
        window.handleCredentialResponse = this.handleCredentialResponse.bind(this);
    }

    async init() {
        // Wait for Google Identity Services to load
        if (typeof google === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }

        try {
            google.accounts.id.initialize({
                client_id: '453460892232-579kkit0k13ks8t7n3qhkhvasb6qoejn.apps.googleusercontent.com', // You'll need to replace this
                callback: this.handleCredentialResponse.bind(this),
                auto_select: false,
                cancel_on_tap_outside: false
            });

            // Set up sign-out button
            const signOutBtn = document.getElementById('sign-out-btn');
            if (signOutBtn) {
                signOutBtn.addEventListener('click', () => this.signOut());
            }

            // Check if user is already signed in (from localStorage)
            this.loadStoredAuth();
            this.updateUI();

        } catch (error) {
            console.error('Failed to initialize Google Auth:', error);
        }
    }

    handleCredentialResponse(response) {
        try {
            // Decode the JWT token to get user info
            const payload = this.parseJWT(response.credential);
            
            // Check if email is from allowed domain
            if (!payload.email || !payload.email.endsWith('@' + this.allowedDomain)) {
                this.showAuthError(`Only @${this.allowedDomain} accounts are allowed.`);
                return;
            }

            // Set user data
            this.currentUser = {
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                sub: payload.sub
            };
            this.idToken = response.credential;
            this.isSignedIn = true;

            // Store auth data
            this.storeAuth();
            
            // Update UI
            this.updateUI();
            
            // Show success message
            this.showAuthMessage(`Welcome, ${this.currentUser.name}!`, 'success');

        } catch (error) {
            console.error('Authentication error:', error);
            this.showAuthError('Authentication failed. Please try again.');
        }
    }

    parseJWT(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    }

    storeAuth() {
        if (this.currentUser && this.idToken) {
            localStorage.setItem('inventory_auth', JSON.stringify({
                user: this.currentUser,
                token: this.idToken,
                timestamp: Date.now()
            }));
        }
    }

    loadStoredAuth() {
        try {
            const stored = localStorage.getItem('inventory_auth');
            if (stored) {
                const authData = JSON.parse(stored);
                
                // Check if token is not too old (24 hours)
                const maxAge = 24 * 60 * 60 * 1000;
                if (Date.now() - authData.timestamp < maxAge) {
                    this.currentUser = authData.user;
                    this.idToken = authData.token;
                    this.isSignedIn = true;
                } else {
                    // Token expired, clear it
                    localStorage.removeItem('inventory_auth');
                }
            }
        } catch (error) {
            console.error('Error loading stored auth:', error);
            localStorage.removeItem('inventory_auth');
        }
    }

    signOut() {
        this.currentUser = null;
        this.idToken = null;
        this.isSignedIn = false;
        
        // Clear stored auth
        localStorage.removeItem('inventory_auth');
        
        // Update UI
        this.updateUI();
        
        this.showAuthMessage('You have been signed out.', 'info');
    }

    updateUI() {
        const signInContainer = document.getElementById('sign-in-container');
        const userInfo = document.getElementById('user-info');
        const authRequiredMessage = document.getElementById('auth-required-message');
        const inventoryForm = document.getElementById('inventory-form');
        const cameraSection = document.querySelector('.camera-section');

        if (this.isSignedIn && this.currentUser) {
            // Show user info, hide sign-in
            signInContainer.style.display = 'none';
            userInfo.style.display = 'flex';
            
            // Populate user info
            document.getElementById('user-avatar').src = this.currentUser.picture || '';
            document.getElementById('user-name').textContent = this.currentUser.name || this.currentUser.email;
            
            // Show app content
            authRequiredMessage.style.display = 'none';
            inventoryForm.style.display = 'block';
            if (cameraSection) cameraSection.style.display = 'block';
            
        } else {
            // Show sign-in, hide user info
            signInContainer.style.display = 'block';
            userInfo.style.display = 'none';
            
            // Hide app content
            authRequiredMessage.style.display = 'block';
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

    // Method to get ID token for API requests
    getIdToken() {
        return this.idToken;
    }

    // Method to check if user is authenticated
    isAuthenticated() {
        return this.isSignedIn && this.currentUser && this.idToken;
    }

    // Method to get current user info
    getCurrentUser() {
        return this.currentUser;
    }
}

// Global auth manager instance
window.authManager = new AuthManager();
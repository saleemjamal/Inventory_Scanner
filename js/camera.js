class CameraManager {
    constructor() {
        this.videoElement = document.getElementById('camera-feed');
        this.canvas = document.getElementById('photo-canvas');
        this.previewContainer = document.getElementById('photo-preview');
        this.previewImage = document.getElementById('preview-image');
        this.stream = null;
        this.capturedImageData = null;
        
        this.startCameraBtn = document.getElementById('start-camera-btn');
        this.takePhotoBtn = document.getElementById('take-photo-btn');
        this.savePhotoBtn = document.getElementById('save-photo-btn');
        this.retakePhotoBtn = document.getElementById('retake-photo-btn');
        
        this.bindEvents();
    }

    bindEvents() {
        this.startCameraBtn.addEventListener('click', () => this.startCamera());
        this.takePhotoBtn.addEventListener('click', () => this.takePhoto());
        this.savePhotoBtn.addEventListener('click', () => this.savePhoto());
        this.retakePhotoBtn.addEventListener('click', () => this.retakePhoto());
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            
            this.videoElement.srcObject = this.stream;
            this.videoElement.style.display = 'block';
            this.previewContainer.style.display = 'none';
            
            this.startCameraBtn.style.display = 'none';
            this.takePhotoBtn.style.display = 'inline-block';
            this.retakePhotoBtn.style.display = 'none';
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showError('Camera access denied or not available');
        }
    }

    takePhoto() {
        console.log('takePhoto() called, stream exists:', !!this.stream);
        if (!this.stream) return;
        
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.videoElement.videoWidth;
        this.canvas.height = this.videoElement.videoHeight;
        
        console.log('Canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
        
        context.drawImage(this.videoElement, 0, 0);
        
        this.compressImage((compressedDataUrl) => {
            console.log('Image compressed, data length:', compressedDataUrl ? compressedDataUrl.length : 'null');
            this.capturedImageData = compressedDataUrl;
            this.previewImage.src = compressedDataUrl;
            
            this.videoElement.style.display = 'none';
            this.previewContainer.style.display = 'flex';
            
            this.takePhotoBtn.style.display = 'none';
            this.savePhotoBtn.style.display = 'inline-block';
            this.retakePhotoBtn.style.display = 'inline-block';
            
            this.stopCamera();
            
            document.getElementById('inventory-form').style.display = 'block';
            document.getElementById('store-name').focus();
            
            console.log('Photo capture completed, capturedImageData set:', !!this.capturedImageData);
        });
    }

    compressImage(callback, quality = 0.8) {
        const maxWidth = 1024;
        const maxHeight = 768;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const originalWidth = this.canvas.width;
        const originalHeight = this.canvas.height;
        
        let { width, height } = this.calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight);
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(this.canvas, 0, 0, width, height);
        
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        if (compressedDataUrl.length > 500 * 1024 && quality > 0.1) {
            this.compressImage(callback, quality - 0.1);
        } else {
            callback(compressedDataUrl);
        }
    }

    calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        let width = originalWidth;
        let height = originalHeight;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        return { width, height };
    }

    async savePhoto() {
        if (!this.capturedImageData) {
            this.showError('No photo to save');
            return;
        }

        try {
            // Generate filename from form data if available
            const storeName = document.getElementById('store-name')?.value || 'Photo';
            const cartonNumber = document.getElementById('carton-number')?.value || 'Unknown';
            const cleanStoreName = storeName.replace(/[^a-zA-Z0-9]/g, '_');
            const cleanCartonNumber = cartonNumber.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${cleanStoreName}_${cleanCartonNumber}.jpg`;

            // Convert base64 to blob
            const base64Data = this.capturedImageData.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });
            const file = new File([blob], filename, { type: 'image/jpeg' });

            // Check if Web Share API is supported with files
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                // Mobile: Use native share menu
                await navigator.share({
                    files: [file],
                    title: 'Inventory Photo',
                    text: `Photo: ${filename}`
                });
                this.showSuccess('Photo shared successfully');
            } else {
                // Desktop: Download fallback
                const url = URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = filename;
                downloadLink.style.display = 'none';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(url);
                this.showSuccess('Photo downloaded to Downloads folder');
            }
        } catch (error) {
            console.error('Error saving photo:', error);
            this.showError('Failed to save photo: ' + error.message);
        }
    }

    retakePhoto() {
        console.log('retakePhoto() called - clearing capturedImageData');
        this.capturedImageData = null;
        this.previewContainer.style.display = 'none';
        this.savePhotoBtn.style.display = 'none';
        this.retakePhotoBtn.style.display = 'none';
        this.startCameraBtn.style.display = 'inline-block';
        
        document.getElementById('inventory-form').style.display = 'none';
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    getCapturedImage() {
        return this.capturedImageData;
    }

    showError(message) {
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = message;
        messageDiv.className = 'message error';
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = message;
        messageDiv.className = 'message success';
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }

    resetCamera() {
        console.log('resetCamera() called - clearing capturedImageData');
        this.stopCamera();
        this.capturedImageData = null;
        this.videoElement.style.display = 'none';
        this.previewContainer.style.display = 'none';
        this.startCameraBtn.style.display = 'inline-block';
        this.takePhotoBtn.style.display = 'none';
        this.savePhotoBtn.style.display = 'none';
        this.retakePhotoBtn.style.display = 'none';
        document.getElementById('inventory-form').style.display = 'none';
    }
}

window.CameraManager = CameraManager;
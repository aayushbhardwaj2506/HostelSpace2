/* ==========================================================================
   HostelSpace — AI Smart Scanner Logic
   Handles Camera Access, Image Capture, and AI API Integration
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we are on the scanner page
    if (!document.getElementById('cameraStream')) return;
    
    initScanner();
});

function initScanner() {
    const video = document.getElementById('cameraStream');
    const canvas = document.getElementById('captureCanvas');
    const captureBtn = document.getElementById('captureBtn');
    
    const scannerInterface = document.getElementById('scannerInterface');
    const scannerResults = document.getElementById('scannerResults');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const analysisContent = document.getElementById('analysisContent');
    const resetScannerBtn = document.getElementById('resetScannerBtn');
    
    const apiKeyModal = document.getElementById('apiKeyModal');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');

    let stream = null;

    function checkApiKey() {
        // Automatically start since we have the key hardcoded
        apiKeyModal.setAttribute('hidden', '');
        scannerInterface.removeAttribute('hidden');
        startCamera();
    }

    // --- Camera Logic ---
    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } // Prefer back camera on mobile
            });
            video.srcObject = stream;
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access the camera. Please ensure permissions are granted.");
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }

    // --- Image Capture & AI Logic ---
    captureBtn.addEventListener('click', async () => {
        // Draw video frame to canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to Base64
        const base64DataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Update UI
        scannerResults.removeAttribute('hidden');
        loadingIndicator.removeAttribute('hidden');
        analysisContent.setAttribute('hidden', '');
        captureBtn.disabled = true;

        await analyzeImageWithOpenRouter(base64DataUrl);
    });

    resetScannerBtn.addEventListener('click', () => {
        scannerResults.setAttribute('hidden', '');
        captureBtn.disabled = false;
    });

    async function analyzeImageWithOpenRouter(base64DataUrl) {
        const url = `/api/analyze`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ base64DataUrl })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            displayResults(data);

        } catch (error) {
            console.error("Error analyzing image:", error);
            alert("Failed to analyze the image. Please check the API key and connection.");
            loadingIndicator.setAttribute('hidden', '');
            captureBtn.disabled = false;
        }
    }

    function displayResults(data) {
        document.getElementById('objName').textContent = data.name || "Unknown Object";
        document.getElementById('objCategory').textContent = data.category || "General";
        document.getElementById('objPurpose').textContent = data.purpose || "N/A";
        document.getElementById('objSize').textContent = data.size || "N/A";
        document.getElementById('objSuggestion').textContent = data.suggestion || "No suggestion available.";

        loadingIndicator.setAttribute('hidden', '');
        analysisContent.removeAttribute('hidden');
    }

    // Initialize
    checkApiKey();
}

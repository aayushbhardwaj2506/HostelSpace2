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
    const saveToRoomBtn = document.getElementById('saveToRoomBtn');
    
    let currentScannedItem = null;

    let stream = null;

    // --- API Key Management ---
    function checkApiKey() {
        // Automatically start since we have the key handled on the backend
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
        
        // Reset buttons
        saveToRoomBtn.disabled = false;
        saveToRoomBtn.textContent = "Save to Room";

        await analyzeImageWithOpenRouter(base64DataUrl);
    });

    resetScannerBtn.addEventListener('click', () => {
        scannerResults.setAttribute('hidden', '');
        captureBtn.disabled = false;
        currentScannedItem = null;
    });
    
    saveToRoomBtn.addEventListener('click', async () => {
        if (!currentScannedItem || !window.db) return;
        
        saveToRoomBtn.disabled = true;
        saveToRoomBtn.textContent = "Saving...";
        
        try {
            // Determine a standardized location ID based on the AI's suggestion
            // For now, we will store the raw suggestion and a standardized "locationId"
            let locationId = "unknown";
            const suggestion = currentScannedItem.suggestion.toLowerCase();
            
            if (suggestion.includes("cupboard a")) locationId = "cupboard-a";
            else if (suggestion.includes("cupboard b") || suggestion.includes("cupboard")) locationId = "cupboard-b";
            else if (suggestion.includes("shelf a") || suggestion.includes("shelf")) locationId = "shelf-a";
            else if (suggestion.includes("shelf b")) locationId = "shelf-b";
            else if (suggestion.includes("under bed a") || suggestion.includes("bed")) locationId = "under-bed-a";
            else if (suggestion.includes("under bed b")) locationId = "under-bed-b";
            else if (suggestion.includes("window slab") || suggestion.includes("window")) locationId = "window-slab";
            else locationId = "shelf-a"; // Default fallback
            
            await window.db.collection("items").add({
                name: currentScannedItem.name,
                category: currentScannedItem.category,
                purpose: currentScannedItem.purpose,
                size: currentScannedItem.size,
                rawSuggestion: currentScannedItem.suggestion,
                locationId: locationId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            saveToRoomBtn.textContent = "Saved Successfully ✓";
            
        } catch (error) {
            console.error("Error saving to Firebase:", error);
            alert("Failed to save item. Make sure your Firestore rules allow writing in test mode.");
            saveToRoomBtn.disabled = false;
            saveToRoomBtn.textContent = "Save to Room";
        }
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
            currentScannedItem = data;
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

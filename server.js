const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint for AI Scanner
app.post('/api/analyze', async (req, res) => {
    const { base64DataUrl } = req.body;
    
    if (!base64DataUrl) {
        return res.status(400).json({ error: 'No image provided' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error("API Key missing in server environment");
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const promptText = `
    You are a smart hostel room organization assistant. Analyze this image of an object or part of a room.
    Identify the primary object in focus. 
    Determine its general category (e.g., Electronics, Stationery, Clothing, Toiletries).
    Determine its primary purpose.
    Estimate its approximate physical size.
    Finally, suggest the most logical place to store it in a typical student hostel room (e.g., "Shelf A", "Under Bed", "Desk Drawer", "Cupboard") based on how frequently it is used (daily vs rarely) and logical grouping with similar items.

    Respond ONLY with a valid JSON object in the exact following format, without any markdown formatting or code blocks:
    {
        "name": "Object Name",
        "category": "Category",
        "purpose": "Brief purpose description",
        "size": "Estimated size",
        "suggestion": "Detailed storage suggestion explaining why"
    }
    `;

    const requestBody = {
        model: "openai/gpt-4o-mini",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: promptText },
                    { type: "image_url", image_url: { url: base64DataUrl } }
                ]
            }
        ]
    };

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3000', // Update this when deploying to Render
                'X-Title': 'HostelSpace'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            console.error("OpenRouter API Error:", response.status, response.statusText);
            const errorText = await response.text();
            console.error(errorText);
            return res.status(response.status).json({ error: 'Failed to communicate with AI API' });
        }

        const data = await response.json();
        
        let responseText = data.choices[0].message.content;
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const result = JSON.parse(responseText);
        res.json(result);

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

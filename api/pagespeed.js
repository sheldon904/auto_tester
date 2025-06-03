export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url, strategy } = req.query;

    if (!url || !strategy) {
        return res.status(400).json({ 
            error: 'Missing required parameters: url and strategy' 
        });
    }

    try {
        // Get API key from environment variable (optional)
        const apiKey = process.env.PAGESPEED_API_KEY;
        
        // Build the PageSpeed Insights API URL
        const params = new URLSearchParams({
            url: url,
            strategy: strategy,
            category: 'performance'
        });

        if (apiKey) {
            params.append('key', apiKey);
        }

        const apiUrl = `https://www.googleapis.com/pagespeed/insights/v5/runPagespeed?${params}`;
        
        console.log(`Calling PageSpeed API for ${strategy}: ${url}`);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'PageSpeed-Batch-Tester/1.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`PageSpeed API error: ${response.status} ${response.statusText}`, errorText);
            
            return res.status(response.status).json({
                error: `PageSpeed API error: ${response.status} ${response.statusText}`,
                details: errorText
            });
        }

        const data = await response.json();
        
        // Validate the response structure
        if (!data.lighthouseResult || !data.lighthouseResult.audits) {
            console.error('Invalid PageSpeed API response structure', data);
            return res.status(500).json({
                error: 'Invalid response from PageSpeed API',
                details: 'Missing lighthouse data'
            });
        }

        console.log(`PageSpeed API call successful for ${strategy}`);
        
        return res.status(200).json(data);

    } catch (error) {
        console.error('PageSpeed API call failed:', error);
        
        return res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
}
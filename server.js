// Example using Node.js and Express
const express = require('express');
const fetch = require('node-fetch'); // Need to install 'node-fetch'
const app = express();
const port = 3000;

// Configuration and Constants (Same as in your HTML file)
const BASE_URL = 'https://api.airplanes.live/v2/point/';
const _radius = 5;
const _distance_threshold = 7000;
const NM_TO_FEET = 6076.115;

// Define the new JSON endpoint URL
app.get('/api/noise-signal', async (req, res) => {
    // 1. Get Location from Query Parameters
    const userLatitude = parseFloat(req.query.lat);
    const userLongitude = parseFloat(req.query.lon);

    if (isNaN(userLatitude) || isNaN(userLongitude)) {
        return res.status(400).json({ error: "Missing or invalid 'lat' or 'lon' query parameters." });
    }

    try {
        // 2. Fetch data from the external API (as you did in your JS)
        const url = `${BASE_URL}${userLatitude.toFixed(3)}/${userLongitude.toFixed(3)}/${_radius}`;
        const response = await fetch(url);
        const data = await response.json();
        
        const aircraftList = data.ac || [];

        // 3. Re-implement ALL your filtering and calculation logic
        const air_borne = aircraftList
            .filter(ac => ac.alt_baro !== 'ground' && ac.alt_baro != null && ac.dst != null && ac.gs != null)
            .map(ac => {
                const alt_ft = parseFloat(ac.alt_baro);
                const dst_nm = parseFloat(ac.dst);
                const gs_val = parseFloat(ac.gs);

                if (isNaN(alt_ft) || isNaN(dst_nm) || isNaN(gs_val) || alt_ft <= 0 || alt_ft >= 3500) {
                    return null;
                }

                const horizontal_dist_ft = dst_nm * NM_TO_FEET;
                const distance_ft = Math.sqrt(horizontal_dist_ft ** 2 + alt_ft ** 2);
                
                return { distance: distance_ft }; // Only need distance for the noise calculation
            })
            .filter(p => p !== null); 

        // 4. Calculate the Final Signal (The number of "noisy" planes)
        const noisyPlanes = air_borne.filter(p => p.distance < _distance_threshold);
        
        // 5. Return the JSON Signal
        return res.json({
            status: "ok",
            total_planes_found: data.total || 0,
            noisy_planes_count: noisyPlanes.length, // This is your core signal
            noise_signal: noisyPlanes.length > 0 ? 1 : 0 // Simple 1/0 signal
        });

    } catch (e) {
        console.error("Error fetching data:", e);
        return res.status(500).json({ error: "Internal server error during data fetch." });
    }
});

app.listen(port, () => {
    console.log(`JSON endpoint listening at http://localhost:${port}/api/noise-signal`);
});

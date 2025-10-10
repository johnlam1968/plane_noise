// This file will run as a serverless function on Vercel
const fetch = require('node-fetch'); 

// (Copy all your constants here)
const BASE_URL = 'https://api.airplanes.live/v2/point/';
const _radius = 5;
const _distance_threshold = 7000;
const NM_TO_FEET = 6076.115;

// The main handler function
module.exports = async (req, res) => {
    // Vercel gets query params from req.query
    const userLatitude = parseFloat(req.query.lat);
    const userLongitude = parseFloat(req.query.lon);

    if (isNaN(userLatitude) || isNaN(userLongitude)) {
        res.status(400).json({ error: "Missing 'lat' or 'lon' query parameters." });
        return;
    }
    
    // ... (Paste all your plane filtering and noise calculation logic here) ...

    try {
        const url = `${BASE_URL}${userLatitude.toFixed(3)}/${userLongitude.toFixed(3)}/${_radius}`;
        const response = await fetch(url);
        const data = await response.json();
        
        // ... (The rest of your core logic goes here) ...
        const aircraftList = data.ac || [];
        const air_borne = aircraftList
            .filter(ac => ac.alt_baro !== 'ground' && ac.alt_baro != null && ac.dst != null && ac.gs != null)
            .map(ac => {
                const alt_ft = parseFloat(ac.alt_baro);
                const dst_nm = parseFloat(ac.dst);
                const horizontal_dist_ft = dst_nm * NM_TO_FEET;
                const distance_ft = Math.sqrt(horizontal_dist_ft ** 2 + alt_ft ** 2);
                return { distance: distance_ft };
            })
            .filter(p => p.distance > 0 && p.distance < Infinity); // Simplified filters
            
        const noisyPlanes = air_borne.filter(p => p.distance < _distance_threshold);

        // Send the JSON response back to the iOS Shortcut
        res.status(200).json({
            noise_signal: noisyPlanes.length > 0 ? 1 : 0, // Your core signal (1 or 0)
            noisy_planes_count: noisyPlanes.length,
            total_planes_airborne: air_borne.length,
            total_planes_found: aircraftList.length,a
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to process air traffic data." });
    }
};


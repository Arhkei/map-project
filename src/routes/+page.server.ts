import { GOOGLE_MAPS_API_KEY } from '$env/static/private';
import { fail } from '@sveltejs/kit';

export const actions = {
    getDirections: async ({ request }) => {
        const formData = await request.formData();
        const query = formData.get('destination')?.toString();
        const origin = formData.get('origin')?.toString();

        // Fallback coordinates (Irvine/Orange County area)
        let lat = 34.0522;
        let lng = -118.2433;

        // Parse user coordinates if available
        if (origin && origin.includes(',')) {
            const parts = origin.split(',');
            lat = parseFloat(parts[0]);
            lng = parseFloat(parts[1]);
        }

        if (!query) return fail(400, { error: 'Please enter a destination.' });

        try {
            // 1. SEARCH FOR THE PLACE
            const placeRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location'
                },
                body: JSON.stringify({
                    textQuery: query,
                    locationBias: {
                        circle: {
                            center: { latitude: lat, longitude: lng },
                            radius: 15000.0 // 15km bias toward user
                        }
                    }
                })
            });

            const placeData = await placeRes.json();

            if (!placeData.places || placeData.places.length === 0) {
                return fail(404, { error: 'Location not found. Try a different name.' });
            }

            const bestMatch = placeData.places[0];
            const destCoords = `${bestMatch.location.latitude},${bestMatch.location.longitude}`;

            // 2. GET DRIVING DIRECTIONS
            const dirUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${lat},${lng}&destination=${destCoords}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
            const dirRes = await fetch(dirUrl);
            const dirData = await dirRes.json();

            if (dirData.status !== 'OK') {
                return fail(500, { error: 'Could not calculate a driving route.' });
            }

            const leg = dirData.routes[0].legs[0];

            // 3. MAP STEPS WITH CLEANED TEXT & DISTANCE
            const steps = leg.steps.map((s: any) => {
                // Remove HTML tags (like <b> or <div style...>)
                let instruction = s.html_instructions.replace(/<[^>]*>?/gm, ' ');
                
                // Remove the "Restricted usage road" warning specifically
                instruction = instruction.replace(/Restricted usage road/gi, '');
                
                // Remove double spaces and trim
                instruction = instruction.replace(/\s\s+/g, ' ').trim();

                return {
                    instruction: instruction,
                    distance: s.distance.text // e.g., "0.5 mi" or "400 ft"
                };
            });

            return { 
                steps, 
                eta: leg.duration.text,
                destinationName: `${bestMatch.displayName.text} (${bestMatch.formattedAddress.split(',')[0]})` 
            };

        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Connection error. Please try again.' });
        }
    }
};
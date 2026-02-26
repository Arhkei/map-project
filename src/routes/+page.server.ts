import { GOOGLE_MAPS_API_KEY } from '$env/static/private';
import { fail } from '@sveltejs/kit';

export const actions = {
    getDirections: async ({ request }) => {
        const formData = await request.formData();
        const query = formData.get('destination')?.toString();
        const origin = formData.get('origin')?.toString();

        let lat = 33.6846, lng = -117.8265;
        if (origin && origin.includes(',')) {
            const parts = origin.split(',');
            lat = parseFloat(parts[0]);
            lng = parseFloat(parts[1]);
        }

        if (!query) return fail(400, { error: 'Enter a destination.' });

        try {
            const placeRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location'
                },
                body: JSON.stringify({
                    textQuery: query,
                    locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 15000.0 } }
                })
            });

            const placeData = await placeRes.json();
            if (!placeData.places || placeData.places.length === 0) return fail(404, { error: 'Location not found.' });

            const bestMatch = placeData.places[0];
            const destCoords = `${bestMatch.location.latitude},${bestMatch.location.longitude}`;

            const dirUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${lat},${lng}&destination=${destCoords}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
            const dirRes = await fetch(dirUrl);
            const dirData = await dirRes.json();

            if (dirData.status !== 'OK') return fail(500, { error: 'Route failed.' });

            const steps = dirData.routes[0].legs[0].steps.map((s: any) => {
                // 1. Strip HTML and add spaces between words
                let text = s.html_instructions.replace(/<[^>]*>?/gm, ' ');
                // 2. Remove "Restricted usage road" specifically
                text = text.replace(/Restricted usage road/gi, '');
                // 3. Clean up formatting
                return text.replace(/\s\s+/g, ' ').trim();
            });

            return { 
                steps, 
                eta: dirData.routes[0].legs[0].duration.text,
                destinationName: `${bestMatch.displayName.text} (${bestMatch.formattedAddress.split(',')[0]})` 
            };
        } catch (e) {
            return fail(500, { error: 'Connection error.' });
        }
    }
};
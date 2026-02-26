import { GOOGLE_MAPS_API_KEY } from '$env/static/private';
import { fail } from '@sveltejs/kit';

export const actions = {
    getDirections: async ({ request }) => {
        const formData = await request.formData();
        const query = formData.get('destination')?.toString();
        const origin = formData.get('origin')?.toString();

        // Default fallback coordinates (Los Angeles)
        let lat = 34.0522;
        let lng = -118.2433;

        if (origin && origin.includes(',')) {
            const parts = origin.split(',');
            lat = parseFloat(parts[0]);
            lng = parseFloat(parts[1]);
        }

        if (!query) return fail(400, { error: 'Please enter a destination.' });

        try {
            // 1. Search for destination
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
                            radius: 15000.0
                        }
                    }
                })
            });

            const placeData = await placeRes.json();
            if (!placeData.places || placeData.places.length === 0) {
                return fail(404, { error: 'Location not found.' });
            }

            const bestMatch = placeData.places[0];
            const destCoords = `${bestMatch.location.latitude},${bestMatch.location.longitude}`;

            // 2. Get directions
            const dirUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${lat},${lng}&destination=${destCoords}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
            const dirRes = await fetch(dirUrl);
            const dirData = await dirRes.json();

            if (dirData.status !== 'OK') {
                return fail(500, { error: 'Could not calculate route.' });
            }

            const leg = dirData.routes[0].legs[0];
            const rawSteps = leg.steps;

            // 3. SHIFTED LOGIC: Pair current distance with NEXT instruction
            const steps = rawSteps.map((s: any, i: number) => {
                // The distance you travel on the current road
                const distanceForThisLeg = s.distance.text;

                // The action to take at the end of this distance (the NEXT step's instruction)
                const nextStep = rawSteps[i + 1];
                let actionToTake = "";

                if (i === 0) {
                    // For the very first card, we tell them where to start
                    actionToTake = s.html_instructions;
                } else if (nextStep) {
                    // For all other cards, tell them what turn is coming up next
                    actionToTake = nextStep.html_instructions;
                } else {
                    actionToTake = "Arrive at your destination";
                }

                // Clean HTML tags and Google warnings
                let cleanInstruction = actionToTake.replace(/<[^>]*>?/gm, ' ');
                cleanInstruction = cleanInstruction.replace(/Restricted usage road/gi, '');
                cleanInstruction = cleanInstruction.replace(/\s\s+/g, ' ').trim();

                return {
                    instruction: cleanInstruction,
                    distance: distanceForThisLeg
                };
            });

            return { 
                steps, 
                eta: leg.duration.text,
                destinationName: `${bestMatch.displayName.text} (${bestMatch.formattedAddress.split(',')[0]})` 
            };

        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Connection error.' });
        }
    }
};
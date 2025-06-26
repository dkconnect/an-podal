const map = L.map('map').setView([0, 0], 2); // Center at (0,0), zoom level 2
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let locationMarker = null;
let antipodeMarker = null;

function calculateAntipode(lat, lng) {
    const antipodeLat = -lat; 
    const antipodeLng = lng + 180 > 180 ? lng - 180 : lng + 180; 
    return [antipodeLat, antipodeLng];
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await response.json();
        return data.display_name || "Unknown location";
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return "Unknown location";
    }
}

document.getElementById('search-button').addEventListener('click', async () => {
    const query = document.getElementById('search-input').value.trim();
    if (!query) {
        document.getElementById('result').innerText = 'Please enter a location.';
        return;
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
        const data = await response.json();
        if (data.length === 0) {
            document.getElementById('result').innerText = 'Location not found. Try another search.';
            return;
        }

        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        const [antipodeLat, antipodeLng] = calculateAntipode(latitude, longitude);

        if (locationMarker) map.removeLayer(locationMarker);
        if (antipodeMarker) map.removeLayer(antipodeMarker);

        locationMarker = L.marker([latitude, longitude]).addTo(map)
            .bindPopup(`<b>${display_name}</b>`).openPopup();
        antipodeMarker = L.marker([antipodeLat, antipodeLng]).addTo(map)
            .bindPopup('Antipodal Point');

        const bounds = L.latLngBounds([[latitude, longitude], [antipodeLat, antipodeLng]]);
        map.fitBounds(bounds, { padding: [50, 50] });

        const antipodeName = await reverseGeocode(antipodeLat, antipodeLng);

        document.getElementById('result').innerHTML = `
            <p><b>${display_name}</b> (Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)})</p>
            <p><b>Antipode</b>: ${antipodeName} (Lat: ${antipodeLat.toFixed(4)}, Lon: ${antipodeLng.toFixed(4)})</p>
        `;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('result').innerText = 'An error occurred. Please try again.';
    }
});

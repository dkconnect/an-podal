const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let locationMarker = null;
let antipodeMarker = null;

const apiKey = window.OPENCAGE_API_KEY; 
// ok just if your are looking at this code, the above line has been engineered because I wanted to deploy this project./
//If you wanna run the project locally then change the above line to - const apiKey = "OPENCAGE_API_KEY"; /
//You can get your Opencage API key from https://opencagedata.com /

function calculateAntipode(lat, lng) {
    const antipodeLat = -lat;
    const antipodeLng = lng + 180 > 180 ? lng - 180 : lng + 180;
    return [antipodeLat, antipodeLng];
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}`);
        const data = await response.json();
        return data.results.length > 0 ? data.results[0].formatted : 'Unknown location';
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return 'Unknown location';
    }
}

async function fetchSuggestions(query) {
    if (!query) {
        document.getElementById('suggestions').style.display = 'none';
        return;
    }
    try {
        const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${apiKey}&limit=5`);
        const data = await response.json();
        const suggestionsDiv = document.getElementById('suggestions');
        suggestionsDiv.innerHTML = '';
        if (data.results.length > 0) {
            data.results.forEach(result => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = result.formatted;
                div.addEventListener('click', () => {
                    document.getElementById('search-input').value = result.formatted;
                    suggestionsDiv.style.display = 'none';
                    document.getElementById('search-button').click();
                });
                suggestionsDiv.appendChild(div);
            });
            suggestionsDiv.style.display = 'block';
        } else {
            suggestionsDiv.style.display = 'none';
        }
    } catch (error) {
        console.error('Autocomplete error:', error);
        document.getElementById('suggestions').style.display = 'none';
    }
}

document.getElementById('search-input').addEventListener('input', (e) => {
    fetchSuggestions(e.target.value.trim());
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        document.getElementById('suggestions').style.display = 'none';
    }
});

document.getElementById('search-button').addEventListener('click', async () => {
    const query = document.getElementById('search-input').value.trim();
    document.getElementById('suggestions').style.display = 'none'; // Hide suggestions
    if (!query) {
        document.getElementById('result').innerText = 'Please enter a location.';
        return;
    }

    try {
        const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${apiKey}&limit=1`);
        const data = await response.json();
        if (data.results.length === 0) {
            document.getElementById('result').innerText = 'Location not found. Try another search.';
            return;
        }

        const { lat, lng } = data.results[0].geometry;
        const display_name = data.results[0].formatted;
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

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

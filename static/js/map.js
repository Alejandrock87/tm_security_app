let map;
let markers = [];

function initMap() {
    map = L.map('map').setView([4.6097, -74.0817], 11); // Centered on Bogotá

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    if (typeof incidents !== 'undefined') {
        incidents.forEach(incident => {
            addMarker(incident);
        });
    }

    map.on('click', function(e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);
        
        if (document.getElementById('latitude') && document.getElementById('longitude')) {
            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lng;
        }
    });
}

function addMarker(incident) {
    const marker = L.marker([incident.latitude, incident.longitude]).addTo(map);
    marker.bindPopup(`<b>${incident.title}</b><br>Reported on: ${new Date(incident.timestamp).toLocaleString()}`);
    markers.push(marker);
}

document.addEventListener('DOMContentLoaded', initMap);

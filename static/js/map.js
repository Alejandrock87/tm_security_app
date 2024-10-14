let map;
let userMarker;
let stationMarkers = [];

const transmilenioStations = [
    { name: "Portal Norte", lat: 4.7545, lng: -74.0457 },
    { name: "Calle 100", lat: 4.6866, lng: -74.0491 },
    { name: "Calle 72", lat: 4.6583, lng: -74.0652 },
    { name: "Calle 45", lat: 4.6322, lng: -74.0715 },
    { name: "Calle 26", lat: 4.6159, lng: -74.0706 },
    { name: "Ricaurte", lat: 4.6131, lng: -74.0958 },
    { name: "Portal Suba", lat: 4.7437, lng: -74.0936 },
    { name: "Portal 80", lat: 4.7106, lng: -74.1113 },
    { name: "Portal Américas", lat: 4.6297, lng: -74.2052 },
    { name: "Portal Sur", lat: 4.5781, lng: -74.1428 }
];

function initMap() {
    map = L.map('map').setView([4.6097, -74.0817], 11); // Centered on Bogotá

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    addTransmilenioStations();

    if (typeof incidents !== 'undefined') {
        incidents.forEach(incident => {
            addIncidentMarker(incident);
        });
    }
}

function addTransmilenioStations() {
    const stationIcon = L.icon({
        iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    transmilenioStations.forEach(station => {
        const marker = L.marker([station.lat, station.lng], {icon: stationIcon}).addTo(map);
        marker.bindPopup(`<b>${station.name}</b><br>Transmilenio Station`);
        stationMarkers.push(marker);
    });
}

function addIncidentMarker(incident) {
    const incidentIcon = L.icon({
        iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const marker = L.marker([incident.latitude, incident.longitude], {icon: incidentIcon}).addTo(map);
    marker.bindPopup(`<b>${incident.incident_type}</b><br>Reported on: ${new Date(incident.timestamp).toLocaleString()}`);
}

function updateMapWithUserLocation(latitude, longitude) {
    if (userMarker) {
        map.removeLayer(userMarker);
    }

    const userIcon = L.icon({
        iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    userMarker = L.marker([latitude, longitude], {icon: userIcon}).addTo(map);
    userMarker.bindPopup("Your current location");
    map.setView([latitude, longitude], 13);
}

document.addEventListener('DOMContentLoaded', initMap);

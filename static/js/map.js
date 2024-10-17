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
    { name: "Portal Sur", lat: 4.5781, lng: -74.1428 },
    { name: "Calle 187", lat: 4.7652, lng: -74.0446 },
    { name: "Terminal", lat: 4.6007, lng: -74.0823 },
    { name: "Calle 146", lat: 4.7268, lng: -74.0468 },
    { name: "Calle 127", lat: 4.7031, lng: -74.0513 },
    { name: "Pepe Sierra", lat: 4.6759, lng: -74.0541 }
];

const transmilenioRoutes = [
    { name: "Troncal Caracas", color: "#FF0000", stations: ["Portal Norte", "Calle 100", "Calle 72", "Calle 45", "Calle 26"] },
    { name: "Troncal NQS", color: "#0000FF", stations: ["Portal Sur", "Ricaurte", "Calle 26"] },
    { name: "Troncal Suba", color: "#00FF00", stations: ["Portal Suba", "Calle 127", "Pepe Sierra", "Calle 100"] },
    { name: "Troncal Calle 80", color: "#FFA500", stations: ["Portal 80", "Calle 72", "Terminal"] }
];

function initMap() {
    map = L.map('map').setView([4.6097, -74.0817], 11); // Centered on Bogotá

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    addTransmilenioStations();
    drawTransmilenioRoutes();

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

function drawTransmilenioRoutes() {
    transmilenioRoutes.forEach(route => {
        const routeCoordinates = route.stations.map(stationName => {
            const station = transmilenioStations.find(s => s.name === stationName);
            return [station.lat, station.lng];
        });
        L.polyline(routeCoordinates, {color: route.color, weight: 3}).addTo(map);
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

function findNearestStation(userLat, userLng) {
    let nearestStation = transmilenioStations[0];
    let shortestDistance = calculateDistance(userLat, userLng, nearestStation.lat, nearestStation.lng);

    for (let i = 1; i < transmilenioStations.length; i++) {
        const station = transmilenioStations[i];
        const distance = calculateDistance(userLat, userLng, station.lat, station.lng);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestStation = station;
        }
    }

    return nearestStation.name;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

document.addEventListener('DOMContentLoaded', initMap);

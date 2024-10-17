let map;
let userMarker;
let stationMarkers = [];
let stationsLayer, routesLayer;

function initMap() {
    console.log("initMap function called in map.js");
    if (!document.getElementById('map')) {
        console.error("Map element not found in initMap (map.js). Retrying in 500ms...");
        setTimeout(initMap, 500);
        return;
    }

    map = L.map('map').setView([4.6097, -74.0817], 11); // Centered on Bogotá

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    loadGeoJSONLayers();

    if (typeof incidents !== 'undefined') {
        incidents.forEach(incident => {
            addIncidentMarker(incident);
        });
    }
}

function loadGeoJSONLayers() {
    // Load routes GeoJSON
    fetch('/static/Rutas_Troncales_de_TRANSMILENIO.geojson')
        .then(response => response.json())
        .then(data => {
            routesLayer = L.geoJSON(data, {
                style: function (feature) {
                    return {
                        color: "#87CEFA",
                        weight: 3,
                        opacity: 0.7
                    };
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup(feature.properties.RUTA);
                }
            }).addTo(map);
        })
        .catch(error => console.error("Error loading routes GeoJSON:", error));

    // Load stations GeoJSON
    fetch('/static/Estaciones_Troncales_de_TRANSMILENIO.geojson')
        .then(response => response.json())
        .then(data => {
            stationsLayer = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {
                        icon: L.icon({
                            iconUrl: '/static/images/station_icon.png',
                            iconSize: [24, 24],
                            iconAnchor: [12, 12],
                            popupAnchor: [0, -12]
                        })
                    });
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup(feature.properties.NOMBRE);
                }
            }).addTo(map);
        })
        .catch(error => console.error("Error loading stations GeoJSON:", error));
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
    if (!stationsLayer) return null;

    let nearestStation = null;
    let shortestDistance = Infinity;

    stationsLayer.eachLayer(function(layer) {
        const distance = calculateDistance(userLat, userLng, layer.getLatLng().lat, layer.getLatLng().lng);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestStation = layer.feature.properties.NOMBRE;
        }
    });

    return nearestStation;
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

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired in map.js");
    initMap();
});

console.log("map.js loaded");

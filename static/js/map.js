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

    // Add layer control
    let baseMaps = {
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
    };
    let overlayMaps = {
        "Rutas Transmilenio": routesLayer,
        "Estaciones Transmilenio": stationsLayer
    };
    L.control.layers(baseMaps, overlayMaps).addTo(map);

    // Add legend
    let legend = L.control({position: 'bottomright'});
    legend.onAdd = function (map) {
        let div = L.DomUtil.create('div', 'info legend');
        div.innerHTML += '<h4>Leyenda</h4>';
        div.innerHTML += '<i style="background: #87CEFA"></i> Rutas Transmilenio<br>';
        div.innerHTML += '<i style="background: #FF0000"></i> Estaciones Transmilenio<br>';
        div.innerHTML += '<i style="background: #FF4500"></i> Incidentes<br>';
        return div;
    };
    legend.addTo(map);
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
                        weight: 5,
                        opacity: 0.7
                    };
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup(`<b>Ruta:</b> ${feature.properties.RUTA}`);
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
                    console.log("Station feature properties:", feature.properties);
                    const stationName = feature.properties.NOMBRE || feature.properties.nombre || feature.properties.name || 'Estación sin nombre';
                    return L.marker(latlng, {
                        icon: L.divIcon({
                            html: `<div style="text-align: center;">
                                     <img src="/static/images/station_icon.png" width="24" height="24" style="filter: hue-rotate(60deg);">
                                     <div style="background-color: rgba(255,255,255,0.7); padding: 2px; border-radius: 3px; margin-top: 2px;">
                                       <span style="font-size: 12px; font-weight: bold; color: #333;">
                                         ${stationName}
                                       </span>
                                     </div>
                                   </div>`,
                            className: 'station-label',
                            iconSize: [120, 60],
                            iconAnchor: [60, 30]
                        })
                    });
                },
                onEachFeature: function (feature, layer) {
                    const stationName = feature.properties.NOMBRE || feature.properties.nombre || feature.properties.name || 'Estación sin nombre';
                    layer.bindPopup(`
                        <b>Estación:</b> ${stationName}<br>
                        <b>Troncal:</b> ${feature.properties.troncal_estacion || 'N/A'}<br>
                        <b>Vagones:</b> ${feature.properties.numero_vagones_estacion || 'N/A'}<br>
                        <b>Accesos:</b> ${feature.properties.numero_accesos_estacion || 'N/A'}
                    `);
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
            nearestStation = layer.feature.properties.NOMBRE || layer.feature.properties.nombre || layer.feature.properties.name || 'Estación sin nombre';
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

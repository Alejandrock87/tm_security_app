let map;
let userMarker;
let stationMarkers = [];
let stationsLayer, routesLayer;
let troncales = new Set();

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

    // Add legend for insecurity levels
    let legend = L.control({position: 'bottomright'});
    legend.onAdd = function (map) {
        let div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = '<h4 style="color: #000;">Niveles de Inseguridad</h4>';
        div.innerHTML += '<i style="background: #ff0000"></i> <span style="color: #000;">Alto</span><br>';
        div.innerHTML += '<i style="background: #ffa500"></i> <span style="color: #000;">Medio</span><br>';
        div.innerHTML += '<i style="background: #008000"></i> <span style="color: #000;">Bajo</span><br>';
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
            });
            
            // Load stations after routes are loaded
            loadStationsLayer();
        })
        .catch(error => console.error("Error loading routes GeoJSON:", error));
}

function loadStationsLayer() {
    fetch('/static/Estaciones_Troncales_de_TRANSMILENIO.geojson')
        .then(response => response.json())
        .then(data => {
            // Collect unique troncales
            data.features.forEach(feature => {
                if (feature.properties.troncal_estacion) {
                    troncales.add(feature.properties.troncal_estacion);
                }
            });
            
            // Create troncal filter buttons
            const troncalFilter = document.getElementById('troncalFilter').querySelector('.btn-group');
            troncales.forEach(troncal => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-outline-primary';
                btn.textContent = troncal;
                btn.setAttribute('data-troncal', troncal);
                btn.onclick = () => filterByTroncal(troncal);
                troncalFilter.appendChild(btn);
            });

            stationsLayer = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    const stationName = feature.properties.nombre_estacion || 'Sin nombre';
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
                    layer.bindPopup(`
                        <b>Estación:</b> ${feature.properties.nombre_estacion || 'Sin nombre'}<br>
                        <b>Troncal:</b> ${feature.properties.troncal_estacion || 'N/A'}<br>
                        <b>Vagones:</b> ${feature.properties.numero_vagones_estacion || 'N/A'}<br>
                        <b>Accesos:</b> ${feature.properties.numero_accesos_estacion || 'N/A'}
                    `);
                    layer.troncal = feature.properties.troncal_estacion;
                }
            }).addTo(map);
        })
        .catch(error => console.error("Error loading stations GeoJSON:", error));
}

function filterByTroncal(selectedTroncal) {
    const buttons = document.querySelectorAll('#troncalFilter .btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('data-troncal') === selectedTroncal || 
            (selectedTroncal === 'all' && btn.getAttribute('data-troncal') === 'all')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (selectedTroncal === 'all') {
        stationsLayer.eachLayer(layer => {
            layer.addTo(map);
        });
        if (!map.hasLayer(routesLayer)) {
            routesLayer.addTo(map);
        }
    } else {
        stationsLayer.eachLayer(layer => {
            if (layer.troncal === selectedTroncal) {
                layer.addTo(map);
            } else {
                map.removeLayer(layer);
            }
        });
        // TODO: Filter routes by troncal when that data is available
    }
}

function addIncidentMarker(incident) {
    let color;
    switch(incident.severity || 'medium') {
        case 'high':
            color = '#ff0000';
            break;
        case 'medium':
            color = '#ffa500';
            break;
        case 'low':
            color = '#008000';
            break;
        default:
            color = '#ffa500';
    }

    const incidentIcon = L.divIcon({
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
        className: 'incident-marker',
        iconSize: [12, 12]
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
            nearestStation = layer.feature.properties.nombre_estacion || 'Sin nombre';
        }
    });

    return nearestStation;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
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

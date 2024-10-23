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

    // Initialize map centered on Bogotá
    map = L.map('map').setView([4.6097, -74.0817], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Request user location
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                updateMapWithUserLocation(position.coords.latitude, position.coords.longitude);
            },
            function(error) {
                console.error("Error getting user location:", error.message);
                // Continue loading the map without centering on user location
                loadGeoJSONLayers();
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        console.log("Geolocation is not supported by this browser");
        loadGeoJSONLayers();
    }

    // Add legend for insecurity levels with improved styling
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

    // Initialize Select2 change event handler
    $('#troncalSelect').on('change', function(e) {
        const selectedTroncales = $(this).val();
        filterByTroncal(selectedTroncales);
    });
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
            
            loadStationsLayer();
        })
        .catch(error => console.error("Error loading routes GeoJSON:", error));
}

function loadStationsLayer() {
    fetch('/static/Estaciones_Troncales_de_TRANSMILENIO.geojson')
        .then(response => response.json())
        .then(data => {
            // Collect unique troncales and populate select
            const select = document.getElementById('troncalSelect');
            data.features.forEach(feature => {
                if (feature.properties.troncal_estacion && !troncales.has(feature.properties.troncal_estacion)) {
                    troncales.add(feature.properties.troncal_estacion);
                    const option = new Option(feature.properties.troncal_estacion, feature.properties.troncal_estacion);
                    select.add(option);
                }
            });

            stationsLayer = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    const stationName = feature.properties.nombre_estacion || 'Sin nombre';
                    return L.marker(latlng, {
                        icon: L.divIcon({
                            html: `<div style="text-align: center;">
                                     <img src="/static/images/station_icon.png" width="24" height="24" style="filter: hue-rotate(60deg);">
                                     <div style="background-color: rgba(255,255,255,0.9); padding: 2px; border-radius: 3px; margin-top: 2px;">
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

function filterByTroncal(selectedTroncales) {
    if (!Array.isArray(selectedTroncales)) {
        selectedTroncales = [];
    }

    const showAll = selectedTroncales.includes('all') || selectedTroncales.length === 0;

    stationsLayer.eachLayer(layer => {
        if (showAll || selectedTroncales.includes(layer.troncal)) {
            if (!map.hasLayer(layer)) {
                layer.addTo(map);
            }
        } else {
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        }
    });

    // Handle routes layer visibility
    if (showAll) {
        if (!map.hasLayer(routesLayer)) {
            routesLayer.addTo(map);
        }
    } else {
        if (map.hasLayer(routesLayer)) {
            map.removeLayer(routesLayer);
        }
    }
}

// Rest of the code remains the same...
[Previous code for addIncidentMarker, updateMapWithUserLocation, findNearestStation, and calculateDistance functions]

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired in map.js");
    initMap();
});

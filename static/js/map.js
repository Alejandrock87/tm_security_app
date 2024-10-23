let map;
let userMarker;
let stationMarkers = [];
let stationsLayer, routesLayer;
let troncales = new Set();

function initMap() {
    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error("Map element not found in initMap (map.js)");
            return;
        }

        map = L.map('map').setView([4.6097, -74.0817], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    updateMapWithUserLocation(position.coords.latitude, position.coords.longitude);
                },
                function(error) {
                    console.error("Error getting user location:", error.message);
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

        let legend = L.control({position: 'bottomright'});
        legend.onAdd = function (map) {
            let div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = '<h4 style="color: #000; margin-bottom: 10px;">Niveles de Inseguridad</h4>';
            div.innerHTML += '<i style="background: #ff0000"></i> <span style="color: #000;">Alto</span><br>';
            div.innerHTML += '<i style="background: #ffa500"></i> <span style="color: #000;">Medio</span><br>';
            div.innerHTML += '<i style="background: #008000"></i> <span style="color: #000;">Bajo</span><br>';
            return div;
        };
        legend.addTo(map);

        const troncalFilter = document.getElementById('troncalFilter');
        if (troncalFilter) {
            troncalFilter.addEventListener('change', function(e) {
                const selectedTroncal = this.value;
                filterByTroncal(selectedTroncal === 'all' ? ['all'] : [selectedTroncal]);
            });
        }
    } catch (error) {
        console.error('Error in initMap:', error);
    }
}

function loadGeoJSONLayers() {
    try {
        fetch('/static/Rutas_Troncales_de_TRANSMILENIO.geojson')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
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
                
                loadStationsLayer();
            })
            .catch(error => console.error("Error loading routes GeoJSON:", error));
    } catch (error) {
        console.error('Error in loadGeoJSONLayers:', error);
    }
}

function loadStationsLayer() {
    try {
        fetch('/static/Estaciones_Troncales_de_TRANSMILENIO.geojson')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const select = document.getElementById('troncalFilter');
                if (select) {
                    data.features.forEach(feature => {
                        if (feature.properties.troncal_estacion && !troncales.has(feature.properties.troncal_estacion)) {
                            troncales.add(feature.properties.troncal_estacion);
                            const option = new Option(feature.properties.troncal_estacion, feature.properties.troncal_estacion);
                            select.add(option);
                        }
                    });
                }

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
    } catch (error) {
        console.error('Error in loadStationsLayer:', error);
    }
}

function filterByTroncal(selectedTroncales) {
    try {
        const showAll = selectedTroncales.includes('all');

        if (stationsLayer) {
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
        }

        if (routesLayer && !map.hasLayer(routesLayer)) {
            routesLayer.addTo(map);
        }
    } catch (error) {
        console.error('Error in filterByTroncal:', error);
    }
}

function updateMapWithUserLocation(latitude, longitude) {
    try {
        if (userMarker) {
            map.removeLayer(userMarker);
        }

        const userIcon = L.divIcon({
            html: `<div style="
                background-color: #4CAF50;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 4px solid white;
                box-shadow: 0 0 5px rgba(0,0,0,0.5);
                position: relative;
            ">
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 8px;
                    height: 8px;
                    background-color: white;
                    border-radius: 50%;
                "></div>
            </div>`,
            className: 'user-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        userMarker = L.marker([latitude, longitude], {icon: userIcon}).addTo(map);
        userMarker.bindPopup("Tu ubicación actual");
        
        map.setView([latitude, longitude], 15);
        loadGeoJSONLayers();
    } catch (error) {
        console.error('Error in updateMapWithUserLocation:', error);
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    try {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    } catch (error) {
        console.error('Error in calculateDistance:', error);
        return 0;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (document.getElementById('map')) {
            initMap();
        }
    } catch (error) {
        console.error('Error initializing map:', error);
    }
});

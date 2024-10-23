let map;
let userMarker;
let stationMarkers = [];
let stationsLayer, routesLayer;
let troncales = new Set();
let mapInitialized = false;
let stationSecurityLevels = {};

function initMap() {
    try {
        if (mapInitialized) {
            console.warn('Map already initialized');
            return true;
        }

        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.warn('Map element not found in initMap');
            return false;
        }

        map = L.map('map', {
            zoomControl: true,
            attributionControl: true
        }).setView([4.6097, -74.0817], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Initialize location tracking
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    updateMapWithUserLocation(position.coords.latitude, position.coords.longitude);
                },
                error => {
                    console.warn("Geolocation error:", error.message);
                    loadGeoJSONLayers();
                }
            );
        } else {
            console.warn("Geolocation not supported");
            loadGeoJSONLayers();
        }

        // Add legend control
        const legend = L.control({position: 'bottomright'});
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = '<h4 style="color: #000; margin-bottom: 10px;">Niveles de Inseguridad</h4>';
            div.innerHTML += '<i style="background: #ff0000"></i> <span style="color: #000;">Alto (>5 incidentes/mes)</span><br>';
            div.innerHTML += '<i style="background: #ffa500"></i> <span style="color: #000;">Medio (2-5 incidentes/mes)</span><br>';
            div.innerHTML += '<i style="background: #008000"></i> <span style="color: #000;">Bajo (<2 incidentes/mes)</span><br>';
            return div;
        };
        legend.addTo(map);

        // Add troncal filter
        const troncalFilter = document.getElementById('troncalFilter');
        if (troncalFilter) {
            troncalFilter.addEventListener('change', function(e) {
                const selectedTroncal = this.value;
                filterByTroncal(selectedTroncal === 'all' ? ['all'] : [selectedTroncal]);
            });
        }

        // Load station security levels
        fetch('/station_statistics')
            .then(response => response.json())
            .then(data => {
                stationSecurityLevels = data;
                loadGeoJSONLayers();
            })
            .catch(error => {
                console.warn('Error loading station statistics:', error);
                loadGeoJSONLayers();
            });

        mapInitialized = true;
        return true;
    } catch (error) {
        console.warn('Error in initMap:', error);
        return false;
    }
}

function getStationColor(stationName) {
    const count = stationSecurityLevels[stationName] || 0;
    if (count > 5) return '#ff0000';  // High risk
    if (count >= 2) return '#ffa500';  // Medium risk
    return '#008000';  // Low risk
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
                if (select && data.features) {
                    data.features.forEach(feature => {
                        if (feature.properties && 
                            feature.properties.troncal_estacion && 
                            !troncales.has(feature.properties.troncal_estacion)) {
                            troncales.add(feature.properties.troncal_estacion);
                            const option = new Option(feature.properties.troncal_estacion, feature.properties.troncal_estacion);
                            select.add(option);
                        }
                    });
                }

                stationsLayer = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {
                        const stationName = feature.properties?.nombre_estacion || 'Sin nombre';
                        const stationColor = getStationColor(stationName);
                        
                        return L.marker(latlng, {
                            icon: L.divIcon({
                                html: `<div style="text-align: center;">
                                         <div style="background-color: ${stationColor}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; margin: 0 auto;">
                                           <span style="color: white; font-weight: bold; line-height: 24px;">T</span>
                                         </div>
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
                        const props = feature.properties || {};
                        const stationName = props.nombre_estacion || 'Sin nombre';
                        const incidentCount = stationSecurityLevels[stationName] || 0;
                        
                        layer.bindPopup(`
                            <b>Estación:</b> ${stationName}<br>
                            <b>Troncal:</b> ${props.troncal_estacion || 'N/A'}<br>
                            <b>Incidentes (último mes):</b> ${incidentCount}<br>
                            <b>Vagones:</b> ${props.numero_vagones_estacion || 'N/A'}<br>
                            <b>Accesos:</b> ${props.numero_accesos_estacion || 'N/A'}
                        `);
                        layer.troncal = props.troncal_estacion;
                    }
                }).addTo(map);
            })
            .catch(error => console.warn("Error loading stations GeoJSON:", error));
    } catch (error) {
        console.warn('Error in loadStationsLayer:', error);
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
                        if (feature.properties && feature.properties.RUTA) {
                            layer.bindPopup(`<b>Ruta:</b> ${feature.properties.RUTA}`);
                        }
                    }
                }).addTo(map);
                
                loadStationsLayer();
            })
            .catch(error => console.warn("Error loading routes GeoJSON:", error));
    } catch (error) {
        console.warn('Error in loadGeoJSONLayers:', error);
    }
}

// Rest of the existing functions remain the same...

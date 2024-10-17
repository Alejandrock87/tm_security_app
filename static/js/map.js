let map;
let userMarker;
let stationMarkers = [];
let routeLayers = {};
let incidentLayer;
let searchControl;

function initMap() {
    console.log('initMap function called in map.js');
    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found in initMap (map.js).');
            return;
        }

        console.log('Creating map object');
        map = L.map('map', {
            fullscreenControl: true,
            zoomControl: false
        }).setView([4.6097, -74.0817], 11); // Centered on Bogotá

        console.log('Adding OpenStreetMap tile layer');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        console.log('Adding zoom control');
        L.control.zoom({
            position: 'bottomright'
        }).addTo(map);

        console.log('Adding scale control');
        L.control.scale({
            imperial: false,
            position: 'bottomleft'
        }).addTo(map);

        console.log('Adding Transmilenio layers');
        addTransmilenioLayers();
        console.log('Adding incident layer');
        addIncidentLayer();
        console.log('Adding layer control');
        addLayerControl();
        console.log('Adding legend');
        addLegend();
        console.log('Adding search control');
        addSearchControl();

        if (typeof incidents !== 'undefined' && incidents) {
            console.log('Adding incident markers');
            incidents.forEach(incident => {
                addIncidentMarker(incident);
            });
        } else {
            console.log('No incidents data available');
        }
        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Error in initMap:', error);
    }
}

function addTransmilenioLayers() {
    console.log('addTransmilenioLayers called');
    
    // Load Transmilenio stations
    fetch('/static/Estaciones_Troncales_de_TRANSMILENIO.geojson')
        .then(response => response.json())
        .then(data => {
            console.log('Transmilenio stations data loaded');
            L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 6,
                        fillColor: "#ff7800",
                        color: "#000",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                }
            }).addTo(map);
        })
        .catch(error => console.error('Error loading Transmilenio stations:', error));

    // Load Transmilenio routes
    fetch('/static/Rutas_Troncales_de_TRANSMILENIO.geojson')
        .then(response => response.json())
        .then(data => {
            console.log('Transmilenio routes data loaded');
            L.geoJSON(data, {
                style: function (feature) {
                    return {color: "#ff7800"};
                }
            }).addTo(map);
        })
        .catch(error => console.error('Error loading Transmilenio routes:', error));
}

function addIncidentLayer() {
    console.log('addIncidentLayer called');
    incidentLayer = L.layerGroup().addTo(map);
}

function addLayerControl() {
    console.log('addLayerControl called');
    // Implementation details...
}

function addLegend() {
    console.log('addLegend called');
    // Implementation details...
}

function addSearchControl() {
    console.log('addSearchControl called');
    // Implementation details...
}

function addIncidentMarker(incident) {
    console.log('addIncidentMarker called');
    // Implementation details...
}

console.log('map.js loaded');

// Export initMap function to make it globally accessible
window.initMap = initMap;

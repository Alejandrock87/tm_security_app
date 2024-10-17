let map;
let userMarker;
let stationMarkers = [];
let routeLayers = {};
let incidentLayer;
let searchControl;

function initMap() {
    map = L.map('map', {
        fullscreenControl: true,
        zoomControl: false
    }).setView([4.6097, -74.0817], 11); // Centered on Bogotá

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    L.control.scale({
        imperial: false,
        position: 'bottomleft'
    }).addTo(map);

    addTransmilenioLayers();
    addIncidentLayer();
    addLayerControl();
    addLegend();
    addSearchControl();

    if (typeof incidents !== 'undefined' && incidents) {
        incidents.forEach(incident => {
            addIncidentMarker(incident);
        });
    }
}

function addTransmilenioLayers() {
    // Load Transmilenio stations
    fetch('/static/geojson/Estaciones_Troncales_de_TRANSMILENIO.geojson')
        .then(response => response.json())
        .then(data => {
            const stationLayer = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {
                        icon: L.divIcon({
                            className: 'custom-div-icon',
                            html: "<div style='background-color:#4a4a4a;' class='marker-pin'></div><i class='fas fa-bus' style='color: #ffffff;'></i>",
                            iconSize: [30, 42],
                            iconAnchor: [15, 42]
                        })
                    });
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup(`
                        <b>${feature.properties.NOMBRE}</b><br>
                        Estación de Transmilenio<br>
                        <small>Troncal: ${feature.properties.TRONCAL}</small>
                    `);
                }
            }).addTo(map);
            stationMarkers.push(stationLayer);
        });

    // Load Transmilenio routes
    fetch('/static/geojson/Rutas_Troncales_de_TRANSMILENIO.geojson')
        .then(response => response.json())
        .then(data => {
            const routeLayer = L.geoJSON(data, {
                style: function (feature) {
                    return {
                        color: getRouteColor(feature.properties.NOMBRE),
                        weight: 4,
                        opacity: 0.7
                    };
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup(`
                        <b>Ruta: ${feature.properties.NOMBRE}</b><br>
                        <small>Longitud: ${(feature.properties.LONGITUD / 1000).toFixed(2)} km</small>
                    `);
                    routeLayers[feature.properties.NOMBRE] = layer;
                }
            }).addTo(map);

            // Add route icons
            data.features.forEach(feature => {
                const coordinates = feature.geometry.coordinates;
                const midpoint = coordinates[Math.floor(coordinates.length / 2)];
                L.marker([midpoint[1], midpoint[0]], {
                    icon: L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style='background-color:${getRouteColor(feature.properties.NOMBRE)};' class='marker-pin'></div><i class='fas fa-route' style='color: #ffffff;'></i>`,
                        iconSize: [30, 42],
                        iconAnchor: [15, 42]
                    })
                }).addTo(map).bindPopup(`<b>Ruta: ${feature.properties.NOMBRE}</b>`);
            });
        });
}

function getRouteColor(routeName) {
    const colors = {
        'A': '#FF6B6B',
        'B': '#4ECDC4',
        'C': '#45B7D1',
        'D': '#FFA07A',
        'E': '#98D8C8',
        'F': '#F06292',
        'G': '#AED581',
        'H': '#FFD54F',
        'J': '#BA68C8',
        'K': '#4DB6AC'
    };
    return colors[routeName.charAt(0)] || getRandomColor();
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function addIncidentLayer() {
    incidentLayer = L.layerGroup().addTo(map);
}

function addIncidentMarker(incident) {
    const incidentIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style='background-color:#ff0000;' class='marker-pin'></div><i class='fas fa-exclamation-triangle' style='color: #ffffff;'></i>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });

    const marker = L.marker([incident.latitude, incident.longitude], {icon: incidentIcon}).addTo(incidentLayer);
    marker.bindPopup(`
        <b>${incident.incident_type}</b><br>
        Reportado el: ${new Date(incident.timestamp).toLocaleString()}<br>
        <small>${incident.description}</small>
    `);
}

function addLayerControl() {
    const baseMaps = {
        "Mapa Oscuro": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }),
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
    };

    const overlayMaps = {
        "Estaciones Transmilenio": L.layerGroup(stationMarkers),
        "Incidentes Reportados": incidentLayer,
        ...routeLayers
    };

    L.control.layers(baseMaps, overlayMaps, {collapsed: false}).addTo(map);
}

function addLegend() {
    const legend = L.control({position: 'bottomright'});

    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML += '<h4>Leyenda</h4>';
        div.innerHTML += '<i class="fas fa-bus" style="color: #4a4a4a;"></i> Estación de Transmilenio<br>';
        div.innerHTML += '<i class="fas fa-route" style="color: #4ECDC4;"></i> Ruta de Transmilenio<br>';
        div.innerHTML += '<i class="fas fa-exclamation-triangle" style="color: #ff0000;"></i> Incidente Reportado<br>';
        return div;
    };

    legend.addTo(map);
}

function addSearchControl() {
    searchControl = new L.Control.Search({
        layer: L.layerGroup(stationMarkers),
        propertyName: 'NOMBRE',
        marker: false,
        moveToLocation: function(latlng, title, map) {
            map.setView(latlng, 15);
        }
    });

    searchControl.on('search:locationfound', function(e) {
        e.layer.openPopup();
    });

    map.addControl(searchControl);
}

function updateMapWithUserLocation(latitude, longitude) {
    if (userMarker) {
        map.removeLayer(userMarker);
    }

    const userIcon = L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color:#4CAF50;' class='marker-pin'></div><i class='fas fa-user' style='color: #ffffff;'></i>",
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });

    userMarker = L.marker([latitude, longitude], {icon: userIcon}).addTo(map);
    userMarker.bindPopup("Su ubicación actual");
    map.setView([latitude, longitude], 13);
}

document.addEventListener('DOMContentLoaded', initMap);

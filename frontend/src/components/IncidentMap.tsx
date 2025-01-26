
import { useEffect, useRef, useState } from 'react';
import { Box, Paper } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/Map.css';

interface Station {
  nombre: string;
  troncal: string;
  latitude: number;
  longitude: number;
}

interface Incident {
  latitude: number;
  longitude: number;
  incident_type: string;
  timestamp: string;
  nearest_station: string;
}

export default function IncidentMap() {
  const mapRef = useRef<L.Map | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([4.6097, -74.0817], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    const fetchData = async () => {
      try {
        const [stationsResponse, incidentsResponse] = await Promise.all([
          fetch('/api/stations'),
          fetch('/incidents')
        ]);

        const stationsData = await stationsResponse.json();
        const incidentsData = await incidentsResponse.json();

        setStations(stationsData);
        setIncidents(incidentsData);

        displayMarkers(stationsData, incidentsData);
      } catch (error) {
        console.error('Error loading map data:', error);
      }
    };

    fetchData();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const displayMarkers = (stations: Station[], incidents: Incident[]) => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Group incidents by station
    const incidentsByStation = incidents.reduce((acc, incident) => {
      const station = incident.nearest_station;
      acc[station] = acc[station] || { total: 0, types: {} };
      acc[station].total += 1;
      acc[station].types[incident.incident_type] = (acc[station].types[incident.incident_type] || 0) + 1;
      return acc;
    }, {} as Record<string, { total: number; types: Record<string, number> }>);

    // Create markers for each station
    stations.forEach(station => {
      const stationData = incidentsByStation[station.nombre] || { total: 0, types: {} };
      const markerColor = getMarkerColor(stationData.total);

      const marker = L.marker([station.latitude, station.longitude], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: ${markerColor}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center;">
                  <span style="color: white; font-weight: bold;">T</span>
                </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      });

      marker.bindPopup(createPopupContent(station.nombre, stationData));
      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
    });
  };

  const getMarkerColor = (totalIncidents: number) => {
    if (totalIncidents >= 50) return '#ff0000'; // Alto - Rojo
    if (totalIncidents >= 20) return '#ffa500'; // Medio - Naranja
    return '#008000'; // Bajo - Verde
  };

  const createPopupContent = (stationName: string, stationData: { total: number; types: Record<string, number> }) => {
    const securityLevel = stationData.total >= 50 ? 'Alto' : stationData.total >= 20 ? 'Medio' : 'Bajo';
    
    const incidentsList = Object.entries(stationData.types)
      .map(([type, count]) => `<li>${type}: ${count}</li>`)
      .join('');

    return `
      <div class="station-popup">
        <h3>${stationName}</h3>
        <p>Nivel de seguridad: <strong>${securityLevel}</strong></p>
        <p>Total incidentes: ${stationData.total}</p>
        <h4>Tipos de incidentes:</h4>
        <ul>${incidentsList}</ul>
      </div>
    `;
  };

  return (
    <Box sx={{ height: '100%', p: 2 }}>
      <Paper elevation={3} sx={{ height: 'calc(100vh - 100px)' }}>
        <div id="map" style={{ height: '100%', width: '100%' }}></div>
      </Paper>
    </Box>
  );
}

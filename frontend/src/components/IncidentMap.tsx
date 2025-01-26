
import { useEffect, useRef, useState } from 'react';
import { Box, Paper, CircularProgress } from '@mui/material';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const getMarkerColor = (totalIncidents: number) => {
    if (totalIncidents >= 50) return '#ff0000';
    if (totalIncidents >= 20) return '#ffa500';
    return '#008000';
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

  useEffect(() => {
    const initializeMap = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize map if not already initialized
        if (!mapRef.current) {
          mapRef.current = L.map('map').setView([4.6097, -74.0817], 11);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(mapRef.current);
        }

        // Fetch stations and incidents
        const [stationsResponse, incidentsResponse] = await Promise.all([
          fetch('/api/stations'),
          fetch('/incidents')
        ]);

        if (!stationsResponse.ok || !incidentsResponse.ok) {
          throw new Error('Error fetching map data');
        }

        const stations: Station[] = await stationsResponse.json();
        const incidents: Incident[] = await incidentsResponse.json();

        // Group incidents by station
        const incidentsByStation = incidents.reduce((acc, incident) => {
          const station = incident.nearest_station;
          if (!acc[station]) {
            acc[station] = { total: 0, types: {} };
          }
          acc[station].total += 1;
          acc[station].types[incident.incident_type] = (acc[station].types[incident.incident_type] || 0) + 1;
          return acc;
        }, {} as Record<string, { total: number; types: Record<string, number> }>);

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Add new markers
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

        setLoading(false);
      } catch (err) {
        console.error('Error loading map data:', err);
        setError('Error al cargar el mapa');
        setLoading(false);
      }
    };

    initializeMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <Box sx={{ height: '100%', p: 2 }}>
      <Paper elevation={3} sx={{ height: 'calc(100vh - 100px)', position: 'relative' }}>
        {loading && (
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'error.main', zIndex: 1000 }}>
            {error}
          </Box>
        )}
        <div id="map" style={{ height: '100%', width: '100%' }}></div>
      </Paper>
    </Box>
  );
}

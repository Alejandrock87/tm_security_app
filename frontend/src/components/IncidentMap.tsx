
import { useEffect, useRef, useState } from 'react';
import { Box, Paper } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/Map.css';

export default function IncidentMap() {
  const mapRef = useRef<L.Map | null>(null);
  const [_incidents, setIncidents] = useState([]);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([4.6097, -74.0817], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
    }

    const fetchIncidents = async () => {
      try {
        const response = await fetch('/incidents');
        const data = await response.json();
        setIncidents(data);
        
        data.forEach((incident: any) => {
          L.marker([incident.latitude, incident.longitude])
            .bindPopup(`
              <b>${incident.incident_type}</b><br>
              Estación: ${incident.nearest_station}<br>
              Fecha: ${new Date(incident.timestamp).toLocaleString()}
            `)
            .addTo(mapRef.current!);
        });
      } catch (error) {
        console.error('Error loading incidents:', error);
      }
    };

    fetchIncidents();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <Box sx={{ height: '100%', p: 2 }}>
      <Paper elevation={3} sx={{ height: 'calc(100vh - 100px)' }}>
        <div id="map" style={{ height: '100%', width: '100%' }}></div>
      </Paper>
    </Box>
  );
}

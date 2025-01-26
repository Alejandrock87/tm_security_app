import { useEffect, useRef, useState } from 'react';
import { Box, Paper, CircularProgress, Grid, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Typography, Container, Button } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/Map.css';
import { Chart as ChartJS } from 'chart.js/auto';

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

interface Filters {
  troncal?: string;
  station?: string;
  incidentType?: string;
  securityLevel?: string;
}

const incidentTypes = [
  'Hurto',
  'Hurto a mano armada',
  'Cosquilleo',
  'Ataque',
  'Apertura de Puertas',
  'Sospechoso',
  'Acoso'
];

export default function IncidentMap() {
  const mapRef = useRef<L.Map | null>(null);
  const chartRef = useRef<ChartJS | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [troncales, setTroncales] = useState<string[]>([]);
  const [enableFilters, setEnableFilters] = useState({
    troncal: false,
    station: false,
    incidentType: false,
    securityLevel: false
  });

  const getMarkerColor = (totalIncidents: number) => {
    if (totalIncidents >= 50) return '#ff0000';
    if (totalIncidents >= 20) return '#ffa500';
    return '#008000';
  };

  const filterData = () => {
    let filteredStations = [...stations];
    let filteredIncidents = [...incidents];

    if (enableFilters.troncal && filters.troncal) {
      filteredStations = filteredStations.filter(station => station.troncal === filters.troncal);
    }

    if (enableFilters.incidentType && filters.incidentType) {
      filteredIncidents = filteredIncidents.filter(incident =>
        incident.incident_type === filters.incidentType
      );
    }

    updateMarkers(filteredStations, filteredIncidents);
  };

  const updateMarkers = (filteredStations: Station[], filteredIncidents: Incident[]) => {
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    filteredStations.forEach(station => {
      const marker = L.marker([station.latitude, station.longitude], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: ${getMarkerColor(10)}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center;">
                  <span style="color: white; font-weight: bold;">T</span>
                </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      });

      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    const initializeMap = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!mapRef.current) {
          mapRef.current = L.map('map').setView([4.6097, -74.0817], 11);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(mapRef.current);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading map:', err);
        setError('Error al cargar el mapa');
        setLoading(false);
      }
    };

    initializeMap();
  }, []);

  return (
    <Container maxWidth="xl" className="map-container">
      <Typography variant="h4" gutterBottom>
        Mapa de Incidentes
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper className="filters-panel">
            <Typography variant="h6" gutterBottom>Filtros</Typography>
            <FormControlLabel
              control={<Checkbox checked={enableFilters.troncal} onChange={(e) => setEnableFilters({ ...enableFilters, troncal: e.target.checked })} />}
              label="Filtrar por Troncal"
            />
            <FormControl fullWidth disabled={!enableFilters.troncal}>
              <InputLabel>Troncal</InputLabel>
              <Select value={filters.troncal || ''} onChange={(e) => setFilters({ ...filters, troncal: e.target.value })}>
                {troncales.map((troncal) => (
                  <MenuItem key={troncal} value={troncal}>{troncal}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        </Grid>
        <Grid item xs={12} md={9}>
          <Paper className="map-panel">
            {loading && <CircularProgress />}
            {error && <Typography color="error">{error}</Typography>}
            <div id="map"></div>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

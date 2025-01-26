import { useEffect, useRef, useState } from 'react';
import { Box, Paper, CircularProgress, Grid, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Typography, Container } from '@mui/material';
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

  const incidentTypes = [
    'Hurto',
    'Hurto a mano armada',
    'Cosquilleo',
    'Ataque',
    'Apertura de Puertas',
    'Sospechoso',
    'Acoso'
  ];

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

  const updateChart = (filteredIncidents: Incident[]) => {
    const ctx = document.getElementById('incidentChart') as HTMLCanvasElement;
    if (!ctx) return;

    const typeStats: Record<string, number> = {};
    filteredIncidents.forEach(incident => {
      typeStats[incident.incident_type] = (typeStats[incident.incident_type] || 0) + 1;
    });

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(typeStats),
        datasets: [{
          label: 'Número de Incidentes',
          data: Object.values(typeStats),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  };

  const filterData = () => {
    let filteredStations = [...stations];
    let filteredIncidents = [...incidents];

    if (enableFilters.troncal && filters.troncal) {
      filteredStations = filteredStations.filter(station => station.troncal === filters.troncal);
    }

    if (enableFilters.station && filters.station) {
      filteredStations = filteredStations.filter(station => station.nombre === filters.station);
    }

    if (enableFilters.incidentType && filters.incidentType) {
      filteredIncidents = filteredIncidents.filter(incident => 
        incident.incident_type === filters.incidentType
      );
    }

    updateMarkers(filteredStations, filteredIncidents);
    updateChart(filteredIncidents);
  };

  const updateMarkers = (filteredStations: Station[], filteredIncidents: Incident[]) => {
    const incidentsByStation = filteredIncidents.reduce((acc, incident) => {
      const station = incident.nearest_station;
      if (!acc[station]) {
        acc[station] = { total: 0, types: {} };
      }
      acc[station].total += 1;
      acc[station].types[incident.incident_type] = (acc[station].types[incident.incident_type] || 0) + 1;
      return acc;
    }, {} as Record<string, { total: number; types: Record<string, number> }>);

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    filteredStations.forEach(station => {
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

        const [stationsResponse, incidentsResponse] = await Promise.all([
          fetch('/api/stations'),
          fetch('/incidents')
        ]);

        if (!stationsResponse.ok || !incidentsResponse.ok) {
          throw new Error('Error fetching map data');
        }

        const stationsData: Station[] = await stationsResponse.json();
        const incidentsData: Incident[] = await incidentsResponse.json();

        setStations(stationsData);
        setIncidents(incidentsData);

        const uniqueTroncales = [...new Set(stationsData.map(station => station.troncal))];
        setTroncales(uniqueTroncales);

        updateMarkers(stationsData, incidentsData);
        updateChart(incidentsData);

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
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    filterData();
  }, [filters, enableFilters]);

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 3, minHeight: '100vh' }}>
      {/* Filtros */}
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Filtros de Búsqueda</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={enableFilters.troncal}
                  onChange={(e) => setEnableFilters({ ...enableFilters, troncal: e.target.checked })}
                />
              }
              label="Filtrar por Troncal"
            />
            <FormControl fullWidth disabled={!enableFilters.troncal}>
              <InputLabel>Troncal</InputLabel>
              <Select
                value={filters.troncal || ''}
                onChange={(e) => setFilters({ ...filters, troncal: e.target.value })}
              >
                {troncales.map((troncal) => (
                  <MenuItem key={troncal} value={troncal}>{troncal}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={enableFilters.incidentType}
                  onChange={(e) => setEnableFilters({ ...enableFilters, incidentType: e.target.checked })}
                />
              }
              label="Filtrar por Tipo de Incidente"
            />
            <FormControl fullWidth disabled={!enableFilters.incidentType}>
              <InputLabel>Tipo de Incidente</InputLabel>
              <Select
                value={filters.incidentType || ''}
                onChange={(e) => setFilters({ ...filters, incidentType: e.target.value })}
              >
                {incidentTypes.map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Mapa */}
      <Paper elevation={3} sx={{ mb: 3, position: 'relative' }}>
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
        <div id="map" style={{ height: '500px', width: '100%', minHeight: '300px' }}></div>
      </Paper>

      {/* Gráfico de Estadísticas */}
      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Estadísticas de Incidentes</Typography>
        <Box sx={{ height: '400px', minHeight: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <canvas id="incidentChart" style={{ maxWidth: '100%', height: '100%' }}></canvas>
        </Box>
      </Paper>
    </Container>
  );
}
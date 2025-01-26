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

const securityLevels = ['Alto', 'Medio', 'Bajo'];

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
      setTroncales([...new Set(stationsData.map((s: Station) => s.troncal))] as string[]);

      updateMapMarkers(stationsData, incidentsData); //Update markers immediately after fetching data
      updateChart(incidentsData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const updateChart = (incidentsData: Incident[]) => {
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = document.getElementById('incidentChart') as HTMLCanvasElement;
    if (!ctx) return;

    const incidentCounts = incidentsData.reduce((acc: {[key: string]: number}, incident) => {
      acc[incident.incident_type] = (acc[incident.incident_type] || 0) + 1;
      return acc;
    }, {});

    chartRef.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(incidentCounts),
        datasets: [{
          label: 'Número de Incidentes',
          data: Object.values(incidentCounts),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Distribución de Incidentes por Tipo'
          }
        }
      }
    });
  };

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

    if (enableFilters.station && filters.station) {
      filteredIncidents = filteredIncidents.filter(incident => 
        incident.nearest_station === filters.station);
    }

    if (enableFilters.incidentType && filters.incidentType) {
      filteredIncidents = filteredIncidents.filter(incident =>
        incident.incident_type === filters.incidentType);
    }

    updateMapMarkers(filteredStations, filteredIncidents);
    updateChart(filteredIncidents);
  };

  const updateMapMarkers = (filteredStations: Station[], filteredIncidents: Incident[]) => {
    if (!mapRef.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    filteredStations.forEach(station => {
      const stationIncidents = filteredIncidents.filter(i => i.nearest_station === station.nombre);

      const marker = L.marker([station.latitude, station.longitude], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: ${getMarkerColor(stationIncidents.length)}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center;">
                  <span style="color: white; font-weight: bold;">T</span>
                </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      });

      marker.bindPopup(`
        <b>${station.nombre}</b><br>
        Troncal: ${station.troncal}<br>
        Incidentes: ${stationIncidents.length}
      `);

      if (mapRef.current) {
        marker.addTo(mapRef.current);
      }
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

        await fetchData();
      } catch (err) {
        console.error('Error loading map:', err);
        setError('Error al cargar el mapa');
      }
    };

    initializeMap();
  }, []);

  useEffect(() => {
    filterData();
  }, [filters, enableFilters, stations, incidents]);

  const resetFilters = () => {
    setFilters({});
    setEnableFilters({
      troncal: false,
      station: false,
      incidentType: false,
      securityLevel: false
    });
  };

  return (
    <Container maxWidth="xl" className="map-container">
      <Typography variant="h4" gutterBottom>
        Mapa de Incidentes
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={3} className="filters-panel">
            <Typography variant="h6" gutterBottom>Filtros</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
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
                    onChange={(e) => setFilters({ ...filters, troncal: e.target.value as string })}
                  >
                    {troncales.map((troncal) => (
                      <MenuItem key={troncal} value={troncal}>{troncal}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={enableFilters.station} 
                      onChange={(e) => setEnableFilters({ ...enableFilters, station: e.target.checked })}
                    />
                  }
                  label="Filtrar por Estación"
                />
                <FormControl fullWidth disabled={!enableFilters.station}>
                  <InputLabel>Estación</InputLabel>
                  <Select
                    value={filters.station || ''}
                    onChange={(e) => setFilters({ ...filters, station: e.target.value as string })}
                  >
                    {stations.map((station) => (
                      <MenuItem key={station.nombre} value={station.nombre}>
                        {station.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={enableFilters.incidentType} 
                      onChange={(e) => setEnableFilters({ ...enableFilters, incidentType: e.target.checked })}
                    />
                  }
                  label="Filtrar por Tipo"
                />
                <FormControl fullWidth disabled={!enableFilters.incidentType}>
                  <InputLabel>Tipo de Incidente</InputLabel>
                  <Select
                    value={filters.incidentType || ''}
                    onChange={(e) => setFilters({ ...filters, incidentType: e.target.value as string })}
                  >
                    {incidentTypes.map((type) => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={enableFilters.securityLevel} 
                      onChange={(e) => setEnableFilters({ ...enableFilters, securityLevel: e.target.checked })}
                    />
                  }
                  label="Filtrar por Nivel"
                />
                <FormControl fullWidth disabled={!enableFilters.securityLevel}>
                  <InputLabel>Nivel de Seguridad</InputLabel>
                  <Select
                    value={filters.securityLevel || ''}
                    onChange={(e) => setFilters({ ...filters, securityLevel: e.target.value as string })}
                  >
                    {securityLevels.map((level) => (
                      <MenuItem key={level} value={level}>{level}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Button onClick={resetFilters} variant="outlined" sx={{ mr: 1 }}>
                Reiniciar Filtros
              </Button>
              <Button onClick={filterData} variant="contained">
                Aplicar Filtros
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper elevation={3} className="map-panel">
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            )}
            {error && <Typography color="error">{error}</Typography>}
            <div id="map"></div>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Distribución de Incidentes
            </Typography>
            <canvas id="incidentChart"></canvas>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Chart as ChartJS } from 'chart.js/auto';
import '../styles/Map.css';
import { Box, Paper, CircularProgress, Grid, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Typography, Container, Button } from '@mui/material';


interface Station {
  nombre: string;
  troncal: string;
  latitude: number;
  longitude: number;
}

interface Incident {
  id: number; // Added ID field
  incident_type: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  nearest_station: string;
  description: string; // Added description field
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

const IncidentMap: React.FC = () => {
  const [map, setMap] = useState<L.Map | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [troncales, setTroncales] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [enableFilters, setEnableFilters] = useState({
    troncal: false,
    station: false,
    incidentType: false,
    securityLevel: false
  });
  const mapRef = useRef<HTMLDivElement>(null);
  const markers = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || map) return;

    const newMap = L.map(mapRef.current).setView([4.6097, -74.0817], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(newMap);
    setMap(newMap);

    const loadInitialData = async () => {
      try {
        const [stationsRes, incidentsRes] = await Promise.all([
          fetch('/api/stations'),
          fetch('/incidents')
        ]);

        const stationsData: Station[] = await stationsRes.json();
        const incidentsData: Incident[] = await incidentsRes.json();

        setStations(stationsData);
        setIncidents(incidentsData);
        const uniqueTroncales = [...new Set(stationsData.map(s => s.troncal))];
        setTroncales(uniqueTroncales);

        updateMapMarkers(stationsData, incidentsData);
        updateIncidentChart(incidentsData);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    loadInitialData();

    return () => {
      newMap.remove();
    };
  }, []);

  const applyFilters = () => {
    const anyFilterEnabled = Object.values(enableFilters).some(value => value);

    if (!anyFilterEnabled) {
      updateMapMarkers(stations, incidents);
      updateIncidentChart(incidents);
      return;
    }

    let filteredStations = stations;
    let filteredIncidents = incidents;

    if (enableFilters.troncal && filters.troncal) {
      filteredStations = stations.filter(s => s.troncal === filters.troncal);
    }

    if (enableFilters.station && filters.station) {
      filteredStations = stations.filter(s => s.nombre === filters.station);
      filteredIncidents = incidents.filter(i => i.nearest_station === filters.station);
    }

    if (enableFilters.incidentType && filters.incidentType) {
      filteredIncidents = incidents.filter(i => i.incident_type === filters.incidentType);
    }

    updateMapMarkers(filteredStations, filteredIncidents);
    updateIncidentChart(filteredIncidents);
  };

  const updateMapMarkers = (stationsToShow: Station[], incidentsToShow: Incident[]) => {
    if (!map) return;

    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    stationsToShow.forEach(station => {
      const stationIncidents = incidentsToShow.filter(i => i.nearest_station === station.nombre);
      const marker = L.marker([station.latitude, station.longitude])
        .bindPopup(`
          <b>${station.nombre}</b><br>
          Troncal: ${station.troncal}<br>
          Incidents: ${stationIncidents.length}
        `)
        .addTo(map);
      markers.current.push(marker);
    });
  };

  const updateIncidentChart = (incidents: Incident[]) => {
    const ctx = document.getElementById('incidentChart') as HTMLCanvasElement;
    if (!ctx) return;

    const chartInstance = ChartJS.getChart(ctx);
    if (chartInstance) {
      chartInstance.destroy();
    }

    const incidentCounts: Record<string, number> = {};
    incidents.forEach(incident => {
      incidentCounts[incident.incident_type] = (incidentCounts[incident.incident_type] || 0) + 1;
    });

    new ChartJS(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(incidentCounts),
        datasets: [{
          data: Object.values(incidentCounts),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF'
          ]
        }]
      }
    });
  };

  const resetFilters = () => {
    setFilters({});
    setEnableFilters({
      troncal: false,
      station: false,
      incidentType: false,
      securityLevel: false
    });
    updateMapMarkers(stations, incidents);
    updateIncidentChart(incidents);
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
              <Button onClick={applyFilters} variant="contained">
                Aplicar Filtros
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper elevation={3} className="map-panel">
            <div ref={mapRef} id="map" style={{ height: '500px' }}></div>
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
};

export default IncidentMap;
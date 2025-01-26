
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
  const stationsChartRef = useRef<ChartJS | null>(null);
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

  const calculateSecurityLevel = (totalIncidents: number) => {
    if (totalIncidents >= 50) return 'Alto';
    if (totalIncidents >= 20) return 'Medio';
    return 'Bajo';
  };

  const createPopupContent = (stationName: string, data: { total: number; types: Record<string, number> }) => {
    const securityLevel = calculateSecurityLevel(data.total);
    const typesHtml = Object.entries(data.types)
      .map(([type, count]) => `<li>${type}: ${count} reportes</li>`)
      .join('');

    return `
      <div class="station-popup">
        <h3>${stationName}</h3>
        <p><strong>Total de reportes:</strong> ${data.total}</p>
        <p><strong>Nivel de inseguridad:</strong> <span class="security-level-${securityLevel.toLowerCase()}">${securityLevel}</span></p>
        <h4>Tipos de incidentes:</h4>
        <ul>${typesHtml}</ul>
      </div>
    `;
  };

  const updateCharts = (filteredIncidents: Incident[]) => {
    // Actualizar gráfico de tipos de incidentes
    const ctx = document.getElementById('incidentChart') as HTMLCanvasElement;
    if (ctx && chartRef.current) {
      chartRef.current.destroy();
    }

    const typeStats: Record<string, number> = {};
    filteredIncidents.forEach(incident => {
      typeStats[incident.incident_type] = (typeStats[incident.incident_type] || 0) + 1;
    });

    const sortedStats = Object.entries(typeStats).sort(([,a], [,b]) => b - a);
    const total = sortedStats.reduce((sum, [,count]) => sum + count, 0);

    if (ctx) {
      chartRef.current = new ChartJS(ctx, {
        type: 'doughnut',
        data: {
          labels: sortedStats.map(([type, count]) => 
            `${type} (${((count / total) * 100).toFixed(1)}%)`
          ),
          datasets: [{
            data: sortedStats.map(([, count]) => count),
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)',
              'rgba(255, 159, 64, 0.8)'
            ],
            borderColor: 'white',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                padding: 20,
                font: { size: 11 }
              }
            },
            title: {
              display: true,
              text: 'Distribución de Incidentes',
              font: {
                size: 16,
                weight: 'bold'
              },
              padding: {
                top: 10,
                bottom: 20
              }
            }
          }
        }
      });
    }

    // Actualizar gráfico de estaciones más afectadas
    const stationsCtx = document.getElementById('stationsChart') as HTMLCanvasElement;
    if (stationsCtx && stationsChartRef.current) {
      stationsChartRef.current.destroy();
    }

    const stationStats: Record<string, number> = {};
    filteredIncidents.forEach(incident => {
      stationStats[incident.nearest_station] = (stationStats[incident.nearest_station] || 0) + 1;
    });

    const sortedStationStats = Object.entries(stationStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    if (stationsCtx) {
      stationsChartRef.current = new ChartJS(stationsCtx, {
        type: 'bar',
        data: {
          labels: sortedStationStats.map(([station]) => station),
          datasets: [{
            label: 'Número de Incidentes',
            data: sortedStationStats.map(([, count]) => count),
            backgroundColor: 'rgba(54, 162, 235, 0.8)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Estaciones más Afectadas',
              font: {
                size: 16,
                weight: 'bold'
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
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

    updateCharts(filteredIncidents);
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

    if (enableFilters.securityLevel && filters.securityLevel) {
      const stationIncidents = filteredIncidents.reduce((acc, incident) => {
        acc[incident.nearest_station] = (acc[incident.nearest_station] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      filteredStations = filteredStations.filter(station => {
        const total = stationIncidents[station.nombre] || 0;
        return calculateSecurityLevel(total) === filters.securityLevel;
      });
    }

    updateMarkers(filteredStations, filteredIncidents);

    if (filteredStations.length > 0) {
      const bounds = L.latLngBounds(
        filteredStations.map(station => [station.latitude, station.longitude])
      );
      mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const resetFilters = () => {
    setFilters({});
    setEnableFilters({
      troncal: false,
      station: false,
      incidentType: false,
      securityLevel: false
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

        const stationsData = await stationsResponse.json();
        const incidentsData = await incidentsResponse.json();

        setStations(stationsData);
        setIncidents(incidentsData);

        const uniqueTroncales = [...new Set(stationsData.map((station: Station) => station.troncal))];
        setTroncales(uniqueTroncales.filter(Boolean).sort());

        updateMarkers(stationsData, incidentsData);

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
      if (stationsChartRef.current) {
        stationsChartRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    filterData();
  }, [filters, enableFilters]);

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
      <Typography variant="h4" gutterBottom>
        Mapa de Incidentes
      </Typography>
      <Grid container spacing={2}>
        {/* Panel de Filtros */}
        <Grid item xs={12} md={3}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Filtros
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
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

              <Grid item xs={12}>
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

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={enableFilters.securityLevel}
                      onChange={(e) => setEnableFilters({ ...enableFilters, securityLevel: e.target.checked })}
                    />
                  }
                  label="Filtrar por Nivel de Seguridad"
                />
                <FormControl fullWidth disabled={!enableFilters.securityLevel}>
                  <InputLabel>Nivel de Seguridad</InputLabel>
                  <Select
                    value={filters.securityLevel || ''}
                    onChange={(e) => setFilters({ ...filters, securityLevel: e.target.value })}
                  >
                    <MenuItem value="Alto">Alto</MenuItem>
                    <MenuItem value="Medio">Medio</MenuItem>
                    <MenuItem value="Bajo">Bajo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Button 
                  variant="contained" 
                  color="secondary" 
                  fullWidth 
                  onClick={resetFilters}
                  sx={{ mt: 2 }}
                >
                  Limpiar Filtros
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Panel Principal */}
        <Grid item xs={12} md={9}>
          <Grid container spacing={2}>
            {/* Mapa */}
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 2 }}>
                <Box sx={{ height: '500px', position: 'relative' }}>
                  {loading && (
                    <Box sx={{ 
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 1000
                    }}>
                      <CircularProgress />
                    </Box>
                  )}
                  {error && (
                    <Box sx={{ 
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: 'error.main',
                      zIndex: 1000
                    }}>
                      {error}
                    </Box>
                  )}
                  <div id="map" style={{ height: '100%', width: '100%' }}></div>
                </Box>
              </Paper>
            </Grid>

            {/* Panel de Estadísticas */}
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Estadísticas
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ height: '300px' }}>
                      <canvas id="incidentChart"></canvas>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ height: '300px' }}>
                      <canvas id="stationsChart"></canvas>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}

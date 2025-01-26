
import { useState, useEffect } from 'react';
import { Grid, Container } from '@mui/material';
import StatCard from './statistics/StatCard';
import DetailList from './statistics/DetailList';
import QuickFilters from './statistics/QuickFilters';

interface StatsData {
  total_incidents: number;
  most_affected_station: string;
  most_dangerous_hour: string;
  most_common_type: string;
  incident_types: Record<string, number>;
  top_stations: Record<string, number>;
}

export default function Statistics() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [period, setPeriod] = useState('all');

  const loadStatistics = async (selectedPeriod: string) => {
    try {
      const queryParams = new URLSearchParams();
      if (selectedPeriod !== 'all') {
        queryParams.append('period', selectedPeriod);
      }
      const response = await fetch(`/api/v1/statistics?${queryParams}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  useEffect(() => {
    loadStatistics(period);
  }, [period]);

  if (!stats) return <div>Cargando...</div>;

  const incidentTypesList = Object.entries(stats.incident_types)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const stationsList = Object.entries(stats.top_stations)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <Container className="statistics-container">
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Total Incidentes"
            value={stats.total_incidents}
            icon="fa-chart-bar"
            color="total"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Estación más Afectada"
            value={stats.most_affected_station}
            icon="fa-exclamation-triangle"
            color="danger"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Hora más Insegura"
            value={stats.most_dangerous_hour}
            icon="fa-clock"
            color="warning"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Tipo más Común"
            value={stats.most_common_type}
            icon="fa-tag"
            color="info"
          />
        </Grid>
      </Grid>

      <QuickFilters
        selectedPeriod={period}
        onPeriodChange={setPeriod}
      />

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <DetailList
            title="Tipos de Incidentes"
            items={incidentTypesList}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <DetailList
            title="Estaciones más Afectadas"
            items={stationsList}
          />
        </Grid>
      </Grid>
    </Container>
  );
}

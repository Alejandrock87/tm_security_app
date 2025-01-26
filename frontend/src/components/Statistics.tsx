
import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Grid } from '@mui/material';

interface StatsData {
  total_incidents: number;
  most_affected_station: string;
  most_dangerous_hour: string;
  most_common_type: string;
}

export default function Statistics() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch('/api/statistics')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6">Total Incidents</Typography>
            <Typography variant="h4">{stats.total_incidents}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6">Most Affected Station</Typography>
            <Typography variant="h4">{stats.most_affected_station}</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

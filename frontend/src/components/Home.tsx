
import { Container, Grid, Card, CardContent, Typography, Button, Box } from '@mui/material';
import { MapOutlined, WarningAmber, QueryStats } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Mapa de Incidentes',
      description: 'Visualiza los incidentes reportados en el sistema Transmilenio',
      icon: <MapOutlined sx={{ fontSize: 40 }} />,
      route: '/dashboard'
    },
    {
      title: 'Reportar Incidente',
      description: 'Reporta un nuevo incidente de seguridad en el sistema',
      icon: <WarningAmber sx={{ fontSize: 40 }} />,
      route: '/report_incident'
    },
    {
      title: 'Estadísticas',
      description: 'Analiza las estadísticas de seguridad del sistema',
      icon: <QueryStats sx={{ fontSize: 40 }} />,
      route: '/statistics'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box textAlign="center" mb={6}>
        <Typography variant="h3" component="h1" gutterBottom>
          Transmilenio Security
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Sistema de Reporte de Incidentes de Seguridad
        </Typography>
      </Box>

      <Grid container spacing={4} justifyContent="center">
        {menuItems.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.title}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: '0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Box sx={{ mb: 2, color: 'primary.main' }}>
                  {item.icon}
                </Box>
                <Typography gutterBottom variant="h5" component="h2">
                  {item.title}
                </Typography>
                <Typography color="text.secondary" paragraph>
                  {item.description}
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate(item.route)}
                  sx={{ mt: 2 }}
                >
                  Acceder
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

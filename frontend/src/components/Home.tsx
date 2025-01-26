
import { Container, Grid, Card, CardContent, Typography, Box, useTheme, useMediaQuery } from '@mui/material';
import { MapOutlined, WarningAmber, QueryStats } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const menuItems = [
    {
      title: 'Mapa de Incidentes',
      description: 'Visualiza los incidentes reportados',
      icon: <MapOutlined sx={{ fontSize: isMobile ? 48 : 40 }} />,
      route: '/incident-map',
      color: 'primary.main'
    },
    {
      title: 'Reportar Incidente',
      description: 'Reporta un nuevo incidente',
      icon: <WarningAmber sx={{ fontSize: isMobile ? 48 : 40 }} />,
      route: '/report_incident',
      color: 'error.main'
    },
    {
      title: 'Estadísticas',
      description: 'Analiza las estadísticas',
      icon: <QueryStats sx={{ fontSize: isMobile ? 48 : 40 }} />,
      route: '/statistics',
      color: 'success.main'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 4 }}>
      <Box textAlign="center" mb={isMobile ? 3 : 6}>
        <Typography 
          variant={isMobile ? "h4" : "h3"} 
          component="h1" 
          gutterBottom
          sx={{ fontWeight: 'bold' }}
        >
          Transmilenio Security
        </Typography>
        <Typography 
          variant={isMobile ? "body1" : "h6"} 
          color="text.secondary" 
          paragraph
        >
          Sistema de Reporte de Incidentes
        </Typography>
      </Box>

      <Grid container spacing={isMobile ? 2 : 4} justifyContent="center">
        {menuItems.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.title}>
            <Card 
              onClick={() => navigate(item.route)}
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: '0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6
                },
                '&:active': {
                  transform: 'scale(0.98)'
                }
              }}
              role="button"
              aria-label={`Ir a ${item.title}`}
            >
              <CardContent sx={{ 
                p: isMobile ? 2 : 3,
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}>
                <Box sx={{ 
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  borderRadius: '50%',
                  bgcolor: `${item.color}15`
                }}>
                  {item.icon}
                </Box>
                <Typography 
                  variant={isMobile ? "h6" : "h5"}
                  component="h2"
                  sx={{ fontWeight: 'bold' }}
                >
                  {item.title}
                </Typography>
                <Typography 
                  color="text.secondary"
                  sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }}
                >
                  {item.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

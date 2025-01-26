
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  useTheme,
  useMediaQuery,
  SwipeableDrawer
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home,
  Map,
  Assessment,
  Warning,
  Close as CloseIcon
} from '@mui/icons-material';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const menuItems = [
    { text: 'Inicio', icon: <Home />, path: '/' },
    { text: 'Mapa de Incidentes', icon: <Map />, path: '/incident-map' },
    { text: 'Estadísticas', icon: <Assessment />, path: '/statistics' },
    { text: 'Reportar', icon: <Warning />, path: '/report_incident' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) handleDrawerToggle();
  };

  const DrawerContent = () => (
    <Box sx={{ width: 240 }}>
      {isMobile && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          p: 1 
        }}>
          <IconButton 
            onClick={handleDrawerToggle}
            aria-label="Cerrar menú"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.text}
            onClick={() => handleNavigation(item.path)}
            selected={location.pathname === item.path}
            sx={{
              my: 0.5,
              mx: 1,
              borderRadius: 1,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'white',
                '& .MuiListItemIcon-root': {
                  color: 'white',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
            aria-label="Abrir menú"
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 'bold',
              fontSize: isMobile ? '1.1rem' : '1.25rem'
            }}
          >
            TransMilenio Security
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: 240 }, flexShrink: { sm: 0 } }}>
        {isMobile ? (
          <SwipeableDrawer
            variant="temporary"
            anchor="left"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            onOpen={() => setMobileOpen(true)}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': { 
                width: 240,
                boxSizing: 'border-box',
                bgcolor: 'background.default'
              },
            }}
          >
            <DrawerContent />
          </SwipeableDrawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': { 
                width: 240,
                boxSizing: 'border-box',
                bgcolor: 'background.default',
                borderRight: '1px solid',
                borderColor: 'divider'
              },
            }}
            open
          >
            <Toolbar />
            <DrawerContent />
          </Drawer>
        )}
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: isMobile ? 2 : 3,
          width: { sm: `calc(100% - 240px)` },
          mt: { xs: 7, sm: 8 },
          bgcolor: 'background.default'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

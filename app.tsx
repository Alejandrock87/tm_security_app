import React, { useState, useEffect } from 'react'
import { MapPin, AlertTriangle, Map, BarChart2, Bell, Menu, ArrowLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [map, setMap] = useState(null)

  useEffect(() => {
    if (currentScreen === 'incidentMap' && !map) {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js'
      script.async = true
      document.body.appendChild(script)

      script.onload = () => {
        const mapInstance = L.map('map').setView([4.6097, -74.0817], 11)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance)
        setMap(mapInstance)
      }

      return () => {
        document.body.removeChild(script)
      }
    }
  }, [currentScreen, map])

  const handleAuth = () => {
    setIsAuthenticated(true)
    setCurrentScreen('enableLocation')
  }

  const handleEnableLocation = () => {
    setLocationEnabled(true)
    setCurrentScreen('main')
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setLocationEnabled(false)
    setCurrentScreen('login')
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <Card className="w-full max-w-sm mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Transmilenio Seguridad</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                  <TabsTrigger value="register">Registrarse</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <form className="space-y-4">
                    <Input type="email" placeholder="Correo electrónico" />
                    <Input type="password" placeholder="Contraseña" />
                    <Button onClick={handleAuth} className="w-full">Iniciar Sesión</Button>
                  </form>
                </TabsContent>
                <TabsContent value="register">
                  <form className="space-y-4">
                    <Input type="email" placeholder="Correo electrónico" />
                    <Input type="password" placeholder="Contraseña" />
                    <Input type="password" placeholder="Confirmar contraseña" />
                    <Button onClick={handleAuth} className="w-full">Registrarse</Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )
      case 'enableLocation':
        return (
          <Card className="w-full max-w-sm mx-auto">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-center">Activar Ubicación</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4">Para continuar, necesitamos acceso a tu ubicación.</p>
              <Button onClick={handleEnableLocation}>Activar Ubicación</Button>
            </CardContent>
          </Card>
        )
      case 'main':
        return (
          <div className="grid gap-4 p-4">
            <Button onClick={() => setCurrentScreen('reportIncident')} className="flex items-center justify-center h-16 text-lg">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Registrar Incidente
            </Button>
            <Button onClick={() => setCurrentScreen('incidentMap')} className="flex items-center justify-center h-16 text-lg">
              <Map className="mr-2 h-6 w-6" />
              Mapa de Incidentes
            </Button>
            <Button onClick={() => setCurrentScreen('predictiveAnalysis')} className="flex items-center justify-center h-16 text-lg">
              <BarChart2 className="mr-2 h-6 w-6" />
              Análisis Predictivo de Seguridad
            </Button>
          </div>
        )
      case 'reportIncident':
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center">
              <Button variant="ghost" size="icon" onClick={() => setCurrentScreen('main')}>
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <CardTitle className="ml-4">Registrar Incidente</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div>
                  <label htmlFor="incidentType" className="block text-sm font-medium text-gray-700">Tipo de Incidente</label>
                  <select id="incidentType" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                    <option>Hurto</option>
                    <option>Hurto a mano armada</option>
                    <option>Cosquilleo</option>
                    <option>Ataque</option>
                    <option>Apertura de Puertas</option>
                    <option>Sospechoso</option>
                    <option>Acoso</option>
                  </select>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Estación más cercana: Calle 100</p>
                  <p className="text-sm font-medium text-gray-700">Hora actual: {new Date().toLocaleTimeString()}</p>
                </div>
                <Button type="submit" className="w-full">Enviar Reporte</Button>
              </form>
            </CardContent>
          </Card>
        )
      case 'incidentMap':
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center">
              <Button variant="ghost" size="icon" onClick={() => setCurrentScreen('main')}>
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <CardTitle className="ml-4">Mapa de Incidentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div id="map" className="h-64 mb-4"></div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full">Filtrar por Nivel de Inseguridad</Button>
                <Button variant="outline" className="w-full">Filtrar por Tipo de Incidente</Button>
                <Button variant="outline" className="w-full">Borrar Filtros</Button>
              </div>
            </CardContent>
          </Card>
        )
      case 'predictiveAnalysis':
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center">
              <Button variant="ghost" size="icon" onClick={() => setCurrentScreen('main')}>
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <CardTitle className="ml-4">Análisis Predictivo de Seguridad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-yellow-100 p-4 rounded-md">
                  <h3 className="font-semibold">Alerta de Riesgo Medio</h3>
                  <p>Es probable que en 30 minutos el nivel de inseguridad aumente en la estación Calle 100.</p>
                </div>
                <div className="bg-red-100 p-4 rounded-md">
                  <h3 className="font-semibold">Alerta de Riesgo Alto</h3>
                  <p>Se prevé un aumento significativo de incidentes en la estación Portal Norte entre las 18:00 y 20:00.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {isAuthenticated && locationEnabled ? (
        <>
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
              <h1 className="text-lg font-semibold">Transmilenio Seguridad</h1>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Abrir menú</span>
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <nav className="flex flex-col space-y-4">
                    <Button variant="ghost" onClick={() => setCurrentScreen('main')}>Inicio</Button>
                    <Button variant="ghost" onClick={() => setCurrentScreen('reportIncident')}>Registrar Incidente</Button>
                    <Button variant="ghost" onClick={() => setCurrentScreen('incidentMap')}>Mapa de Incidentes</Button>
                    <Button variant="ghost" onClick={() => setCurrentScreen('predictiveAnalysis')}>Análisis Predictivo</Button>
                    <Button variant="ghost" onClick={handleLogout}>Cerrar Sesión</Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            {renderScreen()}
          </main>
          <footer className="bg-white shadow-sm-top">
            <nav className="flex justify-around">
              <Button variant="ghost" onClick={() => setCurrentScreen('main')} className="flex-1 py-4">
                <MapPin className="h-6 w-6" />
                <span className="sr-only">Inicio</span>
              </Button>
              <Button variant="ghost" onClick={() => setCurrentScreen('reportIncident')} className="flex-1 py-4">
                <AlertTriangle className="h-6 w-6" />
                <span className="sr-only">Reportar</span>
              </Button>
              <Button variant="ghost" onClick={() => setCurrentScreen('incidentMap')} className="flex-1 py-4">
                <Map className="h-6 w-6" />
                <span className="sr-only">Mapa</span>
              </Button>
              <Button variant="ghost" onClick={() => setCurrentScreen('predictiveAnalysis')} className="flex-1 py-4">
                <BarChart2 className="h-6 w-6" />
                <span className="sr-only">Predicciones</span>
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="flex-1 py-4 relative">
                    <Bell className="h-6 w-6" />
                    {notifications.length > 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        {notifications.length}
                      </span>
                    )}
                    <span className="sr-only">Notificaciones</span>
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <h2 className="text-lg font-semibold mb-4">Notificaciones</h2>
                  {notifications.length === 0 ? (
                    <p>No hay notificaciones nuevas.</p>
                  ) : (
                    <ul className="space-y-2">
                      {notifications.map((notification, index) => (
                        <li key={index} className="p-2 bg-gray-100 rounded">
                          {notification}
                        </li>
                      ))}
                    </ul>
                  )}
                </SheetContent>
              </Sheet>
            </nav>
          </footer>
        </>
      ) : (
        <main className="flex-1 flex items-center justify-center p-4">
          {renderScreen()}
        </main>
      )}
    </div>
  )
}
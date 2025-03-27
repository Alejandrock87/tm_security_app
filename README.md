# Sistema de Reporte de Incidentes de Seguridad Transmilenio

## Descripción General

¡Bienvenido al Sistema de Reporte de Incidentes de Seguridad Transmilenio! Esta aplicación web está diseñada para mejorar la seguridad en el sistema de transporte Transmilenio de Bogotá, Colombia. Permite a los usuarios reportar y visualizar incidentes de seguridad, ayudando a crear un entorno más seguro para todos los pasajeros.

## Características Principales

1. **Registro e Inicio de Sesión de Usuarios**
   - Crea tu cuenta personal para acceder a todas las funciones.
   - Inicia sesión de forma segura con tu nombre de usuario y contraseña.

2. **Reporte de Incidentes**
   - Reporta incidentes de seguridad de forma rápida y sencilla.
   - La aplicación captura automáticamente tu ubicación para mayor precisión.
   - Elige entre varios tipos de incidentes y proporciona detalles adicionales.

3. **Mapa de Incidentes Interactivo**
   - Visualiza todos los incidentes reportados en un mapa fácil de usar.
   - Filtra los incidentes por tipo o fecha para un análisis más detallado.

4. **Estadísticas de Incidentes**
   - Accede a gráficos intuitivos que muestran tendencias de seguridad.
   - Analiza la distribución de incidentes por tipo y tiempo.

5. **Análisis de Puntos Críticos**
   - Identifica las estaciones con mayor concentración de incidentes.
   - Visualiza los tipos de incidentes más comunes por zona.

6. **Mapa en Tiempo Real**
   - Observa tu ubicación en tiempo real en relación con las estaciones de Transmilenio.
   - Identifica fácilmente las estaciones más cercanas a tu posición.

7. **Notificaciones en Tiempo Real**
   - Recibe alertas sobre incidentes recientes en tu área de interés.
   - Configura preferencias de notificación según tus necesidades.

## Guía de Uso Paso a Paso

### 1. Registro e Inicio de Sesión

1. Accede a la página principal de la aplicación.
2. Haz clic en el botón "Registrarse" en la esquina superior derecha.
3. Completa el formulario con tu nombre de usuario, correo electrónico y contraseña.
4. Haz clic en "Registrarse" para crear tu cuenta.
5. Una vez registrado, usa el botón "Iniciar Sesión" e ingresa tus credenciales.

### 2. Reportar un Incidente

1. Después de iniciar sesión, haz clic en "Reportar Incidente" en el menú principal.
2. Asegúrate de que tu ubicación esté activada cuando la aplicación lo solicite.
3. Selecciona el tipo de incidente de la lista desplegable.
4. Proporciona una breve descripción del incidente en el campo de texto.
5. Verifica que la estación más cercana y la hora sean correctas (se llenan automáticamente).
6. Haz clic en "Enviar Reporte" para registrar el incidente.

### 3. Explorar el Mapa de Incidentes

1. En el menú principal, selecciona "Mapa de Incidentes".
2. Utiliza los controles de zoom para acercarte o alejarte en el mapa.
3. Haz clic en los marcadores para ver detalles de incidentes específicos.
4. Usa los filtros en la parte superior del mapa para mostrar tipos específicos de incidentes o rangos de fechas.

### 4. Consultar Estadísticas

1. Accede a "Estadísticas" desde el menú principal.
2. Explora los diferentes gráficos que muestran tendencias de incidentes.
3. Utiliza los selectores de fecha para ver estadísticas de períodos específicos.

### 5. Usar el Mapa en Tiempo Real

1. Selecciona "Mapa en Tiempo Real" en el menú.
2. Permite que la aplicación acceda a tu ubicación cuando lo solicite.
3. Observa tu posición en el mapa junto con las estaciones de Transmilenio cercanas.
4. Utiliza esta función para planificar rutas más seguras.

### 6. Configurar Notificaciones

1. Ve a la sección "Configuración" en tu perfil de usuario.
2. Activa las notificaciones y selecciona los tipos de alertas que deseas recibir.
3. Elige el radio de distancia para el cual quieres recibir notificaciones.

## Preguntas Frecuentes (FAQ)

**P: ¿Es necesario crear una cuenta para reportar incidentes?**
R: Sí, es necesario registrarse para poder reportar incidentes. Esto nos ayuda a mantener la integridad de los datos y prevenir reportes falsos.

**P: ¿Cómo se protege mi privacidad al reportar incidentes?**
R: Tu información personal nunca se muestra públicamente. Solo utilizamos tu ubicación para el reporte de incidentes y las estadísticas se muestran de forma anónima.

**P: ¿Puedo reportar incidentes que ocurrieron en el pasado?**
R: Sí, al reportar un incidente, tienes la opción de ajustar la fecha y hora del suceso.

**P: ¿Con qué frecuencia se actualizan las estadísticas y el mapa de incidentes?**
R: El mapa y las estadísticas se actualizan en tiempo real cada vez que se reporta un nuevo incidente.

**P: ¿La aplicación funciona fuera de Bogotá o en otros sistemas de transporte?**
R: Actualmente, la aplicación está diseñada específicamente para el sistema Transmilenio en Bogotá.

## Resolución de Problemas

- **No puedo iniciar sesión**: Verifica que estés usando el nombre de usuario y contraseña correctos. Si olvidaste tu contraseña, usa la opción "Olvidé mi contraseña" en la página de inicio de sesión.

- **La aplicación no detecta mi ubicación**: Asegúrate de que has dado permiso a la aplicación para acceder a tu ubicación en la configuración de tu dispositivo o navegador.

- **No veo los incidentes en el mapa**: Prueba a refrescar la página. Si el problema persiste, verifica tu conexión a internet.

- **No recibo notificaciones**: Revisa la configuración de notificaciones en tu perfil y asegúrate de que las has activado correctamente.

## Consideraciones Técnicas

- La aplicación está desarrollada con Flask, un framework ligero y potente de Python.
- Utilizamos SQLAlchemy para una gestión eficiente de la base de datos.
- El frontend está diseñado con Bootstrap, garantizando una experiencia responsiva en todos los dispositivos.
- Los mapas interactivos se implementan con Leaflet.js, una librería de código abierto para mapas interactivos.
- Las funcionalidades en tiempo real se logran mediante Socket.IO.

## Seguridad

- Todas las contraseñas se almacenan de forma segura utilizando técnicas de hash avanzadas.
- La autenticación de usuarios es obligatoria para acceder a funcionalidades sensibles.
- La geolocalización requiere el consentimiento explícito del usuario y puede desactivarse en cualquier momento.

---

Este es un proyecto independiente y no está afiliado oficialmente con Transmilenio S.A. Desarrollado con el objetivo de contribuir a la seguridad de los usuarios del sistema de transporte público de Bogotá.

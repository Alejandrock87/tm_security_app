# Sistema de Reporte de Incidentes de Seguridad Transmilenio

## Descripción General

Esta aplicación web permite a los usuarios reportar y visualizar incidentes de seguridad en el sistema Transmilenio de Bogotá, Colombia. Utiliza Flask como framework backend, SQLAlchemy para la gestión de la base de datos, y Bootstrap para el diseño frontend.

## Características Principales

1. **Registro e Inicio de Sesión de Usuarios**
   - Los usuarios pueden registrarse proporcionando un nombre de usuario, correo electrónico y contraseña.
   - El inicio de sesión se realiza con el nombre de usuario y contraseña.

2. **Reporte de Incidentes**
   - Los usuarios autenticados pueden reportar incidentes de seguridad.
   - Se captura automáticamente la ubicación del usuario (latitud y longitud).
   - Se puede seleccionar el tipo de incidente y proporcionar una descripción.

3. **Mapa de Incidentes**
   - Visualización de todos los incidentes reportados en un mapa interactivo.
   - Los incidentes se muestran como marcadores en el mapa.

4. **Estadísticas de Incidentes**
   - Gráficos que muestran la distribución de incidentes por tipo y por tiempo.

5. **Análisis Predictivo**
   - Utiliza modelos de aprendizaje automático para predecir posibles áreas de riesgo.

6. **Mapa en Tiempo Real**
   - Muestra la ubicación en tiempo real del usuario y las estaciones de Transmilenio cercanas.

7. **Notificaciones en Tiempo Real**
   - Los usuarios reciben notificaciones sobre nuevos incidentes reportados.

## Cómo Usar la Aplicación

1. **Registro e Inicio de Sesión**
   - Acceda a la página principal y haga clic en "Registrarse".
   - Complete el formulario de registro con su información.
   - Una vez registrado, inicie sesión con sus credenciales.

2. **Reportar un Incidente**
   - Después de iniciar sesión, haga clic en "Reportar Incidente".
   - Seleccione el tipo de incidente y proporcione una descripción.
   - Asegúrese de que su ubicación esté activada para capturar las coordenadas.
   - Haga clic en "Enviar Reporte" para registrar el incidente.

3. **Ver el Mapa de Incidentes**
   - Acceda a "Mapa de Incidentes" desde el menú principal.
   - Explore el mapa para ver todos los incidentes reportados.
   - Utilice los filtros disponibles para ver incidentes específicos.

4. **Consultar Estadísticas**
   - En la página del dashboard, podrá ver gráficos y estadísticas sobre los incidentes reportados.

5. **Mapa en Tiempo Real**
   - Acceda a "Mapa en Tiempo Real" para ver su ubicación actual y las estaciones de Transmilenio cercanas.

6. **Recibir Notificaciones**
   - Las notificaciones sobre nuevos incidentes aparecerán automáticamente en la interfaz de usuario.

## Consideraciones Técnicas

- La aplicación utiliza Flask como framework backend.
- SQLAlchemy se usa para la gestión de la base de datos.
- El frontend está diseñado con Bootstrap para una experiencia responsiva.
- Se utiliza Leaflet.js para la renderización de mapas interactivos.
- Socket.IO se implementa para las funcionalidades en tiempo real.

## Seguridad

- Las contraseñas de los usuarios se almacenan de forma segura utilizando hash.
- Se implementa autenticación de usuarios para acceder a funcionalidades sensibles.
- La geolocalización requiere el consentimiento explícito del usuario.

## Desarrollo Futuro

- Integración con APIs oficiales de Transmilenio para datos en tiempo real.
- Mejora de los modelos de aprendizaje automático para predicciones más precisas.
- Implementación de una aplicación móvil nativa para mejorar la experiencia del usuario en dispositivos móviles.

---

Para cualquier pregunta o soporte, por favor contacte al equipo de desarrollo.

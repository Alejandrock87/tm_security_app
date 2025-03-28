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
- El frontend está diseñado con Bootstrap, un framework que utiliza HTML, CSS y JavaScript para garantizar una experiencia responsiva en todos los dispositivos.
- Implementamos código HTML para la estructura, CSS para estilos adicionales y JavaScript para funcionalidades interactivas personalizadas.
- Los mapas interactivos se implementan con Leaflet.js, una librería de código abierto para mapas interactivos.
- Las funcionalidades en tiempo real se logran mediante Socket.IO.

## Seguridad

- Todas las contraseñas se almacenan de forma segura utilizando técnicas de hash avanzadas.
- La autenticación de usuarios es obligatoria para acceder a funcionalidades sensibles.
- La geolocalización requiere el consentimiento explícito del usuario y puede desactivarse en cualquier momento.

---

Este es un proyecto independiente y no está afiliado oficialmente con Transmilenio S.A. Desarrollado con el objetivo de contribuir a la seguridad de los usuarios del sistema de transporte público de Bogotá.

# TransmilenioSafetyApp - Guía de Despliegue en Railway

Esta guía detalla los pasos necesarios para desplegar la aplicación TransmilenioSafetyApp en la plataforma Railway, incluyendo la configuración de la base de datos PostgreSQL, la migración de datos, y la configuración del scheduler para reentrenamiento del modelo y predicciones automáticas.

## Índice
1. [Requisitos Previos](#requisitos-previos)
2. [Preparación del Código](#preparación-del-código)
3. [Exportación de Datos](#exportación-de-datos)
4. [Configuración en Railway](#configuración-en-railway)
5. [Despliegue en Railway](#despliegue-en-railway)
6. [Migración de Datos](#migración-de-datos)
7. [Verificación del Despliegue](#verificación-del-despliegue)
8. [Mantenimiento y Supervisión](#mantenimiento-y-supervisión)

## Requisitos Previos

- Cuenta en [Railway](https://railway.app/)
- Git instalado en tu máquina local
- Repositorio GitHub configurado para tu proyecto
- PostgreSQL instalado localmente para exportar datos

## Preparación del Código

Antes de desplegar en Railway, hemos realizado las siguientes modificaciones al código:

1. **Optimización del Modelo ML**: 
   - Reducido el número de épocas de entrenamiento a 20 (de 50)
   - Reducido las unidades LSTM a 12 (de 16)
   - Reducido el tamaño del batch a 16 (de 32)
   
2. **Archivos Creados**:
   - `Procfile`: Define los comandos para ejecutar la aplicación web y el scheduler
   - `scheduler.py`: Script para automatizar predicciones diarias y reentrenamiento semanal
   - `export_data.py`: Script para exportar datos locales
   - `import_data.py`: Script para importar datos en Railway

3. **Dependencias Actualizadas**:
   - Se añadieron las dependencias necesarias en `requirements.txt`:
     - gunicorn
     - gevent-websocket
     - psycopg2-binary
     - schedule
     - tensorflow-cpu (en lugar de tensorflow)

## Exportación de Datos

Para exportar los datos locales y prepararlos para la importación en Railway:

1. Asegúrate de que tu base de datos PostgreSQL local está en funcionamiento
2. Ejecuta el script de exportación:

```bash
python export_data.py
```

3. Verifica que se hayan creado los siguientes archivos:
   - `export_users.json`
   - `export_incidents.json`
   - `export_notifications.json`
   - `export_user_preferences.json`

## Configuración en Railway

### 1. Crear un Nuevo Proyecto

1. Inicia sesión en [Railway](https://railway.app/)
2. Haz clic en "New Project"
3. Selecciona "Deploy from GitHub repo"
4. Elige tu repositorio y branch (main o master)

### 2. Configurar Base de Datos PostgreSQL

1. En tu proyecto, haz clic en "New"
2. Elige "Database" -> "PostgreSQL"
3. Railway configurará automáticamente una base de datos PostgreSQL y añadirá la variable `DATABASE_URL` a tu proyecto

### 3. Configurar Variables de Entorno

En la pestaña "Variables", añade las siguientes:

```
FLASK_SECRET_KEY=un_valor_aleatorio_largo_y_seguro
PRODUCTION=True
FLASK_ENV=production
RETRAIN_FREQUENCY=7
PREDICT_FREQUENCY=1
```

### 4. Configurar Servicios

Railway detectará automáticamente el `Procfile` y configurará dos servicios:

1. **Servicio Web**:
   - Command: `gunicorn --worker-class geventwebsocket.gunicorn.workers.GeventWebSocketWorker -w 1 app:socketio`
   - Configura recursos: 384 MB RAM

2. **Servicio Scheduler**:
   - Command: `python scheduler.py`
   - Configura recursos: 128 MB RAM

## Despliegue en Railway

1. El despliegue inicial se activará automáticamente después de configurar el proyecto
2. Puedes seguir el progreso en la pestaña "Deployments"
3. Si necesitas realizar despliegues manuales, presiona el botón "Deploy" en la parte superior

## Migración de Datos

Una vez que la aplicación esté desplegada:

1. Ve a la pestaña "Deployments" y selecciona el despliegue más reciente
2. Haz clic en "Shell" para abrir una terminal
3. Sube los archivos JSON exportados:
   ```bash
   curl -o export_users.json https://url-to-your-file/export_users.json
   curl -o export_incidents.json https://url-to-your-file/export_incidents.json
   # etc. para otros archivos
   ```
   
   Alternativamente, puedes usar el comando `railway link` y `railway upload` si tienes la CLI de Railway instalada.

4. Ejecuta el script de importación:
   ```bash
   python import_data.py
   ```

## Verificación del Despliegue

### 1. Verificar la Aplicación Web

1. Obtén la URL de tu aplicación desde el panel de Railway (normalmente `https://tu-app.railway.app`)
2. Visita la URL y asegúrate de que la aplicación carga correctamente
3. Intenta iniciar sesión con un usuario existente para verificar la migración de datos

### 2. Verificar el Scheduler

1. Revisa los logs del servicio Scheduler en Railway
2. Verifica que las predicciones se estén generando diariamente
3. Después de una semana, confirma que el modelo se haya reentrenado automáticamente

### 3. Verificar la Integración de Socket.IO

1. Accede a la pantalla de predicciones
2. Comprueba que las actualizaciones en tiempo real funcionan correctamente
3. Verifica que las notificaciones se envían como se espera

## Mantenimiento y Supervisión

### 1. Monitoreo de Recursos

- Vigila regularmente el uso de recursos en Railway (especialmente durante el reentrenamiento)
- Si se aproxima al límite (512 MB RAM total), considera:
  - Reducir épocas de entrenamiento a 10-15
  - Reducir el tamaño del batch a 8
  - Limitar los datos históricos usados en el entrenamiento

### 2. Backups de Datos

- Configura backups regulares de la base de datos desde la sección "Database" en Railway
- Considera exportar periódicamente los datos críticos

### 3. Logs y Depuración

- Revisa regularmente los logs de ambos servicios (web y scheduler)
- Presta especial atención a los errores durante el reentrenamiento o predicciones

### 4. Actualizaciones

Para actualizar el código:
1. Realiza cambios localmente y prueba
2. Sube los cambios a GitHub
3. Railway detectará automáticamente y desplegará los cambios

---

## Notas sobre el Modelo de ML

El sistema utiliza una Red Neuronal Recurrente (RNN) con capas LSTM para predecir incidentes en el sistema Transmilenio. El entrenamiento se realiza con datos históricos, generando secuencias temporales para predecir el riesgo de incidentes por estación y tipo. La configuración ha sido optimizada para funcionar dentro de los límites de recursos de Railway.

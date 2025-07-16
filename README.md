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

## 🆕 Nuevas Funcionalidades Implementadas

### Sistema de Notificaciones Emergentes en Tiempo Real

La aplicación ahora cuenta con un **sistema completo de notificaciones emergentes** que proporciona alertas inmediatas sobre incidentes de seguridad sin depender de notificaciones nativas del dispositivo.

#### ✨ Características Principales

1. **Notificaciones Emergentes Inteligentes**
   - **Aparición automática**: Las notificaciones aparecen inmediatamente en cualquier pantalla de la aplicación cuando se reporta un incidente
   - **Diseño atractivo**: Gradiente naranja con animaciones suaves (slideInDown/slideOutUp)
   - **Información completa**: Tipo de incidente, estación más cercana, descripción y timestamp
   - **Sonido de alerta**: Notificación sonora usando Web Audio API
   - **Auto-cierre**: Se cierran automáticamente después de 8 segundos
   - **Cierre manual**: Opción de cerrar manualmente con botón X

2. **Sistema de Cola de Notificaciones**
   - **Gestión inteligente**: Si llegan múltiples notificaciones simultáneamente, se muestran en secuencia
   - **Sin saturación**: Evita la superposición de notificaciones en pantalla
   - **Procesamiento ordenado**: Las notificaciones se procesan una por una con intervalos de tiempo

3. **Filtros de Notificaciones Personalizables**
   - **Respeto a preferencias**: Solo se muestran notificaciones que coinciden con los filtros configurados
   - **Filtros disponibles**:
     - **Por tipo de incidente**: Hurto, Hurto a mano armada, Cosquilleo, Ataque, etc.
     - **Por estación específica**: Selecciona estaciones de tu interés
     - **Por troncal**: Filtra por líneas específicas del sistema Transmilenio
   - **Comportamiento por defecto**: Si no hay filtros configurados, se muestran todas las notificaciones

4. **Campanita de Notificaciones Mejorada**
   - **Persistencia de 1 hora**: Las notificaciones se mantienen visibles durante exactamente 60 minutos
   - **Almacenamiento local**: Usa localStorage para mantener las notificaciones entre sesiones
   - **Limpieza automática**: Elimina automáticamente notificaciones de más de 1 hora cada 5 minutos
   - **Contador inteligente**: El badge muestra solo notificaciones filtradas y recientes
   - **Tiempo relativo**: Muestra "Hace 5 min", "Hace 2h", etc.

5. **Modal de Notificaciones Optimizado**
   - **Mejor centrado**: Ocupa 85% de la altura de pantalla con márgenes equilibrados
   - **Altura limitada**: No supera los menús superior e inferior de la aplicación
   - **Scroll inteligente**: Permite desplazamiento cuando hay muchas notificaciones
   - **Diseño responsive**: Se adapta perfectamente a cualquier tamaño de pantalla
   - **UI mejorada**: Mensaje descriptivo con iconos cuando no hay notificaciones

#### 🔧 Aspectos Técnicos

- **Socket.IO**: Comunicación en tiempo real entre servidor y clientes
- **WebSocket**: Conexiones persistentes para notificaciones instantáneas
- **Compatible con Railway**: Funciona perfectamente en el entorno de despliegue
- **Sin permisos requeridos**: No necesita permisos del navegador (notificaciones internas)
- **Arquitectura escalable**: Soporta múltiples usuarios simultáneos
- **Logging detallado**: Monitoreo completo para depuración y análisis

#### 📱 Cómo Usar las Notificaciones

1. **Configurar Preferencias**:
   - Ve a la campanita de notificaciones (🔔) en la barra superior
   - Haz clic en "Configurar notificaciones"
   - Selecciona los tipos de incidentes que te interesan
   - Elige las estaciones o troncales de tu preferencia
   - Guarda tus preferencias

2. **Recibir Notificaciones**:
   - Las notificaciones aparecerán automáticamente cuando alguien reporte un incidente
   - Solo verás notificaciones que coincidan con tus filtros configurados
   - Escucharás un sonido de alerta (si el audio está habilitado)
   - Puedes cerrar manualmente o esperar el auto-cierre

3. **Ver Historial**:
   - Haz clic en la campanita (🔔) para ver todas las notificaciones de la última hora
   - Las notificaciones se ordenan de más reciente a más antigua
   - El contador en la campanita muestra cuántas notificaciones tienes

#### 🛡️ Compatibilidad y Seguridad

- **Multiplataforma**: Funciona en escritorio, móvil y tablets
- **Navegadores soportados**: Chrome, Firefox, Safari, Edge
- **Sin datos sensibles**: Las notificaciones no exponen información personal
- **Filtrado seguro**: Solo usuarios autenticados reciben notificaciones
- **Rendimiento optimizado**: Uso eficiente de memoria y recursos

### Historial de Entrenamiento Expandible

La pantalla de predicciones ahora incluye una **sección expandible de Historial de Entrenamiento** que permite visualizar información detallada sobre el estado y rendimiento del modelo de inteligencia artificial.

#### ✨ Características Principales

1. **Sección Expandible Inteligente**
   - **Toggle animado**: Haz clic en el header para expandir/colapsar la sección
   - **Icono rotativo**: El icono de flecha rota suavemente para indicar el estado
   - **Carga dinámica**: Los datos se cargan solo cuando se expande la sección
   - **Estados visuales**: Indicadores claros de carga, éxito y error

2. **Información General del Modelo**
   - **Estado del modelo**: Muestra si el modelo está entrenado o no
   - **Última fecha de entrenamiento**: Fecha y hora del último entrenamiento completado
   - **Épocas completadas**: Número total de épocas de entrenamiento realizadas
   - **Badge de estado**: Indicador visual en el header (Entrenado/No entrenado)

3. **Métricas de Rendimiento**
   - **Precisión de entrenamiento**: Porcentaje de precisión alcanzado durante el entrenamiento
   - **Precisión de validación**: Precisión en el conjunto de validación
   - **Pérdida de entrenamiento**: Valor de la función de pérdida en entrenamiento
   - **Pérdida de validación**: Pérdida en el conjunto de validación

4. **Análisis de Aprendizaje**
   - **Tendencia de pérdida**: Análisis de cómo evolucionó la pérdida durante el entrenamiento
   - **Tendencia de precisión**: Evolución de la precisión a lo largo de las épocas
   - **Análisis de sobreajuste**: Evaluación automática de posibles problemas de overfitting
   - **Recomendaciones**: Sugerencias para mejorar el rendimiento del modelo

#### 🔧 Aspectos Técnicos

- **Carga asíncrona**: Los datos se obtienen del endpoint `/api/training-history` sin bloquear la UI
- **Manejo de errores**: Gestión robusta de errores de red y del servidor
- **Renderizado dinámico**: El contenido se genera dinámicamente según los datos disponibles
- **Diseño responsive**: Se adapta perfectamente a dispositivos móviles y escritorio
- **Compatibilidad total**: Funciona con la arquitectura actual y despliegue en Railway

#### 📊 Cómo Usar el Historial de Entrenamiento

1. **Acceder a la Sección**:
   - Ve a la pantalla de "Predicciones" desde el menú principal
   - Busca la sección "Historial de Entrenamiento" en la parte superior
   - Observa el badge de estado que indica si el modelo está entrenado

2. **Expandir y Ver Detalles**:
   - Haz clic en el header de "Historial de Entrenamiento"
   - La sección se expandirá con una animación suave
   - Los datos se cargarán automáticamente desde el servidor
   - Verás un indicador de carga mientras se obtienen los datos

3. **Interpretar la Información**:
   - **Información General**: Estado actual del modelo y fecha del último entrenamiento
   - **Métricas Finales**: Rendimiento numérico del modelo en entrenamiento y validación
   - **Resumen de Aprendizaje**: Análisis cualitativo del proceso de entrenamiento

4. **Estados Posibles**:
   - **Modelo no entrenado**: Se mostrará un mensaje indicando que no hay historial disponible
   - **Modelo entrenado**: Se mostrarán todas las métricas y análisis disponibles
   - **Error de carga**: Se mostrará un mensaje de error con detalles del problema

#### 🛡️ Beneficios para el Usuario

- **Transparencia**: Visibilidad completa del estado y rendimiento del modelo de IA
- **Confianza**: Información detallada sobre la calidad de las predicciones
- **Monitoreo**: Capacidad de verificar si el modelo necesita reentrenamiento
- **Educativo**: Comprensión de cómo funciona el sistema de predicciones
- **Toma de decisiones**: Información para evaluar la confiabilidad de las predicciones

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

### 4. Verificar el Sistema de Notificaciones en Tiempo Real

1. **Probar Notificaciones Emergentes**:
   - Reporta un incidente desde una sesión
   - Verifica que aparezca la notificación emergente en otras sesiones abiertas
   - Confirma que el sonido de alerta funciona correctamente
   - Valida que las animaciones de entrada y salida se ejecutan suavemente

2. **Probar Filtros de Notificaciones**:
   - Configura filtros específicos en "Configurar notificaciones"
   - Reporta incidentes que coincidan y no coincidan con los filtros
   - Confirma que solo se muestran las notificaciones filtradas
   - Verifica que el badge se actualiza correctamente

3. **Probar Persistencia de 1 Hora**:
   - Abre el modal de notificaciones (campanita)
   - Confirma que se muestran las notificaciones de la última hora
   - Navega a diferentes pantallas y verifica que las notificaciones persisten
   - Espera a que pasen 60 minutos y confirma la limpieza automática

4. **Probar Modal Mejorado**:
   - Abre el modal en diferentes tamaños de pantalla
   - Verifica el centrado y la altura limitada (85% de pantalla)
   - Agrega múltiples notificaciones y confirma el scroll interno
   - Valida que no interfiere con los menús superior e inferior

### 5. Verificar el Historial de Entrenamiento Expandible

1. **Probar Funcionalidad Básica**:
   - Ve a la pantalla de "Predicciones" desde el menú principal
   - Localiza la sección "Historial de Entrenamiento" en la parte superior
   - Verifica que el badge de estado muestre "Entrenado" o "No entrenado" correctamente
   - Haz clic en el header para expandir la sección

2. **Probar Animaciones y Estados**:
   - Confirma que el icono de flecha rota suavemente al expandir/colapsar
   - Verifica que aparece el indicador de carga mientras se obtienen los datos
   - Valida que la sección se expande con animación suave
   - Prueba expandir y colapsar varias veces para verificar la consistencia

3. **Probar Visualización de Datos**:
   - **Si el modelo está entrenado**: Verifica que se muestren todas las métricas
     - Información general (estado, fecha, épocas)
     - Métricas finales (precisión y pérdida de entrenamiento/validación)
     - Resumen de aprendizaje (tendencias y análisis de sobreajuste)
   - **Si el modelo no está entrenado**: Confirma que se muestra el mensaje apropiado

4. **Probar Manejo de Errores**:
   - Desconecta temporalmente la red y expande la sección
   - Verifica que se muestra un mensaje de error claro
   - Reconecta la red y confirma que se puede cargar correctamente

5. **Probar Responsive Design**:
   - Prueba la funcionalidad en diferentes tamaños de pantalla
   - Verifica que las tarjetas se reorganizan correctamente en móvil
   - Confirma que el texto y las métricas son legibles en todos los dispositivos

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

---

## 📅 Changelog - Nuevas Funcionalidades

### Versión 2.0 - Sistema de Notificaciones en Tiempo Real (Julio 2025)

#### ✨ Funcionalidades Añadidas

- **🚨 Notificaciones Emergentes en Tiempo Real**
  - Sistema completo de alertas emergentes que aparecen en cualquier pantalla
  - Animaciones CSS suaves (slideInDown/slideOutUp) para entrada y salida
  - Sonido de notificación usando Web Audio API
  - Auto-cierre después de 8 segundos con opción de cierre manual
  - Diseño visual atractivo con gradiente naranja y sombras

- **🔔 Sistema de Cola de Notificaciones**
  - Gestión inteligente de múltiples notificaciones simultáneas
  - Procesamiento secuencial para evitar saturación de pantalla
  - Control de intervalos de tiempo entre notificaciones

- **🎯 Filtros de Notificaciones Personalizables**
  - Filtrado por tipo de incidente (Hurto, Hurto a mano armada, Cosquilleo, etc.)
  - Filtrado por estaciones específicas de interés
  - Filtrado por troncales del sistema Transmilenio
  - Comportamiento inteligente: sin filtros = todas las notificaciones

- **⏰ Persistencia de Notificaciones (1 Hora)**
  - Almacenamiento en localStorage para mantener notificaciones entre sesiones
  - Limpieza automática de notificaciones antiguas cada 5 minutos
  - Visualización de tiempo relativo ("Hace 5 min", "Hace 2h")
  - Badge inteligente que muestra solo notificaciones filtradas y recientes

- **📱 Modal de Notificaciones Optimizado**
  - Mejor centrado en pantalla (85% altura máxima)
  - Altura limitada que no interfiere con menús superior/inferior
  - Scroll interno cuando hay muchas notificaciones
  - Diseño responsive para todos los tamaños de pantalla
  - UI mejorada con mensajes descriptivos cuando no hay notificaciones

- **📈 Historial de Entrenamiento Expandible**
  - Sección expandible en la pantalla de predicciones para visualizar el estado del modelo de IA
  - Toggle animado con icono rotativo para expandir/colapsar la sección
  - Carga dinámica de datos desde el endpoint `/api/training-history`
  - Visualización de métricas de rendimiento (precisión, pérdida, épocas)
  - Análisis automático de tendencias y detección de sobreajuste
  - Badge de estado en tiempo real (Entrenado/No entrenado)
  - Manejo completo de estados: carga, éxito, error, sin datos
  - Diseño responsive que se integra perfectamente con el estilo existente

#### 🔧 Mejoras Técnicas

- **Socket.IO**: Implementación completa para comunicación en tiempo real
- **WebSocket**: Conexiones persistentes para notificaciones instantáneas
- **Compatibilidad Railway**: Optimizado para el entorno de despliegue en la nube
- **Arquitectura escalable**: Soporte para múltiples usuarios simultáneos
- **Logging detallado**: Monitoreo completo para depuración y análisis
- **Rendimiento optimizado**: Uso eficiente de memoria y recursos del navegador

#### 🛡️ Seguridad y Compatibilidad

- **Autenticación**: Solo usuarios autenticados reciben notificaciones
- **Filtrado seguro**: Las notificaciones respetan las preferencias de privacidad
- **Multiplataforma**: Compatible con escritorio, móvil y tablets
- **Navegadores soportados**: Chrome, Firefox, Safari, Edge
- **Sin permisos requeridos**: No necesita permisos del navegador

#### 🐛 Problemas Corregidos

- **Persistencia**: Las notificaciones ya no desaparecen al navegar entre pantallas
- **Modal**: Centrado correcto y altura limitada en todos los dispositivos
- **Filtros**: Aplicación correcta de filtros tanto en emergentes como en campanita
- **Limpieza**: Eliminación automática y precisa de notificaciones antiguas
- **UI**: Mejor experiencia de usuario con animaciones y diseño mejorado

#### 📊 Impacto en el Usuario

- **Alertas inmediatas**: Los usuarios reciben notificaciones instantáneas sobre incidentes
- **Personalización**: Cada usuario puede configurar qué notificaciones recibir
- **Mejor UX**: Interfaz más intuitiva y responsive
- **Información completa**: Detalles completos de cada incidente en tiempo real
- **Accesibilidad**: Diseño accesible con sonidos y animaciones opcionales
- **Transparencia del modelo**: Los usuarios pueden ver el estado y rendimiento del modelo de IA
- **Confianza en las predicciones**: Acceso a métricas de precisión y análisis de calidad
- **Monitoreo inteligente**: Visualización de tendencias de aprendizaje y detección de problemas

---


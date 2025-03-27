"""
Script para entrenar el modelo de predicción de incidentes de Transmilenio.
Este script ejecuta el entrenamiento completo del modelo RNN-LSTM.
"""

import os
import sys
import logging
from dotenv import load_dotenv
from flask import Flask
from database import db, init_db
import ml_models
import json
from datetime import datetime

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f'training_log_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

# Crear una aplicación Flask mínima para acceder a la base de datos
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
init_db(app)

def ensure_model_directory():
    """Asegura que el directorio de modelos exista"""
    os.makedirs('models', exist_ok=True)
    logger.info("Directorio de modelos verificado")

def train_and_save_model():
    """Entrena el modelo RNN y guarda los resultados"""
    with app.app_context():
        logger.info("Iniciando entrenamiento del modelo RNN...")
        
        # Asegurar que el directorio de modelos exista
        ensure_model_directory()
        
        # Entrenar el modelo
        model, history = ml_models.train_rnn_model()
        
        if model is None:
            logger.error("El entrenamiento falló. No se pudo crear el modelo.")
            return False
        
        # Guardar el modelo entrenado
        try:
            model_path = 'models/rnn_model.h5'
            model.save(model_path)
            logger.info(f"Modelo guardado exitosamente en {model_path}")
            
            # Guardar métricas de entrenamiento
            if history:
                history_dict = {
                    'accuracy': [float(x) for x in history.history.get('accuracy', [])],
                    'val_accuracy': [float(x) for x in history.history.get('val_accuracy', [])],
                    'loss': [float(x) for x in history.history.get('loss', [])],
                    'val_loss': [float(x) for x in history.history.get('val_loss', [])],
                    'auc': [float(x) for x in history.history.get('auc', [])],
                    'val_auc': [float(x) for x in history.history.get('val_auc', [])]
                }
                
                with open('models/training_history.json', 'w') as f:
                    json.dump(history_dict, f, indent=2)
                logger.info("Historial de entrenamiento guardado")
            
            return True
        except Exception as e:
            logger.error(f"Error al guardar el modelo: {str(e)}")
            return False

def validate_model():
    """Realiza validación cruzada del modelo"""
    with app.app_context():
        logger.info("Iniciando validación cruzada del modelo...")
        metrics = ml_models.cross_validate_model(k_folds=5)
        
        if metrics:
            logger.info("Validación cruzada completada con éxito")
            logger.info(f"Precisión promedio: {metrics['accuracy']:.4f} ± {metrics['std_accuracy']:.4f}")
            logger.info(f"AUC promedio: {metrics['auc']:.4f} ± {metrics['std_auc']:.4f}")
            
            # Guardar métricas de validación
            with open('models/validation_metrics.json', 'w') as f:
                json.dump(metrics, f, indent=2)
            logger.info("Métricas de validación guardadas")
            
            return True
        else:
            logger.error("La validación cruzada falló")
            return False

def generate_new_predictions():
    """Genera nuevas predicciones usando el modelo entrenado"""
    with app.app_context():
        logger.info("Generando nuevas predicciones con el modelo entrenado...")
        predictions = ml_models.generate_prediction_cache(hours_ahead=48)
        
        if predictions:
            logger.info(f"Se generaron {len(predictions)} predicciones exitosamente")
            return True
        else:
            logger.error("No se pudieron generar predicciones")
            return False

if __name__ == "__main__":
    logger.info("=== INICIANDO PROCESO DE ENTRENAMIENTO DEL MODELO ===")
    
    # Paso 1: Entrenar y guardar el modelo
    if train_and_save_model():
        logger.info("✓ Entrenamiento completado exitosamente")
        
        # Paso 2: Validar el modelo
        if validate_model():
            logger.info("✓ Validación completada exitosamente")
        else:
            logger.warning("⚠ La validación no se completó correctamente")
        
        # Paso 3: Generar nuevas predicciones
        if generate_new_predictions():
            logger.info("✓ Nuevas predicciones generadas exitosamente")
        else:
            logger.warning("⚠ No se pudieron generar nuevas predicciones")
            
        logger.info("=== PROCESO DE ENTRENAMIENTO COMPLETADO ===")
    else:
        logger.error("✗ El entrenamiento del modelo falló")
        logger.info("=== PROCESO DE ENTRENAMIENTO INTERRUMPIDO ===")

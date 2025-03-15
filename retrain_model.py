import logging
from ml_models import train_rnn_model, get_model_insights
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score
import numpy as np
import tensorflow as tf
from datetime import datetime
import os
from app import app  # Importar la aplicación Flask

"""
Sistema de Reentrenamiento y Análisis del Modelo RNN
--------------------------------------------------

Este módulo maneja:
1. Reentrenamiento periódico del modelo RNN
2. Evaluación de rendimiento
3. Generación de métricas e insights
4. Logging detallado del proceso
"""

logging.basicConfig(level=logging.INFO)

def retrain_and_analyze():
    """
    Ejecuta el reentrenamiento del modelo RNN y analiza su rendimiento.

    Proceso:
    1. Reentrenamiento con datos actualizados
    2. Evaluación usando múltiples métricas
    3. Generación de reporte detallado
    4. Actualización de insights
    """
    try:
        logging.info("Iniciando proceso de reentrenamiento del modelo RNN...")

        # Usar el contexto de la aplicación Flask
        with app.app_context():
            # Entrenar modelo RNN
            model, history = train_rnn_model()

            if model is not None and history is not None:
                logging.info("Modelo RNN entrenado exitosamente")

                # Guardar modelo entrenado
                save_path = 'models/rnn_model.h5'
                model.save(save_path)
                logging.info(f"Modelo guardado en: {save_path}")

                # Registrar métricas de entrenamiento
                val_accuracy = history.history['val_accuracy'][-1]
                val_loss = history.history['val_loss'][-1]

                logging.info(f"Métricas finales - Accuracy: {val_accuracy:.4f}, Loss: {val_loss:.4f}")

                # Generar reporte detallado
                generate_training_report(history)

                return True
            else:
                logging.error("Error en el entrenamiento del modelo RNN")
                return False

    except Exception as e:
        logging.error(f"Error en retrain_and_analyze: {str(e)}")
        return False

def generate_training_report(history):
    """
    Genera un reporte detallado del entrenamiento.
    """
    try:
        report = {
            'timestamp': datetime.now().isoformat(),
            'metrics': {
                'accuracy': history.history['accuracy'][-1],
                'val_accuracy': history.history['val_accuracy'][-1],
                'loss': history.history['loss'][-1],
                'val_loss': history.history['val_loss'][-1]
            },
            'training_duration': len(history.history['loss']),
            'early_stopping': len(history.history['loss']) < 100
        }

        # Guardar reporte
        report_path = 'models/training_report.json'
        import json
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=4)

        logging.info(f"Reporte de entrenamiento guardado en: {report_path}")

    except Exception as e:
        logging.error(f"Error generando reporte de entrenamiento: {str(e)}")

if __name__ == "__main__":
    retrain_and_analyze()
web: gunicorn --worker-class geventwebsocket.gunicorn.workers.GeventWebSocketWorker -w 1 wsgi:application
scheduler: python scheduler.py

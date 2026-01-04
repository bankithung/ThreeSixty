"""
Development settings for ThreeSixty project.
"""
from .base import *

DEBUG = True

# Allow Android emulator to connect
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '10.0.2.2']

# Use SQLite for development if PostgreSQL is not available
DATABASES = {
    'default': env.db('DATABASE_URL', default='sqlite:///db.sqlite3')
}

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Use in-memory channel layer for development without Redis
if not env('REDIS_URL', default=''):
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# Disable Celery in development (run tasks synchronously)
CELERY_TASK_ALWAYS_EAGER = True

# CORS - Allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'a_very_secret_key_for_development'
    # PostgreSQL Database URI from Supabase (Transaction Pooler - IPv4 Compatible)
    SQLALCHEMY_DATABASE_URI = "postgresql://postgres.gdwoqyzedxtsslpmfejq:DPL0TRRUvsBQdgoD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

# ImageKit config for use in scripts and app
IMAGEKIT_PRIVATE_KEY = os.environ.get('IMAGEKIT_PRIVATE_KEY', 'private_b953hw9eCHADGYq/Zdot6xBu7os=')
IMAGEKIT_URL_ENDPOINT = os.environ.get('IMAGEKIT_URL_ENDPOINT', 'https://ik.imagekit.io/qyexvdakm/')
IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload' 
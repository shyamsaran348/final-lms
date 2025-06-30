from app import app, db
from sqlalchemy import text

# SQLite syntax for adding a column if it does not exist
with app.app_context():
    try:
        db.session.execute(text('ALTER TABLE course ADD COLUMN image_data BYTEA'))
        db.session.commit()
        print('Added image_data column to course table.')
    except Exception as e:
        if 'duplicate column name' in str(e).lower():
            print('image_data column already exists.')
        else:
            print('Error adding image_data column:', e) 
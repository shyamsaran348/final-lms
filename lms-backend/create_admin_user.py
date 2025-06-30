from app import app, db, User, bcrypt

with app.app_context():
    admin_user = User(
        username='Shyam Saran',
        email='shyamsaran348@gmail.com',
        role='admin'
    )
    admin_user.set_password('Admin@1234')
    
    # Check if user already exists
    existing_user = User.query.filter_by(email='shyamsaran348@gmail.com').first()
    if not existing_user:
        db.session.add(admin_user)
        db.session.commit()
        print('Admin user created successfully!')
        print('Email: shyamsaran348@gmail.com')
        print('Password: Admin@1234')
        print('Role: admin')
    else:
        print('Admin user already exists!') 
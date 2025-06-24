from flask import Flask, request, jsonify, send_from_directory, render_template, redirect, url_for, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from config import Config
from functools import wraps
import os
from werkzeug.utils import secure_filename
from datetime import datetime

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, supports_credentials=True, allow_headers=["Content-Type", "X-User-Email", "X-User-Role"])

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'course_files')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    role = db.Column(db.String(20), nullable=False, default='student')

    def __repr__(self):
        return f'<User {self.username}>'

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    author = db.Column(db.String(120), nullable=False)
    image = db.Column(db.String(255), nullable=True)
    button_type = db.Column(db.String(20), nullable=False)
    button_label = db.Column(db.String(100), nullable=False)
    detail_page = db.Column(db.String(255), nullable=True)
    youtube_url = db.Column(db.String(255), nullable=True)
    modules = db.relationship('Module', backref='course', cascade='all, delete-orphan', lazy=True)

    def __repr__(self):
        return f'<Course {self.title}>'

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'author': self.author,
            'image': self.image,
            'detailPage': self.detail_page,
            'youtube_url': self.youtube_url,
            'modules': [module.to_dict() for module in self.modules]
        }

# New model for per-student course assignment
class StudentCourse(db.Model):
    __tablename__ = 'student_courses'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id', ondelete='CASCADE'), nullable=False)
    __table_args__ = (db.UniqueConstraint('user_id', 'course_id', name='_user_course_uc'),)

class CourseFile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id', ondelete='CASCADE'), nullable=True)
    module_id = db.Column(db.Integer, db.ForeignKey('module.id', ondelete='CASCADE'), nullable=True)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(255), nullable=False)
    uploaded_by = db.Column(db.String(120), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'filepath': self.filepath,
            'uploaded_by': self.uploaded_by,
            'upload_date': self.upload_date.strftime('%Y-%m-%d %H:%M'),
            'module_id': self.module_id,
            'course_id': self.course_id
        }

# New model for per-instructor course assignment
class InstructorCourse(db.Model):
    __tablename__ = 'instructor_courses'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id', ondelete='CASCADE'), nullable=False)
    __table_args__ = (db.UniqueConstraint('user_id', 'course_id', name='_instructor_course_uc'),)

# New model for Announcements
class Announcement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    author = db.relationship('User', backref='announcements')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'author': self.author.username if self.author else 'Unknown',
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M')
        }

# Simple admin check decorator using a custom header (for demo; use JWT in production)
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # In production, use JWT or session auth. Here, check for X-User-Role header == 'admin'.
        if request.headers.get('X-User-Role') != 'admin':
            return jsonify({'message': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

# Helper to get current user from email in headers (simulate auth)
def get_current_user():
    email = request.headers.get('X-User-Email')
    print(f"[DEBUG] X-User-Email header: {email}")
    if not email:
        print("[DEBUG] No email header provided.")
        return None
    user = User.query.filter_by(email=email).first()
    print(f"[DEBUG] User found: {user}")
    return user

# API Routes
@app.route('/api/courses', methods=['GET'])
def get_courses():
    user = get_current_user()
    all_courses = Course.query.all()
    if not user or user.role == 'admin':
        print("[DEBUG] No user or admin detected. Returning all courses unlocked.")
        return jsonify([dict(course.to_dict(), locked=False) for course in all_courses])
    elif user.role == 'instructor':
        print(f"[DEBUG] Instructor user.id: {user.id}, user.email: {user.email}")
        assigned_ids = set(ic.course_id for ic in InstructorCourse.query.filter_by(user_id=user.id).all())
        print(f"[DEBUG] Assigned course IDs for instructor {user.email}: {assigned_ids}")
        result = []
        for course in all_courses:
            if course.id in assigned_ids:
                course_dict = course.to_dict()
                course_dict['locked'] = False
                result.append(course_dict)
        return jsonify(result if isinstance(result, list) else [result])
    # Student: only assigned courses unlocked
    assigned_ids = set(sc.course_id for sc in StudentCourse.query.filter_by(user_id=user.id).all())
    print(f"[DEBUG] Assigned course IDs for user {user.email}: {assigned_ids}")
    result = []
    for course in all_courses:
        course_dict = course.to_dict()
        course_dict['locked'] = course.id not in assigned_ids
        result.append(course_dict)
    return jsonify(result if isinstance(result, list) else [result])

@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'student')  # Default to student if not provided

    if not username or not email or not password:
        return jsonify({'message': 'Missing username, email, or password'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 409
    
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already exists'}), 409

    new_user = User(username=username, email=email, role=role)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Missing email or password'}), 400

    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        # In a real app, you would generate a JWT. For this demo, we'll return a dummy token.
        # The frontend will then send this back in headers for authenticated requests.
        dummy_token = "fake-jwt-token" 
        return jsonify({
            'message': 'Login successful', 
            'username': user.username, 
            'role': user.role,
            'token': dummy_token  # Add token to the response
        }), 200
    else:
        return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/profile', methods=['GET'])
def get_profile():
    user = get_current_user()
    if not user:
        return jsonify({'message': 'User not found or not logged in'}), 404
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role
    })

@app.route('/api/profile', methods=['PUT'])
def update_profile():
    user = get_current_user()
    if not user:
        return jsonify({'message': 'User not found or not logged in'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided'}), 400

    # Update username if provided
    if 'username' in data:
        user.username = data['username']

    # Update email if provided, checking for uniqueness
    if 'email' in data and data['email'] != user.email:
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'message': 'Email already in use'}), 409
        user.email = data['email']

    # Update password if provided
    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()
    return jsonify({'message': 'Profile updated successfully'})

@app.route('/api/users', methods=['GET'])
@admin_required
def get_users():
    users = User.query.all()
    return jsonify([
        {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role
        } for user in users
    ])

@app.route('/api/users/<int:user_id>/role', methods=['POST'])
@admin_required
def change_user_role(user_id):
    data = request.get_json()
    new_role = data.get('role')
    if new_role not in ['student', 'instructor', 'admin']:
        return jsonify({'message': 'Invalid role'}), 400
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    user.role = new_role
    db.session.commit()
    return jsonify({'message': f'Role updated to {new_role} for user {user.username}'}), 200

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': f'User {user.username} deleted successfully'}), 200

@app.route('/api/courses', methods=['POST'])
@admin_required
def create_course():
    data = request.get_json()
    required_fields = ['title', 'author', 'image', 'button_type', 'button_label']
    
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Missing required field: {field}'}), 400
    
    new_course = Course(**data)
    db.session.add(new_course)
    db.session.commit()
    return jsonify({'message': 'Course created successfully', 'course': new_course.to_dict()}), 201

@app.route('/api/courses/<int:course_id>', methods=['PUT'])
@admin_required
def update_course(course_id):
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404
    
    data = request.get_json()
    for field, value in data.items():
        if hasattr(course, field):
            setattr(course, field, value)
    
    db.session.commit()
    return jsonify({'message': 'Course updated successfully', 'course': course.to_dict()}), 200

@app.route('/api/courses/<int:course_id>', methods=['DELETE'])
@admin_required
def delete_course(course_id):
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404
    
    db.session.delete(course)
    db.session.commit()
    return jsonify({'message': f'Course "{course.title}" deleted successfully'}), 200

@app.route('/api/admin/dashboard', methods=['GET'])
@admin_required
def admin_dashboard():
    total_users = User.query.count()
    total_courses = Course.query.count()
    students = User.query.filter_by(role='student').count()
    instructors = User.query.filter_by(role='instructor').count()
    admins = User.query.filter_by(role='admin').count()
    
    return jsonify({
        'total_users': total_users,
        'total_courses': total_courses,
        'students': students,
        'instructors': instructors,
        'admins': admins,
        'courses': [course.to_dict() for course in Course.query.all()]
    })

# Admin: List courses assigned to a user
@app.route('/api/users/<int:user_id>/courses', methods=['GET'])
@admin_required
def get_user_courses(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    assigned = StudentCourse.query.filter_by(user_id=user_id).all()
    course_ids = [sc.course_id for sc in assigned]
    return jsonify({'course_ids': course_ids})

# Admin: Assign a course to a user
@app.route('/api/users/<int:user_id>/courses', methods=['POST'])
@admin_required
def assign_course_to_user(user_id):
    data = request.get_json()
    course_id = data.get('course_id')
    if not course_id:
        return jsonify({'message': 'Missing course_id'}), 400
    if not User.query.get(user_id) or not Course.query.get(course_id):
        return jsonify({'message': 'User or course not found'}), 404
    if StudentCourse.query.filter_by(user_id=user_id, course_id=course_id).first():
        return jsonify({'message': 'Course already assigned'}), 409
    sc = StudentCourse(user_id=user_id, course_id=course_id)
    db.session.add(sc)
    db.session.commit()
    return jsonify({'message': 'Course assigned'}), 201

# Admin: Unassign a course from a user
@app.route('/api/users/<int:user_id>/courses/<int:course_id>', methods=['DELETE'])
@admin_required
def unassign_course_from_user(user_id, course_id):
    sc = StudentCourse.query.filter_by(user_id=user_id, course_id=course_id).first()
    if not sc:
        return jsonify({'message': 'Assignment not found'}), 404
    db.session.delete(sc)
    db.session.commit()
    return jsonify({'message': 'Course unassigned'}), 200

# --- File Upload Endpoint (Instructor/Admin only) ---
def instructor_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user or user.role not in ['admin', 'instructor']:
            return jsonify({'message': 'Instructor or admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

@app.route('/api/courses/<int:course_id>/files', methods=['POST'])
@instructor_required
def upload_course_file(course_id):
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
    filename = secure_filename(file.filename)
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(save_path)
    user = get_current_user()
    course_file = CourseFile(course_id=course_id, filename=filename, filepath=save_path, uploaded_by=user.email)
    db.session.add(course_file)
    db.session.commit()
    return jsonify({'message': 'File uploaded', 'file': course_file.to_dict()}), 201

# --- List Files for a Course (students with access) ---
@app.route('/api/courses/<int:course_id>/files', methods=['GET'])
def list_course_files(course_id):
    user = get_current_user()
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404
    if user.role in ['admin', 'instructor']:
        files = CourseFile.query.filter_by(course_id=course_id).all()
    else:
        # Only students with access
        assigned = StudentCourse.query.filter_by(user_id=user.id, course_id=course_id).first()
        if not assigned:
            return jsonify({'message': 'Access denied'}), 403
        files = CourseFile.query.filter_by(course_id=course_id).all()
    return jsonify([f.to_dict() for f in files])

# --- Download File (students with access) ---
@app.route('/api/files/<int:file_id>', methods=['GET'])
def download_course_file(file_id):
    user = get_current_user()
    if not user:
        return jsonify({'message': 'Authentication required'}), 401
    course_file = CourseFile.query.get(file_id)
    if not course_file:
        return jsonify({'message': 'File not found'}), 404
    print('Serving file:', course_file.filepath)  # Debug print
    # Check access for course or module file
    course_id = course_file.course_id
    module_id = course_file.module_id
    if user.role in ['admin', 'instructor']:
        pass
    else:
        if module_id:
            module = Module.query.get(module_id)
            if not module:
                return jsonify({'message': 'Module not found'}), 404
            assigned = StudentCourse.query.filter_by(user_id=user.id, course_id=module.course_id).first()
            if not assigned:
                return jsonify({'message': 'Access denied'}), 403
        elif course_id:
            assigned = StudentCourse.query.filter_by(user_id=user.id, course_id=course_id).first()
            if not assigned:
                return jsonify({'message': 'Access denied'}), 403
    return send_file(course_file.filepath, as_attachment=True, download_name=course_file.filename)

@app.route('/api/files/<int:file_id>', methods=['DELETE'])
@instructor_required
def delete_course_file(file_id):
    course_file = CourseFile.query.get(file_id)
    if not course_file:
        return jsonify({'message': 'File not found'}), 404
    # Remove file from disk
    try:
        if os.path.exists(course_file.filepath):
            os.remove(course_file.filepath)
    except Exception as e:
        print(f"[ERROR] Could not delete file from disk: {e}")
    db.session.delete(course_file)
    db.session.commit()
    return jsonify({'message': 'File deleted'}), 200

@app.route('/api/courses/<int:course_id>', methods=['GET'])
def get_course(course_id):
    user = get_current_user()
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404
    course_data = course.to_dict()
    # Find assigned instructor (first one, if multiple)
    instructor_link = InstructorCourse.query.filter_by(course_id=course_id).first()
    if instructor_link:
        instructor = User.query.get(instructor_link.user_id)
        instructor_name = instructor.username if instructor else 'Unassigned'
    else:
        instructor_name = 'Unassigned'
    # Add demo fields for UI, but use real instructor_name
    course_data.update({
        'category': 'AI',
        'level': 'Beginner',
        'language': 'English',
        'instructor_name': instructor_name,
        'instructor_photo': '/images/a2000-logo.png',
        'instructor_bio': 'AI researcher and educator with 10+ years of experience in machine learning and data science.',
        'progress': 40  # percent, for demo
    })
    return jsonify(course_data)

# --- Admin: List courses assigned to an instructor ---
@app.route('/api/instructors/<int:user_id>/courses', methods=['GET'])
@admin_required
def get_instructor_courses(user_id):
    user = User.query.get(user_id)
    if not user or user.role != 'instructor':
        return jsonify({'message': 'Instructor not found'}), 404
    assigned = InstructorCourse.query.filter_by(user_id=user_id).all()
    course_ids = [ic.course_id for ic in assigned]
    return jsonify({'course_ids': course_ids})

# --- Admin: Assign a course to an instructor ---
@app.route('/api/instructors/<int:user_id>/courses', methods=['POST'])
@admin_required
def assign_course_to_instructor(user_id):
    data = request.get_json()
    course_id = data.get('course_id')
    if not course_id:
        return jsonify({'message': 'Missing course_id'}), 400
    user = User.query.get(user_id)
    if not user or user.role != 'instructor' or not Course.query.get(course_id):
        return jsonify({'message': 'Instructor or course not found'}), 404
    if InstructorCourse.query.filter_by(user_id=user_id, course_id=course_id).first():
        return jsonify({'message': 'Course already assigned'}), 409
    ic = InstructorCourse(user_id=user_id, course_id=course_id)
    db.session.add(ic)
    db.session.commit()
    return jsonify({'message': 'Course assigned to instructor'}), 201

# --- Admin: Unassign a course from an instructor ---
@app.route('/api/instructors/<int:user_id>/courses/<int:course_id>', methods=['DELETE'])
@admin_required
def unassign_course_from_instructor(user_id, course_id):
    ic = InstructorCourse.query.filter_by(user_id=user_id, course_id=course_id).first()
    if not ic:
        return jsonify({'message': 'Assignment not found'}), 404
    db.session.delete(ic)
    db.session.commit()
    return jsonify({'message': 'Course unassigned from instructor'}), 200

# --- New Models for Course Structure ---
class Module(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    order = db.Column(db.Integer, nullable=False, default=0)
    release_date = db.Column(db.DateTime, nullable=True)
    # Relationship to lessons
    lessons = db.relationship('Lesson', backref='module', cascade='all, delete-orphan', lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'order': self.order,
            'release_date': self.release_date.strftime('%Y-%m-%d %H:%M') if self.release_date else None,
            'lessons': [lesson.to_dict() for lesson in self.lessons]
        }

class Lesson(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    module_id = db.Column(db.Integer, db.ForeignKey('module.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content_type = db.Column(db.String(50), nullable=False)  # 'text', 'video', 'pdf', etc.
    content = db.Column(db.Text, nullable=True)  # URL, text, etc.
    order = db.Column(db.Integer, nullable=False, default=0)
    release_date = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content_type': self.content_type,
            'content': self.content,
            'order': self.order,
            'release_date': self.release_date.strftime('%Y-%m-%d %H:%M') if self.release_date else None
        }

# --- Module Endpoints ---
@app.route('/api/courses/<int:course_id>/modules', methods=['POST'])
@instructor_required
def create_module(course_id):
    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    order = data.get('order', 0)
    release_date = data.get('release_date')
    if not title:
        return jsonify({'message': 'Missing module title'}), 400
    module = Module(
        course_id=course_id,
        title=title,
        description=description,
        order=order,
        release_date=datetime.strptime(release_date, '%Y-%m-%d %H:%M') if release_date else None
    )
    db.session.add(module)
    db.session.commit()
    return jsonify({'message': 'Module created', 'module': module.to_dict()}), 201

@app.route('/api/courses/<int:course_id>/modules', methods=['GET'])
def get_modules(course_id):
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404
    modules = Module.query.filter_by(course_id=course_id).order_by(Module.order).all()
    return jsonify([m.to_dict() for m in modules])

@app.route('/api/modules/<int:module_id>', methods=['PUT'])
@instructor_required
def update_module(module_id):
    module = Module.query.get(module_id)
    if not module:
        return jsonify({'message': 'Module not found'}), 404
    data = request.get_json()
    module.title = data.get('title', module.title)
    module.description = data.get('description', module.description)
    module.order = data.get('order', module.order)
    release_date = data.get('release_date')
    if release_date:
        module.release_date = datetime.strptime(release_date, '%Y-%m-%d %H:%M')
    db.session.commit()
    return jsonify({'message': 'Module updated', 'module': module.to_dict()})

@app.route('/api/modules/<int:module_id>', methods=['DELETE'])
@instructor_required
def delete_module(module_id):
    module = Module.query.get(module_id)
    if not module:
        return jsonify({'message': 'Module not found'}), 404
    db.session.delete(module)
    db.session.commit()
    return jsonify({'message': 'Module deleted'})

# --- Lesson Endpoints ---
@app.route('/api/modules/<int:module_id>/lessons', methods=['POST'])
@instructor_required
def create_lesson(module_id):
    data = request.get_json()
    title = data.get('title')
    content_type = data.get('content_type')
    content = data.get('content')
    order = data.get('order', 0)
    release_date = data.get('release_date')
    if not title or not content_type:
        return jsonify({'message': 'Missing lesson title or content_type'}), 400
    lesson = Lesson(
        module_id=module_id,
        title=title,
        content_type=content_type,
        content=content,
        order=order,
        release_date=datetime.strptime(release_date, '%Y-%m-%d %H:%M') if release_date else None
    )
    db.session.add(lesson)
    db.session.commit()
    return jsonify({'message': 'Lesson created', 'lesson': lesson.to_dict()}), 201

@app.route('/api/modules/<int:module_id>/lessons', methods=['GET'])
def get_lessons(module_id):
    module = Module.query.get(module_id)
    if not module:
        return jsonify({'message': 'Module not found'}), 404
    user = get_current_user()
    now = datetime.utcnow()
    lessons = Lesson.query.filter_by(module_id=module_id).order_by(Lesson.order).all()
    # Students only see released lessons
    if user and user.role == 'student':
        lessons = [l for l in lessons if not l.release_date or l.release_date <= now]
    return jsonify([l.to_dict() for l in lessons])

@app.route('/api/lessons/<int:lesson_id>', methods=['PUT'])
@instructor_required
def update_lesson(lesson_id):
    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return jsonify({'message': 'Lesson not found'}), 404
    data = request.get_json()
    lesson.title = data.get('title', lesson.title)
    lesson.content_type = data.get('content_type', lesson.content_type)
    lesson.content = data.get('content', lesson.content)
    lesson.order = data.get('order', lesson.order)
    release_date = data.get('release_date')
    if release_date:
        lesson.release_date = datetime.strptime(release_date, '%Y-%m-%d %H:%M')
    db.session.commit()
    return jsonify({'message': 'Lesson updated', 'lesson': lesson.to_dict()})

@app.route('/api/lessons/<int:lesson_id>', methods=['DELETE'])
@instructor_required
def delete_lesson(lesson_id):
    lesson = Lesson.query.get(lesson_id)
    if not lesson:
        return jsonify({'message': 'Lesson not found'}), 404
    db.session.delete(lesson)
    db.session.commit()
    return jsonify({'message': 'Lesson deleted'})

# --- File Upload Endpoint for Module (Instructor/Admin only) ---
@app.route('/api/modules/<int:module_id>/files', methods=['POST'])
@instructor_required
def upload_module_file(module_id):
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
    filename = secure_filename(file.filename)
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(save_path)
    user = get_current_user()
    module = Module.query.get(module_id)
    if not module:
        return jsonify({'message': 'Module not found'}), 404
    course_file = CourseFile(course_id=module.course_id, module_id=module_id, filename=filename, filepath=save_path, uploaded_by=user.email)
    db.session.add(course_file)
    db.session.commit()
    return jsonify({'message': 'File uploaded', 'file': course_file.to_dict()}), 201

# --- List Files for a Module ---
@app.route('/api/modules/<int:module_id>/files', methods=['GET'])
def list_module_files(module_id):
    user_email = request.headers.get('X-User-Email')
    user = User.query.filter_by(email=user_email).first() if user_email else None
    if not user:
        return jsonify({'message': 'Unauthorized: user not found'}), 401
    module = Module.query.get(module_id)
    if not module:
        return jsonify({'message': 'Module not found'}), 404
    if user.role in ['admin', 'instructor']:
        files = CourseFile.query.filter_by(module_id=module_id).all()
    else:
        assigned = StudentCourse.query.filter_by(user_id=user.id, course_id=module.course_id).first()
        if not assigned:
            return jsonify({'message': 'Access denied'}), 403
        files = CourseFile.query.filter_by(module_id=module_id).all()
    return jsonify([f.to_dict() for f in files])

# --- NOTE: Database Migration Required ---
# You must run a migration to add description (TEXT) and release_date (TIMESTAMP) to the module table:
# Example (with Flask-Migrate):
#   flask db migrate -m "Add description and release_date to module"
#   flask db upgrade
# Or manually (PostgreSQL):
#   ALTER TABLE module ADD COLUMN IF NOT EXISTS description TEXT;
#   ALTER TABLE module ADD COLUMN IF NOT EXISTS release_date TIMESTAMP;

@app.route('/course-detail')
def course_detail_route():
    course_id = request.args.get('course_id')
    if not course_id:
        return redirect(url_for('courses'))  # Assumes you have a 'courses' route for the course list
    return render_template('course-detail.html')

# Announcement Routes
@app.route('/api/announcements', methods=['POST'])
@admin_required
def create_announcement():
    data = request.get_json()
    user = get_current_user()

    if not user:
        return jsonify({'message': 'Admin user not found'}), 401

    if not data or not data.get('title') or not data.get('content'):
        return jsonify({'message': 'Title and content are required'}), 400
    
    new_announcement = Announcement(
        title=data['title'], 
        content=data['content'],
        author_id=user.id
    )
    db.session.add(new_announcement)
    db.session.commit()
    
    return jsonify({'message': 'Announcement created successfully', 'announcement': new_announcement.to_dict()}), 201

@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    announcements = Announcement.query.order_by(Announcement.created_at.desc()).all()
    return jsonify([ann.to_dict() for ann in announcements])

@app.route('/api/announcements/<int:announcement_id>', methods=['DELETE'])
@admin_required
def delete_announcement(announcement_id):
    announcement = Announcement.query.get_or_404(announcement_id)
    db.session.delete(announcement)
    db.session.commit()
    return jsonify({'message': 'Announcement deleted successfully'})

@app.route('/api/courses/<int:course_id>/youtube', methods=['PUT'])
def update_course_youtube(course_id):
    user = get_current_user()
    if not user or user.role not in ['admin', 'instructor']:
        return jsonify({'message': 'Admin or instructor access required'}), 403
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'message': 'Course not found'}), 404
    data = request.get_json()
    youtube_url = data.get('youtube_url')
    # Accept empty string or null to clear the link
    if youtube_url is None or youtube_url.strip() == '':
        course.youtube_url = None
    else:
        course.youtube_url = youtube_url
    db.session.commit()
    return jsonify(course.to_dict()), 200

if __name__ == "__main__":
    app.run(port=5001, debug=True) 
from app import app, db, Course
import os

def load_image_data(image_path):
    try:
        with open(image_path, 'rb') as f:
            return f.read()
    except Exception as e:
        print(f"Warning: Could not load image {image_path}: {e}")
        return None

courses = [
    {
        'title': 'Artificial Intelligence Foundations',
        'author': 'A2000 Solutions',
        'image': 'course-recommendations/images/ai-foundations.jpg',
        'button_type': 'learn',
        'button_label': 'Learn Artificial Intelligence Foundations',
        'detail_page': 'course-detail.html'
    },
    {
        'title': 'Enterprise Resource Planning Essentials',
        'author': 'A2000 Solutions',
        'image': 'course-recommendations/images/erp-essentials.jpg',
        'button_type': 'learn',
        'button_label': 'Learn Enterprise Resource Planning Essentials',
        'detail_page': 'course-detail.html'
    },
    {
        'title': 'Cyber Security & Ethical Hacking',
        'author': 'A2000 Solutions',
        'image': 'course-recommendations/images/cyber-security.jpg',
        'button_type': 'register',
        'button_label': 'Register for Cyber Security & Ethical Hacking',
        'detail_page': 'course-detail.html'
    },
    {
        'title': 'Internet of Things - From Basics to Projects',
        'author': 'A2000 Solutions',
        'image': 'course-recommendations/images/iot-basics.jpg',
        'button_type': 'register',
        'button_label': 'Register for Internet of Things - From Basics to Projects',
        'detail_page': 'course-detail.html'
    },
    {
        'title': 'Electric Vehicle Technology & Innovation',
        'author': 'A2000 Solutions',
        'image': 'course-recommendations/images/ev-technology.jpg',
        'button_type': 'register',
        'button_label': 'Register for Electric Vehicle Technology & Innovation',
        'detail_page': 'course-detail.html'
    },
    {
        'title': 'Drone Technology - Aerial Systems Explained',
        'author': 'A2000 Solutions',
        'image': 'course-recommendations/images/drone-technology.jpg',
        'button_type': 'register',
        'button_label': 'Register for Drone Technology - Aerial Systems Explained',
        'detail_page': 'course-detail.html'
    }
]

with app.app_context():
    for course_data in courses:
        image_data = load_image_data(course_data['image'])
        course = Course.query.filter_by(title=course_data['title']).first()
        if not course:
            course = Course(**course_data, image_data=image_data)
            db.session.add(course)
            print(f"Added course: {course.title}")
        else:
            course.image_data = image_data
            print(f"Updated image for course: {course.title}")
    db.session.commit()
    print("Seeding complete.") 
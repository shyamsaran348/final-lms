# A2000 LMS (Learning Management System)

A modern, full-featured Learning Management System for course management, student progress tracking, and admin/instructor workflows. Built with a Flask backend and a responsive, interactive frontend.

---

## 🚀 Features
- **User Roles:** Admin, Instructor, Student
- **Course Management:** Create, edit, and delete courses and modules
- **Module & File Management:** Upload/download/delete files per module
- **Dynamic Course Details:** Pixel-perfect, interactive course details page
- **Admin Dashboard:** User, course, and announcement management
- **Profile Management:** Edit user profile and password
- **Authentication:** Login, registration, and role-based access
- **Responsive UI:** Modern, mobile-friendly design
- **YouTube Video Integration:** Add and display course intro videos
- **Announcements:** Post and view course-wide announcements

---

## 🛠️ Tech Stack
- **Backend:** Python, Flask, Flask-SQLAlchemy, Flask-CORS
- **Frontend:** HTML5, CSS3 (custom + Tailwind utility classes), JavaScript (ES6)
- **Database:** SQLite (default, easy to swap for PostgreSQL/MySQL)
- **Other:** Git, GitHub, RESTful API, Jinja2 (for backend templates)

---

## 📁 Directory Structure
```
final-main-2/
├── course-recommendations/   # Main frontend app (HTML, CSS, JS, images)
├── lms-backend/              # Flask backend (API, DB, static, templates)
├── images/                   # Shared images
├── js/                       # Shared JS (if any)
├── css/                      # Shared CSS (if any)
├── login.html, register.html, profile.html, ...
├── README.md                 # This file
├── requirements.txt          # Python dependencies
└── ...
```

---

## ⚙️ Setup Instructions

### 1. Clone the repository
```sh
git clone https://github.com/shyamisai/final-lms.git
cd final-lms
```

### 2. Python Environment & Dependencies
- Ensure you have Python 3.8+
- (Recommended) Create a virtual environment:
  ```sh
  python -m venv venv
  source venv/bin/activate  # On Windows: venv\Scripts\activate
  ```
- Install dependencies:
  ```sh
  pip install -r requirements.txt
  ```

### 3. Database Setup
- By default, uses SQLite. The DB will be created automatically on first run.
- To reset or seed the DB, use scripts in `lms-backend/` (e.g., `reset_db.py`).

### 4. Running the Backend (Flask API)
```sh
cd lms-backend
python app.py
```
- The API will run at `http://localhost:5001/`

### 5. Running the Frontend (Static Server)
- From the project root, run:
  ```sh
  python -m http.server 5500
  ```
- Open `http://localhost:5500/course-recommendations/index.html` in your browser.
- All static assets and absolute paths will work from the project root.

---

## 📝 Usage Notes
- **Admin/Instructor:** Can add/delete modules, upload files, manage users/courses.
- **Students:** Can view courses, download resources, track progress.
- **Profile:** Edit your username, email, and password from the profile page.
- **Navigation:** Use the top nav bar for Courses, About, Profile, and Back to Courses.
- **File Uploads:** Max file size 50MB. Only allowed file types are accepted.
- **YouTube Video:** Admins/instructors can add a YouTube link for each course.

---

## 🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License
This project is licensed under the MIT License.

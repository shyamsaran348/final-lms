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
├── run_all.sh                # Script to run backend & frontend together
├── venv/                     # Python virtual environment (optional)
├── login.html, register.html, profile.html, ...
├── README.md                 # This file
├── requirements.txt          # Python dependencies
└── ...
```

---

## ⚡ Quick Start (Recommended)

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

### 3. Run the Project (Backend & Frontend)
- Make the script executable (first time only):
  ```sh
  chmod +x run_all.sh
  ```
- Start both servers:
  ```sh
  ./run_all.sh
  ```
- The backend (Flask API) will run at:  
  `http://localhost:5001/`
- The frontend (static server) will run at:  
  `http://localhost:5500/course-recommendations/index.html`

#### To stop both servers
- Press `Ctrl+C` in the terminal running the script.

---

## 📝 Usage Notes
- **Admin/Instructor:** Can add/delete modules, upload files, manage users/courses.
- **Students:** Can view courses, download resources, track progress.
- **Profile:** Edit your username, email, and password from the profile page.
- **Navigation:** Use the top nav bar for Courses, About, Profile, and Back to Courses.
- **File Uploads:** Max file size 50MB. Only allowed file types are accepted.
- **YouTube Video:** Admins/instructors can add a YouTube link for each course.

---

## 🛠️ Troubleshooting
- **Port in use?** If you see an error about port 5001 or 5500, make sure no other process is using those ports, or change the port in the script and in your code as needed.
- **404 errors for static files?** Make sure you open the frontend at the correct URL:  
  `http://localhost:5500/course-recommendations/index.html`
- **Virtual environment not found?** The script will still run, but it's recommended to use a virtual environment for Python dependencies.
- **Database issues?** The SQLite DB is created automatically. To reset, use scripts in `lms-backend/` (e.g., `reset_db.py`).

---

## 🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License
This project is licensed under the MIT License.

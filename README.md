# A2000 LMS Project

## Overview
A2000 LMS is a modern, full-stack Learning Management System for educational institutions and training organizations. It allows admins and instructors to manage courses, modules, assignments, and files, while students can enroll, access content, and submit assignments. The system features a Flask backend and a modern, responsive frontend.

---

## Architecture
- **Backend:** Flask (Python), SQLAlchemy ORM, RESTful API, PostgreSQL/SQLite
- **Frontend:** HTML, CSS (custom, modern styles), Vanilla JavaScript
- **Static Assets:** Images, course files, and user-uploaded files are stored locally
- **Authentication:** Header-based (X-User-Email, X-User-Role), with localStorage on frontend

---

## User Roles
- **Admin:** Full access to all features, can manage users, courses, modules, assignments, and files
- **Instructor:** Can manage their own courses, modules, assignments, and files
- **Student:** Can enroll in courses, view modules, download files, and submit assignments

---

## Features
- **Authentication & Authorization:** Secure login/register, role-based access
- **Course Management:** Create, edit, delete, and view courses
- **Module Management:** Add, edit, delete, and expand/collapse modules; progress tracking
- **File Management:** Upload, download (with authentication), and delete files; modern drag-and-drop UI
- **Assignment Management:** Create assignments, submit work, view/download submissions, delete assignments
- **User Management (Admin):** Manage users, assign instructors, post announcements
- **Course Introduction Video:** YouTube video support per course
- **Announcements:** Admins can post announcements
- **Profile Management:** View and update user profile
- **Modern UI/UX:** Responsive, card-based sidebar, smooth animations, and consistent design
- **Debug/Test Pages:** For troubleshooting authentication and file downloads

---

## Workflow
### User Journey
1. **Registration/Login:** User registers or logs in; role is determined
2. **Dashboard:** User sees a list of courses
3. **Course Detail:** View modules, files, and assignments
4. **Module Expansion:** Expand modules to see files/lessons; instructors/admins can upload/delete files
5. **Assignments:** Students submit work; instructors view/download submissions
6. **File Operations:** Upload, download (with authentication), and delete files
7. **Progress Tracking:** Students mark files/lessons as done (localStorage)
8. **Admin Functions:** Manage users, assign instructors, post announcements

### Backend Workflow
- All actions handled via RESTful API endpoints
- Authentication via headers
- SQLAlchemy models for all entities
- File storage on disk, referenced in DB
- Role-based access control

### Frontend Workflow
- Fetch and dynamic rendering for SPA-like experience
- State managed via global variables and localStorage
- Modern, responsive UI with error handling
- Cache-busting for JS files

---

## Setup & Usage
### Backend
```sh
cd lms-backend
python app.py
```
Or use the run script:
```sh
./run_all.sh
```

### Frontend
Open in browser:
```
http://localhost:5500/course-recommendations/index.html
```

### Login/Register
- Use the login or register page to access the system
- Admin/instructor/student roles supported

### Admin/Instructor
- Manage courses, modules, files, and assignments via sidebar and navigation

### Student
- Enroll in courses, view modules, download files, submit assignments

---

## Example Use Cases
- **Admin:** Adds a new course, assigns an instructor, uploads course image, posts an announcement
- **Instructor:** Adds modules, uploads files, creates assignments, views student submissions
- **Student:** Views course content, downloads files, marks lessons as done, submits assignments

---

## Extensibility
- Easy to add new features (quizzes, grades, notifications)
- API-first design for integration with mobile apps or other systems
- Clean, modular codebase

---

## Security & Best Practices
- Role-based access control for all sensitive operations
- Input validation on frontend and backend
- No sensitive data in localStorage (only email/role)
- CORS configured for secure API access

---

## Summary
A2000 LMS is a robust, modern, and user-friendly platform for managing courses, modules, files, and assignments. Designed for real-world use in education and training, with a focus on security, usability, and extensibility.

---

## Contact & Support
For questions, issues, or contributions, please open an issue or contact the maintainer.

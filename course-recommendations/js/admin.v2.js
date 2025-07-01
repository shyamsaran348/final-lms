    if (typeof API_URL === 'undefined') {
  var API_URL = 'http://localhost:5001/api';
}

document.addEventListener('DOMContentLoaded', function() {
    // Restrict access to admins only
    if (localStorage.getItem('role') !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Initialize dashboard
    // loadDashboardStats();
    loadUsers();
    loadCourses();
    loadAnnouncements();

    // Event listeners
    document.getElementById('addCourseForm').addEventListener('submit', handleAddCourse);
    document.getElementById('addAnnouncementForm').addEventListener('submit', handleAddAnnouncement);
});

// Tab switching functionality
function showTab(tabName) {
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected content section
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked tab
    event.target.classList.add('active');
}

// Load dashboard statistics
function loadDashboardStats() {
    // Remove or comment out all code that fetches and displays dashboard statistics
}

// Load users
function loadUsers() {
    fetch(`${API_URL}/users`, {
        headers: {
            'X-User-Role': 'admin'
        }
    })
    .then(res => res.json())
    .then(users => {
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>
                    <select data-user-id="${user.id}" class="role-select">
                        <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                        <option value="instructor" ${user.role === 'instructor' ? 'selected' : ''}>Instructor</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-primary" onclick="updateUserRole(${user.id})">
                        <i class="fas fa-save"></i> Update
                    </button>
                    <button class="btn btn-danger" onclick="deleteUser(${user.id}, '${user.username}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
                <td>
                    ${user.role === 'student' ? `<button class="btn btn-success" onclick="openCourseModal(${user.id}, '${user.username}', 'student')"><i class='fas fa-book'></i> Manage Courses</button>` : user.role === 'instructor' ? `<button class="btn btn-success" onclick="openCourseModal(${user.id}, '${user.username}', 'instructor')"><i class='fas fa-chalkboard-teacher'></i> Manage Courses</button>` : '-'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    })
    .catch(err => {
        showMessage('Failed to load users', 'error');
    });
}

// Load courses
function loadCourses() {
    fetch(`${API_URL}/courses`)
    .then(res => res.json())
    .then(courses => {
        const tbody = document.querySelector('#coursesTable tbody');
        tbody.innerHTML = '';
        
        courses.forEach(course => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${course.id}</td>
                <td>${course.title}</td>
                <td>${course.author}</td>
                <td>
                    <button class="btn btn-primary" onclick="editCourse(${course.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger" onclick="deleteCourse(${course.id}, '${course.title}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    })
    .catch(err => {
        showMessage('Failed to load courses', 'error');
    });
}

// Load announcements
function loadAnnouncements() {
    fetch(`${API_URL}/announcements`)
        .then(res => res.json())
        .then(announcements => {
            const list = document.getElementById('announcementsList');
            list.innerHTML = '<table><thead><tr><th>Title</th><th>Content</th><th>Author</th><th>Created At</th><th>Actions</th></tr></thead><tbody></tbody></table>';
            const tbody = list.querySelector('tbody');
            if (announcements.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No announcements yet.</td></tr>';
                return;
            }
            announcements.forEach(ann => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${ann.title}</td>
                    <td>${ann.content}</td>
                    <td>${ann.author}</td>
                    <td>${ann.created_at}</td>
                    <td>
                        <button class="btn btn-danger" onclick="deleteAnnouncement(${ann.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            showMessage('Failed to load announcements', 'error', 'announcementMessage');
        });
}

// Update user role
function updateUserRole(userId) {
    const select = document.querySelector(`select[data-user-id="${userId}"]`);
    const newRole = select.value;
    
    fetch(`${API_URL}/users/${userId}/role`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Role': 'admin'
        },
        body: JSON.stringify({ role: newRole })
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
        if (ok) {
            showMessage(data.message, 'success');
            loadUsers();
            // loadDashboardStats();
        } else {
            showMessage(data.message || 'Failed to update role', 'error');
        }
    })
    .catch(() => {
        showMessage('Failed to update role', 'error');
    });
}

// Delete user
function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
        return;
    }
    
    fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
            'X-User-Role': 'admin'
        }
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
        if (ok) {
            showMessage(data.message, 'success');
            loadUsers();
            // loadDashboardStats();
        } else {
            showMessage(data.message || 'Failed to delete user', 'error');
        }
    })
    .catch(() => {
        showMessage('Failed to delete user', 'error');
    });
}

// Delete course
function deleteCourse(courseId, title) {
    if (!confirm(`Are you sure you want to delete course "${title}"?`)) {
        return;
    }
    
    fetch(`${API_URL}/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
            'X-User-Role': 'admin'
        }
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
        if (ok) {
            showMessage(data.message, 'success');
            loadCourses();
            // loadDashboardStats();
        } else {
            showMessage(data.message || 'Failed to delete course', 'error');
        }
    })
    .catch(() => {
        showMessage('Failed to delete course', 'error');
    });
}

// Handle add course form submission
function handleAddCourse(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('title', document.getElementById('courseTitle').value);
    formData.append('author', document.getElementById('courseAuthor').value);
    formData.append('image', document.getElementById('courseImage').files[0]);
    formData.append('detail_page', document.getElementById('detailPage').value || null);
    
    fetch(`${API_URL}/courses`, {
        method: 'POST',
        headers: {
            'X-User-Role': 'admin'
        },
        body: formData
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
        if (ok) {
            showMessage(data.message, 'success');
            event.target.reset();
            loadCourses();
            // loadDashboardStats();
            showTab('courses');
        } else {
            showMessage(data.message || 'Failed to add course', 'error');
        }
    })
    .catch(() => {
        showMessage('Failed to add course', 'error');
    });
}

// Edit course (placeholder for future implementation)
window.editCourse = function(courseId) {
    console.log('editCourse called', courseId);
    try {
        console.log('About to fetch course data for', courseId);
        fetch(`${API_URL}/courses/${courseId}`)
          .then(res => {
            console.log('Fetch response received', res);
            return res.json();
          })
          .then(course => {
            console.log('Course data received', course);
            document.getElementById('editCourseId').value = courseId;
            document.getElementById('editCourseTitle').value = course.title || '';
            document.getElementById('editCourseAuthor').value = course.author || '';
            document.getElementById('editCourseDescription').value = course.description || course.detail_page || '';
            // Show image preview if available
            const imgPreview = document.getElementById('editCourseImagePreview');
            if (course.image) {
              let imgPath = course.image;
              if (imgPath.startsWith('course-recommendations/')) {
                imgPath = imgPath.replace(/^course-recommendations\//, '');
              }
              imgPreview.src = `/course-recommendations/${imgPath}`;
              imgPreview.style.display = 'block';
            } else {
              imgPreview.style.display = 'none';
            }
            // Defensive check for file input
            const fileInput = document.getElementById('editCourseImage');
            if (!fileInput || fileInput.type !== 'file') {
              console.warn('editCourseImage input not found or not a file input:', fileInput);
            }
            console.log('About to show modal');
            const modal = document.getElementById('editCourseModal');
            modal.classList.add('active');
            modal.style.display = 'flex';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(0,0,0,0.35)';
            modal.style.zIndex = 9999;
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.opacity = 1;
            modal.style.visibility = 'visible';
          })
          .catch(err => {
            console.error('Fetch or processing error in editCourse:', err);
          });
    } catch (err) {
        console.error('editCourse error:', err);
    }
}

// Show message
function showMessage(message, type, elementId = 'message') {
    const messageDiv = document.getElementById(elementId);
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Logout function
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    window.location.href = 'login.html';
}

// Modal logic for course assignment
let currentCourseUserId = null;
function openCourseModal(userId, username, role) {
    const modal = document.getElementById('courseModal');
    const modalTitle = document.getElementById('modalTitle');
    const courseCheckboxes = document.getElementById('courseCheckboxes');
    modal.style.display = 'flex';
    modalTitle.textContent = `Manage Courses for ${role.charAt(0).toUpperCase() + role.slice(1)}: ${username}`;
    courseCheckboxes.innerHTML = '<div class="loading">Loading courses...</div>';
    // Fetch all courses
    fetch(`${API_URL}/courses`, { headers: { 'X-User-Role': 'admin' } })
        .then(res => res.json())
        .then(courses => {
            // Fetch assigned courses for this user
            let url = role === 'student'
                ? `${API_URL}/users/${userId}/courses`
                : `${API_URL}/instructors/${userId}/courses`;
            fetch(url, { headers: { 'X-User-Role': 'admin' } })
                .then(res => res.json())
                .then(data => {
                    const assigned = data.course_ids || [];
                    courseCheckboxes.innerHTML = courses.map(course => `
                        <div style='margin-bottom:0.5em;'>
                            <label><input type='checkbox' name='course' value='${course.id}' ${assigned.includes(course.id) ? 'checked' : ''}> ${course.title}</label>
                        </div>
                    `).join('');
                });
        });
    // Save handler
    const form = document.getElementById('courseAssignForm');
    form.onsubmit = function(e) {
        e.preventDefault();
        const checked = Array.from(form.elements['course'])
            .filter(cb => cb.checked)
            .map(cb => parseInt(cb.value));
        // Fetch current assignments
        let url = role === 'student'
            ? `${API_URL}/users/${userId}/courses`
            : `${API_URL}/instructors/${userId}/courses`;
        fetch(url, { headers: { 'X-User-Role': 'admin' } })
            .then(res => res.json())
            .then(data => {
                const assigned = data.course_ids || [];
                // Find to add and remove
                const toAdd = checked.filter(id => !assigned.includes(id));
                const toRemove = assigned.filter(id => !checked.includes(id));
                // Add assignments
                Promise.all([
                    ...toAdd.map(courseId => fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-User-Role': 'admin'
                        },
                        body: JSON.stringify({ course_id: courseId })
                    })),
                    ...toRemove.map(courseId => fetch(`${url}/${courseId}`, {
                        method: 'DELETE',
                        headers: { 'X-User-Role': 'admin' }
                    }))
                ]).then(() => {
                    showMessage('Courses updated!', 'success');
                    modal.style.display = 'none';
                });
            });
    };
    // Close handler
    document.getElementById('closeModalBtn').onclick = function() {
        modal.style.display = 'none';
    };
}

// --- Edit Course Modal Logic ---
// Add image preview on file select
const editCourseImageInput = document.getElementById('editCourseImage');
const editCourseImagePreview = document.getElementById('editCourseImagePreview');
if (editCourseImageInput && editCourseImagePreview) {
    editCourseImageInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                editCourseImagePreview.src = e.target.result;
                editCourseImagePreview.style.display = 'block';
            };
            reader.readAsDataURL(this.files[0]);
        } else {
            editCourseImagePreview.style.display = 'none';
        }
    });
}

// Reset form on close/cancel
function resetEditCourseForm() {
    document.getElementById('editCourseForm').reset();
    editCourseImagePreview.src = '';
    editCourseImagePreview.style.display = 'none';
}
document.getElementById('closeEditCourseModal').onclick = function() {
    const modal = document.getElementById('editCourseModal');
    modal.classList.remove('active');
    modal.style.display = 'none';
    resetEditCourseForm();
};
document.getElementById('cancelEditCourseBtn').onclick = function() {
    const modal = document.getElementById('editCourseModal');
    modal.classList.remove('active');
    modal.style.display = 'none';
    resetEditCourseForm();
};

document.getElementById('editCourseForm').onsubmit = function(e) {
    e.preventDefault();
    const id = document.getElementById('editCourseId').value;
    const title = document.getElementById('editCourseTitle').value.trim();
    const author = document.getElementById('editCourseAuthor').value.trim();
    const description = document.getElementById('editCourseDescription').value.trim();
    const imageInput = document.getElementById('editCourseImage');
    const messageDiv = document.getElementById('message');
    // Validation
    if (!title || !author) {
        messageDiv.textContent = 'Title and Author are required.';
        messageDiv.className = 'message error';
        messageDiv.style.display = 'block';
        return;
    }
    const formData = new FormData();
    formData.append('title', title);
    formData.append('author', author);
    formData.append('description', description);
    if (imageInput && imageInput.files && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }
    fetch(`${API_URL}/courses/${id}`, {
        method: 'PUT',
        headers: {
            'X-User-Role': 'admin'
        },
        body: formData
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
        if (ok) {
            showMessage('Course updated!', 'success');
            const modal = document.getElementById('editCourseModal');
            modal.classList.remove('active');
            modal.style.display = 'none';
            resetEditCourseForm();
            loadCourses();
        } else {
            messageDiv.textContent = data.message || 'Failed to update course';
            messageDiv.className = 'message error';
            messageDiv.style.display = 'block';
        }
    })
    .catch(() => {
        messageDiv.textContent = 'Failed to update course';
        messageDiv.className = 'message error';
        messageDiv.style.display = 'block';
    });
};

// Search users by username
function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const tableRows = document.querySelectorAll('#usersTable tbody tr');

    tableRows.forEach(row => {
        const username = row.cells[1].textContent.toLowerCase();
        if (username.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Handle add announcement form submission
function handleAddAnnouncement(event) {
    event.preventDefault();
    
    const formData = {
        title: document.getElementById('announcementTitle').value,
        content: document.getElementById('announcementContent').value,
    };
    
    fetch(`${API_URL}/announcements`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Role': 'admin',
            'X-User-Email': localStorage.getItem('email')
        },
        body: JSON.stringify(formData)
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
        if (ok) {
            showMessage(data.message, 'success', 'announcementMessage');
            event.target.reset();
            loadAnnouncements();
        } else {
            showMessage(data.message || 'Failed to add announcement', 'error', 'announcementMessage');
        }
    })
    .catch(() => {
        showMessage('Failed to add announcement', 'error', 'announcementMessage');
    });
}

// Delete announcement
function deleteAnnouncement(announcementId) {
    if (!confirm('Are you sure you want to delete this announcement?')) {
        return;
    }

    fetch(`${API_URL}/announcements/${announcementId}`, {
        method: 'DELETE',
        headers: {
            'X-User-Role': 'admin'
        }
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
        if (ok) {
            showMessage(data.message, 'success', 'announcementMessage');
            loadAnnouncements();
        } else {
            showMessage(data.message || 'Failed to delete announcement', 'error', 'announcementMessage');
        }
    })
    .catch(() => {
        showMessage('Failed to delete announcement', 'error', 'announcementMessage');
    });
} 
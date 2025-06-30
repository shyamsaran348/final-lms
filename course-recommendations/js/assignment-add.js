// assignment-add.js

document.addEventListener('DOMContentLoaded', () => {
    populateCourses();
    document.getElementById('addAssignmentForm').addEventListener('submit', handleFormSubmit);
});

async function populateCourses() {
    const res = await fetch('/api/courses');
    if (!res.ok) return;
    const courses = await res.json();
    const select = document.getElementById('course_id');
    select.innerHTML = '';
    courses.forEach(course => {
        // Only show courses the instructor/admin teaches (or all if admin)
        if (!course.locked) {
            const opt = document.createElement('option');
            opt.value = course.id;
            opt.textContent = course.title;
            select.appendChild(opt);
        }
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('addAssignmentForm');
    const formData = new FormData(form);
    const res = await fetch('/api/assignments', {
        method: 'POST',
        body: formData
    });
    const msgDiv = document.getElementById('formMessage');
    if (res.ok) {
        msgDiv.textContent = 'Assignment created successfully!';
        msgDiv.style.color = 'green';
        form.reset();
    } else {
        const data = await res.json();
        msgDiv.textContent = data.message || 'Error creating assignment.';
        msgDiv.style.color = 'red';
    }
} 
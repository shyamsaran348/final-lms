// assignment-submissions.js

if (typeof API_URL === 'undefined') {
  var API_URL = 'http://localhost:5001/api';
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const assignmentId = urlParams.get('assignment_id');
    if (!assignmentId) {
        document.getElementById('assignmentDetails').innerHTML = '<p>Missing assignment ID in URL.</p>';
        return;
    }
    const userEmail = localStorage.getItem('email') || '';
    // Fetch assignment details
    const assignmentRes = await fetch(`${API_URL}/assignments/${assignmentId}`, {
        headers: { 'X-User-Email': userEmail }
    });
    let assignment = null;
    if (assignmentRes.ok) {
        assignment = await assignmentRes.json();
    }
    if (!assignment || assignment.message === 'Assignment not found') {
        document.getElementById('assignmentDetails').innerHTML = '<p>Assignment not found.</p>';
        return;
    }
    renderAssignmentDetails(assignment);

    // Fetch submissions
    const submissionsRes = await fetch(`${API_URL}/assignments/${assignmentId}/submissions`, {
        headers: { 'X-User-Email': userEmail }
    });
    let submissions = [];
    if (submissionsRes.ok) {
        submissions = await submissionsRes.json();
    }
    renderSubmissionsTable(submissions, assignment);
});

function renderAssignmentDetails(assignment) {
    const due = assignment.due_date ? new Date(assignment.due_date).toLocaleString() : 'No due date';
    const role = localStorage.getItem('role');
    const deleteButton = (role === 'admin' || role === 'instructor') ? 
        `<button onclick="deleteAssignment(${assignment.id})" class="btn btn-danger" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 8px; padding: 0.5rem 1rem; font-weight: 600; font-size: 0.875rem; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(239,68,68,0.15); display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem;" onmouseover="this.style.transform='translateY(-2px) scale(1.02)'; this.style.boxShadow='0 8px 16px rgba(239,68,68,0.25)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 2px 8px rgba(239,68,68,0.15)'">
            <i class="fas fa-trash"></i>
            Delete Assignment
        </button>` : '';
    
    document.getElementById('assignmentDetails').innerHTML = `
        <h2>${assignment.title}</h2>
        <p><strong>Description:</strong> ${assignment.description || ''}</p>
        <p><strong>Due Date:</strong> ${due}</p>
        ${assignment.file_path ? `<a href="/course_files/${assignment.file_path}" download>Download Assignment File</a>` : ''}
        ${deleteButton}
    `;
}

function renderSubmissionsTable(submissions, assignment) {
    if (!submissions.length) {
        document.getElementById('submissionsTableContainer').innerHTML = '<p>No submissions yet.</p>';
        return;
    }
    let table = `<table class="modern-table"><thead><tr>
        <th>Student Name</th><th>Email</th><th>Submitted At</th><th>Status</th><th>Text Answer</th><th>File</th>
    </tr></thead><tbody>`;
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
    submissions.forEach(sub => {
        const submittedAt = new Date(sub.submitted_at);
        const onTime = dueDate ? submittedAt <= dueDate : true;
        table += `<tr>
            <td>${sub.user_name || ''}</td>
            <td>${sub.user_email || ''}</td>
            <td>${submittedAt.toLocaleString()}</td>
            <td>${onTime ? '<span style="color:green">On Time</span>' : '<span style="color:red">Late</span>'}</td>
            <td>${sub.text_answer ? sub.text_answer.replace(/</g, '&lt;') : ''}</td>
            <td>${sub.file_path ? `<a href="/course_files/${sub.file_path}" download>Download</a>` : ''}</td>
        </tr>`;
    });
    table += '</tbody></table>';
    document.getElementById('submissionsTableContainer').innerHTML = table;
}

function showToast(message, type = 'success', duration = 3000) {
    let toast = document.getElementById('global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => { toast.className = `toast ${type}`; }, duration);
}

function deleteAssignment(assignmentId) {
    if (confirm('Are you sure you want to delete this assignment? This action cannot be undone and will also delete all student submissions.')) {
        fetch(`${API_URL}/assignments/${assignmentId}`, {
            method: 'DELETE',
            headers: {
                'X-User-Role': localStorage.getItem('role') || '',
                'X-User-Email': localStorage.getItem('email') || ''
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.message === 'Assignment deleted successfully') {
                showToast('Assignment deleted successfully', 'success');
                // Redirect back to course detail page
                setTimeout(() => {
                    window.history.back();
                }, 1500);
            } else {
                showToast(data.message || 'Failed to delete assignment', 'error');
            }
        })
        .catch(err => {
            console.error('Error deleting assignment:', err);
            showToast('Failed to delete assignment. Please try again.', 'error');
        });
    }
} 
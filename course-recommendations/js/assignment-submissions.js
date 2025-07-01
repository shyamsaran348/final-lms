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
        `<button onclick="deleteAssignment(${assignment.id})" class="btn btn-danger" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 8px; padding: 0.7rem 1.5rem; font-weight: 600; font-size: 1rem; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(239,68,68,0.15); display: block; margin-top: 1.5rem;">Delete Assignment</button>` : '';
    const downloadLink = assignment.file_path ? `<a href="/course_files/${assignment.file_path}" download style="display: inline-block; color: #6366f1; font-weight: 500; margin-top: 0.5rem;">Download Assignment File</a>` : '';
    document.getElementById('assignmentDetails').innerHTML = `
        <div style="background: #fff; border-radius: 18px; box-shadow: 0 2px 16px rgba(99,102,241,0.10); padding: 2.2rem 2rem 2rem 2rem; margin-bottom: 2.5rem; max-width: 600px; margin-left: auto; margin-right: auto;">
            <div style="font-size: 1.5rem; font-weight: 700; color: #3730a3; margin-bottom: 0.7rem;">${assignment.title || ''}</div>
            <div style="font-size: 1.1rem; color: #22223b; margin-bottom: 0.5rem;"><b>Description:</b> ${assignment.description || ''}</div>
            <div style="font-size: 1.1rem; color: #22223b; margin-bottom: 0.5rem;"><b>Due Date:</b> ${due}</div>
            ${downloadLink}
            ${deleteButton}
        </div>
        <div style="font-size: 1.3rem; font-weight: 700; color: #3730a3; margin-bottom: 0.7rem; margin-top: 2.5rem;">Student Submissions</div>
        <div id="submissionsTableContainer"></div>
    `;
}

function renderSubmissionsTable(submissions, assignment) {
    const container = document.getElementById('submissionsTableContainer');
    document.body.classList.add('bg-gradient-to-br', 'from-indigo-50', 'to-blue-100');
    if (!submissions.length) {
        container.innerHTML = `
            <div class="flex justify-center items-center min-h-[180px] w-full">
                <div class="bg-white rounded-2xl shadow-2xl p-10 min-w-[340px] text-center mx-auto">
                    <div class="text-lg text-slate-400">No submissions yet.</div>
                </div>
            </div>`;
        return;
    }
    let currentPage = 1;
    const pageSize = 5;
    let filteredSubmissions = submissions;
    function render() {
        container.innerHTML = `
            <div class="flex justify-center w-full">
                <div class="bg-white rounded-2xl shadow-2xl px-10 py-12 max-w-4xl w-full flex flex-col items-center mx-auto">
                    <div class="flex flex-col md:flex-row md:justify-between md:items-center w-full mb-8 gap-4">
                        <div class="text-2xl font-bold text-indigo-900 text-center md:text-left w-full md:w-auto">Student Submissions</div>
                        <div class="relative w-full md:w-auto flex justify-center md:justify-end">
                            <input id="submissionSearch" type="search" placeholder="Search submissions..." class="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-base w-full md:w-72 bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition" />
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 text-lg"><i class="fas fa-search"></i></span>
                        </div>
                    </div>
                    <div class="overflow-x-auto w-full">
                        <table class="w-full text-base bg-white rounded-xl">
                            <thead class="sticky top-0 z-10">
                                <tr class="bg-indigo-100">
                                    <th class="py-4 px-3 text-left text-slate-700 font-semibold">Student Name</th>
                                    <th class="py-4 px-3 text-left text-slate-700 font-semibold">Email</th>
                                    <th class="py-4 px-3 text-left text-slate-700 font-semibold">Submitted At</th>
                                    <th class="py-4 px-3 text-left text-slate-700 font-semibold">Status</th>
                                    <th class="py-4 px-3 text-left text-slate-700 font-semibold">Text Answer</th>
                                    <th class="py-4 px-3 text-left text-slate-700 font-semibold">File / Actions</th>
                                </tr>
                            </thead>
                            <tbody id="submissionsTableBody"></tbody>
                        </table>
                    </div>
                    <div id="paginationControls" class="flex justify-end items-center gap-2 mt-8 w-full"></div>
                </div>
            </div>
        `;
        renderTableRows();
        renderPagination();
        document.getElementById('submissionSearch').addEventListener('input', (e) => {
            const q = e.target.value.trim().toLowerCase();
            filteredSubmissions = submissions.filter(sub =>
                (sub.user_name || '').toLowerCase().includes(q) ||
                (sub.user_email || '').toLowerCase().includes(q) ||
                (sub.text_answer || '').toLowerCase().includes(q)
            );
            currentPage = 1;
            renderTableRows();
            renderPagination();
        });
    }
    function renderTableRows() {
        const tbody = document.getElementById('submissionsTableBody');
        if (!tbody) return;
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageSubs = filteredSubmissions.slice(start, end);
        tbody.innerHTML = pageSubs.map((sub, idx) => {
            const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
            const submittedAt = new Date(sub.submitted_at);
            const onTime = dueDate ? submittedAt <= dueDate : true;
            const role = localStorage.getItem('role');
            const zebra = idx % 2 === 0 ? 'bg-indigo-50' : 'bg-white';
            return `
                <tr class="${zebra} hover:bg-indigo-100 transition">
                    <td class="py-3 px-3 font-medium">${sub.user_name || ''}</td>
                    <td class="py-3 px-3 text-indigo-500">${sub.user_email || ''}</td>
                    <td class="py-3 px-3 text-slate-500">${submittedAt.toLocaleString()}</td>
                    <td class="py-3 px-3">
                        <span class="inline-block px-4 py-1 rounded-full text-sm font-bold ${onTime ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${onTime ? 'On Time' : 'Late'}</span>
                    </td>
                    <td class="py-3 px-3 text-slate-700">${sub.text_answer ? sub.text_answer.replace(/</g, '&lt;') : '<span class=\"text-slate-400\">None</span>'}</td>
                    <td class="py-3 px-3">
                        ${(sub.file_name && sub.id) ? `<a href="${API_URL}/assignments/${assignment.id}/submissions/${sub.id}/download" download title="Download" class="text-blue-600 font-semibold hover:underline mr-3"><i class=\"fas fa-download\"></i> Download</a>` : '<span class=\"text-slate-400\">No file</span>'}
                        ${(role === 'admin' || role === 'instructor') ? `<button onclick=\"deleteSubmission(${sub.id},${assignment.id})\" title=\"Delete\" class=\"bg-red-500 hover:bg-red-600 text-white rounded-md px-4 py-1 font-semibold text-sm ml-2 transition\"><i class='fas fa-trash'></i> Delete</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }
    function renderPagination() {
        const totalPages = Math.ceil(filteredSubmissions.length / pageSize);
        const controls = document.getElementById('paginationControls');
        if (!controls) return;
        if (totalPages <= 1) { controls.innerHTML = ''; return; }
        let html = '';
        html += `<button ${currentPage === 1 ? 'disabled' : ''} class="px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 font-bold mr-1 text-base disabled:opacity-50" onclick="window.changeSubmissionPage(${currentPage-1})">&lt;</button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
                html += `<button ${i === currentPage ? 'class=\"bg-indigo-600 text-white\"' : ''} class="px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 font-bold mr-1 text-base" onclick="window.changeSubmissionPage(${i})">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                html += '<span class="mx-2">...</span>';
            }
        }
        html += `<button ${currentPage === totalPages ? 'disabled' : ''} class="px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 font-bold ml-1 text-base disabled:opacity-50" onclick="window.changeSubmissionPage(${currentPage+1})">&gt;</button>`;
        controls.innerHTML = html;
    }
    window.changeSubmissionPage = function(page) {
        currentPage = page;
        renderTableRows();
        renderPagination();
    };
    render();
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

// Add deleteSubmission function for row delete
window.deleteSubmission = function(submissionId, assignmentId) {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    fetch(`${API_URL}/assignments/${assignmentId}/submissions/${submissionId}`, {
        method: 'DELETE',
        headers: {
            'X-User-Role': localStorage.getItem('role') || '',
            'X-User-Email': localStorage.getItem('email') || ''
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.message && data.message.toLowerCase().includes('deleted')) {
            showToast('Submission deleted!', 'success');
            // Reload submissions
            location.reload();
        } else {
            showToast(data.message || 'Failed to delete submission', 'error');
        }
    })
    .catch(() => showToast('Failed to delete submission', 'error'));
} 
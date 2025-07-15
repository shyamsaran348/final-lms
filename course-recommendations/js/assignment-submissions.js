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
        `<button onclick="deleteAssignment(${assignment.id})" class="btn btn-danger" style="background: #ef4444; color: white; border: none; border-radius: 8px; padding: 0.7rem 1.5rem; font-weight: 600; font-size: 1rem; margin-left: 1rem; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 2px 8px rgba(239,68,68,0.10); transition: background 0.2s;" title="Delete Assignment"><i class='fas fa-trash'></i> Delete Assignment</button>` : '';
    const downloadLink = assignment.file_path ? `<button onclick="downloadAssignmentFile(${assignment.id})" style="display: inline-flex; align-items: center; gap: 0.5rem; color: #4f46e5; font-weight: 600; border: 1.5px solid #a5b4fc; background: #fff; border-radius: 8px; padding: 0.7rem 1.5rem; font-size: 1rem; margin-right: 1rem; text-decoration: none; box-shadow: 0 2px 8px rgba(99,102,241,0.10); transition: background 0.2s; cursor: pointer;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#fff'" title="Download Assignment File"><i class='fas fa-download'></i> Download Assignment File</button>` : '';
    document.getElementById('assignmentDetails').innerHTML = `
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 20px; box-shadow: 0 4px 32px rgba(99,102,241,0.10); padding: 2.5rem 2.5rem 2.2rem 2.5rem; margin-bottom: 2.5rem; max-width: 950px; margin-left: auto; margin-right: auto; display: flex; flex-direction: column; gap: 1.2rem; position: relative;">
            <div style="font-size: 2.5rem; font-weight: 900; color: #1e293b; margin-bottom: 0.5rem; letter-spacing: -1px;">${assignment.title || ''}</div>
            <div style="font-size: 1.15rem; color: #22223b; margin-bottom: 0.2rem;"><b>Description:</b> <span style='color:#64748b;'>${assignment.description || ''}</span></div>
            <div style="font-size: 1.15rem; color: #22223b; margin-bottom: 1.2rem;"><b>Due Date:</b> <span style='color:#64748b;'>${due}</span></div>
            <div style="display: flex; align-items: center; gap: 1rem; position: absolute; right: 2.5rem; top: 2.5rem;">
            ${downloadLink}
            ${deleteButton}
            </div>
        </div>
        <div id="submissionsTableContainer" style="margin-bottom: 2rem;"></div>
    `;
}

function renderSubmissionsTable(submissions, assignment) {
    const container = document.getElementById('submissionsTableContainer');
    container.innerHTML = `
        <div style="background: #fff; border-radius: 20px; box-shadow: 0 4px 32px rgba(99,102,241,0.10); padding: 2.5rem 2.5rem 2.5rem 2.5rem; max-width: 1150px; margin-left: auto; margin-right: auto;">
            <div style="font-size: 1.7rem; font-weight: 900; color: #1e293b; margin-bottom: 1.5rem; letter-spacing: -0.5px;">Submissions</div>
            <div style="display: flex; justify-content: flex-end; margin-bottom: 1.5rem;">
                <input type="text" id="searchSubmissions" placeholder="Search submissions..." style="border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 0.7rem 1.7rem; font-size: 1.1rem; width: 340px; background: #f9fafb; outline: none; box-shadow: 0 1px 4px rgba(99,102,241,0.04); transition: border 0.2s;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e5e7eb'" title="Search submissions">
            </div>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 1.05rem;">
                    <thead>
                        <tr style="background: #f3f4f6; color: #22223b; font-size: 1.08rem;">
                            <th style="padding: 1.1rem 0.7rem; text-align: left; font-weight: 800;">STUDENT NAME</th>
                            <th style="padding: 1.1rem 0.7rem; text-align: left; font-weight: 800;">EMAIL</th>
                            <th style="padding: 1.1rem 0.7rem; text-align: left; font-weight: 800;">SUBMITTED AT</th>
                            <th style="padding: 1.1rem 0.7rem; text-align: left; font-weight: 800;">STATUS</th>
                            <th style="padding: 1.1rem 0.7rem; text-align: left; font-weight: 800;">TEXT ANSWER</th>
                            <th style="padding: 1.1rem 0.7rem; text-align: left; font-weight: 800;">FILE / ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody id="submissionsTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    document.body.classList.add('bg-gradient-to-br', 'from-indigo-50', 'to-blue-100');
    if (!submissions.length) {
        container.innerHTML = `
            <div class="flex justify-center items-center min-h-[180px] w-full">
                <div class="bg-white rounded-2xl shadow-2xl p-10 min-w-[340px] text-center mx-auto" style="margin-top: 1.5rem; margin-bottom: 2rem;">
                    <div class="text-lg text-slate-400 font-semibold">No submissions yet.</div>
                </div>
            </div>`;
        return;
    }
    let currentPage = 1;
    const pageSize = 5;
    let filteredSubmissions = submissions;
    function render() {
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
                        ${(sub.file_name && sub.id) ? `<a href="#" onclick="downloadSubmissionFile(${assignment.id},${sub.id}); return false;" title="Download" class="text-blue-600 font-semibold hover:underline mr-3"><i class=\"fas fa-download\"></i> Download</a>` : '<span class=\"text-slate-400\">No file</span>'}
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
    document.getElementById('searchSubmissions').addEventListener('input', (e) => {
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

// Helper to download a file using the backend's direct file endpoint
async function downloadSubmissionFile(assignmentId, submissionId) {
    try {
        const res = await fetch(`${API_URL}/assignments/${assignmentId}/submissions/${submissionId}/download`, {
            headers: {
                'X-User-Email': localStorage.getItem('email') || '',
                'X-User-Role': localStorage.getItem('role') || ''
            }
        });
        if (!res.ok) throw new Error('Failed to download file');
        const disposition = res.headers.get('Content-Disposition');
        let filename = 'file';
        if (disposition && disposition.indexOf('filename=') !== -1) {
            filename = disposition.split('filename=')[1].replace(/['"]/g, '').trim();
        }
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    } catch (err) {
        showToast('Failed to download file', 'error');
    }
}

// Make function globally available
window.downloadSubmissionFile = downloadSubmissionFile;

// Helper to download assignment file using direct file download
async function downloadAssignmentFile(assignmentId) {
    try {
        const res = await fetch(`${API_URL}/assignments/${assignmentId}`, {
            headers: {
                'X-User-Email': localStorage.getItem('email') || '',
                'X-User-Role': localStorage.getItem('role') || ''
            }
        });
        if (!res.ok) throw new Error('Failed to get assignment');
        const assignment = await res.json();
        if (!assignment.file_path) throw new Error('No file');
        // Use fetch with authentication headers
        const fileRes = await fetch(`${API_URL}/files/${assignment.id}`, {
            headers: {
                'X-User-Email': localStorage.getItem('email') || '',
                'X-User-Role': localStorage.getItem('role') || ''
            }
        });
        if (!fileRes.ok) throw new Error('Failed to download file');
        const disposition = fileRes.headers.get('Content-Disposition');
        let filename = 'file';
        if (disposition && disposition.indexOf('filename=') !== -1) {
            filename = disposition.split('filename=')[1].replace(/['"]/g, '').trim();
        }
        const blob = await fileRes.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    } catch (err) {
        showToast('Failed to download assignment file', 'error');
    }
}

// Make function globally available
window.downloadAssignmentFile = downloadAssignmentFile; 
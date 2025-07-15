// course-detail.js

if (typeof API_URL === 'undefined') {
  var API_URL = 'http://localhost:5001/api';
}

// Get course_id from URL and make it global
const params = new URLSearchParams(window.location.search);
const courseId = params.get('course_id');
console.log('Loaded courseId:', courseId);

let currentCourse = null;

// Redirect to Flask route if loaded as static file without course_id
(function() {
  const isStatic = window.location.pathname.endsWith('course-detail.html');
  if (isStatic && !params.get('course_id')) {
    window.location.href = '/course-detail';
  }
})();

// --- Toast/Alert Logic ---
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

document.addEventListener('DOMContentLoaded', async () => {
    if (!courseId) {
        const content = document.getElementById('lms-content');
        if (content) content.innerHTML = '<div style="text-align:center;color:#e53e3e;font-size:1.2em;margin-top:3em;">No course_id found in URL. Please access this page from the course list.</div>';
        return;
    }
    // Show Add Module button for admin/instructor only
    const role = localStorage.getItem('role');
    console.log('[DEBUG] User role:', role);
    const addModuleBtn = document.getElementById('add-module-btn');
    if (addModuleBtn) {
      if (role === 'admin' || role === 'instructor') {
        addModuleBtn.style.display = 'block';
        addModuleBtn.onclick = () => showModuleModal();
      } else {
        addModuleBtn.style.display = 'none';
      }
    }
    // Show Add Assignment button for admin/instructor only
    const addAssignmentBtn = document.getElementById('add-assignment-btn');
    if (addAssignmentBtn) {
      if (role === 'admin' || role === 'instructor') {
        addAssignmentBtn.style.display = 'block';
        addAssignmentBtn.onclick = () => showAssignmentModal();
      } else {
        addAssignmentBtn.style.display = 'none';
      }
    }
    // Assignment modal logic
    setupAssignmentModal();
    // Fetch course info
    try {
        const res = await fetch(`${API_URL}/courses/${courseId}`, {
            headers: {
                'X-User-Email': localStorage.getItem('email') || ''
            }
        });
        const course = await res.json();
        console.log('[DEBUG] Fetched course:', course);
        currentCourse = course;
        await loadModules(course.modules); // Await this!
        setupModuleManagement(course.modules);
        console.log('[DEBUG] loadModules complete');
    } catch (err) {
        const content = document.getElementById('lms-content');
        if (content) content.innerHTML = '<div style="text-align:center;color:#e53e3e;font-size:1.2em;margin-top:3em;">Failed to load course. Please try again later.</div>';
        console.error('[DEBUG] Error fetching course:', err);
    }
    // After loading course info, also load assignments
    loadAssignments();
});

function setupModuleManagement(modules) {
    // Add delete button to sidebar for admin/instructor (edit removed)
    const role = localStorage.getItem('role');
    if (role !== 'admin' && role !== 'instructor') return;
    setTimeout(() => {
        // Remove the code that appends a delete button to each module
        // Only attach the delete event handler to existing delete buttons
        document.querySelectorAll('.delete-module-btn').forEach(btn => {
            btn.onclick = e => {
                e.stopPropagation();
                if (confirm('Delete this module?')) {
                    deleteModule(btn.getAttribute('data-id'));
                }
            };
        });
    }, 100);
}

function showModuleModal(module = null) {
    const modal = document.getElementById('module-modal');
    modal.classList.add('active');
    document.getElementById('module-modal-title').textContent = module ? 'Edit Module' : 'Add Module';
    document.getElementById('module-id').value = module ? module.id : '';
    document.getElementById('module-title').value = module ? module.title : '';
    document.getElementById('module-description').value = module ? module.description : '';
    document.getElementById('module-release-date').value = module && module.release_date ? module.release_date : '';
}
document.getElementById('close-module-modal').onclick = () => {
    const modal = document.getElementById('module-modal');
    modal.classList.remove('active');
};

document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('module-modal');
  // Bulletproof: forcibly reset modal to hidden state on load
  modal.className = 'modal-overlay';
  // Modal logic only (no addModuleBtn logic)
  const closeModal = document.getElementById('close-module-modal');
  const moduleForm = document.getElementById('module-form');

  closeModal.onclick = function() {
    modal.classList.remove('active');
  };

  // Optional: close modal when clicking outside content
  modal.onclick = function(e) {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  };

  moduleForm.onsubmit = function(e) {
    e.preventDefault();
    // Gather form data
    const title = document.getElementById('module-title').value;
    const description = document.getElementById('module-description').value;
    const release_date = document.getElementById('module-release-date').value;
    // Call backend API to add module
    fetch(`${API_URL}/courses/${courseId}/modules`, {
      method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Role': localStorage.getItem('role') || '',
            'X-User-Email': localStorage.getItem('email') || ''
        },
        body: JSON.stringify({ title, description, release_date })
    })
    .then(res => res.json())
    .then(data => {
      if (data.module) {
        modal.classList.remove('active');
            // Reload modules
        fetch(`${API_URL}/courses/${courseId}`, {
                headers: { 'X-User-Email': localStorage.getItem('email') || '' }
            })
            .then(res => res.json())
            .then(course => {
                loadModules(course.modules);
                setupModuleManagement(course.modules);
            });
        } else {
        alert(data.message || 'Failed to add module');
        }
    })
    .catch(() => {
      alert('Failed to add module');
    });
};
});

function deleteModule(id) {
    fetch(`${API_URL}/modules/${id}`, {
        method: 'DELETE',
        headers: {
            'X-User-Role': localStorage.getItem('role') || '',
            'X-User-Email': localStorage.getItem('email') || ''
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.message === 'Module deleted') {
            // Reload modules and update global state
            fetch(`${API_URL}/courses/${courseId}`, {
                headers: { 'X-User-Email': localStorage.getItem('email') || '' }
            })
            .then(res => res.json())
            .then(course => {
                window._modules = course.modules;
                renderSidebarWithAssignments(window._modules, window._assignments, null, null, null);
                renderMainContent(window._modules, window._sidebarState.selectedModuleId, window._sidebarState.selectedLessonId);
                setupModuleManagement(window._modules);
            });
        } else {
            alert(data.message || 'Failed to delete module');
        }
    });
}

// Track completed lessons in localStorage for demo
function isLessonDone(lessonId) {
  const done = JSON.parse(localStorage.getItem('doneLessons') || '{}');
  return !!done[lessonId];
}
function toggleLessonDone(lessonId) {
  const done = JSON.parse(localStorage.getItem('doneLessons') || '{}');
  done[lessonId] = !done[lessonId];
  localStorage.setItem('doneLessons', JSON.stringify(done));
}

// Track completed files in localStorage for demo
function isFileDone(fileId) {
  const done = JSON.parse(localStorage.getItem('doneFiles') || '{}');
  return !!done[fileId];
}
function toggleFileDone(fileId) {
  const done = JSON.parse(localStorage.getItem('doneFiles') || '{}');
  done[fileId] = !done[fileId];
  localStorage.setItem('doneFiles', JSON.stringify(done));
}

// --- Sidebar and Main Content Rendering ---
function renderSidebarWithAssignments(modules, assignments, selectedModuleId, selectedLessonId, selectedAssignmentId) {
    console.log('[DEBUG] renderSidebarWithAssignments called', {selectedModuleId, selectedLessonId, selectedAssignmentId});
    if (!window._sidebarState) window._sidebarState = {};
    window._sidebarState.selectedModuleId = selectedModuleId;
    window._sidebarState.selectedLessonId = selectedLessonId;
    window._sidebarState.selectedAssignmentId = selectedAssignmentId;
    const sidebarList = document.getElementById('sidebar-modules-list');
    if (!sidebarList) { console.log('[DEBUG] sidebar-modules-list not found'); return; }
    let role = localStorage.getItem('role');
    if (!role) {
        role = 'admin';
        localStorage.setItem('role', role);
    }
    let html = '';
    html += `<div class="sidebar-section">
      <div class="sidebar-section-header">Modules & Assignments</div>
      <div class="sidebar-subsection-header">MODULES</div>`;
    if (modules && modules.length > 0) {
        const sortedModules = [...modules].sort((a, b) => a.id - b.id);
        sortedModules.forEach(module => {
            const isSelected = selectedModuleId === module.id;
            html += `<div class="sidebar-item-card${isSelected ? ' selected' : ''}" data-module-id="${module.id}">
  <span class="sidebar-item-title">${module.title}</span>
  ${(role === 'admin' || role === 'instructor') ? `<button class="sidebar-delete-btn" data-id="${module.id}" title="Delete Module"><span class="material-icons">delete_outline</span></button>` : ''}
</div>`;
        });
    } else {
        html += '<div class="sidebar-item-empty">No modules yet.</div>';
    }
    html += '</div>';
    html += `<div class="sidebar-subsection-header">ASSIGNMENTS</div>`;
    if (assignments && assignments.length > 0) {
        assignments.forEach(assignment => {
            const isAssignmentSelected = selectedAssignmentId === assignment.id;
            html += `<div class="sidebar-item-card${isAssignmentSelected ? ' selected' : ''}" data-assignment-id="${assignment.id}">
  <span class="sidebar-item-title">${assignment.title}</span>
</div>`;
        });
    } else {
        html += '<div class="sidebar-item-empty">No assignments yet.</div>';
    }
    sidebarList.innerHTML = html;
    // Re-attach delete button event listeners after every render
    sidebarList.querySelectorAll('.sidebar-delete-btn').forEach(btn => {
      btn.onclick = function(e) {
        e.stopPropagation();
        if (confirm('Delete this module?')) {
          deleteModule(btn.getAttribute('data-id'));
        }
      };
    });
    // Restore event delegation for sidebar clicks
    sidebarList.onclick = function(e) {
        console.log('[DEBUG] sidebarList.onclick fired');
        const moduleCard = e.target.closest('.sidebar-item-card[data-module-id]');
        if (moduleCard) {
            const modId = parseInt(moduleCard.getAttribute('data-module-id'));
            console.log('[DEBUG] Module card clicked, modId:', modId);
            window._sidebarState.selectedModuleId = modId;
            window._sidebarState.selectedLessonId = null;
            window._sidebarState.selectedAssignmentId = null;
            renderSidebarWithAssignments(window._modules, window._assignments, modId, null, null);
            fetchAllModuleFiles(window._modules, renderMainContent, modId, null);
            return;
        }
        const assignmentCard = e.target.closest('.sidebar-item-card[data-assignment-id]');
        if (assignmentCard) {
            const assignmentId = parseInt(assignmentCard.getAttribute('data-assignment-id'));
            window._sidebarState.selectedModuleId = null;
            window._sidebarState.selectedLessonId = null;
            window._sidebarState.selectedAssignmentId = assignmentId;
            renderSidebarWithAssignments(window._modules, window._assignments, null, null, assignmentId);
            showAssignmentDetails(assignmentId);
            return;
        }
    };
}

// Track expanded modules
let expandedModules = new Set();

// Fetch all module files before rendering main content
async function fetchAllModuleFiles(modules, callback, selectedModuleId, selectedLessonId) {
  window._moduleFiles = {};
  const fetches = modules.map(module =>
    fetch(`${API_URL}/modules/${module.id}/files`, {
      headers: {
        'X-User-Email': localStorage.getItem('email') || '',
        'X-User-Role': localStorage.getItem('role') || ''
      }
    })
    .then(res => res.json())
    .then(files => { window._moduleFiles[module.id] = files; })
  );
  await Promise.all(fetches);
  callback(modules, selectedModuleId, selectedLessonId);
}

// Add state for video section expansion
let isVideoSectionOpen = false;

function renderMainContent(modules, selectedModuleId, selectedLessonId) {
  console.log('[DEBUG] renderMainContent called', {selectedModuleId, selectedLessonId});
  if (selectedModuleId !== null && selectedModuleId !== undefined) selectedModuleId = parseInt(selectedModuleId);
  console.log('[DEBUG] renderMainContent selectedModuleId:', selectedModuleId);
  const content = document.getElementById('lms-content');
  if (!content) return;
  const userRole = localStorage.getItem('role');
  const sortedModules = [...modules].sort((a, b) => a.id - b.id);
  const module = sortedModules.find(m => m.id === selectedModuleId);
  // Main content card (reference structure)
  let courseInfoHtml = '';
  if (currentCourse) {
    // Use backend API endpoint for image
    let imgSrc = `http://localhost:5001/api/courses/${courseId}/image`;
    courseInfoHtml = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center mb-10">
        <img alt="${currentCourse.title}" class="w-28 h-28 rounded-lg object-cover mr-8 mb-4 sm:mb-0 border border-gray-200" src="${imgSrc}" onerror="this.onerror=null;this.src='/course-recommendations/images/a2000-logo.jpeg';" />
        <div>
          <h1 class="text-3xl font-bold text-[var(--text-primary)] mb-2">${currentCourse.title}</h1>
          <p class="text-[var(--text-secondary)] text-sm mb-1 italic">${currentCourse.description || 'No description available.'}</p>
          <p class="text-[var(--text-secondary)] text-sm">By ${currentCourse.author || 'A2000 Solutions'}</p>
        </div>
      </div>
    `;
  }
  // Collapsible video section
  let courseVideoHtml = `
    <div class="mb-8">
      <div class="p-4 bg-violet-50 border border-violet-200 rounded-lg flex items-center justify-between cursor-pointer hover:bg-violet-100 transition-colors" id="course-intro-video-toggle">
        <div class="flex items-center">
          <span class="material-icons text-violet-600 mr-3">play_circle_outline</span>
          <span class="font-medium text-violet-700">Course Introduction Video</span>
        </div>
        <span class="material-icons text-violet-600">${isVideoSectionOpen ? 'expand_less' : 'expand_more'}</span>
      </div>
      <div id="course-intro-video-content" style="display:${isVideoSectionOpen ? 'block' : 'none'};margin-top:1.2em;">
        ${renderYouTubeSection(currentCourse)}
      </div>
    </div>
  `;
  // Modules section (reference structure)
  let modulesHtml = '<div class="space-y-5">';
  sortedModules.forEach(m => {
    console.log('[DEBUG] module id:', m.id, 'selectedModuleId:', selectedModuleId);
    const isActive = m.id === selectedModuleId;
    const lessons = m.lessons || [];
    const totalLessons = lessons.length;
    const doneLessons = lessons.filter(l => isLessonDone(l.id)).length;
    const lessonProgress = totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0;
    modulesHtml += `
      <div class="p-5 border ${isActive ? 'border-indigo-300 bg-indigo-50' : 'border-[var(--border-color)]'} rounded-lg w-full min-h-[180px] transition-all duration-200">
        <div class="flex items-center justify-between cursor-pointer${isActive ? ' mb-5' : ''}" data-module-id="${m.id}">
          <div class="flex items-center min-w-0">
            <span class="material-icons ${isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'} mr-3">${isActive ? 'folder_open' : 'folder'}</span>
            <span class="font-medium ${isActive ? 'text-indigo-700' : 'text-[var(--text-primary)]'} truncate max-w-[220px] block">${m.title}</span>
          </div>
          <div class="flex items-center">
            <span class="text-sm ${isActive ? 'text-indigo-600' : 'text-[var(--text-secondary)]'} mr-3">${doneLessons}/${totalLessons} lessons done</span>
            <span class="material-icons ${isActive ? 'text-[var(--brand-primary)]' : 'text-gray-500'}">${isActive ? 'expand_more' : 'chevron_right'}</span>
              </div>
            </div>
        <div class="w-full h-2 bg-gray-200 rounded-full mt-2 mb-2">
          <div class="h-2 rounded-full" style="width: ${lessonProgress}%; background: linear-gradient(90deg, #10b981 0%, #60a5fa 100%);"></div>
          </div>
        ${isActive ? `
          <div class="module-expanded-content" style="margin-top: 1.5rem; padding: 1.5rem; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 16px; border: 1px solid rgba(99,102,241,0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
            
            ${(userRole === 'admin' || userRole === 'instructor') ? `
              <div class="file-upload-section" style="margin-bottom: 2rem;">
                <h3 style="font-size: 1.1rem; font-weight: 600; color: #1e293b; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                  <i class="fas fa-cloud-upload-alt" style="color: #6366f1;"></i>
                  Upload Module Files
                </h3>
                <form class="module-file-upload-form" data-module-id="${m.id}" enctype="multipart/form-data">
                  <div class="custom-file-drop" tabindex="0" style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; background: white; transition: all 0.3s ease; position: relative; overflow: hidden;">
                    <div class="upload-icon" style="font-size: 2.5rem; color: #94a3b8; margin-bottom: 1rem;">
                      <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <div class="upload-text">
                      <span class="file-drop-filename" style="font-weight: 600; color: #6366f1; display: block; margin-bottom: 0.5rem;"></span>
                      <span style="color: #64748b; font-size: 0.9rem;">Drag & drop files here or <span style="color: #6366f1; text-decoration: underline; cursor: pointer; font-weight: 500;">click to browse</span></span>
                    </div>
                    <input type="file" class="module-file-input" style="display: none;" />
                  </div>
                  <div style="display: flex; align-items: center; gap: 1rem; margin-top: 1rem;">
                    <button type="submit" class="btn btn-primary" style="background: linear-gradient(135deg, #6366f1 0%, #60a5fa 100%); color: white; border: none; border-radius: 10px; padding: 0.75rem 1.5rem; font-weight: 600; font-size: 0.9rem; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(99,102,241,0.2); display: flex; align-items: center; gap: 0.5rem;">
                      <i class="fas fa-upload"></i>
                      Upload File
                    </button>
                    <span class="module-upload-status" style="color: #6366f1; font-size: 0.9rem; font-weight: 500;"></span>
                  </div>
                </form>
              </div>
            ` : ''}
            
            <div class="files-section">
              <h3 style="font-size: 1.1rem; font-weight: 600; color: #1e293b; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-folder-open" style="color: #6366f1;"></i>
                Module Files
              </h3>
              
              ${((window._moduleFiles && window._moduleFiles[m.id]) && window._moduleFiles[m.id].length > 0) ? `
                <div class="file-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
                  ${window._moduleFiles[m.id].map(file => `
                    <div class="file-item" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s ease; hover: box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                      <div class="file-info" style="display: flex; align-items: center; gap: 0.75rem; flex: 1;">
                        <div class="file-icon" style="width: 40px; height: 40px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6366f1;">
                          <i class="fas fa-file-alt"></i>
                        </div>
                        <div class="file-details">
                          <div class="file-name" style="font-weight: 600; color: #1e293b; margin-bottom: 0.25rem;">${file.filename}</div>
                          <div class="file-meta" style="font-size: 0.8rem; color: #64748b;">Uploaded by ${file.uploaded_by} • ${file.upload_date}</div>
                        </div>
                      </div>
                      <div class="file-actions" style="display: flex; align-items: center; gap: 0.5rem;">
                        <button class="download-file-btn" data-file-id="${file.id}" data-filename="${file.filename}" style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; border: none; border-radius: 8px; padding: 0.5rem 1rem; font-weight: 500; font-size: 0.85rem; transition: all 0.2s ease; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 2px 8px rgba(16,185,129,0.2);">
                          <i class="fas fa-download"></i>
                          Download
                        </button>
                        ${(userRole === 'admin' || userRole === 'instructor') ? `
                          <button class="delete-file-btn" data-file-id="${file.id}" style="background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); color: white; border: none; border-radius: 8px; padding: 0.5rem 1rem; font-weight: 500; font-size: 0.85rem; transition: all 0.2s ease; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 2px 8px rgba(239,68,68,0.2);">
                            <i class="fas fa-trash"></i>
                            Delete
                          </button>
                        ` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="empty-state" style="text-align: center; padding: 2rem; background: white; border: 1px solid #e2e8f0; border-radius: 12px;">
                  <div class="empty-icon" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;">
                    <i class="fas fa-folder-open"></i>
                  </div>
                  <div class="empty-text" style="color: #64748b; font-size: 0.95rem;">
                    ${(userRole === 'admin' || userRole === 'instructor') ? 'No files uploaded yet. Upload the first file to get started!' : 'No files available for this module yet.'}
                  </div>
                </div>
              `}
            </div>
          </div>
        ` : ''}
      </div>`;
  });
  modulesHtml += '</div>';
    content.innerHTML = `
            ${courseInfoHtml}
            ${courseVideoHtml}
            ${modulesHtml}
  `;
  attachDownloadHandlers();
  // Add expand/collapse logic for video section
  const videoToggle = document.getElementById('course-intro-video-toggle');
  if (videoToggle) {
    videoToggle.onclick = function() {
      isVideoSectionOpen = !isVideoSectionOpen;
      renderMainContent(window._modules, selectedModuleId, selectedLessonId);
      renderSidebarWithAssignments(
        window._modules,
        window._assignments,
        window._sidebarState.selectedModuleId,
        window._sidebarState.selectedLessonId,
        window._sidebarState.selectedAssignmentId
      );
    };
  }
  // Add event listeners for download file
  content.querySelectorAll('.download-file-btn').forEach(btn => {
    btn.onclick = async function(e) {
      e.preventDefault();
      console.log('[DEBUG] Download button clicked - NEW METHOD', new Date().toISOString());
      const fileId = btn.getAttribute('data-file-id');
      console.log('[DEBUG] File ID:', fileId);
      try {
        const res = await fetch(`${API_URL}/files/${fileId}`, {
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
        // Create a more direct download approach
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log('[DEBUG] Download initiated for:', filename);
      } catch (err) {
        console.error('Download failed:', err);
        showToast('Download failed', 'error');
      }
    };
  });
  // Add event listeners for delete file
  content.querySelectorAll('.delete-file-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.stopPropagation();
      const fileId = btn.getAttribute('data-file-id');
      if (confirm('Delete this file?')) {
    const userRole = localStorage.getItem('role');
        fetch(`${API_URL}/files/${fileId}`, {
                    method: 'DELETE',
                    headers: {
                      'X-User-Role': userRole || '',
                      'X-User-Email': localStorage.getItem('email') || ''
                    }
                  })
                  .then(res => res.json())
                  .then(data => {
                    if (data.message === 'File deleted') {
            // Refresh the module files list
            fetchAllModuleFiles(window._modules, renderMainContent, selectedModuleId, null);
                    } else {
                      alert(data.message || 'Failed to delete file');
                    }
        })
        .catch(() => alert('Failed to delete file'));
                }
              };
            });
  // Add event listeners for file upload
  content.querySelectorAll('.module-file-upload-form').forEach(form => {
    form.onsubmit = function(e) {
        e.preventDefault();
      const fileInput = form.querySelector('.module-file-input');
        const file = fileInput.files[0];
      const statusSpan = form.querySelector('.module-upload-status');
            if (!file) {
                statusSpan.textContent = 'No file selected.';
                return;
            }
            const userRole = localStorage.getItem('role');
      const moduleId = form.getAttribute('data-module-id');
        const formData = new FormData();
        formData.append('file', file);
        statusSpan.textContent = 'Uploading...';
      fetch(`${API_URL}/modules/${moduleId}/files`, {
          method: 'POST',
          headers: {
            'X-User-Role': userRole || '',
            'X-User-Email': localStorage.getItem('email') || ''
          },
          body: formData
        })
        .then(res => res.json())
        .then(data => {
          if (data.file) {
            statusSpan.textContent = 'Uploaded!';
            fileInput.value = '';
            const fileNameSpan = form.querySelector('.file-drop-filename');
            if (fileNameSpan) fileNameSpan.textContent = '';
            // Re-fetch modules and update sidebar and main content
            fetch(`${API_URL}/courses/${courseId}`, {
                headers: { 'X-User-Email': localStorage.getItem('email') || '' }
            })
            .then(res => res.json())
            .then(course => {
                window._modules = course.modules;
                fetchAllModuleFiles(window._modules, renderMainContent, moduleId, null);
                renderSidebarWithAssignments(window._modules, window._assignments, moduleId, null);
                setupModuleManagement(window._modules);
            });
          } else {
            statusSpan.textContent = data.message || 'Upload failed';
          }
        })
        .catch(() => {
                statusSpan.textContent = 'Upload failed';
            });
        };
    // Drag and drop logic
    const drop = form.querySelector('.custom-file-drop');
    const fileInput = form.querySelector('.module-file-input');
    const fileNameSpan = form.querySelector('.file-drop-filename');
    if (drop && fileInput && fileNameSpan) {
      drop.addEventListener('click', () => fileInput.click());
      drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
      fileInput.addEventListener('change', () => {
                fileNameSpan.textContent = fileInput.files.length ? fileInput.files[0].name : '';
        });
        drop.addEventListener('dragover', e => {
          e.preventDefault();
          drop.style.borderColor = '#6366f1';
          drop.style.background = 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)';
          drop.style.transform = 'scale(1.02)';
        });
        drop.addEventListener('dragleave', e => {
          e.preventDefault();
          drop.style.borderColor = '#cbd5e1';
          drop.style.background = 'white';
          drop.style.transform = 'scale(1)';
        });
        drop.addEventListener('drop', e => {
          e.preventDefault();
          drop.style.borderColor = '#cbd5e1';
          drop.style.background = 'white';
          drop.style.transform = 'scale(1)';
          if (e.dataTransfer.files && e.dataTransfer.files.length) {
          fileInput.files = e.dataTransfer.files;
          fileNameSpan.textContent = fileInput.files[0].name;
            const event = new Event('change', { bubbles: true });
          fileInput.dispatchEvent(event);
        }
      });
    }
  });
  setupYouTubeFormHandler(currentCourse);
  // Add expand/collapse logic for module cards (header only)
  content.querySelectorAll('.flex.items-center.justify-between.cursor-pointer[data-module-id]').forEach(header => {
    header.onclick = function(e) {
      // Prevent clicks on child buttons (like delete, download, etc.) from toggling
      if (e.target.closest('button')) return;
      const modId = parseInt(header.getAttribute('data-module-id'));
      const currentlyExpanded = (selectedModuleId === modId);
      renderMainContent(window._modules, currentlyExpanded ? null : modId, null);
      if (window._assignments && window._assignments.length > 0) {
        renderSidebarWithAssignments(window._modules, window._assignments, currentlyExpanded ? null : modId, null);
        setupModuleManagement(window._modules);
      } else {
        loadAssignments().then(assignments => {
          window._assignments = assignments;
          renderSidebarWithAssignments(window._modules, assignments, currentlyExpanded ? null : modId, null);
          setupModuleManagement(window._modules);
        });
      }
    };
  });
}

// --- Initial Load ---
async function loadModules(modules) {
  window._modules = modules;
  const assignments = await loadAssignments();
  window._assignments = assignments;
  console.log('[DEBUG] Loaded assignments:', assignments);
  renderSidebarWithAssignments(window._modules, window._assignments, null, null);
  setupModuleManagement(window._modules);
  fetchAllModuleFiles(window._modules, renderMainContent, null, null);
}

// --- Helper to always update filename on file input change ---
function attachFileInputHandlers() {
    document.querySelectorAll('.module-file-upload-form').forEach(fileForm => {
        const fileInput = fileForm.querySelector('.module-file-input');
        const fileNameSpan = fileForm.querySelector('.file-drop-filename');
        if (fileInput && fileNameSpan) {
            fileInput.onchange = function() {
                fileNameSpan.textContent = fileInput.files.length ? fileInput.files[0].name : '';
            };
        }
    });
}

// Helper to attach download button handler after file list render
function attachDownloadHandlers() {
  console.log('[DEBUG] attachDownloadHandlers called - new method');
  document.querySelectorAll('.download-btn, .download-file-btn').forEach(btn => {
    btn.onclick = async function(e) {
      e.preventDefault();
      const fileId = btn.getAttribute('data-file-id');
      console.log('[DEBUG] Download button clicked, fileId:', fileId);
      if (fileId) {
        try {
          const res = await fetch(`${API_URL}/files/${fileId}`, {
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
          // Create a more direct download approach
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          console.log('[DEBUG] Download initiated for:', filename);
        } catch (err) {
          console.error('Download failed:', err);
          showToast('Download failed', 'error');
        }
      }
    };
  });
}

function setupSidebarCollapse() {
    const sidebar = document.getElementById('lms-sidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    if (!sidebar || !toggleBtn) return;
    // Restore state from localStorage
    let isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
        toggleBtn.setAttribute('aria-label', 'Expand sidebar');
        toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    } else {
        sidebar.classList.remove('collapsed');
        toggleBtn.setAttribute('aria-label', 'Collapse sidebar');
        toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    }
    toggleBtn.onclick = function() {
        isCollapsed = !isCollapsed;
        sidebar.classList.toggle('collapsed', isCollapsed);
        localStorage.setItem('sidebarCollapsed', isCollapsed);
        if (isCollapsed) {
            toggleBtn.setAttribute('aria-label', 'Expand sidebar');
            toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        } else {
            toggleBtn.setAttribute('aria-label', 'Collapse sidebar');
            toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        }
    };
}
document.addEventListener('DOMContentLoaded', setupSidebarCollapse); 

// Remove miniplayer logic and restore in-page YouTube section
// (No need for ensureYTMiniplayer or showYTMiniplayer)
// The event listener for #course-intro-video-toggle should do nothing or just scroll to the video section if desired
// ... existing code ... 

function renderYouTubeSection(course) {
  const userRole = localStorage.getItem('role');
  let html = '';
  html += `<section id="course-video-section" style="max-width:700px;margin:0 auto 2em auto;padding:2em 2.5em 2em 2.5em;background:#fff;border-radius:16px;box-shadow:0 2px 16px rgba(255,0,0,0.07),0 1.5px 6px rgba(0,0,0,0.03);">
      <h2 style="font-size:1.3em;font-weight:700;margin-bottom:0.7em;display:flex;align-items:center;gap:0.5em;"><span class='material-icons' style='color:#ff0000;'>play_circle</span> Course Introduction Video</h2>`;
  if (course.youtube_url) {
      const match = course.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
      const videoId = match ? match[1] : '';
      if (videoId) {
          html += `<div class="video-container" style="display:flex;justify-content:center;margin-bottom:1em;">
              <iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>`;
      }
  }
  if (userRole === 'admin' || userRole === 'instructor') {
      html += `<form id="yt-link-form" style="display:flex;gap:0.5em;align-items:center;justify-content:center;margin-top:1em;">
          <input type="url" id="yt-link-input" value="${course.youtube_url ? course.youtube_url : ''}" placeholder="Paste YouTube link here" style="flex:1;max-width:350px;padding:0.5em 1em;border-radius:6px;border:1px solid #ccc;font-size:1em;" required>
          <button type="submit" class="btn btn-primary" style="padding:0.5em 1.2em;border-radius:6px;background:#ff0000;color:#fff;font-weight:600;border:none;cursor:pointer;">Save</button>
      </form>`;
  }
  html += `</section>`;
  return html;
}

// Add form handler logic after rendering main content
function setupYouTubeFormHandler(course) {
  const userRole = localStorage.getItem('role');
  if ((userRole === 'admin' || userRole === 'instructor') && document.getElementById('yt-link-form')) {
    document.getElementById('yt-link-form').onsubmit = function(e) {
      e.preventDefault();
      const link = document.getElementById('yt-link-input').value.trim();
      if (!link) return;
      fetch(`${API_URL}/courses/${course.id}/youtube`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': localStorage.getItem('email') || '',
          'X-User-Role': userRole
        },
        body: JSON.stringify({ youtube_url: link })
      })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          alert('YouTube link updated!');
          // Re-render the section with the new link
          currentCourse.youtube_url = link;
          renderMainContent(window._modules, null, null);
        } else {
          alert(data.message || 'Failed to update YouTube link');
        }
      })
      .catch(() => alert('Failed to update YouTube link'));
    };
  }
}

window.showModuleModal = showModuleModal;

function setupAssignmentModal() {
    const modal = document.getElementById('assignment-modal');
    modal.className = 'modal-overlay';
    const closeModal = document.getElementById('close-assignment-modal');
    const form = document.getElementById('assignment-form');
    closeModal.onclick = function() { modal.classList.remove('active'); };
    modal.onclick = function(e) { if (e.target === modal) modal.classList.remove('active'); };
    form.onsubmit = async function(e) {
        e.preventDefault();
        const title = document.getElementById('assignment-title').value;
        const description = document.getElementById('assignment-description').value;
        const due_date = document.getElementById('assignment-due-date').value;
        const fileInput = document.getElementById('assignment-file');
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('due_date', due_date);
        formData.append('course_id', courseId);
        if (fileInput.files[0]) formData.append('file', fileInput.files[0]);
        const res = await fetch(`${API_URL}/assignments`, {
            method: 'POST',
            body: formData,
            headers: { 'X-User-Email': localStorage.getItem('email') || '', 'X-User-Role': localStorage.getItem('role') || '' }
        });
        if (res.ok) {
            showToast('Assignment created!', 'success');
            modal.classList.remove('active');
            // Reload assignments and refresh sidebar
            loadAssignments().then(assignments => {
                window._assignments = assignments;
                renderSidebarWithAssignments(window._modules, assignments, null, null);
            });
            form.reset();
        } else {
            showToast('Failed to create assignment.', 'error');
        }
    };
}

function showAssignmentModal() {
    const modal = document.getElementById('assignment-modal');
    modal.classList.add('active');
    document.getElementById('assignment-modal-title').textContent = 'Add Assignment';
    document.getElementById('assignment-title').value = '';
    document.getElementById('assignment-description').value = '';
    document.getElementById('assignment-due-date').value = '';
    document.getElementById('assignment-file').value = '';
}

// --- Deadline Countdown Helper ---
function getCountdownString(dueDateStr) {
    if (!dueDateStr) return '';
    const due = new Date(dueDateStr);
    const now = new Date();
    const diff = due - now;
    
    if (diff <= 0) {
        return '<span style="color: #ef4444; font-weight: 600; background: rgba(239,68,68,0.1); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.875rem;"><i class="fas fa-clock"></i> Deadline passed</span>';
    }
    
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    const secs = Math.floor((diff / 1000) % 60);
    
    // Color coding based on time remaining
    let color, bgColor, icon;
    if (hours < 1) {
        // Less than 1 hour - urgent (red)
        color = '#ef4444';
        bgColor = 'rgba(239,68,68,0.1)';
        icon = 'fa-exclamation-triangle';
    } else if (hours < 24) {
        // Less than 24 hours - warning (orange)
        color = '#f59e0b';
        bgColor = 'rgba(245,158,11,0.1)';
        icon = 'fa-clock';
    } else {
        // More than 24 hours - normal (blue)
        color = '#6366f1';
        bgColor = 'rgba(99,102,241,0.1)';
        icon = 'fa-calendar-alt';
    }
    
    return `<span style="color: ${color}; font-weight: 600; background: ${bgColor}; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="fas ${icon}"></i>${hours}h ${mins}m ${secs}s left</span>`;
}

// --- Live update for all countdowns ---
function startAssignmentCountdowns() {
    setInterval(() => {
        document.querySelectorAll('[data-due-date][data-assignment-id]').forEach(el => {
            const due = el.getAttribute('data-due-date');
            el.innerHTML = getCountdownString(due);
        });
    }, 1000);
}

async function loadAssignments() {
    try {
        const res = await fetch(`${API_URL}/assignments?course_id=${courseId}`, {
            headers: {
                'X-User-Email': localStorage.getItem('email') || '',
                'X-User-Role': localStorage.getItem('role') || ''
            }
        });
        if (!res.ok) {
            console.error('Could not load assignments');
            return [];
        }
        const assignments = await res.json();
        const role = localStorage.getItem('role');
        // Get submissions for students
        if (role === 'student') {
            for (const assignment of assignments) {
                const subRes = await fetch(`${API_URL}/assignments/${assignment.id}/my-submission`, {
                    headers: {
                        'X-User-Email': localStorage.getItem('email') || '',
                        'X-User-Role': localStorage.getItem('role') || ''
                    }
                });
                if (subRes.ok) {
                    assignment.mySubmission = await subRes.json();
                }
            }
        }
        return assignments;
    } catch (e) {
        console.error('Error loading assignments:', e);
        return [];
    }
}

function attachAssignmentHandlers() {
    // Expand/collapse assignment details
    document.querySelectorAll('.expand-assignment-btn').forEach(btn => {
        btn.onclick = function() {
            const id = btn.getAttribute('data-assignment-id');
            const details = document.getElementById(`assignment-details-${id}`);
            if (details) details.style.display = details.style.display === 'none' ? 'block' : 'none';
        };
    });
    // Student submit
    document.querySelectorAll('.submit-assignment-btn').forEach(btn => {
        btn.onclick = function() {
            const assignmentId = btn.getAttribute('data-assignment-id');
            showAssignmentSubmissionModal(assignmentId);
        };
    });
    // Instructor view submissions
    document.querySelectorAll('.view-submissions-btn').forEach(btn => {
        btn.onclick = function() {
            const assignmentId = btn.getAttribute('data-assignment-id');
            window.location.href = `assignment-submissions.html?assignment_id=${assignmentId}`;
        };
    });
    // Instructor delete assignment
    document.querySelectorAll('.delete-assignment-btn').forEach(btn => {
        btn.onclick = function() {
            const assignmentId = btn.getAttribute('data-assignment-id');
            if (confirm('Are you sure you want to delete this assignment? This action cannot be undone and will also delete all student submissions.')) {
                deleteAssignment(assignmentId);
            }
        };
    });
}

function renderAssignmentCard(assignment, submission, role) {
    const due = assignment.due_date ? new Date(assignment.due_date).toLocaleString() : 'No due date';
    const dueCountdown = assignment.due_date ? `<div class="countdown-container"><strong>Time Left:</strong> <span class="countdown-timer" data-due-date="${assignment.due_date}" data-assignment-id="${assignment.id}">${getCountdownString(assignment.due_date)}</span></div>` : '';
    
    let html = `<div class="modern-card assignment-card" style="background: rgba(255,255,255,0.92); backdrop-filter: blur(10px) saturate(1.2); box-shadow: 0 8px 32px rgba(44,62,80,0.13), 0 1.5px 8px rgba(99,102,241,0.07); border: 1.5px solid rgba(99,102,241,0.10); border-radius: 18px; overflow: hidden; transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out; margin-bottom: 1.5rem; cursor: pointer;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 16px 48px rgba(99,102,241,0.18), 0 2px 12px rgba(44,62,80,0.10)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 32px rgba(44,62,80,0.13), 0 1.5px 8px rgba(99,102,241,0.07)'">
        <div class="assignment-header" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; padding: 1.5rem 1.5rem 1rem 1.5rem; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-bottom: 1px solid rgba(99,102,241,0.08);">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1 0%, #60a5fa 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.1rem;">
                    <i class="fas fa-tasks"></i>
                </div>
                <div>
                    <span class="font-bold text-indigo-700 text-lg mb-1" style="font-size: 1.25rem; font-weight: 700; color: #1e293b; line-height: 1.3;">${assignment.title}</span>
                    <div style="font-size: 0.875rem; color: #64748b; margin-top: 0.25rem;">Assignment</div>
                </div>
            </div>
            <button class="expand-assignment-btn btn btn-sm" data-assignment-id="${assignment.id}" style="background: linear-gradient(135deg, #6366f1 0%, #60a5fa 100%); color: white; border: none; border-radius: 12px; padding: 0.5rem 1rem; font-weight: 600; font-size: 0.875rem; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(99,102,241,0.15);" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(99,102,241,0.25)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(99,102,241,0.15)'">Details</button>
        </div>
        <div class="assignment-details" id="assignment-details-${assignment.id}" style="display:none; padding: 1.5rem;">
            <div style="background: #f8fafc; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; border-left: 4px solid #6366f1;">
                <p style="color: #374151; line-height: 1.6; margin-bottom: 0.75rem;">${assignment.description || 'No description provided.'}</p>
                <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: #6b7280; font-size: 0.875rem;">
                        <i class="fas fa-calendar-alt" style="color: #6366f1;"></i>
                        <span><strong>Due:</strong> ${due}</span>
                    </div>
                    ${assignment.file_path ? `
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <a href="/${assignment.file_path}" download style="display: flex; align-items: center; gap: 0.5rem; color: #6366f1; text-decoration: none; font-weight: 500; padding: 0.5rem 0.75rem; border-radius: 8px; background: rgba(99,102,241,0.1); transition: all 0.2s ease;" onmouseover="this.style.background='rgba(99,102,241,0.15)'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(99,102,241,0.1)'; this.style.transform='translateY(0)'">
                            <i class="fas fa-download"></i>
                            Download Assignment File
                        </a>
                    </div>` : ''}
                </div>
            </div>
            ${dueCountdown ? `<div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; border: 1px solid #f59e0b;">
                ${dueCountdown}
            </div>` : ''}
    `;
    
    if (role === 'student') {
        const now = new Date();
        const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
        const beforeDeadline = !dueDate || now <= dueDate;
        
        if (submission && submission.id) {
            const submittedAt = new Date(submission.submitted_at).toLocaleString();
            const onTime = dueDate ? new Date(submission.submitted_at) <= dueDate : true;
            
            html += `<div style="background: ${onTime ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'}; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; border: 1px solid ${onTime ? '#22c55e' : '#ef4444'};">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                    <div style="width: 32px; height: 32px; background: ${onTime ? '#22c55e' : '#ef4444'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                        <i class="fas ${onTime ? 'fa-check' : 'fa-exclamation-triangle'}"></i>
                    </div>
                    <div>
                        <div style="font-weight: 600; color: ${onTime ? '#166534' : '#991b1b'};">Status: ${onTime ? 'On Time' : 'Late'}</div>
                        <div style="font-size: 0.875rem; color: #6b7280;">Submitted: ${submittedAt}</div>
                    </div>
                </div>
                ${submission.text_answer ? `
                <div style="background: white; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; border: 1px solid rgba(0,0,0,0.1);">
                    <div style="font-weight: 600; color: #374151; margin-bottom: 0.5rem;">Your Answer:</div>
                    <div style="color: #4b5563; line-height: 1.5;">${submission.text_answer.replace(/</g, '&lt;')}</div>
                </div>` : ''}
                ${submission.file_path ? `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <a href="#" onclick="downloadSubmissionFile(${assignment.id},${submission.id}); return false;" style="display: flex; align-items: center; gap: 0.5rem; color: #6366f1; text-decoration: none; font-weight: 500; padding: 0.5rem 0.75rem; border-radius: 8px; background: rgba(99,102,241,0.1); transition: all 0.2s ease;">
                        <i class="fas fa-download"></i>
                        Download Your Submission
                    </a>
                </div>` : ''}
            </div>`;
            
            if (beforeDeadline) {
                html += `<button class="btn submit-assignment-btn" data-assignment-id="${assignment.id}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 12px; padding: 0.75rem 1.5rem; font-weight: 600; font-size: 0.875rem; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(16,185,129,0.15); display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.transform='translateY(-2px) scale(1.02)'; this.style.boxShadow='0 8px 16px rgba(16,185,129,0.25)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 2px 8px rgba(16,185,129,0.15)'">
                    <i class="fas fa-edit"></i>
                    Edit Submission
                </button>`;
            }
        } else if (beforeDeadline) {
            html += `<button class="btn submit-assignment-btn" data-assignment-id="${assignment.id}" style="background: linear-gradient(135deg, #6366f1 0%, #60a5fa 100%); color: white; border: none; border-radius: 12px; padding: 0.75rem 1.5rem; font-weight: 600; font-size: 0.875rem; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(99,102,241,0.15); display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.transform='translateY(-2px) scale(1.02)'; this.style.boxShadow='0 8px 16px rgba(99,102,241,0.25)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 2px 8px rgba(99,102,241,0.15)'">
                <i class="fas fa-paper-plane"></i>
                Submit Assignment
            </button>`;
        } else {
            html += `<div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 12px; padding: 1rem; border: 1px solid #ef4444; display: flex; align-items: center; gap: 0.75rem;">
                <i class="fas fa-clock" style="color: #ef4444; font-size: 1.1rem;"></i>
                <span style="color: #991b1b; font-weight: 600;">Deadline has passed. You cannot submit.</span>
            </div>`;
        }
    } else if (role === 'admin' || role === 'instructor') {
        html += `<div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
            <button class="btn view-submissions-btn" data-assignment-id="${assignment.id}" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none; border-radius: 12px; padding: 0.75rem 1.5rem; font-weight: 600; font-size: 0.875rem; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(139,92,246,0.15); display: flex; align-items: center; gap: 0.5rem; flex: 1;" onmouseover="this.style.transform='translateY(-2px) scale(1.02)'; this.style.boxShadow='0 8px 16px rgba(139,92,246,0.25)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 2px 8px rgba(139,92,246,0.15)'">
                <i class="fas fa-users"></i>
                View Submissions
            </button>
            <button class="btn delete-assignment-btn" data-assignment-id="${assignment.id}" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 12px; padding: 0.75rem 1.5rem; font-weight: 600; font-size: 0.875rem; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(239,68,68,0.15); display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.transform='translateY(-2px) scale(1.02)'; this.style.boxShadow='0 8px 16px rgba(239,68,68,0.25)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 2px 8px rgba(239,68,68,0.15)'">
                <i class="fas fa-trash"></i>
                Delete
            </button>
        </div>`;
    }
    
    html += '</div></div>';
    return html;
}

function showAssignmentSubmissionModal(assignmentId) {
    let modal = document.getElementById('assignment-submission-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'assignment-submission-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.6)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.style.backdropFilter = 'blur(8px)';
        modal.innerHTML = `
            <div style="background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); padding: 2rem; border-radius: 20px; max-width: 500px; width: 90%; position: relative; box-shadow: 0 25px 50px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2); animation: modalSlideIn 0.3s ease-out;">
                <button id="close-assignment-submission-modal" style="position:absolute; top:1rem; right:1rem; font-size:1.5em; background: none; border: none; cursor: pointer; color: #6b7280; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">&times;</button>
                
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1 0%, #60a5fa 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: white; font-size: 1.5rem;">
                        <i class="fas fa-paper-plane"></i>
                    </div>
                    <h3 style="margin-bottom: 0.5rem; font-size: 1.5rem; font-weight: 700; color: #1e293b;" id="submission-modal-title">Submit Assignment</h3>
                    <p style="color: #6b7280; font-size: 0.875rem;">Complete your assignment submission below</p>
                </div>
                
                <form id="assignment-submission-form" style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151; font-size: 0.875rem;">Text Answer</label>
                        <textarea id="submission-text" rows="6" style="width: 100%; padding: 1rem; border: 2px solid #e5e7eb; border-radius: 12px; font-family: inherit; font-size: 0.875rem; resize: vertical; transition: all 0.2s ease; background: #f9fafb;" placeholder="Enter your answer here..."></textarea>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151; font-size: 0.875rem;">Upload File (Optional)</label>
                        <div style="border: 2px dashed #d1d5db; border-radius: 12px; padding: 1.5rem; text-align: center; background: #f9fafb; transition: all 0.2s ease;">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: #9ca3af; margin-bottom: 0.5rem;"></i>
                            <p style="color: #6b7280; margin-bottom: 0.5rem;">Drag and drop your file here, or click to browse</p>
                            <input type="file" id="submission-file" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 8px; background: white;">
                        </div>
                    </div>
                    
                    <button type="submit" style="background: linear-gradient(135deg, #6366f1 0%, #60a5fa 100%); color: white; border: none; border-radius: 12px; padding: 1rem 2rem; font-weight: 600; font-size: 1rem; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(99,102,241,0.2); display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 1rem;">
                        <i class="fas fa-paper-plane"></i>
                        Submit Assignment
                    </button>
                </form>
                
                <div id="submission-status" style="margin-top: 1.5rem; padding: 1rem; border-radius: 12px; font-weight: 500; text-align: center; display: none;"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    } else {
        modal.style.display = 'flex';
    }
    
    // Reset form and status
    document.getElementById('submission-text').value = '';
    document.getElementById('submission-file').value = '';
    const statusDiv = document.getElementById('submission-status');
    statusDiv.textContent = '';
    statusDiv.style.display = 'none';
    document.getElementById('submission-modal-title').textContent = 'Submit Assignment';
    
    // Fetch assignment and previous submission
    fetch(`${API_URL}/assignments/${assignmentId}`, {
        headers: {
            'X-User-Email': localStorage.getItem('email') || '',
            'X-User-Role': localStorage.getItem('role') || ''
        }
    })
    .then(res => res.json())
    .then(assignment => {
        const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
        const now = new Date();
        const beforeDeadline = !dueDate || now <= dueDate;
        
        if (!beforeDeadline) {
            statusDiv.style.display = 'block';
            statusDiv.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
            statusDiv.style.color = '#991b1b';
            statusDiv.style.border = '1px solid #ef4444';
            statusDiv.innerHTML = '<i class="fas fa-clock"></i> Deadline has passed. You cannot submit.';
            document.getElementById('assignment-submission-form').style.display = 'none';
            return;
        }
        
        // Fetch previous submission
        fetch(`${API_URL}/assignments/${assignmentId}/my-submission`, {
            headers: {
                'X-User-Email': localStorage.getItem('email') || '',
                'X-User-Role': localStorage.getItem('role') || ''
            }
        })
        .then(res => res.ok ? res.json() : null)
        .then(submission => {
            if (submission && submission.id) {
                document.getElementById('submission-modal-title').textContent = 'Edit Submission';
                document.getElementById('submission-text').value = submission.text_answer || '';
                // File cannot be pre-filled for security reasons
            }
        });
    });
    
    // Close logic
    document.getElementById('close-assignment-submission-modal').onclick = function() {
        modal.style.display = 'none';
    };
    
    // Close on outside click
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    // Submission logic
    document.getElementById('assignment-submission-form').onsubmit = async function(e) {
        e.preventDefault();
        const text = document.getElementById('submission-text').value.trim();
        const fileInput = document.getElementById('submission-file');
        const file = fileInput.files[0];
        const statusDiv = document.getElementById('submission-status');
        if (!file) {
            statusDiv.style.display = 'block';
            statusDiv.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
            statusDiv.style.color = '#991b1b';
            statusDiv.style.border = '1px solid #ef4444';
            statusDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Please select a file to upload.';
            return;
        }
        const formData = new FormData();
        formData.append('text_answer', text);
        if (file) formData.append('file', file);
        formData.append('assignment_id', assignmentId);
        // Check if editing or new submission
        const isEdit = document.getElementById('submission-modal-title').textContent === 'Edit Submission';
        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `${API_URL}/assignments/${assignmentId}/my-submission` : `${API_URL}/assignments/${assignmentId}/submit`;
        statusDiv.style.display = 'block';
        statusDiv.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
        statusDiv.style.color = '#92400e';
        statusDiv.style.border = '1px solid #f59e0b';
        statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        try {
            const res = await fetch(url, {
                method,
                body: formData,
                headers: { 'X-User-Email': localStorage.getItem('email') || '' }
            });
            if (res.ok) {
                statusDiv.style.background = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
                statusDiv.style.color = '#166534';
                statusDiv.style.border = '1px solid #22c55e';
                statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Submitted successfully!';
                showToast('Assignment submitted successfully!', 'success');
                setTimeout(() => { modal.style.display = 'none'; }, 1500);
                loadAssignments();
            } else {
                statusDiv.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
                statusDiv.style.color = '#991b1b';
                statusDiv.style.border = '1px solid #ef4444';
                statusDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed to submit. Please try again.';
                showToast('Failed to submit assignment.', 'error');
            }
        } catch (err) {
            statusDiv.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
            statusDiv.style.color = '#991b1b';
            statusDiv.style.border = '1px solid #ef4444';
            statusDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Network error. Please try again.';
            showToast('Failed to submit assignment.', 'error');
        }
    };
}

function deleteAssignment(assignmentId) {
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
            // Reload assignments and refresh sidebar
            loadAssignments().then(assignments => {
                window._assignments = assignments;
                renderSidebarWithAssignments(window._modules, assignments, null, null);
            });
        } else {
            showToast(data.message || 'Failed to delete assignment', 'error');
        }
    })
    .catch(err => {
        console.error('Error deleting assignment:', err);
        showToast('Failed to delete assignment. Please try again.', 'error');
    });
}

function showAssignmentDetails(assignmentId) {
    const assignments = window._assignments || [];
    console.log('[DEBUG] showAssignmentDetails called. Assignments:', assignments, 'AssignmentId:', assignmentId);
    const assignment = assignments.find(a => a.id === assignmentId || a.id == assignmentId);
    if (!assignment) {
        console.log('[DEBUG] Assignment not found for id:', assignmentId);
        return;
    }
    const role = localStorage.getItem('role');
    const submission = assignment.mySubmission;
    const content = document.getElementById('lms-content');
    if (!content) return;
    content.innerHTML = renderAssignmentCard(assignment, submission, role);
    attachAssignmentHandlers();
    startAssignmentCountdowns();
}

// Make functions globally available
window.showAssignmentSubmissionModal = showAssignmentSubmissionModal;
window.showAssignmentDetails = showAssignmentDetails; 

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

// Add event delegation for file checkboxes after rendering sidebar
function setupFileDoneCheckboxes() {
    document.querySelectorAll('.file-done-checkbox').forEach(cb => {
        cb.onchange = function(e) {
            const fileId = parseInt(cb.getAttribute('data-file-id'));
            toggleFileDone(fileId);
            // Re-render sidebar to update progress and styles
            renderSidebarWithAssignments(window._modules, window._assignments, window._sidebarState.selectedModuleId, window._sidebarState.selectedAssignmentId, null);
            setupFileDoneCheckboxes();
        };
    });
}

// Call setupFileDoneCheckboxes after rendering sidebar
// ... existing code ...
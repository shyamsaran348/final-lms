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
        document.querySelectorAll('.sidebar-module').forEach(el => {
            const modId = el.getAttribute('data-module-id');
            if (!el.querySelector('.module-actions')) {
                const actions = document.createElement('span');
                actions.className = 'module-actions';
                actions.innerHTML = `<button class='icon-btn delete-module-btn' data-id='${modId}' title='Delete Module' aria-label='Delete module ${modId}'><i class="fa-solid fa-trash"></i></button>`;
                el.appendChild(actions);
            }
        });
        // Remove edit button event handler setup
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
    document.getElementById('module-order').value = module ? module.order : 0;
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
    const order = document.getElementById('module-order').value;
    const release_date = document.getElementById('module-release-date').value;
    // Call backend API to add module
    fetch(`${API_URL}/courses/${courseId}/modules`, {
      method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Role': localStorage.getItem('role') || '',
            'X-User-Email': localStorage.getItem('email') || ''
        },
        body: JSON.stringify({ title, description, order, release_date })
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
function renderSidebar(modules, selectedModuleId, selectedLessonId) {
  const sidebar = document.getElementById('sidebar-modules-list');
  if (!sidebar) return;
  const userRole = localStorage.getItem('role');
  const sortedModules = [...modules].sort((a, b) => a.id - b.id);
  sidebar.innerHTML = `
    <nav class="space-y-2">
      ${sortedModules.map(module => {
        const isActive = selectedModuleId === module.id;
        return `
          <a class="flex items-center justify-between ${isActive ? 'text-[var(--brand-primary)] bg-indigo-50' : 'text-[var(--text-secondary)]'} hover:text-[var(--brand-primary)] hover:bg-indigo-50 p-3 rounded-md transition-colors group" href="#" data-module-id="${module.id}">
            <div class="flex items-center">
              <span class="material-icons mr-3 ${isActive ? 'text-[var(--brand-primary)]' : 'text-gray-400 group-hover:text-[var(--brand-primary)]'}">folder_open</span>
              ${module.title}
      </div>
            ${(userRole === 'admin' || userRole === 'instructor') ? `
              <button class="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-700 delete-module-btn" data-id="${module.id}">
                <span class="material-icons text-lg">delete_outline</span>
              </button>
            ` : ''}
          </a>
        `;
      }).join('')}
    </nav>
  `;
  // Add click handlers for module selection and delete
  sidebar.querySelectorAll('a[data-module-id]').forEach(el => {
    el.onclick = function(e) {
      e.preventDefault();
      const modId = parseInt(this.getAttribute('data-module-id'));
      renderSidebarWithAssignments(window._modules, window._assignments, modId, null);
      renderMainContent(window._modules, modId, null);
    };
  });
  sidebar.querySelectorAll('.delete-module-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.stopPropagation();
      if (confirm('Delete this module?')) {
        deleteModule(btn.getAttribute('data-id'));
      }
    };
  });
}

// --- Sidebar State ---
window._sidebarState = {
  selectedModuleId: null,
  selectedLessonId: null,
  selectedAssignmentId: null
};

function renderSidebarWithAssignments(modules, assignments, selectedModuleId, selectedLessonId, selectedAssignmentId) {
    window._sidebarState.selectedModuleId = selectedModuleId;
    window._sidebarState.selectedLessonId = selectedLessonId;
    window._sidebarState.selectedAssignmentId = selectedAssignmentId;
    const sidebarList = document.getElementById('sidebar-modules-list');
    if (!sidebarList) return;
    const role = localStorage.getItem('role');
    let html = '';
    html += `<div class="sidebar-card" style="background: #f8fafc; border-radius: 16px; box-shadow: 0 2px 8px rgba(44,62,80,0.07); padding: 1.5rem 1.25rem 1.25rem 1.25rem; margin-bottom: 2rem;">
      <h2 style="font-size: 1.15rem; font-weight: 700; color: #374151; margin-bottom: 1.25rem;">Modules & Assignments</h2>
      <div class="sidebar-section" style="margin-bottom: 1.5rem;">
        <h3 style="font-size: 0.95rem; font-weight: 600; color: #6b7280; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Modules</h3>`;
    if (modules && modules.length > 0) {
        modules.forEach(module => {
            const isSelected = selectedModuleId === module.id;
            const hasLessons = module.lessons && module.lessons.length > 0;
            html += `<div class="sidebar-module${isSelected ? ' selected' : ''}" data-module-id="${module.id}" style="margin-bottom: 0.5rem;">`;
            html += `<div class="module-header${isSelected ? ' selected' : ''}" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: ${isSelected ? 'linear-gradient(135deg, #6366f1 0%, #60a5fa 100%)' : '#fff'}; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; border: 1px solid ${isSelected ? 'rgba(99,102,241,0.2)' : '#e5e7eb'};">`;
            html += `<div style="display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-book" style="color: ${isSelected ? 'white' : '#6366f1'}; font-size: 0.875rem;"></i>
                        <span style="font-weight: 600; color: ${isSelected ? 'white' : '#374151'}; font-size: 0.875rem;">${module.title}</span>
                    </div>`;
            html += hasLessons ? `<i class="fas fa-chevron-down" style="color: ${isSelected ? 'white' : '#6b7280'}; font-size: 0.75rem; transition: transform 0.2s ease;"></i>` : '';
            html += `</div>`;
            if (hasLessons) {
                html += `<div class="module-lessons" id="module-lessons-${module.id}" style="display: ${isSelected ? 'block' : 'none'}; margin-left: 1rem; margin-top: 0.5rem;">`;
                module.lessons.forEach(lesson => {
                    const isLessonSelected = selectedLessonId === lesson.id;
                    html += `<div class="lesson-item${isLessonSelected ? ' selected' : ''}" data-lesson-id="${lesson.id}" style="padding: 0.5rem 0.75rem; margin-bottom: 0.25rem; background: ${isLessonSelected ? 'rgba(99,102,241,0.1)' : 'transparent'}; border-radius: 6px; cursor: pointer; transition: all 0.2s ease; border-left: 3px solid ${isLessonSelected ? '#6366f1' : 'transparent'};">`;
                    html += `<div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-play-circle" style="color: ${isLessonSelected ? '#6366f1' : '#6b7280'}; font-size: 0.75rem;"></i>
                            <span style="font-size: 0.8rem; color: ${isLessonSelected ? '#374151' : '#6b7280'}; font-weight: ${isLessonSelected ? '600' : '400'};">${lesson.title}</span>
                        </div>`;
                    html += `</div>`;
                });
                html += '</div>';
            }
            html += '</div>';
        });
    } else {
        html += '<div style="color: #9ca3af; font-size: 0.95rem;">No modules yet.</div>';
    }
    html += '</div>';
    // Assignments section
    html += `<div class="sidebar-section">
      <h3 style="font-size: 0.95rem; font-weight: 600; color: #6b7280; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Assignments</h3>`;
    if (assignments && assignments.length > 0) {
        assignments.forEach(assignment => {
            const isAssignmentSelected = selectedAssignmentId === assignment.id;
            const due = assignment.due_date ? new Date(assignment.due_date) : null;
            const now = new Date();
            const isOverdue = due && now > due;
            const isStudent = role === 'student';
            const hasSubmission = assignment.mySubmission && assignment.mySubmission.id;
            html += `<div class="sidebar-assignment${isAssignmentSelected ? ' selected' : ''}" data-assignment-id="${assignment.id}" style="margin-bottom: 0.5rem;">`;
            html += `<div class="assignment-header${isAssignmentSelected ? ' selected' : ''}" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: #fff; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; border: 1px solid #e5e7eb; position: relative;">`;
            html += `<div style="display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-tasks" style="color: #6366f1; font-size: 0.875rem;"></i>
                        <div>
                            <span style="font-weight: 600; color: #374151; font-size: 0.875rem;">${assignment.title}</span>
                            ${isStudent && hasSubmission ? '<div style="font-size: 0.7rem; color: #10b981; font-weight: 500;">✓ Submitted</div>' : ''}
                        </div>
                    </div>`;
            html += isOverdue ? '<div style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%;"></div>' : '';
            html += `</div></div>`;
        });
    } else {
        html += '<div style="color: #9ca3af; font-size: 0.95rem;">No assignments yet.</div>';
    }
    html += '</div></div>';
    sidebarList.innerHTML = html;
    // Restore event delegation for sidebar clicks
    sidebarList.onclick = function(e) {
        // Module click
        const moduleHeader = e.target.closest('.module-header');
        if (moduleHeader) {
            window._sidebarState.selectedModuleId = parseInt(moduleHeader.parentElement.getAttribute('data-module-id'));
            window._sidebarState.selectedLessonId = null;
            window._sidebarState.selectedAssignmentId = null;
            renderSidebarWithAssignments(window._modules, window._assignments, window._sidebarState.selectedModuleId, null, null);
            renderMainContent(window._modules, window._sidebarState.selectedModuleId, null);
            return;
        }
        // Lesson click
        const lessonItem = e.target.closest('.lesson-item');
        if (lessonItem) {
            const moduleDiv = lessonItem.closest('.sidebar-module');
            window._sidebarState.selectedModuleId = parseInt(moduleDiv.getAttribute('data-module-id'));
            window._sidebarState.selectedLessonId = parseInt(lessonItem.getAttribute('data-lesson-id'));
            window._sidebarState.selectedAssignmentId = null;
            renderSidebarWithAssignments(window._modules, window._assignments, window._sidebarState.selectedModuleId, window._sidebarState.selectedLessonId, null);
            renderMainContent(window._modules, window._sidebarState.selectedModuleId, window._sidebarState.selectedLessonId);
            return;
        }
        // Assignment click
        const assignmentHeader = e.target.closest('.assignment-header');
        if (assignmentHeader) {
            window._sidebarState.selectedModuleId = null;
            window._sidebarState.selectedLessonId = null;
            window._sidebarState.selectedAssignmentId = parseInt(assignmentHeader.parentElement.getAttribute('data-assignment-id'));
            renderSidebarWithAssignments(window._modules, window._assignments, null, null, window._sidebarState.selectedAssignmentId);
            showAssignmentDetails(window._sidebarState.selectedAssignmentId);
            return;
        }
    };
    // ... existing code ...
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
    const isActive = m.id === selectedModuleId;
    // Progress calculation
    let moduleFiles = window._moduleFiles && window._moduleFiles[m.id] ? window._moduleFiles[m.id] : [];
      const totalFiles = moduleFiles.length;
      const doneFiles = moduleFiles.filter(f => isFileDone(f.id)).length;
      const progress = totalFiles ? Math.round((doneFiles / totalFiles) * 100) : 0;
    modulesHtml += `
      <div class="p-5 border ${isActive ? 'border-indigo-300 bg-indigo-50' : 'border-[var(--border-color)]'} rounded-lg w-full min-h-[180px] transition-all duration-200">
        <div class="flex items-center justify-between cursor-pointer${isActive ? ' mb-5' : ''}" data-module-id="${m.id}">
          <div class="flex items-center min-w-0">
            <span class="material-icons ${isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'} mr-3">${isActive ? 'folder_open' : 'folder'}</span>
            <span class="font-medium ${isActive ? 'text-indigo-700' : 'text-[var(--text-primary)]'} truncate max-w-[220px] block">${m.title}</span>
          </div>
          <div class="flex items-center">
            <span class="text-sm ${isActive ? 'text-indigo-600' : 'text-[var(--text-secondary)]'} mr-3">${doneFiles}/${totalFiles} done</span>
            <span class="material-icons ${isActive ? 'text-[var(--brand-primary)]' : 'text-gray-500'}">${isActive ? 'expand_more' : 'chevron_right'}</span>
              </div>
            </div>
        ${isActive ? `
        <div class="pl-8 space-y-5">
          <p class="text-sm text-[var(--text-secondary)]"><span class="font-medium text-[var(--text-primary)]">Description:</span> ${m.description || ''}</p>
          <div class="flex items-center text-[var(--brand-primary)] font-medium">
            <span class="material-icons mr-2 text-base">attach_file</span>
            Module Resources
          </div>
          <div class="border border-[var(--border-color)] rounded-lg p-4 bg-white">
            <div class="space-y-3">
              ${moduleFiles.length === 0 ? `<div class="text-sm text-gray-400 italic">No files uploaded.</div>` :
                moduleFiles.map(f => `
                  <div class="flex items-center justify-between py-1">
                    <div class="flex items-center min-w-0">
                      <span class="material-icons text-gray-500 mr-2">insert_drive_file</span>
                      <span class="text-sm text-[var(--text-secondary)] truncate mr-4">${f.filename}</span>
              </div>
                    <div class="flex items-center">
                      <button class="bg-indigo-100 text-[var(--brand-primary)] px-3.5 py-2 rounded-md flex items-center hover:bg-indigo-200 transition-colors text-sm font-medium shrink-0 download-file-btn mr-2" data-file-id="${f.id}" data-filename="${f.filename}">
                        <span class="material-icons mr-1.5 text-sm">download</span>
                        Download
                      </button>
                      ${(userRole === 'admin' || userRole === 'instructor') ? `
                        <button class="text-red-500 hover:text-red-700 transition-colors ml-2 delete-file-btn" data-file-id="${f.id}">
                          <span class="material-icons">delete_outline</span>
                  </button>
                      ` : ''}
                    </div>
                </div>
                `).join('')
              }
            </div>
          </div>
          ${(userRole === 'admin' || userRole === 'instructor') ? `
          <form class="module-file-upload-form" data-module-id="${m.id}">
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-[var(--background-light)] hover:bg-gray-100 transition-colors cursor-pointer custom-file-drop">
              <span class="material-icons text-gray-400 text-4xl mb-2">cloud_upload</span>
              <p class="text-sm text-[var(--text-secondary)]">Drag & drop files or <span class="text-[var(--brand-primary)] font-medium">click to select a file</span></p>
              <p class="text-xs text-gray-400 mt-1">Maximum file size: 50MB</p>
              <input type="file" class="module-file-input" style="display:none;" required aria-label="Choose file to upload">
              <span class="file-drop-filename"></span>
            </div>
            <button type="submit" class="w-full bg-gray-600 text-white py-2.5 px-6 rounded-md flex items-center justify-center hover:bg-gray-700 transition-colors font-medium mt-2">
              <span class="material-icons mr-2">upload_file</span>
              Upload File
            </button>
            <span class="module-upload-status ml-2"></span>
          </form>
          ` : ''}
        </div>
        ` : ''}
        </div>
      `;
  });
  modulesHtml += '</div>';
    content.innerHTML = `
            ${courseInfoHtml}
            ${courseVideoHtml}
            ${modulesHtml}
  `;
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
      const fileId = btn.getAttribute('data-file-id');
      const filename = btn.getAttribute('data-filename');
      const email = localStorage.getItem('email');
      const role = localStorage.getItem('role');
      try {
        const res = await fetch(`${API_URL}/files/${fileId}`, {
          headers: {
            'X-User-Email': email || '',
            'X-User-Role': role || ''
          }
        });
        if (!res.ok) {
          const errText = await res.text();
          alert('Download failed: ' + errText);
          return;
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      } catch (err) {
        alert('Download failed: ' + err);
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
          fetchAllModuleFiles(window._modules, renderMainContent, moduleId, null);
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
        });
        drop.addEventListener('dragleave', e => {
          e.preventDefault();
          drop.style.borderColor = '#a5b4fc';
        });
        drop.addEventListener('drop', e => {
          e.preventDefault();
          drop.style.borderColor = '#a5b4fc';
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
      } else {
        loadAssignments().then(assignments => {
          window._assignments = assignments;
          renderSidebarWithAssignments(window._modules, assignments, currentlyExpanded ? null : modId, null);
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
  renderSidebarWithAssignments(modules, assignments, null, null);
  fetchAllModuleFiles(modules, renderMainContent, null, null);
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
  document.querySelectorAll('.download-btn').forEach(btn => {
    btn.onclick = async (e) => {
      const fileId = btn.getAttribute('data-file-id');
      const filename = btn.getAttribute('data-filename');
      const email = localStorage.getItem('email');
      const role = localStorage.getItem('role');
      console.log('[Download] Button clicked for file:', fileId, filename);
      try {
        const res = await fetch(`${API_URL}/files/${fileId}`, {
          headers: {
            'X-User-Email': email || '',
            'X-User-Role': role || ''
          }
        });
        if (!res.ok) {
          const errText = await res.text();
          alert('Download failed: ' + errText);
          return;
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      } catch (err) {
        alert('Download failed: ' + err);
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
                        <a href="/course_files/${assignment.file_path}" download style="display: flex; align-items: center; gap: 0.5rem; color: #6366f1; text-decoration: none; font-weight: 500; padding: 0.5rem 0.75rem; border-radius: 8px; background: rgba(99,102,241,0.1); transition: all 0.2s ease;" onmouseover="this.style.background='rgba(99,102,241,0.15)'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(99,102,241,0.1)'; this.style.transform='translateY(0)'">
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
                    <a href="/course_files/${submission.file_path}" download style="display: flex; align-items: center; gap: 0.5rem; color: #6366f1; text-decoration: none; font-weight: 500; padding: 0.5rem 0.75rem; border-radius: 8px; background: rgba(99,102,241,0.1); transition: all 0.2s ease;" onmouseover="this.style.background='rgba(99,102,241,0.15)'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(99,102,241,0.1)'; this.style.transform='translateY(0)'">
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
        const text = document.getElementById('submission-text').value;
        const fileInput = document.getElementById('submission-file');
        const formData = new FormData();
        formData.append('text_answer', text);
        if (fileInput.files[0]) formData.append('file', fileInput.files[0]);
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
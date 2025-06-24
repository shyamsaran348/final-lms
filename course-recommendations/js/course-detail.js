// course-detail.js

const API_URL = 'http://localhost:5001/api';

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

document.addEventListener('DOMContentLoaded', () => {
    if (!courseId) {
        const content = document.getElementById('lms-content');
        if (content) content.innerHTML = '<div style="text-align:center;color:#e53e3e;font-size:1.2em;margin-top:3em;">No course_id found in URL. Please access this page from the course list.</div>';
        return;
    }
    // Fetch course info
    fetch(`${API_URL}/courses/${courseId}`, {
        headers: {
            'X-User-Email': localStorage.getItem('email') || ''
        }
    })
    .then(res => res.json())
    .then(course => {
        console.log('Fetched course:', course);
        currentCourse = course;
        loadModules(course.modules);
        setupModuleManagement(course.modules);
    })
    .catch(err => {
        const content = document.getElementById('lms-content');
        if (content) content.innerHTML = '<div style="text-align:center;color:#e53e3e;font-size:1.2em;margin-top:3em;">Failed to load course. Please try again later.</div>';
        console.error('Error fetching course:', err);
    });
    // Add module button logic
    const addModuleBtn = document.getElementById('add-module-btn');
    if (addModuleBtn) {
        const role = localStorage.getItem('role');
        if (role === 'admin' || role === 'instructor') {
            addModuleBtn.style.display = 'block';
            addModuleBtn.onclick = () => {
                // Open the modal in add mode
                showModuleModal();
            };
        } else {
            addModuleBtn.style.display = 'none';
        }
    }
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
    modal.style.display = 'flex';
    document.getElementById('module-modal-title').textContent = module ? 'Edit Module' : 'Add Module';
    document.getElementById('module-id').value = module ? module.id : '';
    document.getElementById('module-title').value = module ? module.title : '';
    document.getElementById('module-description').value = module ? module.description : '';
    document.getElementById('module-order').value = module ? module.order : 0;
    document.getElementById('module-release-date').value = module && module.release_date ? module.release_date : '';
}
document.getElementById('close-module-modal').onclick = () => {
    document.getElementById('module-modal').style.display = 'none';
};
document.getElementById('module-form').onsubmit = function(e) {
    e.preventDefault();
    const id = document.getElementById('module-id').value;
    const title = document.getElementById('module-title').value;
    const description = document.getElementById('module-description').value;
    const order = document.getElementById('module-order').value;
    const release_date = document.getElementById('module-release-date').value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/modules/${id}` : `${API_URL}/courses/${courseId}/modules`;
    fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-User-Role': localStorage.getItem('role') || '',
            'X-User-Email': localStorage.getItem('email') || ''
        },
        body: JSON.stringify({ title, description, order, release_date })
    })
    .then(res => res.json())
    .then(data => {
        if (data.module || data.message === 'Module updated') {
            document.getElementById('module-modal').style.display = 'none';
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
            alert(data.message || 'Failed to save module');
        }
    });
};
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
      renderSidebar(window._modules, modId, null);
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
    courseInfoHtml = `
      <div class="flex flex-col sm:flex-row items-start sm:items-center mb-10">
        <img alt="${currentCourse.title}" class="w-28 h-28 rounded-lg object-cover mr-8 mb-4 sm:mb-0 border border-gray-200" src="/${currentCourse.image || 'images/a2000-logo.jpeg'}" />
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
  // Add New Module button (reference structure)
  let addModuleBtnHtml = '';
  if (userRole === 'admin' || userRole === 'instructor') {
    addModuleBtnHtml = `
      <button class="w-full bg-[var(--brand-primary)] text-white py-3 px-6 rounded-md flex items-center justify-center hover:bg-indigo-700 transition-colors mb-8 font-medium" id="add-module-btn">
        <span class="material-icons mr-2">add_circle_outline</span>
        Add New Module
      </button>
    `;
  }
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
    ${addModuleBtnHtml}
    ${modulesHtml}
  `;
  // Re-attach Add New Module button event listener after render
  const addModuleBtn = document.getElementById('add-module-btn');
  if (addModuleBtn) {
    const role = localStorage.getItem('role');
    if (role === 'admin' || role === 'instructor') {
      addModuleBtn.style.display = 'block';
      addModuleBtn.onclick = () => {
        showModuleModal();
      };
    } else {
      addModuleBtn.style.display = 'none';
    }
  }
  // Add expand/collapse logic for video section
  const videoToggle = document.getElementById('course-intro-video-toggle');
  if (videoToggle) {
    videoToggle.onclick = function() {
      isVideoSectionOpen = !isVideoSectionOpen;
      renderMainContent(window._modules, selectedModuleId, selectedLessonId);
      renderSidebar(window._modules, selectedModuleId, selectedLessonId);
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
      renderSidebar(window._modules, currentlyExpanded ? null : modId, null);
    };
  });
}

// --- Initial Load ---
function loadModules(modules) {
  window._modules = modules;
  renderSidebar(modules, null, null);
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
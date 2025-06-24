// course-detail.js

// Redirect to Flask route if loaded as static file without course_id
(function() {
  const isStatic = window.location.pathname.endsWith('course-detail.html');
  const params = new URLSearchParams(window.location.search);
  if (isStatic && !params.get('course_id')) {
    window.location.href = '/course-detail';
  }
})();

// Get course_id from URL and make it global
const params = new URLSearchParams(window.location.search);
const courseId = params.get('course_id');
console.log('Loaded courseId:', courseId);

let currentCourse = null;

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
    fetch(`http://localhost:5001/api/courses/${courseId}`, {
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
            addModuleBtn.onclick = async () => {
                // Prompt for module name and description
                const title = prompt('Enter module name:');
                if (!title) return;
                const description = prompt('Enter module description (optional):') || '';
                // Create module via backend
                fetch(`http://localhost:5001/api/courses/${courseId}/modules`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Role': role || '',
                        'X-User-Email': localStorage.getItem('email') || ''
                    },
                    body: JSON.stringify({ title, description })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.module) {
                        // Reload modules and auto-select the new one
                        fetch(`http://localhost:5001/api/courses/${courseId}`, {
                            headers: { 'X-User-Email': localStorage.getItem('email') || '' }
                        })
                        .then(res => res.json())
                        .then(course => {
                            const newModuleId = data.module.id;
                            window._modules = course.modules;
                            renderSidebar(course.modules, newModuleId, null);
                            renderMainContent(course.modules, newModuleId, null);
                            setupModuleManagement(course.modules);
                        });
                    } else {
                        alert(data.message || 'Failed to add module');
                    }
                });
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
                actions.innerHTML = `<button class='delete-module-btn' data-id='${modId}'>🗑️</button>`;
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
    document.getElementById('module-modal').style.display = 'block';
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
    const url = id ? `http://localhost:5001/api/modules/${id}` : `http://localhost:5001/api/courses/${courseId}/modules`;
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
            fetch(`http://localhost:5001/api/courses/${courseId}`, {
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
    fetch(`http://localhost:5001/api/modules/${id}`, {
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
            fetch(`http://localhost:5001/api/courses/${courseId}`, {
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
  const sidebar = document.getElementById('lms-sidebar');
  const userRole = localStorage.getItem('role');
  // Sort modules by id ascending (creation order)
  const sortedModules = [...modules].sort((a, b) => a.id - b.id);
  let ytBtnHtml = '';
  if (userRole === 'admin' || userRole === 'instructor') {
    ytBtnHtml = `<button id="sidebar-yt-link-btn" class="sidebar-yt-link-btn" style="width:90%;margin:0.7em auto 1.2em auto;display:block;background:#ff0000;color:#fff;font-weight:600;border:none;border-radius:8px;padding:0.7em 0;font-size:1.08em;cursor:pointer;"><i class="fa-brands fa-youtube"></i> YouTube Link</button>`;
  }
  sidebar.innerHTML = ytBtnHtml + '<ul>' + sortedModules.map(module => `
    <li>
      <div class="sidebar-module${module.id === selectedModuleId ? ' expanded' : ''}" data-module-id="${module.id}">
        <i class="fa-solid fa-folder module-icon" style="color:#2563eb;"></i> <span>${module.title}</span>
        ${(userRole === 'admin' || userRole === 'instructor') ? `<span class="module-actions" style="margin-left:auto;"><button class='delete-module-btn' data-id='${module.id}' title='Delete'><i class="fa-solid fa-trash"></i></button></span>` : ''}
      </div>
      <ul style="display:${module.id === selectedModuleId ? 'block' : 'none'};">
        ${(module.lessons || []).map(lesson => `
          <li class="sidebar-lesson${lesson.id === selectedLessonId ? ' active' : ''}" data-module-id="${module.id}" data-lesson-id="${lesson.id}">
            <i class="fa-solid fa-file-alt"></i> <span>${lesson.title}</span>
            ${isLessonDone(lesson.id) ? '<i class="fa-solid fa-check-circle" style="color:#22c55e;margin-left:0.5em;"></i>' : ''}
          </li>
        `).join('')}
      </ul>
    </li>
  `).join('') + '</ul>';
  // Add Module button logic
  if (userRole === 'admin' || userRole === 'instructor') {
    const addModuleBtn = document.getElementById('add-module-btn');
    if (addModuleBtn) {
      addModuleBtn.onclick = async () => {
        const title = prompt('Enter module name:');
        if (!title) return;
        const description = prompt('Enter module description (optional):') || '';
        fetch(`http://localhost:5001/api/courses/${courseId}/modules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Role': userRole || '',
            'X-User-Email': localStorage.getItem('email') || ''
          },
          body: JSON.stringify({ title, description })
        })
        .then(res => res.json())
        .then(data => {
          if (data.module) {
            fetch(`http://localhost:5001/api/courses/${courseId}`, {
              headers: { 'X-User-Email': localStorage.getItem('email') || '' }
            })
            .then(res => res.json())
            .then(course => {
              expandedModules.add(data.module.id);
              window._modules = course.modules;
              renderMainContent(course.modules, data.module.id, null);
              setupModuleManagement(course.modules);
            });
          } else {
            alert(data.message || 'Failed to add module');
          }
        });
      };
    }
  }
  // Sidebar expand/collapse and lesson click logic
  sidebar.querySelectorAll('.sidebar-module').forEach(el => {
    el.onclick = function() {
      const modId = parseInt(this.getAttribute('data-module-id'));
      // Single-expand: only one module open at a time from sidebar
      if (expandedModules.has(modId)) {
        expandedModules.clear(); // Collapse all
      } else {
        expandedModules = new Set([modId]); // Only expand this one
      }
      renderSidebar(window._modules, modId, null);
      renderMainContent(window._modules);
    };
  });
  sidebar.querySelectorAll('.sidebar-lesson').forEach(el => {
    el.onclick = function(e) {
      e.stopPropagation();
      const modId = parseInt(this.getAttribute('data-module-id'));
      const lesId = parseInt(this.getAttribute('data-lesson-id'));
      expandedModules.add(modId);
      renderSidebar(window._modules, modId, lesId);
      renderMainContent(window._modules);
    };
  });
  // Add event for YouTube Link button
  if (userRole === 'admin' || userRole === 'instructor') {
    setTimeout(() => {
      const ytBtn = document.getElementById('sidebar-yt-link-btn');
      if (ytBtn) {
        ytBtn.onclick = function() {
          window._scrollToVideo = true;
          renderMainContent(window._modules, null, null);
        };
      }
    }, 0);
  }
}

// Track expanded modules
let expandedModules = new Set();

// Fetch all module files before rendering main content
async function fetchAllModuleFiles(modules, callback, selectedModuleId, selectedLessonId) {
  window._moduleFiles = {};
  const fetches = modules.map(module =>
    fetch(`http://localhost:5001/api/modules/${module.id}/files`, {
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

// --- YouTube Video Section (Clean Implementation) ---
function extractYouTubeId(url) {
    // Handles youtu.be and youtube.com URLs
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
    return match ? match[1] : '';
}

function renderYouTubeSection(course) {
    const userRole = localStorage.getItem('role');
    let html = '';
    html += `<section id="course-video-section" style="max-width:700px;margin:0 auto 2em auto;padding:2em 2.5em 2em 2.5em;background:#fff;border-radius:16px;box-shadow:0 2px 16px rgba(255,0,0,0.07),0 1.5px 6px rgba(0,0,0,0.03);">
        <h2 style="font-size:1.3em;font-weight:700;margin-bottom:0.7em;display:flex;align-items:center;gap:0.5em;"><i class='fa-brands fa-youtube' style='color:#ff0000;'></i> Course Introduction Video</h2>`;
    if (course.youtube_url) {
        const videoId = extractYouTubeId(course.youtube_url);
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

function insertYouTubeSection(course) {
    const content = document.getElementById('lms-content');
    const ytSection = document.getElementById('course-video-section');
    const ytHtml = renderYouTubeSection(course);
    if (ytSection) {
        ytSection.outerHTML = ytHtml;
    } else {
        // Insert above modules accordion
        const infoCard = document.querySelector('.course-info-card');
        if (infoCard) {
            infoCard.insertAdjacentHTML('afterend', ytHtml);
        } else {
            content.insertAdjacentHTML('afterbegin', ytHtml);
        }
    }
    // Add form handler if admin/instructor
    const userRole = localStorage.getItem('role');
    if ((userRole === 'admin' || userRole === 'instructor') && document.getElementById('yt-link-form')) {
        document.getElementById('yt-link-form').onsubmit = function(e) {
            e.preventDefault(); // Prevent page reload
            const link = document.getElementById('yt-link-input').value.trim();
            if (!link) return;
            fetch(`http://localhost:5001/api/courses/${course.id}/youtube`, {
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
                    showToast('YouTube link updated!', 'success');
                    insertYouTubeSection(data); // Update miniplayer in place
                } else {
                    showToast(data.message || 'Failed to update YouTube link', 'error');
                }
            })
            .catch(() => showToast('Failed to update YouTube link', 'error'));
        };
    }
}

// --- Insert YouTube section in main content render ---
function renderMainContent(modules, selectedModuleId, selectedLessonId) {
  if (selectedModuleId && !expandedModules.has(selectedModuleId)) {
    expandedModules.add(selectedModuleId);
  }
  const content = document.getElementById('lms-content');
  const userRole = localStorage.getItem('role');
  // Course info card
  let courseInfoHtml = '';
  if (currentCourse) {
    courseInfoHtml = `<div class="course-info-card" style="max-width:700px;margin:0 auto 2em auto;padding:2em 2.5em 2em 2.5em;background:#fff;border-radius:18px;box-shadow:0 2px 16px rgba(79,140,255,0.07),0 1.5px 6px rgba(0,0,0,0.03);display:flex;align-items:center;gap:2em;transition:box-shadow 0.2s;">
      <img src="/static/images/a2000-logo.jpeg" alt="Course logo" style="width:90px;height:90px;object-fit:cover;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);background:#f5f7fa;">
      <div>
        <h1 style="margin:0 0 0.3em 0;font-size:2em;font-weight:700;">${currentCourse.title}</h1>
        <div style="color:#666;font-size:1.1em;margin-bottom:0.5em;">${currentCourse.description || ''}</div>
        <div style="color:#888;font-size:0.98em;">By ${currentCourse.author}</div>
      </div>
    </div>`;
  }
  // Dedicated Course Video section
  let courseVideoHtml = '';
  if (currentCourse) {
    courseVideoHtml = renderYouTubeSection(currentCourse);
  }
  // Add Module button (if admin/instructor)
  let addModuleBtnHtml = '';
  if (userRole === 'admin' || userRole === 'instructor') {
    addModuleBtnHtml = `<div style="text-align:center;margin-bottom:2em;"><button id="add-module-btn" class="btn btn-primary" style="font-size:1.1em;padding:0.7em 2.2em;border-radius:8px;background:#4f8cff;color:#fff;font-weight:600;border:none;cursor:pointer;">+ Add Module</button></div>`;
  }
  // Modules accordion
  let modulesHtml = '';
  if (modules && modules.length > 0) {
    modulesHtml = renderModulesAccordion(modules, selectedModuleId, selectedLessonId);
  } else {
    modulesHtml = `<div style="text-align:center;color:#aaa;font-size:1.2em;margin-top:2em;">No modules yet.</div>`;
  }
  content.innerHTML = courseInfoHtml + courseVideoHtml + addModuleBtnHtml + modulesHtml;
  // Insert YouTube section event handlers
  if (currentCourse) insertYouTubeSection(currentCourse);
}

// --- Initial Load ---
function loadModules(modules) {
  window._modules = modules;
  renderSidebar(modules, null, null);
  fetchAllModuleFiles(modules, renderMainContent, null, null);
} 
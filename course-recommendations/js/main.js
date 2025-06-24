document.addEventListener('DOMContentLoaded', function() {
    // Check user role and show admin link if admin
    const userRole = localStorage.getItem('role');
    const username = localStorage.getItem('username');
    
    if (userRole === 'admin') {
        const adminLink = document.getElementById('adminLink');
        if (adminLink) {
            adminLink.style.display = 'block';
        }
    }
    
    // Display user information
    const userInfo = document.getElementById('userInfo');
    if (userInfo && username) {
        userInfo.textContent = `Welcome, ${username} (${userRole || 'Student'})`;
    }

    // Update the main welcome message
    const welcomeHeading = document.getElementById('recommended-heading');
    if (welcomeHeading) {
        if (username) {
            welcomeHeading.textContent = `Welcome Back, ${username}!`;
        } else {
            welcomeHeading.textContent = 'Welcome Back!';
        }
    }
    // Dynamically update the 'My Courses' heading for instructors
    const myCoursesHeading = document.getElementById('my-courses-heading');
    if (userRole === 'instructor' && myCoursesHeading) {
        myCoursesHeading.textContent = 'Courses Assigned to You';
    }

    // Header scroll effect
    const header = document.querySelector('.main-header');
    let lastScroll = 0;

    // Global variable to store all courses for search functionality
    let allCourses = [];

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll <= 0) {
            header.classList.remove('scroll-up');
            return;
        }
        
        if (currentScroll > lastScroll && !header.classList.contains('scroll-down')) {
            // Scroll down
            header.classList.remove('scroll-up');
            header.classList.add('scroll-down');
        } else if (currentScroll < lastScroll && header.classList.contains('scroll-down')) {
            // Scroll up
            header.classList.remove('scroll-down');
            header.classList.add('scroll-up');
        }
        lastScroll = currentScroll;
    });

    // Real-time search functionality
    const searchForm = document.querySelector('.search-container form');
    const searchInput = searchForm.querySelector('input');
    let searchTimeout;
    
    // Prevent form submission and implement real-time search
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
    });
    
    // Real-time search as user types
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const searchTerm = this.value.trim().toLowerCase();
        
        // Add a small delay to avoid too many searches while typing
        searchTimeout = setTimeout(() => {
            performSearch(searchTerm);
        }, 300);
    });
    
    // Function to perform search across all course cards
    function performSearch(searchTerm) {
        const courseCards = document.querySelectorAll('.course-card');
        let hasResults = false;
        
        courseCards.forEach(card => {
            const courseTitle = card.querySelector('.course-content h3').textContent.toLowerCase();
            const courseAuthor = card.querySelector('.course-content .author').textContent.toLowerCase();
            const courseContent = (courseTitle + ' ' + courseAuthor).toLowerCase();
            
            if (searchTerm === '' || courseContent.includes(searchTerm)) {
                card.style.display = 'block';
                hasResults = true;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Show/hide section headers based on search results
        const sections = ['my-courses-section', 'other-courses-section', 'recommended-section', 'explore-section', 'instructor-courses-section'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                const visibleCards = section.querySelectorAll('.course-card[style*="display: block"]').length;
                const totalCards = section.querySelectorAll('.course-card').length;
                
                if (searchTerm === '') {
                    // Show original visibility
                    section.style.display = section.dataset.originalDisplay || 'block';
                } else if (visibleCards > 0) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            }
        });
        
        // Show search results message
        showSearchResultsMessage(searchTerm, hasResults);
    }
    
    // Function to show search results message
    function showSearchResultsMessage(searchTerm, hasResults) {
        // Remove existing search message
        const existingMessage = document.querySelector('.search-results-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        if (searchTerm && !hasResults) {
            const message = document.createElement('div');
            message.className = 'search-results-message';
            message.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #666;">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px; color: #ddd;"></i>
                    <h3>No courses found</h3>
                    <p>No courses match "${searchTerm}". Try different keywords.</p>
                </div>
            `;
            
            // Insert message after the header
            const container = document.querySelector('.container');
            container.insertBefore(message, container.firstChild);
        }
    }

    // Mobile navigation
    const navLinks = document.querySelectorAll('.main-nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Handle image loading (will work on dynamically loaded images too)
    // Existing images from HTML will be handled, new ones need event listeners re-attached if dynamically added
    // For now, assume this runs once. If new images are added, this needs to be called again.
    // Or better, use event delegation

    // Add hover effect to course cards
    // This will now apply to dynamically loaded cards as well because courseCards is re-queried

    // Add click handlers for tags
    // This will now apply to dynamically loaded cards as well

    // Add keyboard navigation
    // This will now apply to dynamically loaded cards as well

    // Add focus styles
    // This will now apply to dynamically loaded cards as well

    // --- Functions for Dynamic Course Loading (moved from outside DOMContentLoaded) ---

    // Function to create a course card HTML element
    function createCourseCard(course, isLocked, showButton) {
        let buttonHtml = '';
        let lockedOverlay = '';
        let cardClass = 'course-card';
        const userRole = localStorage.getItem('role');
        // Fallbacks for buttonType and buttonLabel
        const buttonType = course.buttonType || course.button_type || 'learn';
        const buttonLabel = course.buttonLabel || course.button_label || 'Learn';
        if (isLocked && userRole === 'student') {
            lockedOverlay = `<div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.7);z-index:2;display:flex;align-items:center;justify-content:center;"><span style='font-size:2.5rem;color:#b91c1c;'><i class='fas fa-lock'></i></span></div>`;
        }
        if (showButton && !isLocked) {
            if (buttonType === 'learn') {
                buttonHtml = `<button class="btn btn-learn" onclick="window.location.href='course-detail.html?course_id=${course.id}'" aria-label="${buttonLabel}">
                    <svg viewBox="0 0 24 24" fill="currentColor" height="18" width="18" xmlns="http://www.w3.org/2000/svg" style="margin-right:6px;"><path d="M19 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h11a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zm-1 16H9V4h9zm-9 2V4a1 1 0 0 1 1-1h1v16H9a1 1 0 0 1-1-1z"/></svg>
                    <span>${buttonLabel}</span>
                </button>`;
            } else if (buttonType === 'register') {
                buttonHtml = `<button class="btn btn-register" aria-label="${buttonLabel}">Register</button>`;
            }
        } else if (showButton && userRole !== 'student') {
            if (buttonType === 'learn') {
                buttonHtml = `<button class="btn btn-learn" onclick="window.location.href='course-detail.html?course_id=${course.id}'" aria-label="${buttonLabel}">
                    <svg viewBox="0 0 24 24" fill="currentColor" height="18" width="18" xmlns="http://www.w3.org/2000/svg" style="margin-right:6px;"><path d="M19 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h11a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zm-1 16H9V4h9zm-9 2V4a1 1 0 0 1 1-1h1v16H9a1 1 0 0 1-1-1z"/></svg>
                    <span>${buttonLabel}</span>
                </button>`;
            } else if (buttonType === 'register') {
                buttonHtml = `<button class="btn btn-register" aria-label="${buttonLabel}">Register</button>`;
            }
        }
        return `
            <div class="${cardClass}" tabindex="0" role="article" style="position:relative;">
                <div class="course-image">
                    <img src="${course.image}" alt="${course.title} course thumbnail" loading="lazy">
                    ${lockedOverlay}
                </div>
                <div class="course-content">
                    <h3>${course.title}</h3>
                    <p class="author">${course.author}</p>
                    <div class="card-actions">
                        ${buttonHtml}
                    </div>
                </div>
            </div>
        `;
    }

    // Function to render courses into a specific grid
    function renderCourses(coursesToRender, targetGridElement, isLocked, showButton) {
        if (!targetGridElement) return;
        targetGridElement.innerHTML = '';
        coursesToRender.forEach(course => {
            targetGridElement.innerHTML += createCourseCard(course, isLocked, showButton);
        });
    }

    // --- Fetch Courses from Backend API and Render ---

    const myCoursesSection = document.getElementById('my-courses-section');
    const myCoursesGrid = document.getElementById('my-courses-grid');
    const otherCoursesSection = document.getElementById('other-courses-section');
    const otherCoursesGrid = document.getElementById('other-courses-grid');
    const recommendedSection = document.getElementById('recommended-section');
    const recommendedCoursesGrid = document.getElementById('recommended-courses-grid');
    const exploreSection = document.getElementById('explore-section');
    const exploreCoursesGrid = document.getElementById('explore-courses-grid');
    const instructorCoursesSection = document.getElementById('instructor-courses-section');
    const instructorCoursesGrid = document.getElementById('instructor-courses-grid');

    // Always get the email from localStorage
    const userEmail = localStorage.getItem('email') || '';

    // Debug: Log the value of userRole
    console.log('DEBUG userRole:', userRole);

    // Fetch courses with the email header
    fetch('http://localhost:5001/api/courses', {
        headers: {
            'X-User-Email': userEmail
        }
    })
    .then(async response => {
        const raw = await response.clone().text();
        console.log('DEBUG raw response:', raw);
        return response.json();
    })
    .then(courses => {
        console.log('DEBUG parsed courses:', courses);
        
        // Store all courses globally for search functionality
        allCourses = courses;
        
        // Store original display states for sections
        const sections = [myCoursesSection, otherCoursesSection, recommendedSection, exploreSection, instructorCoursesSection];
        sections.forEach(section => {
            if (section) {
                section.dataset.originalDisplay = section.style.display;
            }
        });
        
        if (userRole === 'student') {
            // Split into myCourses (unlocked) and otherCourses (locked)
            const myCourses = courses.filter(course => course.locked === false);
            const otherCourses = courses.filter(course => course.locked === true);
            // Show/hide sections
            myCoursesSection.style.display = 'block';
            otherCoursesSection.style.display = 'block';
            recommendedSection.style.display = 'none';
            exploreSection.style.display = 'none';
            instructorCoursesSection.style.display = 'none';
            // Render
            renderCourses(myCourses, myCoursesGrid, false, true);
            renderCourses(otherCourses, otherCoursesGrid, true, false);
        } else if (userRole === 'instructor') {
            // Show only assigned courses for instructors in a dedicated section
            myCoursesSection.style.display = 'none';
            otherCoursesSection.style.display = 'none';
            recommendedSection.style.display = 'none';
            exploreSection.style.display = 'none';
            instructorCoursesSection.style.display = 'block';
            if (courses.length === 0) {
                instructorCoursesGrid.innerHTML = '<p>No courses assigned to you yet.</p>';
            } else {
                renderCourses(courses, instructorCoursesGrid, false, true);
            }
        } else {
            // Admin: show all courses
            myCoursesSection.style.display = 'none';
            otherCoursesSection.style.display = 'none';
            recommendedSection.style.display = 'block';
            exploreSection.style.display = 'block';
            instructorCoursesSection.style.display = 'none';
            const recommendedCourses = courses.filter(course => course.buttonType === 'learn');
            const exploreCourses = courses.filter(course => course.buttonType === 'register');
            renderCourses(recommendedCourses, recommendedCoursesGrid, false, true);
            renderCourses(exploreCourses, exploreCoursesGrid, false, true);
        }
        
        // After courses are loaded, perform any active search
        const currentSearchTerm = searchInput.value.trim();
        if (currentSearchTerm) {
            performSearch(currentSearchTerm);
        }
    })
    .catch(error => {
        console.error('Error fetching courses:', error);
        if (myCoursesGrid) {
            myCoursesGrid.innerHTML = '<p>Failed to load courses. Please try again later.</p>';
        }
        if (otherCoursesGrid) {
            otherCoursesGrid.innerHTML = '<p>Failed to load courses. Please try again later.</p>';
        }
        if (recommendedCoursesGrid) {
            recommendedCoursesGrid.innerHTML = '<p>Failed to load recommended courses. Please try again later.</p>';
        }
        if (exploreCoursesGrid) {
            exploreCoursesGrid.innerHTML = '<p>Failed to load other courses. Please try again later.</p>';
        }
    });

    // --- Logout functionality ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            localStorage.removeItem('role');
            window.location.href = 'login.html';
        });
    }

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
    // Usage: showToast('Saved!', 'success');

    // --- Loading Spinner Helper ---
    function showLoading(target) {
        if (!target) return;
        target.innerHTML = '<div class="loading-spinner"></div>';
    }
    function hideLoading(target) {
        if (!target) return;
        target.innerHTML = '';
    }

    // Function to load announcements
    function loadAnnouncements() {
        const announcementsList = document.getElementById('announcements-list');
        if (!announcementsList) return;

        // Fetch announcements from the API
        fetch('http://localhost:5001/api/announcements')
            .then(response => response.json())
            .then(announcements => {
                announcementsList.innerHTML = ''; // Clear existing content
                if (announcements.length === 0) {
                    announcementsList.innerHTML = '<p>No announcements at the moment.</p>';
                    return;
                }
                announcements.forEach(ann => {
                    const announcementEl = document.createElement('p');
                    announcementEl.innerHTML = `<strong>${ann.created_at.split(' ')[0]} - ${ann.title}:</strong> ${ann.content}`;
                    announcementsList.appendChild(announcementEl);
                });
            })
            .catch(error => {
                console.error('Error fetching announcements:', error);
                announcementsList.innerHTML = '<p>Could not load announcements.</p>';
            });
    }

    // Load announcements on page load
    loadAnnouncements();

    // --- Utility Functions ---

    /**
    // ... existing code ...
    */

    // --- Profile Dropdown ---
    const userDropdownBtn = document.getElementById('userDropdownBtn');
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdownBtn && userDropdown) {
        userDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const expanded = userDropdownBtn.getAttribute('aria-expanded') === 'true';
            userDropdownBtn.setAttribute('aria-expanded', !expanded);
            userDropdown.hidden = expanded;
        });
        // Close dropdown on outside click
        document.addEventListener('click', function(e) {
            if (!userDropdown.hidden) {
                userDropdownBtn.setAttribute('aria-expanded', 'false');
                userDropdown.hidden = true;
            }
        });
        // Prevent closing when clicking inside dropdown
        userDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // --- Hamburger Menu (Mobile Nav) ---
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mainNav = document.getElementById('main-nav');
    if (hamburgerBtn && mainNav) {
        hamburgerBtn.addEventListener('click', function() {
            const isOpen = mainNav.classList.toggle('open');
            hamburgerBtn.classList.toggle('open', isOpen);
            hamburgerBtn.setAttribute('aria-expanded', isOpen);
        });
        // Close nav on outside click (mobile)
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768 && mainNav.classList.contains('open')) {
                if (!mainNav.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                    mainNav.classList.remove('open');
                    hamburgerBtn.classList.remove('open');
                    hamburgerBtn.setAttribute('aria-expanded', 'false');
                }
            }
        });
    }

    // --- Real-time Navigation Bar Updates ---
    function updateNavBar() {
        const userRole = localStorage.getItem('role');
        const username = localStorage.getItem('username');
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userInfo = document.getElementById('userInfo');
        const adminLink = document.getElementById('adminLink');
        const userDropdownBtn = document.getElementById('userDropdownBtn');
        // Update user info
        if (userInfo && username) {
            userInfo.textContent = `Welcome, ${username} (${userRole || 'Student'})`;
        } else if (userInfo) {
            userInfo.textContent = '';
        }
        // Show/hide admin link
        if (adminLink) {
            if (userRole === 'admin') {
                adminLink.style.display = 'block';
            } else {
                adminLink.style.display = 'none';
            }
        }
        // Show/hide profile dropdown and nav links
        const profileLink = document.querySelector('.nav-link[href="../profile.html"]');
        if (isLoggedIn) {
            if (userDropdownBtn) userDropdownBtn.style.display = '';
            if (profileLink) profileLink.style.display = '';
        } else {
            if (userDropdownBtn) userDropdownBtn.style.display = 'none';
            if (profileLink) profileLink.style.display = 'none';
        }
    }
    // Initial update
    updateNavBar();
    // Listen for storage changes (other tabs/windows)
    window.addEventListener('storage', function(e) {
        if (["role", "username", "isLoggedIn"].includes(e.key)) {
            updateNavBar();
        }
    });
    // Listen for custom events (same tab)
    window.addEventListener('userStateChanged', updateNavBar);
    // Call updateNavBar after login/logout/profile changes
    // Example: dispatchEvent(new Event('userStateChanged')) after login/logout/profile update

    function personalizeWelcomeCard() {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const name = userInfo.name || localStorage.getItem('username') || '';
        const role = userInfo.role || localStorage.getItem('role') || '';
        const welcomeMessage = document.getElementById('welcomeMessage');
        const welcomeSubtitle = document.getElementById('welcomeSubtitle');
        if (name) {
            welcomeMessage.textContent = `Welcome back, ${name}!`;
        }
        if (role) {
            welcomeSubtitle.textContent = `Role: ${role.charAt(0).toUpperCase() + role.slice(1)}`;
        } else {
            // Optionally show today's date
            const today = new Date();
            welcomeSubtitle.textContent = today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    }
    document.addEventListener('DOMContentLoaded', personalizeWelcomeCard);

    function showNoAnnouncementsIfEmpty() {
        const list = document.getElementById('announcements-list');
        const msg = document.getElementById('noAnnouncementsMsg');
        if (list && msg) {
            if (!list.children.length) {
                msg.style.display = '';
            } else {
                msg.style.display = 'none';
            }
        }
    }
    // Call this after announcements are loaded
    if (document.getElementById('announcements-list')) {
        const observer = new MutationObserver(showNoAnnouncementsIfEmpty);
        observer.observe(document.getElementById('announcements-list'), { childList: true });
        showNoAnnouncementsIfEmpty();
    }

    function addRippleToLearnButtons() {
        document.querySelectorAll('.btn-learn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const rect = btn.getBoundingClientRect();
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                ripple.style.left = (e.clientX - rect.left) + 'px';
                ripple.style.top = (e.clientY - rect.top) + 'px';
                ripple.style.width = ripple.style.height = Math.max(rect.width, rect.height) + 'px';
                btn.appendChild(ripple);
                ripple.addEventListener('animationend', () => ripple.remove());
            });
        });
    }
    document.addEventListener('DOMContentLoaded', addRippleToLearnButtons);
}); 
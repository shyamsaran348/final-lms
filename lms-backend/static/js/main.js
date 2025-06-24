document.addEventListener('DOMContentLoaded', function() {
    // Header scroll effect
    const header = document.querySelector('.main-header');
    let lastScroll = 0;

    const courseCards = document.querySelectorAll('.course-card'); // Declare courseCards once here

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

    // Search functionality
    const searchForm = document.querySelector('.search-container form');
    const searchInput = searchForm.querySelector('input');
    
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const searchTerm = searchInput.value.trim().toLowerCase();

        courseCards.forEach(card => {
            const courseTitle = card.querySelector('.course-content h3').textContent.toLowerCase();
            if (courseTitle.includes(searchTerm)) {
                card.style.display = 'block'; // Or 'flex' if you use flexbox for cards
            } else {
                card.style.display = 'none';
            }
        });

        // If search term is empty, show all cards
        if (searchTerm === '') {
            courseCards.forEach(card => {
                card.style.display = 'block'; // Or 'flex'
            });
        }
    });

    // Mobile navigation
    const navLinks = document.querySelectorAll('.main-nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Handle image loading
    const courseImages = document.querySelectorAll('.course-image img');
    
    courseImages.forEach(img => {
        const imageContainer = img.parentElement;
        imageContainer.classList.add('loading');
        
        img.addEventListener('load', function() {
            imageContainer.classList.remove('loading');
            this.classList.remove('loading');
        });

        img.addEventListener('error', function() {
            imageContainer.classList.remove('loading');
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgwIiBoZWlnaHQ9IjI3MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgwIiBoZWlnaHQ9IjI3MCIgZmlsbD0iI2Y3ZjlmYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM2YTZmNzMiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBsb2FkIGVycm9yPC90ZXh0Pjwvc3ZnPg==';
        });
    });

    // Add hover effect to course cards
    courseCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
            this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.12)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.08)';
        });
    });

    // Add click handlers for tags
    const tags = document.querySelectorAll('.tag');
    
    tags.forEach(tag => {
        tag.addEventListener('click', function(e) {
            e.preventDefault();
            const action = this.classList.contains('learn') ? 'Learn' : 'Register';
            const courseTitle = this.closest('.course-card').querySelector('h3').textContent;
            
            // Add click animation
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);

            // Log the action (you can replace this with your own logic)
            console.log(`${action} clicked for course: ${courseTitle}`);
        });
    });

    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            const focusedElement = document.activeElement;
            if (focusedElement.classList.contains('course-card')) {
                focusedElement.style.outline = '2px solid #3498db';
            }
        }
    });

    // Add focus styles
    courseCards.forEach(card => {
        card.addEventListener('focus', function() {
            this.style.outline = '2px solid #3498db';
        });

        card.addEventListener('blur', function() {
            this.style.outline = 'none';
        });
    });

    // Function to load announcements
    function loadAnnouncements() {
        const announcementsList = document.getElementById('announcements-list');
        if (!announcementsList) return;

        // Fetch announcements from the API
        fetch('http://127.0.0.1:5001/api/announcements')
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
}); 
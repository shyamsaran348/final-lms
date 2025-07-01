if (typeof API_URL === 'undefined') {
  var API_URL = 'http://localhost:5001/api';
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            loginMessage.textContent = ''; // Clear previous messages

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    loginMessage.textContent = data.message;
                    loginMessage.style.color = 'green';
                    
                    // Store user information in localStorage
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', data.username);
                    localStorage.setItem('role', data.role);
                    localStorage.setItem('email', email);
                    
                    // Debug: log the role value
                    console.log('Login API returned role:', data.role);
                    
                    // Redirect based on role (case-insensitive)
                    setTimeout(() => {
                        if (data.role && data.role.trim().toLowerCase() === 'admin') {
                            window.location.href = '/course-recommendations/admin.html';
                        } else {
                            window.location.href = 'index.html';
                        }
                    }, 500);
                } else {
                    loginMessage.textContent = data.message || data.error || 'Login failed';
                    loginMessage.style.color = 'red';
                }
            } catch (error) {
                console.error('Error during login:', error);
                loginMessage.textContent = 'An error occurred. Please try again.';
                loginMessage.style.color = 'red';
            }
        });
    }
}); 
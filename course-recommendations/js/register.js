if (typeof API_URL === 'undefined') {
  var API_URL = 'http://localhost:5001/api';
}

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const registerMessage = document.getElementById('registerMessage');

    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            registerMessage.textContent = ''; // Clear previous messages

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    registerMessage.textContent = data.message;
                    registerMessage.style.color = 'green';
                    registerForm.reset(); // Clear the form
                    // Redirect to login page after successful registration
                    setTimeout(() => { 
                        // Switch to login panel instead of redirect
                        if (window.innerWidth > 769){
                            $('#slideBox').animate({'marginLeft' : '50%'});
                        } else {
                            $('#slideBox').animate({'marginLeft' : '20%'});
                        }
                        $('.topLayer').animate({'marginLeft': '0'});
                    }, 1000);
                } else {
                    registerMessage.textContent = data.error || 'Registration failed';
                    registerMessage.style.color = 'red';
                }
            } catch (error) {
                console.error('Error during registration:', error);
                registerMessage.textContent = 'An error occurred. Please try again.';
                registerMessage.style.color = 'red';
            }
        });
    }
}); 
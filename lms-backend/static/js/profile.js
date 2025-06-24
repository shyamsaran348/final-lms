document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:5001/api';
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('email');

    if (!token || !email) {
        window.location.href = 'login.html';
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-User-Email': email
    };

    // Fetch user data to populate the form
    fetch(`${API_URL}/profile`, { headers })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch profile');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('username').value = data.username;
            document.getElementById('email').value = data.email;
        })
        .catch(error => {
            console.error('Error fetching profile:', error);
            alert('Could not load your profile. Please try logging in again.');
            localStorage.clear();
            window.location.href = 'login.html';
        });

    // Handle form submission
    const profileForm = document.getElementById('profile-form');
    profileForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const emailValue = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const payload = {
            username: username,
            email: emailValue,
        };

        if (password) {
            payload.password = password;
        }

        fetch(`${API_URL}/profile`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
            return response.json().then(data => ({ ok: response.ok, data }));
        })
        .then(({ ok, data }) => {
            if (ok) {
                alert('Profile updated successfully!');
                // Update local storage if email was changed
                if (emailValue !== email) {
                    localStorage.setItem('email', emailValue);
                }
                // Optionally refresh the page or redirect
                window.location.reload();
            } else {
                throw new Error(data.message || 'Failed to update profile.');
            }
        })
        .catch(error => {
            console.error('Error updating profile:', error);
            alert(`Error: ${error.message}`);
        });
    });
}); 
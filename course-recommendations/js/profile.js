// profile.js

if (typeof API_URL === 'undefined') {
  var API_URL = 'http://localhost:5001/api';
}

document.addEventListener('DOMContentLoaded', function() {
  const profileView = document.getElementById('profile-view');
  const profileForm = document.getElementById('profile-form');
  const editBtn = document.getElementById('edit-profile-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const profileMessage = document.getElementById('profile-message');

  // View fields
  const viewUsername = document.getElementById('view-username');
  const viewEmail = document.getElementById('view-email');

  // Form fields
  const formUsername = document.getElementById('username');
  const formEmail = document.getElementById('email');
  const formPassword = document.getElementById('password');

  // Get email from localStorage for API header
  const userEmail = localStorage.getItem('email');

  async function fetchUserData() {
    if (!userEmail) {
      profileMessage.textContent = 'No user email found. Please log in again.';
      profileMessage.style.color = 'red';
      return;
    }
    try {
      const res = await fetch(`${API_URL}/profile`, {
        headers: { 'X-User-Email': userEmail }
      });
      const data = await res.json();
      if (!res.ok) {
        profileMessage.textContent = data.message || 'Failed to load profile.';
        profileMessage.style.color = 'red';
        return;
      }
      viewUsername.textContent = data.username;
      viewEmail.textContent = data.email;
      formUsername.value = data.username;
      formEmail.value = data.email;
      formPassword.value = '';
      profileMessage.textContent = '';
    } catch (err) {
      profileMessage.textContent = 'Error loading profile.';
      profileMessage.style.color = 'red';
    }
  }

  function showViewMode() {
    profileView.style.display = 'block';
    profileForm.style.display = 'none';
    profileMessage.textContent = '';
    fetchUserData();
  }

  function showEditMode() {
    profileView.style.display = 'none';
    profileForm.style.display = 'block';
    profileMessage.textContent = '';
    // Fields are already filled by fetchUserData
  }

  editBtn.onclick = showEditMode;
  cancelBtn.onclick = showViewMode;

  profileForm.onsubmit = async function(e) {
    e.preventDefault();
    if (!userEmail) {
      profileMessage.textContent = 'No user email found. Please log in again.';
      profileMessage.style.color = 'red';
      return;
    }
    const username = formUsername.value.trim();
    const email = formEmail.value.trim();
    const password = formPassword.value;
    if (!username || !email) {
      profileMessage.textContent = 'Username and email are required.';
      profileMessage.style.color = 'red';
      return;
    }
    try {
      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': userEmail
        },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        profileMessage.textContent = 'Profile updated successfully!';
        profileMessage.style.color = 'green';
        // Update localStorage if email or username changed
        localStorage.setItem('username', username);
        localStorage.setItem('email', email);
        setTimeout(showViewMode, 1000);
      } else {
        profileMessage.textContent = data.message || 'Failed to update profile.';
        profileMessage.style.color = 'red';
      }
    } catch (err) {
      profileMessage.textContent = 'Error updating profile.';
      profileMessage.style.color = 'red';
    }
  };

  // Initial load
  showViewMode();
}); 
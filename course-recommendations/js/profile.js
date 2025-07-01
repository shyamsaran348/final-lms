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
  const profileLoading = document.getElementById('profile-loading');
  const profileSuccess = document.getElementById('profile-success');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');

  // View fields
  const viewUsername = document.getElementById('view-username');
  const viewEmail = document.getElementById('view-email');

  // Form fields
  const formUsername = document.getElementById('username');
  const formEmail = document.getElementById('email');
  const formPassword = passwordInput;

  // Get email from localStorage for API header
  const userEmail = localStorage.getItem('email');

  function showLoading(show) {
    profileLoading.style.display = show ? 'flex' : 'none';
  }
  function showSuccess(show) {
    profileSuccess.style.display = show ? 'flex' : 'none';
  }

  async function fetchUserData() {
    if (!userEmail) {
      profileMessage.textContent = 'No user email found. Please log in again.';
      profileMessage.style.color = 'red';
      return;
    }
    showLoading(true);
    try {
      const res = await fetch(`${API_URL}/profile`, {
        headers: { 'X-User-Email': userEmail }
      });
      const data = await res.json();
      showLoading(false);
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
      showLoading(false);
      profileMessage.textContent = 'Error loading profile.';
      profileMessage.style.color = 'red';
    }
  }

  function showViewMode() {
    profileView.style.display = 'block';
    profileForm.style.display = 'none';
    profileMessage.textContent = '';
    showSuccess(false);
    fetchUserData();
  }

  function showEditMode() {
    profileView.style.display = 'none';
    profileForm.style.display = 'block';
    profileMessage.textContent = '';
    showSuccess(false);
    // Fields are already filled by fetchUserData
  }

  editBtn.onclick = showEditMode;
  cancelBtn.onclick = showViewMode;

  // Password visibility toggle
  togglePasswordBtn.addEventListener('click', function(e) {
    e.preventDefault();
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      togglePasswordBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
      passwordInput.type = 'password';
      togglePasswordBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
  });

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
    showLoading(true);
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
      showLoading(false);
      if (res.ok) {
        profileMessage.textContent = '';
        showSuccess(true);
        // Update localStorage if email or username changed
        localStorage.setItem('username', username);
        localStorage.setItem('email', email);
        setTimeout(showViewMode, 1200);
      } else {
        profileMessage.textContent = data.message || 'Failed to update profile.';
        profileMessage.style.color = 'red';
      }
    } catch (err) {
      showLoading(false);
      profileMessage.textContent = 'Error updating profile.';
      profileMessage.style.color = 'red';
    }
  };

  // Initial load
  showViewMode();
}); 
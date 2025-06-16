document.addEventListener('DOMContentLoaded', function () {
  loadProfile();
  animateElements();
});

function enableEditing() {
  const phoneInput = document.getElementById('phone');
  const addressInput = document.getElementById('address');
  
  phoneInput.readOnly = false;
  addressInput.readOnly = false;
  phoneInput.classList.add('editing');
  addressInput.classList.add('editing');
  
  document.getElementById('edit-btn').classList.add('d-none');
  document.getElementById('save-btn').classList.remove('d-none');
  
  phoneInput.focus();
  showMessage('עכשיו ניתן לערוך את הפרטים', 'info');
}

async function saveChanges() {
  const username = localStorage.getItem('username');
  const newPhone = document.getElementById('phone').value.trim();
  const newAddress = document.getElementById('address').value.trim();

  if (!newPhone && !newAddress) {
    showMessage('אנא מלא לפחות שדה אחד', 'error');
    return;
  }

  const saveBtn = document.getElementById('save-btn');
  const originalText = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> שומר...';
  saveBtn.disabled = true;

  try {
    const response = await fetch('http://localhost:5000/api/auth/update-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, newPhone, newAddress }),
    });

    const data = await response.json();

    if (response.ok) {
      const phoneInput = document.getElementById('phone');
      const addressInput = document.getElementById('address');
      
      phoneInput.readOnly = true;
      addressInput.readOnly = true;
      phoneInput.classList.remove('editing');
      addressInput.classList.remove('editing');
      
      document.getElementById('edit-btn').classList.remove('d-none');
      document.getElementById('save-btn').classList.add('d-none');
      
      showMessage('הפרטים נשמרו בהצלחה!', 'success');
    } else {
      showMessage(data.message || 'שגיאה בעדכון הפרטים', 'error');
    }
  } catch (error) {
    console.error('שגיאה בעדכון פרטי משתמש:', error);
    showMessage('שגיאה בעדכון הפרטים', 'error');
  } finally {
    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
  }
}

function goBack() {
  document.body.style.transition = 'opacity 0.3s ease';
  document.body.style.opacity = '0';
  setTimeout(() => { window.location.href = 'lawyer-home.html'; }, 300);
}

function logout() {
  document.body.style.transition = 'opacity 0.3s ease';
  document.body.style.opacity = '0';
  setTimeout(() => {
    localStorage.clear();
    window.location.href = '../index.html';
  }, 300);
}

async function loadProfile() {
  const username = localStorage.getItem('username');

  if (!username) {
    showMessage('שגיאה: אין משתמש מחובר', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    return;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/auth/get-profile/${username}`);
    const data = await response.json();

    if (response.ok) {
      document.getElementById('username').value = data.username || '';
      document.getElementById('phone').value = data.phone || '';
      document.getElementById('address').value = data.address || '';
      document.getElementById('greeting').textContent = `שלום, ${data.username}`;
      
      const formGroups = document.querySelectorAll('.form-group');
      formGroups.forEach((group, index) => {
        group.style.opacity = '0';
        group.style.transform = 'translateY(20px)';
        setTimeout(() => {
          group.style.transition = 'all 0.5s ease';
          group.style.opacity = '1';
          group.style.transform = 'translateY(0)';
        }, index * 100);
      });
    } else {
      showMessage(data.message || 'שגיאה בטעינת הפרטים', 'error');
    }
  } catch (error) {
    console.error('שגיאה בטעינת פרטי משתמש:', error);
    showMessage('שגיאה בטעינת הפרטים', 'error');
  }
}

function animateElements() {
  const profileCard = document.querySelector('.profile-card');
  if (profileCard) {
    profileCard.style.opacity = '0';
    profileCard.style.transform = 'translateY(30px)';
    setTimeout(() => {
      profileCard.style.transition = 'all 0.6s ease';
      profileCard.style.opacity = '1';
      profileCard.style.transform = 'translateY(0)';
    }, 200);
  }
  
  const infoCards = document.querySelectorAll('.info-card');
  infoCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    setTimeout(() => {
      card.style.transition = 'all 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 300 + (index * 100));
  });
}

function showMessage(message, type) {
  const existingMessage = document.querySelector('.toast-message');
  if (existingMessage) existingMessage.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  
  const icon = type === 'success' ? 'check-circle' : 
               type === 'error' ? 'exclamation-circle' : 'info-circle';
  
  toast.innerHTML = `<i class="bi bi-${icon}"></i><span>${message}</span>`;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Add CSS styles
if (!document.getElementById('profile-styles')) {
  const style = document.createElement('style');
  style.id = 'profile-styles';
  style.textContent = `
    .toast-message {
      position: fixed; top: 20px; right: 20px; padding: 15px 20px;
      border-radius: 10px; color: white; font-weight: 500;
      display: flex; align-items: center; gap: 10px; z-index: 10000;
      transform: translateX(100%); transition: all 0.3s ease;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); min-width: 300px;
    }
    .toast-message.show { transform: translateX(0); }
    .toast-success { background: linear-gradient(135deg, #28a745, #20c997); }
    .toast-error { background: linear-gradient(135deg, #dc3545, #fd7e14); }
    .toast-info { background: linear-gradient(135deg, #007bff, #0056b3); }
    .form-control.editing {
      border-color: #007bff !important; background: white !important;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1) !important;
    }
    .btn:disabled { opacity: 0.7; cursor: not-allowed; }
  `;
  document.head.appendChild(style);
}
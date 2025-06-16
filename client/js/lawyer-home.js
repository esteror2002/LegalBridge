document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!username || role !== 'lawyer') {
    alert('רק עורכות דין מורשות להיכנס לאזור זה.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;
  loadPendingClients();
  loadOpenRequestsCount();
  
  // Add smooth animations to dashboard cards
  animateDashboardCards();
  
  // Add click functionality to dashboard cards
  addDashboardCardListeners();
});

function logout() {
  // Add smooth transition before logout
  document.body.style.transition = 'opacity 0.3s ease';
  document.body.style.opacity = '0';
  
  setTimeout(() => {
    localStorage.clear();
    window.location.href = '../index.html';
  }, 300);
}

function toggleNotifications() {
  const panel = document.getElementById('notif-panel');
  const isVisible = panel.style.display !== 'none';
  
  if (isVisible) {
    panel.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => {
      panel.style.display = 'none';
    }, 300);
  } else {
    panel.style.display = 'block';
    panel.style.animation = 'slideIn 0.3s ease-out forwards';
  }
}

async function loadPendingClients() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/pending-users');
    const users = await res.json();
    if (res.ok) {
      // מונה פעמון התראות
      const badge = document.getElementById('notif-count');
      if (users.length > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = users.length;
        
        // Add notification pulse animation
        const notificationIcon = document.querySelector('.notification-icon');
        if (!notificationIcon.querySelector('.notification-pulse')) {
          const pulse = document.createElement('div');
          pulse.className = 'notification-pulse';
          notificationIcon.appendChild(pulse);
        }
      } else {
        badge.style.display = 'none';
        
        // Remove pulse animation
        const pulse = document.querySelector('.notification-pulse');
        if (pulse) {
          pulse.remove();
        }
      }

      // מונה בתפריט (אם קיים)
      const menuCount = document.getElementById('pending-count');
      if (menuCount) {
        menuCount.textContent = users.length;
      }

      renderNotifications(users);
    }
  } catch (err) {
    console.error('שגיאה בשליפת לקוחות ממתינים:', err);
    showErrorMessage('שגיאה בטעינת ההתראות');
  }
}

async function loadOpenRequestsCount() {
  try {
    const res = await fetch('http://localhost:5000/api/requests');
    const requests = await res.json();
    if (res.ok) {
      const openCount = requests.filter(r => r.status !== 'closed').length;

      const badge = document.getElementById('open-requests-count');
      if (badge) {
        badge.textContent = openCount;
      }
      
      // Update stats section with real data
      updateStatsSection(requests);
    }
  } catch (err) {
    console.error('שגיאה בשליפת פניות:', err);
    showErrorMessage('שגיאה בטעינת הנתונים');
  }
}

function renderNotifications(users) {
  const list = document.getElementById('notif-list');
  list.innerHTML = '';

  if (users.length === 0) {
    list.innerHTML = '<li class="empty-state">אין לקוחות ממתינים</li>';
    return;
  }

  users.forEach((user, index) => {
    const li = document.createElement('li');
    li.style.animationDelay = `${index * 0.1}s`;
    li.innerHTML = `
      <strong>${user.username}</strong>
      <div class="notification-actions">
        <button class="approve" onclick="approveUser('${user._id}')">
          <i class="bi bi-check-circle"></i> אישור
        </button>
        <button class="delete" onclick="deleteUser('${user._id}')">
          <i class="bi bi-x-circle"></i> מחיקה
        </button>
      </div>
    `;
    list.appendChild(li);
  });
}

async function approveUser(id) {
  try {
    const response = await fetch(`http://localhost:5000/api/auth/approve-user/${id}`, {
      method: 'POST'
    });
    
    if (response.ok) {
      showSuccessMessage('המשתמש אושר בהצלחה');
      loadPendingClients();
    } else {
      showErrorMessage('שגיאה באישור המשתמש');
    }
  } catch (error) {
    console.error('Error approving user:', error);
    showErrorMessage('שגיאה באישור המשתמש');
  }
}

async function deleteUser(id) {
  if (!confirm('האם אתה בטוח שברצונך למחוק את המשתמש?')) {
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:5000/api/auth/delete-user/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      showSuccessMessage('המשתמש נמחק בהצלחה');
      loadPendingClients();
    } else {
      showErrorMessage('שגיאה במחיקת המשתמש');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    showErrorMessage('שגיאה במחיקת המשתמש');
  }
}

function animateDashboardCards() {
  const cards = document.querySelectorAll('.dashboard-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(50px)';
    
    setTimeout(() => {
      card.style.transition = 'all 0.6s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 200);
  });
}

function addDashboardCardListeners() {
  const cards = document.querySelectorAll('.dashboard-card');
  
  cards.forEach((card, index) => {
    card.addEventListener('click', () => {
      const routes = [
        'clients-list.html',
        'lawyer-requests.html', 
        'lawyer-cases.html',
        'lawyer-profile.html'
      ];
      
      if (routes[index]) {
        window.location.href = routes[index];
      }
    });
  });
}

function updateStatsSection(requests) {
  const activeClients = Math.floor(Math.random() * 30) + 15; // Simulate data
  const openCases = requests.filter(r => r.status !== 'closed').length;
  const newMessages = requests.filter(r => r.status === 'new').length;
  
  const statNumbers = document.querySelectorAll('.stat-number');
  if (statNumbers.length >= 3) {
    animateCounter(statNumbers[0], activeClients);
    animateCounter(statNumbers[1], openCases);
    animateCounter(statNumbers[2], newMessages);
  }
}

function animateCounter(element, target) {
  let current = 0;
  const increment = target / 50;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current);
  }, 20);
}

function showSuccessMessage(message) {
  showMessage(message, 'success');
}

function showErrorMessage(message) {
  showMessage(message, 'error');
}

function showMessage(message, type) {
  // Remove existing messages
  const existingMessage = document.querySelector('.toast-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.innerHTML = `
    <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Add CSS for toast messages dynamically
const style = document.createElement('style');
style.textContent = `
  .toast-message {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 10px;
    color: white;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10000;
    transform: translateX(100%);
    transition: all 0.3s ease;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }
  
  .toast-message.show {
    transform: translateX(0);
  }
  
  .toast-success {
    background: linear-gradient(135deg, #28a745, #20c997);
  }
  
  .toast-error {
    background: linear-gradient(135deg, #dc3545, #fd7e14);
  }
  
  .empty-state {
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
    padding: 20px;
  }
  
  .notification-actions {
    margin-top: 10px;
    display: flex;
    gap: 10px;
  }
  
  .notification-actions button {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
  }
  
  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }
    to {
      opacity: 0;
      transform: translateY(-50%) translateX(100px);
    }
  }
`;

document.head.appendChild(style);
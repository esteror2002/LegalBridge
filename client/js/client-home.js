// client-home.js — גרסה מתוקנת

document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!username || role !== 'client') {
    alert('רק לקוחות רשאים לגשת לאזור זה.');
    window.location.href = '../index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;

  // הסרת מסך הטעינה (אם קיים)
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    setTimeout(() => {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 500);
    }, 800);
  }

  // אנימציות כניסה
  animateDashboardCards();

  // נתונים סטטיסטיים (כרגע עם דמו) + טעינת התראות אמיתיות
  loadClientStats();

  // ריענון רקע של התראות כל 30 שניות (אופציונלי, נוח)
  setInterval(() => {
    loadNotifications(); // יתעלם אם אין currentUserId עדיין
  }, 30000);
});

function logout() {
  // מעבר חלק לפני התנתקות
  document.body.style.transition = 'opacity 0.3s ease';
  document.body.style.opacity = '0';

  setTimeout(() => {
    localStorage.clear();
    window.location.href = '../index.html';
  }, 300);
}

function navigateTo(page) {
  // אפקט מעבר חלק
  document.body.style.transition = 'opacity 0.2s ease';
  document.body.style.opacity = '0.8';

  setTimeout(() => {
    window.location.href = page;
  }, 200);
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

function loadClientStats() {
  // טעינת התראות אמיתיות
  loadNotifications();

  // דמו לסטטיסטיקות אחרות (ניתן להחליף לנתונים אמיתיים)
  const stats = {
    activeRequests: Math.floor(Math.random() * 10) + 1,
    newMessages: Math.floor(Math.random() * 5) + 1,
    weeklyMeetings: Math.floor(Math.random() * 3) + 1
  };

  const statNumbers = document.querySelectorAll('.stat-number');
  if (statNumbers.length >= 3) {
    animateCounter(statNumbers[0], stats.activeRequests);
    animateCounter(statNumbers[1], stats.newMessages);
    animateCounter(statNumbers[2], stats.weeklyMeetings);
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

function updateNotificationBadge(count) {
  const badge = document.getElementById('notif-count');
  let pulse = document.querySelector('.notification-pulse');

  if (count > 0) {
    badge.style.display = 'inline-block';
    badge.textContent = count;

    // אם אין pulse ניצור אחד
    if (!pulse) {
      pulse = document.createElement('div');
      pulse.className = 'notification-pulse';
      const icon = document.querySelector('.notification-icon');
      if (icon) icon.appendChild(pulse);
    } else {
      pulse.style.display = 'block';
    }
  } else {
    badge.style.display = 'none';
    if (pulse) pulse.style.display = 'none';
  }
}

function showSuccessMessage(message) { showMessage(message, 'success'); }
function showErrorMessage(message)   { showMessage(message, 'error'); }
function showInfoMessage(message)    { showMessage(message, 'info'); }

function showMessage(message, type) {
  // הסרת הודעות קיימות
  const existingMessage = document.querySelector('.toast-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.innerHTML = `
    <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  // כניסה
  setTimeout(() => { toast.classList.add('show'); }, 100);

  // יציאה
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.remove(); }, 300);
  }, 3000);
}

// מניעת ניווט לכרטיסי "בקרוב"
document.addEventListener('click', function (event) {
  if (event.target.closest('.dashboard-card.coming-soon')) {
    event.preventDefault();
    event.stopPropagation();
    showInfoMessage('תכונה זו תהיה זמינה בקרוב');
  }
});

// טיפול בשגיאות גלובלי
window.addEventListener('error', function (event) {
  console.error('שגיאה בדף הלקוח:', event.error);
  showErrorMessage('אירעה שגיאה טכנית');
});

// בדיקת חיבור
function checkConnection() {
  if (!navigator.onLine) {
    showErrorMessage('אין חיבור לאינטרנט');
  }
}
window.addEventListener('load', checkConnection);
window.addEventListener('online', () => showSuccessMessage('חיבור לאינטרנט חזר'));
window.addEventListener('offline', () => showErrorMessage('חיבור לאינטרנט נותק'));

// עזר
function formatDate(date) {
  return new Date(date).toLocaleDateString('he-IL');
}
function formatTime(date) {
  return new Date(date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

// הודעת ברכה
setTimeout(() => {
  const username = localStorage.getItem('username');
  if (username) showSuccessMessage(`ברוך הבא ${username}!`);
}, 1500);

// ========================
// מערכת התראות אמיתית
// ========================

let currentUserId = null;

// קבלת ה־ID של המשתמש הנוכחי לפי username
async function getCurrentUserId() {
  try {
    const username = localStorage.getItem('username');
    const response = await fetch('http://localhost:5000/api/auth/clients');
    const users = await response.json();
    const currentUser = Array.isArray(users) ? users.find(u => u.username === username) : null;
    return currentUser ? currentUser._id : null;
  } catch (error) {
    console.error('שגיאה בקבלת ID משתמש:', error);
    return null;
  }
}

// טעינת התראות מהשרת
async function loadNotifications() {
  try {
    if (!currentUserId) {
      currentUserId = await getCurrentUserId();
    }
    if (!currentUserId) {
      console.error('לא נמצא ID של המשתמש');
      return;
    }

    // אפשר גם ?unreadOnly=true כדי להציג רק לא-נקראו בפאנל
    const response = await fetch(`http://localhost:5000/api/notifications/user/${currentUserId}`);
    if (!response.ok) {
      console.error('שגיאה בשליפת התראות:', response.status, response.statusText);
      return;
    }

    const data = await response.json();

    //  התיקון: unreadCount מגיע מ-data.pagination.unreadCount
    const unreadCount = data?.pagination?.unreadCount || 0;
    updateNotificationBadge(unreadCount);

    // הצגת ההתראות בפאנל (כל ההתראות שחזרו)
    displayNotifications(Array.isArray(data.notifications) ? data.notifications : []);
  } catch (error) {
    console.error('שגיאה בטעינת התראות:', error);
  }
}

// הצגת ההתראות בפאנל
function displayNotifications(notifications) {
  const notifList = document.getElementById('notif-list');

  if (!Array.isArray(notifications) || notifications.length === 0) {
    notifList.innerHTML = '<li class="empty-state">אין התראות חדשות</li>';
    return;
  }

  notifList.innerHTML = '';

  notifications.forEach(notification => {
    const listItem = document.createElement('li');
    listItem.className = `notification-item ${notification.isRead ? 'read' : 'unread'}`;
    listItem.setAttribute('data-id', notification._id);

    const timeAgo = getTimeAgo(notification.createdAt);

    listItem.innerHTML = `
      <div class="notification-content">
        <div class="notification-header">
          <h4>${escapeHtml(notification.title || 'התראה')}</h4>
          <span class="notification-time">${timeAgo}</span>
        </div>
        <p>${escapeHtml(notification.message || '')}</p>
        ${notification.link ? `<button class="notification-link" onclick="handleNotificationClick('${notification._id}', '${notification.link}')">צפה</button>` : ''}
      </div>
      ${!notification.isRead ? '<div class="unread-dot"></div>' : ''}
    `;

    notifList.appendChild(listItem);
  });
}

// סימון התראה כנקראה + ניווט
async function handleNotificationClick(notificationId, link) {
  try {
    await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, { method: 'PUT' });

    if (link) {
      navigateTo(link);
    }

    // רענון ספירה ורשימה
    loadNotifications();
  } catch (error) {
    console.error('שגיאה בטיפול בהתראה:', error);
  }
}

// חישוב זמן יחסי
function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'זה עתה';
  if (diffInSeconds < 3600) return `לפני ${Math.floor(diffInSeconds / 60)} דקות`;
  if (diffInSeconds < 86400) return `לפני ${Math.floor(diffInSeconds / 3600)} שעות`;
  return `לפני ${Math.floor(diffInSeconds / 86400)} ימים`;
}

// פונקציה אחת מאוחדת לפתיחה/סגירה של לוח ההתראות
function toggleNotifications() {
  const panel = document.getElementById('notif-panel');
  const isVisible = panel.style.display !== 'none' && panel.style.display !== '';

  if (isVisible) {
    panel.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => {
      panel.style.display = 'none';
    }, 300);
  } else {
    // נטען התראות טריות לפני הצגה
    loadNotifications();
    panel.style.display = 'block';
    panel.style.animation = 'slideIn 0.3s ease-out forwards';
  }
}

// עזר: הגנת XSS לטקסטים מוצגים
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// בדיקת מצב חיבור אינטרנט
window.addEventListener('online',  () => showSuccessMessage('חיבור לאינטרנט חזר'));
window.addEventListener('offline', () => showErrorMessage('חיבור לאינטרנט נותק'));

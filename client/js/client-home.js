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
    
    // הפעלת אנימציות כניסה
    animateDashboardCards();
    
    // טעינת נתונים סטטיסטיים
    loadClientStats();
  });
  
  function logout() {
    // הוספת מעבר חלק לפני התנתקות
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
  
  function navigateTo(page) {
    // הוספת אפקט מעבר חלק
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
    // סימולציה של טעינת נתונים
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
    
    // עדכון תג התראות
    updateNotificationBadge(stats.newMessages);
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
    const pulse = document.querySelector('.notification-pulse');
    
    if (count > 0) {
      badge.style.display = 'inline-block';
      badge.textContent = count;
      
      // הוספת אנימציית פעמון
      if (!pulse) {
        const newPulse = document.createElement('div');
        newPulse.className = 'notification-pulse';
        document.querySelector('.notification-icon').appendChild(newPulse);
      }
    } else {
      badge.style.display = 'none';
      if (pulse) {
        pulse.remove();
      }
    }
  }
  
  function showSuccessMessage(message) {
    showMessage(message, 'success');
  }
  
  function showErrorMessage(message) {
    showMessage(message, 'error');
  }
  
  function showInfoMessage(message) {
    showMessage(message, 'info');
  }
  
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
    
    // אנימציית כניסה
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    // הסרה אחרי 3 שניות
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
  
  // הוספת מאזינים לכרטיסי הלוח
  document.addEventListener('click', function(event) {
    // מניעת ניווט לכרטיסים של "בקרוב"
    if (event.target.closest('.dashboard-card.coming-soon')) {
      event.preventDefault();
      event.stopPropagation();
      showInfoMessage('תכונה זו תהיה זמינה בקרוב');
      return;
    }
  });
  
  // טיפול בשגיאות
  window.addEventListener('error', function(event) {
    console.error('שגיאה בדף הלקוח:', event.error);
    showErrorMessage('אירעה שגיאה טכנית');
  });
  
  // בדיקת מצב חיבור לאינטרנט
  function checkConnection() {
    if (!navigator.onLine) {
      showErrorMessage('אין חיבור לאינטרנט');
    }
  }
  
  window.addEventListener('load', checkConnection);
  window.addEventListener('online', () => showSuccessMessage('חיבור לאינטרנט חזר'));
  window.addEventListener('offline', () => showErrorMessage('חיבור לאינטרנט נותק'));
  
  // פונקציה לטעינת בקשות הלקוח (אופציונלי - לחיבור עתידי לשרת)
  async function loadClientRequests() {
    try {
      // כאן ניתן להוסיף קריאה לשרת לטעינת בקשות הלקוח
      // const response = await fetch('/api/client/requests');
      // const requests = await response.json();
      console.log('טוען בקשות לקוח...');
    } catch (error) {
      console.error('שגיאה בטעינת בקשות:', error);
      showErrorMessage('שגיאה בטעינת הנתונים');
    }
  }
  
  // פונקציות עזר נוספות
  function formatDate(date) {
    return new Date(date).toLocaleDateString('he-IL');
  }
  
  function formatTime(date) {
    return new Date(date).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // הודעת ברכה לראשונה
  setTimeout(() => {
    const username = localStorage.getItem('username');
    if (username) {
      showSuccessMessage(`ברוך הבא ${username}!`);
    }
  }, 1500);
  
  console.log('🎉 סקריפט לקוח נטען בהצלחה!');
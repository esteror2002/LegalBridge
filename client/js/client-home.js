document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 טוען דף לקוח...');
  
  // בדיקת הרשאות
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  
  console.log('👤 משתמש:', username, 'תפקיד:', role);
  
  if (!username || role !== 'client') {
      console.log('❌ אין הרשאה - מפנה לדף הבית');
      alert('רק לקוחות רשאים לגשת לאזור זה.');
      window.location.href = '../index.html';
      return;
  }

  // עדכון שם המשתמש בממשק
  updateUserInterface(username);
  
  // הסרת מסך הטעינה
  hideLoadingScreen();
  
  // הפעלת פונקציונליות הדף
  initializePage();
});

function updateUserInterface(username) {
  console.log('🔄 מעדכן ממשק למשתמש:', username);
  
  // עדכון הברכה בסיידבר
  const sidebarGreeting = document.getElementById('sidebarGreeting');
  if (sidebarGreeting) {
      sidebarGreeting.textContent = `שלום, ${username}`;
  }
  
  // עדכון שם המשתמש בהדר
  const userName = document.getElementById('userName');
  if (userName) {
      userName.textContent = `שלום, ${username}`;
  }
  
  // עדכון הברכה הישנה (תאימות לאחור)
  const greeting = document.getElementById('greeting');
  if (greeting) {
      greeting.textContent = `שלום, ${username}`;
  }
}

function hideLoadingScreen() {
  console.log('🎬 מסיר מסך טעינה...');
  
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
      // הוספת עיכוב קטן לאפקט יפה
      setTimeout(() => {
          loadingOverlay.style.opacity = '0';
          setTimeout(() => {
              loadingOverlay.style.display = 'none';
              console.log('✅ מסך טעינה הוסר');
          }, 500);
      }, 800); // 800ms עיכוב
  } else {
      console.log('⚠️ מסך טעינה לא נמצא');
  }
}

function initializePage() {
  console.log('⚡ מפעיל פונקציונליות דף...');
  
  // הפעלת תפריט סיידבר
  initializeSidebar();
  
  // הפעלת תפריט משתמש
  initializeUserMenu();
  
  // הפעלת אנימציות
  initializeAnimations();
  
  console.log('🎉 הדף הופעל בהצלחה!');
}

function initializeSidebar() {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  
  if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', function() {
          console.log('🔄 מחליף מצב סיידבר');
          sidebar.classList.toggle('open');
      });
  }
  
  // סגירת סיידבר בלחיצה מחוץ לו (מובייל)
  document.addEventListener('click', function(event) {
      if (window.innerWidth <= 1200) {
          if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
              sidebar.classList.remove('open');
          }
      }
  });
}

function initializeUserMenu() {
  const userProfile = document.querySelector('.user-profile');
  const userDropdown = document.getElementById('userDropdown');
  
  if (userProfile && userDropdown) {
      // פתיחה/סגירה של תפריט משתמש
      userProfile.addEventListener('click', function(event) {
          event.stopPropagation();
          toggleUserMenu();
      });
      
      // סגירת תפריט בלחיצה מחוץ לו
      document.addEventListener('click', function() {
          userDropdown.classList.remove('show');
      });
  }
}

function toggleUserMenu() {
  const userDropdown = document.getElementById('userDropdown');
  if (userDropdown) {
      console.log('🔄 מחליף מצב תפריט משתמש');
      userDropdown.classList.toggle('show');
  }
}

function initializeAnimations() {
  // אנימציות כניסה לאלמנטים
  const animatedElements = document.querySelectorAll('.welcome-section, .stats-section, .activity-section');
  
  // הוספת מחלקות אנימציה עם עיכוב
  animatedElements.forEach((element, index) => {
      setTimeout(() => {
          element.style.opacity = '1';
          element.style.transform = 'translateY(0)';
      }, 200 * (index + 1));
  });
}

function logout() {
  console.log('🚪 מתנתק...');
  
  // הצגת אישור
  if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
      // ניקוי localStorage
      localStorage.clear();
      
      // הצגת הודעה
      alert('התנתקת בהצלחה!');
      
      // מעבר לדף הבית
      window.location.href = '../index.html';
  }
}

// פונקציות עזר נוספות
function showNotification(message, type = 'info') {
  console.log(`📢 הודעה (${type}): ${message}`);
  
  // יצירת הודעה
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
  `;
  
  // עיצוב הודעה
  Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      left: '20px',
      background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
      color: 'white',
      padding: '15px 20px',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      zIndex: '10000',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      animation: 'slideInLeft 0.3s ease-out'
  });
  
  // הוספת CSS לאנימציה
  if (!document.querySelector('#notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
          @keyframes slideInLeft {
              from { transform: translateX(-100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
          }
      `;
      document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // הסרה אוטומטית
  setTimeout(() => {
      notification.remove();
  }, 4000);
}

// בדיקת מצב חיבור (אופציונלי)
function checkConnection() {
  if (!navigator.onLine) {
      showNotification('אין חיבור לאינטרנט', 'error');
  }
}

// הפעלת בדיקת חיבור
window.addEventListener('load', checkConnection);
window.addEventListener('online', () => showNotification('חיבור לאינטרנט חזר', 'success'));
window.addEventListener('offline', () => showNotification('חיבור לאינטרנט נותק', 'error'));

// הוספת מאזינים לכפתורים (אם יש)
document.addEventListener('click', function(event) {
  // כפתור עזרה
  if (event.target.matches('.help-btn')) {
      showNotification('צ\'אט עזרה יפתח בקרוב...', 'info');
  }
  
  // כרטיסי סטטיסטיקה
  if (event.target.closest('.stat-card')) {
      const statCard = event.target.closest('.stat-card');
      const statLabel = statCard.querySelector('.stat-label').textContent;
      showNotification(`מציג פרטים על ${statLabel}`, 'info');
  }
});

// עזור בניפוי שגיאות
window.addEventListener('error', function(event) {
  console.error('❌ שגיאה בדף:', event.error);
});

console.log('📜 קובץ JavaScript נטען בהצלחה');
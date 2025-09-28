document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!username || role !== 'client') {
    alert('רק לקוחות רשאים לגשת לאזור זה.');
    window.location.href = '../index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;
  loadProfile();
  animateCards();
  loadActivityStats();
});

function enableEditing() {
  document.getElementById('phone').readOnly = false;
  document.getElementById('address').readOnly = false;
  
  // שינוי מצב הכפתורים
  document.getElementById('edit-btn').classList.add('d-none');
  document.getElementById('save-btn').classList.remove('d-none');
  
  // הוספת פוקוס לשדה הראשון
  document.getElementById('phone').focus();
  
  showInfoMessage('כעת תוכל לערוך את הפרטים שלך');
}

async function saveChanges() {
  const username = localStorage.getItem('username');
  const newPhone = document.getElementById('phone').value.trim();
  const newAddress = document.getElementById('address').value.trim();

  // בדיקת תקינות
  if (!newPhone || !newAddress) {
    showErrorMessage('אנא מלא את כל השדות');
    return;
  }

  // בדיקת תקינות מספר טלפון
  const phoneRegex = /^[0-9\-\+\(\)\s]+$/;
  if (!phoneRegex.test(newPhone)) {
    showErrorMessage('מספר הטלפון אינו תקין');
    return;
  }

  try {
    showInfoMessage('שומר שינויים...');
    
    const response = await fetch('http://localhost:5000/api/auth/update-profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        newPhone,
        newAddress
      }),
    });

    const data = await response.json();

    if (response.ok) {
      showSuccessMessage('הפרטים נשמרו בהצלחה!');
      
      // חזרה למצב קריאה בלבד
      document.getElementById('phone').readOnly = true;
      document.getElementById('address').readOnly = true;

      // שינוי מצב הכפתורים
      document.getElementById('edit-btn').classList.remove('d-none');
      document.getElementById('save-btn').classList.add('d-none');

    } else {
      showErrorMessage(data.message || 'שגיאה בעדכון הפרטים');
    }

  } catch (error) {
    console.error('שגיאה בעדכון פרטי משתמש:', error);
    showErrorMessage('שגיאה בחיבור לשרת');
  }
}

function goBack() {
  // אפקט מעבר חלק
  document.body.style.transition = 'opacity 0.3s ease';
  document.body.style.opacity = '0';
  
  setTimeout(() => {
    window.location.href = 'client-home.html';
  }, 300);
}

function logout() {
  if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
    // אפקט מעבר חלק
    document.body.style.transition = 'opacity 0.3s ease';
    document.body.style.opacity = '0';
    
    setTimeout(() => {
      localStorage.clear();
      window.location.href = '../index.html';
    }, 300);
  }
}

async function loadProfile() {
  const username = localStorage.getItem('username');
  
  if (!username) {
    showErrorMessage('שגיאה: אין משתמש מחובר');
    setTimeout(() => {
      window.location.href = '../index.html';
    }, 2000);
    return;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/auth/get-profile/${username}`);
    const data = await response.json();

    if (response.ok) {
      document.getElementById('username').value = data.username || '';
      document.getElementById('phone').value = data.phone || '';
      document.getElementById('address').value = data.address || '';
      
      // אנימציית טעינה מוצלחת
      animateProfileLoad();
      
    } else {
      showErrorMessage(data.message || 'שגיאה בטעינת הפרטים');
    }

  } catch (error) {
    console.error('שגיאה בטעינת פרטי משתמש:', error);
    showErrorMessage('שגיאה בחיבור לשרת');
  }
}

function animateCards() {
  const cards = document.querySelectorAll('.profile-card, .activity-card, .security-card');
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

function animateProfileLoad() {
  const inputs = document.querySelectorAll('.form-input');
  inputs.forEach((input, index) => {
    setTimeout(() => {
      input.style.animation = 'slideInRight 0.5s ease-out';
    }, index * 100);
  });
}

function loadActivityStats() {
  // סימולציה של טעינת נתונים
  const stats = {
    requests: Math.floor(Math.random() * 10) + 1,
    messages: Math.floor(Math.random() * 20) + 5,
    meetings: Math.floor(Math.random() * 5) + 1
  };
  
  const statNumbers = document.querySelectorAll('.stat-number');
  if (statNumbers.length >= 3) {
    setTimeout(() => {
      animateCounter(statNumbers[0], stats.requests);
    }, 800);
    setTimeout(() => {
      animateCounter(statNumbers[1], stats.messages);
    }, 1000);
    setTimeout(() => {
      animateCounter(statNumbers[2], stats.meetings);
    }, 1200);
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

function showComingSoon() {
  showInfoMessage('תכונה זו תהיה זמינה בקרוב');
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
  
  // הסרה אחרי 4 שניות
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

// הוספת CSS לאנימציות נוספות
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .form-input:focus {
    animation: pulse 0.3s ease-in-out;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  
  .security-option:hover .option-icon {
    animation: bounce 0.5s ease-in-out;
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
`;

document.head.appendChild(style);

// טיפול בלחיצת Enter בשדות הטופס
document.addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.classList.contains('form-input') && !activeElement.readOnly) {
      // אם לחצו Enter בשדה עריכה, שמור את השינויים
      saveChanges();
    }
  }
});

// טיפול בשגיאות
window.addEventListener('error', function(event) {
  console.error('שגיאה בדף הפרופיל:', event.error);
  showErrorMessage('אירעה שגיאה טכנית');
});

// בדיקת חיבור לאינטרנט
window.addEventListener('online', () => showSuccessMessage('חיבור לאינטרנט חזר'));
window.addEventListener('offline', () => showErrorMessage('חיבור לאינטרנט נותק'));


document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!username || role !== 'lawyer') {
    alert('רק עורכות דין מורשות להיכנס לאזור זה.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;
  
  // טעינת נתונים בסיסיים
  loadPendingClients();
  loadOpenRequestsCount();
  loadApprovedClients();
  loadActiveMeetingsCount();
  loadDailySummary(); // 🆕 הוספה חדשה
  
  // אנימציות
  animateDashboardCards();
  addDashboardCardListeners();
  
  // אירועי פגישות וידאו
  setupVideoMeetingEvents();
  loadRealStats();
});

// === פונקציות וידאו חדשות ===

function setupVideoMeetingEvents() {
  const form = document.getElementById('video-meeting-form');
  if (form) {
    form.addEventListener('submit', handleVideoMeetingSubmit);
  }
}

function showVideoMeetingModal() {
  const modal = document.getElementById('video-modal');
  modal.classList.add('show');
  loadApprovedClients(); // רענון רשימת לקוחות
}

function hideVideoMeetingModal() {
  const modal = document.getElementById('video-modal');
  modal.classList.remove('show');
  // איפוס הטופס
  document.getElementById('video-meeting-form').reset();
}

// פונקציה חדשה - פתיחה/סגירה של חלון פגישות פעילות
function toggleActiveMeetings() {
  const panel = document.getElementById('active-meetings-panel');
  const isVisible = panel.style.display !== 'none';
  
  if (isVisible) {
    panel.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => {
      panel.style.display = 'none';
    }, 300);
  } else {
    panel.style.display = 'block';
    panel.style.animation = 'slideIn 0.3s ease-out forwards';
    loadActiveMeetings(); // טעינת פגישות רק כשפותחים את החלון
  }
}

// טעינת מונה פגישות פעילות (ללא הצגת הפגישות עצמן)
async function loadActiveMeetingsCount() {
  try {
    const response = await fetch('http://localhost:5000/api/meetings/active');
    const meetings = await response.json();
    
    // סינון פגישות - נעלמות רק חצי שעה אחרי הזמן המתוכנן
    const activeMeetings = meetings.filter(meeting => {
      const meetingDate = new Date(meeting.dateTime);
      const now = new Date();
      const thirtyMinutesAfter = new Date(meetingDate.getTime() + (30 * 60 * 1000)); // +30 דקות
      return now < thirtyMinutesAfter;
    });
    
    
    const badge = document.getElementById('active-meetings-count');
    if (activeMeetings.length > 0) {
      badge.style.display = 'inline-block';
      badge.textContent = activeMeetings.length;
    } else {
      badge.style.display = 'none';
    }
    
  } catch (error) {
    console.error('שגיאה בטעינת מונה פגישות:', error);
  }
}

// טעינת לקוחות מאושרים לרשימה
async function loadApprovedClients() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/clients'); // תואם לנתיב הקיים שלך
    const clients = await response.json();
    
    const select = document.getElementById('client-select');
    if (!select) return;
    
    // ניקוי אפשרויות קיימות
    select.innerHTML = '<option value="">בחר לקוח...</option>';
    
    clients.forEach(client => {
      const option = document.createElement('option');
      option.value = client._id;
      option.textContent = `${client.username} - ${client.email}`;
      option.dataset.phone = client.phone || '';
      option.dataset.email = client.email;
      select.appendChild(option);
    });
    
  } catch (error) {
    console.error('שגיאה בטעינת לקוחות:', error);
    showErrorMessage('שגיאה בטעינת רשימת הלקוחות');
  }
}

// יצירת פגישת וידאו
async function handleVideoMeetingSubmit(event) {
  event.preventDefault();
  
  const clientId = document.getElementById('client-select').value;
  const title = document.getElementById('meeting-title').value;
  const dateTime = document.getElementById('meeting-date').value;
  const duration = document.getElementById('meeting-duration').value;
  const notes = document.getElementById('meeting-notes').value;
  
  if (!clientId || !title || !dateTime) {
    showErrorMessage('אנא מלא את כל השדות החובה');
    return;
  }

  // בדיקה שהתאריך עתידי
  const selectedDate = new Date(dateTime);
  const now = new Date();
  if (selectedDate <= now) {
    showErrorMessage('יש לבחור תאריך ושעה עתידיים');
    return;
  }
  
  try {
    // יצירת מזהה ייחודי לפגישה
    const meetingId = generateMeetingId();
    const jitsiRoomName = `legal-bridge-${meetingId}`;
    const meetingUrl = `https://meet.jit.si/${jitsiRoomName}`;
    
    
    const meetingData = {
      clientId,
      title,
      dateTime,
      duration: parseInt(duration),
      notes,
      meetingId,
      meetingUrl,
      status: 'scheduled'
    };
    
    const response = await fetch('http://localhost:5000/api/meetings/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meetingData)
    });
    
    if (response.ok) {
      const result = await response.json();
      showSuccessMessage('הפגישה נוצרה בהצלחה! הלקוח קיבל הודעה עם קישור הפגישה');
      hideVideoMeetingModal();
      loadActiveMeetingsCount(); // רענון מונה פגישות
    } else {
      const error = await response.json();
      showErrorMessage(error.message || 'שגיאה ביצירת הפגישה');
    }
    
  } catch (error) {
    console.error('שגיאה ביצירת פגישה:', error);
    showErrorMessage('שגיאה ביצירת הפגישה');
  }
}

// יצירת מזהה ייחודי לפגישה
function generateMeetingId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  const meetingId = `${timestamp}-${randomStr}`;
  return meetingId;
}

// טעינת פגישות פעילות - נעלמות רק חצי שעה אחרי הזמן המתוכנן
async function loadActiveMeetings() {
  try {
    const response = await fetch('http://localhost:5000/api/meetings/active');
    const meetings = await response.json();
    
    // סינון פגישות - נעלמות רק חצי שעה אחרי הזמן המתוכנן
    const activeMeetings = meetings.filter(meeting => {
      const meetingDate = new Date(meeting.dateTime);
      const now = new Date();
      const thirtyMinutesAfter = new Date(meetingDate.getTime() + (30 * 60 * 1000)); // +30 דקות
      return now < thirtyMinutesAfter;
    });
    
    
    const meetingsList = document.getElementById('meetings-list');
    
    if (activeMeetings.length > 0) {
      meetingsList.innerHTML = '';
      
      activeMeetings.forEach(meeting => {
        const meetingElement = createMeetingElement(meeting);
        meetingsList.appendChild(meetingElement);
      });
    } else {
      meetingsList.innerHTML = `
        <div class="no-meetings-message">
          <i class="bi bi-calendar-x"></i>
          <p>אין פגישות פעילות</p>
          <small>כל הפגישות הסתיימו (כולל חצי שעה נוספת לאיחורים)</small>
        </div>
      `;
    }
    
    // עדכון מונה
    const badge = document.getElementById('active-meetings-count');
    if (activeMeetings.length > 0) {
      badge.style.display = 'inline-block';
      badge.textContent = activeMeetings.length;
    } else {
      badge.style.display = 'none';
    }
    
  } catch (error) {
    console.error('שגיאה בטעינת פגישות:', error);
    const meetingsList = document.getElementById('meetings-list');
    meetingsList.innerHTML = `
      <div class="no-meetings-message">
        <i class="bi bi-exclamation-triangle"></i>
        <p>שגיאה בטעינת הפגישות</p>
        <small>נסה לרענן את הדף או פנה לתמיכה טכנית</small>
      </div>
    `;
  }
}

// יצירת אלמנט פגישה קומפקטי
function createMeetingElement(meeting) {
  const div = document.createElement('div');
  div.className = 'meeting-item';
  
  const meetingDate = new Date(meeting.dateTime);
  const formattedDate = meetingDate.toLocaleDateString('he-IL');
  const formattedTime = meetingDate.toLocaleTimeString('he-IL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // חישוב זמן עד/מאז הפגישה
  const now = new Date();
  const timeDiff = meetingDate - now;
  
  let timeUntilText = '';
  let statusClass = '';
  
  if (timeDiff > 0) {
    // פגישה עתידית
    const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursUntil > 24) {
      const daysUntil = Math.floor(hoursUntil / 24);
      timeUntilText = `בעוד ${daysUntil} ימים`;
      statusClass = 'future';
    } else if (hoursUntil > 0) {
      timeUntilText = `בעוד ${hoursUntil} שעות ו-${minutesUntil} דקות`;
      statusClass = 'future';
    } else if (minutesUntil > 0) {
      timeUntilText = `בעוד ${minutesUntil} דקות`;
      statusClass = 'soon';
    } else {
      timeUntilText = 'מתחיל עכשיו!';
      statusClass = 'now';
    }
  } else {
    // פגישה שכבר התחילה
    const minutesPassed = Math.floor(Math.abs(timeDiff) / (1000 * 60));
    const thirtyMinutesAfter = new Date(meetingDate.getTime() + (30 * 60 * 1000));
    
    if (now < thirtyMinutesAfter) {
      if (minutesPassed < 5) {
        timeUntilText = 'התחילה זה עתה - עדיין ניתן להצטרף';
        statusClass = 'active';
      } else {
        timeUntilText = `התחילה לפני ${minutesPassed} דקות - עדיין ניתן להצטרף`;
        statusClass = 'late';
      }
    }
  }
  
  div.innerHTML = `
    <div class="meeting-header">
      <div class="meeting-title">
        <div class="meeting-icon">
          <i class="bi bi-camera-video"></i>
        </div>
        <h4>${meeting.title}</h4>
      </div>
      <span class="meeting-status status-${meeting.status}">${getStatusText(meeting.status)}</span>
    </div>
    <div class="meeting-details">
      <p><i class="bi bi-person"></i> ${meeting.clientName}</p>
      <p><i class="bi bi-calendar"></i> ${formattedDate} בשעה ${formattedTime}</p>
      <p><i class="bi bi-clock"></i> משך ${meeting.duration} דקות</p>
      <p class="time-status time-${statusClass}"><i class="bi bi-hourglass-split"></i> ${timeUntilText}</p>
      ${meeting.notes ? `<p><i class="bi bi-note-text"></i> ${meeting.notes}</p>` : ''}
    </div>
    <div class="meeting-actions">
      <button class="btn btn-primary" onclick="joinMeeting('${meeting.meetingUrl}')">
        <i class="bi bi-camera-video"></i> הצטרף
      </button>
      <button class="btn btn-secondary" onclick="copyMeetingLink('${meeting.meetingUrl}')">
        <i class="bi bi-clipboard"></i> העתק
      </button>
      <button class="btn btn-danger" onclick="cancelMeeting('${meeting._id}')">
        <i class="bi bi-x"></i> בטל
      </button>
    </div>
  `;
  
  return div;
}

// טקסט סטטוס
function getStatusText(status) {
  const statusTexts = {
    scheduled: 'מתוכנן',
    active: 'פעיל',
    completed: 'הושלם',
    cancelled: 'בוטל'
  };
  return statusTexts[status] || status;
}

// הצטרפות לפגישה
function joinMeeting(meetingUrl) {
  window.open(meetingUrl, '_blank');
}

// העתקת קישור פגישה
async function copyMeetingLink(meetingUrl) {
  try {
    await navigator.clipboard.writeText(meetingUrl);
    showSuccessMessage('קישור הפגישה הועתק ללוח');
  } catch (error) {
    console.error('שגיאה בהעתקה:', error);
    showErrorMessage('שגיאה בהעתקת הקישור');
  }
}

// ביטול פגישה
async function cancelMeeting(meetingId) {
  if (!confirm('האם אתה בטוח שברצונך לבטל את הפגישה?')) {
    return;
  }
  
  try {
    
    const response = await fetch(`http://localhost:5000/api/meetings/cancel/${meetingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    
    if (response.ok) {
      showSuccessMessage('הפגישה בוטלה בהצלחה');
      loadActiveMeetings(); // רענון רשימת פגישות
      loadActiveMeetingsCount(); // רענון מונה
    } else {
      const errorData = await response.json();
      console.error('❌ שגיאה מהשרת:', errorData);
      showErrorMessage(errorData.message || 'שגיאה בביטול הפגישה');
    }
  } catch (error) {
    console.error('❌ שגיאה בביטול פגישה:', error);
    showErrorMessage('שגיאה בחיבור לשרת');
  }
}

// === פונקציות קיימות ===

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
  const cards = document.querySelectorAll('.dashboard-card:not(.video-meeting-card)');
  
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

async function loadRealStats() {
  try {
    const res = await fetch('http://localhost:5000/api/stats/overview');
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'שגיאה בשליפת סטטיסטיקות');

    
    setStat('#active-clients-count', data.activeClients);
    setStat('#open-cases-count',     data.openCases);
    setStat('#new-messages-count',   data.newMessages);
  } catch (err) {
    console.error('שגיאה בטעינת סטטיסטיקות:', err);
    showErrorMessage('שגיאה בטעינת הסטטיסטיקות');
  }
}

// טעינת סיכום יומי
async function loadDailySummary() {
  try {
    const response = await fetch('http://localhost:5000/api/stats/daily-summary');
    
    if (!response.ok) {
      throw new Error('שגיאה בטעינת הסיכום');
    }
    
    const data = await response.json();
    
    // עדכון תאריך
    const today = new Date();
    const dateStr = today.toLocaleDateString('he-IL', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    document.getElementById('work-summary-date').textContent = dateStr;
    
    // עדכון תוכן הסיכום
    updateWorkSummaryDisplay(data);
    
  } catch (error) {
    console.error('שגיאה בטעינת סיכום יומי:', error);
    showWorkSummaryError();
  }
}

function updateWorkSummaryDisplay(data) {
  const container = document.getElementById('work-summary-content');
  
  
  // בדיקה אם עבדה היום
  if (data.totalMinutes === 0) {
    container.innerHTML = `
      <div class="no-work-today">
        <i class="bi bi-info-circle"></i>
        <h4>עדיין לא נרשמה עבודה היום</h4>
        <div style="font-size: 13px; margin: 15px 0; line-height: 1.6;">
          <p><strong>כדי שהנתונים יתעדכנו:</strong></p>
          <p>• עבדי על תיקים (הטיימר ירשום אוטומטית)</p>
          <p>• הוסיפי פגישות ביומן האישי</p>
          <p>• סמני משימות כהושלמו</p>
        </div>
        ${data.error ? `<p style="color: #dc3545; font-size: 12px;">שגיאה: ${data.error}</p>` : ''}
      </div>
    `;
    return;
  }
  
  // חישוב אחוזים לגרף
  const casesPercent = data.totalMinutes > 0 ? (data.casesWork.totalMinutes / data.totalMinutes) * 100 : 0;
  const meetingsPercent = data.totalMinutes > 0 ? (data.meetingsWork.totalMinutes / data.totalMinutes) * 100 : 0;
  
  // חישוב זוויות לגרף (360 מעלות = 100%)
  const casesAngle = (casesPercent / 100) * 360;
  const meetingsAngle = (meetingsPercent / 100) * 360;
  
  container.innerHTML = `
    <div class="work-summary-display">
      <div class="work-stats-simple">
        <div class="work-stat-row">
          <div class="work-stat-info">
            <div class="work-stat-value">${data.casesWork.totalHours}</div>
            <div class="work-stat-label">שעות עבודה על תיקים</div>
          </div>
        </div>
        
        <div class="work-stat-row meetings">
          <div class="work-stat-info">
            <div class="work-stat-value">${data.meetingsWork.totalHours}</div>
            <div class="work-stat-label">פגישות</div>
            <div class="work-stat-details">${data.meetingsWork.sessions} פגישות</div>
          </div>
        </div>
        
        ${data.tasksWork.completed > 0 ? `
        <div class="work-stat-row tasks" style="border-right-color: #ffc107;">
          <div class="work-stat-info">
            <div class="work-stat-value">${data.tasksWork.completed}</div>
            <div class="work-stat-label">משימות הושלמו</div>
            <div class="work-stat-details">משימות שסומנו כהושלמו היום</div>
          </div>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #e3f2fd, #f3e5f5); border-radius: 12px;">
          <div style="font-size: 32px; font-weight: bold; color: #007bff;">
            ${data.totalHours}
          </div>
          <div style="color: #666; font-size: 14px;">
            סך הכל שעות עבודה היום
          </div>
        </div>
      </div>


      
      <div class="chart-area">
        <div class="simple-chart" style="background: conic-gradient(
          #007bff 0deg ${casesAngle}deg,
          #28a745 ${casesAngle}deg ${casesAngle + meetingsAngle}deg,
          #f1f3f4 ${casesAngle + meetingsAngle}deg 360deg
        );">
          <div class="chart-center">
            <div class="chart-total">${data.totalHours}</div>
            <div class="chart-label">שעות</div>
          </div>
        </div>
        
        <div class="chart-legend">
          <div class="legend-item">
            <div class="legend-color" style="background: #007bff;"></div>
            <div class="legend-text">תיקים</div>
            <div class="legend-value">${data.casesWork.totalHours}ש</div>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #28a745;"></div>
            <div class="legend-text">פגישות</div>
            <div class="legend-value">${data.meetingsWork.totalHours}ש</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function showWorkSummaryError() {
  const container = document.getElementById('work-summary-content');
  container.innerHTML = `
    <div class="no-work-today">
      <i class="bi bi-exclamation-triangle"></i>
      <h4>שגיאה בטעינת הסיכום</h4>
      <p>נסי לרענן או פני לתמיכה טכנית</p>
    </div>
  `;
}

function updateDailySummaryDisplay(data) {
  const container = document.getElementById('daily-summary-content');
  
  // בדיקה אם עבדה היום
  if (data.totalMinutes === 0) {
    container.innerHTML = `
      <div class="no-work-today">
        <i class="bi bi-calendar-plus"></i>
        <h4>עדיין לא תכננת עבודה היום</h4>
        <p>הזמנים יתעדכנו כשתוסיפי אירועים ליומן האישי</p>
        <button class="btn btn-primary" onclick="window.location.href='lawyer-calendar.html'">
          <i class="bi bi-calendar-week"></i>
          לך ליומן האישי
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="summary-stats">
      <div class="summary-stat-item">
        <span class="summary-stat-number">${data.caseHours}</span>
        <div class="summary-stat-label">שעות עבודה על תיקים</div>
        <div class="summary-stat-count">${data.caseCount} אירועים מתוכננים</div>
      </div>
      <div class="summary-stat-item">
        <span class="summary-stat-number">${data.meetingHours}</span>
        <div class="summary-stat-label">שעות פגישות</div>
        <div class="summary-stat-count">${data.meetingCount} פגישות מתוכננות</div>
      </div>
    </div>
    
    <div class="summary-total">
      <div class="summary-total-number">${data.totalHours}</div>
      <div class="summary-total-label">סך הכל שעות מתוכננות היום</div>
    </div>
    
    <div style="text-align: center; margin-top: 15px;">
      <button class="btn btn-secondary btn-sm" onclick="window.location.href='lawyer-calendar.html'">
        <i class="bi bi-calendar-week"></i>
        צפי ביומן המלא
      </button>
    </div>
  `;
}

function showDailySummaryError() {
  const container = document.getElementById('daily-summary-content');
  container.innerHTML = `
    <div class="no-work-today">
      <i class="bi bi-exclamation-triangle"></i>
      <h4>שגיאה בטעינת הסיכום</h4>
      <p>נסה לרענן או פנה לתמיכה טכנית</p>
    </div>
  `;
}


function setStat(selector, target) {
  const el = document.querySelector(selector);
  if (!el) return;
  animateCounter(el, Number(target) || 0); // משתמש באנימציה שכבר יש לך
}

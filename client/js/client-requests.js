let currentMessageId = null;
let username = '';
let userMessages = [];
let unreadCount = 0;

// טעינת הדף
document.addEventListener('DOMContentLoaded', function () {
  username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!username || role !== 'client') {
    alert('רק לקוחות מורשים להיכנס לעמוד זה.');
    window.location.href = '../index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;

  // הגדרת מאזינים לכפתורי סינון
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const filterType = btn.getAttribute('data-filter');
      filterMessages(filterType);
    });
  });

  // טעינה ראשונית
  filterMessages('inbox');
  animateElements();
  
  // עדכון מונה הודעות לא נקראות כל 30 שניות
  updateUnreadCount();
  setInterval(updateUnreadCount, 30000);
});

// עדכון מונה הודעות לא נקראות
async function updateUnreadCount() {
  try {
    const response = await fetch(`/api/requests/unread-count/${username}`);
    if (response.ok) {
      const data = await response.json();
      unreadCount = data.count;
      updateUnreadBadge();
    }
  } catch (error) {
    console.error('שגיאה בעדכון מונה הודעות:', error);
  }
}

// עדכון התג הודעות לא נקראות
function updateUnreadBadge() {
  const badge = document.getElementById('unread-badge');
  if (!badge) return;
  
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// סימון הודעה כנקראה
async function markAsRead(messageId) {
  try {
    await fetch(`/api/requests/mark-read/${messageId}`, {
      method: 'POST'
    });
    // עדכון מונה
    updateUnreadCount();
  } catch (error) {
    console.error('שגיאה בסימון הודעה כנקראה:', error);
  }
}

// פתיחת מודל הודעה חדשה
function openNewMessageModal() {
  // יצירת מודל דינמי
  const modalHtml = `
    <div class="modal fade" id="new-message-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content modern-modal">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-envelope-plus"></i>
              הודעה חדשה לעורך הדין
            </h5>
            <button type="button" class="close-btn" onclick="closeNewMessageModal()">
              <i class="bi bi-x"></i>
            </button>
          </div>
          
          <div class="modal-body">
            <form id="new-message-form">
              <div class="form-group mb-3">
                <label for="message-subject" class="form-label">
                  <i class="bi bi-chat-text"></i>
                  נושא
                </label>
                <input type="text" id="message-subject" class="form-control" placeholder="נושא ההודעה" required>
              </div>
              
              <div class="form-group mb-3">
                <label for="message-content" class="form-label">
                  <i class="bi bi-file-text"></i>
                  תוכן ההודעה
                </label>
                <textarea id="message-content" class="form-control" rows="5" placeholder="תוכן ההודעה..." required></textarea>
              </div>
            </form>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeNewMessageModal()">
              <i class="bi bi-x-circle"></i>
              ביטול
            </button>
            <button type="button" class="btn btn-primary" onclick="sendNewMessage()">
              <i class="bi bi-send"></i>
              שלח הודעה
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // הוספת המודל לדף
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // הצגת המודל
  const modal = new bootstrap.Modal(document.getElementById('new-message-modal'));
  modal.show();
}

// סגירת מודל הודעה חדשה
function closeNewMessageModal() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('new-message-modal'));
  if (modal) {
    modal.hide();
    // הסרת המודל מהדף אחרי הסגירה
    setTimeout(() => {
      const modalElement = document.getElementById('new-message-modal');
      if (modalElement) modalElement.remove();
    }, 300);
  }
}

// שליחת הודעה חדשה
async function sendNewMessage() {
  const subject = document.getElementById('message-subject').value.trim();
  const message = document.getElementById('message-content').value.trim();

  if (!subject || !message) {
    showMessage('נא למלא את כל השדות', 'error');
    return;
  }

  const sendBtn = document.querySelector('#new-message-modal .btn-primary');
  const originalText = sendBtn.innerHTML;
  sendBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> שולח...';
  sendBtn.disabled = true;

  try {
    const response = await fetch('/api/requests/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        subject,
        message
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      showMessage('ההודעה נשלחה בהצלחה לעורך הדין', 'success');
      closeNewMessageModal();
      setTimeout(() => {
        filterMessages('sent'); // מעבר לדואר יוצא
        // עדכון הכפתור הפעיל
        document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="sent"]').classList.add('active');
      }, 1000);
    } else {
      showMessage(data.message || 'שגיאה בשליחת ההודעה', 'error');
    }
  } catch (error) {
    console.error('שגיאה בשליחת הודעה:', error);
    showMessage('שגיאה בשרת', 'error');
  } finally {
    sendBtn.innerHTML = originalText;
    sendBtn.disabled = false;
  }
}

// סינון הודעות
async function filterMessages(filterType) {
  try {
    showLoadingState();
    const response = await fetch(`/api/requests/my/${username}`);
    const messages = await response.json();

    if (!response.ok) {
      throw new Error('שגיאה בטעינת ההודעות');
    }

    userMessages = messages;
    let filtered = [];
    
    switch(filterType) {
      case 'inbox':
        // דואר נכנס - הודעות שהגיעו מעורך הדין ללקוח
        filtered = messages.filter(m => 
          !m.archived && 
          m.recipientUsername === username && 
          m.status !== 'closed'
        );
        break;
      case 'sent':
        // דואר יוצא - הודעות שהלקוח שלח לעורך הדין
        filtered = messages.filter(m => 
          !m.archived && 
          m.username === username && 
          m.status !== 'closed'
        );
        break;
      case 'archive':
        // ארכיון - כל ההודעות הארכיביות
        filtered = messages.filter(m => m.archived);
        break;
      default:
        filtered = messages;
    }

    displayMessages(filtered, filterType);
    updateMessagesCount(filtered.length);
    hideLoadingState();

  } catch (error) {
    console.error('שגיאה בסינון הודעות:', error);
    showMessage('שגיאה בטעינת ההודעות', 'error');
    hideLoadingState();
  }
}

// הצגת הודעות בטבלה
function displayMessages(messages, filterType) {
  const tableBody = document.getElementById('messages-body');
  const emptyState = document.getElementById('empty-state');
  
  tableBody.innerHTML = '';

  if (messages.length === 0) {
    emptyState.style.display = 'block';
    document.querySelector('.table-wrapper table').style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  document.querySelector('.table-wrapper table').style.display = 'table';

  messages.forEach((msg, index) => {
    const row = document.createElement('tr');
    row.style.animationDelay = `${index * 0.1}s`;
    row.className = 'fade-in';
    
    // הוספת סגנון להודעות לא נקראות
    if (!msg.read && msg.recipientUsername === username) {
      row.classList.add('unread-message');
    }

    let statusLabel = '';
    let actionButtons = '';
    let displayUser = '';
    
    // קביעת מי מוצג בעמודת שולח/מקבל
    if (msg.username === username) {
      displayUser = 'עורך הדין'; // הלקוח שלח, אז נציג שזה הלך לעורך הדין
    } else {
      displayUser = 'עורך הדין'; // עורך הדין שלח, אז נציג שזה הגיע מעורך הדין
    }
    
    // קביעת סטטוס וכפתורים
    if (msg.archived) {
      statusLabel = '<span class="status-badge archived">באריכיון</span>';
      actionButtons = `
        <button class="btn btn-sm btn-info text-white" onclick="openModal('${msg._id}', '${displayUser}', '${msg.subject}', \`${msg.message.replace(/`/g, '\\`')}\`, '${msg.status}', \`${(msg.response || '').replace(/`/g, '\\`')}\`, ${msg.read})">
          <i class="bi bi-eye"></i> צפה
        </button>
        <button class="btn btn-sm btn-success text-white" onclick="restoreMessageFromArchive('${msg._id}')">
          <i class="bi bi-arrow-counterclockwise"></i> שחזר
        </button>
        <button class="btn btn-sm btn-danger text-white" onclick="deleteMessageFromTable('${msg._id}')">
          <i class="bi bi-trash"></i> מחק
        </button>
      `;
    } else if (msg.status === 'closed') {
      statusLabel = '<span class="status-badge closed">סגור</span>';
      actionButtons = `
        <button class="btn btn-sm btn-info text-white" onclick="openModal('${msg._id}', '${displayUser}', '${msg.subject}', \`${msg.message.replace(/`/g, '\\`')}\`, '${msg.status}', \`${(msg.response || '').replace(/`/g, '\\`')}\`, ${msg.read})">
          <i class="bi bi-eye"></i> צפה
        </button>
        <button class="btn btn-sm btn-warning text-dark" onclick="archiveMessageFromTable('${msg._id}')">
          <i class="bi bi-archive"></i> העבר לארכיון
        </button>
        <button class="btn btn-sm btn-danger text-white" onclick="deleteMessageFromTable('${msg._id}')">
          <i class="bi bi-trash"></i> מחק
        </button>
      `;
    } else if (msg.response && msg.response.trim() !== '') {
      statusLabel = '<span class="status-badge responded">נענה</span>';
      actionButtons = `
        <button class="btn btn-sm btn-info text-white" onclick="openModal('${msg._id}', '${displayUser}', '${msg.subject}', \`${msg.message.replace(/`/g, '\\`')}\`, '${msg.status}', \`${(msg.response || '').replace(/`/g, '\\`')}\`, ${msg.read})">
          <i class="bi bi-eye"></i> צפה
        </button>
        <button class="btn btn-sm btn-warning text-dark" onclick="archiveMessageFromTable('${msg._id}')">
          <i class="bi bi-archive"></i> העבר לארכיון
        </button>
      `;
    } else {
      if (msg.username === username) {
        statusLabel = '<span class="status-badge sent">נשלח</span>';
      } else {
        statusLabel = !msg.read ? '<span class="status-badge new">חדש!</span>' : '<span class="status-badge received">התקבל</span>';
      }
      actionButtons = `
        <button class="btn btn-sm btn-info text-white" onclick="openModal('${msg._id}', '${displayUser}', '${msg.subject}', \`${msg.message.replace(/`/g, '\\`')}\`, '${msg.status}', \`${(msg.response || '').replace(/`/g, '\\`')}\`, ${msg.read})">
          <i class="bi bi-eye"></i> צפה
        </button>
        <button class="btn btn-sm btn-warning text-dark" onclick="archiveMessageFromTable('${msg._id}')">
          <i class="bi bi-archive"></i> העבר לארכיון
        </button>
      `;
    }

    const truncatedMessage = msg.message.length > 50 ? 
      msg.message.substring(0, 50) + '...' : msg.message;

    // אייקון נקודה אדומה להודעות לא נקראות
    const unreadIcon = !msg.read && msg.recipientUsername === username ? ' <i class="bi bi-circle-fill text-danger" style="font-size: 8px;"></i>' : '';
    const unreadPrefix = !msg.read && msg.recipientUsername === username ? '🔴 ' : '';

    row.innerHTML = `
      <td><strong>${displayUser}${unreadIcon}</strong></td>
      <td><strong>${unreadPrefix}${msg.subject}</strong></td>
      <td title="${msg.message}">${truncatedMessage}</td>
      <td>${new Date(msg.createdAt).toLocaleString('he-IL')}</td>
      <td>${statusLabel}</td>
      <td>${actionButtons}</td>
    `;

    tableBody.appendChild(row);
  });
  
  // עדכון מונה אחרי הצגה
  updateUnreadCount();
}

// פתיחת מודל צפייה בהודעה
function openModal(id, sender, subject, message, status, response, isRead) {
  currentMessageId = id;
  document.getElementById('modal-sender').textContent = sender;
  document.getElementById('modal-subject').textContent = subject;
  document.getElementById('modal-message').textContent = message;

  // סימון הודעה כנקראה אם היא לא נקראה
  if (!isRead) {
    markAsRead(id);
  }

  // הצגת תגובה אם קיימת
  if (response && response.trim() !== '') {
    document.getElementById('modal-response-section').style.display = 'block';
    document.getElementById('modal-responder').textContent = 'עורך הדין';
    document.getElementById('modal-response-text').textContent = response;
  } else {
    document.getElementById('modal-response-section').style.display = 'none';
  }

  // הצגת אפשרות תגובה ללקוח רק אם זו הודעה מעורך הדין
  const replyWrapper = document.getElementById('modal-reply-wrapper');
  const replyBtn = document.getElementById('send-reply-btn');
  
  // בדיקה אם זו הודעה שהגיעה מעורך הדין (sender = 'עורך הדין')
  if (sender === 'עורך הדין' && status !== 'closed') {
    replyWrapper.style.display = 'block';
    replyBtn.style.display = 'inline-flex';
    document.getElementById('modal-reply').value = ''; // ניקוי שדה התגובה
  } else {
    replyWrapper.style.display = 'none';
    replyBtn.style.display = 'none';
  }

  new bootstrap.Modal(document.getElementById('message-modal')).show();
}

// העברה לארכיון מהטבלה
async function archiveMessageFromTable(messageId) {
  if (!confirm('האם להעביר את ההודעה לארכיון?')) return;

  try {
    const response = await fetch(`/api/requests/archive/${messageId}`, {
      method: 'POST'
    });

    const data = await response.json();
    
    if (response.ok) {
      // הסרת השורה מהטבלה עם אנימציה
      const row = document.querySelector(`button[onclick*="archiveMessageFromTable('${messageId}')"]`).closest('tr');
      row.classList.add('fade-out');
      setTimeout(() => row.remove(), 500);
      
      showMessage('ההודעה הועברה לארכיון בהצלחה', 'success');
      updateMessagesCount();
    } else {
      showMessage(data.message || 'שגיאה בהעברה לארכיון', 'error');
    }
  } catch (error) {
    console.error('שגיאה בהעברה לארכיון:', error);
    showMessage('שגיאה בשרת', 'error');
  }
}

// שחזור מארכיון (להודעות בארכיון)
async function restoreMessageFromArchive(messageId) {
  if (!confirm('האם לשחזר את ההודעה מהארכיון?')) return;

  try {
    const response = await fetch(`/api/requests/unarchive/${messageId}`, {
      method: 'POST'
    });

    const data = await response.json();
    
    if (response.ok) {
      // הסרת השורה מהטבלה עם אנימציה
      const row = document.querySelector(`button[onclick*="restoreMessageFromArchive('${messageId}')"]`).closest('tr');
      row.classList.add('fade-out');
      setTimeout(() => row.remove(), 500);
      
      showMessage('ההודעה שוחזרה מהארכיון בהצלחה', 'success');
      updateMessagesCount();
    } else {
      showMessage(data.message || 'שגיאה בשחזור מהארכיון', 'error');
    }
  } catch (error) {
    console.error('שגיאה בשחזור מהארכיון:', error);
    showMessage('שגיאה בשרת', 'error');
  }
}

// מחיקת הודעה מהטבלה
async function deleteMessageFromTable(messageId) {
  if (!confirm('האם למחוק את ההודעה? פעולה זו לא ניתנת לביטול.')) return;

  try {
    const response = await fetch(`/api/requests/delete/${messageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    const data = await response.json();
    
    if (response.ok) {
      // הסרת השורה מהטבלה עם אנימציה
      const row = document.querySelector(`button[onclick*="deleteMessageFromTable('${messageId}')"]`).closest('tr');
      row.classList.add('fade-out');
      setTimeout(() => row.remove(), 500);
      
      showMessage('ההודעה נמחקה בהצלחה', 'success');
      updateMessagesCount();
    } else {
      showMessage(data.message || 'שגיאה במחיקת ההודעה', 'error');
    }
  } catch (error) {
    console.error('שגיאה במחיקת הודעה:', error);
    showMessage('שגיאה בשרת', 'error');
  }
}

// שליחת תגובה ללקוח
async function sendReply() {
  const replyText = document.getElementById('modal-reply').value.trim();
  if (!replyText) {
    showMessage('יש להזין תגובה', 'error');
    return;
  }

  const sendBtn = document.getElementById('send-reply-btn');
  const originalText = sendBtn.innerHTML;
  sendBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> שולח...';
  sendBtn.disabled = true;

  try {
    // יצירת הודעת תגובה חדשה (לא משתמשים ב-API של reply, אלא יוצרים הודעה חדשה)
    const response = await fetch('/api/requests/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        subject: `תגובה מלקוח: ${document.getElementById('modal-subject').textContent}`,
        message: replyText
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      showMessage('התגובה נשלחה בהצלחה לעורך הדין', 'success');
      closeModal();
      setTimeout(() => {
        filterMessages('sent'); // מעבר לדואר יוצא
      }, 1000);
    } else {
      showMessage(data.message || 'שגיאה בשליחת התגובה', 'error');
    }
  } catch (error) {
    console.error('שגיאה בשליחת תגובה:', error);
    showMessage('שגיאה בשרת', 'error');
  } finally {
    sendBtn.innerHTML = originalText;
    sendBtn.disabled = false;
  }
}

// סגירת מודל
function closeModal() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('message-modal'));
  if (modal) modal.hide();
}

// התנתקות
function logout() {
  document.body.style.transition = 'opacity 0.3s ease';
  document.body.style.opacity = '0';
  setTimeout(() => {
    localStorage.clear();
    window.location.href = '../index.html';
  }, 300);
}

// עדכון מונה הודעות
function updateMessagesCount(count) {
  const el = document.getElementById('messages-count');
  if (el) el.textContent = `${count || 0} הודעות`;
}

// הצגת הודעות
function showMessage(message, type) {
  const existing = document.querySelector('.toast-message');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;

  const icon = type === 'success' ? 'check-circle' :
               type === 'error' ? 'exclamation-circle' : 'info-circle';

  toast.innerHTML = `<i class="bi bi-${icon}"></i><span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// מצב טעינה
function showLoadingState() {
  const tbody = document.querySelector('#messages-table tbody');
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="padding: 40px; text-align: center;">
        <i class="bi bi-hourglass-split" style="font-size: 24px; color: #28a745; animation: spin 1s linear infinite;"></i>
        <div style="margin-top: 10px;">טוען הודעות...</div>
      </td>
    </tr>
  `;
}

function hideLoadingState() {
  // מוסתר אוטומטית כשההודעות מוצגות
}

// אנימציות
function animateElements() {
  ['.filter-panel', '.table-container'].forEach(selector => {
    const el = document.querySelector(selector);
    if (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      setTimeout(() => {
        el.style.transition = 'all 0.6s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 200);
    }
  });
}
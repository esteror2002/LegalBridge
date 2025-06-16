let currentRequestId = null;
let clients = []; // רשימת הלקוחות

// טעינת הדף
document.addEventListener('DOMContentLoaded', function () {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!username || role !== 'lawyer') {
    alert('רק עורכות דין מורשות להיכנס לעמוד זה.');
    window.location.href = '../index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;

  // הגדרת מאזינים לכפתורי סינון
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const filterType = btn.textContent.includes('נכנס') ? 'inbox' :
                        btn.textContent.includes('יוצא') ? 'sent' : 'archive';
      filterRequests(filterType);
    });
  });

  // טעינה ראשונית
  loadClients();
  filterRequests('inbox');
  addNewMessageButton();
  animateElements();
});

// הוספת כפתור פנייה חדשה
function addNewMessageButton() {
  const filterPanel = document.querySelector('.filter-panel .filter-buttons');
  
  const newMessageBtn = document.createElement('button');
  newMessageBtn.className = 'filter-btn new-message-btn';
  newMessageBtn.innerHTML = '<i class="bi bi-plus-circle"></i> פנייה חדשה';
  newMessageBtn.onclick = () => openNewMessageModal();
  
  filterPanel.appendChild(newMessageBtn);
}

// טעינת רשימת לקוחות
async function loadClients() {
  try {
    const response = await fetch('http://localhost:5000/api/requests/clients');
    if (response.ok) {
      clients = await response.json();
    }
  } catch (error) {
    console.error('שגיאה בטעינת לקוחות:', error);
  }
}

// פתיחת מודל פנייה חדשה
function openNewMessageModal() {
  if (clients.length === 0) {
    showMessage('אין לקוחות זמינים', 'error');
    return;
  }

  // יצירת מודל דינמי
  const modalHtml = `
    <div class="modal fade" id="new-message-modal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content modern-modal">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-envelope-plus"></i>
              פנייה חדשה ללקוח
            </h5>
            <button type="button" class="close-btn" onclick="closeNewMessageModal()">
              <i class="bi bi-x"></i>
            </button>
          </div>
          
          <div class="modal-body">
            <form id="new-message-form">
              <div class="form-group mb-3">
                <label for="client-select" class="form-label">
                  <i class="bi bi-person"></i>
                  בחירת לקוח
                </label>
                <select id="client-select" class="form-select" required>
                  <option value="">בחר לקוח...</option>
                  ${clients.map(client => 
                    `<option value="${client.username}">${client.username} - ${client.email}</option>`
                  ).join('')}
                </select>
              </div>
              
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

// סגירת מודל פנייה חדשה
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
  const clientUsername = document.getElementById('client-select').value;
  const subject = document.getElementById('message-subject').value.trim();
  const message = document.getElementById('message-content').value.trim();
  const lawyerUsername = localStorage.getItem('username');

  if (!clientUsername || !subject || !message) {
    showMessage('נא למלא את כל השדות', 'error');
    return;
  }

  const sendBtn = document.querySelector('#new-message-modal .btn-primary');
  const originalText = sendBtn.innerHTML;
  sendBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> שולח...';
  sendBtn.disabled = true;

  try {
    const response = await fetch('/api/requests/send-to-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientUsername,
        subject,
        message,
        lawyerUsername
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      showMessage('ההודעה נשלחה בהצלחה ללקוח', 'success');
      closeNewMessageModal();
      setTimeout(() => {
        filterRequests('sent'); // מעבר לדואר יוצא
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

// סינון פניות
async function filterRequests(filterType) {
  try {
    showLoadingState();
    const response = await fetch('http://localhost:5000/api/requests');
    const requests = await response.json();

    if (!response.ok) {
      throw new Error('שגיאה בטעינת הפניות');
    }

    let filtered = [];
    
    switch(filterType) {
      case 'inbox':
      // פניות ישנות (בלי direction) + פניות חדשות incoming
      filtered = requests.filter(r => 
        !r.archived && 
        (!r.direction || r.direction === 'incoming') && 
        r.status !== 'closed'
      );
      break;
      case 'sent':
        // דואר יוצא - הודעות שעורך הדין שלח ללקוחות (direction: outgoing)
        filtered = requests.filter(r => 
          !r.archived && 
          r.direction === 'outgoing' && 
          r.status !== 'closed'
        );
        break;
      case 'archive':
        // ארכיון - כל הפניות הארכיביות
        filtered = requests.filter(r => r.archived);
        break;
      default:
        filtered = requests;
    }

    displayRequests(filtered, filterType);
    updateRequestsCount(filtered.length);
    hideLoadingState();

  } catch (error) {
    console.error('שגיאה בסינון פניות:', error);
    showMessage('שגיאה בטעינת הפניות', 'error');
    hideLoadingState();
  }
}

// הצגת פניות בטבלה
function displayRequests(requests, filterType) {
  const tableBody = document.getElementById('requests-body');
  const emptyState = document.getElementById('empty-state');
  
  tableBody.innerHTML = '';

  if (requests.length === 0) {
    emptyState.style.display = 'block';
    document.querySelector('.table-wrapper table').style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  document.querySelector('.table-wrapper table').style.display = 'table';

  requests.forEach((req, index) => {
    const row = document.createElement('tr');
    row.style.animationDelay = `${index * 0.1}s`;
    row.className = 'fade-in';

    let statusLabel = '';
    let actionButtons = '';
    let displayUsername = '';
    
    // קביעת מי מוצג בעמודת שם המשתמש
    if (req.direction && req.direction === 'outgoing') {
      displayUsername = req.recipientUsername; // מציג את הלקוח שקיבל
    } else {
      displayUsername = req.username; // מציג את הלקוח ששלח
    }
    
    // קביעת סטטוס וכפתורים
    if (req.archived) {
      statusLabel = '<span class="status-badge archived">באריכיון</span>';
      actionButtons = `
        <button class="btn btn-sm btn-info text-white" onclick="openModal('${req._id}', '${displayUsername}', '${req.subject}', \`${req.message.replace(/`/g, '\\`')}\`, '${req.status}', \`${(req.response || '').replace(/`/g, '\\`')}\`)">
          <i class="bi bi-eye"></i> צפה
        </button>
        <button class="btn btn-sm btn-success text-white" onclick="restoreRequestFromArchive('${req._id}')">
          <i class="bi bi-arrow-counterclockwise"></i> שחזר
        </button>
      `;
    } else if (req.status === 'closed') {
      statusLabel = '<span class="status-badge closed">סגור</span>';
      actionButtons = `
        <button class="btn btn-sm btn-info text-white" onclick="openModal('${req._id}', '${displayUsername}', '${req.subject}', \`${req.message.replace(/`/g, '\\`')}\`, '${req.status}', \`${(req.response || '').replace(/`/g, '\\`')}\`)">
          <i class="bi bi-eye"></i> צפה
        </button>
      `;
    } else if (req.response && req.response.trim() !== '') {
      statusLabel = '<span class="status-badge responded">נענה</span>';
      actionButtons = `
        <button class="btn btn-sm btn-info text-white" onclick="openModal('${req._id}', '${displayUsername}', '${req.subject}', \`${req.message.replace(/`/g, '\\`')}\`, '${req.status}', \`${(req.response || '').replace(/`/g, '\\`')}\`)">
          <i class="bi bi-eye"></i> צפה
        </button>
        <button class="btn btn-sm btn-warning text-dark" onclick="closeRequestFromTable('${req._id}')">
          <i class="bi bi-archive"></i> סגור
        </button>
      `;
    } else {
      statusLabel = (req.direction && req.direction === 'outgoing') ?
              '<span class="status-badge sent">נשלח</span>' : 
        '<span class="status-badge open">ממתין</span>';
      actionButtons = `
        <button class="btn btn-sm btn-info text-white" onclick="openModal('${req._id}', '${displayUsername}', '${req.subject}', \`${req.message.replace(/`/g, '\\`')}\`, '${req.status}', \`${(req.response || '').replace(/`/g, '\\`')}\`)">
          <i class="bi bi-eye"></i> צפה
        </button>
        <button class="btn btn-sm btn-warning text-dark" onclick="closeRequestFromTable('${req._id}')">
          <i class="bi bi-archive"></i> סגור
        </button>
      `;
    }

    const truncatedMessage = req.message.length > 50 ? 
      req.message.substring(0, 50) + '...' : req.message;

    row.innerHTML = `
      <td><strong>${displayUsername}</strong></td>
      <td>${req.subject}</td>
      <td title="${req.message}">${truncatedMessage}</td>
      <td>${new Date(req.createdAt).toLocaleString('he-IL')}</td>
      <td>${statusLabel}</td>
      <td>${actionButtons}</td>
    `;

    tableBody.appendChild(row);
  });
}

// פתיחת מודל צפייה בפנייה
function openModal(id, username, subject, message, status, response) {
  currentRequestId = id;
  document.getElementById('modal-username').textContent = username;
  document.getElementById('modal-subject').textContent = subject;
  document.getElementById('modal-message').textContent = message;
  document.getElementById('modal-response').value = '';

  const isClosed = status === 'closed';
  document.getElementById('modal-response-wrapper').style.display = isClosed ? 'none' : 'block';
  document.getElementById('modal-actions').style.display = isClosed ? 'none' : 'flex';

  if (response && response.trim() !== '') {
    document.getElementById('modal-lawyer-response').style.display = 'block';
    document.getElementById('modal-response-text').textContent = response;
  } else {
    document.getElementById('modal-lawyer-response').style.display = 'none';
  }

  new bootstrap.Modal(document.getElementById('request-modal')).show();
}

// סגירת מודל
function closeModal() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('request-modal'));
  if (modal) modal.hide();
}

// שליחת תגובה
async function sendResponse() {
  const responseText = document.getElementById('modal-response').value.trim();
  if (!responseText) {
    showMessage('יש להזין תגובה', 'error');
    return;
  }

  const btn = document.querySelector('.btn-send-response');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> שולח...';

  try {
    const response = await fetch(`/api/requests/reply/${currentRequestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: responseText })
    });
    
    const data = await response.json();

    if (response.ok) {
      showMessage('התגובה נשלחה בהצלחה', 'success');
      closeModal();
      setTimeout(() => location.reload(), 1000);
    } else {
      showMessage(data.message || 'שגיאה בשליחת תגובה', 'error');
    }
  } catch (error) {
    console.error('שגיאה:', error);
    showMessage('שגיאה בשרת', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// סגירת פנייה
async function closeRequest() {
  if (!confirm('האם לסגור ולהעביר את הפנייה לארכיון?')) return;
  await archiveAndClose(currentRequestId);
  closeModal();
  setTimeout(() => location.reload(), 1000);
}

// סגירת פנייה מהטבלה
async function closeRequestFromTable(id) {
  if (!confirm('האם לסגור ולהעביר את הפנייה לארכיון?')) return;
  await archiveAndClose(id);
  const row = document.querySelector(`button[onclick*="'${id}'"]`).closest('tr');
  row.classList.add('fade-out');
  setTimeout(() => row.remove(), 500);
  updateRequestsCount();
}

// פונקציה מאוחדת לסגירה וארכוב
async function archiveAndClose(id) {
  try {
    await fetch(`http://localhost:5000/api/requests/close/${id}`, { method: 'POST' });
    await fetch(`http://localhost:5000/api/requests/archive/${id}`, { method: 'POST' });
    showMessage('הפנייה סומנה כסגורה והועברה לארכיון', 'success');
  } catch (error) {
    console.error(error);
    showMessage('שגיאה בשרת', 'error');
  }
}

// שחזור מארכיון
async function restoreRequestFromArchive(id) {
  if (!confirm('האם לשחזר את הפנייה לדואר נכנס?')) return;

  try {
    const response = await fetch(`/api/requests/unarchive/${id}`, { method: 'POST' });
    if (response.ok) {
      const row = document.querySelector(`button[onclick*="restoreRequestFromArchive('${id}')"]`).closest('tr');
      row.classList.add('fade-out');
      setTimeout(() => row.remove(), 500);
      showMessage('הפנייה שוחזרה לדואר נכנס', 'success');
    } else {
      showMessage('שגיאה בשחזור', 'error');
    }
  } catch (error) {
    console.error(error);
    showMessage('שגיאה בשרת', 'error');
  }
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

// עדכון מונה פניות
function updateRequestsCount(count) {
  const el = document.getElementById('requests-count');
  if (el) el.textContent = `${count || 0} פניות`;
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
  const tbody = document.querySelector('#requests-table tbody');
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="padding: 40px; text-align: center;">
        <i class="bi bi-hourglass-split" style="font-size: 24px; color: #007bff; animation: spin 1s linear infinite;"></i>
        <div style="margin-top: 10px;">טוען פניות...</div>
      </td>
    </tr>
  `;
}

function hideLoadingState() {
  // מוסתר אוטומטית כשהפניות מוצגות
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

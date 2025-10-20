// client/js/client-case.js
document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  
  if (!username || role !== 'client') {
    alert('רק לקוחות רשאים לגשת לאזור זה.');
    window.location.href = '../index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;
  loadCaseData();
  initializeFileUpload();
});

let currentCase = null;

// טעינת נתוני התיק
async function loadCaseData() {
  const loadingOverlay = document.getElementById('loading-overlay');
  loadingOverlay.classList.remove('hidden');
  
  try {
    const username = localStorage.getItem('username');
    const userResponse = await fetch('http://localhost:5000/api/auth/profile', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    let userId;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      userId = userData._id;
    } else {
      const usersResponse = await fetch('http://localhost:5000/api/auth/clients');
      const users = await usersResponse.json();
      const currentUser = users.find(user => user.username === username);
      if (!currentUser) throw new Error('משתמש לא נמצא');
      userId = currentUser._id;
    }
    
    const caseResponse = await fetch(`http://localhost:5000/api/cases/client/${userId}`);
    const cases = await caseResponse.json();
    
    if (cases.length === 0) {
      showNoCaseMessage();
      return;
    }
    
    currentCase = cases[0];
    displayCaseData(currentCase);
    displayProgress(currentCase.progress || []);
    displaySubcases(currentCase.subCases || []);
    
    document.getElementById('client-upload-section').style.display = 'block';
    setTimeout(() => { loadClientDocuments(); }, 500);
    
  } catch (error) {
    console.error('שגיאה בטעינת נתוני התיק:', error);
    showErrorMessage('שגיאה בטעינת נתוני התיק');
    showNoCaseMessage();
  } finally {
    loadingOverlay.classList.add('hidden');
  }
}

// הצגת נתוני התיק
function displayCaseData(caseData) {
  document.getElementById('case-overview').style.display = 'block';
  document.getElementById('no-case-message').style.display = 'none';
  document.getElementById('case-title').textContent = `תיק של ${caseData.clientName}`;
  const openDate = new Date(caseData.openDate);
  document.getElementById('case-open-date').textContent = `נפתח ב-${openDate.toLocaleDateString('he-IL')}`;
  const statusElement = document.getElementById('case-status');
  const statusText = statusElement.querySelector('span');
  statusText.textContent = caseData.status || 'פתוח';
  statusElement.className = 'case-status';
  if (caseData.status === 'פתוח') statusElement.classList.add('status-open');
  else if (caseData.status === 'סגור') statusElement.classList.add('status-closed');
  else statusElement.classList.add('status-pending');
  document.getElementById('case-description-text').textContent = caseData.description || 'אין תיאור זמין';
}

// הצגת עדכוני התקדמות
function displayProgress(progressItems) {
  const timeline = document.getElementById('progress-timeline');
  if (progressItems.length === 0) {
    timeline.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-clock-history"></i>
        <h4>אין עדכוני התקדמות</h4>
        <p>עדכונים יופיעו כאן כאשר יהיו</p>
      </div>`;
    return;
  }
  timeline.innerHTML = '';
  const sortedProgress = [...progressItems].sort((a, b) => new Date(b.date) - new Date(a.date));
  sortedProgress.forEach((item, index) => {
    const date = new Date(item.date);
    const formattedDate = date.toLocaleDateString('he-IL');
    const formattedTime = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const el = document.createElement('div');
    el.className = 'timeline-item' + (index === 0 ? ' latest' : '');
    el.innerHTML = `
      <div class="timeline-content">
        <h4>${item.title}</h4>
        <p>${item.description}</p>
        <div class="timeline-meta">
          <span>נוסף על ידי: ${item.addedBy}</span>
          <span>${formattedDate} בשעה ${formattedTime}</span>
        </div>
      </div>`;
    timeline.appendChild(el);
  });
}

// הצגת תתי-תיקים
function displaySubcases(subcases) {
  const container = document.getElementById('subcases-container');
  if (subcases.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-folder-x"></i>
        <h3>אין תתי-תיקים</h3>
        <p>תתי-תיקים ומסמכים יופיעו כאן כאשר יהיו</p>
      </div>`;
    return;
  }
  container.innerHTML = subcases.map((subcase, index) => {
    const validDocuments = (subcase.documents || []).filter(doc => {
      const url = (typeof doc === 'object' && doc.gridId) ? `/api/cases/files/${doc.gridId}` : '';
      return !!url;
    });
    const documentsCount = validDocuments.length;
    const documentsHtml = generateDocumentsHtml(validDocuments);
    return `
      <div class="subcase-card" style="animation-delay: ${index * 0.1}s">
        <div class="subcase-header">
          <div class="subcase-title">
            <i class="bi bi-folder"></i>
            <span>${subcase.title}</span>
          </div>
        </div>
        <div class="documents-section">
          <div class="documents-header">
            <div class="documents-count">
              <i class="bi bi-file-earmark-text"></i>
              <span>מסמכים</span>
              <span class="count">${documentsCount}</span>
            </div>
          </div>
          ${documentsHtml}
        </div>
      </div>`;
  }).join('');
}

// HTML למסמכים בתת-תיק
function generateDocumentsHtml(documents) {
  if (!documents || documents.length === 0) {
    return `
      <div class="no-documents">
        <i class="bi bi-file-x"></i>
        <p>אין מסמכים בתת-תיק זה</p>
      </div>`;
  }

  return `
    <div class="documents-grid">
      ${documents.map((doc) => {
        const name = doc.name || 'מסמך';
        const url = doc.gridId ? `/api/cases/files/${doc.gridId}` : '#';
        const extension = name.toLowerCase().split('.').pop();
        let icon = 'bi-file-earmark', fileType = 'קובץ', fileSize = '';
        if (doc.size) fileSize = formatFileSize(doc.size);
        switch (extension) {
          case 'pdf': icon = 'bi-file-earmark-pdf'; fileType = 'PDF'; break;
          case 'doc':
          case 'docx': icon = 'bi-file-earmark-word'; fileType = 'Word'; break;
          case 'jpg':
          case 'jpeg':
          case 'png':
          case 'gif': icon = 'bi-file-earmark-image'; fileType = 'תמונה'; break;
          case 'xlsx':
          case 'xls': icon = 'bi-file-earmark-excel'; fileType = 'Excel'; break;
          default: icon = 'bi-file-earmark-text'; fileType = 'מסמך';
        }
        return `
          <div class="document-item">
            <div class="document-icon"><i class="bi ${icon}"></i></div>
            <div class="document-info">
              <a href="${url}" target="_blank" rel="noopener" class="document-name">${name}</a>
              <div class="document-meta">
                <span>${fileType}${fileSize ? ' • ' + fileSize : ''}</span>
                <span>עודכן ${getRelativeTime(doc.uploadDate || new Date())}</span>
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// ===== העלאת מסמכים (לקוח) =====
function initializeFileUpload() {
  const fileInput = document.getElementById('client-file-input');
  const uploadArea = document.getElementById('upload-area');
  if (fileInput) fileInput.addEventListener('change', handleFileSelect);
  if (uploadArea) {
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) uploadClientDocument(file);
}

function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.style.background = '#f1f5f9';
  event.currentTarget.style.borderColor = '#667eea';
}

function handleDragLeave(event) {
  event.currentTarget.style.background = 'transparent';
  event.currentTarget.style.borderColor = '#e2e8f0';
}

function handleDrop(event) {
  event.preventDefault();
  event.currentTarget.style.background = 'transparent';
  event.currentTarget.style.borderColor = '#e2e8f0';
  const file = event.dataTransfer.files[0];
  if (file) uploadClientDocument(file);
}

async function uploadClientDocument(file) {
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) { showErrorMessage('הקובץ גדול מדי. גודל מקסימלי: 10MB'); return; }
  if (!currentCase) { showErrorMessage('לא נמצא תיק פעיל'); return; }

  const progressDiv = document.getElementById('upload-progress');
  const progressFill = document.getElementById('progress-fill');
  const filenameSpan = document.getElementById('upload-filename');
  const percentageSpan = document.getElementById('upload-percentage');
  progressDiv.style.display = 'block';
  filenameSpan.textContent = `מעלה: ${file.name}`;
  progressFill.style.width = '0%';
  percentageSpan.textContent = '0%';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('uploadedBy', 'client');
  formData.append('clientName', localStorage.getItem('username'));

  const xhr = new XMLHttpRequest();
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const p = Math.round((e.loaded / e.total) * 100);
      progressFill.style.width = p + '%';
      percentageSpan.textContent = p + '%';
    }
  });

  xhr.addEventListener('load', () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      showSuccessMessage('המסמך הועלה בהצלחה! עורך הדין יקבל התראה.');
      document.getElementById('client-file-input').value = '';
      setTimeout(() => { progressDiv.style.display = 'none'; progressFill.style.width = '0%'; }, 1000);
      setTimeout(() => { loadClientDocuments(); }, 1500);
    } else {
      console.error('Server error:', xhr.status, xhr.responseText);
      showErrorMessage('שגיאה בהעלאת הקובץ מהשרת');
      progressDiv.style.display = 'none';
    }
  });

  xhr.addEventListener('error', () => {
    console.error('Network error during upload');
    showErrorMessage('שגיאת רשת בהעלאת הקובץ');
    progressDiv.style.display = 'none';
  });

  try {
    const token = localStorage.getItem('token');
    xhr.open('POST', `http://localhost:5000/api/cases/${currentCase._id}/client-upload`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  } catch (error) {
    console.error('Error sending request:', error);
    showErrorMessage('שגיאה בשליחת הבקשה');
    progressDiv.style.display = 'none';
  }
}

// טעינת מסמכים שהלקוח העלה
async function loadClientDocuments() {
  const listContainer = document.getElementById('client-documents-list');
  if (!currentCase) {
    listContainer.innerHTML = `
      <div class="empty-docs"><i class="bi bi-folder-x"></i><p>אין תיק פעיל</p></div>`;
    return;
  }

  listContainer.innerHTML = `
    <div class="loading-docs"><i class="bi bi-hourglass-split"></i><span>טוען מסמכים...</span></div>`;

  try {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(`http://localhost:5000/api/cases/${currentCase._id}/client-documents`, { headers });
    if (!response.ok) throw new Error('שגיאה בטעינת מסמכים');
    const documents = await response.json();

    if (!documents || documents.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-docs"><i class="bi bi-inbox"></i><p>עדיין לא העלת מסמכים</p></div>`;
      return;
    }

    listContainer.innerHTML = documents.map(doc => {
      const url = doc.gridId ? `/api/cases/files/${doc.gridId}` : '#';
      const name = doc.name || 'מסמך';
      const ext = name.toLowerCase().split('.').pop();
      let icon = 'bi-file-earmark-text';
      if (ext === 'pdf') icon = 'bi-file-earmark-pdf';
      else if (ext === 'doc' || ext === 'docx') icon = 'bi-file-earmark-word';
      else if (['jpg','jpeg','png','gif'].includes(ext)) icon = 'bi-file-earmark-image';
      else if (ext === 'xlsx' || ext === 'xls') icon = 'bi-file-earmark-excel';

      const uploadDate = new Date(doc.uploadDate || Date.now());
      const formattedDate = uploadDate.toLocaleDateString('he-IL');
      const fileSize = formatFileSize(doc.size || 0);

      return `
        <div class="client-doc-item" onclick="window.open('${url}','_blank')">
          <div class="client-doc-icon"><i class="bi ${icon}"></i></div>
          <div class="client-doc-info">
            <div class="client-doc-name">${name}</div>
            <div class="client-doc-meta">
              <span>${fileSize}</span>
              <span>הועלה ב-${formattedDate}</span>
            </div>
          </div>
          <div class="client-doc-actions">
            <button class="doc-action-btn"
                    onclick="event.stopPropagation(); window.open('${url}?download=1','_blank')"
                    title="הורד">
              <i class="bi bi-download"></i>
            </button>
            <button class="doc-action-btn delete"
                    onclick="event.stopPropagation(); deleteClientDocument('${doc._id}')"
                    title="מחק">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>`;
    }).join('');

  } catch (error) {
    console.error('Error loading client documents:', error);
    listContainer.innerHTML = `
      <div class="empty-docs"><i class="bi bi-inbox"></i><p>עדיין לא העלת מסמכים</p></div>`;
  }
}

// מחיקת מסמך של לקוח
async function deleteClientDocument(docId) {
  const confirmed = confirm('האם אתה בטוח שברצונך למחוק את המסמך?');
  if (!confirmed) return;

  try {
    const response = await fetch(
      `http://localhost:5000/api/cases/${currentCase._id}/client-documents/${docId}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
    );
    if (response.ok) {
      showSuccessMessage('המסמך נמחק בהצלחה');
      loadClientDocuments();
    } else throw new Error('שגיאה במחיקת המסמך');
  } catch (error) {
    console.error('שגיאה במחיקת מסמך:', error);
    showErrorMessage('שגיאה במחיקת המסמך');
  }
}

// פונקציות עזר
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getRelativeTime(date) {
  if (!date) return 'תאריך לא ידוע';
  const now = new Date(), uploadDate = new Date(date);
  const diffDays = Math.floor((now - uploadDate) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'היום';
  if (diffDays === 1) return 'אתמול';
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
  if (diffDays < 365) return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  return `לפני ${Math.floor(diffDays / 365)} שנים`;
}

// הודעות/ניווט/אחר
function showNoCaseMessage() {
  document.getElementById('case-overview').style.display = 'none';
  document.querySelector('.progress-section').style.display = 'none';
  document.querySelector('.subcases-section').style.display = 'none';
  document.getElementById('client-upload-section').style.display = 'none';
  document.getElementById('no-case-message').style.display = 'block';
}

function navigateTo(page) {
  document.body.style.transition = 'opacity 0.2s ease';
  document.body.style.opacity = '0.8';
  setTimeout(() => { window.location.href = page; }, 200);
}

function logout() {
  if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
    document.body.style.transition = 'opacity 0.3s ease';
    document.body.style.opacity = '0';
    setTimeout(() => { localStorage.clear(); window.location.href = '../index.html'; }, 300);
  }
}

function showMessage(message, type) {
  const existingMessage = document.querySelector('.toast-message');
  if (existingMessage) existingMessage.remove();
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.innerHTML = `
    <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('show'); }, 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.parentNode && toast.parentNode.removeChild(toast); }, 300);
  }, 3000);
}
function showSuccessMessage(message) { showMessage(message, 'success'); }
function showErrorMessage(message) { showMessage(message, 'error'); }
function showInfoMessage(message) { showMessage(message, 'info'); }

window.addEventListener('error', function(event) {
  if (event.message && event.message.includes('Failed to fetch')) return;
  console.error('Critical error:', event.error);
});

document.addEventListener('visibilitychange', function() {
  if (!document.hidden && currentCase) loadCaseData();
});

document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  
  if (!username || role !== 'client') {
    alert('רק לקוחות רשאים לגשת לאזור זה.');
    window.location.href = '../index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;
  
  // טעינת נתוני התיק
  loadCaseData();
});

let currentCase = null;

// טעינת נתוני התיק
async function loadCaseData() {
  const loadingOverlay = document.getElementById('loading-overlay');
  loadingOverlay.classList.remove('hidden');
  
  try {
    const username = localStorage.getItem('username');
    
    // ראשית, נקבל את ה-ID של המשתמש
    const userResponse = await fetch('http://localhost:5000/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}` // אם יש טוקן
      }
    });
    
    let userId;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      userId = userData._id;
    } else {
      // אם אין API לפרופיל, נחפש לפי username
      const usersResponse = await fetch('http://localhost:5000/api/auth/clients');
      const users = await usersResponse.json();
      const currentUser = users.find(user => user.username === username);
      
      if (!currentUser) {
        throw new Error('משתמש לא נמצא');
      }
      userId = currentUser._id;
    }
    
    // עכשיו נחפש את התיק של המשתמש
    const caseResponse = await fetch(`http://localhost:5000/api/cases/client/${userId}`);
    const cases = await caseResponse.json();
    
    if (cases.length === 0) {
      showNoCaseMessage();
      return;
    }
    
    // נניח שיש רק תיק אחד ללקוח
    currentCase = cases[0];
    displayCaseData(currentCase);
    displayProgress(currentCase.progress || []);
    displaySubcases(currentCase.subCases || []);
    
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
  
  // עדכון כותרת התיק
  document.getElementById('case-title').textContent = `תיק של ${caseData.clientName}`;
  
  // עדכון תאריך פתיחה
  const openDate = new Date(caseData.openDate);
  document.getElementById('case-open-date').textContent = 
    `נפתח ב-${openDate.toLocaleDateString('he-IL')}`;
  
  // עדכון סטטוס
  const statusElement = document.getElementById('case-status');
  const statusText = statusElement.querySelector('span');
  statusText.textContent = caseData.status || 'פתוח';
  
  // הוספת מחלקה לפי סטטוס
  statusElement.className = 'case-status';
  if (caseData.status === 'פתוח') {
    statusElement.classList.add('status-open');
  } else if (caseData.status === 'סגור') {
    statusElement.classList.add('status-closed');
  } else {
    statusElement.classList.add('status-pending');
  }
  
  // עדכון תיאור
  document.getElementById('case-description-text').textContent = 
    caseData.description || 'אין תיאור זמין';
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
      </div>
    `;
    return;
  }
  
  timeline.innerHTML = '';
  
  // מיון לפי תאריך (החדש ביותר ראשון)
  const sortedProgress = [...progressItems].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  
  sortedProgress.forEach((item, index) => {
    const timelineItem = document.createElement('div');
    timelineItem.className = 'timeline-item';
    
    // סימון העדכון הראשון כ-latest
    if (index === 0) {
      timelineItem.classList.add('latest');
    }
    
    const date = new Date(item.date);
    const formattedDate = date.toLocaleDateString('he-IL');
    const formattedTime = date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    timelineItem.innerHTML = `
      <div class="timeline-content">
        <h4>${item.title}</h4>
        <p>${item.description}</p>
        <div class="timeline-meta">
          <span>נוסף על ידי: ${item.addedBy}</span>
          <span>${formattedDate} בשעה ${formattedTime}</span>
        </div>
      </div>
    `;
    
    timeline.appendChild(timelineItem);
  });
}

// הצגת תתי-תיקים עם העיצוב החדש
function displaySubcases(subcases) {
  const container = document.getElementById('subcases-container');
  
  if (subcases.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-folder-x"></i>
        <h3>אין תתי-תיקים</h3>
        <p>תתי-תיקים ומסמכים יופיעו כאן כאשר יהיו</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = subcases.map((subcase, index) => {
    const validDocuments = (subcase.documents || []).filter(doc => {
      const isString = typeof doc === 'string';
      const url = isString ? `/uploads/${doc}` : (doc.url || '');
      return url && url !== '/uploads/file' && (!isString || doc.size !== 0);
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
      </div>
    `;
  }).join('');
}

// פונקציה עזר ליצירת HTML של המסמכים
function generateDocumentsHtml(documents) {
  if (!documents || documents.length === 0) {
    return `
      <div class="no-documents">
        <i class="bi bi-file-x"></i>
        <p>אין מסמכים בתת-תיק זה</p>
      </div>
    `;
  }

  return `
    <div class="documents-grid">
      ${documents.map((doc) => {
        const isString = typeof doc === 'string';
        const name = isString ? doc : (doc.name || doc.originalName || 'מסמך');
        const url = isString ? `/uploads/${doc}` : (doc.url || '');
        
        // קביעת סוג הקובץ ואיקון
        const extension = name.toLowerCase().split('.').pop();
        let icon = 'bi-file-earmark';
        let fileType = 'קובץ';
        let fileSize = '';
        
        // אם יש מידע על גודל קובץ
        if (!isString && doc.size) {
          fileSize = formatFileSize(doc.size);
        }
        
        switch (extension) {
          case 'pdf':
            icon = 'bi-file-earmark-pdf';
            fileType = 'PDF';
            break;
          case 'doc':
          case 'docx':
            icon = 'bi-file-earmark-word';
            fileType = 'Word';
            break;
          case 'jpg':
          case 'jpeg':
          case 'png':
          case 'gif':
            icon = 'bi-file-earmark-image';
            fileType = 'תמונה';
            break;
          case 'xlsx':
          case 'xls':
            icon = 'bi-file-earmark-excel';
            fileType = 'Excel';
            break;
          default:
            icon = 'bi-file-earmark-text';
            fileType = 'מסמך';
        }

        return `
          <div class="document-item">
            <div class="document-icon">
              <i class="bi ${icon}"></i>
            </div>
            <div class="document-info">
              <a href="${url}" target="_blank" rel="noopener" class="document-name">${name}</a>
              <div class="document-meta">
                <span>${fileType}${fileSize ? ' • ' + fileSize : ''}</span>
                <span>עודכן ${getRelativeTime(doc.uploadDate || new Date())}</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// פונקציות עזר
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getRelativeTime(date) {
  if (!date) return 'תאריך לא ידוע';
  
  const now = new Date();
  const uploadDate = new Date(date);
  const diffMs = now - uploadDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'היום';
  if (diffDays === 1) return 'אתמול';
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
  if (diffDays < 365) return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  return `לפני ${Math.floor(diffDays / 365)} שנים`;
}

// הצגת הודעת "אין תיק"
function showNoCaseMessage() {
  document.getElementById('case-overview').style.display = 'none';
  document.querySelector('.progress-section').style.display = 'none';
  document.querySelector('.subcases-section').style.display = 'none';
  document.getElementById('no-case-message').style.display = 'block';
}

// פונקציות ניווט
function goBack() {
  window.history.back();
}

function navigateTo(page) {
  document.body.style.transition = 'opacity 0.2s ease';
  document.body.style.opacity = '0.8';
  
  setTimeout(() => {
    window.location.href = page;
  }, 200);
}

function logout() {
  const confirmLogout = confirm('האם אתה בטוח שברצונך להתנתק?');
  if (confirmLogout) {
    document.body.style.transition = 'opacity 0.3s ease';
    document.body.style.opacity = '0';
    
    setTimeout(() => {
      localStorage.clear();
      window.location.href = '../index.html';
    }, 300);
  }
}

// הודעות Toast
function showMessage(message, type) {
  const existingMessage = document.querySelector('.toast-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.innerHTML = `
    <i class="bi bi-${type === 'success' ? 'check-circle' : 
                     type === 'error' ? 'exclamation-circle' : 
                     'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
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

// טיפול בשגיאות גלובליות
window.addEventListener('error', function(event) {
  console.error('שגיאה בדף התיק:', event.error);
  showErrorMessage('אירעה שגיאה טכנית');
});

// רענון הדף בעת חזרה מהרקע
document.addEventListener('visibilitychange', function() {
  if (!document.hidden && currentCase) {
    console.log('רענון נתוני התיק...');
    loadCaseData();
  }
});

console.log('🎉 סקריפט התיק נטען בהצלחה!');
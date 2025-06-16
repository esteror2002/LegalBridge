document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('id');
  
  if (!caseId) {
    showErrorMessage('לא נמצא מזהה תיק');
    setTimeout(() => {
      window.location.href = 'lawyer-cases.html';
    }, 2000);
    return;
  }

  await loadCaseData(caseId);
});

let currentCaseData = null;

async function loadCaseData(caseId) {
  showLoading(true);
  
  try {
    const response = await fetch(`http://localhost:5000/api/cases/${caseId}`);
    
    if (!response.ok) {
      throw new Error('שגיאה בטעינת נתוני התיק');
    }
    
    currentCaseData = await response.json();
    
    renderClientInfo(currentCaseData);
    renderCaseDetails(currentCaseData);
    renderSubcases(currentCaseData.subCases || [], currentCaseData._id);
    
  } catch (error) {
    console.error('שגיאה בטעינת התיק:', error);
    showErrorMessage('שגיאה בטעינת נתוני התיק');
  } finally {
    showLoading(false);
  }
}

function renderClientInfo(data) {
  const container = document.getElementById('client-info').querySelector('.card-content');
  
  const clientInfo = [
    { label: 'שם מלא', value: data.clientName, icon: 'bi-person' },
    { label: 'טלפון', value: data.clientPhone || 'לא צוין', icon: 'bi-telephone' },
    { label: 'כתובת אימייל', value: data.clientEmail || 'לא צוין', icon: 'bi-envelope' },
    { label: 'כתובת', value: data.clientAddress || 'לא צוין', icon: 'bi-geo-alt' }
  ];

  container.innerHTML = clientInfo.map(item => `
    <div class="info-item">
      <div class="info-label">
        <i class="bi ${item.icon}"></i>
        ${item.label}:
      </div>
      <div class="info-value">${item.value}</div>
    </div>
  `).join('');
}

function renderCaseDetails(data) {
  const container = document.getElementById('case-details').querySelector('.card-content');
  
  const openDate = new Date(data.openDate);
  const formattedDate = openDate.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const statusClass = getStatusClass(data.status);
  
  const caseDetails = [
    { 
      label: 'סטטוס התיק', 
      value: `<span class="status-badge ${statusClass}">${getStatusText(data.status)}</span>`, 
      icon: 'bi-flag' 
    },
    { label: 'תאריך פתיחה', value: formattedDate, icon: 'bi-calendar' },
    { label: 'תיאור התיק', value: data.description || 'לא צוין תיאור', icon: 'bi-file-text' }
  ];

  container.innerHTML = caseDetails.map(item => `
    <div class="info-item">
      <div class="info-label">
        <i class="bi ${item.icon}"></i>
        ${item.label}:
      </div>
      <div class="info-value">${item.value}</div>
    </div>
  `).join('');
}

function getStatusClass(status) {
  switch (status) {
    case 'פעיל': return 'status-active';
    case 'בהמתנה': return 'status-pending';
    case 'סגור': return 'status-closed';
    default: return 'status-pending';
  }
}

function getStatusText(status) {
  return status || 'בהמתנה';
}

function renderSubcases(subCases, caseId) {
  const container = document.getElementById('subcases-container');
  
  if (subCases.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-folder-x"></i>
        <h3>אין תתי-תיקים</h3>
        <p>עדיין לא נוצרו תתי-תיקים עבור תיק זה.<br>לחץ על "הוסף תת-תיק" כדי להתחיל.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = subCases.map((sub, index) => `
    <div class="subcase-card" data-index="${index}">
      <div class="subcase-header">
        <h4 class="subcase-title">
          <i class="bi bi-folder"></i>
          ${sub.title}
        </h4>
      </div>
      
      <ul class="documents-list">
        ${sub.documents.length > 0 
          ? sub.documents.map(doc => `
              <li class="document-item">
                <i class="bi bi-file-earmark"></i>
                <span>${doc}</span>
              </li>
            `).join('')
          : '<li class="document-item empty"><i class="bi bi-file-x"></i><span>אין מסמכים</span></li>'
        }
      </ul>
      
      <button class="add-document-btn" onclick="addDocument('${caseId}', ${index})">
        <i class="bi bi-plus-circle"></i>
        <span>הוסף מסמך</span>
      </button>
    </div>
  `).join('');
}

async function addSubcase() {
  const title = prompt('הזן שם תת-תיק חדש:');
  
  if (!title || title.trim() === '') {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('id');

  showLoading(true);

  try {
    const response = await fetch(`http://localhost:5000/api/cases/${caseId}/subcases`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ title: title.trim() })
    });

    if (response.ok) {
      showSuccessMessage('תת-תיק נוסף בהצלחה');
      await loadCaseData(caseId);
    } else {
      throw new Error('שגיאה בהוספת תת-תיק');
    }
  } catch (error) {
    console.error('שגיאה בהוספת תת-תיק:', error);
    showErrorMessage('שגיאה בהוספת תת-תיק');
  } finally {
    showLoading(false);
  }
}

async function addDocument(caseId, subcaseIndex) {
  const fileName = prompt('הזן שם קובץ (לדוגמה: כתב_הגנה.pdf):');
  
  if (!fileName || fileName.trim() === '') {
    return;
  }

  showLoading(true);

  try {
    const response = await fetch(`http://localhost:5000/api/cases/${caseId}/subcases/${subcaseIndex}/documents`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ fileName: fileName.trim() })
    });

    if (response.ok) {
      showSuccessMessage('מסמך נוסף בהצלחה');
      await loadCaseData(caseId);
    } else {
      throw new Error('שגיאה בהוספת מסמך');
    }
  } catch (error) {
    console.error('שגיאה בהוספת מסמך:', error);
    showErrorMessage('שגיאה בהוספת מסמך');
  } finally {
    showLoading(false);
  }
}

// Event listeners for keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S for quick save (future feature)
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    // Future: Quick save functionality
  }
  
  // ESC to close modals (future feature)
  if (e.key === 'Escape') {
    // Future: Close any open modals
  }
});

// Utility functions
function showLoading(show) {
  const overlay = document.getElementById('loading-overlay');
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

function showSuccessMessage(message) {
  const toast = document.getElementById('success-toast');
  toast.querySelector('span').textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function showErrorMessage(message) {
  // יצירת toast שגיאה זמני
  const errorToast = document.createElement('div');
  errorToast.className = 'toast error-toast';
  errorToast.innerHTML = `
    <i class="bi bi-exclamation-triangle"></i>
    <span>${message}</span>
  `;
  
  // הוספת סגנון לשגיאה
  errorToast.style.background = 'linear-gradient(135deg, #dc3545, #fd7e14)';
  errorToast.style.boxShadow = '0 10px 30px rgba(220, 53, 69, 0.3)';
  
  document.body.appendChild(errorToast);
  
  setTimeout(() => errorToast.classList.add('show'), 100);
  
  setTimeout(() => {
    errorToast.classList.remove('show');
    setTimeout(() => {
      if (errorToast.parentNode) {
        errorToast.parentNode.removeChild(errorToast);
      }
    }, 300);
  }, 4000);
}

// Auto-refresh messages every 30 seconds
setInterval(async () => {
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('id');
  if (caseId) {
    await loadMessages(caseId);
  }
}, 30000);
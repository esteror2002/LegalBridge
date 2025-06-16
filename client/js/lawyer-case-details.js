// lawyer-case-details.js

document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 העמוד נטען');
  
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('id');
  
  console.log('🔍 מזהה תיק:', caseId);
  
  if (!caseId) {
    alert('לא נמצא מזהה תיק');
    console.error('❌ חסר מזהה תיק ב-URL');
    return;
  }

  // הסתרת loading
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
  }

  try {
    console.log('🌐 שולח בקשה לשרת...');
    const res = await fetch(`http://localhost:5000/api/cases/${caseId}`);
    
    console.log('📡 תגובת שרת:', res.status);
    
    if (!res.ok) {
      throw new Error(`שגיאה ${res.status}: ${res.statusText}`);
    }
    
    const caseData = await res.json();
    console.log('📋 נתוני תיק:', caseData);

    renderClientInfo(caseData);
    renderCaseDetails(caseData);
    renderSubcases(caseData.subCases || [], caseData._id);
    
    console.log('✅ הדף נטען בהצלחה');
    
  } catch (error) {
    console.error('❌ שגיאה:', error);
    alert(`שגיאה בטעינת התיק: ${error.message}`);
  } finally {
    // הסתרת loading
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
  }
});

function renderClientInfo(data) {
  console.log('👤 מציג פרטי לקוח');
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
  console.log('📁 מציג פרטי תיק');
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
  console.log('📂 מציג תתי-תיקים:', subCases.length);
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

function addSubcase() {
  const title = prompt('שם תת-תיק חדש:');
  if (!title) return;

  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('id');

  fetch(`http://localhost:5000/api/cases/${caseId}/subcases`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  })
  .then(response => {
    if (response.ok) {
      alert('תת-תיק נוסף בהצלחה');
      location.reload();
    } else {
      alert('שגיאה בהוספת תת-תיק');
    }
  })
  .catch(error => {
    console.error('שגיאה:', error);
    alert('שגיאה בהוספת תת-תיק');
  });
}

function addDocument(caseId, subcaseIndex) {
  const fileName = prompt('הכנס שם קובץ (למשל: כתב_הגנה.pdf)');
  if (!fileName) return;

  fetch(`http://localhost:5000/api/cases/${caseId}/subcases/${subcaseIndex}/documents`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName })
  })
  .then(response => {
    if (response.ok) {
      alert('מסמך נוסף בהצלחה');
      location.reload();
    } else {
      alert('שגיאה בהוספת מסמך');
    }
  })
  .catch(error => {
    console.error('שגיאה:', error);
    alert('שגיאה בהוספת מסמך');
  });
}
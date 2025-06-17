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
    renderProgress(caseData.progress || []);
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
        <!-- 🆕 כפתורי עריכה ומחיקה לתת-תיק -->
        <div class="subcase-actions">
          <button class="edit-btn" onclick="editSubcase('${caseId}', ${index}, '${sub.title}')" title="ערוך תת-תיק">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="delete-btn" onclick="deleteSubcase('${caseId}', ${index})" title="מחק תת-תיק">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      
      <ul class="documents-list">
        ${sub.documents.length > 0 
          ? sub.documents.map((doc, docIndex) => `
              <li class="document-item">
                <i class="bi bi-file-earmark"></i>
                <span>${doc}</span>
                <!-- 🆕 כפתורי עריכה ומחיקה למסמך -->
                <div class="document-actions">
                  <button class="edit-doc-btn" onclick="editDocument('${caseId}', ${index}, ${docIndex}, '${doc}')" title="ערוך מסמך">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="delete-doc-btn" onclick="deleteDocument('${caseId}', ${index}, ${docIndex})" title="מחק מסמך">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
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

// 🆕 פונקציות עדכוני התקדמות
let currentCaseId = null;

// שמירת מזהה התיק לשימוש גלובלי
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  currentCaseId = params.get('id');
});

// הצגת מודל הוספת עדכון התקדמות
function showAddProgressForm() {
  document.getElementById('add-progress-modal').style.display = 'flex';
  document.getElementById('progress-title').value = '';
  document.getElementById('progress-description').value = '';
}

// הסתרת מודל הוספת עדכון התקדמות
function hideAddProgressForm() {
  document.getElementById('add-progress-modal').style.display = 'none';
}

// שליחת עדכון התקדמות
async function submitProgress() {
  const title = document.getElementById('progress-title').value.trim();
  const description = document.getElementById('progress-description').value.trim();
  
  if (!title || !description) {
    alert('יש למלא את כל השדות');
    return;
  }

  try {
    const username = localStorage.getItem('username'); // שם עורך הדין
    
    const response = await fetch(`http://localhost:5000/api/cases/${currentCaseId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title, 
        description, 
        addedBy: username || 'עורך דין'
      })
    });

    if (response.ok) {
      alert('עדכון התקדמות נוסף בהצלחה');
      hideAddProgressForm();
      location.reload(); // רענון הדף
    } else {
      alert('שגיאה בהוספת עדכון התקדמות');
    }
  } catch (error) {
    console.error('שגיאה:', error);
    alert('שגיאה בהוספת עדכון התקדמות');
  }
}


// הצגת עדכוני התקדמות
function renderProgress(progressItems) {
  const timeline = document.getElementById('progress-timeline');
  
  if (progressItems.length === 0) {
    timeline.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-clock-history"></i>
        <h3>אין עדכוני התקדמות</h3>
        <p>עדיין לא נוצרו עדכוני התקדמות עבור תיק זה.<br>לחץ על "הוסף עדכון התקדמות" כדי להתחיל.</p>
      </div>
    `;
    return;
  }
  
  // מיון לפי תאריך (החדש ביותר ראשון)
  const sortedProgress = [...progressItems].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  
  timeline.innerHTML = sortedProgress.map((item, index) => {
    const date = new Date(item.date);
    const formattedDate = date.toLocaleDateString('he-IL');
    const formattedTime = date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <div class="timeline-item ${index === 0 ? 'latest' : ''}">
        <div class="timeline-content">
          <h4>${item.title}</h4>
          <p>${item.description}</p>
          <div class="timeline-meta">
            <span>נוסף על ידי: ${item.addedBy}</span>
            <span>${formattedDate} בשעה ${formattedTime}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 🆕 משתנים למודל העריכה
let editType = '';
let editCaseId = '';
let editIndex = '';
let editDocIndex = '';

// עריכת תת-תיק
function editSubcase(caseId, index, currentTitle) {
  editType = 'subcase';
  editCaseId = caseId;
  editIndex = index;
  
  document.getElementById('edit-modal-title').textContent = 'עריכת תת-תיק';
  document.getElementById('edit-label').textContent = 'שם תת-תיק';
  document.getElementById('edit-input').value = currentTitle;
  document.getElementById('edit-modal').style.display = 'flex';
}

// עריכת מסמך
function editDocument(caseId, subcaseIndex, docIndex, currentName) {
  editType = 'document';
  editCaseId = caseId;
  editIndex = subcaseIndex;
  editDocIndex = docIndex;
  
  document.getElementById('edit-modal-title').textContent = 'עריכת מסמך';
  document.getElementById('edit-label').textContent = 'שם מסמך';
  document.getElementById('edit-input').value = currentName;
  document.getElementById('edit-modal').style.display = 'flex';
}

// הסתרת מודל עריכה
function hideEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  editType = '';
  editCaseId = '';
  editIndex = '';
  editDocIndex = '';
}

// שליחת עריכה
async function submitEdit() {
  const newValue = document.getElementById('edit-input').value.trim();
  
  if (!newValue) {
    alert('יש למלא את השדה');
    return;
  }

  try {
    if (editType === 'subcase') {
      // עריכת תת-תיק
      const response = await fetch(`http://localhost:5000/api/cases/${editCaseId}/subcases/${editIndex}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newValue })
      });

      if (response.ok) {
        alert('תת-תיק עודכן בהצלחה');
        hideEditModal();
        location.reload();
      } else {
        alert('שגיאה בעדכון תת-תיק');
      }
    } else if (editType === 'document') {
      // עריכת מסמך
      const response = await fetch(`http://localhost:5000/api/cases/${editCaseId}/subcases/${editIndex}/documents/${editDocIndex}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: newValue })
      });

      if (response.ok) {
        alert('מסמך עודכן בהצלחה');
        hideEditModal();
        location.reload();
      } else {
        alert('שגיאה בעדכון מסמך');
      }
    }
  } catch (error) {
    console.error('שגיאה:', error);
    alert('שגיאה בעדכון');
  }
}

// מחיקת תת-תיק
async function deleteSubcase(caseId, index) {
  const confirmed = confirm('האם אתה בטוח שברצונך למחוק את תת-התיק? פעולה זו תמחק גם את כל המסמכים שבו.');
  
  if (!confirmed) return;

  try {
    const response = await fetch(`http://localhost:5000/api/cases/${caseId}/subcases/${index}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      alert('תת-תיק נמחק בהצלחה');
      location.reload();
    } else {
      alert('שגיאה במחיקת תת-תיק');
    }
  } catch (error) {
    console.error('שגיאה:', error);
    alert('שגיאה במחיקת תת-תיק');
  }
}

// מחיקת מסמך
async function deleteDocument(caseId, subcaseIndex, docIndex) {
  const confirmed = confirm('האם אתה בטוח שברצונך למחוק את המסמך?');
  
  if (!confirmed) return;

  try {
    const response = await fetch(`http://localhost:5000/api/cases/${caseId}/subcases/${subcaseIndex}/documents/${docIndex}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      alert('מסמך נמחק בהצלחה');
      location.reload();
    } else {
      alert('שגיאה במחיקת מסמך');
    }
  } catch (error) {
    console.error('שגיאה:', error);
    alert('שגיאה במחיקת מסמך');
  }
}
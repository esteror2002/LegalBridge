// lawyer-case-details.js

document.addEventListener('DOMContentLoaded', async () => {
  
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('id');
  
  
  if (!caseId) {
    alert('לא נמצא מזהה תיק');
    console.error('❌ חסר מזהה תיק ב-URL');
    return;
  }

  // הצגת loading
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
  }

  try {
    console.log('שולח בקשה לשרת...');
    const res = await fetch(`http://localhost:5000/api/cases/${caseId}`);
    
    console.log(' תגובת שרת:', res.status);
    
    if (!res.ok) {
      throw new Error(`שגיאה ${res.status}: ${res.statusText}`);
    }
    
    const caseData = await res.json();
    console.log('נתוני תיק:', caseData);

    renderClientInfo(caseData);
    renderCaseDetails(caseData);
    renderProgress(caseData.progress || []);
    renderSubcases(caseData.subCases || [], caseData._id);

    await startAutoTimer(caseId);

    
    // 🆕 זמן מצטבר לתיק + כפתור זמן ידני
    await loadCaseTimeTotal(caseId);
    injectManualTimeButton(caseId);
    startCaseTimeAutoRefresh(caseId);
      
  
    console.log(' הדף נטען בהצלחה');
    
  } catch (error) {
    console.error('שגיאה:', error);
    alert(`שגיאה בטעינת התיק: ${error.message}`);
  } finally {
    // הסתרת loading
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
  }
});

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
    { label: 'תיאור התיק', value: data.description || 'לא צוין תיאור', icon: 'bi-file-text' },
    { 
      label: 'זמן עבודה מצטבר', 
      value: `<span id="case-time-total">--:--</span> <small id="case-time-active" class="timer-badge" style="display:none;margin-right:8px;padding:2px 8px;border-radius:999px;background:#ffd54f;color:#6b5000;font-weight:600;">טיימר פעיל</small>`, 
      icon: 'bi-stopwatch' 
    }
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

function injectManualTimeButton(caseId) {
  const card = document.getElementById('case-details')?.querySelector('.card-content');
  if (!card || document.getElementById('manual-time-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'manual-time-btn';
  btn.className = 'add-progress-btn'; // יש לך כבר סגנון יפה לכפתור – ממחזר
  btn.style.marginTop = '12px';
  btn.innerHTML = `<i class="bi bi-plus-circle"></i> הוסף זמן ידני`;
  btn.onclick = () => addManualTimeForCase(caseId);
  card.appendChild(btn);
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

// פונקציה מעודכנת לרינדור תתי התיקים עם העיצוב החדש
// רינדור תתי-תיקים במצב "סגור" כברירת מחדל + פתיחה/סגירה בלחיצה
function renderSubcases(subCases, caseId) {
  const container = document.getElementById('subcases-container');

  if (!subCases || subCases.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-folder-x"></i>
        <h3>אין תתי-תיקים</h3>
        <p>עדיין לא נוצרו תתי-תיקים עבור תיק זה.<br>לחץ על "הוסף תת-תיק" כדי להתחיל.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = subCases.map((sub, index) => {
    const validDocuments = (sub.documents || []).filter(doc => {
      const isString = typeof doc === 'string';
      const url = isString ? `/uploads/${doc}` : (doc.url || '');
      return url && url !== '/uploads/file' && (!isString || doc.size !== 0);
    });

    const documentsCount = validDocuments.length;
    const documentsHtml = generateDocumentsHtml(validDocuments, caseId, index);

    const isOpen = isSubcaseOpen(caseId, index); // ברירת מחדל: סגור (false)
    const safeTitle = (sub.title || '').replace(/'/g, "\\'");
    const contentId = `subcontent_${caseId}_${index}`; // ל־aria-controls

    return `
      <div class="subcase-card ${isOpen ? 'is-open' : 'is-collapsed'}"
           data-case-id="${caseId}" data-index="${index}"
           style="animation-delay:${index * 0.1}s">
        
        <!-- כותרת תת-תיק: כפתור נגיש שמחליף מצב פתוח/סגור -->
        <button type="button"
                class="subcase-toggle"
                onclick="toggleSubcase('${caseId}', ${index})"
                aria-expanded="${isOpen ? 'true' : 'false'}"
                aria-controls="${contentId}"
                title="פתח/סגור תת-תיק">
          <div class="subcase-title">
            <i class="bi bi-folder2${isOpen ? '-open' : ''}"></i>
            <span>${sub.title}</span>
          </div>
          <div class="subcase-meta">
            <span class="badge" title="מספר מסמכים">${documentsCount}</span>
            <i class="chevron bi bi-chevron-down"></i>
          </div>
        </button>

        <!-- תוכן שנפתח/נסגר -->
        <div class="documents-wrapper" id="${contentId}" style="display:${isOpen ? 'block' : 'none'}">
          <div class="documents-section">
            <div class="documents-header">
              <div class="documents-count">
                <i class="bi bi-file-earmark-text"></i>
                <span>מסמכים</span>
                <span class="count">${documentsCount}</span>
              </div>
              <div class="subcase-actions">
                <button type="button" class="edit-btn"
                        onclick="editSubcase('${caseId}', ${index}, '${safeTitle}')"
                        title="ערוך את שם התת-תיק">
                  <i class="bi bi-pencil"></i>
                </button>
                <button type="button" class="delete-btn"
                        onclick="deleteSubcase('${caseId}', ${index})"
                        title="מחק את התת-תיק (כולל כל המסמכים שבו)">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>

            ${documentsHtml}

            <div class="doc-actions">
              <button type="button" class="btn-upload"
                      onclick="addDocument('${caseId}', ${index})"
                      title="העלאת קובץ (PDF / Word / תמונה וכו') ושיוכו לתיק">
                <i class="bi bi-cloud-upload"></i>
                <span>${documentsCount === 0 ? 'העלה מסמך' : 'העלה מסמך חדש'}</span>
              </button>
              <button type="button" class="btn-note"
                      onclick="addTextNote('${caseId}', ${index})"
                      title="פתיחת עורך פתק TXT לשמירת הערות בתיק">
                <i class="bi bi-journal-text"></i>
                <span>פתק TXT</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}


// פונקציה עזר ליצירת HTML של המסמכים
function generateDocumentsHtml(documents, caseId, subcaseIndex) {
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
      ${documents.map((doc, docIndex) => {
        const isString = typeof doc === 'string';
        const name = isString ? doc : (doc.name || doc.originalName || 'מסמך');
        const url = isString ? `/uploads/${doc}` : (doc.url || '');
        const safeName = name.replace(/'/g, "\\'");
        
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
          
            case 'txt':
            icon = 'bi-file-earmark-text';
            fileType = 'TXT';
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
           <div class="document-actions">
              ${extension === 'txt' ? `
                <button class="edit-doc-btn" onclick="openTextNote('${caseId}', ${subcaseIndex}, ${docIndex})" title="ערוך תוכן TXT">
                  <i class="bi bi-journal-text"></i>
                </button>
              ` : ''}
              <button class="edit-doc-btn" onclick="editDocument('${caseId}', ${subcaseIndex}, ${docIndex}, '${safeName}')" title="ערוך מסמך">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="delete-doc-btn" onclick="deleteDocument('${caseId}', ${subcaseIndex}, ${docIndex})" title="מחק מסמך">
                <i class="bi bi-trash"></i>
              </button>
            </div>

          </div>
        `;
      }).join('')}
    </div>
  `;
}

// פונקציות עזר נוספות
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
  pickFileAndUpload(caseId, subcaseIndex);
}

//  פונקציות עדכוני התקדמות
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
      method: 'POST',
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
        body: JSON.stringify({ name: newValue })
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

// --- העלאת מסמך בפועל לשרת ---
async function uploadDocument(caseId, subcaseIndex, file, displayName) {
  const fd = new FormData();
  fd.append('file', file);
  if (displayName && displayName.trim()) fd.append('displayName', displayName.trim());

  const headers = {};
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`http://localhost:5000/api/cases/${caseId}/subcases/${subcaseIndex}/documents/upload`, {
    method: 'POST',
    headers,
    body: fd
  });

  if (!res.ok) {
    const err = await res.json().catch(()=>({ error: 'שגיאה בהעלאה' }));
    throw new Error(err.error || 'שגיאה בהעלאת מסמך');
  }
}

// --- פתיחת בוחר קבצים + שליחה ---
function pickFileAndUpload(caseId, subcaseIndex) {
  // ודא שקיים input; אם לא – צור אחד
  let input = document.getElementById('hidden-file-input');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'hidden-file-input';
    input.accept = '.pdf,.png,.jpg,.jpeg,.doc,.docx,.xlsx,.xls,.txt';
    input.style.display = 'none';
    document.body.appendChild(input);
  }

  // נקה מאזין קודם (אם היה) כדי למנוע העלאות כפולות
  input.value = '';
  input.onchange = null;

  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (!file) return;

    const displayName = prompt('שם לתצוגה:', file.name) || file.name;

    try {
      await uploadDocument(caseId, subcaseIndex, file, displayName);
      alert('המסמך הועלה בהצלחה');
      location.reload();
    } catch (e) {
      console.error(e);
      alert(e?.message || 'שגיאה בהעלאה');
    } finally {
      input.value = '';
      input.onchange = null;
    }
  };

  // פתח את בוחר הקבצים
  input.click();
}


async function startAutoTimer(caseId){
  try {
    if (!window.TimeTracker) {
      console.warn('TimeTracker לא נטען');
      return;
    }
    // scope ייחודי לדף/תיק הזה
    window.stopCaseTimer = await TimeTracker.init({
      scope: `case_${caseId}`,
      activity: 'case',
      caseId: caseId,
      notes: 'עבודה על פרטי תיק',
      idleMinutes: 5 // עצירה אוטומטית אחרי 5 דקות אי-פעילות
    });
  } catch (e) {
    console.error('שגיאה בהפעלת טיימר:', e);
  }
}

// אופציונלי: כפתור לעצירה ידנית אם תרצי
async function stopTimerManually(){
  if (window.stopCaseTimer) await window.stopCaseTimer();
  alert('הטיימר נעצר ידנית');
}


// המרת דקות לפורמט  HH:MM
function minutesToHHMM(mins) {
  const h = Math.floor((mins || 0) / 60).toString().padStart(2, '0');
  const m = Math.floor((mins || 0) % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// טעינת זמן מצטבר לתיק
async function loadCaseTimeTotal(caseId) {
  try {
    const uid = localStorage.getItem('userId');
    if (!uid) return;

    const res = await fetch(`http://localhost:5000/api/time/case/${caseId}/total`, {
      headers: { 'x-user-id': uid }
    });
    const data = await res.json();
    const el = document.getElementById('case-time-total');
    if (el) el.textContent = minutesToHHMM(data.minutes || 0);
  } catch (e) {
    console.error('שגיאה בשליפת זמן לתיק:', e);
  }
}

// הוספת זמן ידני (אם שכחנו טיימר)
async function addManualTimeForCase(caseId) {
  const uid = localStorage.getItem('userId');
  if (!uid) return alert('אין userId – התחברי מחדש');

  const minutes = Number(prompt('כמה דקות להוסיף לתיק? (מספר שלם)'));
  if (!minutes || minutes < 1) return;

  const notes = prompt('הערה (לא חובה):') || '';
  const date  = new Date().toISOString(); // עכשיו

  try {
    const res = await fetch('http://localhost:5000/api/time/manual', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-user-id': uid },
      body: JSON.stringify({
        caseId, activity: 'case', minutes, date, notes
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'שגיאה');
    // רענון התצוגה
    await loadCaseTimeTotal(caseId);
    alert('הזמן נוסף בהצלחה');
  } catch (e) {
    console.error('שגיאה בהוספת זמן ידני:', e);
    alert(e.message || 'שגיאה בהוספת זמן');
  }
}

let _caseTimeInterval = null;

function minutesToHHMM(mins) {
  const h = Math.floor((mins || 0) / 60).toString().padStart(2, '0');
  const m = Math.floor((mins || 0) % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

async function loadCaseTimeTotal(caseId) {
  try {
    const uid = localStorage.getItem('userId');
    if (!uid) return;
    const res = await fetch(`http://localhost:5000/api/time/case/${caseId}/total`, {
      headers: { 'x-user-id': uid }
    });
    const data = await res.json();
    if (res.ok) {
      const el = document.getElementById('case-time-total');
      if (el) el.textContent = minutesToHHMM(data.minutes || 0);
    }
  } catch (e) { /* no-op */ }
}

function updateActiveBadge(caseId) {
  const badge = document.getElementById('case-time-active');
  if (!badge) return;
  const active = !!localStorage.getItem(`lb_timeLogId_case_${caseId}`);
  badge.style.display = active ? 'inline-block' : 'none';
}

function startCaseTimeAutoRefresh(caseId) {
  clearInterval(_caseTimeInterval);
  // ריענון ראשוני ומהיר
  loadCaseTimeTotal(caseId);
  updateActiveBadge(caseId);
  // ריענון כל 30 שניות (אפשר לשנות ל-20/60)
  _caseTimeInterval = setInterval(() => {
    loadCaseTimeTotal(caseId);
    updateActiveBadge(caseId);
  }, 30000);

  // כשחוזרים לטאב – לרענן מיד
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadCaseTimeTotal(caseId);
      updateActiveBadge(caseId);
    }
  });
}

// --- Text Note state ---
let _textNote = { mode: 'create', caseId: '', subIdx: -1, docIdx: -1, docId: null };

function showTextNoteModal(title, filename='', content='') {
  document.getElementById('text-note-title').textContent = title;
  document.getElementById('text-note-filename').value = filename;
  document.getElementById('text-note-content').value = content;
  document.getElementById('text-note-modal').style.display = 'flex';
}
function hideTextNoteModal() {
  document.getElementById('text-note-modal').style.display = 'none';
  _textNote = { mode: 'create', caseId: '', subIdx: -1, docIdx: -1, docId: null };
}

// יצירת פתק חדש
function addTextNote(caseId, subcaseIndex) {
  _textNote = { mode: 'create', caseId, subIdx: subcaseIndex, docIdx: -1, docId: null };
  showTextNoteModal('פתק TXT חדש', 'notes.txt', '');
}

// פתיחת קובץ TXT קיים לעריכה
async function openTextNote(caseId, subcaseIndex, docIndex) {
  _textNote = { mode: 'edit', caseId, subIdx: subcaseIndex, docIdx: docIndex, docId: null };

  // נשלוף את פרטי המסמך מהנתונים שכבר מוצגים בדף (או נקרא לשרת)
  // הכי בטוח: בקשה לשרת להחזרת מטא+תוכן
  try {
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`http://localhost:5000/api/cases/${caseId}/subcases/${subcaseIndex}/documents/${docIndex}/text`, { headers });
    if (!res.ok) throw new Error('שגיאה בטעינת תוכן הפתק');
    const data = await res.json(); // מצפה: { id, name, content }
    _textNote.docId = data.id || null;
    showTextNoteModal(`עריכת פתק: ${data.name || 'notes.txt'}`, data.name || 'notes.txt', data.content || '');
  } catch (e) {
    console.error(e);
    alert(e.message || 'שגיאה בפתיחת פתק TXT');
  }
}

// שמירה (יצירה/עדכון)
async function saveTextNote() {
  const filename = (document.getElementById('text-note-filename').value || '').trim();
  const content  = document.getElementById('text-note-content').value || '';
  if (!filename) return alert('אנא הזן שם קובץ (למשל notes.txt)');
  if (!filename.toLowerCase().endsWith('.txt')) return alert('שם הקובץ חייב להסתיים ב-.txt');

  const token = localStorage.getItem('token');
  const headers = { 'Content-Type':'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    let res;
    if (_textNote.mode === 'create') {
      res = await fetch(`http://localhost:5000/api/cases/${_textNote.caseId}/subcases/${_textNote.subIdx}/documents/text`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: filename, content })
      });
    } else {
      // עדכון: לפי מזהה/אינדקס המסמך
      res = await fetch(`http://localhost:5000/api/cases/${_textNote.caseId}/subcases/${_textNote.subIdx}/documents/${_textNote.docIdx}/text`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: filename, content })
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(()=>({error:'שגיאה בשמירת פתק'}));
      throw new Error(err.error || 'שגיאה בשמירת פתק');
    }

    hideTextNoteModal();
    alert('הפתק נשמר בהצלחה');
    location.reload();
  } catch (e) {
    console.error(e);
    alert(e.message || 'שגיאה בשמירת פתק');
  }
}

// שמירת מצב פתוח/סגור של כל תת-תיק לפי caseId+index
function isSubcaseOpen(caseId, index) {
  return localStorage.getItem(`lb_subcase_open_${caseId}_${index}`) === '1';
}
function setSubcaseOpen(caseId, index, open) {
  localStorage.setItem(`lb_subcase_open_${caseId}_${index}`, open ? '1' : '0');
}


function toggleSubcase(caseId, index) {
  const card = document.querySelector(`.subcase-card[data-case-id="${caseId}"][data-index="${index}"]`);
  if (!card) return;

  const wrapper = card.querySelector('.documents-wrapper');
  const toggleBtn = card.querySelector('.subcase-toggle');
  const open = !card.classList.contains('is-open');

  card.classList.toggle('is-open', open);
  card.classList.toggle('is-collapsed', !open);
  if (wrapper) wrapper.style.display = open ? 'block' : 'none';
  if (toggleBtn) toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');

  // שינוי אייקון התיק (פתוח/סגור)
  const icon = toggleBtn?.querySelector('.subcase-title i');
  if (icon) icon.className = `bi bi-folder2${open ? '-open' : ''}`;

  setSubcaseOpen(caseId, index, open);
}

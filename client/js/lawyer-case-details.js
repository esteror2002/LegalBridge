// lawyer-case-details.js
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('id');
  if (!caseId) {
    alert('לא נמצא מזהה תיק');
    console.error('❌ חסר מזהה תיק ב-URL');
    return;
  }

  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) loadingOverlay.classList.remove('hidden');

  try {
    const res = await fetch(`http://localhost:5000/api/cases/${caseId}`);
    if (!res.ok) throw new Error(`שגיאה ${res.status}: ${res.statusText}`);
    const caseData = await res.json();

    renderClientInfo(caseData);
    renderCaseDetails(caseData);
    renderProgress(caseData.progress || []);
    renderSubcases(caseData.subCases || [], caseData._id);

    // 🆕 מסמכי לקוח - עיצוב חדש
    renderClientUploads(caseData.clientDocuments || [], caseData);

    await startAutoTimer(caseId);
    await loadCaseTimeTotal(caseId);
    injectManualTimeButton(caseId);
    startCaseTimeAutoRefresh(caseId);
  } catch (error) {
    console.error('שגיאה:', error);
    alert(`שגיאה בטעינת התיק: ${error.message}`);
  } finally {
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
  }
});

/* ---------- כרטיסי פרטי לקוח/תיק ---------- */
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
      <div class="info-label"><i class="bi ${item.icon}"></i>${item.label}:</div>
      <div class="info-value">${item.value}</div>
    </div>`).join('');
}

function renderCaseDetails(data) {
  const container = document.getElementById('case-details').querySelector('.card-content');
  const openDate = new Date(data.openDate);
  const formattedDate = openDate.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
  const statusClass = getStatusClass(data.status);
  const caseDetails = [
    { label: 'סטטוס התיק', value: `<span class="status-badge ${statusClass}">${getStatusText(data.status)}</span>`, icon: 'bi-flag' },
    { label: 'תאריך פתיחה', value: formattedDate, icon: 'bi-calendar' },
    { label: 'תיאור התיק', value: data.description || 'לא צוין תיאור', icon: 'bi-file-text' },
    { label: 'זמן עבודה מצטבר', value: `<span id="case-time-total">--:--</span> <small id="case-time-active" class="timer-badge" style="display:none;margin-right:8px;padding:2px 8px;border-radius:999px;background:#ffd54f;color:#6b5000;font-weight:600;">טיימר פעיל</small>`, icon: 'bi-stopwatch' }
  ];
  container.innerHTML = caseDetails.map(item => `
    <div class="info-item">
      <div class="info-label"><i class="bi ${item.icon}"></i>${item.label}:</div>
      <div class="info-value">${item.value}</div>
    </div>`).join('');
}

function injectManualTimeButton(caseId) {
  const card = document.getElementById('case-details')?.querySelector('.card-content');
  if (!card || document.getElementById('manual-time-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'manual-time-btn';
  btn.className = 'add-progress-btn';
  btn.style.marginTop = '12px';
  btn.innerHTML = `<i class="bi bi-clock-history"></i><span>הוסף זמן ידני</span>`;
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
function getStatusText(status) { return status || 'בהמתנה'; }

/* ---------- תתי-תיקים ---------- */
function renderSubcases(subCases, caseId) {
  const container = document.getElementById('subcases-container');
  if (!subCases || subCases.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-folder-x"></i>
        <h3>אין תתי-תיקים</h3>
        <p>עדיין לא נוצרו תתי-תיקים עבור תיק זה.<br>לחץ על "הוסף תת-תיק" כדי להתחיל.</p>
      </div>`;
    return;
  }

  container.innerHTML = subCases.map((sub, index) => {
    const validDocuments = (sub.documents || []).filter(doc => {
      const url = (typeof doc === 'object' && doc.gridId) ? `/api/cases/files/${doc.gridId}` : '';
      return !!url;
    });

    const nonTxtDocuments = validDocuments.filter(d => {
      const n = d.name || d.originalName || '';
      return !n.toLowerCase().endsWith('.txt');
    });

    const documentsHtml = generateDocumentsHtml(nonTxtDocuments, caseId, index);
    const stickyNoteHtml = generateStickyNoteHtml(validDocuments, caseId, index);
    const documentsCount = nonTxtDocuments.length;

    const isOpen = isSubcaseOpen(caseId, index);
    const safeTitle = (sub.title || '').replace(/'/g, "\\'");
    const contentId = `subcontent_${caseId}_${index}`;

    return `
      <div class="subcase-card ${isOpen ? 'is-open' : 'is-collapsed'}"
           data-case-id="${caseId}" data-index="${index}"
           style="animation-delay:${index * 0.1}s">

        <button type="button" class="subcase-toggle"
                onclick="toggleSubcase('${caseId}', ${index})"
                aria-expanded="${isOpen ? 'true' : 'false'}"
                aria-controls="${contentId}" title="פתח/סגור תת-תיק">
          <div class="subcase-title">
            <i class="bi bi-folder2${isOpen ? '-open' : ''}"></i>
            <span>${sub.title}</span>
          </div>
          <div class="subcase-meta">
            <span class="badge" title="מספר מסמכים">${documentsCount}</span>
            <i class="chevron bi bi-chevron-down"></i>
          </div>
        </button>

        <div class="documents-wrapper" id="${contentId}" style="display:${isOpen ? 'block' : 'none'}">
          <div class="subcase-two-col">
            <div class="documents-section">
              <div class="documents-header">
                <div class="documents-count">
                  <i class="bi bi-file-earmark-text"></i>
                  <span>מסמכים</span>
                  <span class="count">${documentsCount}</span>
                </div>
                <div class="subcase-actions">
                  <button type="button" class="edit-btn"
                          onclick="editSubcase('${caseId}', ${index}, '${safeTitle}')" title="ערוך את שם התת-תיק">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button type="button" class="delete-btn"
                          onclick="deleteSubcase('${caseId}', ${index})" title="מחק את התת-תיק">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>

              ${documentsHtml}

              <div class="doc-actions">
                <button type="button" class="btn-upload"
                        onclick="addDocument('${caseId}', ${index})" title="העלה ושייך">
                  <i class="bi bi-cloud-upload"></i>
                  <span>העלה מסמך חדש</span>
                </button>
                <button type="button" class="btn-note"
                        onclick="addTextNote('${caseId}', ${index})" title="פתק TXT">
                  <i class="bi bi-journal-text"></i>
                  <span>פתק TXT</span>
                </button>
              </div>
            </div>

            <aside class="sticky-note-side">
              ${stickyNoteHtml}
            </aside>
          </div>
        </div>
      </div>`;
  }).join('');
}

function generateDocumentsHtml(documents, caseId, subcaseIndex) {
  if (!documents || documents.length === 0) {
    return `<div class="no-documents"><i class="bi bi-file-x"></i><p>אין מסמכים בתת-תיק זה</p></div>`;
  }

  return `
    <div class="documents-grid">
      ${documents.map((doc, docIndex) => {
        const name = doc.name || doc.originalName || 'מסמך';
        const url = doc.gridId ? `/api/cases/files/${doc.gridId}` : '#';
        const extension = name.toLowerCase().split('.').pop();
        let icon = 'bi-file-earmark-text', fileType = 'מסמך', fileSize = '';
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
          case 'txt': icon = 'bi-file-earmark-text'; fileType = 'TXT'; break;
        }
        const safeName = name.replace(/'/g, "\\'");
        const isTxt = extension === 'txt';
        const nameHtml = isTxt
          ? '<button type="button" class="document-name as-button" onclick="openTextNote(\''+caseId+'\','+subcaseIndex+','+docIndex+')" title="פתח פתק">'+name+'</button>'
          : '<a href="'+url+'" target="_blank" rel="noopener" class="document-name">'+name+'</a>';

        const txtAction = isTxt
          ? '<button class="edit-doc-btn" onclick="openTextNote(\''+caseId+'\','+subcaseIndex+','+docIndex+')" title="ערוך TXT"><i class="bi bi-journal-text"></i></button>'
          : '';

        return `
          <div class="document-item">
            <div class="document-icon"><i class="bi ${icon}"></i></div>
            <div class="document-info">
              ${nameHtml}
              <div class="document-meta">
                <span>${fileType}${fileSize ? ' • ' + fileSize : ''}</span>
                <span>עודכן ${getRelativeTime(doc.uploadDate || new Date())}</span>
              </div>
            </div>
            <div class="document-actions">
              ${txtAction}
              <button class="edit-doc-btn" onclick="editDocument('${caseId}', ${subcaseIndex}, ${docIndex}, '${safeName}')" title="ערוך מסמך"><i class="bi bi-pencil"></i></button>
              <button class="delete-doc-btn" onclick="deleteDocument('${caseId}', ${subcaseIndex}, ${docIndex})" title="מחק"><i class="bi bi-trash"></i></button>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

/* ---------- 🆕 מסמכי לקוח - עיצוב חדש ---------- */
function renderClientUploads(uploads, caseData) {
  const el = document.getElementById('client-uploads-list');
  const caseId = caseData._id;

  if (!uploads || uploads.length === 0) {
    el.innerHTML = `
      <div class="client-uploads__empty">
        <i class="bi bi-inbox"></i>
        <p>אין מסמכים שהועלו על ידי הלקוח</p>
      </div>`;
    return;
  }

  const subcases = caseData.subCases || [];
  const subcaseOptions = subcases
    .map((s, i) => `<option value="${i}">${s.title || ('תת-תיק #' + (i+1))}</option>`)
    .join('');

  el.innerHTML = uploads.map(doc => {
    const name = doc.name || 'מסמך';
    const url = doc.gridId ? `/api/cases/files/${doc.gridId}` : '#';
    const date = new Date(doc.uploadDate || Date.now()).toLocaleDateString('he-IL');
    const size = formatFileSize(doc.size || 0);
    
    // קבע סוג קובץ וצבע אייקון
    const fileExt = name.split('.').pop().toLowerCase();
    let iconClass = 'bi-file-earmark';
    let cardClass = '';
    
    if (['pdf'].includes(fileExt)) {
      iconClass = 'bi-file-pdf';
      cardClass = 'is-pdf';
    } else if (['doc', 'docx'].includes(fileExt)) {
      iconClass = 'bi-file-word';
      cardClass = 'is-doc';
    } else if (['xls', 'xlsx'].includes(fileExt)) {
      iconClass = 'bi-file-excel';
      cardClass = 'is-xls';
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
      iconClass = 'bi-file-image';
      cardClass = 'is-img';
    } else if (['txt'].includes(fileExt)) {
      iconClass = 'bi-file-text';
      cardClass = 'is-txt';
    }

    return `
      <div class="upload-row ${cardClass}">
        <div class="upload-row__left">
          <div class="upload-row__icon-name">
            <div class="upload-row__icon">
              <i class="bi ${iconClass}"></i>
            </div>
            <div class="upload-row__name-wrapper">
              <a href="${url}" class="upload-row__name" target="_blank" rel="noopener" title="${name}">
                ${name}
              </a>
              <div class="upload-row__meta">
                <span class="upload-row__date">
                  <i class="bi bi-calendar"></i>
                  ${date}
                </span>
                <span class="upload-row__size">${size}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="upload-row__actions">
          <button class="icon-btn--ghost" onclick="window.open('${url}?download=1','_blank')" title="הורד קובץ">
            <i class="bi bi-download"></i>
          </button>
          <button class="icon-btn--ghost danger" onclick="deleteClientUpload('${caseId}','${doc._id}')" title="מחק קובץ">
            <i class="bi bi-trash"></i>
          </button>
          <div class="assign-wrap">
            <select class="assign-select" id="assign-${doc._id}">
              <option value="" selected disabled>בחר תת-תיק</option>
              ${subcaseOptions}
            </select>
            <button class="assign-btn" onclick="assignClientUpload('${caseId}','${doc._id}')" title="שייך לתת-תיק">
              שייך
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

async function assignClientUpload(caseId, docId) {
  const sel = document.getElementById(`assign-${docId}`);
  if (!sel || !sel.value) return alert('בחרי תת-תיק לשיוך');
  try {
    const res = await fetch(`http://localhost:5000/api/cases/${caseId}/client-documents/${docId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subcaseIndex: Number(sel.value) })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'שגיאה בשיוך');
    alert('המסמך שובץ בהצלחה לתת-תיק');
    location.reload();
  } catch (e) {
    console.error(e);
    alert(e.message || 'שגיאה בשיוך המסמך');
  }
}

async function deleteClientUpload(caseId, docId) {
  if (!confirm('למחוק את המסמך שהלקוח העלה?')) return;
  try {
    const res = await fetch(`http://localhost:5000/api/cases/${caseId}/client-documents/${docId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data.error || data.message || 'שגיאה במחיקה');
    alert('המסמך נמחק');
    location.reload();
  } catch (e) {
    console.error(e);
    alert(e.message || 'שגיאה במחיקת המסמך');
  }
}

/* ---------- התקדמות ---------- */
let currentCaseId = null;
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  currentCaseId = params.get('id');
});

function showAddProgressForm() {
  document.getElementById('add-progress-modal').style.display = 'flex';
  document.getElementById('progress-title').value = '';
  document.getElementById('progress-description').value = '';
}

function hideAddProgressForm() {
  document.getElementById('add-progress-modal').style.display = 'none';
}

async function submitProgress() {
  const title = document.getElementById('progress-title').value.trim();
  const description = document.getElementById('progress-description').value.trim();
  if (!title || !description) return alert('יש למלא את כל השדות');

  try {
    const username = localStorage.getItem('username');
    const response = await fetch(`http://localhost:5000/api/cases/${currentCaseId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, addedBy: username || 'עורך דין' })
    });
    if (response.ok) {
      alert('עדכון התקדמות נוסף בהצלחה');
      hideAddProgressForm();
      location.reload();
    } else {
      alert('שגיאה בהוספת עדכון התקדמות');
    }
  } catch (error) {
    console.error('שגיאה:', error);
    alert('שגיאה בהוספת עדכון התקדמות');
  }
}

function renderProgress(progressItems) {
  const timeline = document.getElementById('progress-timeline');
  if (progressItems.length === 0) {
    timeline.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-clock-history"></i>
        <h3>אין עדכוני התקדמות</h3>
        <p>עדיין לא נוצרו עדכוני התקדמות עבור תיק זה.<br>לחץ על "הוסף עדכון התקדמות" כדי להתחיל.</p>
      </div>`;
    return;
  }
  const sorted = [...progressItems].sort((a,b)=>new Date(b.date)-new Date(a.date));
  timeline.innerHTML = sorted.map((item, idx) => {
    const d = new Date(item.date);
    const dd = d.toLocaleDateString('he-IL');
    const tt = d.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'});
    return `
      <div class="timeline-item ${idx===0?'latest':''}">
        <div class="timeline-content">
          <h4>${item.title}</h4>
          <p>${item.description}</p>
          <div class="timeline-meta">
            <span>נוסף על ידי: ${item.addedBy}</span>
            <span>${dd} בשעה ${tt}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ---------- עריכות/מחיקות בתת-תיקים ---------- */
let editType = '', editCaseId = '', editIndex = '', editDocIndex = '';

function editSubcase(caseId, index, currentTitle) {
  editType = 'subcase'; editCaseId = caseId; editIndex = index;
  document.getElementById('edit-modal-title').textContent = 'עריכת תת-תיק';
  document.getElementById('edit-label').textContent = 'שם תת-תיק';
  document.getElementById('edit-input').value = currentTitle;
  document.getElementById('edit-modal').style.display = 'flex';
}

function editDocument(caseId, subcaseIndex, docIndex, currentName) {
  editType = 'document'; editCaseId = caseId; editIndex = subcaseIndex; editDocIndex = docIndex;
  document.getElementById('edit-modal-title').textContent = 'עריכת מסמך';
  document.getElementById('edit-label').textContent = 'שם מסמך';
  document.getElementById('edit-input').value = currentName;
  document.getElementById('edit-modal').style.display = 'flex';
}

function hideEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  editType = ''; editCaseId = ''; editIndex = ''; editDocIndex = '';
}

async function submitEdit() {
  const newValue = document.getElementById('edit-input').value.trim();
  if (!newValue) return alert('יש למלא את השדה');
  try {
    if (editType === 'subcase') {
      const res = await fetch(`http://localhost:5000/api/cases/${editCaseId}/subcases/${editIndex}/edit`, {
        method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title:newValue })
      });
      if (!res.ok) return alert('שגיאה בעדכון תת-תיק');
      alert('תת-תיק עודכן בהצלחה'); hideEditModal(); location.reload();
    } else if (editType === 'document') {
      const res = await fetch(`http://localhost:5000/api/cases/${editCaseId}/subcases/${editIndex}/documents/${editDocIndex}/edit`, {
        method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name:newValue })
      });
      if (!res.ok) return alert('שגיאה בעדכון מסמך');
      alert('מסמך עודכן בהצלחה'); hideEditModal(); location.reload();
    }
  } catch (e) {
    console.error('שגיאה:', e); alert('שגיאה בעדכון');
  }
}

async function deleteSubcase(caseId, index) {
  if (!confirm('מחק תת-תיק (כולל מסמכים)?')) return;
  try {
    const res = await fetch(`http://localhost:5000/api/cases/${caseId}/subcases/${index}`, { method:'DELETE' });
    if (!res.ok) return alert('שגיאה במחיקת תת-תיק');
    alert('תת-תיק נמחק'); location.reload();
  } catch (e) { console.error(e); alert('שגיאה במחיקת תת-תיק'); }
}

async function deleteDocument(caseId, subcaseIndex, docIndex) {
  if (!confirm('למחוק את המסמך?')) return;
  try {
    const res = await fetch(`http://localhost:5000/api/cases/${caseId}/subcases/${subcaseIndex}/documents/${docIndex}`, { method:'DELETE' });
    if (!res.ok) return alert('שגיאה במחיקת מסמך');
    alert('מסמך נמחק'); location.reload();
  } catch (e) { console.error(e); alert('שגיאה במחיקת מסמך'); }
}

/* ---------- העלאת מסמך לתת-תיק ---------- */
function addSubcase() {
  const title = prompt('שם תת-תיק חדש:'); if (!title) return;
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('id');
  fetch(`http://localhost:5000/api/cases/${caseId}/subcases`, {
    method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title })
  }).then(r=>r.ok?location.reload():alert('שגיאה בהוספת תת-תיק'))
   .catch(()=>alert('שגיאה בהוספת תת-תיק'));
}

function addDocument(caseId, subcaseIndex) { pickFileAndUpload(caseId, subcaseIndex); }

async function uploadDocument(caseId, subcaseIndex, file, displayName) {
  const fd = new FormData(); fd.append('file', file);
  if (displayName && displayName.trim()) fd.append('displayName', displayName.trim());
  const headers = {}; const token = localStorage.getItem('token'); if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`http://localhost:5000/api/cases/${caseId}/subcases/${subcaseIndex}/documents/upload`, { method:'POST', headers, body: fd });
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || 'שגיאה בהעלאה');
}

function pickFileAndUpload(caseId, subcaseIndex) {
  let input = document.getElementById('hidden-file-input');
  if (!input) {
    input = document.createElement('input'); input.type='file'; input.id='hidden-file-input';
    input.accept='.pdf,.png,.jpg,.jpeg,.doc,.docx,.xlsx,.xls,.txt'; input.style.display='none';
    document.body.appendChild(input);
  }
  input.value=''; input.onchange=null;
  input.onchange = async () => {
    const file = input.files && input.files[0]; if (!file) return;
    const displayName = prompt('שם לתצוגה:', file.name) || file.name;
    try { await uploadDocument(caseId, subcaseIndex, file, displayName); alert('המסמך הועלה בהצלחה'); location.reload(); }
    catch(e){ console.error(e); alert(e?.message || 'שגיאה בהעלאה'); }
    finally{ input.value=''; input.onchange=null; }
  };
  input.click();
}

/* ---------- TXT ---------- */
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

function addTextNote(caseId, subcaseIndex) {
  _textNote = { mode: 'create', caseId, subIdx: subcaseIndex, docIdx: -1, docId: null };
  showTextNoteModal('פתק TXT חדש', 'notes.txt', '');
}

async function openTextNote(caseId, subcaseIndex, docIndex) {
  _textNote = { mode: 'edit', caseId, subIdx: subcaseIndex, docIdx: docIndex, docId: null };
  try {
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`http://localhost:5000/api/cases/${caseId}/subcases/${subcaseIndex}/documents/${docIndex}/text`, { headers });
    if (!res.ok) throw new Error('שגיאה בטעינת תוכן הפתק');
    const data = await res.json();
    _textNote.docId = data.id || null;
    showTextNoteModal(`עריכת פתק: ${data.name || 'notes.txt'}`, data.name || 'notes.txt', data.content || '');
  } catch (e) { console.error(e); alert(e.message || 'שגיאה בפתיחת פתק TXT'); }
}

async function saveTextNote() {
  const filename = (document.getElementById('text-note-filename').value || '').trim();
  const content  = document.getElementById('text-note-content').value || '';
  if (!filename) return alert('אנא הזן שם קובץ'); 
  if (!filename.toLowerCase().endsWith('.txt')) return alert('שם הקובץ חייב להסתיים ב-.txt');

  const token = localStorage.getItem('token');
  const headers = { 'Content-Type':'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    let res;
    if (_textNote.mode === 'create') {
      res = await fetch(`http://localhost:5000/api/cases/${_textNote.caseId}/subcases/${_textNote.subIdx}/documents/text`, {
        method: 'POST', headers, body: JSON.stringify({ name: filename, content })
      });
    } else {
      res = await fetch(`http://localhost:5000/api/cases/${_textNote.caseId}/subcases/${_textNote.subIdx}/documents/${_textNote.docIdx}/text`, {
        method: 'PUT', headers, body: JSON.stringify({ name: filename, content })
      });
    }
    if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || 'שגיאה בשמירת פתק');
    hideTextNoteModal(); alert('הפתק נשמר'); location.reload();
  } catch (e) { console.error(e); alert(e.message || 'שגיאה בשמירת פתק'); }
}

/* ---------- פתיחה/סגירה של תתי-תיקים ---------- */
function isSubcaseOpen(caseId, index) { return localStorage.getItem(`lb_subcase_open_${caseId}_${index}`) === '1'; }
function setSubcaseOpen(caseId, index, open) { localStorage.setItem(`lb_subcase_open_${caseId}_${index}`, open ? '1' : '0'); }

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
  const icon = toggleBtn?.querySelector('.subcase-title i');
  if (icon) icon.className = `bi bi-folder2${open ? '-open' : ''}`;
  setSubcaseOpen(caseId, index, open);
}

function generateStickyNoteHtml(documents, caseId, subcaseIndex) {
  const txtIndex = (documents || []).findIndex((d) => {
    const n = (typeof d === 'string') ? d : (d.name || d.originalName || '');
    return n.toLowerCase().endsWith('.txt');
  });

  if (txtIndex === -1) {
    return `
      <div class="sticky-note sticky-note--compact">
        <button class="sticky-note__new"
                onclick="addTextNote('${caseId}', ${subcaseIndex})"
                title="צור פתק (TXT)">
          + פתק חדש
        </button>
      </div>
    `;
  }

  const txt = documents[txtIndex];
  const name = (typeof txt === 'string') ? txt : (txt.name || txt.originalName || 'notes.txt');

  return `
    <div class="sticky-note sticky-note--compact" title="פתק TXT">
      <button type="button"
              class="sticky-note__name"
              onclick="openTextNote('${caseId}', ${subcaseIndex}, ${txtIndex})">
        <i class="bi bi-journal-text"></i>
        <span class="sticky-note__text">${name}</span>
      </button>
      <div class="sticky-note__actions">
        <button class="icon-btn" title="ערוך"
                onclick="openTextNote('${caseId}', ${subcaseIndex}, ${txtIndex})">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="icon-btn danger" title="מחק"
                onclick="deleteDocument('${caseId}', ${subcaseIndex}, ${txtIndex})">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  `;
}

/* ---------- Utilities ---------- */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getRelativeTime(date) {
  if (!date) return 'תאריך לא ידוע';
  const now = new Date(), d = new Date(date);
  const diffDays = Math.floor((now - d) / (1000*60*60*24));
  if (diffDays === 0) return 'היום';
  if (diffDays === 1) return 'אתמול';
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  if (diffDays < 30) return `לפני ${Math.floor(diffDays/7)} שבועות`;
  if (diffDays < 365) return `לפני ${Math.floor(diffDays/30)} חודשים`;
  return `לפני ${Math.floor(diffDays/365)} שנים`;
}

/* ---------- Time tracker ---------- */
async function startAutoTimer(caseId){
  try {
    if (!window.TimeTracker) { console.warn('TimeTracker לא נטען'); return; }
    window.stopCaseTimer = await TimeTracker.init({
      scope: `case_${caseId}`, activity: 'case', caseId, notes: 'עבודה על פרטי תיק', idleMinutes: 5
    });
  } catch (e) { console.error('שגיאה בהפעלת טיימר:', e); }
}

async function stopTimerManually(){ 
  if (window.stopCaseTimer) await window.stopCaseTimer(); 
  alert('הטיימר נעצר ידנית'); 
}

function minutesToHHMM(mins) { 
  const h=(Math.floor((mins||0)/60)+'').padStart(2,'0'); 
  const m=(Math.floor((mins||0)%60)+'').padStart(2,'0'); 
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
    const el = document.getElementById('case-time-total'); 
    if (el) el.textContent = minutesToHHMM(data.minutes || 0);
  } catch {}
}

async function addManualTimeForCase(caseId) {
  const uid = localStorage.getItem('userId'); 
  if (!uid) return alert('אין userId – התחברי מחדש');
  const minutes = Number(prompt('כמה דקות להוסיף לתיק? (מספר שלם)')); 
  if (!minutes || minutes < 1) return;
  const notes = prompt('הערה (לא חובה):') || ''; 
  const date  = new Date().toISOString();
  try {
    const res = await fetch('http://localhost:5000/api/time/manual', {
      method:'POST', 
      headers:{ 'Content-Type':'application/json', 'x-user-id': uid },
      body: JSON.stringify({ caseId, activity:'case', minutes, date, notes })
    });
    const data = await res.json(); 
    if (!res.ok) throw new Error(data.message || 'שגיאה');
    await loadCaseTimeTotal(caseId); 
    alert('הזמן נוסף בהצלחה');
  } catch (e) { 
    console.error(e); 
    alert(e.message || 'שגיאה בהוספת זמן'); 
  }
}

let _caseTimeInterval = null;

function updateActiveBadge(caseId) {
  const badge = document.getElementById('case-time-active'); 
  if (!badge) return;
  const active = !!localStorage.getItem(`lb_timeLogId_case_${caseId}`); 
  badge.style.display = active ? 'inline-block' : 'none';
}

function startCaseTimeAutoRefresh(caseId) {
  clearInterval(_caseTimeInterval);
  loadCaseTimeTotal(caseId); 
  updateActiveBadge(caseId);
  _caseTimeInterval = setInterval(()=>{ 
    loadCaseTimeTotal(caseId); 
    updateActiveBadge(caseId); 
  }, 30000);
  document.addEventListener('visibilitychange', () => { 
    if (document.visibilityState === 'visible') { 
      loadCaseTimeTotal(caseId); 
      updateActiveBadge(caseId); 
    }
  });
}

/* ---------- גלובל ---------- */
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('Failed to fetch')) return;
  console.error('Critical error:', e.error);
});
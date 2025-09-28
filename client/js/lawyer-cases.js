// client/js/lawyer-cases.js

document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!username || role !== 'lawyer') {
    alert('רק עורכות דין מורשות להיכנס לאזור זה.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;
  loadCases();
  // ברירת מחדל: טאב תיקים פתוחים
  showTab('open');
});

let allCases = [];
let currentTab = 'open'; // 'open' | 'archive'

/** ===== טעינת תיקים מהשרת והצגה בשני הקונטיינרים ===== */
async function loadCases() {
  try {
    const res = await fetch('http://localhost:5000/api/cases');
    allCases = await res.json();

    const openCases = allCases.filter(c => c.status === 'פתוח');
    const closedCases = allCases.filter(c => c.status === 'סגור');

    displayCases(openCases, 'cases-container', /*isArchive=*/false);
    displayCases(closedCases, 'archive-container', /*isArchive=*/true);

    // עדכן את הסינון לטאב הנוכחי אם יש טקסט בחיפוש
    if ((document.getElementById('searchInput')?.value || '').trim() !== '') {
      filterCases();
    }
  } catch (error) {
    console.error('שגיאה בטעינת התיקים:', error);
    displayEmptyState('cases-container');
    displayEmptyState('archive-container');
  }
}

/** ===== הצגת רשימה לקונטיינר ספציפי ===== */
function displayCases(cases, containerId, isArchive = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (!cases || cases.length === 0) {
    displayEmptyState(containerId);
    return;
  }

  cases.forEach(caseItem => {
    const caseElement = createCaseElement(caseItem, isArchive);
    container.appendChild(caseElement);
  });
}

/** ===== מצב ריק לקונטיינר ===== */
function displayEmptyState(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <i class="bi bi-folder-x"></i>
      <h3>אין תיקים להצגה</h3>
    </div>
  `;
}

/** ===== כרטיס תיק יחיד =====
 * isArchive=true -> מציגים סטטוס "סגור", תאריך סגירה והערת סגירה (אם קיימים)
 * isArchive=false -> לא מציגים שורת סטטוס כלל
 */
function createCaseElement(caseItem, isArchive) {
  const div = document.createElement('div');
  div.className = 'case-item';

  const openDate = new Date(caseItem.openDate);
  const formattedDate = openDate.toLocaleDateString('he-IL');

  const archiveExtras = isArchive ? `
    <div class="case-meta">
      <div class="case-status-pill">סגור</div>
      ${caseItem.closeDate ? `<div class="case-closed-at">נסגר ב־${new Date(caseItem.closeDate).toLocaleDateString('he-IL')}</div>` : ''}
      ${caseItem.closingNote ? `<div class="case-note"><i class="bi bi-sticky"></i> ${caseItem.closingNote}</div>` : ''}
    </div>
  ` : '';

  div.innerHTML = `
    <div class="folder-icon">
      <i class="bi bi-folder-fill"></i>
    </div>
    <div class="client-name">${caseItem.clientName}</div>
    <div class="case-date">נפתח ב-${formattedDate}</div>
    ${archiveExtras}
    <div class="case-actions">
      <button class="view-btn" onclick="viewCase('${caseItem._id}')" title="צפייה בתיק">
        <i class="bi bi-eye"></i>
      </button>
      ${!isArchive ? `
        <button class="archive-btn" onclick="closeCase('${caseItem._id}')" title="סגירת תיק (העברה לארכיון)">
          <i class="bi bi-archive"></i>
        </button>
      ` : `
        <button class="reopen-btn" onclick="reopenCase('${caseItem._id}')" title="שחזור תיק מהארכיון">
          <i class="bi bi-arrow-counterclockwise"></i>
        </button>
      `}
    </div>
  `;
  return div;
}


/** ===== חיפוש לפי טאב נוכחי ===== */
function filterCases() {
  const term = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();

  const openCases = allCases.filter(c => c.status === 'פתוח');
  const closedCases = allCases.filter(c => c.status === 'סגור');

  if (currentTab === 'open') {
    const filtered = term ? openCases.filter(c => (c.clientName || '').toLowerCase().includes(term)) : openCases;
    displayCases(filtered, 'cases-container', false);
  } else {
    const filtered = term ? closedCases.filter(c => (c.clientName || '').toLowerCase().includes(term)) : closedCases;
    displayCases(filtered, 'archive-container', true);
  }
}

/** ===== ניווט לטאב ===== */
function showTab(tab) {
  currentTab = tab === 'archive' ? 'archive' : 'open';

  // כפתורים
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  if (currentTab === 'open') document.querySelector('.tab-btn:nth-child(1)')?.classList.add('active');
  else document.querySelector('.tab-btn:nth-child(2)')?.classList.add('active');

  // תוכן
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  if (currentTab === 'open') document.getElementById('cases-container')?.classList.add('active');
  else document.getElementById('archive-container')?.classList.add('active');

  // להחיל חיפוש קיים על הטאב הנבחר
  filterCases();
}

/** ===== ניווט לצפייה בתיק ===== */
function viewCase(caseId) {
  window.location.href = `lawyer-case-details.html?id=${caseId}`;
}

/** ===== מחיקת תיק ===== */
// async function deleteCase(caseId) {
//   const result = confirm('האם את בטוחה שברצונך למחוק את התיק?\nפעולה זו אינה ניתנת לביטול.');
//   if (!result) return;

//   try {
//     const response = await fetch(`http://localhost:5000/api/cases/${caseId}`, { method: 'DELETE' });
//     if (!response.ok) throw new Error('שגיאה במחיקת התיק');

//     // עדכון רשימה והצגה מחדש
//     allCases = allCases.filter(c => c._id !== caseId);
//     await loadCases();
//     showSuccessMessage('התיק נמחק בהצלחה');
//   } catch (error) {
//     console.error('שגיאה במחיקת התיק:', error);
//     alert('אירעה שגיאה במחיקת התיק. אנא נסי שוב.');
//   }
// }

/** ===== פתיחת טופס הוספת תיק ===== */
async function showAddCaseForm() {
  const form = document.getElementById('add-case-form');
  form.style.display = 'block';

  // איפוס הטופס
  const select = document.getElementById('clientSelect');
  select.innerHTML = '<option value="">בחר לקוח</option>';
  document.getElementById('caseDescription').value = '';

  try {
    // נטען לקוחות מאושרים
    const respClients = await fetch('http://localhost:5000/api/auth/clients');
    const clients = await respClients.json();

    // ❗ נבנה סט לקוחות שכבר יש להם תיק כלשהו (פתוח או סגור)
    // משתמשים גם ב-clientId (אם קיים) וגם בשם לתאימות אחורה
    const existingIds = new Set(
      (allCases || [])
        .map(c => (c.clientId ? c.clientId.toString() : null))
        .filter(Boolean)
    );
    const existingNames = new Set(
      (allCases || [])
        .map(c => (c.clientName || '').trim().toLowerCase())
    );

    // נוסיף רק לקוחות שאין להם אף תיק
    clients.forEach(user => {
      const hasById = existingIds.has((user._id || '').toString());
      const hasByName = existingNames.has((user.username || '').trim().toLowerCase());
      if (hasById || hasByName) return; // כבר יש תיק – לא מציגים

      const option = document.createElement('option');
      option.value = JSON.stringify(user);
      option.textContent = user.username;
      select.appendChild(option);
    });

    // אם לא נשארו לקוחות אפשריים – נסגור את הטופס עם הודעה מתאימה
    if (select.children.length === 1) {
      alert('לכל הלקוחות כבר קיים תיק (פתוח או בארכיון). אם צריך – שחזרי תיק קיים מהארכיון.');
      hideAddCaseForm();
    }
  } catch (error) {
    console.error('שגיאה בטעינת רשימת הלקוחות:', error);
    alert('אירעה שגיאה בטעינת רשימת הלקוחות. אנא נסי שוב.');
    hideAddCaseForm();
  }
}


function hideAddCaseForm() {
  const form = document.getElementById('add-case-form');
  form.style.display = 'none';
}

/** ===== יצירת תיק חדש ===== */
async function submitNewCase() {
  const select = document.getElementById('clientSelect');
  const description = document.getElementById('caseDescription').value.trim();

  if (!select.value) {
    alert('יש לבחור לקוח');
    return;
  }
  if (!description) {
    alert('יש להזין תיאור התיק');
    return;
  }

  try {
    const clientData = JSON.parse(select.value);

    // הגנה נוספת: שאין כבר תיק פתוח לאותו לקוח
    const existingOpen = allCases.find(c => c.clientName === clientData.username && c.status === 'פתוח');
    if (existingOpen) {
      alert('כבר קיים תיק פתוח עבור לקוח זה.');
      return;
    }

    const response = await fetch('http://localhost:5000/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: clientData.username,
        clientEmail: clientData.email,
        clientPhone: clientData.phone,
        clientAddress: clientData.address,
        description: description
      })
    });
    
    if (response.status === 409) {
      const data = await response.json();
      alert(`כבר קיים תיק עבור הלקוחה הזו (סטטוס: ${data.status || 'לא ידוע'}).\nאם הוא בארכיון — ניתן לשחזר אותו במקום לפתוח חדש.`);
      hideAddCaseForm();
      return;
    }
    
    if (response.ok) {
      showSuccessMessage('התיק נוצר בהצלחה');
      hideAddCaseForm();
      loadCases();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || 'שגיאה ביצירת התיק');
    }
    

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'שגיאה ביצירת התיק');
    }

    showSuccessMessage('התיק נוצר בהצלחה');
    hideAddCaseForm();
    await loadCases();
    // השאירי בטאב הנוכחי; בד"כ מדובר בטאב "פתוחים"
  } catch (error) {
    console.error('שגיאה ביצירת התיק:', error);
    alert('אירעה שגיאה ביצירת התיק. אנא נסי שוב.');
  }
}

/** ===== סגירת תיק (העברה לארכיון) ===== */
async function closeCase(caseId) {
  const note = prompt('הכנסי הערת סגירה (לא חובה):');
  if (note === null) return; // בוטל

  try {
    const response = await fetch(`http://localhost:5000/api/cases/${caseId}/close`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closingNote: note || '' })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'שגיאה בסגירת התיק');
    }

    showSuccessMessage('התיק נסגר ועבר לארכיון');
    await loadCases();
    // אופציונלי: לעבור אוטומטית לארכיון
    // showTab('archive');
  } catch (err) {
    console.error('שגיאה בסגירת התיק:', err);
    alert('אירעה שגיאה בסגירת התיק. נסי שוב.');
  }
}

/** ===== שחזור תיק מארכיון ===== */
async function reopenCase(caseId) {
  try {
    const response = await fetch(`http://localhost:5000/api/cases/${caseId}/reopen`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'שגיאה בשחזור התיק');
    }

    showSuccessMessage('התיק שוחזר בהצלחה');
    await loadCases();
    // אופציונלי: לעבור לטאב פתוחים
    // showTab('open');
  } catch (err) {
    console.error('שגיאה בשחזור התיק:', err);
    alert('אירעה שגיאה בשחזור התיק. נסי שוב.');
  }
}

/** ===== הודעת הצלחה צפה ===== */
function showSuccessMessage(message) {
  const successDiv = document.createElement('div');
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(40, 167, 69, 0.3);
    z-index: 10000;
    font-weight: 600;
    animation: slideInRight 0.3s ease-out;
  `;
  successDiv.textContent = message;

  document.body.appendChild(successDiv);
  setTimeout(() => {
    successDiv.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 300);
  }, 3000);
}

/** ===== יציאה ===== */
function logout() {
  const confirmLogout = confirm('האם את בטוחה שברצונך להתנתק?');
  if (confirmLogout) {
    localStorage.clear();
    window.location.href = '../index.html';
  }
}

/** אנימציות הודעות ההצלחה */
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0);    opacity: 1; }
    to   { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

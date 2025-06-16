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
});

let allCases = [];

async function loadCases() {
  try {
    const res = await fetch('http://localhost:5000/api/cases');
    allCases = await res.json();
    displayCases(allCases);
  } catch (error) {
    console.error('שגיאה בטעינת התיקים:', error);
    displayEmptyState();
  }
}

function displayCases(cases) {
  const container = document.getElementById('cases-container');
  container.innerHTML = '';

  if (cases.length === 0) {
    displayEmptyState();
    return;
  }

  cases.forEach(caseItem => {
    const caseElement = createCaseElement(caseItem);
    container.appendChild(caseElement);
  });
}

function createCaseElement(caseItem) {
  const div = document.createElement('div');
  div.className = 'case-item';
  
  const openDate = new Date(caseItem.openDate);
  const formattedDate = openDate.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  div.innerHTML = `
    <div class="folder-icon">
      <i class="bi bi-folder-fill"></i>
    </div>
    <div class="client-name">${caseItem.clientName}</div>
    <div class="case-date">נפתח ב-${formattedDate}</div>
    <div class="case-actions">
      <button class="view-btn" onclick="viewCase('${caseItem._id}')" title="צפייה בתיק">
        <i class="bi bi-eye"></i>
      </button>
      <button class="delete-btn" onclick="deleteCase('${caseItem._id}')" title="מחיקת תיק">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;

  return div;
}

function displayEmptyState() {
  const container = document.getElementById('cases-container');
  container.innerHTML = `
    <div class="empty-state">
      <i class="bi bi-folder-x"></i>
      <h3>אין תיקים להצגה</h3>
      <p>עדיין לא נוצרו תיקים במערכת.<br>לחצי על הכפתור הירוק כדי ליצור תיק חדש.</p>
    </div>
  `;
}

function filterCases() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  
  if (searchTerm === '') {
    displayCases(allCases);
    return;
  }

  const filteredCases = allCases.filter(caseItem => 
    caseItem.clientName.toLowerCase().includes(searchTerm)
  );
  
  displayCases(filteredCases);
}

function viewCase(caseId) {
  window.location.href = `lawyer-case-details.html?id=${caseId}`;
}

async function deleteCase(caseId) {
  const result = confirm("האם את בטוחה שברצונך למחוק את התיק?\nפעולה זו אינה ניתנת לביטול.");
  
  if (!result) return;

  try {
    const response = await fetch(`http://localhost:5000/api/cases/${caseId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      // הסרת התיק מהמערך המקומי
      allCases = allCases.filter(caseItem => caseItem._id !== caseId);
      displayCases(allCases);
      
      // הצגת הודעת הצלחה
      showSuccessMessage('התיק נמחק בהצלחה');
    } else {
      throw new Error('שגיאה במחיקת התיק');
    }
  } catch (error) {
    console.error('שגיאה במחיקת התיק:', error);
    alert('אירעה שגיאה במחיקת התיק. אנא נסה שוב.');
  }
}

async function showAddCaseForm() {
  const form = document.getElementById('add-case-form');
  form.style.display = 'block';
  
  // איפוס הטופס
  document.getElementById('clientSelect').innerHTML = '<option value="">בחר לקוח</option>';
  document.getElementById('caseDescription').value = '';

  try {
    // טעינת רשימת הלקוחות
    const response = await fetch('http://localhost:5000/api/auth/clients');
    const clients = await response.json();

    // קבלת שמות הלקוחות שכבר יש להם תיקים
    const existingClients = allCases.map(caseItem => caseItem.clientName);

    // הוספת לקוחות שאין להם תיקים לרשימה
    const select = document.getElementById('clientSelect');
    clients.forEach(user => {
      if (!existingClients.includes(user.username)) {
        const option = document.createElement('option');
        option.value = JSON.stringify(user);
        option.textContent = user.username;
        select.appendChild(option);
      }
    });

    if (select.children.length === 1) {
      alert('כל הלקוחות הרשומים במערכת כבר יש להם תיקים פתוחים.');
      hideAddCaseForm();
    }
  } catch (error) {
    console.error('שגיאה בטעינת רשימת הלקוחות:', error);
    alert('אירעה שגיאה בטעינת רשימת הלקוחות. אנא נסה שוב.');
    hideAddCaseForm();
  }
}

function hideAddCaseForm() {
  const form = document.getElementById('add-case-form');
  form.style.display = 'none';
}

async function submitNewCase() {
  const select = document.getElementById('clientSelect');
  const description = document.getElementById('caseDescription').value.trim();

  // בדיקת תקינות הנתונים
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

    // בדיקה נוספת שהלקוח אין לו כבר תיק
    const existingCase = allCases.find(caseItem => caseItem.clientName === clientData.username);
    if (existingCase) {
      alert('כבר קיים תיק עבור לקוח זה.');
      return;
    }

    // יצירת התיק החדש
    const response = await fetch('http://localhost:5000/api/cases', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        clientName: clientData.username,
        clientEmail: clientData.email,
        clientPhone: clientData.phone,
        clientAddress: clientData.address,
        description: description
      })
    });

    if (response.ok) {
      showSuccessMessage('התיק נוצר בהצלחה');
      hideAddCaseForm();
      loadCases(); // טעינה מחדש של רשימת התיקים
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message || 'שגיאה ביצירת התיק');
    }
  } catch (error) {
    console.error('שגיאה ביצירת התיק:', error);
    alert('אירעה שגיאה ביצירת התיק. אנא נסה שוב.');
  }
}

function showSuccessMessage(message) {
  // יצירת הודעת הצלחה זמנית
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
  
  // הסרת ההודעה לאחר 3 שניות
  setTimeout(() => {
    successDiv.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 300);
  }, 3000);
}

function logout() {
  const confirmLogout = confirm('האם את בטוחה שברצונך להתנתק?');
  if (confirmLogout) {
    localStorage.clear();
    window.location.href = '../index.html';
  }
}

// הוספת סגנונות האנימציות להודעות ההצלחה
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
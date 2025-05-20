let currentRequestId = null;

document.addEventListener('DOMContentLoaded', function () {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!username || role !== 'lawyer') {
    alert('רק עורכות דין מורשות להיכנס לעמוד זה.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;

  // ✅ הוספת מחלקה 'active' לכפתור הלחוץ
  document.querySelectorAll('.filter-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-buttons button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // טוען כברירת מחדל רק את הפניות שאינן בארכיון
  filterRequests(false);
});


function openModal(id, username, subject, message) {
  currentRequestId = id;
  document.getElementById('modal-username').textContent = username;
  document.getElementById('modal-subject').textContent = subject;
  document.getElementById('modal-message').textContent = message;
  document.getElementById('modal-response').value = '';

  const modal = new bootstrap.Modal(document.getElementById('request-modal'));
  modal.show();
}


function closeModal() {
  const modalElement = document.getElementById('request-modal');
  const modalInstance = bootstrap.Modal.getInstance(modalElement);
  if (modalInstance) {
    modalInstance.hide();
  }
}


async function sendResponse() {
  const responseText = document.getElementById('modal-response').value.trim();
  if (!responseText) return alert('יש להזין תגובה');

  try {
    const response = await fetch(`http://localhost:5000/api/requests/reply/${currentRequestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: responseText })
    });

    const data = await response.json();
    if (response.ok) {
      alert('התגובה נשלחה בהצלחה');
      closeModal();
      location.reload();
    } else {
      alert(data.message || 'שגיאה בשליחת תגובה');
    }
  } catch (error) {
    console.error('שגיאה בשליחת תגובה:', error);
    alert('שגיאה בשרת');
  }
}

async function closeRequest() {
  if (!confirm('האם לסמן את הפנייה כסגורה?')) return;

  try {
    const response = await fetch(`http://localhost:5000/api/requests/close/${currentRequestId}`, {
      method: 'POST'
    });

    const data = await response.json();
    if (response.ok) {
      alert('הפנייה סומנה כסגורה');
      closeModal();
      location.reload();
    } else {
      alert(data.message || 'שגיאה בסגירת הפנייה');
    }
  } catch (error) {
    console.error('שגיאה בסגירת פנייה:', error);
    alert('שגיאה בשרת');
  }
}

function logout() {
  localStorage.clear();
  window.location.href = '../index.html';
}

async function closeRequestFromTable(id) {
  if (!confirm('האם אתה בטוח שברצונך לסגור את הפנייה?')) return;

  try {
    const response = await fetch(`http://localhost:5000/api/requests/close/${id}`, {
      method: 'POST'
    });

    const data = await response.json();
    if (response.ok) {
      alert('הפנייה נסגרה בהצלחה');
      location.reload();
    } else {
      alert(data.message || 'שגיאה בסגירת הפנייה');
    }
  } catch (error) {
    console.error('שגיאה בסגירת פנייה:', error);
    alert('שגיאה בשרת');
  }
}

async function filterRequests(showArchived) {
  try {
    const response = await fetch('http://localhost:5000/api/requests');
    const requests = await response.json();

    const filtered = requests.filter(r => !!r.archived === showArchived);
    const tableBody = document.getElementById('requests-body');
    tableBody.innerHTML = '';

    filtered.forEach(req => {
      const row = document.createElement('tr');

      const statusLabel = req.status === 'closed' ? 'סגור' : 'ממתין לטיפול';
      const disableClose = req.status === 'closed' ? 'disabled' : '';
      const disableArchive = req.archived ? 'disabled' : '';

      row.innerHTML = `
  <td>${req.username}</td>
  <td>${req.subject}</td>
  <td>${req.message}</td>
  <td>${new Date(req.createdAt).toLocaleString('he-IL')}</td>
  <td>${statusLabel}</td>
  <td>
    <button class="btn btn-sm btn-info text-white me-1" onclick="openModal('${req._id}', '${req.username}', '${req.subject}', \`${req.message}\`)">צפה</button>
    <button class="btn btn-sm btn-warning text-dark me-1" onclick="closeRequestFromTable('${req._id}')" ${disableClose}>סגור פנייה</button>
    <button class="btn btn-sm btn-secondary text-white" onclick="archiveRequest('${req._id}')" ${disableArchive}>🗄️ העבר לארכיון</button>
  </td>
`;


      tableBody.appendChild(row);
    });

  } catch (error) {
    console.error('שגיאה בסינון פניות:', error);
    alert('שגיאה בטעינת הפניות');
  }
}

async function archiveRequest(id) {
  if (!confirm('האם להעביר את הפנייה לארכיון?')) return;

  try {
    const response = await fetch(`http://localhost:5000/api/requests/archive/${id}`, {
      method: 'POST'
    });

    const data = await response.json();
    if (response.ok) {
      alert('הפנייה הועברה לארכיון');
      location.reload();
    } else {
      alert(data.message || 'שגיאה בהעברה לארכיון');
    }
  } catch (error) {
    console.error('שגיאה בהעברת פנייה:', error);
    alert('שגיאה בשרת');
  }
}

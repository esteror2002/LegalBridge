let currentRequestId = null;

document.addEventListener('DOMContentLoaded', async function () {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!username || role !== 'lawyer') {
    alert('רק עורכות דין מורשות להיכנס לעמוד זה.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;

  try {
    const response = await fetch('http://localhost:5000/api/requests');
    const requests = await response.json();

    const tableBody = document.getElementById('requests-body');
    tableBody.innerHTML = '';

    requests.forEach(req => {
        const row = document.createElement('tr');
      
        const statusLabel = req.status === 'closed' ? 'סגור' : 'ממתין לטיפול';
        const disableClose = req.status === 'closed' ? 'disabled' : '';
      
        row.innerHTML = `
          <td>${req.username}</td>
          <td>${req.subject}</td>
          <td>${req.message}</td>
          <td>${new Date(req.createdAt).toLocaleString('he-IL')}</td>
          <td>${statusLabel}</td>
          <td>
            <button onclick="openModal('${req._id}', '${req.username}', '${req.subject}', \`${req.message}\`)">צפה</button>
            <button onclick="closeRequestFromTable('${req._id}')" ${disableClose}>סגור פנייה</button>
          </td>
        `;
      
        tableBody.appendChild(row);
      });
      
  } catch (error) {
    console.error('שגיאה בטעינת הפניות:', error);
    alert('שגיאה בטעינת הפניות');
  }
});

function openModal(id, username, subject, message) {
  currentRequestId = id;
  document.getElementById('modal-username').textContent = username;
  document.getElementById('modal-subject').textContent = subject;
  document.getElementById('modal-message').textContent = message;
  document.getElementById('modal-response').value = '';
  document.getElementById('request-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('request-modal').style.display = 'none';
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
  

let username = localStorage.getItem('username');
let role = localStorage.getItem('role');

if (!username || role !== 'client') {
  alert('רק לקוחות מורשים להיכנס לעמוד זה.');
  window.location.href = '../index.html';
} else {
  document.getElementById('greeting').innerText = `שלום, ${username}`;
  loadRequests();
}

function logout() {
  localStorage.clear();
  window.location.href = '../index.html';
}

function openRequestModal() {
  document.getElementById('request-modal').style.display = 'flex';
}

function closeRequestModal() {
  document.getElementById('request-modal').style.display = 'none';
  document.getElementById('request-form').reset();
}

// שליחת פנייה חדשה
document.getElementById('request-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const subject = document.getElementById('subject').value.trim();
  const message = document.getElementById('message').value.trim();

  if (!subject || !message) {
    alert('נא למלא את כל השדות');
    return;
  }

  try {
    const response = await fetch('http://localhost:5000/api/requests/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, subject, message })
    });

    const data = await response.json();
    if (response.ok) {
      alert('הפנייה נשלחה בהצלחה!');
      closeRequestModal();
      loadRequests();
    } else {
      alert(data.message || 'שגיאה בשליחת הפנייה');
    }
  } catch (error) {
    console.error('❌ שגיאה בשליחה:', error);
    alert('שגיאה בשליחת הפנייה');
  }
});

// טעינת כל הפניות של המשתמש
async function loadRequests() {
  try {
    const response = await fetch('http://localhost:5000/api/requests');
    const data = await response.json();

    const userRequests = data.filter(r => r.username === username);
    const container = document.getElementById('requests-list');
    container.innerHTML = '';

    if (userRequests.length === 0) {
      container.innerHTML = '<p>לא נמצאו פניות.</p>';
      return;
    }

    userRequests.forEach(req => {
      const div = document.createElement('div');
      div.className = 'request-card';
      div.innerHTML = `
        <h4>📌 ${req.subject}</h4>
        <p><strong>תיאור:</strong> ${req.message}</p>
        <p><strong>סטטוס:</strong> ${req.status === 'closed' ? 'סגור' : 'פתוח'}</p>
        ${req.response ? `<p class="lawyer-response"><strong>✉️ תגובת עו"ד:</strong> ${req.response}</p>` : ''}
        <p class="timestamp">${new Date(req.createdAt).toLocaleString('he-IL')}</p>
      `;
      container.appendChild(div);
    });

  } catch (error) {
    console.error('❌ שגיאה בטעינת הפניות:', error);
    alert('שגיאה בטעינת הפניות');
  }
}

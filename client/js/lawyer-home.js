document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!username || role !== 'lawyer') {
    alert('רק עורכות דין מורשות להיכנס לאזור זה.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;
  loadPendingClients();
  loadOpenRequestsCount();
});

function logout() {
  localStorage.clear();
  window.location.href = '../index.html';
}

function toggleNotifications() {
  const panel = document.getElementById('notif-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

async function loadPendingClients() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/pending-users');
    const users = await res.json();
    if (res.ok) {
      // מונה פעמון התראות
      const badge = document.getElementById('notif-count');
      if (users.length > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = users.length;
      } else {
        badge.style.display = 'none';
      }

      // מונה בתפריט (אם קיים)
      const menuCount = document.getElementById('pending-count');
      if (menuCount) {
        menuCount.textContent = users.length;
      }

      renderNotifications(users);
    }
  } catch (err) {
    console.error('שגיאה בשליפת לקוחות ממתינים:', err);
  }
}

async function loadOpenRequestsCount() {
  try {
    const res = await fetch('http://localhost:5000/api/requests');
    const requests = await res.json();
    if (res.ok) {
      const openCount = requests.filter(r => r.status !== 'closed').length;

      const badge = document.getElementById('open-requests-count');
      if (badge) {
        badge.textContent = openCount;
      }
    }
  } catch (err) {
    console.error('שגיאה בשליפת פניות:', err);
  }
}

function renderNotifications(users) {
  const list = document.getElementById('notif-list');
  list.innerHTML = '';

  if (users.length === 0) {
    list.innerHTML = '<li>אין לקוחות ממתינים</li>';
    return;
  }

  users.forEach(user => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${user.username}</strong><br>
      <button class="approve" onclick="approveUser('${user._id}')">אישור</button>
      <button class="delete" onclick="deleteUser('${user._id}')">מחיקה</button>
    `;
    list.appendChild(li);
  });
}

async function approveUser(id) {
  await fetch(`http://localhost:5000/api/auth/approve-user/${id}`, {
    method: 'POST'
  });
  loadPendingClients();
}

async function deleteUser(id) {
  await fetch(`http://localhost:5000/api/auth/delete-user/${id}`, {
    method: 'DELETE'
  });
  loadPendingClients();
}

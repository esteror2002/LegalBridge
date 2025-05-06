document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!username || role !== 'lawyer') {
    alert('רק עורכות דין מורשות להיכנס לאזור זה.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;
  loadPendingClientsCount();
  loadOpenRequestsCount();
});

function logout() {
  localStorage.clear();
  window.location.href = '../index.html';
}

async function loadPendingClientsCount() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/pending-users');
    const users = await res.json();
    if (res.ok) {
      document.getElementById('pending-count').textContent = users.length;
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
      document.getElementById('open-requests-count').textContent = openCount;
    }
  } catch (err) {
    console.error('שגיאה בשליפת פניות:', err);
  }
}

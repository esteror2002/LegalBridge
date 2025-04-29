document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
  
    if (!username || role !== 'lawyer') {
      alert('רק עורכות דין מורשות להיכנס לאזור זה.');
      window.location.href = 'index.html';
      return;
    }
  
    document.getElementById('greeting').innerText = `שלום, ${username}`;
  
    // טען את ההתראות
    loadPendingClientsCount();
    loadOpenRequestsCount();
  });
  
  function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
  }
  
  async function loadPendingClientsCount() {
    try {
      const res = await fetch('http://localhost:5000/api/auth/pending-users');
      const users = await res.json();
      if (res.ok) {
        const count = users.length;
        if (count > 0) {
          document.getElementById('pending-count').textContent = count;
        }
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
        if (openCount > 0) {
          document.getElementById('open-requests-count').textContent = openCount;
        }
      }
    } catch (err) {
      console.error('שגיאה בשליפת פניות:', err);
    }
  }
  
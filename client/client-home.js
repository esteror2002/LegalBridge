document.addEventListener('DOMContentLoaded', function () {
    const username = localStorage.getItem('username');
    document.getElementById('username-display').textContent = username || 'לקוח';
    document.getElementById('client-name').textContent = username || '';
  });
  
  function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
  }
  
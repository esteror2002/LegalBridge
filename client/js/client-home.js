document.addEventListener('DOMContentLoaded', function () {
  const username = localStorage.getItem('username');
  if (!username || localStorage.getItem('role') !== 'client') {
    alert('רק לקוחות רשאים לגשת לאזור זה.');
    window.location.href = '../index.html';
  } else {
    document.getElementById('greeting').innerText = `שלום, ${username}`;
  }
});

function logout() {
  localStorage.clear();
  window.location.href = '../index.html';
}

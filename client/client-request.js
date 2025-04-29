const username = localStorage.getItem('username');
const role = localStorage.getItem('role');

if (!username || role !== 'client') {
  alert('רק לקוחות רשאים לגשת לעמוד זה.');
  window.location.href = 'index.html';
} else {
  document.getElementById('greeting').innerText = `שלום, ${username}`;
}

function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}

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
      document.getElementById('request-form').reset();
    } else {
      alert(data.message || 'שגיאה בשליחת הפנייה');
    }
  } catch (error) {
    console.error('שגיאה בשליחה:', error);
    alert('שגיאה בשליחת הפנייה');
  }
});

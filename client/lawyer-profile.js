const username = localStorage.getItem('username');
const role = localStorage.getItem('role');
const address = localStorage.getItem('address') || '';
const email = localStorage.getItem('email') || '';
const phone = localStorage.getItem('phone') || '';

if (!username || role !== 'lawyer') {
  alert('גישה לעורכות דין בלבד');
  window.location.href = 'index.html';
}

// מילוי ערכים קיימים בשדות
document.getElementById('firstName').value = username;
document.getElementById('address').value = address;
document.getElementById('email').value = email;
document.getElementById('phone').value = phone;

// בעת שליחת הטופס
document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const saveButton = document.getElementById('save-button');
  const message = document.getElementById('message');

  saveButton.innerHTML = '⏳ שומר...';
  saveButton.disabled = true;

  const newName = document.getElementById('firstName').value.trim();
  const newAddress = document.getElementById('address').value.trim();
  const newEmail = document.getElementById('email').value.trim();
  const newPhone = document.getElementById('phone').value.trim();

  try {
    const response = await fetch(`http://localhost:5000/api/auth/update-profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, newName, newAddress, newEmail, newPhone })
    });

    const data = await response.json();

    if (response.ok) {
      message.textContent = 'הפרטים עודכנו בהצלחה ✅';
      message.style.color = 'green';

      // עדכון localStorage
      localStorage.setItem('username', newName || username);
      localStorage.setItem('address', newAddress || address);
      localStorage.setItem('email', newEmail || email);
      localStorage.setItem('phone', newPhone || phone);

      saveButton.innerHTML = '✅ נשמר';
      setTimeout(() => {
        saveButton.innerHTML = '💾 עדכן';
        saveButton.disabled = false;
      }, 2000);
    } else {
      handleError(message, saveButton, data.message || 'אירעה שגיאה');
    }
  } catch (error) {
    console.error('שגיאה בעת העדכון:', error);
    handleError(message, saveButton, 'שגיאת רשת');
  }
});

// פונקציה לטיפול בשגיאה
function handleError(message, button, errorMessage) {
  message.textContent = errorMessage;
  message.style.color = 'red';
  button.innerHTML = '💾 עדכן';
  button.disabled = false;
  button.classList.add('shake');
  setTimeout(() => button.classList.remove('shake'), 500);
}

// פונקציית התנתקות
function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}

// פונקציית חזרה לדף הבית
function goHome() {
  window.location.href = 'lawyer-home.html';
}

document.addEventListener('DOMContentLoaded', function () {
    loadProfile();
  });
  
  function enableEditing() {
    document.getElementById('phone').readOnly = false;
    document.getElementById('address').readOnly = false;
  
    document.getElementById('edit-btn').classList.add('d-none');
    document.getElementById('save-btn').classList.remove('d-none');
  }
  
  async function saveChanges() {
    const username = localStorage.getItem('username');
    const newPhone = document.getElementById('phone').value.trim();
    const newAddress = document.getElementById('address').value.trim();
  
    try {
      const response = await fetch('http://localhost:5000/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          newPhone,
          newAddress
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        alert('הפרטים נשמרו בהצלחה!');
        document.getElementById('phone').readOnly = true;
        document.getElementById('address').readOnly = true;
        document.getElementById('edit-btn').classList.remove('d-none');
        document.getElementById('save-btn').classList.add('d-none');
      } else {
        alert(data.message || 'שגיאה בעדכון הפרטים');
      }
  
    } catch (error) {
      console.error('שגיאה בעדכון פרטי משתמש:', error);
      alert('שגיאה בעדכון הפרטים');
    }
  }
  
  function goBack() {
    window.location.href = 'lawyer-home.html';
  }
  
  function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
  }
  
  async function loadProfile() {
    const username = localStorage.getItem('username');
  
    if (!username) {
      alert('שגיאה: אין משתמש מחובר');
      window.location.href = 'index.html';
      return;
    }
  
    try {
      const response = await fetch(`http://localhost:5000/api/auth/get-profile/${username}`);
      const data = await response.json();
  
      if (response.ok) {
        document.getElementById('username').value = data.username || '';
        document.getElementById('phone').value = data.phone || '';
        document.getElementById('address').value = data.address || '';
        document.getElementById('greeting').textContent = `שלום, ${data.username}`;
      } else {
        alert(data.message || 'שגיאה בטעינת הפרטים');
      }
  
    } catch (error) {
      console.error('שגיאה בטעינת פרטי משתמש:', error);
      alert('שגיאה בטעינת הפרטים');
    }
  }

  
  
// lawyer-cases.js

document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  if (!username || role !== 'lawyer') {
    alert('רק עורכות דין מורשות להיכנס לאזור זה.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('greeting').innerText = `שלום, ${username}`;
  loadCases();
});

let allCases = [];

async function loadCases() {
  const res = await fetch('http://localhost:5000/api/cases');
  allCases = await res.json();
  const container = document.getElementById('cases-container');
  container.innerHTML = '';
  allCases.forEach(c => {
    const div = document.createElement('div');
    div.className = 'case-item';
    div.title = `תאריך פתיחה: ${new Date(c.openDate).toLocaleDateString('he-IL')}`;

    div.innerHTML = `
      <img src="https://cdn-icons-png.flaticon.com/512/716/716784.png" alt="תיקייה" />
      <span>${c.clientName}</span>
      <div class="case-actions">
        <i class="bi bi-eye" title="צפייה" onclick="viewCase('${c._id}')"></i>
        <i class="bi bi-trash" title="מחיקה" onclick="deleteCase('${c._id}')"></i>
      </div>
    `;

    container.appendChild(div);
  });
}

function filterCases() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const allItems = document.querySelectorAll('.case-item');
  allItems.forEach(item => {
    const name = item.querySelector('span').innerText.toLowerCase();
    item.style.display = name.includes(search) ? 'flex' : 'none';
  });
}

function viewCase(caseId) {
  window.location.href = `lawyer-case-details.html?id=${caseId}`;
}

async function deleteCase(caseId) {
  const confirmDelete = confirm("האם את בטוחה שברצונך למחוק את התיק?");
  if (!confirmDelete) return;

  await fetch(`http://localhost:5000/api/cases/${caseId}`, {
    method: 'DELETE'
  });

  loadCases();
}

async function showAddCaseForm() {
  const form = document.getElementById('add-case-form');
  form.style.display = 'block';

  const select = document.getElementById('clientSelect');
  select.innerHTML = '<option value="">בחר לקוח</option>';

  const res = await fetch('http://localhost:5000/api/auth/clients');
  const clients = await res.json();

  const existingClients = allCases.map(c => c.clientName);

  clients.forEach(user => {
    if (!existingClients.includes(user.username)) {
      const option = document.createElement('option');
      option.value = JSON.stringify(user);
      option.text = user.username;
      select.appendChild(option);
    }
  });
}

async function submitNewCase() {
  const select = document.getElementById('clientSelect');
  const selected = select.value;
  const description = document.getElementById('caseDescription').value;

  if (!selected) return alert('בחר לקוח');
  const client = JSON.parse(selected);

  const exists = allCases.find(c => c.clientName === client.username);
  if (exists) return alert('כבר קיים תיק עבור לקוח זה.');

  const res = await fetch('http://localhost:5000/api/cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientName: client.username,
      clientEmail: client.email,
      clientPhone: client.phone,
      clientAddress: client.address,
      description
    })
  });

  if (res.ok) {
    alert('נוצר תיק בהצלחה');
    location.reload();
  } else {
    alert('שגיאה ביצירת תיק');
  }
}

function logout() {
  localStorage.clear();
  window.location.href = '../index.html';
}

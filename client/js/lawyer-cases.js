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
  
    document.getElementById('case-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = {
        clientName: form.clientName.value,
        description: form.description.value
      };
      const res = await fetch('http://localhost:5000/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        form.reset();
        loadCases();
      }
    });
  });
  
  async function loadCases() {
    const res = await fetch('http://localhost:5000/api/cases');
    const cases = await res.json();
    const container = document.getElementById('cases-container');
    container.innerHTML = '';
    cases.forEach(c => {
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
    const allCases = document.querySelectorAll('.case-item');
    allCases.forEach(item => {
      const name = item.querySelector('span').innerText.toLowerCase();
      item.style.display = name.includes(search) ? 'flex' : 'none';
    });
  }
  
  
  function showAddCasePrompt() {
    const name = prompt('הכנס שם לקוח חדש:');
    if (!name) return;
    fetch('http://localhost:5000/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName: name })
    }).then(() => loadCases());
  }
  
  
  async function updateStatus(caseId, status) {
    await fetch(`http://localhost:5000/api/cases/${caseId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  }
  
  function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
  }
  
  function uploadDocuments(caseId) {
    const files = prompt('הכנס שמות קבצים (מופרדים בפסיקים)');
    if (!files) return;
    const documents = files.split(',').map(f => f.trim());
    fetch(`http://localhost:5000/api/cases/${caseId}/documents`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents })
    }).then(() => loadCases());
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
  
  
  
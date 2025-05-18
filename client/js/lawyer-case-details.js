// lawyer-case-details.js

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('id');
  if (!caseId) {
    alert('לא נמצא מזהה תיק');
    return;
  }

  const res = await fetch(`http://localhost:5000/api/cases/${caseId}`);
  const caseData = await res.json();

  renderClientInfo(caseData);
  renderCaseDetails(caseData);
  renderSubcases(caseData.subCases || [], caseData._id);
  loadMessages(caseId);
});

function renderClientInfo(data) {
  const container = document.getElementById('client-info');
  container.innerHTML = `
    <h3>📇 פרטי לקוח</h3>
    <p><strong>שם:</strong> ${data.clientName}</p>
    <p><strong>טלפון:</strong> ${data.clientPhone || '-'}</p>
    <p><strong>כתובת:</strong> ${data.clientAddress || '-'}</p>
    <p><strong>אימייל:</strong> ${data.clientEmail || '-'}</p>
  `;
}

function renderCaseDetails(data) {
  const container = document.getElementById('case-details');
  container.innerHTML = `
    <h3>🗂️ פרטי תיק</h3>
    <p><strong>סטטוס:</strong> ${data.status}</p>
    <p><strong>תאריך פתיחה:</strong> ${new Date(data.openDate).toLocaleDateString('he-IL')}</p>
    <p><strong>תיאור:</strong> ${data.description || '-'}</p>
  `;
}

function renderSubcases(subCases, caseId) {
  const container = document.getElementById('subcases-container');
  container.innerHTML = '';

  subCases.forEach((sub, index) => {
    const div = document.createElement('div');
    div.className = 'subcase-card';
    div.innerHTML = `
      <h4>${sub.title}</h4>
      <ul>
        ${sub.documents.map(doc => `<li>📄 ${doc}</li>`).join('')}
      </ul>
      <button onclick="addDocument('${caseId}', ${index})">➕ הוסף מסמך</button>
    `;
    container.appendChild(div);
  });
}

function addSubcase() {
  const title = prompt('שם תת-תיק חדש:');
  if (!title) return;

  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('id');

  fetch(`http://localhost:5000/api/cases/${caseId}/subcases`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  }).then(() => location.reload());
}

function addDocument(caseId, subcaseIndex) {
  const fileName = prompt('הכנס שם קובץ (למשל: כתב_הגנה.pdf)');
  if (!fileName) return;

  fetch(`http://localhost:5000/api/cases/${caseId}/subcases/${subcaseIndex}/documents`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName })
  }).then(() => location.reload());
}

// צ׳אט פנימי
async function loadMessages(caseId) {
  const res = await fetch(`http://localhost:5000/api/messages/${caseId}`);
  const messages = await res.json();
  const chatBox = document.getElementById('chat-messages');
  chatBox.innerHTML = '';

  messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = `chat-message ${msg.sender === 'lawyer' ? 'sent' : 'received'}`;
    div.innerHTML = `
      <div class="bubble">
        <span>${msg.content}</span>
        <small>${new Date(msg.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</small>
      </div>
    `;
    chatBox.appendChild(div);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('chat-message');
  const message = input.value.trim();
  if (!message) return;

  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('id');

  fetch(`http://localhost:5000/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId, sender: 'lawyer', recipient: 'client', content: message })
  })
  .then(() => {
    input.value = '';
    loadMessages(caseId);
  });
}

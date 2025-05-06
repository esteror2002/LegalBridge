let clientsList = [];

async function loadClients() {
  const res = await fetch('http://localhost:5000/api/auth/clients');
  clientsList = await res.json();
  displayClients(clientsList);
}

function displayClients(clients) {
  const tbody = document.querySelector('#clients-table tbody');
  tbody.innerHTML = '';

  clients.forEach(client => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${client.username}</td>
      <td>${client.email}</td>
      <td>${client.phone || '-'}</td>
      <td>${client.address || '-'}</td>
    `;
    tbody.appendChild(row);
  });
}

function filterClients() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const filtered = clientsList.filter(client =>
    client.username.toLowerCase().includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm) ||
    (client.phone && client.phone.toLowerCase().includes(searchTerm))
  );
  displayClients(filtered);
}

function exportToExcel() {
  const ws = XLSX.utils.json_to_sheet(clientsList);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");
  XLSX.writeFile(wb, "clients-list.xlsx");
}

function logout() {
  localStorage.clear();
  window.location.href = '../index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!username || role !== 'lawyer') {
    alert('גישה מותרת לעורכי דין בלבד.');
    window.location.href = '../index.html';
  } else {
    document.getElementById('greeting').textContent = `שלום, ${username}`;
    loadClients();
  }
});

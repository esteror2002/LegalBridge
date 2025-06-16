let clientsList = [];

document.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  if (!username || role !== 'lawyer') {
    alert('גישה מותרת לעורכי דין בלבד.');
    window.location.href = '../index.html';
  } else {
    document.getElementById('greeting').textContent = `שלום, ${username}`;
    loadClients();
    animateElements();
  }
});

async function loadClients() {
  try {
    showLoadingState();
    const res = await fetch('http://localhost:5000/api/auth/clients');
    clientsList = await res.json();
    
    if (res.ok) {
      displayClients(clientsList);
      updateStats();
      hideLoadingState();
      showMessage('הלקוחות נטענו בהצלחה', 'success');
    } else {
      throw new Error('שגיאה בטעינת הלקוחות');
    }
  } catch (error) {
    console.error('שגיאה בטעינת לקוחות:', error);
    showMessage('שגיאה בטעינת רשימת הלקוחות', 'error');
    hideLoadingState();
  }
}

function displayClients(clients) {
  const tbody = document.querySelector('#clients-table tbody');
  const emptyState = document.getElementById('empty-state');
  
  tbody.innerHTML = '';

  if (clients.length === 0) {
    emptyState.style.display = 'block';
    document.querySelector('.table-wrapper table').style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    document.querySelector('.table-wrapper table').style.display = 'table';
    
    clients.forEach((client, index) => {
      const row = document.createElement('tr');
      row.style.animationDelay = `${index * 0.1}s`;
      row.className = 'fade-in';
      row.innerHTML = `
        <td><strong>${client.username}</strong></td>
        <td>${client.email}</td>
        <td>${client.phone || '<span style="color: #999;">לא צוין</span>'}</td>
        <td>${client.address || '<span style="color: #999;">לא צוין</span>'}</td>
      `;
      tbody.appendChild(row);
    });
  }
  
  // Update clients count
  document.getElementById('clients-count').textContent = `${clients.length} לקוחות`;
}

function filterClients() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const filtered = clientsList.filter(client =>
    client.username.toLowerCase().includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm) ||
    (client.phone && client.phone.toLowerCase().includes(searchTerm))
  );
  
  displayClients(filtered);
  
  // Show search feedback
  if (searchTerm && filtered.length === 0) {
    showMessage('לא נמצאו תוצאות מתאימות לחיפוש', 'info');
  }
}

function exportToExcel() {
  if (clientsList.length === 0) {
    showMessage('אין נתונים לייצוא', 'error');
    return;
  }

  try {
    // Show loading state for export button
    const exportBtn = document.querySelector('.btn-export');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> מייצא...';
    exportBtn.disabled = true;

    // Prepare data for export
    const exportData = clientsList.map(client => ({
      'שם משתמש': client.username,
      'אימייל': client.email,
      'טלפון': client.phone || '',
      'כתובת': client.address || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    
    // Add some styling to the Excel file
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({c: C, r: R});
        if (!ws[cell_address]) continue;
        
        if (R === 0) {
          // Header row styling
          ws[cell_address].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "007BFF" } }
          };
        }
      }
    }
    
    XLSX.writeFile(wb, `לקוחות-${new Date().toLocaleDateString('he-IL')}.xlsx`);
    
    showMessage('הקובץ יוצא בהצלחה!', 'success');
    
    // Reset button state
    setTimeout(() => {
      exportBtn.innerHTML = originalText;
      exportBtn.disabled = false;
    }, 1000);
    
  } catch (error) {
    console.error('שגיאה בייצוא:', error);
    showMessage('שגיאה בייצוא הקובץ', 'error');
    
    // Reset button state
    const exportBtn = document.querySelector('.btn-export');
    exportBtn.innerHTML = '<i class="bi bi-file-earmark-excel"></i> ייצוא ל-Excel';
    exportBtn.disabled = false;
  }
}

function updateStats() {
  const totalClients = clientsList.length;
  const activeClients = Math.floor(totalClients * 0.8); // Simulate active clients
  const recentClients = Math.floor(totalClients * 0.3); // Simulate recent clients
  
  animateCounter(document.getElementById('total-clients'), totalClients);
  animateCounter(document.getElementById('active-clients'), activeClients);
  animateCounter(document.getElementById('recent-clients'), recentClients);
}

function animateCounter(element, target) {
  let current = 0;
  const increment = target / 30;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current);
  }, 50);
}

function animateElements() {
  // Animate control panel
  const controlPanel = document.querySelector('.control-panel');
  if (controlPanel) {
    controlPanel.style.opacity = '0';
    controlPanel.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
      controlPanel.style.transition = 'all 0.6s ease';
      controlPanel.style.opacity = '1';
      controlPanel.style.transform = 'translateY(0)';
    }, 200);
  }
  
  // Animate table container
  const tableContainer = document.querySelector('.table-container');
  if (tableContainer) {
    tableContainer.style.opacity = '0';
    tableContainer.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
      tableContainer.style.transition = 'all 0.6s ease';
      tableContainer.style.opacity = '1';
      tableContainer.style.transform = 'translateY(0)';
    }, 400);
  }
  
  // Animate stats cards
  const statCards = document.querySelectorAll('.stat-card');
  statCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
      card.style.transition = 'all 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 600 + (index * 100));
  });
}

function showLoadingState() {
  const tbody = document.querySelector('#clients-table tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="4" style="padding: 40px; text-align: center;">
        <i class="bi bi-hourglass-split" style="font-size: 24px; color: #007bff; animation: spin 1s linear infinite;"></i>
        <div style="margin-top: 10px;">טוען נתונים...</div>
      </td>
    </tr>
  `;
}

function hideLoadingState() {
  // Loading state will be replaced by actual data in displayClients
}

function showMessage(message, type) {
  const existingMessage = document.querySelector('.toast-message');
  if (existingMessage) existingMessage.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  
  const icon = type === 'success' ? 'check-circle' : 
               type === 'error' ? 'exclamation-circle' : 'info-circle';
  
  toast.innerHTML = `<i class="bi bi-${icon}"></i><span>${message}</span>`;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

function logout() {
  document.body.style.transition = 'opacity 0.3s ease';
  document.body.style.opacity = '0';
  
  setTimeout(() => {
    localStorage.clear();
    window.location.href = '../index.html';
  }, 300);
}

// Add CSS for toast messages and animations
if (!document.getElementById('clients-styles')) {
  const style = document.createElement('style');
  style.id = 'clients-styles';
  style.textContent = `
    .toast-message {
      position: fixed; top: 20px; right: 20px; padding: 15px 20px;
      border-radius: 10px; color: white; font-weight: 500;
      display: flex; align-items: center; gap: 10px; z-index: 10000;
      transform: translateX(100%); transition: all 0.3s ease;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); min-width: 300px;
    }
    .toast-message.show { transform: translateX(0); }
    .toast-success { background: linear-gradient(135deg, #28a745, #20c997); }
    .toast-error { background: linear-gradient(135deg, #dc3545, #fd7e14); }
    .toast-info { background: linear-gradient(135deg, #007bff, #0056b3); }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(style);
}
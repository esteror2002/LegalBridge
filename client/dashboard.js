document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    const userInfo = document.getElementById('user-info');
    userInfo.innerText = `${username} | ${role === 'lawyer' ? 'עורכת דין' : 'לקוח'}`;

    if (role !== 'lawyer') {
        alert('גישה מוגבלת לעורכי דין בלבד');
        window.location.href = 'index.html';
        return;
    }

    fetchPendingUsers();
});

async function fetchPendingUsers() {
    const response = await fetch('http://localhost:5000/api/auth/pending-users');
    const users = await response.json();
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td><button class="approve" onclick="approveUser('${user._id}')">אשר</button></td>
            <td><button class="delete" onclick="deleteUser('${user._id}')">מחק</button></td>
        `;

        tbody.appendChild(row);
    });
}

async function approveUser(id) {
    await fetch(`http://localhost:5000/api/auth/approve-user/${id}`, {
        method: 'POST'
    });
    fetchPendingUsers();
}

async function deleteUser(id) {
    await fetch(`http://localhost:5000/api/auth/delete-user/${id}`, {
        method: 'DELETE'
    });
    fetchPendingUsers();
}

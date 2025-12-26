document.addEventListener('DOMContentLoaded', () => {
    loadGreeting();
    loadClients();
    loadMeetings();
  
    // Submit form
    const form = document.getElementById('video-meeting-form');
    if (form) {
      form.addEventListener('submit', createMeeting);
    }
  
    // Sort dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', loadMeetings);
    }
  
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', loadMeetings);
    }
  });
  
  /* ===== Modal ===== */
  function openCreateModal() {
    const modal = document.getElementById('create-modal');
    if (modal) modal.classList.add('show');
  }
  
  function closeCreateModal() {
    const modal = document.getElementById('create-modal');
    if (modal) modal.classList.remove('show');
  }
  
  /* ===== Clients ===== */
  async function loadClients() {
    const select = document.getElementById('client-select');
    if (!select) return;
  
    try {
      const res = await fetch('http://localhost:5000/api/auth/clients');
      const clients = await res.json();
  
      select.innerHTML = '';
      clients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c._id;
        opt.textContent = c.username;
        select.appendChild(opt);
      });
    } catch (err) {
      console.error('❌ Failed to load clients', err);
    }
  }
  
  /* ===== Create ===== */
  async function createMeeting(e) {
    e.preventDefault();
  
    const payload = {
      clientId: document.getElementById('client-select')?.value,
      title: document.getElementById('meeting-title')?.value,
      dateTime: document.getElementById('meeting-date')?.value,
      duration: document.getElementById('meeting-duration')?.value,
      notes: document.getElementById('meeting-notes')?.value,
      meetingUrl: `https://meet.jit.si/legal-bridge-${Date.now()}`
    };
  
    try {
      await fetch('http://localhost:5000/api/meetings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
  
      closeCreateModal();
      e.target.reset();
      loadMeetings();
    } catch (err) {
      console.error('❌ Failed to create meeting', err);
    }
  }
  
  /* ===== Pin helpers ===== */
  function getPinnedMeetings() {
    return JSON.parse(localStorage.getItem('pinnedMeetings') || '[]');
  }
  
  function isPinned(meetingId) {
    return getPinnedMeetings().includes(meetingId);
  }
  
  function togglePin(meetingId) {
    let pinned = getPinnedMeetings();
  
    if (pinned.includes(meetingId)) {
      pinned = pinned.filter(id => id !== meetingId);
    } else {
      pinned.push(meetingId);
    }
  
    localStorage.setItem('pinnedMeetings', JSON.stringify(pinned));
    loadMeetings();
  }
  
  /* ===== Load Meetings ===== */
  async function loadMeetings() {
    const upcoming = document.getElementById('upcoming-meetings');
    const past = document.getElementById('past-meetings');
    if (!upcoming || !past) return;
  
    try {
      const res = await fetch('http://localhost:5000/api/meetings/all');
      const meetings = await res.json();
  
      const sortBy = document.getElementById('sort-select')?.value || 'date';
      const searchValue = document.getElementById('search-input')?.value.toLowerCase() || '';
  
      // Sort
      if (sortBy === 'client') {
        meetings.sort((a, b) => a.clientName.localeCompare(b.clientName));
      } else {
        meetings.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
      }
  
      // Filter
      const filteredMeetings = meetings.filter(m =>
        m.clientName.toLowerCase().includes(searchValue)
      );
  
      upcoming.innerHTML = '';
      past.innerHTML = '';
  
      const now = new Date();
      const upcomingCards = [];
      const pastCards = [];
  
      filteredMeetings.forEach(m => {
        const card = document.createElement('div');
        card.className = 'meeting-card';
  
        const pinned = isPinned(m._id);
  
        card.innerHTML = `
          <div class="meeting-header">
            <h3>${pinned ? '📌 ' : ''}${m.title}</h3>
            <button class="pin-btn"
              onclick="togglePin('${m._id}')"
              title="הצמד פגישה">
              <i class="bi ${pinned ? 'bi-pin-fill' : 'bi-pin'}"></i>
            </button>
          </div>
  
          <p><strong>לקוח:</strong> ${m.clientName}</p>
          <p>${new Date(m.dateTime).toLocaleString('he-IL')}</p>
  
          <div class="actions">
            ${
              new Date(m.dateTime) > now && m.status !== 'cancelled'
                ? `
                  <button class="join"
                    onclick="joinMeeting('${m._id}', '${m.meetingUrl}')">
                    הצטרפות
                  </button>
                  <button class="cancel"
                    onclick="cancelMeeting('${m._id}')">
                    ביטול
                  </button>
                `
                : `
                  <span class="status ${m.status}">${m.status}</span>
                  <button class="delete-btn"
                    onclick="deleteMeeting('${m._id}')"
                    title="מחיקה">
                    <i class="bi bi-trash"></i>
                  </button>
                `
            }
          </div>
        `;
  
        if (new Date(m.dateTime) > now && m.status !== 'cancelled') {
          upcomingCards.push(card);
        } else {
          pastCards.push(card);
        }
      });
  
      const sortPinnedFirst = cards =>
        cards.sort((a, b) => {
          const aPinned = a.querySelector('.bi-pin-fill') ? 1 : 0;
          const bPinned = b.querySelector('.bi-pin-fill') ? 1 : 0;
          return bPinned - aPinned;
        });
  
      sortPinnedFirst(upcomingCards).forEach(c => upcoming.appendChild(c));
      sortPinnedFirst(pastCards.reverse()).forEach(c => past.appendChild(c));
  
    } catch (err) {
      console.error('❌ Failed to load meetings', err);
    }
  }
  
  /* ===== Actions ===== */
  function joinMeeting(id, url) {
    fetch(`http://localhost:5000/api/meetings/join/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userType: 'lawyer' })
    });
  
    window.open(url, '_blank');
  }
  
  async function cancelMeeting(id) {
    if (!confirm('לבטל את הפגישה?')) return;
  
    await fetch(`http://localhost:5000/api/meetings/cancel/${id}`, {
      method: 'PUT'
    });
  
    loadMeetings();
  }
  
  /* ===== Delete ===== */
  async function deleteMeeting(meetingId) {
    if (!confirm('האם למחוק את הפגישה לצמיתות?')) return;
  
    try {
      await fetch(`http://localhost:5000/api/meetings/${meetingId}`, {
        method: 'DELETE'
      });
      loadMeetings();
    } catch (err) {
      console.error('❌ Failed to delete meeting', err);
    }
  }
  
  /* ===== Logout ===== */
  function logout() {
    document.body.style.opacity = '0';
    setTimeout(() => {
      localStorage.clear();
      window.location.href = '../index.html';
    }, 300);
  }
  
  /* ===== Greeting ===== */
  function loadGreeting() {
    const username = localStorage.getItem('username');
    const greetingEl = document.getElementById('greeting');
    if (greetingEl && username) {
      greetingEl.textContent = `שלום, ${username}`;
    }
  }
  
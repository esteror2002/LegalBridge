document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    
    if (!username || role !== 'client') {
      alert('רק לקוחות רשאים לגשת לאזור זה.');
      window.location.href = '../index.html';
      return;
    }
  
    document.getElementById('greeting').innerText = `שלום, ${username}`;
    
    // טעינת נתוני התיק
    loadCaseData();
  });
  
  let currentCase = null;
  
  // טעינת נתוני התיק
  async function loadCaseData() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.remove('hidden');
    
    try {
      const username = localStorage.getItem('username');
      
      // ראשית, נקבל את ה-ID של המשתמש
      const userResponse = await fetch('http://localhost:5000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` // אם יש טוקן
        }
      });
      
      let userId;
      if (userResponse.ok) {
        const userData = await userResponse.json();
        userId = userData._id;
      } else {
        // אם אין API לפרופיל, נחפש לפי username
        const usersResponse = await fetch('http://localhost:5000/api/auth/clients');
        const users = await usersResponse.json();
        const currentUser = users.find(user => user.username === username);
        
        if (!currentUser) {
          throw new Error('משתמש לא נמצא');
        }
        userId = currentUser._id;
      }
      
      // עכשיו נחפש את התיק של המשתמש
      const caseResponse = await fetch(`http://localhost:5000/api/cases/client/${userId}`);
      const cases = await caseResponse.json();
      
      if (cases.length === 0) {
        showNoCaseMessage();
        return;
      }
      
      // נניח שיש רק תיק אחד ללקוח
      currentCase = cases[0];
      displayCaseData(currentCase);
      displayProgress(currentCase.progress || []);
      displaySubcases(currentCase.subCases || []);
      
    } catch (error) {
      console.error('שגיאה בטעינת נתוני התיק:', error);
      showErrorMessage('שגיאה בטעינת נתוני התיק');
      showNoCaseMessage();
    } finally {
      loadingOverlay.classList.add('hidden');
    }
  }
  
  // הצגת נתוני התיק
  function displayCaseData(caseData) {
    document.getElementById('case-overview').style.display = 'block';
    document.getElementById('no-case-message').style.display = 'none';
    
    // עדכון כותרת התיק
    document.getElementById('case-title').textContent = `תיק של ${caseData.clientName}`;
    
    // עדכון תאריך פתיחה
    const openDate = new Date(caseData.openDate);
    document.getElementById('case-open-date').textContent = 
      `נפתח ב-${openDate.toLocaleDateString('he-IL')}`;
    
    // עדכון סטטוס
    const statusElement = document.getElementById('case-status');
    const statusText = statusElement.querySelector('span');
    statusText.textContent = caseData.status || 'פתוח';
    
    // הוספת מחלקה לפי סטטוס
    statusElement.className = 'case-status';
    if (caseData.status === 'פתוח') {
      statusElement.classList.add('status-open');
    } else if (caseData.status === 'סגור') {
      statusElement.classList.add('status-closed');
    } else {
      statusElement.classList.add('status-pending');
    }
    
    // עדכון תיאור
    document.getElementById('case-description-text').textContent = 
      caseData.description || 'אין תיאור זמין';
  }
  
  // הצגת עדכוני התקדמות
  function displayProgress(progressItems) {
    const timeline = document.getElementById('progress-timeline');
    
    if (progressItems.length === 0) {
      timeline.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-clock-history"></i>
          <h4>אין עדכוני התקדמות</h4>
          <p>עדכונים יופיעו כאן כאשר יהיו</p>
        </div>
      `;
      return;
    }
    
    timeline.innerHTML = '';
    
    // מיון לפי תאריך (החדש ביותר ראשון)
    const sortedProgress = [...progressItems].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    sortedProgress.forEach((item, index) => {
      const timelineItem = document.createElement('div');
      timelineItem.className = 'timeline-item';
      
      // סימון העדכון הראשון כ-latest
      if (index === 0) {
        timelineItem.classList.add('latest');
      }
      
      const date = new Date(item.date);
      const formattedDate = date.toLocaleDateString('he-IL');
      const formattedTime = date.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      timelineItem.innerHTML = `
        <div class="timeline-content">
          <h4>${item.title}</h4>
          <p>${item.description}</p>
          <div class="timeline-meta">
            <span>נוסף על ידי: ${item.addedBy}</span>
            <span>${formattedDate} בשעה ${formattedTime}</span>
          </div>
        </div>
      `;
      
      timeline.appendChild(timelineItem);
    });
  }
  
  // הצגת תתי-תיקים
  function displaySubcases(subcases) {
    const container = document.getElementById('subcases-container');
    
    if (subcases.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-folder-x"></i>
          <h4>אין תתי-תיקים</h4>
          <p>תתי-תיקים ומסמכים יופיעו כאן כאשר יהיו</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    
    subcases.forEach(subcase => {
      const subcaseCard = document.createElement('div');
      subcaseCard.className = 'subcase-card';
      
      subcaseCard.innerHTML = `
        <h4 class="subcase-title">
          <i class="bi bi-folder"></i>
          ${subcase.title}
        </h4>
        
        <ul class="documents-list">
          ${subcase.documents.length > 0 
            ? subcase.documents.map(doc => `
                <li class="document-item">
                  <i class="bi bi-file-earmark"></i>
                  <span>${doc}</span>
                </li>
              `).join('')
            : '<li class="document-item empty"><i class="bi bi-file-x"></i><span>אין מסמכים</span></li>'
          }
        </ul>
      `;
      
      container.appendChild(subcaseCard);
    });
  }
  
  // הצגת הודעת "אין תיק"
  function showNoCaseMessage() {
    document.getElementById('case-overview').style.display = 'none';
    document.querySelector('.progress-section').style.display = 'none';
    document.querySelector('.subcases-section').style.display = 'none';
    document.getElementById('no-case-message').style.display = 'block';
  }
  
  // פונקציות ניווט
  function goBack() {
    window.history.back();
  }
  
  function navigateTo(page) {
    document.body.style.transition = 'opacity 0.2s ease';
    document.body.style.opacity = '0.8';
    
    setTimeout(() => {
      window.location.href = page;
    }, 200);
  }
  
  function logout() {
    const confirmLogout = confirm('האם אתה בטוח שברצונך להתנתק?');
    if (confirmLogout) {
      document.body.style.transition = 'opacity 0.3s ease';
      document.body.style.opacity = '0';
      
      setTimeout(() => {
        localStorage.clear();
        window.location.href = '../index.html';
      }, 300);
    }
  }
  
  // הודעות Toast
  function showMessage(message, type) {
    const existingMessage = document.querySelector('.toast-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.innerHTML = `
      <i class="bi bi-${type === 'success' ? 'check-circle' : 
                       type === 'error' ? 'exclamation-circle' : 
                       'info-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
  
  function showSuccessMessage(message) {
    showMessage(message, 'success');
  }
  
  function showErrorMessage(message) {
    showMessage(message, 'error');
  }
  
  function showInfoMessage(message) {
    showMessage(message, 'info');
  }
  
  // טיפול בשגיאות גלובליות
  window.addEventListener('error', function(event) {
    console.error('שגיאה בדף התיק:', event.error);
    showErrorMessage('אירעה שגיאה טכנית');
  });
  
  // רענון הדף בעת חזרה מהרקע
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && currentCase) {
      console.log('רענון נתוני התיק...');
      loadCaseData();
    }
  });
  
  console.log('🎉 סקריפט התיק נטען בהצלחה!');
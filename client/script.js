document.addEventListener('DOMContentLoaded', function () {
    const registerBtn = document.getElementById('register-btn');
    const loginBtn = document.getElementById('login-btn');
    const modal = document.getElementById('modal');
    const closeBtn = document.getElementById('close-btn');
    const modalTitle = document.getElementById('modal-title');
    const authForm = document.getElementById('auth-form');
    const usernameField = document.getElementById('username');
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const roleField = document.getElementById('role');
    const phoneField = document.getElementById('phone');
    const addressField = document.getElementById('address');
    
    // שכחתי סיסמה
    const forgotLink = document.getElementById('forgot-password-link');
    const forgotModal = document.getElementById('forgot-password-modal');
    const forgotCloseBtn = document.getElementById('forgot-close-btn');
    const forgotForm = document.getElementById('forgot-password-form');
    const forgotPasswordContainer = document.getElementById('forgot-password-container');

    let isLogin = false;

    // הסתרת המודל כברירת מחדל
    modal.style.display = 'none';

    registerBtn.addEventListener('click', function () {
        openModal('הרשמה למערכת');
        
        // הצגת שדות הרשמה
        emailField.parentElement.style.display = 'block';
        roleField.parentElement.style.display = 'block';
        phoneField.parentElement.style.display = 'block';
        addressField.parentElement.style.display = 'block';
        
        // הסתרת "שכחתי סיסמה" בהרשמה
        forgotPasswordContainer.style.display = 'none';
        
        // הגדרת שדות חובה
        emailField.required = true;
        roleField.required = true;
        phoneField.required = true;
        addressField.required = true;
        
        isLogin = false;
        
        // עדכון טקסט הכפתור
        const submitButton = document.querySelector('.btn-submit');
        if (submitButton) {
            submitButton.innerHTML = '<i class="fas fa-user-plus me-2"></i>הרשם למערכת';
        }
    });

    loginBtn.addEventListener('click', function () {
        openModal('התחברות למערכת');
        
        // הסתרת שדות הרשמה
        emailField.parentElement.style.display = 'none';
        roleField.parentElement.style.display = 'none';
        phoneField.parentElement.style.display = 'none';
        addressField.parentElement.style.display = 'none';
        
        // הצגת "שכחתי סיסמה" בהתחברות
        forgotPasswordContainer.style.display = 'block';
        
        // הסרת שדות חובה
        emailField.required = false;
        roleField.required = false;
        phoneField.required = false;
        addressField.required = false;
        
        isLogin = true;
        
        // עדכון טקסט הכפתור
        const submitButton = document.querySelector('.btn-submit');
        if (submitButton) {
            submitButton.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>התחבר למערכת';
        }
    });

    function openModal(title) {
        modalTitle.innerText = title;
        modal.style.display = 'flex';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // פוקוס על שדה שם המשתמש
        setTimeout(() => {
            usernameField.focus();
        }, 300);
    }

    function closeModal() {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        authForm.reset();
    }

    closeBtn.addEventListener('click', function () {
        closeModal();
    });

    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            closeModal();
        }
        if (event.target === forgotModal) {
            forgotModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });

    // שליחת טופס הרשמה או התחברות
    authForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const userData = {
            username: usernameField.value.trim(),
            password: passwordField.value.trim(),
        };

        if (!isLogin) {
            userData.email = emailField.value.trim();
            userData.role = roleField.value;
            userData.phone = phoneField.value.trim();
            userData.address = addressField.value.trim();
        }

        const endpoint = isLogin ? 'login' : 'register';

        console.log(`🚀 שולח לשרת:`, userData);

        // הצגת מצב טעינה
        const submitButton = document.querySelector('.btn-submit');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>מעבד...';
        submitButton.disabled = true;

        try {
            const response = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();
            console.log(`🔍 תגובת השרת:`, data);

            if (response.ok) {
                // הצגת הודעת הצלחה
                showSuccessMessage(data.message || 'הפעולה בוצעה בהצלחה!');
                
                if (isLogin && data.username && data.role) {
                    localStorage.setItem('username', data.username);
                    localStorage.setItem('role', data.role);
                    
                    setTimeout(() => {
                        closeModal();
                        if (data.role === 'lawyer') {
                            window.location.href = 'pages/lawyer-home.html';
                        } else if (data.role === 'client') {
                            window.location.href = 'pages/client-home.html';
                        }
                    }, 1500);
                } else if (!isLogin) {
                    // עבור הרשמה מוצלחת
                    setTimeout(() => {
                        closeModal();
                    }, 1500);
                }
            } else {
                showErrorMessage(data.message || 'שגיאה, נסה שוב.');
            }

        } catch (error) {
            console.error('❌ שגיאה בשליחת הנתונים:', error);
            showErrorMessage('שגיאה בשרת, נסה שוב מאוחר יותר.');
        } finally {
            // החזרת מצב הכפתור
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    });

    // שכחתי סיסמה - פתיחת מודל
    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal();
            forgotModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // פוקוס על שדה שם המשתמש
            setTimeout(() => {
                document.getElementById('forgot-username').focus();
            }, 300);
        });
    }

    // שכחתי סיסמה - סגירת מודל
    if (forgotCloseBtn) {
        forgotCloseBtn.addEventListener('click', () => {
            forgotModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }

    // שכחתי סיסמה - שליחת טופס
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            console.log('🔄 מתחיל תהליך איפוס סיסמה...');
            
            const username = document.getElementById('forgot-username').value.trim();
            const email = document.getElementById('forgot-email').value.trim();
            
            console.log('📝 נתונים:', { username, email });
            
            if (!username || !email) {
                showErrorMessage('אנא מלא את כל השדות');
                return;
            }
            
            // הצגת מצב טעינה
            const submitButton = forgotForm.querySelector('.btn-submit');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>שולח...';
            submitButton.disabled = true;
            
            try {
                console.log('📡 שולח בקשה לשרת...');
                
                const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email }),
                });
                
                console.log('📥 תגובה מהשרת:', response.status);
                
                const data = await response.json();
                console.log('📋 נתוני תגובה:', data);
                
                if (response.ok) {
                    showSuccessMessage('✅ ' + data.message);
                    setTimeout(() => {
                        forgotModal.style.display = 'none';
                        document.body.style.overflow = 'auto';
                        forgotForm.reset();
                    }, 1500);
                } else {
                    showErrorMessage('❌ ' + data.message);
                }
                
            } catch (err) {
                console.error('❌ שגיאה מפורטת:', err);
                showErrorMessage('🚨 שגיאה בחיבור לשרת. בדוק שהשרת פועל.');
            } finally {
                // החזרת מצב הכפתור
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }
        });
    }

    // פונקציות עזר להודעות
    function showSuccessMessage(message) {
        showNotification(message, 'success');
    }

    function showErrorMessage(message) {
        showNotification(message, 'error');
    }

    function showNotification(message, type) {
        // הסרת הודעות קיימות
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // יצירת הודעה חדשה
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
            ${message}
        `;

        // עיצוב ההודעה
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '10px',
            color: 'white',
            fontWeight: '500',
            zIndex: '3000',
            minWidth: '300px',
            textAlign: 'right',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            background: type === 'success' ? 
                'linear-gradient(135deg, #10b981, #059669)' : 
                'linear-gradient(135deg, #ef4444, #dc2626)',
            animation: 'slideInRight 0.3s ease-out'
        });

        // הוספת CSS לאנימציות אם לא קיים
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // הסרה אוטומטית אחרי 4 שניות
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }
});
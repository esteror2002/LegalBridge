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
    let pendingLogin = null; // { username, password }


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
                // בדיקה אם נדרש 2FA
                if (isLogin && data.requiresTwoFactor) {
                    // נשמור את פרטי ההתחברות לשימוש אחרי הקוד
                    pendingLogin = { username: userData.username, password: userData.password };
                
                    showSuccessMessage('נדרש אימות דו-שלבי (קוד נשלח ב‑SMS)');
                    show2FAModal(userData.username);
                    return;
                }
                
                
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

    function show2FAModal(username) {
        const modal2FA = document.createElement('div');
        modal2FA.className = 'modal-overlay';
        modal2FA.id = 'modal-2fa';
        modal2FA.style.display = 'flex';
        modal2FA.innerHTML = `
            <div class="modal-content">
                <span class="close-btn" onclick="close2FAModal()">&times;</span>
                <h2 class="modal-title">
                    <i class="fas fa-shield-alt me-2"></i>
                    אימות דו-שלבי (SMS)
                </h2>
                <div class="text-center mb-3">
                    <p>הזן את הקוד בן 6 ספרות שנשלח אלייך ב‑SMS.</p>
                    <button type="button" id="resend-code" class="btn-submit" style="margin-bottom:8px;">
                        <i class="fas fa-paper-plane me-2"></i> שלח שוב קוד
                    </button>
                    <div id="sandbox-hint" style="color:#888;font-size:0.9em;"></div>
                </div>
                <form id="two-factor-form">
                    <div class="form-group">
                        <input type="text" 
                               id="two-factor-code" 
                               class="form-control text-center" 
                               placeholder="000000" 
                               inputmode="numeric"
                               maxlength="6" 
                               style="font-size: 1.5em; letter-spacing: 5px; font-weight: bold;"
                               required>
                    </div>
                    <button type="submit" class="btn-submit">
                        <i class="fas fa-unlock me-2"></i>
                        אמת והתחבר
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(modal2FA);
        document.body.style.overflow = 'hidden';
    
        // פוקוס
        setTimeout(() => document.getElementById('two-factor-code').focus(), 200);
    
        // שליחת קוד שוב (וגם מציג sandboxCode אם קיים)
        const resendBtn = document.getElementById('resend-code');
        const sandboxHint = document.getElementById('sandbox-hint');
        resendBtn.addEventListener('click', async () => {
            resendBtn.disabled = true;
            const old = resendBtn.innerHTML;
            resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>שולח...';
            try {
                const r = await fetch(`http://localhost:5000/api/auth/2fa/sms/send/${encodeURIComponent(username)}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }
                });
                const j = await r.json();
                if (!r.ok) throw new Error(j.message || 'שגיאה');
                // אם ב‑Sandbox — נקבל גם sandboxCode
                if (j.sandboxCode) {
                    sandboxHint.textContent = `Sandbox code: ${j.sandboxCode}`;
                } else {
                    sandboxHint.textContent = 'קוד נשלח ב‑SMS.';
                }
            } catch (e) {
                sandboxHint.textContent = e.message || 'שגיאה בשליחת קוד';
            } finally {
                resendBtn.innerHTML = old;
                resendBtn.disabled = false;
            }
        });
    
        // נשלח קוד מיד כשנפתחת חלונית (טוב למקרה שהלוגין לא שלח)
        resendBtn.click();
    
        // טיפול בטופס הקוד
        document.getElementById('two-factor-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('two-factor-code').value.trim();
            await verify2FACode(username, code);
        });
    }
    
    // פונקציה לסגירת modal של 2FA
    window.close2FAModal = function() {
        const modal2FA = document.getElementById('modal-2fa');
        if (modal2FA) {
            modal2FA.remove();
            document.body.style.overflow = 'auto';
        }
    }
    
    async function verify2FACode(username, code) {
        if (!code || code.length !== 6) {
            showErrorMessage('אנא הזן קוד בן 6 ספרות');
            return;
        }
        if (!pendingLogin) {
            showErrorMessage('אין ניסיון התחברות פעיל');
            return;
        }
    
        const btn = document.querySelector('#modal-2fa .btn-submit');
        const old = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>מאמת...';
        btn.disabled = true;
    
        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: pendingLogin.username,
                    password: pendingLogin.password,
                    twoFactorCode: code
                })
            });
            const data = await response.json();
    
            if (!response.ok) throw new Error(data.message || 'קוד שגוי');
    
            // התחברות הושלמה
            showSuccessMessage('התחברת בהצלחה! 🎉');
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('role', data.role);
    
            setTimeout(() => {
                close2FAModal();
                closeModal();
                if (data.role === 'lawyer') {
                    window.location.href = 'pages/lawyer-home.html';
                } else {
                    window.location.href = 'pages/client-home.html';
                }
            }, 800);
        } catch (err) {
            showErrorMessage(err.message || 'שגיאה באימות הקוד');
            document.getElementById('two-factor-code').select();
        } finally {
            btn.innerHTML = old;
            btn.disabled = false;
        }
    }
    

    // פונקציה לאימות עם קוד גיבוי
    window.verifyWithBackupCode = async function(username) {
        const backupCode = document.getElementById('backup-code').value.trim();
        await verify2FACode(username, backupCode, true);
    }

});
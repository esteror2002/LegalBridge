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

    let isLogin = false;

    // הסתרת המודל כברירת מחדל
    modal.style.display = 'none';

    registerBtn.addEventListener('click', function () {
        openModal('הרשמה');
        emailField.parentElement.style.display = 'block';
        emailField.required = true;
        isLogin = false;
    });

    loginBtn.addEventListener('click', function () {
        openModal('התחברות');
        emailField.parentElement.style.display = 'none';
        emailField.required = false;
        isLogin = true;
    });

    function openModal(title) {
        modalTitle.innerText = title;
        modal.style.display = 'flex'; // מוודא שהתצוגה תהיה גמישה כדי שהמודל יופיע
    }

    closeBtn.addEventListener('click', function () {
        closeModal();
    });

    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    function closeModal() {
        modal.style.display = 'none';
    }

    // **שליחת טופס הרשמה או התחברות**
    authForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // מונע רענון העמוד

        const userData = {
            username: usernameField.value.trim(),
            password: passwordField.value.trim(),
        };

        if (!isLogin) {
            userData.email = emailField.value.trim();
        }

        const endpoint = isLogin ? 'login' : 'register';

        console.log(`🚀 שולח לשרת:`, userData); // ✅ בדיקה ב-Console

        try {
            const response = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();
            console.log(`🔍 תגובת השרת:`, data); // ✅ לבדוק מה מחזיר השרת

            if (response.ok) {
                alert(data.message || 'הפעולה בוצעה בהצלחה!');
                closeModal();
                authForm.reset();
            } else {
                alert(data.message || 'שגיאה, נסה שוב.');
            }
        } catch (error) {
            console.error('❌ שגיאה בשליחת הנתונים:', error);
            alert('שגיאה בשרת, נסה שוב מאוחר יותר.');
        }
    });
});



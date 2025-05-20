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

    const forgotLink = document.getElementById('forgot-password-link');
    const forgotModal = document.getElementById('forgot-password-modal');
    const forgotCloseBtn = document.getElementById('forgot-close-btn');
    const forgotForm = document.getElementById('forgot-password-form');

    let isLogin = false;

    // סגור את מודל ברירת מחדל
    modal.style.display = 'none';

    registerBtn.addEventListener('click', function () {
        openModal('הרשמה');
        emailField.parentElement.style.display = 'block';
        roleField.parentElement.style.display = 'block';
        phoneField.parentElement.style.display = 'block';
        addressField.parentElement.style.display = 'block';
        emailField.required = true;
        roleField.required = true;
        phoneField.required = true;
        addressField.required = true;
        isLogin = false;
    });

    loginBtn.addEventListener('click', function () {
        openModal('התחברות');
        emailField.parentElement.style.display = 'none';
        roleField.parentElement.style.display = 'none';
        phoneField.parentElement.style.display = 'none';
        addressField.parentElement.style.display = 'none';
        emailField.required = false;
        roleField.required = false;
        phoneField.required = false;
        addressField.required = false;
        isLogin = true;
    });

    function openModal(title) {
        modalTitle.innerText = title;
        modal.style.display = 'flex';
    }

    closeBtn.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
        if (event.target === forgotModal) {
            forgotModal.style.display = 'none';
        }
    });

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

        try {
            const response = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            const data = await response.json();
            alert(data.message);

            if (response.ok) {
                localStorage.setItem('username', data.username);
                localStorage.setItem('role', data.role);
                modal.style.display = 'none';
                authForm.reset();

                if (isLogin && data.role === 'lawyer') {
                    window.location.href = 'pages/lawyer-home.html';
                } else if (isLogin && data.role === 'client') {
                    window.location.href = 'pages/client-home.html';
                }
            }
        } catch (error) {
            alert('שגיאה בשרת, נסה שוב מאוחר יותר');
        }
    });

    // 💡 שכחתי סיסמה
    forgotLink.addEventListener('click', () => {
        modal.style.display = 'none';
        forgotModal.style.display = 'flex';
    });

    forgotCloseBtn.addEventListener('click', () => {
        forgotModal.style.display = 'none';
    });

    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('forgot-username').value.trim();
        const email = document.getElementById('forgot-email').value.trim();
      
        try {
          const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email }),
          });
      
          const data = await response.json();
          alert(data.message);
          forgotModal.style.display = 'none';
          forgotForm.reset();
        } catch (err) {
          alert('שגיאה בשליחת בקשה לאיפוס סיסמה');
        }
      });      
});

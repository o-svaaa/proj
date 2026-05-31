// Авторизация - ИСПРАВЛЕННАЯ ВЕРСИЯ
async function login(login, password) {
    console.log('Attempting login with:', login);
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ login, password })
        });
        
        console.log('Login response status:', response.status);
        
        // Проверяем, что ответ - JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text.substring(0, 200));
            throw new Error('Сервер вернул HTML вместо JSON');
        }
        
        const data = await response.json();
        console.log('Login response data:', data);
        
        if (data.success) {
            currentUser = data.user;
            updateUIBasedOnAuth();
            showMessage('✅ Успешный вход!', 'success');
            
            // Очищаем поля ввода
            document.getElementById('loginInput').value = '';
            document.getElementById('passwordInput').value = '';
            
            return true;
        } else {
            showMessage('❌ Неверный логин или пароль', 'error');
            return false;
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Ошибка сети: ' + error.message, 'error');
        return false;
    }
}

// Проверка авторизации - ИСПРАВЛЕННАЯ ВЕРСИЯ
async function checkAuth() {
    try {
        console.log('Checking auth at:', `${API_BASE}/auth/check`);
        
        const response = await fetch(`${API_BASE}/auth/check`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Auth check response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text.substring(0, 200));
            throw new Error('Сервер вернул HTML вместо JSON');
        }
        
        const data = await response.json();
        console.log('Auth check data:', data);
        
        currentUser = data.success ? data.user : null;
        updateUIBasedOnAuth();
        return currentUser;
    } catch (error) {
        console.error('Auth check error:', error);
        currentUser = null;
        updateUIBasedOnAuth();
        return null;
    }
}

// Показ формы входа - ИСПРАВЛЕННАЯ ВЕРСИЯ (с кнопкой входа)
function showLoginForm() {
    // Удаляем старый модал, если есть
    const oldModal = document.getElementById('loginModal');
    if (oldModal) oldModal.remove();
    const oldOverlay = document.getElementById('loginOverlay');
    if (oldOverlay) oldOverlay.remove();
    
    const modal = document.createElement('div');
    modal.id = 'loginModal';
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 2rem;
        border-radius: 1rem;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        z-index: 1001;
        max-width: 350px;
        width: 90%;
    `;
    
    modal.innerHTML = `
        <h3 style="color: #1e293b; margin-bottom: 1rem; text-align: center;">🔐 Вход в систему</h3>
        <div id="loginErrorMsg" style="color: #dc2626; font-size: 0.85rem; margin-bottom: 1rem; display: none;"></div>
        <input type="text" id="loginInput" placeholder="Логин" style="width: 100%; padding: 0.75rem; margin-bottom: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; font-size: 1rem;">
        <input type="password" id="passwordInput" placeholder="Пароль" style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; font-size: 1rem;">
        <button id="loginBtn" style="width: 100%; padding: 0.75rem; background: #946115; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem;">Войти</button>
        <button id="closeLoginBtn" style="width: 100%; margin-top: 0.5rem; padding: 0.75rem; background: #64748b; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">Отмена</button>
        <p style="text-align: center; margin-top: 1rem; font-size: 0.8rem; color: #64748b;">
            Нет аккаунта? <a href="#" id="registerLink" style="color: #3b82f6;">Заполните форму</a>
        </p>
    `;
    
    document.body.appendChild(modal);
    
    const overlay = document.createElement('div');
    overlay.id = 'loginOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
    `;
    document.body.appendChild(overlay);
    
    const closeModal = () => {
        modal.remove();
        overlay.remove();
    };
    
    document.getElementById('closeLoginBtn').addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const login = document.getElementById('loginInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        
        if (!login || !password) {
            const errorMsg = document.getElementById('loginErrorMsg');
            errorMsg.textContent = 'Введите логин и пароль';
            errorMsg.style.display = 'block';
            return;
        }
        
        const success = await login(login, password);
        if (success) {
            closeModal();
        }
    });
    
    document.getElementById('registerLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
        document.getElementById('comment')?.scrollIntoView({ behavior: 'smooth' });
    });
}

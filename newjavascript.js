// API endpoints
const API_BASE = window.location.origin + '/proj/api';
let currentUser = null;

// Проверка авторизации
async function checkAuth() {
    try {
        console.log('Checking auth at:', `${API_BASE}/auth/check`);
        
        const response = await fetch(`${API_BASE}/auth/check`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('Auth check response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
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

// Обновление UI
function updateUIBasedOnAuth() {
    console.log('Updating UI, currentUser:', currentUser);
    
    if (currentUser) {
        // Пользователь авторизован - показываем информацию
        updateAuthButtons(true, currentUser.login || currentUser.fullname);
        
        // Заполняем форму данными пользователя
        fillFormWithUserData(currentUser);
    } else {
        // Пользователь не авторизован - показываем кнопку входа
        updateAuthButtons(false, null);
        
        // Загружаем сохранённые данные из localStorage
        loadSavedFormData();
    }
}

// Заполнение формы данными пользователя
function fillFormWithUserData(user) {
    const nameField = document.getElementById('name');
    const emailField = document.getElementById('email');
    const telField = document.getElementById('tel');
    const messageField = document.getElementById('message');
    const checkField = document.getElementById('check');
    
    if (nameField) nameField.value = user.fullname || '';
    if (emailField) emailField.value = user.email || '';
    if (telField) telField.value = user.phone || '';
    if (messageField) messageField.value = user.biography || '';
    if (checkField && user.contract_agreed) checkField.checked = true;
}

// Сохранение данных в localStorage
function saveFormDataToLocal() {
    const formData = {
        name: document.getElementById('name')?.value || '',
        email: document.getElementById('email')?.value || '',
        tel: document.getElementById('tel')?.value || '',
        message: document.getElementById('message')?.value || '',
        check: document.getElementById('check')?.checked || false
    };
    localStorage.setItem('travelFormData', JSON.stringify(formData));
}

// Загрузка данных из localStorage
function loadSavedFormData() {
    const saved = localStorage.getItem('travelFormData');
    if (saved) {
        const formData = JSON.parse(saved);
        if (document.getElementById('name')) document.getElementById('name').value = formData.name || '';
        if (document.getElementById('email')) document.getElementById('email').value = formData.email || '';
        if (document.getElementById('tel')) document.getElementById('tel').value = formData.tel || '';
        if (document.getElementById('message')) document.getElementById('message').value = formData.message || '';
        if (document.getElementById('check')) document.getElementById('check').checked = formData.check || false;
    }
}

// Получение данных формы
function getFormData() {
    return {
        fullname: document.getElementById('name')?.value || '',
        email: document.getElementById('email')?.value || '',
        phone: document.getElementById('tel')?.value || '',
        biography: document.getElementById('message')?.value || '',
        contract_agreed: document.getElementById('check')?.checked || false,
        gender: 'unspecified',
        birthdate: '',
        languages: ['PHP']  // Язык по умолчанию
    };
}

// Валидация формы
function validateForm(formData) {
    const errors = [];
    
    if (!formData.fullname || formData.fullname.trim().length < 2) {
        errors.push('Введите корректное имя (минимум 2 символа)');
    }
    
    if (!formData.email || !formData.email.includes('@')) {
        errors.push('Введите корректный email');
    }
    
    if (!formData.contract_agreed) {
        errors.push('Необходимо согласиться с политикой обработки персональных данных');
    }
    
    return errors;
}

// Отправка через REST API
async function submitViaAPI(formData, isUpdate = false) {
    let url = `${API_BASE}/applications`;
    let method = 'POST';
    
    if (isUpdate && currentUser && currentUser.id) {
        method = 'PUT';
        url = `${API_BASE}/applications/${currentUser.id}`;
    }
    
    console.log('Sending request:', { url, method, formData });
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            if (data.login && data.password) {
                showCredentials(data.login, data.password, data.profile_url);
            } else if (isUpdate) {
                showMessage('✅ Данные успешно обновлены!', 'success');
            } else {
                showMessage('✅ Сообщение отправлено!', 'success');
            }
            localStorage.removeItem('travelFormData');
            await checkAuth();
            return true;
        } else if (data.errors) {
            const errorMessages = [];
            for (const [field, err] of Object.entries(data.errors)) {
                errorMessages.push(`${field}: ${err.message}`);
            }
            showMessage(errorMessages.join('\n'), 'error');
            return false;
        } else if (data.error === 'Unauthorized') {
            showMessage('Необходимо авторизоваться', 'warning');
            showLoginForm();
            return false;
        } else {
            showMessage('Ошибка: ' + (data.error || 'Неизвестная ошибка'), 'error');
            return false;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showMessage('Ошибка сети: ' + error.message, 'error');
        return false;
    }
}

// Авторизация
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
        
        const data = await response.json();
        console.log('Login response data:', data);
        
        if (data.success) {
            currentUser = data.user;
            updateUIBasedOnAuth();
            showMessage('✅ Успешный вход!', 'success');
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

// Выход
async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        currentUser = null;
        updateUIBasedOnAuth();
        showMessage('Вы вышли из системы', 'success');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Обновление кнопок авторизации (СОЗДАЁТ КНОПКИ, ЕСЛИ ИХ НЕТ)
function updateAuthButtons(isLoggedIn, username = '') {
    console.log('Updating auth buttons, isLoggedIn:', isLoggedIn);
    
    // Ищем контейнер для кнопок
    let container = document.getElementById('authButtonsContainer');
    
    // Если контейнера нет, создаём его в футере
    if (!container) {
        const footer = document.querySelector('footer .contw');
        if (footer) {
            container = document.createElement('div');
            container.id = 'authButtonsContainer';
            container.style.marginTop = '1rem';
            container.style.display = 'flex';
            container.style.gap = '1rem';
            container.style.justifyContent = 'center';
            footer.appendChild(container);
            console.log('Created auth buttons container');
        } else {
            console.error('Footer .contw not found');
            return;
        }
    }
    
    // Обновляем содержимое контейнера
    if (isLoggedIn) {
        container.innerHTML = `
            <span style="color: #946115; font-weight: bold; padding: 0.5rem;">👤 ${escapeHtml(username)}</span>
            <button id="logoutBtn" style="background: #64748b; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; color: white; cursor: pointer;">🚪 Выйти</button>
        `;
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
    } else {
        container.innerHTML = `
            <button id="showLoginBtn" style="background: #946115; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; color: white; cursor: pointer;">🔐 Войти</button>
        `;
        const loginBtn = document.getElementById('showLoginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', showLoginForm);
        }
    }
}

// Показ сообщения
function showMessage(text, type = 'info') {
    const colors = {
        success: '#d1fae5',
        error: '#fee2e2',
        warning: '#fef3c7',
        info: '#e0f2fe'
    };
    const textColors = {
        success: '#065f46',
        error: '#991b1b',
        warning: '#78350f',
        info: '#075985'
    };
    
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type]};
        color: ${textColors[type]};
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        max-width: 90%;
        width: auto;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-weight: 500;
        text-align: center;
        white-space: pre-line;
    `;
    div.innerHTML = text;
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.remove();
    }, 5000);
}

// Показ логина и пароля
function showCredentials(login, password, profileUrl) {
    const modal = document.createElement('div');
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
        max-width: 400px;
        width: 90%;
    `;
    
    modal.innerHTML = `
        <h3 style="color: #1e293b; margin-bottom: 1rem;">✅ Регистрация успешна!</h3>
        <p style="margin-bottom: 0.5rem;"><strong>Логин:</strong></p>
        <code style="display: block; background: #f1f5f9; padding: 0.5rem; border-radius: 0.5rem; margin-bottom: 1rem; word-break: break-all;">${escapeHtml(login)}</code>
        <p style="margin-bottom: 0.5rem;"><strong>Пароль:</strong></p>
        <code style="display: block; background: #f1f5f9; padding: 0.5rem; border-radius: 0.5rem; margin-bottom: 1rem; word-break: break-all;">${escapeHtml(password)}</code>
        <hr style="margin: 1rem 0;">
        <p style="font-size: 0.85rem; color: #64748b;">Сохраните эти данные! Они понадобятся для редактирования анкеты.</p>
        <button id="closeModalBtn" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer; width: 100%;">Закрыть</button>
    `;
    
    document.body.appendChild(modal);
    
    const overlay = document.createElement('div');
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
    
    const closeAll = () => {
        modal.remove();
        overlay.remove();
    };
    
    document.getElementById('closeModalBtn').addEventListener('click', closeAll);
}

// Показ формы входа
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

// Always first для select
function alwaysFirst(select) {
    if (!select) return;
    const firstOption = select.options[0];
    select.addEventListener('change', () => {
        setTimeout(() => firstOption.selected = true);
    });
}

// Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Обработчик отправки формы
function initFormHandler() {
    const form = document.getElementById('comment');
    if (!form) {
        console.error('Form with id="comment" not found');
        return;
    }
    
    console.log('Form handler initialized');
    
    // Удаляем старые обработчики
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('Form submitted');
        
        const formData = getFormData();
        console.log('Form data:', formData);
        
        const validationErrors = validateForm(formData);
        if (validationErrors.length > 0) {
            showMessage(validationErrors.join('\n'), 'error');
            return;
        }
        
        const isUpdate = currentUser !== null;
        await submitViaAPI(formData, isUpdate);
        
        if (!isUpdate) {
            if (document.getElementById('name')) document.getElementById('name').value = '';
            if (document.getElementById('email')) document.getElementById('email').value = '';
            if (document.getElementById('tel')) document.getElementById('tel').value = '';
            if (document.getElementById('message')) document.getElementById('message').value = '';
            if (document.getElementById('check')) document.getElementById('check').checked = false;
        }
    });
    
    newForm.addEventListener('input', function() {
        if (!currentUser) {
            saveFormDataToLocal();
        }
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing...');
    console.log('API_BASE:', API_BASE);
    
    // Always first для select
    const menu = document.getElementById('menu');
    const menu2 = document.getElementById('menu2');
    
    if (menu) {
        alwaysFirst(menu);
        menu.addEventListener('change', function() {
            const target = document.querySelector(this.value);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
            this.selectedIndex = 0;
        });
    }
    
    if (menu2) {
        alwaysFirst(menu2);
        menu2.addEventListener('change', function() {
            const target = document.querySelector(this.value);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
            this.selectedIndex = 0;
        });
    }
    
    // Инициализация слайдера
    if (typeof $ !== 'undefined' && $('.cover').length) {
        $('.cover').slick({
            slidesToShow: 3,
            slidesToScroll: 3,
            infinite: true,
            dots: true,
            responsive: [{
                breakpoint: 719,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    dots: false
                }
            }]
        });
    }
    
    // Проверка авторизации
    await checkAuth();
    
    // Инициализация обработчика формы
    initFormHandler();
    
    console.log('Initialization complete');
});

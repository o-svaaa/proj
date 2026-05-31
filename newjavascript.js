// API endpoints
const API_BASE = '/8/api';
let currentUser = null;

// Функция для получения CSRF-токена
function getCsrfToken() {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    if (token) return token;
    return document.querySelector('[name="csrf_token"]')?.value || '';
}

// Проверка авторизации
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/check`, {
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        currentUser = data.success ? data.user : null;
        updateUIBasedOnAuth();
        return currentUser;
    } catch (error) {
        console.error('Auth check error:', error);
        return null;
    }
}

// Обновление UI в зависимости от авторизации
function updateUIBasedOnAuth() {
    const authSection = document.getElementById('authSection');
    const userInfo = document.getElementById('userInfo');
    const loginFormDiv = document.getElementById('loginForm');
    const editSection = document.getElementById('editSection');
    
    if (currentUser) {
        if (authSection) authSection.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (loginFormDiv) loginFormDiv.style.display = 'none';
        if (editSection) editSection.style.display = 'block';
        
        // Заполняем форму данными пользователя (если есть)
        fillFormWithUserData(currentUser);
    } else {
        if (authSection) authSection.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        if (loginFormDiv) loginFormDiv.style.display = 'block';
        if (editSection) editSection.style.display = 'none';
        
        // Восстанавливаем данные из localStorage
        loadSavedFormData();
    }
    
    // Обновляем кнопки входа/выхода
    updateAuthButtons();
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

// Сохранение данных в localStorage (fallback для неавторизованных)
function saveFormDataToLocal() {
    const formData = getFormData();
    localStorage.setItem('travelFormData', JSON.stringify(formData));
}

// Загрузка данных из localStorage
function loadSavedFormData() {
    const saved = localStorage.getItem('travelFormData');
    if (saved) {
        const formData = JSON.parse(saved);
        document.getElementById('name').value = formData.name || '';
        document.getElementById('email').value = formData.email || '';
        document.getElementById('tel').value = formData.tel || '';
        document.getElementById('message').value = formData.message || '';
        document.getElementById('check').checked = formData.check || false;
    }
}

// Получение данных формы (адаптировано под туристическую форму)
function getFormData() {
    return {
        fullname: document.getElementById('name')?.value || '',
        email: document.getElementById('email')?.value || '',
        phone: document.getElementById('tel')?.value || '',
        biography: document.getElementById('message')?.value || '',
        contract_agreed: document.getElementById('check')?.checked || false,
        gender: 'unspecified',  // значение по умолчанию
        birthdate: '',
        languages: []  // пустой массив, так как в форме нет выбора языков
    };
}

// Валидация формы на клиенте
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
            credentials: 'same-origin',
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        console.log('Response:', data);
        
        if (data.success) {
            if (data.login && data.password) {
                // Новая регистрация — показываем логин и пароль
                showCredentials(data.login, data.password, data.profile_url);
            } else if (isUpdate) {
                // Обновление данных
                showMessage('✅ Данные успешно обновлены!', 'success');
            } else {
                showMessage('✅ Сообщение отправлено!', 'success');
            }
            localStorage.removeItem('travelFormData');
            
            // Обновляем информацию о пользователе
            await checkAuth();
            return true;
        } else if (data.errors) {
            showValidationErrors(data.errors);
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

// Авторизация через API
async function login(login, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({ login, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            updateUIBasedOnAuth();
            showMessage('Успешный вход!', 'success');
            return true;
        } else {
            showMessage('Неверный логин или пароль', 'error');
            return false;
        }
    } catch (error) {
        showMessage('Ошибка сети: ' + error.message, 'error');
        return false;
    }
}

// Выход из системы
async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'same-origin'
        });
        currentUser = null;
        updateUIBasedOnAuth();
        showMessage('Вы вышли из системы', 'success');
    } catch (error) {
        console.error('Logout error:', error);
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
    `;
    div.innerHTML = text;
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.remove();
    }, 4000);
}

// Показ логина и пароля пользователю
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

// Показ ошибок валидации
function showValidationErrors(errors) {
    let errorHtml = '<strong>Ошибки при заполнении формы:</strong><ul style="margin-top: 0.5rem; margin-left: 1rem;">';
    for (const [field, err] of Object.entries(errors)) {
        errorHtml += `<li><strong>${field}:</strong> ${escapeHtml(err.message)} ${err.allowed_chars || ''}</li>`;
    }
    errorHtml += '</ul>';
    
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #fee2e2;
        color: #991b1b;
        padding: 1rem;
        border-radius: 0.5rem;
        z-index: 1000;
        max-width: 90%;
        width: 500px;
        border-left: 4px solid #dc2626;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    div.innerHTML = errorHtml;
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.remove();
    }, 5000);
}

// Показ формы входа
function showLoginForm() {
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
        max-width: 350px;
        width: 90%;
    `;
    
    modal.innerHTML = `
        <h3 style="color: #1e293b; margin-bottom: 1rem; text-align: center;">🔐 Вход в систему</h3>
        <input type="text" id="loginInput" placeholder="Логин" style="width: 100%; padding: 0.75rem; margin-bottom: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; font-size: 1rem;">
        <input type="password" id="passwordInput" placeholder="Пароль" style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; font-size: 1rem;">
        <button id="loginBtn" style="width: 100%; padding: 0.75rem; background: #946115; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem;">Войти</button>
        <button id="closeLoginBtn" style="width: 100%; margin-top: 0.5rem; padding: 0.75rem; background: #64748b; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">Отмена</button>
        <p style="text-align: center; margin-top: 1rem; font-size: 0.8rem; color: #64748b;">
            Нет аккаунта? <a href="#" id="registerLink" style="color: #3b82f6;">Зарегистрируйтесь</a>
        </p>
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
    
    const closeModal = () => {
        modal.remove();
        overlay.remove();
    };
    
    document.getElementById('closeLoginBtn').addEventListener('click', closeModal);
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const login = document.getElementById('loginInput').value;
        const password = document.getElementById('passwordInput').value;
        await login(login, password);
        closeModal();
    });
    
    document.getElementById('registerLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
        // Прокручиваем к форме
        document.getElementById('comment')?.scrollIntoView({ behavior: 'smooth' });
    });
}

// Обновление кнопок авторизации
function updateAuthButtons() {
    let container = document.getElementById('authButtonsContainer');
    const footer = document.querySelector('footer .contw');
    
    if (!footer) return;
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'authButtonsContainer';
        container.style.marginTop = '1rem';
        container.style.display = 'flex';
        container.style.gap = '1rem';
        container.style.justifyContent = 'center';
        footer.appendChild(container);
    }
    
    if (currentUser) {
        container.innerHTML = `
            <span style="color: #946115; font-weight: bold;">👤 ${escapeHtml(currentUser.login || currentUser.fullname)}</span>
            <button id="logoutBtn" style="background: #64748b; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; color: white; cursor: pointer;">🚪 Выйти</button>
        `;
        document.getElementById('logoutBtn')?.addEventListener('click', logout);
    } else {
        container.innerHTML = `
            <button id="showLoginBtn" style="background: #946115; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; color: white; cursor: pointer;">🔐 Войти</button>
        `;
        document.getElementById('showLoginBtn')?.addEventListener('click', showLoginForm);
    }
}

// Always first для select (сохраняем оригинальную функциональность)
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
    
    // Удаляем старые обработчики
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('Form submitted');
        
        const formData = getFormData();
        console.log('Form data:', formData);
        
        // Валидация
        const validationErrors = validateForm(formData);
        if (validationErrors.length > 0) {
            showMessage(validationErrors.join('\n'), 'error');
            return;
        }
        
        const isUpdate = currentUser !== null;
        await submitViaAPI(formData, isUpdate);
        
        // Очищаем форму только для новой регистрации
        if (!isUpdate) {
            document.getElementById('name').value = '';
            document.getElementById('email').value = '';
            document.getElementById('tel').value = '';
            document.getElementById('message').value = '';
            document.getElementById('check').checked = false;
        }
    });
    
    // Сохранение данных в localStorage при вводе (только для неавторизованных)
    newForm.addEventListener('input', function() {
        if (!currentUser) {
            saveFormDataToLocal();
        }
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing...');
    
    // Always first для select (оригинальная функциональность)
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

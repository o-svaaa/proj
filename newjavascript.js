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
    const editSection = document.getElementById('editSection');
    const authSection = document.getElementById('authSection');
    const userInfo = document.getElementById('userInfo');
    const loginFormDiv = document.getElementById('loginForm');
    const savedDataInfo = document.getElementById('savedDataInfo');
    
    if (currentUser) {
        if (editSection) editSection.style.display = 'block';
        if (authSection) authSection.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (loginFormDiv) loginFormDiv.style.display = 'none';
        if (savedDataInfo) savedDataInfo.style.display = 'none';
        
        // Заполняем форму данными пользователя
        if (currentUser) {
            fillFormWithUserData(currentUser);
        }
    } else {
        if (editSection) editSection.style.display = 'none';
        if (authSection) authSection.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        if (loginFormDiv) loginFormDiv.style.display = 'block';
        
        // Восстанавливаем данные из localStorage
        loadSavedFormData();
    }
}

// Заполнение формы данными пользователя
function fillFormWithUserData(user) {
    const nameField = document.getElementById('name');
    const emailField = document.getElementById('email');
    const telField = document.getElementById('tel');
    
    if (nameField) nameField.value = user.fullname || '';
    if (emailField) emailField.value = user.email || '';
    if (telField) telField.value = user.phone || '';
    
    // Дополнительные поля (если есть в форме)
    if (user.birthdate) {
        const birthField = document.getElementById('birthdate');
        if (birthField) birthField.value = user.birthdate;
    }
    if (user.biography) {
        const bioField = document.getElementById('bio');
        if (bioField) bioField.value = user.biography;
    }
    
    // Отметить галочку согласия
    const checkField = document.getElementById('check');
    if (checkField && user.contract_agreed) {
        checkField.checked = true;
    }
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

// Получение данных формы
function getFormData() {
    // Определяем, какая форма активна (туристическая или анкета разработчика)
    const nameField = document.getElementById('name') || document.getElementById('fullname');
    const emailField = document.getElementById('email');
    const telField = document.getElementById('tel') || document.getElementById('phone');
    const messageField = document.getElementById('message') || document.getElementById('bio');
    const checkField = document.getElementById('check') || document.getElementById('contractCheck');
    
    return {
        fullname: nameField?.value || '',
        email: emailField?.value || '',
        phone: telField?.value || '',
        biography: messageField?.value || '',
        contract_agreed: checkField?.checked || false,
        gender: document.querySelector('input[name="gender"]:checked')?.value || 'unspecified',
        birthdate: document.getElementById('birthdate')?.value || '',
        languages: Array.from(document.querySelectorAll('select[name="fav_langs[]"] option:checked') || [])
            .map(opt => opt.value)
    };
}

// Отправка через REST API
async function submitViaAPI(formData, isUpdate = false) {
    let url = `${API_BASE}/applications`;
    let method = 'POST';
    
    if (isUpdate && currentUser) {
        method = 'PUT';
        url = `${API_BASE}/applications/${currentUser.id}`;
    }
    
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
    
    if (data.success) {
        if (data.login && data.password) {
            // Новая регистрация — показываем логин и пароль
            showCredentials(data.login, data.password, data.profile_url);
        } else {
            // Обновление данных
            alert('Данные успешно обновлены!');
        }
        localStorage.removeItem('travelFormData');
        
        // Обновляем информацию о пользователе
        await checkAuth();
        return true;
    } else if (data.errors) {
        showValidationErrors(data.errors);
        return false;
    } else if (data.error === 'Unauthorized') {
        alert('Необходимо авторизоваться');
        showLoginForm();
        return false;
    } else {
        alert('Ошибка: ' + (data.error || 'Неизвестная ошибка'));
        return false;
    }
}

// Авторизация через API
async function login(login, password) {
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
        alert('Успешный вход!');
        return true;
    } else {
        alert('Неверный логин или пароль');
        return false;
    }
}

// Выход из системы
async function logout() {
    await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'same-origin'
    });
    currentUser = null;
    updateUIBasedOnAuth();
    alert('Вы вышли из системы');
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
        z-index: 1000;
        max-width: 400px;
        width: 90%;
    `;
    
    modal.innerHTML = `
        <h3 style="color: #1e293b; margin-bottom: 1rem;">✅ Регистрация успешна!</h3>
        <p><strong>Логин:</strong> <code style="background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">${login}</code></p>
        <p><strong>Пароль:</strong> <code style="background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">${password}</code></p>
        <p><strong>Ссылка на профиль:</strong> <a href="${profileUrl}" target="_blank">${profileUrl}</a></p>
        <hr style="margin: 1rem 0;">
        <p style="font-size: 0.85rem; color: #64748b;">Сохраните эти данные! Они понадобятся для редактирования анкеты.</p>
        <button id="closeModalBtn" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">Закрыть</button>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        modal.remove();
    });
    
    // Добавляем оверлей
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 999;
    `;
    document.body.appendChild(overlay);
    modal.addEventListener('click', () => {});
    
    const closeAll = () => {
        modal.remove();
        overlay.remove();
    };
    document.getElementById('closeModalBtn').addEventListener('click', closeAll);
}

// Показ ошибок валидации
function showValidationErrors(errors) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
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
    `;
    
    let errorHtml = '<strong>Ошибки при заполнении формы:</strong><ul>';
    for (const [field, err] of Object.entries(errors)) {
        errorHtml += `<li><strong>${field}:</strong> ${err.message} ${err.allowed_chars || ''}</li>`;
    }
    errorHtml += '</ul>';
    errorDiv.innerHTML = errorHtml;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
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
        z-index: 1000;
        max-width: 350px;
        width: 90%;
    `;
    
    modal.innerHTML = `
        <h3 style="color: #1e293b; margin-bottom: 1rem;">🔐 Вход в систему</h3>
        <input type="text" id="loginInput" placeholder="Логин" style="width: 100%; padding: 0.5rem; margin-bottom: 0.5rem; border: 1px solid #cbd5e1; border-radius: 0.5rem;">
        <input type="password" id="passwordInput" placeholder="Пароль" style="width: 100%; padding: 0.5rem; margin-bottom: 1rem; border: 1px solid #cbd5e1; border-radius: 0.5rem;">
        <button id="loginBtn" style="width: 100%; padding: 0.5rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">Войти</button>
        <button id="closeLoginBtn" style="width: 100%; margin-top: 0.5rem; padding: 0.5rem; background: #64748b; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">Отмена</button>
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
        z-index: 999;
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
}

// Always first для select (сохраняем оригинальную функциональность)
function alwaysFirst(select) {
    const firstOption = select.options[0];
    select.addEventListener('change', () => {
        setTimeout(() => firstOption.selected = true);
    });
}

// Обработчик отправки формы (с preventDefault для AJAX)
function initFormHandler() {
    const form = document.getElementById('comment');
    if (!form) return;
    
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const checkbox = document.getElementById('check');
        if (!checkbox.checked) {
            alert('Необходимо согласиться с политикой обработки персональных данных');
            return;
        }
        
        const formData = getFormData();
        
        // Дополнительная валидация email
        if (!formData.email || !formData.email.includes('@')) {
            alert('Введите корректный email');
            return;
        }
        
        // Дополнительная валидация имени
        if (!formData.fullname || formData.fullname.length < 2) {
            alert('Введите корректное имя');
            return;
        }
        
        const isUpdate = currentUser !== null;
        const success = await submitViaAPI(formData, isUpdate);
        
        if (success && !isUpdate) {
            // Очищаем форму только для новой регистрации
            document.getElementById('name').value = '';
            document.getElementById('email').value = '';
            document.getElementById('tel').value = '';
            document.getElementById('message').value = '';
            document.getElementById('check').checked = false;
        }
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
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
    
    // Сохранение данных в localStorage при вводе (только для неавторизованных)
    const form = document.getElementById('comment');
    if (form) {
        form.addEventListener('input', function() {
            if (!currentUser) {
                saveFormDataToLocal();
            }
        });
    }
    
    // Проверка авторизации
    await checkAuth();
    
    // Инициализация обработчика формы
    initFormHandler();
    
    // Добавляем кнопку входа/выхода в интерфейс
    addAuthButtons();
});

// Добавление кнопок авторизации в интерфейс
function addAuthButtons() {
    const footer = document.querySelector('footer .contw');
    if (!footer) return;
    
    // Проверяем, есть ли уже кнопки
    if (document.getElementById('authButtonsContainer')) return;
    
    const container = document.createElement('div');
    container.id = 'authButtonsContainer';
    container.style.marginTop = '1rem';
    container.style.display = 'flex';
    container.style.gap = '1rem';
    container.style.justifyContent = 'center';
    
    const loginBtn = document.createElement('button');
    loginBtn.textContent = '🔐 Войти';
    loginBtn.className = 'DGO button';
    loginBtn.style.width = 'auto';
    loginBtn.style.padding = '0.5rem 1rem';
    loginBtn.onclick = showLoginForm;
    
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = '🚪 Выйти';
    logoutBtn.className = 'DGO button';
    logoutBtn.style.width = 'auto';
    logoutBtn.style.padding = '0.5rem 1rem';
    logoutBtn.style.background = '#64748b';
    logoutBtn.onclick = logout;
    
    const userInfoSpan = document.createElement('span');
    userInfoSpan.id = 'userInfoSpan';
    userInfoSpan.style.display = 'none';
    userInfoSpan.style.color = '#946115';
    userInfoSpan.style.fontWeight = 'bold';
    
    container.appendChild(loginBtn);
    container.appendChild(logoutBtn);
    container.appendChild(userInfoSpan);
    footer.appendChild(container);
    
    // Обновляем отображение кнопок при изменении currentUser
    const updateButtons = () => {
        if (currentUser) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            userInfoSpan.style.display = 'inline-block';
            userInfoSpan.textContent = `👤 ${currentUser.login || currentUser.fullname}`;
        } else {
            loginBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            userInfoSpan.style.display = 'none';
        }
    };
    
    // Переопределяем updateUIBasedOnAuth для обновления кнопок
    const originalUpdate = updateUIBasedOnAuth;
    window.updateUIBasedOnAuth = function() {
        originalUpdate();
        updateButtons();
    };
    updateButtons();
}
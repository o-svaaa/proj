<?php
session_start();
require_once 'backend/Database.php';
require_once 'backend/Validator.php';
require_once 'backend/Auth.php';
require_once 'backend/Application.php';

$db = Database::getInstance();
$pdo = $db->getConnection();
$auth = new Auth($pdo);
$app = new Application($pdo);

$message = '';
$errors = [];
$formData = [];

// Обработка POST запроса (если JS отключён)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $formData = [
        'fullname' => $_POST['fullname'] ?? $_POST['name'] ?? '',
        'email' => $_POST['email'] ?? '',
        'phone' => $_POST['phone'] ?? $_POST['tel'] ?? '',
        'birthdate' => $_POST['birthdate'] ?? '',
        'gender' => $_POST['gender'] ?? 'unspecified',
        'languages' => $_POST['languages'] ?? [],
        'biography' => $_POST['biography'] ?? $_POST['message'] ?? '',
        'contract_agreed' => isset($_POST['contract_agreed']) || isset($_POST['check'])
    ];
    
    if (isset($_SESSION['user_id']) && isset($_POST['update'])) {
        // Режим обновления
        $result = $app->update($_SESSION['application_id'], $formData, $auth);
        if ($result['success']) {
            $message = 'success_update';
        } else if (isset($result['errors'])) {
            $errors = $result['errors'];
        }
    } else {
        // Режим создания
        $result = $app->create($formData, $auth);
        if ($result['success']) {
            $message = 'success_created';
            $_SESSION['temp_login'] = $result['login'];
            $_SESSION['temp_password'] = $result['password'];
        } else if (isset($result['errors'])) {
            $errors = $result['errors'];
        }
    }
}

// Загрузка данных пользователя для редактирования
$userData = $auth->getCurrentUser();
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Анкета разработчика | Без JS</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
    <style>
        .fallback-container {
            max-width: 800px;
            margin: 2rem auto;
            padding: 2rem;
            background: white;
            border-radius: 1rem;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        .fallback-container h2 {
            color: #1e293b;
            margin-bottom: 1.5rem;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        .form-group label {
            display: block;
            font-weight: 600;
            margin-bottom: 0.25rem;
        }
        .form-group input, .form-group select, .form-group textarea {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #cbd5e1;
            border-radius: 0.5rem;
        }
        .error-message {
            color: #dc2626;
            font-size: 0.85rem;
            margin-top: 0.25rem;
        }
        .alert {
            padding: 0.75rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
        }
        .alert-success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
        }
        .button {
            background: #946115;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
        }
        .languages-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.5rem;
        }
        .lang-checkbox {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }
        .lang-checkbox input {
            width: auto;
        }
        .auth-links {
            margin-bottom: 1rem;
            display: flex;
            gap: 1rem;
        }
        .auth-links a {
            color: #3b82f6;
            text-decoration: none;
        }
        .credentials {
            background: #f8fafc;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            border-left: 4px solid #10b981;
        }
    </style>
</head>
<body>
    <div class="fallback-container">
        <h2>📝 Анкета разработчика</h2>
        <div class="alert alert-warning">
            ⚠️ У вас отключён JavaScript. Форма работает в упрощённом режиме без AJAX.
        </div>
        
        <?php if ($message === 'success_created'): ?>
            <div class="alert alert-success">
                ✅ Регистрация успешна!<br>
                <strong>Логин:</strong> <?php echo htmlspecialchars($_SESSION['temp_login']); ?><br>
                <strong>Пароль:</strong> <?php echo htmlspecialchars($_SESSION['temp_password']); ?><br>
                <a href="fallback.php">Заполнить новую анкету</a>
            </div>
            <?php unset($_SESSION['temp_login'], $_SESSION['temp_password']); ?>
        <?php elseif ($message === 'success_update'): ?>
            <div class="alert alert-success">
                ✅ Данные успешно обновлены!
            </div>
        <?php endif; ?>
        
        <?php if ($userData): ?>
            <div class="alert alert-info">
                👤 Вы авторизованы как: <strong><?php echo htmlspecialchars($userData['login']); ?></strong>
                <a href="fallback.php?logout=1" style="margin-left: 1rem;">Выйти</a>
            </div>
        <?php else: ?>
            <div class="auth-links">
                <a href="login.html">🔐 Войти для редактирования</a>
            </div>
        <?php endif; ?>
        
        <form method="POST">
            <?php if ($userData): ?>
                <input type="hidden" name="update" value="1">
            <?php endif; ?>
            
            <div class="form-group">
                <label>ФИО *</label>
                <input type="text" name="fullname" value="<?php echo htmlspecialchars($userData['fullname'] ?? $_POST['fullname'] ?? ''); ?>" required>
                <?php if (isset($errors['fullname'])): ?>
                    <div class="error-message"><?php echo htmlspecialchars($errors['fullname']['message']); ?></div>
                <?php endif; ?>
            </div>
            
            <div class="form-group">
                <label>Email *</label>
                <input type="email" name="email" value="<?php echo htmlspecialchars($userData['email'] ?? $_POST['email'] ?? ''); ?>" required>
                <?php if (isset($errors['email'])): ?>
                    <div class="error-message"><?php echo htmlspecialchars($errors['email']['message']); ?></div>
                <?php endif; ?>
            </div>
            
            <div class="form-group">
                <label>Телефон</label>
                <input type="tel" name="phone" value="<?php echo htmlspecialchars($userData['phone'] ?? $_POST['phone'] ?? ''); ?>">
                <?php if (isset($errors['phone'])): ?>
                    <div class="error-message"><?php echo htmlspecialchars($errors['phone']['message']); ?></div>
                <?php endif; ?>
            </div>
            
            <div class="form-group">
                <label>Дата рождения</label>
                <input type="date" name="birthdate" value="<?php echo htmlspecialchars($userData['birthdate'] ?? $_POST['birthdate'] ?? ''); ?>">
            </div>
            
            <div class="form-group">
                <label>Пол</label>
                <select name="gender">
                    <option value="unspecified" <?php echo (($userData['gender'] ?? $_POST['gender'] ?? '') == 'unspecified') ? 'selected' : ''; ?>>Не указан</option>
                    <option value="male" <?php echo (($userData['gender'] ?? $_POST['gender'] ?? '') == 'male') ? 'selected' : ''; ?>>Мужской</option>
                    <option value="female" <?php echo (($userData['gender'] ?? $_POST['gender'] ?? '') == 'female') ? 'selected' : ''; ?>>Женский</option>
                    <option value="other" <?php echo (($userData['gender'] ?? $_POST['gender'] ?? '') == 'other') ? 'selected' : ''; ?>>Другой</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Языки программирования *</label>
                <div class="languages-list">
                    <?php
                    $languages = ['Pascal', 'C', 'C++', 'JavaScript', 'PHP', 'Python', 'Java', 'Haskell', 'Clojure', 'Prolog', 'Scala', 'Go'];
                    $selected = $_POST['languages'] ?? [];
                    if ($userData && isset($userData['languages'])) {
                        $selected = explode(',', $userData['languages']);
                    }
                    foreach ($languages as $lang):
                    ?>
                        <label class="lang-checkbox">
                            <input type="checkbox" name="languages[]" value="<?php echo $lang; ?>" 
                                <?php echo in_array($lang, $selected) ? 'checked' : ''; ?>>
                            <?php echo $lang; ?>
                        </label>
                    <?php endforeach; ?>
                </div>
                <?php if (isset($errors['languages'])): ?>
                    <div class="error-message"><?php echo htmlspecialchars($errors['languages']['message']); ?></div>
                <?php endif; ?>
            </div>
            
            <div class="form-group">
                <label>Биография</label>
                <textarea name="biography" rows="4"><?php echo htmlspecialchars($userData['biography'] ?? $_POST['biography'] ?? ''); ?></textarea>
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" name="contract_agreed" <?php echo (($userData['contract_agreed'] ?? $_POST['contract_agreed'] ?? false) ? 'checked' : ''); ?>>
                    Я ознакомлен(а) с условиями пользовательского соглашения *
                </label>
                <?php if (isset($errors['contract'])): ?>
                    <div class="error-message"><?php echo htmlspecialchars($errors['contract']['message']); ?></div>
                <?php endif; ?>
            </div>
            
            <button type="submit" class="button">
                <?php echo $userData ? '💾 Обновить данные' : '💾 Сохранить'; ?>
            </button>
        </form>
    </div>
</body>
</html>
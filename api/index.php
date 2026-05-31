<?php
// В самом начале файла api/index.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once dirname(__DIR__) . '/backend/Database.php';
require_once dirname(__DIR__) . '/backend/Validator.php';
require_once dirname(__DIR__) . '/backend/Auth.php';
require_once dirname(__DIR__) . '/backend/Application.php';

// Получаем метод и путь
$method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];

// Извлекаем путь после /proj/api/
if (preg_match('#/proj/api/(.*)#', $request_uri, $matches)) {
    $path = '/' . $matches[1];
} elseif (preg_match('#/api/(.*)#', $request_uri, $matches)) {
    $path = '/' . $matches[1];
} else {
    $path = $_SERVER['PATH_INFO'] ?? '';
}

$path = rtrim($path, '/');
$segments = explode('/', ltrim($path, '/'));

try {
    $db = Database::getInstance();
    $pdo = $db->getConnection();
    $auth = new Auth($pdo);
    $app = new Application($pdo);
    
    // GET /api/auth/check - проверка авторизации
    if ($method === 'GET' && $segments[0] === 'auth' && isset($segments[1]) && $segments[1] === 'check') {
        session_start(); // Важно! Нужно запустить сессию
        $user = $auth->getCurrentUser();
        if ($user) {
            echo json_encode(['success' => true, 'user' => $user]);
        } else {
            echo json_encode(['success' => false]);
        }
        exit;
    }
    
    // POST /api/auth/login - авторизация
    if ($method === 'POST' && $segments[0] === 'auth' && isset($segments[1]) && $segments[1] === 'login') {
        session_start(); // Важно! Нужно запустить сессию
        $input = json_decode(file_get_contents('php://input'), true);
        $login = $input['login'] ?? $_POST['login'] ?? '';
        $password = $input['password'] ?? $_POST['password'] ?? '';
        
        $user = $auth->login($login, $password);
        if ($user) {
            echo json_encode(['success' => true, 'user' => $user]);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
        }
        exit;
    }
    
    // POST /api/auth/logout - выход
    if ($method === 'POST' && $segments[0] === 'auth' && isset($segments[1]) && $segments[1] === 'logout') {
        session_start();
        $auth->logout();
        echo json_encode(['success' => true]);
        exit;
    }
    
    // GET /api/applications/{id} - получить данные анкеты
    if ($method === 'GET' && $segments[0] === 'applications' && isset($segments[1])) {
        $id = (int)$segments[1];
        $data = $app->get($id);
        
        if ($data) {
            echo json_encode(['success' => true, 'data' => $data]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Not found']);
        }
        exit;
    }
    
    // POST /api/applications - создать новую анкету
    if ($method === 'POST' && $segments[0] === 'applications' && !isset($segments[1])) {
        session_start(); // Для автоматической авторизации после регистрации
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }
        
        if (!isset($input['languages']) || !is_array($input['languages'])) {
            $input['languages'] = ['PHP'];
        }
        
        if (empty($input['languages'])) {
            $input['languages'] = ['PHP'];
        }
        
        $result = $app->create($input, $auth);
        echo json_encode($result);
        exit;
    }
    
    // PUT /api/applications/{id} - обновить анкету
    if ($method === 'PUT' && $segments[0] === 'applications' && isset($segments[1])) {
        session_start();
        if (!$auth->isAuthenticated()) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            exit;
        }
        
        $id = (int)$segments[1];
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }
        
        if (!isset($input['languages']) || !is_array($input['languages'])) {
            $input['languages'] = ['PHP'];
        }
        
        $result = $app->update($id, $input, $auth);
        echo json_encode($result);
        exit;
    }
    
    // Если ничего не подошло - 404
    http_response_code(404);
    echo json_encode([
        'success' => false, 
        'error' => 'Endpoint not found',
        'method' => $method,
        'path' => $path
    ]);
    
} catch (Exception $e) {
    error_log('API Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}
?>

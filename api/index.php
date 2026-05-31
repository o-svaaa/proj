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
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../backend/Database.php';
require_once '../backend/Validator.php';
require_once '../backend/Auth.php';
require_once '../backend/Application.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? $_SERVER['REDIRECT_PATH_INFO'] ?? '';
$path = rtrim($path, '/');
$segments = explode('/', ltrim($path, '/'));

try {
    $db = Database::getInstance();
    $pdo = $db->getConnection();
    $auth = new Auth($pdo);
    $app = new Application($pdo);
    
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
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }
        
        $result = $app->create($input, $auth);
        echo json_encode($result);
        exit;
    }
    
    // PUT /api/applications/{id} - обновить анкету (требует авторизации)
    if ($method === 'PUT' && $segments[0] === 'applications' && isset($segments[1])) {
        if (!$auth->isAuthenticated()) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Unauthorized', 'login_url' => '/8/login.html']);
            exit;
        }
        
        $id = (int)$segments[1];
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }
        
        $result = $app->update($id, $input, $auth);
        echo json_encode($result);
        exit;
    }
    
    // POST /api/auth/login - авторизация
    if ($method === 'POST' && $segments[0] === 'auth' && $segments[1] === 'login') {
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
    if ($method === 'POST' && $segments[0] === 'auth' && $segments[1] === 'logout') {
        $auth->logout();
        echo json_encode(['success' => true]);
        exit;
    }
    
    // GET /api/auth/check - проверка авторизации
    if ($method === 'GET' && $segments[0] === 'auth' && $segments[1] === 'check') {
        $user = $auth->getCurrentUser();
        if ($user) {
            echo json_encode(['success' => true, 'user' => $user]);
        } else {
            echo json_encode(['success' => false]);
        }
        exit;
    }
    
    // Не найден
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error']);
}
?>

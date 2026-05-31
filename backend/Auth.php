<?php
class Auth {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function generateLogin($fullname) {
        $cleanName = preg_replace('/[^a-zA-Zа-яА-ЯёЁ]/u', '', $fullname);
        $cleanName = substr($cleanName, 0, 15);
        if (strlen($cleanName) < 3) {
            $cleanName = 'user';
        }
        $randomNum = rand(100, 999);
        return strtolower($cleanName) . $randomNum;
    }
    
    public function generatePassword($length = 10) {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
        return substr(str_shuffle($chars), 0, $length);
    }
    
    public function register($applicationId, $fullname) {
        $login = $this->generateLogin($fullname);
        $password = $this->generatePassword();
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $this->pdo->prepare("
            INSERT INTO users (login, password_hash, application_id)
            VALUES (:login, :password_hash, :application_id)
        ");
        $stmt->execute([
            ':login' => $login,
            ':password_hash' => $passwordHash,
            ':application_id' => $applicationId
        ]);
        
        $userId = $this->pdo->lastInsertId();
        
        $stmt = $this->pdo->prepare("UPDATE applications SET user_id = :user_id WHERE id = :id");
        $stmt->execute([':user_id' => $userId, ':id' => $applicationId]);
        
        // Автоматически авторизуем пользователя
        $_SESSION['user_id'] = $userId;
        $_SESSION['application_id'] = $applicationId;
        $_SESSION['user_login'] = $login;
        
        return ['login' => $login, 'password' => $password];
    }
    
    public function login($login, $password) {
        $stmt = $this->pdo->prepare("
            SELECT u.id, u.login, u.password_hash, u.application_id,
                   a.id as app_id, a.fullname, a.email, a.phone, a.birthdate, a.gender, a.biography, a.contract_agreed
            FROM users u
            JOIN applications a ON u.application_id = a.id
            WHERE u.login = :login
        ");
        $stmt->execute([':login' => $login]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['application_id'] = $user['application_id'];
            $_SESSION['user_login'] = $user['login'];
            
            // Возвращаем данные пользователя
            return [
                'id' => $user['application_id'],
                'fullname' => $user['fullname'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'birthdate' => $user['birthdate'],
                'gender' => $user['gender'],
                'biography' => $user['biography'],
                'contract_agreed' => $user['contract_agreed'],
                'login' => $user['login']
            ];
        }
        return false;
    }
    
    public function isAuthenticated() {
        return isset($_SESSION['user_id']) && isset($_SESSION['application_id']);
    }
    
    public function getCurrentUser() {
        if (!$this->isAuthenticated()) {
            return null;
        }
        
        $stmt = $this->pdo->prepare("
            SELECT a.*, u.login
            FROM applications a
            JOIN users u ON a.id = u.application_id
            WHERE a.id = :id
        ");
        $stmt->execute([':id' => $_SESSION['application_id']]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function logout() {
        session_destroy();
        return true;
    }
}
?>

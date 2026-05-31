<?php
class Application {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function create($data, $auth) {
        // Валидация
        $errors = [];
        
        $validation = Validator::validateFullname($data['fullname'] ?? '');
        if (!$validation['valid']) $errors['fullname'] = $validation;
        
        $validation = Validator::validatePhone($data['phone'] ?? '');
        if (!$validation['valid']) $errors['phone'] = $validation;
        
        $validation = Validator::validateEmail($data['email'] ?? '');
        if (!$validation['valid']) $errors['email'] = $validation;
        
        $validation = Validator::validateBirthdate($data['birthdate'] ?? '');
        if (!$validation['valid']) $errors['birthdate'] = $validation;
        
        $validation = Validator::validateGender($data['gender'] ?? 'unspecified');
        if (!$validation['valid']) $errors['gender'] = $validation;
        
        // Разрешаем пустой массив языков
        $languages = $data['languages'] ?? [];
        if (empty($languages)) {
            $languages = ['PHP']; // Язык по умолчанию
        }
        
        $validation = Validator::validateLanguages($languages, $this->pdo);
        if (!$validation['valid']) $errors['languages'] = $validation;
        
        $validation = Validator::validateBiography($data['biography'] ?? '');
        if (!$validation['valid']) $errors['biography'] = $validation;
        
        $validation = Validator::validateContract($data['contract_agreed'] ?? false);
        if (!$validation['valid']) $errors['contract'] = $validation;
        
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }
        
        try {
            $this->pdo->beginTransaction();
            
            $stmt = $this->pdo->prepare("
                INSERT INTO applications (fullname, phone, email, birthdate, gender, biography, contract_agreed)
                VALUES (:fullname, :phone, :email, :birthdate, :gender, :biography, :contract)
            ");
            
            $stmt->execute([
                ':fullname' => $data['fullname'],
                ':phone' => $data['phone'] ?? null,
                ':email' => $data['email'],
                ':birthdate' => !empty($data['birthdate']) ? $data['birthdate'] : null,
                ':gender' => $data['gender'] ?? 'unspecified',
                ':biography' => $data['biography'] ?? null,
                ':contract' => ($data['contract_agreed'] ?? false) ? 1 : 0
            ]);
            
            $applicationId = $this->pdo->lastInsertId();
            
            // Сохраняем языки
            $stmtLang = $this->pdo->prepare("SELECT id FROM programming_languages WHERE name = ?");
            $stmtInsert = $this->pdo->prepare("INSERT INTO application_languages (application_id, language_id) VALUES (?, ?)");
            
            foreach ($languages as $langName) {
                $stmtLang->execute([$langName]);
                $langId = $stmtLang->fetchColumn();
                if ($langId) {
                    $stmtInsert->execute([$applicationId, $langId]);
                }
            }
            
            // Регистрируем пользователя
            $credentials = $auth->register($applicationId, $data['fullname']);
            
            $this->pdo->commit();
            
            return [
                'success' => true,
                'id' => $applicationId,
                'profile_url' => "/proj/api/applications/{$applicationId}",
                'login' => $credentials['login'],
                'password' => $credentials['password']
            ];
            
        } catch (PDOException $e) {
            $this->pdo->rollBack();
            error_log('Database error in create: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Database error: ' . $e->getMessage()];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log('General error in create: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Error: ' . $e->getMessage()];
        }
    }
    
    public function update($id, $data, $auth) {
        // Проверяем, что пользователь редактирует свою анкету
        $currentUser = $auth->getCurrentUser();
        if (!$currentUser || $currentUser['id'] != $id) {
            return ['success' => false, 'error' => 'Access denied'];
        }
        
        // Валидация
        $errors = [];
        
        $validation = Validator::validateFullname($data['fullname'] ?? '');
        if (!$validation['valid']) $errors['fullname'] = $validation;
        
        $validation = Validator::validatePhone($data['phone'] ?? '');
        if (!$validation['valid']) $errors['phone'] = $validation;
        
        $validation = Validator::validateEmail($data['email'] ?? '');
        if (!$validation['valid']) $errors['email'] = $validation;
        
        $validation = Validator::validateBirthdate($data['birthdate'] ?? '');
        if (!$validation['valid']) $errors['birthdate'] = $validation;
        
        $validation = Validator::validateGender($data['gender'] ?? 'unspecified');
        if (!$validation['valid']) $errors['gender'] = $validation;
        
        $languages = $data['languages'] ?? [];
        if (empty($languages)) {
            $languages = ['PHP'];
        }
        
        $validation = Validator::validateLanguages($languages, $this->pdo);
        if (!$validation['valid']) $errors['languages'] = $validation;
        
        $validation = Validator::validateBiography($data['biography'] ?? '');
        if (!$validation['valid']) $errors['biography'] = $validation;
        
        $validation = Validator::validateContract($data['contract_agreed'] ?? false);
        if (!$validation['valid']) $errors['contract'] = $validation;
        
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }
        
        try {
            $this->pdo->beginTransaction();
            
            $stmt = $this->pdo->prepare("
                UPDATE applications 
                SET fullname = :fullname, phone = :phone, email = :email,
                    birthdate = :birthdate, gender = :gender, biography = :biography,
                    contract_agreed = :contract
                WHERE id = :id
            ");
            
            $stmt->execute([
                ':fullname' => $data['fullname'],
                ':phone' => $data['phone'] ?? null,
                ':email' => $data['email'],
                ':birthdate' => !empty($data['birthdate']) ? $data['birthdate'] : null,
                ':gender' => $data['gender'] ?? 'unspecified',
                ':biography' => $data['biography'] ?? null,
                ':contract' => ($data['contract_agreed'] ?? false) ? 1 : 0,
                ':id' => $id
            ]);
            
            // Обновляем языки
            $stmtDel = $this->pdo->prepare("DELETE FROM application_languages WHERE application_id = ?");
            $stmtDel->execute([$id]);
            
            $stmtLang = $this->pdo->prepare("SELECT id FROM programming_languages WHERE name = ?");
            $stmtInsert = $this->pdo->prepare("INSERT INTO application_languages (application_id, language_id) VALUES (?, ?)");
            
            foreach ($languages as $langName) {
                $stmtLang->execute([$langName]);
                $langId = $stmtLang->fetchColumn();
                if ($langId) {
                    $stmtInsert->execute([$id, $langId]);
                }
            }
            
            $this->pdo->commit();
            
            return ['success' => true, 'id' => $id];
            
        } catch (PDOException $e) {
            $this->pdo->rollBack();
            error_log('Database error in update: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Database error: ' . $e->getMessage()];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log('General error in update: ' . $e->getMessage());
            return ['success' => false, 'error' => 'Error: ' . $e->getMessage()];
        }
    }
    
    public function get($id) {
        $stmt = $this->pdo->prepare("
            SELECT a.*, u.login,
                   GROUP_CONCAT(DISTINCT pl.name) as languages
            FROM applications a
            LEFT JOIN users u ON a.id = u.application_id
            LEFT JOIN application_languages al ON a.id = al.application_id
            LEFT JOIN programming_languages pl ON al.language_id = pl.id
            WHERE a.id = :id
            GROUP BY a.id
        ");
        $stmt->execute([':id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
?>

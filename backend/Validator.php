<?php
class Validator {
    public static function validateFullname($fullname) {
        if (empty($fullname)) {
            return ['valid' => false, 'message' => 'ФИО обязательно для заполнения.', 'allowed_chars' => 'Допустимые символы: буквы русского и английского алфавита, пробелы и дефисы.'];
        }
        if (strlen($fullname) > 150) {
            return ['valid' => false, 'message' => 'ФИО не должно превышать 150 символов.', 'allowed_chars' => 'Максимальная длина: 150 символов.'];
        }
        if (!preg_match('/^[a-zA-Zа-яА-ЯёЁ\s\-]+$/u', $fullname)) {
            return ['valid' => false, 'message' => 'ФИО содержит недопустимые символы.', 'allowed_chars' => 'Допустимые символы: буквы русского и английского алфавита, пробелы и дефисы.'];
        }
        return ['valid' => true];
    }
    
    public static function validatePhone($phone) {
        if (!empty($phone)) {
            if (strlen($phone) > 50) {
                return ['valid' => false, 'message' => 'Телефон не должен превышать 50 символов.', 'allowed_chars' => 'Максимальная длина: 50 символов.'];
            }
            if (!preg_match('/^[\+\d\s\-\(\)]+$/', $phone)) {
                return ['valid' => false, 'message' => 'Некорректный формат телефона.', 'allowed_chars' => 'Допустимые символы: цифры, знак +, пробелы, дефисы и скобки.'];
            }
            if (!preg_match('/\d/', $phone)) {
                return ['valid' => false, 'message' => 'Телефон должен содержать хотя бы одну цифру.', 'allowed_chars' => 'Допустимые символы: цифры, знак +, пробелы, дефисы и скобки.'];
            }
        }
        return ['valid' => true];
    }
    
    public static function validateEmail($email) {
        if (empty($email)) {
            return ['valid' => false, 'message' => 'E-mail обязателен для заполнения.', 'allowed_chars' => 'Допустимый формат: example@domain.com'];
        }
        if (strlen($email) > 100) {
            return ['valid' => false, 'message' => 'E-mail не должен превышать 100 символов.', 'allowed_chars' => 'Максимальная длина: 100 символов.'];
        }
        if (!preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $email)) {
            return ['valid' => false, 'message' => 'Некорректный формат e-mail.', 'allowed_chars' => 'Допустимые символы: латинские буквы, цифры, точка, дефис, подчеркивание, знак @'];
        }
        return ['valid' => true];
    }
    
    public static function validateBirthdate($birthdate) {
        if (!empty($birthdate)) {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthdate)) {
                return ['valid' => false, 'message' => 'Некорректный формат даты.', 'allowed_chars' => 'Допустимый формат: ГГГГ-ММ-ДД'];
            }
            $date = DateTime::createFromFormat('Y-m-d', $birthdate);
            if (!$date || $date->format('Y-m-d') !== $birthdate) {
                return ['valid' => false, 'message' => 'Некорректная дата рождения.', 'allowed_chars' => 'Допустимый формат: ГГГГ-ММ-ДД'];
            }
            if ($date > new DateTime()) {
                return ['valid' => false, 'message' => 'Дата рождения не может быть в будущем.', 'allowed_chars' => 'Допустимый формат: ГГГГ-ММ-ДД'];
            }
        }
        return ['valid' => true];
    }
    
    public static function validateGender($gender) {
        $allowed = ['male', 'female', 'other', 'unspecified'];
        if (!in_array($gender, $allowed)) {
            return ['valid' => false, 'message' => 'Некорректное значение пола.', 'allowed_chars' => 'Допустимые значения: male, female, other, unspecified'];
        }
        return ['valid' => true];
    }
    
    public static function validateLanguages($languages, $pdo) {
        if (empty($languages)) {
            return ['valid' => true];
        }
        if (count($languages) > 12) {
            return ['valid' => false, 'message' => 'Выбрано слишком много языков.', 'allowed_chars' => 'Максимальное количество языков: 12'];
        }
        
        foreach ($languages as $lang) {
            if (!preg_match('/^[a-zA-Z\+\#]+$/', $lang)) {
                return ['valid' => false, 'message' => 'Название языка содержит недопустимые символы.', 'allowed_chars' => 'Допустимые символы: латинские буквы, знаки + и #'];
            }
        }
        
        $placeholders = str_repeat('?,', count($languages) - 1) . '?';
        $stmt = $pdo->prepare("SELECT id FROM programming_languages WHERE name IN ($placeholders)");
        $stmt->execute($languages);
        $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (count($existing) != count($languages)) {
            return ['valid' => false, 'message' => 'Один или несколько выбранных языков не поддерживаются.', 'allowed_chars' => 'Выберите языки из предложенного списка'];
        }
        return ['valid' => true];
    }
    
    public static function validateBiography($bio) {
        if (!empty($bio)) {
            if (strlen($bio) > 10000) {
                return ['valid' => false, 'message' => 'Биография не должна превышать 10000 символов.', 'allowed_chars' => 'Максимальная длина: 10000 символов.'];
            }
            if (!preg_match('/^[a-zA-Zа-яА-ЯёЁ0-9\s\.\,\!\?\-\:\;\"\'\(\)\[\]\{\}\@\#\$\%\^\&\*\+\=\/\\\|<>~`\_]*$/u', $bio)) {
                return ['valid' => false, 'message' => 'Биография содержит недопустимые символы.', 'allowed_chars' => 'Допустимые символы: буквы, цифры, пробелы, знаки препинания и специальные символы'];
            }
        }
        return ['valid' => true];
    }
    
    public static function validateContract($contract) {
        if (!$contract) {
            return ['valid' => false, 'message' => 'Необходимо подтвердить ознакомление с контрактом.', 'allowed_chars' => 'Поставьте галочку для подтверждения'];
        }
        return ['valid' => true];
    }
}
?>

<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$config = [
    'storage_path' => __DIR__ . '/storage/',
    'max_size' => 5 * 1024 * 1024,
    'expire_time' => 7 * 24 * 60 * 60,
    'cleanup_probability' => 0.01,
    'rate_limit_max' => 10,
    'rate_limit_window' => 60,
];

if (!is_dir($config['storage_path'])) {
    mkdir($config['storage_path'], 0755, true);
}

if (!is_dir(__DIR__ . '/logs/')) {
    mkdir(__DIR__ . '/logs/', 0755, true);
}

function logError($message) {
    $logFile = __DIR__ . '/logs/error.log';
    $logEntry = date('Y-m-d H:i:s') . ' - ' . $message . "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}

function getClientIP() {
    $ip = $_SERVER['REMOTE_ADDR'];
    if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } elseif (isset($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    }
    return $ip;
}

function checkRateLimit($ip, $maxRequests, $windowSeconds) {
    $cacheFile = __DIR__ . '/storage/rate_limit_' . md5($ip) . '.txt';
    if (!file_exists($cacheFile)) {
        file_put_contents($cacheFile, json_encode(['count' => 1, 'time' => time()]));
        return true;
    }
    $data = json_decode(file_get_contents($cacheFile), true);
    if (time() - $data['time'] > $windowSeconds) {
        file_put_contents($cacheFile, json_encode(['count' => 1, 'time' => time()]));
        return true;
    }
    if ($data['count'] >= $maxRequests) {
        return false;
    }
    $data['count']++;
    file_put_contents($cacheFile, json_encode($data));
    return true;
}

function validateId($id) {
    return preg_match('/^[a-zA-Z0-9]{6,12}$/', $id);
}

function cleanupExpiredFiles($path, $expireTime) {
    $files = glob($path . '*.json');
    if (!$files) return;

    $now = time() * 1000;

    foreach ($files as $file) {
        if (!is_file($file)) continue;

        $content = file_get_contents($file);
        $data = json_decode($content, true);

        if (!$data || $now > $data['expire']) {
            unlink($file);
        }
    }
}

if (mt_rand(1, 100) <= $config['cleanup_probability'] * 100) {
    cleanupExpiredFiles($config['storage_path'], $config['expire_time']);
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$clientIP = getClientIP();
if (!checkRateLimit($clientIP, $config['rate_limit_max'], $config['rate_limit_window'])) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'message' => '请求过于频繁，请稍后再试'
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || !isset($data['id'], $data['config'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => '无效的请求数据'
        ]);
        exit;
    }

    $id = $data['id'];
    
    if (!validateId($id)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => '无效的ID格式'
        ]);
        exit;
    }

    $filePath = $config['storage_path'] . $id . '.json';
    $jsonData = json_encode($data, JSON_UNESCAPED_UNICODE);

    if (strlen($jsonData) > $config['max_size']) {
        http_response_code(413);
        echo json_encode([
            'success' => false,
            'message' => '数据过大，超出存储限制'
        ]);
        exit;
    }

    $tempFile = $config['storage_path'] . uniqid() . '.tmp';
    if (file_put_contents($tempFile, $jsonData) === false) {
        http_response_code(500);
        logError('Failed to write temp file: ' . $tempFile);
        echo json_encode([
            'success' => false,
            'message' => '保存失败'
        ]);
        exit;
    }
    
    if (!rename($tempFile, $filePath)) {
        unlink($tempFile);
        http_response_code(500);
        logError('Failed to rename temp file: ' . $tempFile . ' to ' . $filePath);
        echo json_encode([
            'success' => false,
            'message' => '保存失败'
        ]);
        exit;
    }

    chmod($filePath, 0644);

    echo json_encode([
        'success' => true,
        'message' => '保存成功',
        'data' => [
            'id' => $id,
            'expire' => $data['expire']
        ]
    ]);
    exit;
}

http_response_code(405);
echo json_encode([
    'success' => false,
    'message' => '不支持的请求方法'
]);
?>
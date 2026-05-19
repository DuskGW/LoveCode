<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$storage_path = __DIR__ . '/storage/';
$max_age = 3600;

function validateId($id) {
    return preg_match('/^[a-zA-Z0-9]{6,12}$/', $id);
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $id = isset($_GET['id']) ? $_GET['id'] : '';

    if (!validateId($id)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => '无效的ID格式'
        ]);
        exit;
    }

    $filePath = $storage_path . $id . '.json';

    if (!file_exists($filePath)) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => '配置不存在'
        ]);
        exit;
    }

    $content = file_get_contents($filePath);
    $data = json_decode($content, true);

    if (!$data) {
        unlink($filePath);
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => '配置文件损坏'
        ]);
        exit;
    }

    $now = time() * 1000;
    if (isset($data['expire']) && $now > $data['expire']) {
        unlink($filePath);
        http_response_code(410);
        echo json_encode([
            'success' => false,
            'message' => '配置已过期'
        ]);
        exit;
    }

    header('Cache-Control: public, max-age=' . $max_age);
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($filePath)) . ' GMT');

    echo json_encode([
        'success' => true,
        'data' => $data
    ]);
    exit;
}

http_response_code(405);
echo json_encode([
    'success' => false,
    'message' => '不支持的请求方法'
]);
?>
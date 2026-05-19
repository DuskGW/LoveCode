<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$storage_path = __DIR__ . '/storage/';

function validateId($id) {
    return preg_match('/^[a-zA-Z0-9]{6,12}$/', $id);
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || !isset($data['id'], $data['action'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => '无效的请求数据'
        ]);
        exit;
    }

    $id = $data['id'];
    $action = $data['action'];

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
    $configData = json_decode($content, true);

    if (!$configData) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => '配置文件损坏'
        ]);
        exit;
    }

    if (!isset($configData['viewCount'])) {
        $configData['viewCount'] = 0;
    }

    if ($action === 'view') {
        $configData['viewCount']++;
    }

    $jsonData = json_encode($configData, JSON_UNESCAPED_UNICODE);
    file_put_contents($filePath, $jsonData);

    echo json_encode([
        'success' => true,
        'data' => [
            'viewCount' => $configData['viewCount']
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
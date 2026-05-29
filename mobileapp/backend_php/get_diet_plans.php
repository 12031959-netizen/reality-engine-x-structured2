<?php
require_once 'config.php';

$headers = getallheaders();
$token = $headers['Authorization'] ?? '';

if (empty($token)) {
    sendResponse(false, null, 'Authorization token required');
}

$userData = json_decode(base64_decode($token), true);
if (!$userData || !isset($userData['email'])) {
    sendResponse(false, null, 'Invalid token format');
}

$email = $userData['email'];

// Get user from email (Check if column is id or userID)
$stmt = $conn->prepare("SELECT userID FROM users WHERE email = ?");
if (!$stmt) {
    // Fallback for older schema if rename hasn't run
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
}

if (!$stmt) {
    sendResponse(false, null, "User fetch prepare failed: " . $conn->error);
}

$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if (!$result || $result->num_rows == 0) {
    sendResponse(false, null, 'User not found');
}

$user = $result->fetch_assoc();
$userId = $user['userID'] ?? $user['id'];

// Get Diet Plans
$stmt = $conn->prepare("SELECT * FROM DietPlan WHERE userID = ? ORDER BY startDate DESC");
if (!$stmt) {
    sendResponse(false, null, "DietPlan fetch prepare failed: " . $conn->error);
}

$stmt->bind_param("s", $userId);
$stmt->execute();
$result = $stmt->get_result();

$plans = [];
while ($row = $result->fetch_assoc()) {
    $plans[] = $row;
}

sendResponse(true, $plans, 'Diet plans retrieved successfully');

$stmt->close();
$conn->close();

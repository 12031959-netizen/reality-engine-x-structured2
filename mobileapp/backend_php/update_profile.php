<?php
require_once 'config.php';

// Get Authorization header
$headers = getallheaders();
$token = $headers['Authorization'] ?? '';

if (empty($token)) {
    sendResponse(false, null, 'Authorization token required');
}

// For Reality Engine X, decode token to get user email
$userData = json_decode(base64_decode($token), true);
if (!$userData || !isset($userData['email'])) {
    sendResponse(false, null, 'Invalid token format');
}

$email = $userData['email'];

// Get POST data
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Get user from email
$stmt = $conn->prepare("SELECT userID FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows == 0) {
    sendResponse(false, null, 'User not found');
}

$user = $result->fetch_assoc();
$userId = $user['userID'];

// Build update query for Reality Engine X users table
$updateFields = [];
$types = '';
$params = [];

if (isset($data['name']) && !empty(trim($data['name']))) {
    $updateFields[] = "name = ?";
    $types .= 's';
    $params[] = $data['name'];
}

if (isset($data['phone'])) {
    $updateFields[] = "phone = ?";
    $types .= 's';
    $params[] = $data['phone'];
}

if (isset($data['username']) && !empty(trim($data['username']))) {
    // Check if new username is already taken by another user
    $usernameCheck = $conn->prepare("SELECT userID FROM users WHERE username = ? AND userID != ?");
    $usernameCheck->bind_param("ss", $data['username'], $userId);
    $usernameCheck->execute();
    $usernameResult = $usernameCheck->get_result();
    
    if ($usernameResult->num_rows > 0) {
        sendResponse(false, null, 'Username is already taken');
    }
    $usernameCheck->close();
    
    $updateFields[] = "username = ?";
    $types .= 's';
    $params[] = $data['username'];
}

if (isset($data['email']) && !empty(trim($data['email']))) {
    // Check if new email is already taken by another user
    $emailCheck = $conn->prepare("SELECT userID FROM users WHERE email = ? AND userID != ?");
    $emailCheck->bind_param("ss", $data['email'], $userId);
    $emailCheck->execute();
    $emailResult = $emailCheck->get_result();
    
    if ($emailResult->num_rows > 0) {
        sendResponse(false, null, 'Email is already taken');
    }
    $emailCheck->close();
    
    $updateFields[] = "email = ?";
    $types .= 's';
    $params[] = $data['email'];
}

if (empty($updateFields)) {
    sendResponse(false, null, 'No fields to update');
}

// Add user_id to params
$params[] = $userId;
$types .= 's';

// Build and execute query
$sql = "UPDATE users SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE userID = ?";
$stmt = $conn->prepare($sql);

// Bind parameters dynamically
$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    // Get updated user data
    $userStmt = $conn->prepare("SELECT userID, name, phone, username, email, role, created_at, updated_at FROM users WHERE userID = ?");
    $userStmt->bind_param("s", $userId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    $updatedUser = $userResult->fetch_assoc();
    
    sendResponse(true, $updatedUser, 'Profile updated successfully');
} else {
    sendResponse(false, null, 'Profile update failed: ' . $conn->error);
}

$stmt->close();
$conn->close();
?>

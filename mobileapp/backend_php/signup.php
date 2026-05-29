<?php
require_once 'config.php';

// Get POST data
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Validate input for Reality Engine X
$requiredFields = ['name', 'username', 'email', 'password'];
if (!validateInput($data, $requiredFields)) {
    sendResponse(false, null, 'Name, username, email, and password are required');
}

$name = $data['name'];
$username = $data['username'];
$email = $data['email'];
$password = $data['password'];

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, null, 'Invalid email format');
}

// Validate password length
if (strlen($password) < PASSWORD_MIN_LENGTH) {
    sendResponse(false, null, 'Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters long');
}

// Validate username format
if (!preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username)) {
    sendResponse(false, null, 'Username must be 3-50 characters and contain only letters, numbers, and underscores');
}

// Check if email already exists
$stmt = $conn->prepare("SELECT userID FROM users WHERE email = ?");
if (!$stmt) {
    sendResponse(false, null, "Email check prepare failed: " . $conn->error);
}
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    sendResponse(false, null, 'Email already exists');
}

// Check if username already exists
$stmt = $conn->prepare("SELECT userID FROM users WHERE username = ?");
if (!$stmt) {
    sendResponse(false, null, "Username check prepare failed: " . $conn->error);
}
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    sendResponse(false, null, 'Username already exists');
}

// Hash password
$hashedPassword = hashPassword($password);

// Generate unique ID for Reality Engine X
$userId = 'user_' . uniqid() . '_' . time();

// Insert new user for Reality Engine X
$stmt = $conn->prepare("INSERT INTO users (userID, name, username, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, 'user', NOW())");
if (!$stmt) {
    sendResponse(false, null, "Insert prepare failed: " . $conn->error);
}
$stmt->bind_param("sssss", $userId, $name, $username, $email, $hashedPassword);

if ($stmt->execute()) {
    // Get user data
    $userStmt = $conn->prepare("SELECT userID, name, username, email, role, created_at FROM users WHERE userID = ?");
    if (!$userStmt) {
        sendResponse(false, null, "User fetch prepare failed: " . $conn->error);
    }
    $userStmt->bind_param("s", $userId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    $user = $userResult->fetch_assoc();
    
    // Generate token
    // Generate a base64 encoded token that contains user info (to match what other scripts expect)
    $token = base64_encode(json_encode([
        'id' => $user['userID'],
        'email' => $user['email'],
        'timestamp' => time()
    ]));
    
    // Add aliases for compatibility
    $user['id'] = $user['userID'];

    sendResponse(true, [
        'user' => $user,
        'token' => $token
    ], 'Registration successful');
} else {
    sendResponse(false, null, 'Registration failed: ' . $conn->error);
}

$stmt->close();
$conn->close();

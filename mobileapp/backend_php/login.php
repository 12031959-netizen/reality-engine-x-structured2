<?php
require_once 'config.php';

// Get POST data
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Validate input. Accept both the new identifier field and the old email field
// so existing app builds keep working while username login is enabled.
if (!isset($data['password']) || empty(trim($data['password'])) || (
    (!isset($data['identifier']) || empty(trim($data['identifier']))) &&
    (!isset($data['email']) || empty(trim($data['email'])))
)) {
    sendResponse(false, null, 'Email/username and password are required');
}

$identifier = trim($data['identifier'] ?? $data['email']);
$normalizedIdentifier = strtolower($identifier);
$password = $data['password'];

// Prepare and execute query for Reality Engine X users table
$stmt = $conn->prepare("SELECT userID, name, fullName, username, email, password, role, created_at FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?");
if (!$stmt) {
    sendResponse(false, null, "Prepare failed: " . $conn->error);
}
$stmt->bind_param("ss", $normalizedIdentifier, $normalizedIdentifier);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    
    if (verifyPassword($password, $user['password'])) {
        unset($user['password']);

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
        ], 'Login successful');
    } else {
        sendResponse(false, null, 'Email/username or password is incorrect');
    }
} else {
    sendResponse(false, null, 'Email/username or password is incorrect');
}

$stmt->close();
$conn->close();

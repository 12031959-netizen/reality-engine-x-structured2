<?php
require_once 'config.php';

// Get Authorization header
$headers = getallheaders();
$token = $headers['Authorization'] ?? '';

if (empty($token)) {
    sendResponse(false, null, 'Authorization token required');
}

// For Reality Engine X, we need to validate the token differently
// Since there's no auth_token column, we'll use a simple approach
// In production, you should implement proper JWT validation or sessions

// For now, we'll get user from email (this is a simplified approach)
// You should enhance this with proper token validation
$userData = json_decode(base64_decode($token), true);
if (!$userData || !isset($userData['email'])) {
    sendResponse(false, null, 'Invalid token format');
}

$email = $userData['email'];

// Get user profile from Reality Engine X database
$stmt = $conn->prepare("SELECT u.userID, u.name, u.phone, u.username, u.email, u.role, u.created_at, u.updated_at FROM users u WHERE u.email = ?");
if (!$stmt) {
    sendResponse(false, null, "User profile prepare failed: " . $conn->error);
}
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result && $result->num_rows > 0) {
    $user = $result->fetch_assoc();
    
    // Get diet profile if exists
    $dietStmt = $conn->prepare("SELECT * FROM diet_profiles WHERE user_id = ?");
    if ($dietStmt) {
        $dietStmt->bind_param("s", $user['userID']);
        $dietStmt->execute();
        $dietResult = $dietStmt->get_result();
        
        if ($dietResult && $dietResult->num_rows > 0) {
            $user['diet_profile'] = $dietResult->fetch_assoc();
        } else {
            $user['diet_profile'] = null;
        }
        $dietStmt->close();
    } else {
        $user['diet_profile'] = null;
    }
    
    // Get user preferences if exists
    $prefStmt = $conn->prepare("SELECT * FROM user_preferences WHERE user_id = ?");
    if ($prefStmt) {
        $prefStmt->bind_param("s", $user['userID']);
        $prefStmt->execute();
        $prefResult = $prefStmt->get_result();
        
        if ($prefResult && $prefResult->num_rows > 0) {
            $user['preferences'] = $prefResult->fetch_assoc();
        } else {
            $user['preferences'] = null;
        }
        $prefStmt->close();
    } else {
        $user['preferences'] = null;
    }
    
    // Add aliases for compatibility
    $user['id'] = $user['userID'];

    sendResponse(true, $user, 'User profile retrieved successfully');
} else {
    sendResponse(false, null, 'User not found');
}

$stmt->close();
$conn->close();


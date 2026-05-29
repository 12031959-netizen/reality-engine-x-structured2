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

$stmt = $conn->prepare("SELECT userID FROM users WHERE email = ?");
if (!$stmt) $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");

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

// Get Prediction Results
$stmt = $conn->prepare("SELECT * FROM PredictionResult WHERE userID = ? ORDER BY date DESC LIMIT 1");
if (!$stmt) {
    sendResponse(false, null, "PredictionResult fetch prepare failed: " . $conn->error);
}

$stmt->bind_param("s", $userId);
$stmt->execute();
$result = $stmt->get_result();

$prediction = $result->fetch_assoc();

if ($prediction) {
    // Get Recommendations for this prediction
    $recStmt = $conn->prepare("SELECT * FROM Recommendations WHERE predictionID = ?");
    $recStmt->bind_param("i", $prediction['predictionID']);
    $recStmt->execute();
    $recResult = $recStmt->get_result();
    
    $recs = [];
    while ($row = $recResult->fetch_assoc()) {
        $recs[] = $row['recommendationText'];
    }
    $prediction['recommendations'] = $recs;
    $recStmt->close();
}

sendResponse(true, $prediction, 'Prediction retrieved successfully');

$stmt->close();
$conn->close();

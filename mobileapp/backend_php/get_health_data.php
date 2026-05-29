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

// Get user from email
$stmt = $conn->prepare("SELECT userID FROM users WHERE email = ?");
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
$userId = $user['userID'];

// Get date range from query parameters (default to last 30 days)
$startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
$endDate = $_GET['end_date'] ?? date('Y-m-d');

// Get wearable data from Reality Engine X
$stmt = $conn->prepare("
    SELECT * FROM wearable_data 
    WHERE userID = ? AND date BETWEEN ? AND ?
    ORDER BY date DESC
");
if (!$stmt) {
    sendResponse(false, null, "Wearable data prepare failed: " . $conn->error);
}
$stmt->bind_param("sss", $userId, $startDate, $endDate);
$stmt->execute();
$result = $stmt->get_result();

$wearableData = [];
while ($row = $result->fetch_assoc()) {
    $wearableData[] = $row;
}

// Also get daily checkins data
$checkinStmt = $conn->prepare("
    SELECT * FROM daily_checkins 
    WHERE user_id = ? AND check_in_date BETWEEN ? AND ?
    ORDER BY check_in_date DESC
");
if (!$checkinStmt) {
    sendResponse(false, null, "Daily checkins prepare failed: " . $conn->error);
}
$checkinStmt->bind_param("sss", $userId, $startDate, $endDate);
$checkinStmt->execute();
$checkinResult = $checkinStmt->get_result();

$checkinData = [];
while ($row = $checkinResult->fetch_assoc()) {
    $checkinData[] = $row;
}

sendResponse(true, [
    'wearable_data' => $wearableData,
    'daily_checkins' => $checkinData
], 'Health data retrieved successfully');

$stmt->close();
$checkinStmt->close();
$conn->close();


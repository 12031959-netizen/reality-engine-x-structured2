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

// Get date range (default to last 30 days)
$startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
$endDate = $_GET['end_date'] ?? date('Y-m-d');

// Get statistics for Reality Engine X
$stats = [];

// Wearable data statistics
$stmt = $conn->prepare("
    SELECT 
        SUM(steps) as total_steps, 
        AVG(steps) as avg_steps, 
        MAX(steps) as max_steps,
        SUM(activityMinutes) as total_active_minutes,
        AVG(activityMinutes) as avg_active_minutes,
        MAX(activityMinutes) as max_active_minutes,
        AVG(heartRate) as avg_heart_rate,
        MAX(heartRate) as max_heart_rate,
        MIN(heartRate) as min_heart_rate,
        AVG(recovery_score) as avg_recovery_score
    FROM wearable_data 
    WHERE userID = ? AND date BETWEEN ? AND ?
");
if (!$stmt) {
    // If table doesn't exist, we'll just set wearable stats to null instead of failing completely
    $wearableStats = null;
} else {
    $stmt->bind_param("sss", $userId, $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $wearableStats = $result ? $result->fetch_assoc() : null;
    $stmt->close();
}
$stats['wearable'] = $wearableStats;

// Daily checkins statistics
$stmt = $conn->prepare("
    SELECT 
        AVG(calories) as avg_calories,
        SUM(calories) as total_calories,
        AVG(protein) as avg_protein,
        SUM(protein) as total_protein,
        AVG(water) as avg_water,
        SUM(water) as total_water,
        AVG(sleep) as avg_sleep,
        MAX(sleep) as max_sleep,
        MIN(sleep) as min_sleep,
        AVG(mood) as avg_mood,
        AVG(stress) as avg_stress,
        AVG(cravings) as avg_cravings
    FROM daily_checkins 
    WHERE user_id = ? AND check_in_date BETWEEN ? AND ?
");
if (!$stmt) {
    $checkinStats = null;
} else {
    $stmt->bind_param("sss", $userId, $startDate, $endDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $checkinStats = $result ? $result->fetch_assoc() : null;
    $stmt->close();
}
$stats['daily_checkins'] = $checkinStats;

// Device usage breakdown
$stmt = $conn->prepare("
    SELECT device, COUNT(*) as usage_count, AVG(steps) as avg_steps, AVG(heartRate) as avg_heart_rate
    FROM wearable_data 
    WHERE userID = ? AND date BETWEEN ? AND ? AND device IS NOT NULL
    GROUP BY device
");
$stmt->bind_param("sss", $userId, $startDate, $endDate);
$stmt->execute();
$result = $stmt->get_result();

$devices = [];
while ($row = $result->fetch_assoc()) {
    $devices[] = $row;
}
$stats['devices'] = $devices;

// Daily trends for the last 7 days
$stmt = $conn->prepare("
    SELECT 
        date,
        steps,
        heartRate,
        activityMinutes,
        recovery_score
    FROM wearable_data 
    WHERE userID = ? AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
    ORDER BY date DESC
");
$stmt->bind_param("s", $userId);
$stmt->execute();
$result = $stmt->get_result();

$dailyWearableStats = [];
while ($row = $result->fetch_assoc()) {
    $dailyWearableStats[] = $row;
}
$stats['daily_wearable_stats'] = $dailyWearableStats;

// Daily checkin trends for the last 7 days
$stmt = $conn->prepare("
    SELECT 
        check_in_date as date,
        calories,
        protein,
        water,
        sleep,
        mood,
        stress
    FROM daily_checkins 
    WHERE user_id = ? AND check_in_date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
    ORDER BY check_in_date DESC
");
$stmt->bind_param("s", $userId);
$stmt->execute();
$result = $stmt->get_result();

$dailyCheckinStats = [];
while ($row = $result->fetch_assoc()) {
    $dailyCheckinStats[] = $row;
}
$stats['daily_checkin_stats'] = $dailyCheckinStats;

// Activity goals progress (if diet profile exists)
$stmt = $conn->prepare("
    SELECT * FROM diet_profiles WHERE user_id = ?
");
$stmt->bind_param("s", $userId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $dietProfile = $result->fetch_assoc();
    $stats['diet_profile'] = $dietProfile;
    
    // Calculate progress towards goals
    if ($dietProfile['target_weight_kg'] && $dietProfile['current_weight_kg']) {
        $weightDiff = $dietProfile['current_weight_kg'] - $dietProfile['target_weight_kg'];
        $stats['weight_progress'] = [
            'current' => $dietProfile['current_weight_kg'],
            'target' => $dietProfile['target_weight_kg'],
            'difference' => $weightDiff,
            'goal' => $weightDiff > 0 ? 'lose' : 'gain'
        ];
    }
}

sendResponse(true, $stats, 'Statistics retrieved successfully');

$conn->close();


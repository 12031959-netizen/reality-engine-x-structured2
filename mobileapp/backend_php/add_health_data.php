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

if ($result->num_rows == 0) {
    sendResponse(false, null, 'User not found');
}

$user = $result->fetch_assoc();
$userId = $user['userID'];

// Get POST data
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Determine data type (wearable_data or daily_checkins)
$dataType = $data['data_type'] ?? 'wearable';

if ($dataType === 'wearable') {
    // Add wearable data
    $requiredFields = ['wearable_date'];
    if (!validateInput($data, $requiredFields)) {
        sendResponse(false, null, 'Wearable date is required');
    }

    // Check if data for this date already exists
    $checkStmt = $conn->prepare("SELECT wearablelD FROM wearable_data WHERE userID = ? AND date = ?");
    if (!$checkStmt) {
        sendResponse(false, null, "Wearable check prepare failed: " . $conn->error);
    }
    $checkStmt->bind_param("ss", $userId, $data['wearable_date']);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();

    if ($checkResult->num_rows > 0) {
        // Update existing record
        $updateStmt = $conn->prepare("
            UPDATE wearable_data SET 
                device = ?, steps = ?, heartRate = ?, activityMinutes = ?, 
                recovery_score = ?, source = ?, apple_health_active = ?, 
                iphone_active = ?, export_active = ?, bluetooth_active = ?,
                sleepDuration = ?, caloriesBurned = ?
            WHERE userID = ? AND date = ?
        ");
        if (!$updateStmt) {
            sendResponse(false, null, "Wearable update prepare failed: " . $conn->error);
        }
        // Prepare variables for binding (must be variables, not expressions/literals)
        $device = $data['device'] ?? null;
        $steps = $data['steps'] ?? null;
        $heart_rate = $data['heart_rate'] ?? null;
        $active_minutes = $data['active_minutes'] ?? null;
        $recovery_score = $data['recovery_score'] ?? null;
        $source = $data['source'] ?? null;
        $apple_active = $data['apple_health_active'] ?? null;
        $iphone_active = $data['iphone_active'] ?? null;
        $export_active = $data['export_active'] ?? null;
        $bluetooth_active = $data['bluetooth_active'] ?? null;
        $wearable_date = $data['wearable_date'];

        $updateStmt->bind_param(
            "siiissssssddss",
            $device,
            $steps,
            $heart_rate,
            $active_minutes,
            $recovery_score,
            $source,
            $apple_active,
            $iphone_active,
            $export_active,
            $bluetooth_active,
            $data['sleepDuration'],
            $data['caloriesBurned'],
            $userId,
            $wearable_date
        );

        if ($updateStmt->execute()) {
            sendResponse(true, ['message' => 'Wearable data updated successfully'], 'Success');
        } else {
            sendResponse(false, null, 'Failed to update wearable data: ' . $conn->error);
        }
        $updateStmt->close();
    } else {
        // Insert new record
        $insertStmt = $conn->prepare("
            INSERT INTO wearable_data (
                userID, date, device, steps, heartRate, activityMinutes,
                recovery_score, source, apple_health_active, iphone_active,
                export_active, bluetooth_active, sleepDuration, caloriesBurned, saved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        if (!$insertStmt) {
            sendResponse(false, null, "Wearable insert prepare failed: " . $conn->error);
        }
        // Prepare variables for binding
        $device = $data['device'] ?? null;
        $steps = $data['steps'] ?? null;
        $heart_rate = $data['heart_rate'] ?? null;
        $active_minutes = $data['active_minutes'] ?? null;
        $recovery_score = $data['recovery_score'] ?? null;
        $source = $data['source'] ?? null;
        $apple_active = $data['apple_health_active'] ?? null;
        $iphone_active = $data['iphone_active'] ?? null;
        $export_active = $data['export_active'] ?? null;
        $bluetooth_active = $data['bluetooth_active'] ?? null;
        $wearable_date = $data['wearable_date'];

        $insertStmt->bind_param(
            "sssiiissssssdd",
            $userId,
            $wearable_date,
            $device,
            $steps,
            $heart_rate,
            $active_minutes,
            $recovery_score,
            $source,
            $apple_active,
            $iphone_active,
            $export_active,
            $bluetooth_active,
            $data['sleepDuration'],
            $data['caloriesBurned']
        );

        if ($insertStmt->execute()) {
            sendResponse(true, ['message' => 'Wearable data added successfully'], 'Success');
        } else {
            sendResponse(false, null, 'Failed to add wearable data: ' . $conn->error);
        }
        $insertStmt->close();
    }
    $checkStmt->close();

} elseif ($dataType === 'checkin') {
    // Add daily checkin data
    $requiredFields = ['check_in_date'];
    if (!validateInput($data, $requiredFields)) {
        sendResponse(false, null, 'Check-in date is required');
    }

    // Check if checkin for this date already exists
    $checkStmt = $conn->prepare("SELECT id FROM daily_checkins WHERE user_id = ? AND check_in_date = ?");
    if (!$checkStmt) {
        sendResponse(false, null, "Checkin check prepare failed: " . $conn->error);
    }
    $checkStmt->bind_param("ss", $userId, $data['check_in_date']);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();

    if ($checkResult->num_rows > 0) {
        // Update existing record
        $updateStmt = $conn->prepare("
            UPDATE daily_checkins SET 
                calories = ?, protein = ?, water = ?, sleep = ?, mood = ?,
                stress = ?, cravings = ?, notes = ?
            WHERE user_id = ? AND check_in_date = ?
        ");
        if (!$updateStmt) {
            sendResponse(false, null, "Checkin update prepare failed: " . $conn->error);
        }
        // Prepare variables for binding
        $calories = $data['calories'] ?? null;
        $protein = $data['protein'] ?? null;
        $water = $data['water'] ?? null;
        $sleep = $data['sleep'] ?? null;
        $mood = $data['mood'] ?? null;
        $stress = $data['stress'] ?? null;
        $cravings = $data['cravings'] ?? null;
        $notes = $data['notes'] ?? null;
        $check_in_date = $data['check_in_date'];

        $updateStmt->bind_param(
            "ddddiiisss",
            $calories,
            $protein,
            $water,
            $sleep,
            $mood,
            $stress,
            $cravings,
            $notes,
            $userId,
            $check_in_date
        );

        if ($updateStmt->execute()) {
            // Also sync to MoodLog table
            if ($mood !== null || $stress !== null || $cravings !== null || $sleep !== null) {
                $moodCheck = $conn->prepare("SELECT moodLogiD FROM MoodLog WHERE userID = ? AND date = ?");
                if ($moodCheck) {
                    $moodCheck->bind_param("ss", $userId, $check_in_date);
                    $moodCheck->execute();
                    $moodCheckResult = $moodCheck->get_result();

                    if ($moodCheckResult->num_rows > 0) {
                        $moodUpdate = $conn->prepare("
                            UPDATE MoodLog SET 
                                moodLevel = ?, stressLevel = ?, cravingLevel = ?, sleepHours = ?
                            WHERE userID = ? AND date = ?
                        ");
                        if ($moodUpdate) {
                            $moodUpdate->bind_param("iiidss", $mood, $stress, $cravings, $sleep, $userId, $check_in_date);
                            $moodUpdate->execute();
                            $moodUpdate->close();
                        }
                    } else {
                        $moodInsert = $conn->prepare("
                            INSERT INTO MoodLog (
                                userID, date, moodLevel, stressLevel, cravingLevel, sleepHours, motivationLevel, consistencyStatus
                            ) VALUES (?, ?, ?, ?, ?, ?, 5, 'tracked')
                        ");
                        if ($moodInsert) {
                            $moodInsert->bind_param("ssiiid", $userId, $check_in_date, $mood, $stress, $cravings, $sleep);
                            $moodInsert->execute();
                            $moodInsert->close();
                        }
                    }
                    $moodCheck->close();
                }
            }
            sendResponse(true, ['message' => 'Daily checkin updated successfully'], 'Success');
        } else {
            sendResponse(false, null, 'Failed to update daily checkin: ' . $conn->error);
        }
        $updateStmt->close();
    } else {
        // Insert new record
        $insertStmt = $conn->prepare("
            INSERT INTO daily_checkins (
                user_id, check_in_date, calories, protein, water, sleep,
                mood, stress, cravings, notes, saved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        if (!$insertStmt) {
            sendResponse(false, null, "Checkin insert prepare failed: " . $conn->error);
        }
        // Prepare variables for binding
        $calories = $data['calories'] ?? null;
        $protein = $data['protein'] ?? null;
        $water = $data['water'] ?? null;
        $sleep = $data['sleep'] ?? null;
        $mood = $data['mood'] ?? null;
        $stress = $data['stress'] ?? null;
        $cravings = $data['cravings'] ?? null;
        $notes = $data['notes'] ?? null;
        $check_in_date = $data['check_in_date'];

        $insertStmt->bind_param(
            "ssddddiiis",
            $userId,
            $check_in_date,
            $calories,
            $protein,
            $water,
            $sleep,
            $mood,
            $stress,
            $cravings,
            $notes
        );

        if ($insertStmt->execute()) {
            // Also sync to MoodLog table
            if ($mood !== null || $stress !== null || $cravings !== null || $sleep !== null) {
                $moodCheck = $conn->prepare("SELECT moodLogiD FROM MoodLog WHERE userID = ? AND date = ?");
                if ($moodCheck) {
                    $moodCheck->bind_param("ss", $userId, $check_in_date);
                    $moodCheck->execute();
                    $moodCheckResult = $moodCheck->get_result();

                    if ($moodCheckResult->num_rows > 0) {
                        $moodUpdate = $conn->prepare("
                            UPDATE MoodLog SET 
                                moodLevel = ?, stressLevel = ?, cravingLevel = ?, sleepHours = ?
                            WHERE userID = ? AND date = ?
                        ");
                        if ($moodUpdate) {
                            $moodUpdate->bind_param("iiidss", $mood, $stress, $cravings, $sleep, $userId, $check_in_date);
                            $moodUpdate->execute();
                            $moodUpdate->close();
                        }
                    } else {
                        $moodInsert = $conn->prepare("
                            INSERT INTO MoodLog (
                                userID, date, moodLevel, stressLevel, cravingLevel, sleepHours, motivationLevel, consistencyStatus
                            ) VALUES (?, ?, ?, ?, ?, ?, 5, 'tracked')
                        ");
                        if ($moodInsert) {
                            $moodInsert->bind_param("ssiiid", $userId, $check_in_date, $mood, $stress, $cravings, $sleep);
                            $moodInsert->execute();
                            $moodInsert->close();
                        }
                    }
                    $moodCheck->close();
                }
            }
            sendResponse(true, ['message' => 'Daily checkin added successfully'], 'Success');
        } else {
            sendResponse(false, null, 'Failed to add daily checkin: ' . $conn->error);
        }
        $insertStmt->close();
    }
    $checkStmt->close();

} else {
    sendResponse(false, null, 'Invalid data type. Must be "wearable" or "checkin"');
}

$stmt->close();
$conn->close();


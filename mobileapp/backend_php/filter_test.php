<?php
require_once 'config.php';

$uid = 'user-001'; // Mahmoud

// Clear existing data for a clean test
$conn->query("DELETE FROM wearable_data WHERE userID='$uid'");
$conn->query("DELETE FROM daily_checkins WHERE user_id='$uid'");

$today = date('Y-m-d');
$tenDays = date('Y-m-d', strtotime('-10 days'));
$fortyFiveDays = date('Y-m-d', strtotime('-45 days'));

// 1. Record for TODAY (Inside 7, 30, and 90 days)
$conn->query("INSERT INTO wearable_data (userID, date, steps, heartRate, activityMinutes, device, source, saved_at) 
              VALUES ('$uid', '$today', 5000, 70, 30, 'Phone', 'app', NOW())");
$conn->query("INSERT INTO daily_checkins (user_id, check_in_date, calories, sleep, mood, saved_at) 
              VALUES ('$uid', '$today', 2000, 8, 8, NOW())");

// 2. Record for 10 DAYS AGO (Inside 30 and 90 days, but NOT 7 days)
$conn->query("INSERT INTO wearable_data (userID, date, steps, heartRate, activityMinutes, device, source, saved_at) 
              VALUES ('$uid', '$tenDays', 7000, 75, 45, 'Phone', 'app', NOW())");
$conn->query("INSERT INTO daily_checkins (user_id, check_in_date, calories, sleep, mood, saved_at) 
              VALUES ('$uid', '$tenDays', 2500, 6, 7, NOW())");

// 3. Record for 45 DAYS AGO (Inside 90 days only)
$conn->query("INSERT INTO wearable_data (userID, date, steps, heartRate, activityMinutes, device, source, saved_at) 
              VALUES ('$uid', '$fortyFiveDays', 10000, 80, 60, 'Phone', 'app', NOW())");
$conn->query("INSERT INTO daily_checkins (user_id, check_in_date, calories, sleep, mood, saved_at) 
              VALUES ('$uid', '$fortyFiveDays', 3000, 7, 9, NOW())");

echo "✅ Filter test data added for Mahmoud ($uid).\n";
echo "Total Records Added: 3 for wearable, 3 for checkins.\n";
echo "Today ($today): 5000 steps\n";
echo "10 Days Ago ($tenDays): 7000 steps\n";
echo "45 Days Ago ($fortyFiveDays): 10000 steps\n";

$conn->close();
?>

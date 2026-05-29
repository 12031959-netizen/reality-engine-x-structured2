<?php
require_once 'config.php';

$userId = 'user-001'; // Mahmoud
$res = $conn->query("SELECT date, COUNT(*) as cnt FROM wearable_data WHERE userID='$userId' GROUP BY date ORDER BY date DESC");

echo "<h2>Data distribution for Mahmoud ($userId)</h2>";
echo "<table border='1'>";
echo "<tr><th>Date</th><th>Count</th></tr>";
while ($row = $res->fetch_assoc()) {
    echo "<tr><td>{$row['date']}</td><td>{$row['cnt']}</td></tr>";
}
echo "</table>";

$res = $conn->query("SELECT MIN(date) as earliest, MAX(date) as latest, COUNT(*) as total FROM wearable_data WHERE userID='$userId'");
$summary = $res->fetch_assoc();
echo "<h3>Summary:</h3>";
echo "Earliest: {$summary['earliest']}<br>";
echo "Latest: {$summary['latest']}<br>";
echo "Total Records: {$summary['total']}<br>";

$conn->close();
?>

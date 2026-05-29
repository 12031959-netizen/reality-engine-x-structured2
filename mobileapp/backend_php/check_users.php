<?php
require_once 'config.php';
$res = $conn->query("SELECT userID, fullName, phone FROM users LIMIT 10");
if (!$res) {
    sendResponse(false, null, "Query failed: " . $conn->error);
}
$rows = [];
while($row = $res->fetch_assoc()) {
    $rows[] = $row;
}
sendResponse(true, $rows, "Users retrieved successfully");
?>

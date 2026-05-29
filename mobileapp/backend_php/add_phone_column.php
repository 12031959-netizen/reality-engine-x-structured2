<?php
require_once 'config.php';
$sql = "ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL AFTER name";
if ($conn->query($sql) === TRUE) {
    sendResponse(true, null, "Column phone added successfully");
} else {
    sendResponse(false, null, "Error adding column: " . $conn->error);
}
$conn->close();
?>

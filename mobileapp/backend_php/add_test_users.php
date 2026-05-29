<?php
require_once 'config.php';

// Test users for Reality Engine X
$testUsers = [
    [
        'userID' => 'test_user_1',
        'fullName' => 'John Doe',
        'username' => 'johndoe',
        'email' => 'john@test.com',
        'password' => password_hash('password123', PASSWORD_DEFAULT),
        'role' => 'user'
    ],
    [
        'userID' => 'test_user_2', 
        'fullName' => 'Jane Smith',
        'username' => 'janesmith',
        'email' => 'jane@test.com',
        'password' => password_hash('password123', PASSWORD_DEFAULT),
        'role' => 'user'
    ]
];

echo "<h2>Adding Test Users to Reality Engine X Database</h2>";

foreach ($testUsers as $user) {
    // Check if user already exists
    $checkStmt = $conn->prepare("SELECT userID FROM users WHERE email = ?");
    $checkStmt->bind_param("s", $user['email']);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows == 0) {
        // Insert user
        $stmt = $conn->prepare("INSERT INTO users (userID, fullName, username, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
        $stmt->bind_param("ssssss", $user['userID'], $user['fullName'], $user['username'], $user['email'], $user['password'], $user['role']);
        
        if ($stmt->execute()) {
            echo "<p style='color: green;'>✅ Created user: {$user['fullName']} ({$user['email']})</p>";
        } else {
            echo "<p style='color: red;'>❌ Failed to create user: {$user['email']}</p>";
        }
        $stmt->close();
    } else {
        echo "<p style='color: orange;'>⚠️ User already exists: {$user['email']}</p>";
    }
    $checkStmt->close();
}

echo "<h3>Test Login Credentials:</h3>";
echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Name</th><th>Email</th><th>Password</th></tr>";
foreach ($testUsers as $user) {
    echo "<tr>";
    echo "<td>{$user['fullName']}</td>";
    echo "<td>{$user['email']}</td>";
    echo "<td>password123</td>";
    echo "</tr>";
}
echo "</table>";

echo "<p><strong>You can now login with these credentials to see the bottom navigation bar!</strong></p>";

$conn->close();
?>

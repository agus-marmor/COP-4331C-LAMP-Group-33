<?php
header("Content-Type: application/json");

$conn = new mysqli("localhost", "ContactsAppUser", "COP4331C!", "lamp_db");

if ($conn->connect_error){
    http_response_code(500);
    echo json_encode(["error" => "Connection failed"]);
    exit();
}

$adminID = isset($_SERVER['HTTP_X_USER_ID']) ? intval($_SERVER['HTTP_X_USER_ID']) : 0;

$stmt = $conn->prepare("SELECT role, isDisabled FROM Users WHERE ID = ?");
$stmt->bind_param("i", $adminID);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$user || $user['role'] !== 'admin' || intval($user['isDisabled']) === 1){
    http_response_code(403);
    echo json_encode(["error" => "Admin access required"]);
    exit();
}

$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true) ?? [];

switch($action){

    case 'users':
        $search = trim($_GET['q'] ?? '');

        if (empty($search)){
            $stmt = $conn->prepare("SELECT ID , FirstName, LastName, Login, role, isDisabled FROM Users ORDER BY ID ASC");
        } else {
            $param = '%' . $search . '%';
            $stmt = $conn->prepare("SELECT ID, FirstName, LastName, Login, role, isDisabled FROM Users WHERE FirstName LIKE ? OR LastName LIKE ? OR CONCAT(FirstName,' ', LastName) LIKE ? OR Login LIKE ? ORDER BY ID ASC");
            $stmt->bind_param("ssss", $param, $param, $param, $param);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        $users = [];

        while ($row = $result->fetch_assoc()){
            $users[] = [
                "id" => intval($row["ID"]),
                "firstName" => $row["FirstName"],
                "lastName"  => $row["LastName"],
                "login" => $row["Login"],
                "role"  =>  $row["role"],
                "disabled"  =>  intval($row["isDisabled"])
            ];
        }

        echo json_encode(["users" => $users]);
        $stmt->close();
        break;

    case 'contacts':

        $targetUserId = intval($_GET['userId'] ?? 0);
        $search = trim($_GET['q'] ?? '');

        if($targetUserId <= 0){
            http_response_code(400);
            echo json_encode(["error" => "Missing or invalid userid"]);
            break;
        }

        if(empty($search)){
            $stmt = $conn->prepare("SELECT FirstName, LastName, Phone, Email FROM Contacts WHERE UserID = ? ");
            $stmt->bind_param("i", $targetUserId);
        } else {
            $param = '%' . $search . '%';
            $stmt = $conn->prepare("SELECT FirstName, LastName, Phone, Email FROM Contacts WHERE UserID = ? AND (FirstName LIKE ? OR LastName LIKE ? OR CONCAT(FirstName, ' ', LastName) LIKE ? OR Email LIKE ? OR Phone LIKE ?)");
            $stmt->bind_param("isssss", $targetUserId, $param, $param, $param, $param, $param);
        }

        $stmt->execute();
        $result = $stmt->get_result();
        $contacts = [];

        while($row = $result->fetch_assoc()){
            $contacts[] = [
                "firstName" =>  $row["FirstName"],
                "lastName"  =>  $row["LastName"],
                "phone" =>  $row["Phone"],
                "email" =>  $row["Email"]
            ];
        }

        echo json_encode(["contacts" => $contacts]);
        $stmt->close();
        break;

    case 'disable':
        $targetId = intval($data['userId'] ?? 0);
        $isDisabled = !empty($data['disabled']) ? 1 : 0;

        if ($targetId <= 0){
            http_response_code(400);
            echo json_encode(["error" => "Invalid target user ID"]);
            break;
        }

        if ($targetId == $adminID){
            http_response_code(400);
            echo json_encode(["error" => "You cannot disable your own account"]);
            break;
        }

        $stmt = $conn->prepare("UPDATE Users SET isDisabled = ? WHERE ID = ? ");
        $stmt->bind_param("ii", $isDisabled, $targetId);

        if ($stmt->execute()){
            echo json_encode(["error" => ""]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update user status"]);
        }

        $stmt->close();
        break;

case 'password':

        $targetId = intval($data['userId'] ?? 0);
        $newPassword = trim($data['password'] ?? '');

        if ($targetId <= 0 || strlen($newPassword) < 8) {
            http_response_code(400);
            echo json_encode(["error" => "UserID invalid or Password needs to be at least 8 characters"]);
            break;
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE Users SET Password = ? WHERE ID = ?");
        $stmt->bind_param("si", $hashedPassword, $targetId);

        if ($stmt->execute()) {
            echo json_encode(["error" => ""]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update password"]);
        }

        $stmt->close();
        break;

case 'create':

        $firstName = trim($data['firstName'] ?? '');
        $lastName  = trim($data['lastName'] ?? '');
        $login     = trim($data['login'] ?? '');
        $password  = trim($data['password'] ?? '');

        if (empty($firstName) || empty($lastName) || empty($login) || strlen($password) < 8) {
            http_response_code(400);
            echo json_encode(["error" => "Missing fields or password less than 8 characters"]);
            break;
        }

        $check = $conn->prepare("SELECT ID FROM Users WHERE Login = ?");
        $check->bind_param("s", $login);
        $check->execute();
        if ($check->get_result()->num_rows > 0) {
            http_response_code(409);
            echo json_encode(["error" => "Username already exists"]);
            $check->close();
            break;
        }
        $check->close();

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $role = 'admin';
        $disabled = 0;

        $stmt = $conn->prepare("INSERT INTO Users (FirstName, LastName, Login, Password, role, isDisabled) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssi", $firstName, $lastName, $login, $hash, $role, $disabled);

        if ($stmt->execute()) {
            http_response_code(201);
            echo json_encode(["id" => $conn->insert_id, "error" => ""]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to create admin"]);
        }

        $stmt->close();
        break;

    default:
    http_response_code(400);
    echo json_encode(["error" => "Action not allowed"]);
    break;
}
$conn->close();
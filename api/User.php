<?php
header('Content-Type: application/json');

$conn = new mysqli("localhost", "ContactsAppUser", "COP4331C!", "lamp_db");

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Connection failed"]);
    exit();
}

$userID = isset($_SERVER['HTTP_X_USER_ID']) ? intval($_SERVER['HTTP_X_USER_ID']) : 0;

if ($userID <= 0){
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit();
}

$method =  $_SERVER['REQUEST_METHOD'];

switch($method){

    case "GET":
        $stmt = $conn->prepare("SELECT ID, FirstName, LastName, Login, role, isDisabled FROM Users WHERE ID = ?");
        $stmt->bind_param("i", $userID);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if($user){
            http_response_code(200);
            echo json_encode([
                "id" => $user["ID"],
                "firstName" => $user["FirstName"],
                "lastName" => $user["LastName"],
                "login" => $user["Login"],
                "role" => $user["role"],
                "error" => ""
            ]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "User not found"]);
        }
        break;
    case "PUT":
        $inData = json_decode(file_get_contents('php://input'), true);

        $currentPassword = $inData["currentPassword"] ?? "";
        $newPassword = $inData["newPassword"] ?? "";

        if (empty($currentPassword) || empty($newPassword)){
            http_response_code(400);
            echo json_encode(["error" => "Current password and new password are required"]);
            exit();
        }

        $stmt = $conn->prepare("SELECT Password FROM Users WHERE ID = ?");
        $stmt->bind_param("i", $userID);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$row || !password_verify($currentPassword, $row["Password"])){
            http_response_code(400);
            echo json_encode(["error" => "Incorrect current password"]);
            exit();
        }

        $hashedP = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmtUpdate = $conn->prepare("UPDATE Users SET Password = ? WHERE ID = ?");
        $stmtUpdate->bind_param("si", $hashedP, $userID);

        if($stmtUpdate->execute()){
            http_response_code(200);
            echo json_encode(["error" => ""]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update password"]);
        }

        $stmtUpdate->close();
        break;

        default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
        break;

}
    $conn->close();
<?php
header('Content-Type: application/json');

// get raw input
$rawInputL = file_get_contents('php://input');
$inDataL = json_decode($rawInputL, true);


// error check
if(!isset($inDataL["login"], $inDataL["password"])){
    http_response_code(400);
    echo json_encode(["error" => "Missing required fields"]);
    exit();
}

//connecting to droplet local mysql
$conn = new mysqli("localhost", "ContactsAppUser", "COP4331C!", "lamp_db");

// error check

if($conn->connect_error){
    http_response_code(500);
    echo json_encode(["error" => "Connection failed"]);
    exit();
}

//sql query
$stmt = $conn->prepare("SELECT ID, FirstName, LastName, Password, role, isDisabled FROM Users WHERE Login = ?");
$stmt->bind_param("s", $inDataL["login"]);
$stmt->execute();

//grab results and rows from SELECT query
$result = $stmt->get_result();
$row = $result->fetch_assoc();

// error check then send data to client
if($row && password_verify($inDataL["password"], $row["Password"])){
    if ($row["isDisabled"] == 1){
        http_response_code(200);
        echo json_encode([
            "id" => 0,
            "firstName" => "",
            "lastName" => "",
            "role" => "",
            "error" => "Account is disabled, contact an administrator."
    ]);
    } else {
        http_response_code(200);
        echo json_encode([
            "id" => $row["ID"],
            "firstName" => $row["FirstName"],
            "lastName" => $row["LastName"],
            "role"     => $row["role"],
         "error" => ""
    ]);
    }
} else{
    http_response_code(200);
    echo json_encode([
        "id" => 0,
        "firstName" => "",
        "lastName" => "",
        "error" => "Invalid username or password"
    ]);
}

$stmt->close();
$conn->close();
<?php
header('Content-Type: application/json');


//grabbing raw request data, placed in string variab rawinput
$rawInput = file_get_contents('php://input');
$inData = json_decode($rawInput, true);

// checking for any empty fields

if (!isset($inData["firstName"], $inData["lastName"], $inData["login"], $inData["password"])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required fields"]);
    exit();
}


//connect to mysql
$connection = new mysqli("localhost", "ContactsAppUser", "COP4331C!", "lamp_db");

//error check 

if($connection->connect_error){
    http_response_code(500);
    echo json_encode(["error" => "Connection failed"]);
    exit();
}

// not sure if necessary, wanted more security
$hashedPassword = password_hash($inData["password"], PASSWORD_DEFAULT);

//prepare sql template
$stmt = $connection->prepare("INSERT INTO Users (FirstName, LastName, Login, Password) VALUES  (?, ?, ?, ?)");

$stmt->bind_param("ssss", $inData["firstName"], $inData["lastName"], $inData["login"], $hashedPassword);

//status codes (modern php was giving me 500 exception instead of 409 so I had to use try catch)

try {
    $stmt->execute();
    http_response_code(201);
    echo json_encode(["error" => ""]);
} catch (mysqli_sql_exception $e) {
    if ($e->getCode() === 1062) {
        http_response_code(409);
        echo json_encode(["error" => "Registration failed"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}

$stmt->close();
$connection->close();
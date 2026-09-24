<?php
header('Content-Type: application/json');

$conn = new mysqli("localhost", "ContactsAppUser", "COP4331C!", "lamp_db");

if($conn->connect_error){
    http_response_code(500);
    echo json_encode(["error" => "Connection failed"]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

$userId = 0;

if (isset($_SERVER['HTTP_X_USER_ID'])){
    $userId = intval($_SERVER['HTTP_X_USER_ID']);
}

if($userId <= 0){
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit();
}

switch($method){

    case "GET":
        
        $search = isset($_GET['q']) ? trim($_GET['q']) : "";

        if (empty($search)){
            $stml = $conn->prepare("SELECT ID, FirstName, LastName, Phone, Email FROM Contacts WHERE UserID = ?");
            $stml->bind_param("i", $userId);
        } else {
            $param = "%" . $search . "%";
            $stml = $conn->prepare("SELECT ID, FirstName, LastName, Phone, Email FROM Contacts WHERE UserID = ? AND (FirstName LIKE ? OR LastName LIKE ?)");
            $stml->bind_param("iss", $userId, $param, $param);
        }

        $stml->execute();
        $result = $stml->get_result();
        $contacts = [];

        while ($row = $result->fetch_assoc()){
            $contacts[] = [
                "id"        => $row["ID"],
                "firstName" => $row["FirstName"],
                "lastName"  => $row["LastName"],
                "phone"     => $row["Phone"],
                "email"     => $row["Email"]
            ];
        }

        echo json_encode([
                "contacts" => $contacts,
                "error"    => count($contacts) === 0 ? "No Records Found" : ""
            ]);
        $stml->close();
        break;

    case "POST":

        $rawInput = file_get_contents('php://input');
        $inData = json_decode($rawInput, true);

        //front end says phone is optional so had to make them variables to use empty rather than isset

        $firstName = $inData["firstName"] ?? "";
        $lastName = $inData["lastName"] ?? "";
        $email = $inData["email"] ?? "";
        $phone = $inData["phone"] ?? "";

        if (empty($firstName) || empty($lastName) || empty($email)) {
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields"]);
            exit();
        }
        $stms = $conn->prepare("INSERT INTO Contacts (FirstName, LastName, Phone, Email, UserID) VALUES (?, ?, ?, ?, ?)"); 
        $stms->bind_param("ssssi", $firstName, $lastName, $phone, $email, $userId);

        if($stms->execute()){
            http_response_code(201);
            echo json_encode(["id" => $conn->insert_id, "error" => ""]);
        }
        else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to add contacts"]);
        }
        $stms->close();
        break;

    case "DELETE": //front end sends a query parameter in url /api/index.php?id=123
        $contactId = isset($_GET['id']) ? intval($_GET['id']) : 0;

        if($contactId <= 0){
            http_response_code(400);
            echo json_encode(["error" => "Missing or invalid Contact ID"]);
            exit();
        }

        $stmt = $conn->prepare("DELETE FROM Contacts WHERE ID = ? AND UserID = ?");
        $stmt->bind_param("ii", $contactId, $userId);

        if ($stmt->execute()){
            http_response_code(200);
            echo json_encode(["error" => ""]);
        } else{
            http_response_code(500);
            echo json_encode(["error" => "Failed to delete contact"]);
        }
        $stmt->close();
        break;

    case "PUT":
        $rawInput = file_get_contents('php://input');
        $inData = json_decode($rawInput, true);

        $contactId = isset($inData["id"]) ? intval($inData["id"]) : 0;

        $firstName = $inData["firstName"] ?? "";
        $lastName = $inData["lastName"] ?? "";
        $phone = $inData["phone"] ?? "";
        $email = $inData["email"] ?? "";

        if ($contactId <= 0 || empty($firstName) || empty($lastName) || empty($email)){
            http_response_code(400);
            echo json_encode(["error" => "Invalid or missing fields"]);
            exit();
        }

        $stmp = $conn->prepare("UPDATE Contacts SET FirstName = ?, LastName = ?, Phone = ?, Email = ? WHERE ID = ? AND UserID = ?");
        $stmp->bind_param("ssssii", $firstName, $lastName, $phone, $email, $contactId, $userId);

        if($stmp->execute()){
            http_response_code(200);
            echo json_encode(["error" => ""]);
        } else {
            http_response_code(500);
            echo json_encode("errpr" => "Failed to update contact");
        }
        
        $stmp->close();
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
        break;
}
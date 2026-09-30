# Contact Manager REST API Documentation

Base URL: https://lamp.agusmarmor.me/api

All requests and responses use application/json content type.

============================================================
AUTHENTICATION & HEADERS
============================================================
Protected endpoints require identification via headers:
- X-User-Id: <integer> (Numerical ID of the logged-in user)
- Authorization: Bearer <userId> (Optional)


============================================================
1. AUTHENTICATION ENDPOINTS
============================================================

------------------------------------------------------------
POST /Login.php
------------------------------------------------------------
Authenticates a user and establishes session data.
Auth Required: No

Request Body:
{
  "login": "root",
  "password": "yourPassword123"
}

Response 200 OK (Success):
{
  "id": 1,
  "firstName": "Application",
  "lastName": "Administrator",
  "role": "admin",
  "error": ""
}

Response 200 OK (Invalid Credentials):
{
  "id": 0,
  "firstName": "",
  "lastName": "",
  "error": "User/Password combination incorrect"
}


------------------------------------------------------------
POST /Register.php
------------------------------------------------------------
Creates a standard user account.
Auth Required: No

Request Body:
{
  "firstName": "John",
  "lastName": "Doe",
  "login": "johndoe",
  "password": "Password123!"
}

Response 201 Created:
{
  "id": 14,
  "error": ""
}

Response 400 Bad Request:
{
  "error": "All fields are required"
}

Response 409 Conflict:
{
  "error": "Username already exists"
}


------------------------------------------------------------
PUT /User.php
------------------------------------------------------------
Allows an authenticated user to update their current password.
Auth Required: Yes (X-User-Id)

Request Body:
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}

Response 200 OK:
{
  "error": ""
}

Response 400 Bad Request:
{
  "error": "Incorrect current password"
}


============================================================
2. CONTACTS ENDPOINTS (/index.php)
============================================================
All /index.php routes operate strictly within the scope of the authenticated user (UserID = X-User-Id).

------------------------------------------------------------
GET /index.php
------------------------------------------------------------
Retrieves contacts belonging to the authenticated user. Executes a live round-trip database search if query parameter q is supplied.
Auth Required: Yes (X-User-Id)
Query Parameters:
  q (optional): Substring search matching FirstName, LastName, CONCAT(FirstName, ' ', LastName), Email, or Phone.

Example: GET /api/index.php?q=John

Response 200 OK:
{
  "contacts": [
    {
      "id": 101,
      "firstName": "John",
      "lastName": "Smith",
      "phone": "407-555-0199",
      "email": "jsmith@example.com"
    }
  ],
  "error": ""
}

Response 200 OK (No Matches):
{
  "contacts": [],
  "error": "No Records Found"
}


------------------------------------------------------------
POST /index.php
------------------------------------------------------------
Creates a new contact record associated with the authenticated user.
Auth Required: Yes (X-User-Id)

Request Body:
{
  "firstName": "Jane",
  "lastName": "Miller",
  "email": "jmiller@example.com",
  "phone": "321-555-0144"
}

Response 201 Created:
{
  "id": 102,
  "error": ""
}

Response 400 Bad Request:
{
  "error": "Missing required fields"
}


------------------------------------------------------------
PUT /index.php
------------------------------------------------------------
Updates an existing contact record owned by the authenticated user.
Auth Required: Yes (X-User-Id)

Request Body:
{
  "id": 102,
  "firstName": "Jane",
  "lastName": "Miller-Davis",
  "email": "janemd@example.com",
  "phone": "321-555-0144"
}

Response 200 OK:
{
  "error": ""
}

Response 400 Bad Request:
{
  "error": "Invalid or missing fields"
}


------------------------------------------------------------
DELETE /index.php?id={contactId}
------------------------------------------------------------
Permanently removes a specific contact record owned by the authenticated user.
Auth Required: Yes (X-User-Id)
Query Parameters:
  id (required): Numerical primary key of the contact.

Example: DELETE /api/index.php?id=102

Response 200 OK:
{
  "error": ""
}

Response 400 Bad Request:
{
  "error": "Missing or invalid Contact ID"
}


============================================================
3. ADMINISTRATIVE ENDPOINTS (/Admin.php)
============================================================
All /Admin.php actions enforce server-side role verification (role === 'admin' and isDisabled === 0). Calls by regular users or non-admins return 403 Forbidden.

------------------------------------------------------------
GET /Admin.php?action=users
------------------------------------------------------------
Retrieves a list of all registered accounts.
Auth Required: Yes (X-User-Id of an Admin)
Query Parameters:
  action: users
  q (optional): Search term matching first name, last name, full name, or login username.

Example: GET /api/Admin.php?action=users&q=Agus

Response 200 OK:
{
  "users": [
    {
      "id": 1,
      "firstName": "Application",
      "lastName": "Administrator",
      "login": "root",
      "role": "admin",
      "disabled": 0
    },
    {
      "id": 12,
      "firstName": "Agustin",
      "lastName": "Marmor",
      "login": "agus",
      "role": "admin",
      "disabled": 0
    }
  ]
}


------------------------------------------------------------
GET /Admin.php?action=contacts
------------------------------------------------------------
Allows an admin to inspect contacts owned by any specific user.
Auth Required: Yes (X-User-Id of an Admin)
Query Parameters:
  action: contacts
  userId (required): Target user ID whose contacts are being inspected.
  q (optional): Search term to filter within that user's contacts.

Example: GET /api/Admin.php?action=contacts&userId=14&q=Alice

Response 200 OK:
{
  "contacts": [
    {
      "firstName": "Alice",
      "lastName": "Wonderland",
      "phone": "555-010-1234",
      "email": "alice@wonderland.com"
    }
  ]
}


------------------------------------------------------------
POST /Admin.php?action=disable
------------------------------------------------------------
Toggles account status. Administrators cannot disable their own accounts.
Auth Required: Yes (X-User-Id of an Admin)
Query Parameters:
  action: disable

Request Body:
{
  "userId": 14,
  "disabled": true
}

Response 200 OK:
{
  "error": ""
}

Response 400 Bad Request:
{
  "error": "You cannot disable your own account"
}


------------------------------------------------------------
POST /Admin.php?action=password
------------------------------------------------------------
Forces a password reset on any account without requiring the current password.
Auth Required: Yes (X-User-Id of an Admin)
Query Parameters:
  action: password

Request Body:
{
  "userId": 14,
  "password": "NewSecurePassword88!"
}

Response 200 OK:
{
  "error": ""
}

Response 400 Bad Request:
{
  "error": "UserID invalid or Password needs to be at least 8 characters"
}


------------------------------------------------------------
POST /Admin.php?action=create
------------------------------------------------------------
Creates a new administrative account directly.
Auth Required: Yes (X-User-Id of an Admin)
Query Parameters:
  action: create

Request Body:
{
  "firstName": "Devin",
  "lastName": "Admin",
  "login": "devin_admin",
  "password": "SuperAdminPass2026!"
}

Response 201 Created:
{
  "id": 15,
  "error": ""
}

Response 400 Bad Request:
{
  "error": "Missing fields or password less than 8 characters"
}

Response 409 Conflict:
{
  "error": "Username already exists"
}

const urlBase = '/api/index.php';
const loginUrlBase = '/api/Login.php';
const registerUrlBase = '/api/Register.php';

let userId = 0;
let firstName = "";
let lastName = "";

function doLogin() {
  let loginInput = document.getElementById("loginName");
  let passwordInput = document.getElementById("loginPassword");
  let login = loginInput ? loginInput.value.trim() : "";
  let password = passwordInput ? passwordInput.value.trim() : "";
  let contactsCache = {};

  document.getElementById("loginResult").innerHTML = "";
  performLogin(login, password);
}

function performLogin(login, password) {
  userId = 0;
  firstName = "";
  lastName = "";

  let jsonPayload = JSON.stringify({ login: login, password: password });

  let xhr = new XMLHttpRequest();
  xhr.open("POST", loginUrlBase, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200) {
          let jsonObject = JSON.parse(xhr.responseText);
          userId = jsonObject.id;

          if (userId < 1) {
            document.getElementById("loginResult").innerHTML =
              "<i class='bi bi-exclamation-circle-fill me-1'></i> User/Password combination incorrect";
            return;
          }

          firstName = jsonObject.firstName;
          lastName = jsonObject.lastName;

          saveCookie();
          window.location.href = "contact.html";
        } else {
          document.getElementById("loginResult").innerHTML =
            "<i class='bi bi-exclamation-circle-fill me-1'></i> Login failed";
        }
      }
    };
    xhr.send(jsonPayload);
  } catch (err) {
    document.getElementById("loginResult").innerHTML = err.message;
  }
}

function doRegister() {
  let firstNameInput = document.getElementById("registerFirstName");
  let lastNameInput = document.getElementById("registerLastName");
  let loginInput = document.getElementById("registerLogin");
  let passwordInput = document.getElementById("registerPassword");
  let resultEl = document.getElementById("registerResult");
  resultEl.innerHTML = "";

  let firstNameVal = firstNameInput.value.trim();
  let lastNameVal = lastNameInput.value.trim();
  let loginVal = loginInput.value.trim();
  let passwordVal = passwordInput.value;

  if (!firstNameVal || !lastNameVal || !loginVal || !passwordVal) {
    resultEl.className = "text-warning small fw-semibold";
    resultEl.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> All fields are required";
    return;
  }

  let jsonPayload = JSON.stringify({
    firstName: firstNameVal,
    lastName: lastNameVal,
    login: loginVal,
    password: passwordVal
  });

  let xhr = new XMLHttpRequest();
  xhr.open("POST", registerUrlBase, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");

  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 201 || this.status === 200) {
          resultEl.className = "text-success-wcag small fw-semibold";
          resultEl.innerHTML = "<i class='bi bi-check-circle-fill me-1'></i> Account created! Logging you in...";

          let modalEl = document.getElementById("registerModal");
          let modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
          modal.hide();

          performLogin(loginVal, passwordVal);
        } else {
          try {
            let res = JSON.parse(xhr.responseText);
            resultEl.className = "text-danger-wcag small fw-semibold";
            resultEl.innerHTML = res.error || "Registration failed";
          } catch (e) {
            resultEl.className = "text-danger-wcag small fw-semibold";
            resultEl.innerHTML = "Registration failed";
          }
        }
      }
    };
    xhr.send(jsonPayload);
  } catch (err) {
    resultEl.className = "text-danger-wcag small fw-semibold";
    resultEl.innerHTML = err.message;
  }
}

function saveCookie() {
  let minutes = 20;
  let date = new Date();
  date.setTime(date.getTime() + minutes * 60 * 1000);
  document.cookie =
    "firstName=" +
    encodeURIComponent(firstName) +
    ",lastName=" +
    encodeURIComponent(lastName) +
    ",userId=" +
    userId +
    ";expires=" +
    date.toGMTString() +
    ";path=/";
}

function readCookie() {
  userId = -1;
  let data = document.cookie;
  let splits = data.split(";");
  for (var i = 0; i < splits.length; i++) {
    let pair = splits[i].trim();
    let tokens = pair.split(",");
    for (var j = 0; j < tokens.length; j++) {
      let keyVal = tokens[j].trim().split("=");
      if (keyVal[0] === "firstName") {
        firstName = decodeURIComponent(keyVal[1] || "");
      } else if (keyVal[0] === "lastName") {
        lastName = decodeURIComponent(keyVal[1] || "");
      } else if (keyVal[0] === "userId") {
        userId = parseInt(keyVal[1].trim());
      }
    }
  }

  if (userId < 0 || isNaN(userId)) {
    window.location.href = "index.html";
  } else {
    let userNameEl = document.getElementById("userName");
    if (userNameEl) {
      userNameEl.innerHTML = `<i class="bi bi-person-circle me-1 text-primary"></i> <span>Logged in as <strong class="--text-secondary">${firstName} ${lastName}</strong></span>`;
    }
    searchContact();
  }
}

function doLogout() {
  userId = 0;
  firstName = "";
  lastName = "";
  document.cookie = "firstName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "lastName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  window.location.href = "index.html";
}

function addContact() {
  let firstNameInput = document.getElementById("contactFirstName");
  let lastNameInput = document.getElementById("contactLastName");
  let emailInput = document.getElementById("contactEmail");
  let phoneInput = document.getElementById("contactPhone");
  let resultEl = document.getElementById("contactAddResult");
  resultEl.innerHTML = "";

  let firstName = firstNameInput ? firstNameInput.value.trim() : "";
  let lastName = lastNameInput ? lastNameInput.value.trim() : "";
  let email = emailInput ? emailInput.value.trim() : "";
  let phone = phoneInput ? phoneInput.value.trim() : "";

  if (!firstName || !lastName || !email) {
    resultEl.className = "text-warning small fw-semibold";
    resultEl.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> First name, last name, and email are required";
    return;
  }

  let jsonPayload = JSON.stringify({ firstName, lastName, email, phone });
  let url = urlBase;

  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 201 || this.status === 200) {
          resultEl.className = "text-success-wcag small fw-semibold";
          resultEl.innerHTML = "<i class='bi bi-check-circle-fill me-1'></i> Contact successfully added!";
          firstNameInput.value = "";
          lastNameInput.value = "";
          emailInput.value = "";
          phoneInput.value = "";
          searchContact();

          let modalEl = document.getElementById("addContactModal");
          let modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
          modal.hide();
        } else {
          try {
            let res = JSON.parse(xhr.responseText);
            resultEl.className = "text-danger-wcag small fw-semibold";
            resultEl.innerHTML = res.error || "Failed to add contact";
          } catch (e) {
            resultEl.className = "text-danger-wcag small fw-semibold";
            resultEl.innerHTML = "Error adding contact";
          }
        }
      }
    };
    xhr.send(jsonPayload);
  } catch (err) {
    resultEl.className = "text-danger-wcag small fw-semibold";
    resultEl.innerHTML = err.message;
  }
}

function searchContact() {
  let srchInput = document.getElementById("searchText");
  let srch = srchInput ? srchInput.value.trim() : "";
  let resultSpan = document.getElementById("contactSearchResult");
  resultSpan.innerHTML = "";

  let url = urlBase + (srch ? ("?q=" + encodeURIComponent(srch)) : "");

  let xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        resultSpan.innerHTML = "<i class='bi bi-check-circle me-1'></i> Results updated";
        let jsonObject = JSON.parse(xhr.responseText);
        let targetDiv = document.getElementById("contactList");
        let contacts = jsonObject.contacts || [];

        contactsCache = {};

        if (contacts.length === 0 || jsonObject.error === "No Records Found") {
          if (targetDiv) targetDiv.innerHTML = `<div class="empty-state"><i class="bi bi-info-circle me-1"></i> No matching contacts found.</div>`;
          return;
        }

        let rows = "";
        for (let i = 0; i < contacts.length; i++) {
          let c = contacts[i];
          let fullName = [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed Contact";
          contactsCache[c.id] = c;

          rows += `<div class="contact-row" data-id="${c.id}">
            <span class="contact-name">${fullName}</span>
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="openEditContact(${c.id});" title="Edit Contact">
              <i class="bi bi-pencil"></i>
            </button>
          </div>`;
        }

        if (targetDiv) {
          targetDiv.innerHTML = rows;
        }
      }
    };
    xhr.send();
  } catch (err) {
    resultSpan.innerHTML = err.message;
  }
}

function openEditContact(id) {
  let c = contactsCache[id];
  if (!c) return;

  document.getElementById("editContactId").value = c.id;
  document.getElementById("editFirstName").value = c.firstName || "";
  document.getElementById("editLastName").value = c.lastName || "";
  document.getElementById("editEmail").value = c.email || "";
  document.getElementById("editPhone").value = c.phone || "";
  document.getElementById("editContactResult").innerHTML = "";

  let modalEl = document.getElementById("editContactModal");
  let modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.show();
}

function saveContactEdit() {
  let id = document.getElementById("editContactId").value;
  let firstName = document.getElementById("editFirstName").value.trim();
  let lastName = document.getElementById("editLastName").value.trim();
  let email = document.getElementById("editEmail").value.trim();
  let phone = document.getElementById("editPhone").value.trim();
  let resultEl = document.getElementById("editContactResult");
  resultEl.innerHTML = "";

  if (!firstName || !lastName || !email) {
    resultEl.className = "text-warning small fw-semibold";
    resultEl.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> First name, last name, and email are required";
    return;
  }

  let jsonPayload = JSON.stringify({ id, firstName, lastName, email, phone });

  let xhr = new XMLHttpRequest();
  xhr.open("PUT", urlBase, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200) {
          let modalEl = document.getElementById("editContactModal");
          let modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
          modal.hide();
          searchContact();
        } else {
          try {
            let res = JSON.parse(xhr.responseText);
            resultEl.className = "text-danger-wcag small fw-semibold";
            resultEl.innerHTML = res.error || "Failed to update contact";
          } catch (e) {
            resultEl.className = "text-danger-wcag small fw-semibold";
            resultEl.innerHTML = "Error updating contact";
          }
        }
      }
    };
    xhr.send(jsonPayload);
  } catch (err) {
    resultEl.className = "text-danger-wcag small fw-semibold";
    resultEl.innerHTML = err.message;
  }
}

function deleteContactFromModal() {
  let id = document.getElementById("editContactId").value;
  if (!id) return;

  if (!confirm("Are you sure you want to delete this contact? This cannot be undone.")) {
    return;
  }

  let modalEl = document.getElementById("editContactModal");
  let modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.hide();

  deleteContact(parseInt(id));
}

function deleteContact(identifier) {
  if (!identifier && identifier !== 0) return;

  let param = (typeof identifier === 'number') ? ("id=" + identifier) : ("name=" + encodeURIComponent(identifier));
  let url = urlBase + "?" + param;

  let xhr = new XMLHttpRequest();
  xhr.open("DELETE", url, true);
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        searchContact();
      }
    };
    xhr.send();
  } catch (err) {
    console.error(err);
  }
}

const urlBase = '/api/index.php';
const loginUrlBase = '/api/Login.php';
const registerUrlBase = '/api/Register.php';
const userUrlBase = '/api/User.php';

let userId = 0;
let firstName = "";
let lastName = "";
let role = "";
let contactsCache = {};

// Escape text before putting it into innerHTML, so a contact named
// "<img src=x onerror=alert(1)>" shows up as text instead of running code.
function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function doLogin() {
  let loginInput = document.getElementById("loginName");
  let passwordInput = document.getElementById("loginPassword");
  let login = loginInput ? loginInput.value.trim() : "";
  let password = passwordInput ? passwordInput.value.trim() : "";

  document.getElementById("loginResult").innerHTML = "";
  performLogin(login, password);
}

function performLogin(login, password) {
  userId = 0;
  firstName = "";
  lastName = "";
  role = "";

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
          role = jsonObject.role || "user";

          saveCookie();
          window.location.href = (role === "admin") ? "admin.html" : "contact.html";
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
    ",role=" +
    encodeURIComponent(role) +
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
      } else if (keyVal[0] === "role") {
        role = decodeURIComponent(keyVal[1] || "");
      }
    }
  }

  if (userId < 0 || isNaN(userId)) {
    window.location.href = "index.html";
  } else {
    let userNameEl = document.getElementById("userName");
    if (userNameEl) {
      userNameEl.innerHTML = `<i class="bi bi-person-circle me-1"></i> Logged in as <strong>${escapeHtml(firstName)} ${escapeHtml(lastName)}</strong>`;
    }
    searchContact();
  }
}

function doLogout() {
  userId = 0;
  firstName = "";
  lastName = "";
  role = "";
  document.cookie = "firstName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "lastName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
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

// ---------- Search as you type ----------
// If we searched on every single keystroke, typing "maya" would send 4
// requests to the server. Instead we wait until the user stops typing for
// 250 milliseconds (a quarter of a second), then send just one.
let searchTimer = null;

function searchAsYouType() {
  clearTimeout(searchTimer);                   // cancel the search we were about to do...
  searchTimer = setTimeout(searchContact, 250); // ...and schedule a new one
}

// Each search gets a number. If an older search's answer arrives after a
// newer one (the network isn't always in order), we ignore the old answer
// so the list never "jumps back" to stale results.
let latestSearchId = 0;

function searchContact() {
  clearTimeout(searchTimer); // Enter or the button searches now, so skip any pending one
  let mySearchId = ++latestSearchId;

  let srchInput = document.getElementById("searchText");
  let srch = srchInput ? srchInput.value.trim() : "";
  let resultSpan = document.getElementById("contactSearchResult");

  let url = urlBase + (srch ? ("?q=" + encodeURIComponent(srch)) : "");

  let xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Authorization", "Bearer " + userId);
  xhr.setRequestHeader("X-User-Id", userId);

  try {
    xhr.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        if (mySearchId !== latestSearchId) return; // a newer search is on its way; ignore this one
        let jsonObject = JSON.parse(xhr.responseText);
        let targetDiv = document.getElementById("contactList");
        let contacts = jsonObject.contacts || [];

        contactsCache = {};

        if (contacts.length === 0 || jsonObject.error === "No Records Found") {
          resultSpan.innerHTML = "";
          let msg = srch
            ? `No contacts match "${escapeHtml(srch)}".`
            : "No contacts yet. Click <strong>Add contact</strong> to create your first one.";
          if (targetDiv) targetDiv.innerHTML = `<div class="empty-state"><i class="bi bi-people"></i>${msg}</div>`;
          return;
        }

        resultSpan.innerHTML = contacts.length + (contacts.length === 1 ? " contact" : " contacts");

        // Put contacts in alphabetical order by first name, then last name.
        // localeCompare compares two strings the way a dictionary would;
        // sensitivity "base" makes "anna" and "Anna" count as the same.
        contacts.sort(function (a, b) {
          let nameA = (a.firstName || "") + " " + (a.lastName || "");
          let nameB = (b.firstName || "") + " " + (b.lastName || "");
          return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
        });

        let rows = "";
        for (let i = 0; i < contacts.length; i++) {
          let c = contacts[i];
          let fullName = [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed Contact";
          let initials = ((c.firstName || "").charAt(0) + (c.lastName || "").charAt(0)).toUpperCase() || "?";
          let id = parseInt(c.id);
          contactsCache[id] = c;

          let meta = "";
          if (c.email) meta += `<span><i class="bi bi-envelope"></i>${escapeHtml(c.email)}</span>`;
          if (c.phone) meta += `<span><i class="bi bi-telephone"></i>${escapeHtml(c.phone)}</span>`;

          rows += `<div class="contact-row" data-id="${id}">
            <div class="contact-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
            <div class="contact-info">
              <span class="contact-name">${escapeHtml(fullName)}</span>
              ${meta ? `<div class="contact-meta">${meta}</div>` : ""}
            </div>
            <button type="button" class="btn btn-edit" onclick="openEditContact(${id});" title="Edit ${escapeHtml(fullName)}" aria-label="Edit ${escapeHtml(fullName)}">
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

// ---------- Change password ----------
// Called when the Change Password form is submitted.
// Sends the current and new password to api/User.php, which checks the
// current one is right before saving the new one.
function changePassword() {
  let currentPassword = document.getElementById("currentPassword").value;
  let newPassword = document.getElementById("newPassword").value;
  let confirmPassword = document.getElementById("confirmPassword").value;
  let resultEl = document.getElementById("changePasswordResult");
  let submitButton = document.getElementById("changePasswordButton");

  // Small helper so each message below is one line
  function showMessage(type, text) {
    resultEl.className = type + " small fw-semibold";
    resultEl.innerHTML = text;
  }

  // Checks we can do in the browser before bothering the server
  if (newPassword.length < 6) {
    showMessage("text-warning", "<i class='bi bi-exclamation-triangle-fill'></i> New password must be at least 6 characters");
    return;
  }
  if (newPassword !== confirmPassword) {
    showMessage("text-warning", "<i class='bi bi-exclamation-triangle-fill'></i> New passwords don't match");
    return;
  }
  if (newPassword === currentPassword) {
    showMessage("text-warning", "<i class='bi bi-exclamation-triangle-fill'></i> New password must be different from your current one");
    return;
  }

  let jsonPayload = JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword });

  let xhr = new XMLHttpRequest();
  xhr.open("PUT", userUrlBase, true);
  xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
  xhr.setRequestHeader("X-User-Id", userId);

  // Disable the button while waiting, so it can't be clicked twice
  submitButton.disabled = true;

  xhr.onreadystatechange = function () {
    if (this.readyState !== 4) return;
    submitButton.disabled = false;

    if (this.status === 200) {
      document.getElementById("changePasswordForm").reset();
      showMessage("text-success-wcag", "<i class='bi bi-check-circle-fill'></i> Password updated!");

      // Close the popup after a moment so there's time to read the message
      setTimeout(function () {
        let modalEl = document.getElementById("changePasswordModal");
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }, 1500);
    } else {
      // The API sends back a message like "Incorrect current password"
      let message = "Could not update password";
      try {
        let res = JSON.parse(xhr.responseText);
        if (res.error) message = res.error;
      } catch (e) { /* response wasn't JSON; keep the default message */ }
      showMessage("text-danger-wcag", "<i class='bi bi-x-circle-fill'></i> " + escapeHtml(message));
    }
  };

  xhr.send(jsonPayload);
}

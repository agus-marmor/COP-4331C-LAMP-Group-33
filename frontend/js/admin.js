/* ============================================================
   admin.js — Admin dashboard logic
   Same patterns as code.js: XMLHttpRequest, cookie-based session
   info, Authorization: Bearer <userId> / X-User-Id headers.

   Backend: api/Admin.php, routed by ?action=
   ============================================================ */

const adminUsersUrl = '/api/Admin.php?action=users';
const adminDisableUrl = '/api/Admin.php?action=disable';
const adminPasswordUrl = '/api/Admin.php?action=password';
const adminCreateUrl = '/api/Admin.php?action=create';
const adminUserContactsUrl = '/api/Admin.php?action=contacts';

let usersCache = {};

/* ---------- Auth / page guard ---------- */
function readAdminCookie() {
    userId = -1;
    let data = document.cookie;
    let splits = data.split(";");
    let role = "";

    for (let i = 0; i < splits.length; i++) {
        let pair = splits[i].trim();
        let tokens = pair.split(",");
        for (let j = 0; j < tokens.length; j++) {
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
        return;
    }

    if (role !== "admin") {
        window.location.href = "contact.html";
        return;
    }

    // Account menu name/initials are filled in by the inline script
    // in admin.html, same split contact.html uses.
    searchUsers();
}

/* ---------- Search users ---------- */
function searchUsers() {
    let srchInput = document.getElementById("userSearchText");
    let srch = srchInput ? srchInput.value.trim() : "";
    let resultSpan = document.getElementById("userSearchResult");
    resultSpan.innerHTML = "";

    let url = adminUsersUrl + (srch ? ("&q=" + encodeURIComponent(srch)) : "");

    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.setRequestHeader("Authorization", "Bearer " + userId);
    xhr.setRequestHeader("X-User-Id", userId);

    try {
        xhr.onreadystatechange = function () {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    let jsonObject = JSON.parse(xhr.responseText);
                    renderUsers(jsonObject.users || []);
                } else {
                    resultSpan.innerHTML = "<i class='bi bi-exclamation-circle-fill me-1'></i> Failed to load users";
                }
            }
        };
        xhr.send();
    } catch (err) {
        resultSpan.innerHTML = err.message;
    }
}

/* Reuses contacts.css's .contact-row / .contact-avatar / .contact-name /
   .contact-meta / .btn-edit classes directly — same visual component,
   just filled with user data (login, role, status) instead of a
   contact's phone/email. */
function renderUsers(users) {
    let listDiv = document.getElementById("userList");
    let emptyDiv = document.getElementById("userListEmpty");
    let resultSpan = document.getElementById("userSearchResult");

    usersCache = {};

    if (users.length === 0) {
        listDiv.innerHTML = "";
        emptyDiv.classList.remove("d-none");
        resultSpan.textContent = "";
        return;
    }
    emptyDiv.classList.add("d-none");
    resultSpan.textContent = users.length + (users.length === 1 ? " user" : " users");

    let rows = "";
    for (let i = 0; i < users.length; i++) {
        let u = users[i];
        usersCache[u.id] = u;
        let isDisabled = Number(u.disabled) === 1;
        let isSelf = u.id === userId;
        let initials = ((u.firstName || "?").charAt(0) + (u.lastName || "").charAt(0)).toUpperCase();

        rows += `<div class="contact-row">
      <span class="contact-avatar" aria-hidden="true">${initials}</span>
      <div class="contact-info">
        <span class="contact-name">
          ${u.firstName} ${u.lastName}
          <span class="pill-row ${u.role === 'admin' ? 'pill-role-admin' : 'pill-role-user'}">${u.role}</span>
          <span class="pill-row ${isDisabled ? 'pill-status-disabled' : 'pill-status-active'}">${isDisabled ? 'Disabled' : 'Active'}</span>
        </span>
        <div class="contact-meta"><span><i class="bi bi-person"></i>${u.login}</span></div>
      </div>
      <button type="button" class="btn-edit" onclick="openViewContacts(${u.id});" title="View contacts" aria-label="View ${u.firstName} ${u.lastName}'s contacts">
        <i class="bi bi-person-lines-fill"></i>
      </button>
      <button type="button" class="btn-edit" onclick="openChangePassword(${u.id});" title="Change password" aria-label="Change password for ${u.firstName} ${u.lastName}">
        <i class="bi bi-key"></i>
      </button>
      <button type="button" class="btn-edit ${isDisabled ? 'btn-edit-success' : 'btn-edit-danger'}"
        onclick="toggleDisabled(${u.id}, ${isDisabled ? 'false' : 'true'});"
        title="${isDisabled ? 'Enable user' : 'Disable user'}"
        aria-label="${isDisabled ? 'Enable' : 'Disable'} ${u.firstName} ${u.lastName}"
        ${isSelf ? 'disabled title="You can\'t disable your own account"' : ''}>
        <i class="bi ${isDisabled ? 'bi-check-circle' : 'bi-slash-circle'}"></i>
      </button>
    </div>`;
    }
    listDiv.innerHTML = rows;
}

/* ---------- Disable / enable (never delete) ---------- */
function toggleDisabled(id, disable) {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", adminDisableUrl, true);
    xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
    xhr.setRequestHeader("Authorization", "Bearer " + userId);
    xhr.setRequestHeader("X-User-Id", userId);

    try {
        xhr.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                searchUsers();
            }
        };
        xhr.send(JSON.stringify({ userId: id, disabled: disable }));
    } catch (err) {
        console.error(err);
    }
}

/* ---------- Change password ---------- */
function openChangePassword(id) {
    let u = usersCache[id];
    if (!u) return;

    document.getElementById("passwordUserId").value = u.id;
    document.getElementById("passwordUserLabel").textContent = u.login;
    document.getElementById("newPasswordInput").value = "";
    document.getElementById("passwordChangeResult").innerHTML = "";

    let modalEl = document.getElementById("changePasswordModal");
    let modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}

function submitPasswordChange() {
    let id = document.getElementById("passwordUserId").value;
    let password = document.getElementById("newPasswordInput").value;
    let resultEl = document.getElementById("passwordChangeResult");
    let spinner = document.getElementById("passwordSaveSpinner");
    resultEl.innerHTML = "";
    resultEl.className = "small fw-semibold";

    if (!password || password.length < 8) {
        resultEl.className = "small fw-semibold text-warning";
        resultEl.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> Use at least 8 characters";
        return;
    }

    spinner.classList.remove("d-none");

    let xhr = new XMLHttpRequest();
    xhr.open("POST", adminPasswordUrl, true);
    xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
    xhr.setRequestHeader("Authorization", "Bearer " + userId);
    xhr.setRequestHeader("X-User-Id", userId);

    try {
        xhr.onreadystatechange = function () {
            if (this.readyState === 4) {
                spinner.classList.add("d-none");
                if (this.status === 200) {
                    resultEl.className = "small fw-semibold text-success-wcag";
                    resultEl.innerHTML = "<i class='bi bi-check-circle-fill me-1'></i> Password updated";
                    setTimeout(() => {
                        let modalEl = document.getElementById("changePasswordModal");
                        let modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                        modal.hide();
                    }, 600);
                } else {
                    try {
                        let res = JSON.parse(xhr.responseText);
                        resultEl.className = "small fw-semibold text-danger-wcag";
                        resultEl.innerHTML = res.error || "Failed to update password";
                    } catch (e) {
                        resultEl.className = "small fw-semibold text-danger-wcag";
                        resultEl.innerHTML = "Error updating password";
                    }
                }
            }
        };
        xhr.send(JSON.stringify({ userId: parseInt(id), password: password }));
    } catch (err) {
        spinner.classList.add("d-none");
        resultEl.innerHTML = err.message;
    }
}

/* ---------- Create admin ---------- */
function submitCreateAdmin() {
    let firstNameVal = document.getElementById("newAdminFirstName").value.trim();
    let lastNameVal = document.getElementById("newAdminLastName").value.trim();
    let loginVal = document.getElementById("newAdminLogin").value.trim();
    let passwordVal = document.getElementById("newAdminPassword").value;
    let resultEl = document.getElementById("createAdminResult");
    let spinner = document.getElementById("createAdminSpinner");
    resultEl.innerHTML = "";
    resultEl.className = "small fw-semibold";

    if (!firstNameVal || !lastNameVal || !loginVal || !passwordVal) {
        resultEl.className = "small fw-semibold text-warning";
        resultEl.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> All fields are required";
        return;
    }
    if (passwordVal.length < 8) {
        resultEl.className = "small fw-semibold text-warning";
        resultEl.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> Use at least 8 characters";
        return;
    }

    spinner.classList.remove("d-none");

    let xhr = new XMLHttpRequest();
    xhr.open("POST", adminCreateUrl, true);
    xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
    xhr.setRequestHeader("Authorization", "Bearer " + userId);
    xhr.setRequestHeader("X-User-Id", userId);

    try {
        xhr.onreadystatechange = function () {
            if (this.readyState === 4) {
                spinner.classList.add("d-none");
                if (this.status === 201 || this.status === 200) {
                    resultEl.className = "small fw-semibold text-success-wcag";
                    resultEl.innerHTML = "<i class='bi bi-check-circle-fill me-1'></i> Admin created";
                    document.getElementById("createAdminForm").reset();
                    searchUsers();
                    setTimeout(() => {
                        let modalEl = document.getElementById("createAdminModal");
                        let modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                        modal.hide();
                    }, 600);
                } else {
                    try {
                        let res = JSON.parse(xhr.responseText);
                        resultEl.className = "small fw-semibold text-danger-wcag";
                        resultEl.innerHTML = res.error || "Failed to create admin";
                    } catch (e) {
                        resultEl.className = "small fw-semibold text-danger-wcag";
                        resultEl.innerHTML = "Error creating admin";
                    }
                }
            }
        };
        xhr.send(JSON.stringify({
            firstName: firstNameVal,
            lastName: lastNameVal,
            login: loginVal,
            password: passwordVal
        }));
    } catch (err) {
        spinner.classList.add("d-none");
        resultEl.innerHTML = err.message;
    }
}

/* ---------- View a user's contacts ---------- */
function openViewContacts(id) {
    let u = usersCache[id];
    if (!u) return;

    document.getElementById("viewContactsUserId").value = id;
    document.getElementById("viewContactsModalLabel").textContent = u.firstName + " " + u.lastName + "'s contacts";
    document.getElementById("userContactSearchText").value = "";

    let modalEl = document.getElementById("viewContactsModal");
    let modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();

    searchUserContacts();
}

function searchUserContacts() {
    let id = document.getElementById("viewContactsUserId").value;
    let srchInput = document.getElementById("userContactSearchText");
    let srch = srchInput ? srchInput.value.trim() : "";
    let targetDiv = document.getElementById("userContactList");
    let emptyDiv = document.getElementById("userContactEmpty");

    let url = adminUserContactsUrl + "&userId=" + encodeURIComponent(id) +
        (srch ? ("&q=" + encodeURIComponent(srch)) : "");

    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.setRequestHeader("Authorization", "Bearer " + userId);
    xhr.setRequestHeader("X-User-Id", userId);

    try {
        xhr.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                let jsonObject = JSON.parse(xhr.responseText);
                let contacts = jsonObject.contacts || [];

                if (contacts.length === 0) {
                    targetDiv.innerHTML = "";
                    emptyDiv.classList.remove("d-none");
                    return;
                }
                emptyDiv.classList.add("d-none");

                let rows = "";
                for (let i = 0; i < contacts.length; i++) {
                    let c = contacts[i];
                    rows += `<div class="contact-row">
            <div class="contact-info">
              <span class="contact-name">${c.firstName} ${c.lastName}</span>
              <div class="contact-meta">
                <span><i class="bi bi-envelope"></i>${c.email || ''}</span>
                <span><i class="bi bi-telephone"></i>${c.phone || ''}</span>
              </div>
            </div>
          </div>`;
                }
                targetDiv.innerHTML = rows;
            }
        };
        xhr.send();
    } catch (err) {
        console.error(err);
    }
}

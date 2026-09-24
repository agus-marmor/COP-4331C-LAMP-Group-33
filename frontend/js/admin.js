/* ============================================================
   admin.js — Admin dashboard logic
   Written to match the patterns already used in code.js:
   XMLHttpRequest (not fetch), cookie-based session info, and
   Authorization: Bearer <userId> / X-User-Id headers on every
   authenticated call.

   IMPORTANT — depends on two things not yet in the repo:
   1. code.js's saveCookie()/readCookie() only store firstName,
      lastName, userId. They need to also store `role` (from the
      Login.php response, which already returns it) so this page
      can tell an admin from a regular user. Until that's added,
      readAdminCookie() below falls back to calling a "WhoAmI"
      check — see the TODO in readAdminCookie().
   2. The five admin API endpoints referenced below don't exist
      in api/ yet. Names here are placeholders — confirm the real
      ones with whoever builds the backend and update urlBase
      values to match.
   ============================================================ */

   //updated with back end expected api call

const adminUsersUrl = '/api/Admin.php?action=users';
const adminDisableUrl = '/api/Admin.php?action=disable';
const adminPasswordUrl = '/api/Admin.php?action=password';
const adminCreateUrl = '/api/Admin.php?action=create';
const adminUserContactsUrl = '/api/Admin.php?action=contacts';

let usersCache = {};

/* ---------- Auth / page guard ----------
   Mirrors readCookie() in code.js, but also confirms role === "admin"
   before letting the page render, and bounces non-admins to contact.html. */
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
                // TODO: this key won't exist until saveCookie() in code.js is
                // updated to also save role after login.
                role = decodeURIComponent(keyVal[1] || "");
            }
        }
    }

    if (userId < 0 || isNaN(userId)) {
        window.location.href = "index.html";
        return;
    }

    if (role !== "admin") {
        // Either a regular user hit this page directly, or the role cookie
        // doesn't exist yet because saveCookie() hasn't been updated.
        window.location.href = "contact.html";
        return;
    }

    document.getElementById("userName").innerHTML =
        `<i class="bi bi-person-circle me-1 text-primary"></i> <span>${firstName} ${lastName}</span>`;

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

function renderUsers(users) {
    let tbody = document.getElementById("userTableBody");
    let emptyDiv = document.getElementById("userListEmpty");

    usersCache = {};

    if (users.length === 0) {
        tbody.innerHTML = "";
        emptyDiv.classList.remove("d-none");
        return;
    }
    emptyDiv.classList.add("d-none");

    let rows = "";
    for (let i = 0; i < users.length; i++) {
        let u = users[i];
        usersCache[u.id] = u;
        let isDisabled = Number(u.disabled) === 1;
        let isSelf = u.id === userId;

        rows += `<tr>
      <td class="fw-medium">${u.firstName} ${u.lastName}</td>
      <td>${u.login}</td>
      <td><span class="role-pill role-${u.role === 'admin' ? 'admin' : 'user'}">${u.role}</span></td>
      <td><span class="status-pill ${isDisabled ? 'status-disabled' : 'status-active'}">${isDisabled ? 'Disabled' : 'Active'}</span></td>
      <td class="text-end">
        <button type="button" class="buttons btn btn-sm btn-outline-secondary me-1" onclick="openViewContacts(${u.id});" title="View Contacts">
          <i class="bi bi-person-lines-fill"></i>
        </button>
        <button type="button" class="buttons btn btn-sm btn-outline-secondary me-1" onclick="openChangePassword(${u.id});" title="Change Password">
          <i class="bi bi-key"></i>
        </button>
        <button type="button" class="buttons btn btn-sm ${isDisabled ? 'btn-outline-success' : 'btn-outline-danger'}"
          onclick="toggleDisabled(${u.id}, ${isDisabled ? 'false' : 'true'});"
          ${isSelf ? 'disabled title="You can\'t disable your own account"' : ''}>
          <i class="bi ${isDisabled ? 'bi-check-circle' : 'bi-slash-circle'}"></i> ${isDisabled ? 'Enable' : 'Disable'}
        </button>
      </td>
    </tr>`;
    }
    tbody.innerHTML = rows;
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

    if (!password || password.length < 8) {
        resultEl.className = "text-warning small fw-semibold";
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
                    resultEl.className = "text-success-wcag small fw-semibold";
                    resultEl.innerHTML = "<i class='bi bi-check-circle-fill me-1'></i> Password updated";
                    setTimeout(() => {
                        let modalEl = document.getElementById("changePasswordModal");
                        let modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                        modal.hide();
                    }, 600);
                } else {
                    try {
                        let res = JSON.parse(xhr.responseText);
                        resultEl.className = "text-danger-wcag small fw-semibold";
                        resultEl.innerHTML = res.error || "Failed to update password";
                    } catch (e) {
                        resultEl.className = "text-danger-wcag small fw-semibold";
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

    if (!firstNameVal || !lastNameVal || !loginVal || !passwordVal) {
        resultEl.className = "text-warning small fw-semibold";
        resultEl.innerHTML = "<i class='bi bi-exclamation-triangle-fill me-1'></i> All fields are required";
        return;
    }
    if (passwordVal.length < 8) {
        resultEl.className = "text-warning small fw-semibold";
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
                    resultEl.className = "text-success-wcag small fw-semibold";
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
                        resultEl.className = "text-danger-wcag small fw-semibold";
                        resultEl.innerHTML = res.error || "Failed to create admin";
                    } catch (e) {
                        resultEl.className = "text-danger-wcag small fw-semibold";
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
    document.getElementById("viewContactsModalLabel").textContent = `${u.firstName} ${u.lastName}'s contacts`;
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
                    rows += `<div class="contact-chip">
            <span class="contact-name">${c.firstName} ${c.lastName}</span>
            <span class="text-secondary-contrast small ms-2">${c.phone || ''}</span>
            <span class="text-secondary-contrast small ms-2">${c.email || ''}</span>
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
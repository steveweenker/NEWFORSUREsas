function switchLoginTab(role) {
  document
    .querySelectorAll(".login-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelector(`.login-tab[data-role="${role}"]`)
    .classList.add("active");
  document
    .querySelectorAll(".login-form")
    .forEach((f) => f.classList.remove("active"));
  document.getElementById(role + "LoginForm").classList.add("active");
  document.querySelectorAll(".alert-error").forEach((e) => {
    e.style.display = "none";
    e.textContent = "";
  });
}
async function handleAdminLogin(event) {
  event.preventDefault();
  const password = document.getElementById("adminPassword").value;
  const errorDiv = document.getElementById("adminLoginError");
  if (password === ADMIN_PASSWORD) {
    completeLogin("admin", { name: "Admin User" });
  } else {
    errorDiv.textContent = "❌ Incorrect Admin Password";
    errorDiv.style.display = "block";
  }
}
async function handleFacultyLogin(event) {
  event.preventDefault();
  const id = document.getElementById("loginFacultyId").value;
  const password = document.getElementById("loginFacultyPassword").value;
  const errorDiv = document.getElementById("facultyLoginError");
  const allFaculty = await getAll("faculty");
  const facultyMember = allFaculty.find((f) => f.facultyId === id);
  if (facultyMember) {
    const storedPassword = facultyMember.password || "password123";
    if (password === storedPassword) {
      completeLogin("faculty", facultyMember);
    } else {
      errorDiv.textContent = "❌ Incorrect Password";
      errorDiv.style.display = "block";
    }
  } else {
    errorDiv.textContent = "❌ Faculty ID not found";
    errorDiv.style.display = "block";
  }
}
async function handleStudentLogin(event) {
  event.preventDefault();
  const rollNo = document.getElementById("loginStudentId").value;
  const errorDiv = document.getElementById("studentLoginError");
  const allStudents = await getAll("students");
  const student = allStudents.find((s) => s.rollNo === rollNo);
  if (student) {
    completeLogin("student", student);
  } else {
    errorDiv.textContent = "❌ Student Roll No not found";
    errorDiv.style.display = "block";
  }
}
function completeLogin(role, userData) {
  currentUser = { role, ...userData };
  document.getElementById("loginOverlay").style.display = "none";
  document.getElementById("mainContainer").style.display = "block";

  const name =
    role === "admin"
      ? "Admin User"
      : `${userData.firstName} ${userData.lastName}`;
  document.getElementById("loggedInUser").textContent = name;
  document.getElementById("roleBadge").textContent = role.toUpperCase();

  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("active"));
  // Show/hide password change button
  const passwordChangeBtn = document.getElementById("passwordChangeBtn");
  if (role === "admin" || role === "faculty") {
    passwordChangeBtn.style.display = "inline-block";
  } else {
    passwordChangeBtn.style.display = "none";
  }
  document.getElementById(role + "Panel").classList.add("active");

  if (role === "faculty") {
    populateFacultyClassDropdown();
    // Add multi-session button
    setTimeout(addMultiSessionButton, 500);
  } else if (role === "student") {
    populateStudentDashboard(userData);
  } else if (role === "admin") {
    populateFacultyClassDropdown();
    populateAdminClassFilter("all", "all");
  }

  document.getElementById("adminPassword").value = "";
  document.getElementById("loginFacultyId").value = "";
  document.getElementById("loginFacultyPassword").value = "";
  document.getElementById("loginStudentId").value = "";
}
function handleLogout() {
  showConfirm("Are you sure you want to logout?", function () {
    currentUser = null;
    document.getElementById("facultyClassSelect").innerHTML =
      '<option value="">-- Select a class --</option>';
    document.getElementById("studentGrid").innerHTML = "";
    document.getElementById("studentGridContainer").style.display = "none";

    document.getElementById("loginOverlay").style.display = "flex";
    document.getElementById("mainContainer").style.display = "none";
    showToast("Logged out successfully", "info");
  });
}
// Password Change Functions
function openPasswordChangeModal() {
  // Clear previous values
  document.getElementById("currentPassword").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
  document.getElementById("passwordChangeError").style.display = "none";
  document.getElementById("passwordChangeError").textContent = "";

  openModal("passwordChangeModal");

  // Add password strength indicator
  const newPasswordInput = document.getElementById("newPassword");
  newPasswordInput.addEventListener("input", checkPasswordStrength);
}
function checkPasswordStrength() {
  const password = document.getElementById("newPassword").value;
  const strengthDiv =
    document.getElementById("passwordStrength") ||
    createPasswordStrengthIndicator();

  if (password.length === 0) {
    strengthDiv.className = "password-strength";
    strengthDiv.querySelector(".password-strength-bar").style.width = "0%";
    return;
  }

  let strength = 0;

  // Check length
  if (password.length >= 8) strength++;

  // Check for mixed case
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;

  // Check for numbers
  if (/\d/.test(password)) strength++;

  // Check for special characters
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  // Update strength indicator
  const strengthBar = strengthDiv.querySelector(".password-strength-bar");
  if (strength <= 1) {
    strengthDiv.className = "password-strength weak";
  } else if (strength <= 3) {
    strengthDiv.className = "password-strength medium";
  } else {
    strengthDiv.className = "password-strength strong";
  }
}
function createPasswordStrengthIndicator() {
  const formGroup = document
    .getElementById("newPassword")
    .closest(".form-group");
  const strengthDiv = document.createElement("div");
  strengthDiv.id = "passwordStrength";
  strengthDiv.className = "password-strength";
  strengthDiv.innerHTML = '<div class="password-strength-bar"></div>';
  formGroup.appendChild(strengthDiv);

  // Add hint
  const hint = document.createElement("small");
  hint.className = "password-hint";
  hint.textContent =
    "Use at least 8 characters with uppercase, lowercase, numbers and symbols for strong password";
  formGroup.appendChild(hint);

  return strengthDiv;
}

async function handlePasswordChange(event) {
  event.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const errorDiv = document.getElementById("passwordChangeError");

  // Clear previous errors
  errorDiv.style.display = "none";
  errorDiv.textContent = "";

  // Validate
  if (!currentPassword) {
    showError("Current password is required");
    return;
  }

  if (newPassword.length < 6) {
    showError("New password must be at least 6 characters long");
    return;
  }

  if (newPassword !== confirmPassword) {
    showError("New passwords do not match");
    return;
  }

  try {
    if (currentUser.role === "admin") {
      // Admin password change
      if (currentPassword !== ADMIN_PASSWORD) {
        showError("Current admin password is incorrect");
        return;
      }

      // In a real app, you'd want to update the ADMIN_PASSWORD
      // For now, we'll show a message since ADMIN_PASSWORD is a constant
      showError("Admin password change requires server-side implementation");
      return;
    } else if (currentUser.role === "faculty") {
      // Faculty password change
      const allFaculty = await getAll("faculty");
      const facultyMember = allFaculty.find((f) => f.id === currentUser.id);

      if (!facultyMember) {
        showError("Faculty member not found");
        return;
      }

      // Check current password
      const storedPassword = facultyMember.password || "password123";
      if (currentPassword !== storedPassword) {
        showError("Current password is incorrect");
        return;
      }

      // Update password
      facultyMember.password = newPassword;
      await updateRecord("faculty", facultyMember);

      showToast("Password changed successfully!", "success");
      closeModal("passwordChangeModal");
    } else {
      showError("Password change not available for students");
    }
  } catch (error) {
    console.error("Password change error:", error);
    showError("An error occurred. Please try again.");
  }

  function showError(message) {
    errorDiv.textContent = "❌ " + message;
    errorDiv.style.display = "block";
  }
}

async function openFacultyPasswordResetModal() {
  if (currentUser.role !== "admin") {
    showToast("Only admin can reset faculty passwords", "error");
    return;
  }

  const select = document.getElementById("resetFacultySelect");
  select.innerHTML = '<option value="">-- Select Faculty --</option>';

  const allFaculty = await getAll("faculty");
  allFaculty.forEach((faculty) => {
    const option = document.createElement("option");
    option.value = faculty.id;
    option.textContent = `${faculty.facultyId} - ${faculty.firstName} ${faculty.lastName} (${faculty.department})`;
    select.appendChild(option);
  });

  document.getElementById("resetFacultyPassword").value = "password123";
  document.getElementById("resetFacultyInfo").style.display = "none";

  openModal("facultyPasswordResetModal");
}


async function resetFacultyPassword() {
            const facultyId = parseInt(document.getElementById('resetFacultySelect').value);
            const newPassword = document.getElementById('resetFacultyPassword').value;

            if (!facultyId || !newPassword) {
                showToast('Please select faculty and enter new password', 'error');
                return;
            }

            if (newPassword.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }

            try {
                const faculty = await getRecord('faculty', facultyId);
                if (!faculty) {
                    showToast('Faculty not found', 'error');
                    return;
                }

                faculty.password = newPassword;
                await updateRecord('faculty', faculty);

                showToast(`Password reset for ${faculty.firstName} ${faculty.lastName}`, 'success');

                // Show the new password
                const infoDiv = document.getElementById('resetFacultyInfo');
                infoDiv.innerHTML = `✅ Password updated successfully!<br><strong>New Password:</strong> ${newPassword}<br><strong>Faculty ID:</strong> ${faculty.facultyId}`;
                infoDiv.style.display = 'block';

                // Clear the selection after 3 seconds
                setTimeout(() => {
                    document.getElementById('resetFacultySelect').value = '';
                    document.getElementById('resetFacultyPassword').value = 'password123';
                    infoDiv.style.display = 'none';
                }, 3000);

            } catch (error) {
                console.error('Password reset error:', error);
                showToast('Error resetting password', 'error');
            }
        }

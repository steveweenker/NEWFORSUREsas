document.getElementById("confirmActionBtn").onclick = function () {
  if (pendingAction) pendingAction();
  closeModal("confirmationModal");
  pendingAction = null;
};

document.getElementById("attendanceDate").valueAsDate = new Date();

(async () => {
  const dbInit = await initDB();
  if (!dbInit) {
    console.error("Failed to initialize database");
    showToast("Database connection failed. Please refresh page.", "error");
    return;
  }
  await loadStudents();
  await loadFaculty();
  await loadClasses();
  await loadYears();
  await populateAdminClassFilter("all", "all");
  await updateDashboard();

  // Initialize date filter
  document.querySelectorAll('input[name="dateFilterType"]').forEach((radio) => {
    radio.addEventListener("change", toggleDateRange);
  });
  toggleDateRange(); // Initial call

  // Add event listeners for filters to update class dropdown
  document
    .getElementById("adminSemesterFilter")
    .addEventListener("change", async function () {
      const semesterFilter = this.value;
      const branchFilter = document.getElementById("adminBranchFilter").value;
      await updateClassFilterDropdown(semesterFilter, branchFilter);
    });

  document
    .getElementById("adminBranchFilter")
    .addEventListener("change", async function () {
      const branchFilter = this.value;
      const semesterFilter = document.getElementById(
        "adminSemesterFilter"
      ).value;
      await updateClassFilterDropdown(semesterFilter, branchFilter);
    });
})();

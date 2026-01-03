// marks.js - Handles Internal Marks Logic

// ==========================================
// FACULTY: LOAD & UPDATE MARKS
// ==========================================

async function populateFacultyMarksDropdown() {
  const classes = await getAll("classes");
  const select = document.getElementById("facultyMarksClassSelect");
  const adminSelect = document.getElementById("adminMarksClassFilter");

  if (select)
    select.innerHTML = '<option value="">-- Select a class --</option>';
  if (adminSelect)
    adminSelect.innerHTML = '<option value="">-- Select a class --</option>';

  if (!currentUser) return;

  // Filter classes based on role
  let myClasses = [];
  if (currentUser.role === "admin") {
    myClasses = classes; // Admin sees all
  } else {
    const facultyName = `${currentUser.firstname} ${currentUser.lastname}`;
    myClasses = classes.filter(
      (c) => c.faculty.trim().toLowerCase() === facultyName.trim().toLowerCase()
    );
  }

  // Populate Dropdowns
  myClasses.forEach((cls) => {
    const opt = document.createElement("option");
    opt.value = cls.id;
    opt.textContent = `${cls.code}: ${cls.name}`;

    if (select) select.appendChild(opt.cloneNode(true));
    if (adminSelect) adminSelect.appendChild(opt);
  });
}

async function loadFacultyMarksTable() {
  const classId = parseInt(
    document.getElementById("facultyMarksClassSelect").value
  );
  const container = document.getElementById("marksEntryContainer");
  const tbody = document.getElementById("facultyMarksBody");

  if (!classId) {
    container.style.display = "none";
    return;
  }

  tbody.innerHTML =
    '<tr><td colspan="6" style="text-align:center;">Loading students and marks...</td></tr>';
  container.style.display = "block";

  try {
    const [allStudents, allClasses, allMarks] = await Promise.all([
      getAll("students"),
      getAll("classes"),
      getAll("internal_marks"),
    ]);

    const cls = allClasses.find((c) => c.id === classId);

    // Filter students for this class (Dept + Sem match)
    const classStudents = allStudents.filter(
      (s) => s.department === cls.department && s.semester == cls.semester
    );

    // Sort by Roll No
    classStudents.sort((a, b) =>
      (a.rollno || "").localeCompare(b.rollno || "")
    );

    // Filter existing marks for this class
    const existingMarks = allMarks.filter((m) => m.classid === classId);
    const marksMap = new Map(existingMarks.map((m) => [m.studentid, m]));

    tbody.innerHTML = "";

    if (classStudents.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;">No students found for this class.</td></tr>';
      return;
    }

    classStudents.forEach((student) => {
      const marks = marksMap.get(student.id) || {
        midsem: 0,
        assignment: 0,
        attendance: 0,
        total: 0,
      };

      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${student.rollno}</td>
                <td>${student.firstname} ${student.lastname}</td>
                <td>
                    <input type="number" class="mark-input midsem" data-sid="${student.id}" 
                           value="${marks.midsem}" min="0" onchange="calculateRowTotal(this)">
                </td>
                <td>
                    <input type="number" class="mark-input assign" data-sid="${student.id}" 
                           value="${marks.assignment}" min="0" onchange="calculateRowTotal(this)">
                </td>
                <td>
                    <input type="number" class="mark-input att" data-sid="${student.id}" 
                           value="${marks.attendance}" min="0" onchange="calculateRowTotal(this)">
                </td>
                <td style="font-weight:bold; color:var(--color-primary);">
                    <span id="total-${student.id}">${marks.total}</span>
                </td>
            `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error loading marks:", error);
    showToast("Error loading data", "error");
  }
}

function calculateRowTotal(input) {
  const row = input.closest("tr");
  const studentId = input.dataset.sid;

  // Get inputs
  const mid = parseFloat(row.querySelector(".midsem").value) || 0;
  const ass = parseFloat(row.querySelector(".assign").value) || 0;
  const att = parseFloat(row.querySelector(".att").value) || 0;

  // Get limits
  const maxMid = parseFloat(document.getElementById("maxMidSem").value) || 100;
  const maxAss = parseFloat(document.getElementById("maxAssign").value) || 100;
  const maxAtt = parseFloat(document.getElementById("maxAtt").value) || 100;

  // Validation visual feedback
  validateInput(row.querySelector(".midsem"), maxMid);
  validateInput(row.querySelector(".assign"), maxAss);
  validateInput(row.querySelector(".att"), maxAtt);

  // Update total text
  const total = mid + ass + att;
  document.getElementById(`total-${studentId}`).textContent = total;
}

function validateInput(input, max) {
  if (parseFloat(input.value) > max) {
    input.style.border = "2px solid red";
    input.title = `Max value is ${max}`;
  } else {
    input.style.border = "1px solid #ddd";
    input.title = "";
  }
}

// Added this function to handle the "Max Marks" input change
function recalculateAllTotals() {
  const rows = document.querySelectorAll("#facultyMarksBody tr");
  rows.forEach((row) => {
    const input = row.querySelector(".midsem");
    if (input) calculateRowTotal(input);
  });
}

async function saveInternalMarks() {
  const classId = parseInt(
    document.getElementById("facultyMarksClassSelect").value
  );
  if (!classId) return;

  showToast("Saving marks...", "info");

  const rows = document.querySelectorAll("#facultyMarksBody tr");
  const allMarks = await getAll("internal_marks");

  // Find existing marks for this class to update/insert correctly
  const existingMarksMap = new Map(
    allMarks.filter((m) => m.classid === classId).map((m) => [m.studentid, m])
  );

  const promises = [];

  rows.forEach((row) => {
    const midInput = row.querySelector(".midsem");
    if (!midInput) return; // Header or empty row

    const studentId = parseInt(midInput.dataset.sid);
    const mid = parseFloat(midInput.value) || 0;
    const ass = parseFloat(row.querySelector(".assign").value) || 0;
    const att = parseFloat(row.querySelector(".att").value) || 0;
    const total =
      parseFloat(document.getElementById(`total-${studentId}`).textContent) ||
      0;

    const record = {
      classid: classId,
      studentid: studentId,
      midsem: mid,
      assignment: ass,
      attendance: att,
      total: total,
      updatedat: new Date().toISOString(),
    };

    const existing = existingMarksMap.get(studentId);

    if (existing) {
      record.id = existing.id;
      record.createdat = existing.createdat;
      promises.push(updateRecord("internal_marks", record));
    } else {
      record.createdat = new Date().toISOString();
      promises.push(addRecord("internal_marks", record));
    }
  });

  await Promise.all(promises);
  showToast("All marks saved successfully!", "success");
}

// ==========================================
// ADMIN: VIEW & EXPORT MARKS
// ==========================================

// ==========================================
// ADMIN: VIEW & EXPORT MARKS (UPDATED)
// ==========================================

async function loadAdminMarksTable() {
  const tbody = document.querySelector("#adminMarksTable tbody");
  tbody.innerHTML =
    '<tr><td colspan="7" style="text-align:center;">Loading data...</td></tr>';

  // 1. Get Filter Values
  const yearFilter = document.getElementById("adminMarksYearFilter").value;
  const branchFilter = document.getElementById("adminMarksBranchFilter").value;
  const semesterFilter = document.getElementById(
    "adminMarksSemesterFilter"
  ).value;
  const classFilter = document.getElementById("adminMarksClassFilter").value;
  const sortBy = document.getElementById("adminMarksSortBy").value;

  try {
    // 2. Fetch Data
    const [allStudents, allMarks, allClasses] = await Promise.all([
      getAll("students"),
      getAll("internal_marks"),
      getAll("classes"),
    ]);

    // 3. Filter Marks based on Class selection first
    let filteredMarks = allMarks;
    if (classFilter !== "all") {
      filteredMarks = filteredMarks.filter((m) => m.classid == classFilter);
    }

    // 4. Map Marks to Students and Apply Student Filters
    let displayData = [];

    filteredMarks.forEach((mark) => {
      const student = allStudents.find((s) => s.id === mark.studentid);
      if (!student) return;

      // Apply Academic Filters (Year, Branch, Sem)
      const studentYear = Math.ceil(student.semester / 2);
      if (yearFilter !== "all" && studentYear != yearFilter) return;
      if (branchFilter !== "all" && student.department !== branchFilter) return;
      if (semesterFilter !== "all" && student.semester != semesterFilter)
        return;

      displayData.push({
        student: student,
        mark: mark,
        total: parseFloat(mark.total) || 0,
      });
    });

    // 5. Sort Data
    displayData.sort((a, b) => {
      switch (sortBy) {
        case "total_desc":
          return b.total - a.total;
        case "total_asc":
          return a.total - b.total;
        case "rollno_asc":
          return (a.student.rollno || "").localeCompare(b.student.rollno || "");
        case "name_asc":
          return (a.student.firstname || "").localeCompare(
            b.student.firstname || ""
          );
        default:
          return 0;
      }
    });

    // 6. Render Table
    tbody.innerHTML = "";
    document.getElementById(
      "adminMarksCount"
    ).textContent = `(${displayData.length})`;

    if (displayData.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center;">No records found matching filters.</td></tr>';
      return;
    }

    displayData.forEach((item) => {
      const s = item.student;
      const m = item.mark;

      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${s.rollno || "N/A"}</td>
                <td>${s.firstname} ${s.lastname}</td>
                <td>${s.department}</td>
                <td>${m.midsem}</td>
                <td>${m.assignment}</td>
                <td>${m.attendance}</td>
                <td style="font-weight:bold; color:var(--color-primary);">${
                  m.total
                }</td>
            `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error loading marks:", error);
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center; color:red;">Error loading data. Check console.</td></tr>';
  }
}

async function exportInternalMarks(format) {
  const classId = document.getElementById("adminMarksClassFilter").value;

  // Safety check: Reports are best generated per class
  if (
    classId === "all" &&
    !confirm(
      "You have selected 'All Classes'. This will export a combined report. Do you want to continue?"
    )
  ) {
    return;
  }

  showToast(`Generating ${format.toUpperCase()} report...`, "info");

  const [allStudents, allMarks, allClasses] = await Promise.all([
    getAll("students"),
    getAll("internal_marks"),
    getAll("classes"),
  ]);

  // Filter Data Logic (Same as Load)
  let filteredMarks = allMarks;
  if (classId !== "all") {
    filteredMarks = filteredMarks.filter((m) => m.classid == classId);
  }

  // Get Filter Values for Header Context
  const yearFilter = document.getElementById("adminMarksYearFilter").value;
  const branchFilter = document.getElementById("adminMarksBranchFilter").value;
  const semesterFilter = document.getElementById(
    "adminMarksSemesterFilter"
  ).value;

  // Join Data
  let reportData = [];
  filteredMarks.forEach((mark) => {
    const student = allStudents.find((s) => s.id === mark.studentid);
    if (!student) return;

    // Apply filters
    const studentYear = Math.ceil(student.semester / 2);
    if (yearFilter !== "all" && studentYear != yearFilter) return;
    if (branchFilter !== "all" && student.department !== branchFilter) return;
    if (semesterFilter !== "all" && student.semester != semesterFilter) return;

    reportData.push({
      rollNo: student.rollno,
      name: `${student.firstname} ${student.lastname}`,
      dept: student.department,
      sem: student.semester,
      midsem: mark.midsem,
      assignment: mark.assignment,
      attendance: mark.attendance,
      total: parseFloat(mark.total) || 0,
    });
  });

  // Sort High to Low (Default for Report)
  reportData.sort((a, b) => b.total - a.total);

  // --- STATISTICS CALCULATION ---
  let highest = 0,
    lowest = 0,
    average = 0;
  if (reportData.length > 0) {
    const totals = reportData.map((d) => d.total);
    highest = Math.max(...totals);
    lowest = Math.min(...totals);
    const sum = totals.reduce((a, b) => a + b, 0);
    average = Math.round(sum / reportData.length);
  }

  // --- HEADER GENERATION ---
  let selectedClass = allClasses.find((c) => c.id == classId);

  let headerText =
    "==================================================================\n";
  if (selectedClass) {
    headerText += `Internal Marks Report – Subject Code: ${selectedClass.code} : ${selectedClass.name}\n`;
    headerText += `Department: ${selectedClass.department} | Semester: ${selectedClass.semester}\n`;
    headerText += `Faculty: ${selectedClass.faculty}\n`;
  } else {
    headerText += `Internal Marks Report – Consolidated\n`;
    headerText += `Filters: Year: ${yearFilter}, Branch: ${branchFilter}\n`;
  }
  headerText += `Total Students: ${reportData.length}\n`;
  headerText += `Score:\n`;
  headerText += `  Highest → ${highest}\n`;
  headerText += `  Lowest  → ${lowest}\n`;
  headerText += `  Average → ${average}\n`;
  headerText +=
    "==================================================================\n";

  // --- EXPORT HANDLING ---

  if (format === "csv" || format === "excel") {
    let csvContent = headerText + "\n";
    csvContent +=
      "Roll No,Name,Department,Mid-Sem,Assignment,Attendance,Total\n";

    reportData.forEach((row) => {
      csvContent += `${row.rollNo},"${row.name}",${row.dept},${row.midsem},${row.assignment},${row.attendance},${row.total}\n`;
    });

    const filename = selectedClass
      ? `Marks_${selectedClass.code}.csv`
      : `Marks_Consolidated.csv`;
    downloadCSV(csvContent, filename);
  } else if (format === "json") {
    const jsonData = {
      meta: {
        subject: selectedClass ? selectedClass.name : "Consolidated",
        stats: { highest, lowest, average },
        generatedAt: new Date().toISOString(),
      },
      data: reportData,
    };
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Internal_Marks_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (format === "pdf") {
    // Use a simple print window for PDF
    const printWindow = window.open("", "_blank");
    const htmlHeader = headerText
      .replace(/\n/g, "<br>")
      .replace(/  /g, "&nbsp;&nbsp;");

    let htmlContent = `
            <html><head><title>Marks Report</title>
            <style>
                body { font-family: monospace; }
                .header { background: #f4f4f4; padding: 15px; border: 1px solid #ddd; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style></head><body>
            <div class="header">${htmlHeader}</div>
            <table>
                <thead>
                    <tr><th>Roll No</th><th>Name</th><th>Mid-Sem</th><th>Assignment</th><th>Attendance</th><th>Total</th></tr>
                </thead>
                <tbody>
        `;

    reportData.forEach((row) => {
      htmlContent += `<tr>
                <td>${row.rollNo}</td><td>${row.name}</td>
                <td>${row.midsem}</td><td>${row.assignment}</td><td>${row.attendance}</td>
                <td><b>${row.total}</b></td>
            </tr>`;
    });

    htmlContent += `</tbody></table></body></html>`;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }
}

async function exportInternalMarksCSV() {
  const classId = parseInt(
    document.getElementById("adminMarksClassFilter").value
  );
  if (!classId) {
    showToast("Select a class first", "error");
    return;
  }

  const [allStudents, allMarks, allClasses] = await Promise.all([
    getAll("students"),
    getAll("internal_marks"),
    getAll("classes"),
  ]);

  const cls = allClasses.find((c) => c.id === classId);
  const classMarks = allMarks.filter((m) => m.classid === classId);

  let csvContent = `Internal Marks Report - ${cls.code} (${cls.name})\n`;
  csvContent += `Roll No,Name,Mid-Sem,Assignment,Attendance,Total\n`;

  classMarks.forEach((mark) => {
    const student = allStudents.find((s) => s.id === mark.studentid) || {};
    const name = `${student.firstname} ${student.lastname}`.replace(/,/g, "");

    csvContent += `${student.rollno},${name},${mark.midsem},${mark.assignment},${mark.attendance},${mark.total}\n`;
  });

  downloadCSV(csvContent, `InternalMarks_${cls.code}.csv`);
}

// export.js - Handles Data Export & Backup Logic

// Toggle all export checkboxes
function toggleExportCheckboxes(state) {
    const ids = ['expStudents', 'expFaculty', 'expClasses', 'expYears', 'expAttendance', 'expInternalMarks', 'expSettings'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.checked = state;
    });
}

// Update export statistics counters
function updateExportStats() {
    // This function should be called when data loads
    // Update both sets of counters
    const studentCount = document.getElementById('totalStudents')?.textContent || '0';
    const facultyCount = document.getElementById('totalFaculty')?.textContent || '0';
    const classCount = document.getElementById('totalClasses')?.textContent || '0';
    
    // Update first set (in dashboard grid)
    const exportStudent1 = document.getElementById('exportStudentCount1');
    const exportFaculty1 = document.getElementById('exportFacultyCount1');
    const exportClass1 = document.getElementById('exportClassCount1');
    
    if (exportStudent1) exportStudent1.textContent = studentCount;
    if (exportFaculty1) exportFaculty1.textContent = facultyCount;
    if (exportClass1) exportClass1.textContent = classCount;
    
    // Update second set (in export statistics section)
    const exportStudent2 = document.getElementById('exportStudentCount2');
    const exportFaculty2 = document.getElementById('exportFacultyCount2');
    const exportClass2 = document.getElementById('exportClassCount2');
    
    if (exportStudent2) exportStudent2.textContent = studentCount;
    if (exportFaculty2) exportFaculty2.textContent = facultyCount;
    if (exportClass2) exportClass2.textContent = classCount;
}

// Helper: Get all data for a specific table
async function getAll(tableName) {
    try {
        // This should connect to your database
        // For now, using localStorage as example
        const data = localStorage.getItem(tableName);
        if (data) {
            return JSON.parse(data);
        }
        
        // Fallback to dummy data if needed
        switch(tableName) {
            case 'students':
                return [
                    { rollno: "22156148040", firstname: "John", lastname: "Doe", email: "john@college.edu", department: "Computer Science", year: "2", semester: "3" }
                ];
            case 'faculty':
                return [
                    { facultyid: "FAC001", firstname: "Dr. Smith", lastname: "Jones", email: "smith@college.edu", department: "Computer Science", specialization: "AI", password: "hashed_password" }
                ];
            case 'classes':
                return [
                    { code: "CS301", name: "Data Structures", department: "Computer Science", semester: "3", faculty: "Dr. Smith", year: "2024", credits: "3", max_midsem: "20", max_assignment: "10", max_attendance: "10" }
                ];
            case 'academic_years':
                return [
                    { year: "2024", start_date: "2024-01-01", end_date: "2024-12-31" }
                ];
            case 'attendance':
                return [
                    { student_id: "22156148040", class_id: "CS301", date: "2024-10-01", session: "1", status: "present", faculty_id: "FAC001" }
                ];
            case 'internal_marks':
                return [
                    { classid: "CS301", studentid: "22156148040", midsem: "18", assignment: "9", attendance: "10", total: "37" }
                ];
            case 'settings':
                return [
                    { college_name: "Government Engineering College Kaimur", min_attendance_threshold: "75" }
                ];
            default:
                return [];
        }
    } catch (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return [];
    }
}

// Main Export Handler
async function handleCustomExport(format) {
    showToast("Preparing export data...", "info");

    // 1. Identify what to export
    const selection = {
        students: document.getElementById('expStudents').checked,
        faculty: document.getElementById('expFaculty').checked,
        classes: document.getElementById('expClasses').checked,
        academic_years: document.getElementById('expYears').checked,
        attendance: document.getElementById('expAttendance').checked,
        internal_marks: document.getElementById('expInternalMarks').checked,
        settings: document.getElementById('expSettings').checked
    };

    // 2. Fetch Data
    const exportData = {};
    const promises = [];

    for (const [key, isSelected] of Object.entries(selection)) {
        if (isSelected) {
            promises.push(
                getAll(key).then(data => {
                    exportData[key] = data;
                }).catch(error => {
                    console.error(`Error fetching ${key}:`, error);
                    exportData[key] = [];
                })
            );
        }
    }

    try {
        await Promise.all(promises);
    } catch (error) {
        showToast("Error fetching data for export", "error");
        console.error("Export data fetch error:", error);
        return;
    }

    const keysFound = Object.keys(exportData).filter(key => exportData[key].length > 0);
    if (keysFound.length === 0) {
        showToast("No data found for selected options.", "warning");
        return;
    }

    // 3. Handle Formats
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const datetime = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    if (format === 'json') {
        // --- JSON BACKUP ---
        try {
            const finalObj = {
                meta: {
                    version: "3.0",
                    generatedAt: new Date().toISOString(),
                    collegeName: localStorage.getItem('college_name') || "Government Engineering College Kaimur",
                    description: "Academic Management System Backup",
                    exportedTables: keysFound
                },
                data: exportData
            };

            const blob = new Blob([JSON.stringify(finalObj, null, 2)], { type: "application/json" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `AMS_Backup_${datetime}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up URL
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
            
            showToast(`Backup downloaded (${keysFound.length} tables)`, "success");
        } catch (error) {
            showToast("Failed to create JSON backup", "error");
            console.error("JSON export error:", error);
        }

    } else if (format === 'csv') {
        // --- CSV / ZIP EXPORT ---
        try {
            if (typeof JSZip === 'undefined') {
                showToast("JSZip library missing. Please include JSZip in your HTML.", "error");
                return;
            }

            const zip = new JSZip();
            
            // Create a README file
            const readmeContent = `Academic Management System Export
Generated: ${new Date().toISOString()}
Tables exported: ${keysFound.join(', ')}
College: ${localStorage.getItem('college_name') || 'Not specified'}
================================================

Each CSV file contains data from one table.
Column headers are in the first row.
Import using the Bulk Import feature.`;
            
            zip.file("README.txt", readmeContent);
            
            // Convert each table to CSV and add to zip
            for (const key of keysFound) {
                const data = exportData[key];
                if (data && data.length > 0) {
                    const csvStr = convertToCSV(data);
                    zip.file(`${key}.csv`, csvStr);
                }
            }

            // Generate Zip
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `AMS_Export_${datetime}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up URL
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
            
            showToast(`Export downloaded (${keysFound.length} files)`, "success");
        } catch (error) {
            showToast("Failed to create ZIP export", "error");
            console.error("ZIP export error:", error);
        }
    }
}

// Helper: Convert Array of Objects to CSV string
function convertToCSV(objArray) {
    if (!objArray || objArray.length === 0) return "";
    
    // Get headers from first object
    const headers = Object.keys(objArray[0]);
    const csvRows = [];
    
    // Add Header Row
    csvRows.push(headers.join(','));
    
    // Add Data Rows
    for (const row of objArray) {
        const values = headers.map(header => {
            const val = row[header];
            // Handle null/undefined and escape quotes
            if (val === null || val === undefined) {
                return '""';
            }
            // Convert to string and escape quotes
            const strVal = String(val);
            // Escape double quotes by doubling them (CSV standard)
            const escaped = strVal.replace(/"/g, '""');
            // Wrap in quotes if contains comma, newline, or double quote
            if (strVal.includes(',') || strVal.includes('\n') || strVal.includes('"')) {
                return `"${escaped}"`;
            }
            return strVal;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

// Helper: Download Template
function downloadTemplate(type) {
    let csvContent = "";
    
    // Define headers based on DB Schema
    switch(type) {
        case 'students': 
            csvContent = "rollno,firstname,lastname,email,department,year,semester\n22156148040,John,Doe,john@college.edu,Computer Science,2,3";
            break;
        case 'faculty': 
            csvContent = "facultyid,firstname,lastname,email,department,specialization,password\nFAC001,Dr.,Smith,smith@college.edu,Computer Science,AI,password123";
            break;
        case 'classes': 
            csvContent = "code,name,department,semester,faculty,year,credits,max_midsem,max_assignment,max_attendance\nCS301,Data Structures,Computer Science,3,Dr. Smith,2024,3,20,10,10";
            break;
        case 'internal_marks':
            csvContent = "classid,studentid,midsem,assignment,attendance,total\nCS301,22156148040,18,9,10,37";
            break;
        case 'complete_db':
            // Download complete template ZIP
            downloadCompleteDbTemplate();
            return;
        default: 
            showToast("Invalid template type", "error");
            return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Template_${type}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up URL
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
    
    showToast(`Template downloaded: ${type}`, "success");
}

// Download Complete Database Template (ZIP)
async function downloadCompleteDbTemplate() {
    if (typeof JSZip === 'undefined') {
        showToast("JSZip library missing. Cannot create template.", "error");
        return;
    }

    try {
        const zip = new JSZip();
        
        // Add all template files
        const templates = {
            'students.csv': "rollno,firstname,lastname,email,department,year,semester\n22156148040,John,Doe,john@college.edu,Computer Science,2,3\n22156148041,Jane,Smith,jane@college.edu,Computer Science,2,3",
            'faculty.csv': "facultyid,firstname,lastname,email,department,specialization,password\nFAC001,Dr.,Smith,smith@college.edu,Computer Science,AI,password123\nFAC002,Prof.,Jones,jones@college.edu,Mathematics,Calculus,password123",
            'classes.csv': "code,name,department,semester,faculty,year,credits,max_midsem,max_assignment,max_attendance\nCS301,Data Structures,Computer Science,3,Dr. Smith,2024,3,20,10,10\nMA301,Calculus,Mathematics,3,Prof. Jones,2024,4,25,15,10",
            'academic_years.csv': "year,start_date,end_date\n2024,2024-01-01,2024-12-31",
            'attendance.csv': "student_id,class_id,date,session,status,faculty_id,notes\n22156148040,CS301,2024-10-01,1,present,FAC001,\"\"",
            'internal_marks.csv': "classid,studentid,midsem,assignment,attendance,total\nCS301,22156148040,18,9,10,37",
            'settings.csv': "college_name,min_attendance_threshold\nGovernment Engineering College Kaimur,75"
        };

        // Add README
        const readmeContent = `Complete Database Templates for Academic Management System
============================================================

This ZIP contains CSV templates for all data types:

1. students.csv - Student information
2. faculty.csv - Faculty information
3. classes.csv - Class/subject information
4. academic_years.csv - Academic year configuration
5. attendance.csv - Attendance records (optional)
6. internal_marks.csv - Internal marks (optional)
7. settings.csv - System settings

INSTRUCTIONS:
1. Fill each CSV with your data
2. Keep the header row exactly as is
3. Use Bulk Import feature to import each file
4. Import in this order: 
   a) academic_years, b) faculty, c) classes, d) students, e) attendance, f) internal_marks

Note: For attendance and marks, create the records AFTER students and classes are imported.`;
        
        zip.file("README.txt", readmeContent);
        
        // Add all CSV templates
        for (const [filename, content] of Object.entries(templates)) {
            zip.file(filename, content);
        }

        // Generate and download ZIP
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = "Complete_DB_Templates.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up URL
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
        
        showToast("Complete DB templates downloaded as ZIP", "success");
    } catch (error) {
        showToast("Failed to create template ZIP", "error");
        console.error("Template ZIP error:", error);
    }
}

// Export Complete Database (Full Backup)
async function exportCompleteDatabase() {
    // Select all checkboxes
    toggleExportCheckboxes(true);
    
    // Trigger JSON export (full backup)
    await handleCustomExport('json');
}

// Initialize export functionality when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Update export stats after a short delay to ensure data is loaded
    setTimeout(updateExportStats, 1000);
    
    // You might want to listen for data updates and refresh stats
    // For example, when admin panel loads or when students/faculty/classes are updated
});

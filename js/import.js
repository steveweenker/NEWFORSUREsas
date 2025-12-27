// import.js - Data Import Functions with Sanitization
// CORRECTED FOR ALL LOWERCASE COLUMN NAMES

// ========== COLUMN SANITIZATION FUNCTION ==========
// ALL LOWERCASE - MATCHING SUPABASE SCHEMA

function sanitizeRecord(store, record) {
  const validColumns = {
    students: ['id', 'rollno', 'firstname', 'lastname', 'email', 'department', 'year', 'semester', 'createdat'],
    faculty: ['id', 'facultyid', 'firstname', 'lastname', 'email', 'department', 'specialization', 'password', 'createdat'],
    classes: ['id', 'code', 'name', 'department', 'semester', 'faculty', 'year', 'credits', 'createdat'],
    attendance: ['id', 'classid', 'studentid', 'date', 'session', 'status', 'notes', 'createdat'],
    academic_years: ['id', 'year', 'startdate', 'enddate', 'type', 'createdat'],
    settings: ['id', 'key', 'value', 'createdat']
  };

  const cleanedRecord = {};
  const columns = validColumns[store] || [];

  columns.forEach(column => {
    // Find matching key - convert both to lowercase for comparison
    const sourceKey = Object.keys(record).find(key => 
      key.toLowerCase() === column.toLowerCase()
    );

    if (sourceKey && record[sourceKey] !== undefined && record[sourceKey] !== null) {
      cleanedRecord[column] = record[sourceKey];
    }
  });

  return Object.keys(cleanedRecord).length > 0 ? cleanedRecord : record;
}

// ========== FUNCTION 1: importStructuredData ==========

async function importStructuredData(zipContent, progressBar) {
  const stores = ['students', 'faculty', 'classes', 'attendance', 'academic_years', 'settings'];

  for (let i = 0; i < stores.length; i++) {
    const store = stores[i];
    const file = zipContent.file(store + '.json');

    if (file) {
      try {
        const text = await file.async('text');
        const data = JSON.parse(text);

        await clearStore(store);

        for (const item of data) {
          const cleanedItem = sanitizeRecord(store, item);
          await addRecord(store, cleanedItem);
        }

        console.log(`✅ Imported ${data.length} records to ${store}`);

      } catch (error) {
        console.error(`Error importing ${store}:`, error);
      }
    }

    const percent = 60 + Math.round(((i + 1) / stores.length) * 30);
    progressBar.style.width = percent + '%';
    progressBar.textContent = percent + '%';
  }
}

// ========== FUNCTION 2: importIndividualFiles ==========

async function importIndividualFiles(zipContent, progressBar) {
  const fileMappings = {
    students: ['students.json', 'students.csv'],
    faculty: ['faculty.json', 'faculty.csv'],
    classes: ['classes.json', 'classes.csv'],
    attendance: ['attendance.json', 'attendance.csv'],
    academic_years: ['academic_years.json', 'years.json'],
    settings: ['settings.json']
  };

  let processed = 0;
  const total = Object.keys(fileMappings).length;

  for (const [store, possibleFiles] of Object.entries(fileMappings)) {
    for (const fileName of possibleFiles) {
      const file = zipContent.file(fileName);

      if (file) {
        try {
          const text = await file.async('text');
          let data;

          if (fileName.endsWith('.json')) {
            data = JSON.parse(text);
          } else if (fileName.endsWith('.csv')) {
            data = parseCSVToObjects(text);
          }

          if (data && data.length > 0) {
            await clearStore(store);

            for (const item of data) {
              const cleanedItem = sanitizeRecord(store, item);
              await addRecord(store, cleanedItem);
            }

            console.log(`✅ Imported ${data.length} records to ${store}`);
            break;
          }

        } catch (error) {
          console.error(`Error importing from ${fileName}:`, error);
        }
      }
    }

    processed++;
    const percent = 60 + Math.round((processed / total) * 30);
    progressBar.style.width = percent + '%';
    progressBar.textContent = percent + '%';
  }
}

// ========== FUNCTION 3: importFromStructuredJSON ==========

async function importFromStructuredJSON(completeData, progressBar) {
  const stores = ['students', 'faculty', 'classes', 'attendance', 'academic_years', 'settings'];

  for (let i = 0; i < stores.length; i++) {
    const store = stores[i];
    const data = completeData.data[store];

    if (data && Array.isArray(data)) {
      try {
        await clearStore(store);

        for (const item of data) {
          const cleanedItem = sanitizeRecord(store, item);
          await addRecord(store, cleanedItem);
        }

        console.log(`✅ Imported ${data.length} records to ${store}`);

      } catch (error) {
        console.error(`Error importing ${store}:`, error);
      }
    }

    const percent = 60 + Math.round(((i + 1) / stores.length) * 30);
    progressBar.style.width = percent + '%';
    progressBar.textContent = percent + '%';
  }
}

// ========== FUNCTION 4: importFromLegacyJSON ==========

async function importFromLegacyJSON(data, progressBar) {
  const stores = ['students', 'faculty', 'classes', 'attendance', 'academic_years', 'settings'];

  for (let i = 0; i < stores.length; i++) {
    const store = stores[i];

    if (data[store] && Array.isArray(data[store])) {
      try {
        await clearStore(store);

        for (const item of data[store]) {
          const cleanedItem = sanitizeRecord(store, item);
          await addRecord(store, cleanedItem);
        }

        console.log(`✅ Imported ${data[store].length} records to ${store}`);

      } catch (error) {
        console.error(`Error importing ${store}:`, error);
      }
    }

    const percent = 60 + Math.round(((i + 1) / stores.length) * 30);
    progressBar.style.width = percent + '%';
    progressBar.textContent = percent + '%';
  }
}

// ========== CSV PARSER ==========

function parseCSVToObjects(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(',')
    .map(h => h.trim().replace(/^"|"$/g, ''));

  const objects = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;

    // Handle quoted CSV properly
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));

    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });

    objects.push(obj);
  }

  return objects;
}

// ========== MAIN IMPORT HANDLER ==========

async function handleCompleteDbUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const progressDiv = document.getElementById('importProgress') || document.getElementById('completeDbProgress');
  const progressBar = progressDiv?.querySelector('.progress-fill') || document.getElementById('completeDbProgressBar');

  if (progressDiv) progressDiv.style.display = 'block';
  if (progressBar) {
    progressBar.style.width = '10%';
    progressBar.textContent = '10%';
  }

  try {
    if (file.name.endsWith('.zip')) {
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded. Cannot process ZIP files.');
      }

      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      // Check if this is a structured export
      const hasStructuredFiles = (
        zipContent.file('students.json') !== null ||
        zipContent.file('faculty.json') !== null ||
        zipContent.file('classes.json') !== null ||
        zipContent.file('attendance.json') !== null
      );

      if (hasStructuredFiles) {
        await importStructuredData(zipContent, progressBar);
      } else {
        await importIndividualFiles(zipContent, progressBar);
      }

    } else if (file.name.endsWith('.json')) {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.data && typeof data.data === 'object') {
        await importFromStructuredJSON(data, progressBar);
      } else {
        await importFromLegacyJSON(data, progressBar);
      }

    } else {
      throw new Error('Unsupported file format. Please use ZIP or JSON.');
    }

    // Success!
    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.textContent = '100%';
    }

    showToast('✅ Database imported successfully! Refreshing data...', 'success');

    // Reload all data
    await loadStudents();
    await loadFaculty();
    await loadClasses();
    await loadAcademicYears();
    if (typeof updateDashboard === 'function') {
      await updateDashboard();
    }
    if (typeof updateExportStats === 'function') {
      await updateExportStats();
    }

    setTimeout(() => {
      if (progressDiv) progressDiv.style.display = 'none';
    }, 2000);

  } catch (error) {
    console.error('❌ Import error:', error);
    if (typeof showToast === 'function') {
      showToast(`❌ Import failed: ${error.message}`, 'error');
    }
    if (progressDiv) progressDiv.style.display = 'none';
  }

  event.target.value = '';
}

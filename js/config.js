// config.js - Supabase Configuration

const SUPABASE_URL = "https://iqxpnpiimzospvsxgbvb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeHBucGlpbXpvc3B2c3hnYnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzczMTksImV4cCI6MjA4MTkxMzMxOX0.dt9wwOynnIjhsI6mYAeqdWArWuAElyOnuDRCuEpMXU0";

const ADMIN_PASSWORD = "GecKaimur@148";

const branchMap = {
  101: "Civil",
  102: "Mechanical",
  103: "Electrical",
  104: "ECE",
  152: "CSE(Cyber Security)",
  156: "CSE(Networks)",
};

let supabaseClient;

async function initSupabase() {
  const { createClient } = window.supabase;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

let currentUser = null;
let activeStudentFilter = {
  year: "all",
  semester: null,
  branch: "all",
};

let activeClassFilter = {
  year: "all",
  semester: null,
};

let displayedStudents = [];
let selectedStudentIds = new Set();
let pendingAction = null;
let parsedBatchClasses = [];

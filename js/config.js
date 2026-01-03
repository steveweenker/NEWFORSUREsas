// config.js - Supabase Configuration (Env Based)

// Branch Mapping (Static config is fine here)
const branchMap = {
  101: "Civil",
  102: "Mechanical",
  103: "Electrical",
  104: "ECE",
  152: "CSE(Cyber Security)",
  156: "CSE(Networks)",
};

// Global State
let supabaseClient;
let currentUser = null;

// Filter States
let activeStudentFilter = { year: "all", semester: null, branch: "all" };
let activeClassFilter = { year: "all", semester: null };
let displayedStudents = [];
let selectedStudentIds = new Set();
let pendingAction = null;

// Initialize Supabase by fetching keys from Vercel API
async function initSupabase() {
  try {
    // 1. Fetch keys from our secure API endpoint
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('Failed to load configuration');
    
    const config = await response.json();
    
    // 2. Initialize Client
    const { createClient } = window.supabase;
    supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    
    return supabaseClient;
  } catch (error) {
    console.error("Configuration Error:", error);
    // Fallback error handling (e.g. show toast in UI)
    return null;
  }
}

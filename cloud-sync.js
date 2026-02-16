// ==========================================
// Cloud Sync - Dual Mode (Guest + Cloud)
// ==========================================

let supabaseClient = null;
let currentUser = null;
let cloudMode = false; // false = guest mode, true = cloud mode

// ==========================================
// Supabase Configuration
// ==========================================

function initSupabase() {
    // Supabase credentials - pre-configured
    const SUPABASE_URL = 'https://nbvdregcwhcwnrcsvwwk.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idmRyZWdjd2hjd25yY3N2d3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjkzMzIsImV4cCI6MjA4Njc0NTMzMn0.En_2BdCIX8LJikIe6bui5SL9hspCKzPpfcRtE5EQvng';
    
    if (SUPABASE_URL && SUPABASE_KEY && typeof supabase !== 'undefined') {
        try {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log('✅ Supabase initialized');
            return true;
        } catch (e) {
            console.log('⚠️ Supabase not available:', e);
        }
    }
    return false;
}

// ==========================================
// UI Updates
// ==========================================

function updateStorageStatus() {
    const statusEl = document.getElementById('storageStatus');
    const btnEl = document.getElementById('cloudSyncBtn');
    
    if (cloudMode && currentUser) {
        statusEl.innerHTML = '<span class="status-icon">☁️</span><span class="status-text">ענן</span>';
        statusEl.style.background = 'rgba(63, 185, 80, 0.2)';
        btnEl.innerHTML = '<span>☁️</span><span>מחובר</span>';
        btnEl.style.background = 'rgba(63, 185, 80, 0.2)';
    } else {
        statusEl.innerHTML = '<span class="status-icon">💾</span><span class="status-text">מקומי</span>';
        statusEl.style.background = 'rgba(88, 166, 255, 0.2)';
        btnEl.innerHTML = '<span>☁️</span><span>סנכרון</span>';
        btnEl.style.background = '';
    }
}

// ==========================================
// Modal Functions
// ==========================================

function showCloudSync() {
    document.getElementById('cloudSyncModal').style.display = 'flex';
    
    if (cloudMode && currentUser) {
        document.getElementById('guestModeInfo').style.display = 'none';
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loggedInView').style.display = 'block';
        document.getElementById('cloudUserEmail').textContent = currentUser.email;
    } else {
        document.getElementById('guestModeInfo').style.display = 'block';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loggedInView').style.display = 'none';
    }
}

function closeCloudSync() {
    document.getElementById('cloudSyncModal').style.display = 'none';
}

function showCloudRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showCloudLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

// ==========================================
// Authentication
// ==========================================

async function cloudRegister() {
    if (!supabaseClient) {
        alert('❌ שגיאה: לא ניתן להתחבר לשרת. נא לנסות שוב מאוחר יותר.');
        return;
    }
    
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    
    if (!email || !password) {
        alert('נא למלא את כל השדות');
        return;
    }
    
    if (password !== confirm) {
        alert('הסיסמאות אינן תואמות');
        return;
    }
    
    if (password.length < 6) {
        alert('הסיסמה חייבת להכיל לפחות 6 תווים');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: undefined,
                data: {
                    email_confirmed: true
                }
            }
        });
        
        if (error) throw error;
        
        // Auto-login after successful registration
        if (data && data.user) {
            currentUser = data.user;
            cloudMode = true;
            
            // Upload local data to cloud
            await uploadLocalDataToCloud();
            
            // Start real-time sync
            setupRealtimeSync();
            
            updateStorageStatus();
            closeCloudSync();
            
            alert('✅ נרשמת בהצלחה והתחברת לענן!');
        } else {
            alert('✅ נרשמת בהצלחה! כעת תוכל להתחבר.');
            showCloudLogin();
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('❌ שגיאה ברישום: ' + error.message);
    }
}

async function cloudLogin() {
    if (!supabaseClient) {
        alert('❌ שגיאה: לא ניתן להתחבר לשרת. נא לנסות שוב מאוחר יותר.');
        return;
    }
    
    const email = document.getElementById('cloudEmail').value.trim();
    const password = document.getElementById('cloudPassword').value;
    
    if (!email || !password) {
        alert('נא למלא אימייל וסיסמה');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        cloudMode = true;
        
        // Check if user has cloud data
        const { data: existingData, error: fetchError } = await supabaseClient
            .from('plans')
            .select('*')
            .eq('user_id', currentUser.id)
            .limit(1);
        
        if (fetchError) throw fetchError;
        
        if (existingData && existingData.length > 0) {
            // User has cloud data - load it
            await loadDataFromCloud();
            alert('✅ התחברת בהצלחה! הנתונים מהענן נטענו.');
        } else {
            // No cloud data - upload local data
            await uploadLocalDataToCloud();
            alert('✅ התחברת בהצלחה! הנתונים המקומיים הועלו לענן.');
        }
        
        // Start real-time sync
        setupRealtimeSync();
        
        updateStorageStatus();
        closeCloudSync();
        
    } catch (error) {
        console.error('Login error:', error);
        alert('❌ שגיאה בהתחברות: ' + error.message);
    }
}

async function cloudLogout() {
    if (!confirm('האם אתה בטוח שברצונך להתנתק? הנתונים ימשיכו להישמר מקומית.')) return;
    
    try {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        currentUser = null;
        cloudMode = false;
        updateStorageStatus();
        closeCloudSync();
        console.log('✅ Logged out - continuing in guest mode');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ==========================================
// Data Sync
// ==========================================

async function uploadLocalDataToCloud() {
    if (!currentUser || !supabaseClient) {
        alert('🔍 DEBUG: No user or client');
        return;
    }
    
    try {
        alert('📤 DEBUG: Starting upload...');
        console.log('📤 Uploading local data to cloud...');
        
        // Get local data
        const localData = localStorage.getItem('financialPlannerData');
        if (!localData) {
            alert('🔍 DEBUG: No local data found');
            console.log('No local data to upload');
            return;
        }
        
        alert('📦 DEBUG: Found local data, parsing...');
        const appData = JSON.parse(localData);
        
        alert(`📊 DEBUG: Data has ${appData.plans?.length || 0} plans`);
        
        // Check if user already has a plan entry
        alert('🔍 DEBUG: Checking existing data...');
        const { data: existingPlans, error: fetchError } = await supabaseClient
            .from('plans')
            .select('*')
            .eq('user_id', currentUser.id)
            .limit(1);
        
        if (fetchError) {
            alert('❌ DEBUG: Fetch error: ' + fetchError.message);
            throw fetchError;
        }
        
        alert(`📋 DEBUG: Found ${existingPlans?.length || 0} existing plans`);
        
        // Upsert all data as single JSONB entry
        alert('💾 DEBUG: Saving to cloud...');
        const { error: upsertError } = await supabaseClient
            .from('plans')
            .upsert({
                id: existingPlans && existingPlans.length > 0 ? existingPlans[0].id : undefined,
                user_id: currentUser.id,
                data: appData,
                updated_at: new Date().toISOString()
            });
        
        if (upsertError) {
            alert('❌ DEBUG: Save error: ' + upsertError.message);
            console.error('❌ Upload error:', upsertError);
            throw upsertError;
        }
        
        alert('✅ DEBUG: Data saved successfully!');
        console.log('✅ Data uploaded successfully');
    } catch (error) {
        alert('❌ DEBUG: Exception: ' + error.message);
        console.error('❌ Error uploading to cloud:', error);
        throw error;
    }
}

async function loadDataFromCloud() {
    if (!currentUser || !supabaseClient) return;
    
    try {
        console.log('📥 Loading data from cloud...');
        
        // Load user's data (stored as single JSONB entry)
        const { data: plansData, error: plansError } = await supabaseClient
            .from('plans')
            .select('*')
            .eq('user_id', currentUser.id)
            .limit(1);
        
        if (plansError) throw plansError;
        
        if (plansData && plansData.length > 0) {
            const cloudData = plansData[0].data;
            
            // Save to localStorage
            localStorage.setItem('financialPlannerData', JSON.stringify(cloudData));
            
            // Reload the app data
            if (window.loadData && typeof window.loadData === 'function') {
                window.loadData();
            }
            
            console.log('✅ Data loaded from cloud and applied');
        } else {
            console.log('ℹ️ No cloud data found for this user');
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function setupRealtimeSync() {
    if (!currentUser || !supabaseClient) return;
    
    // Subscribe to changes in plans table
    const channel = supabaseClient
        .channel('data-changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'plans',
                filter: `user_id=eq.${currentUser.id}`
            },
            (payload) => {
                console.log('📡 Real-time update:', payload);
                loadDataFromCloud();
            }
        )
        .subscribe();
    
    console.log('✅ Real-time sync enabled');
}

// ==========================================
// Supabase Configuration Helper
// ==========================================

// ==========================================
// Initialize on load
// ==========================================

// Wait for both DOM and main script to load
window.addEventListener('load', async () => {
    // Setup cloud sync override AFTER main script loads
    setupCloudSyncOverride();
    
    // Try to initialize Supabase
    initSupabase();
    
    // Check if user is already logged in
    if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            cloudMode = true;
            setupRealtimeSync();
        }
    }
    
    updateStorageStatus();
});

// Setup cloud sync to hook into saveData
function setupCloudSyncOverride() {
    // Store reference to original saveData
    const originalSaveData = window.saveData;
    
    // Override saveData to add cloud sync
    window.saveData = async function() {
        // Call original saveData (saves to localStorage)
        if (originalSaveData && typeof originalSaveData === 'function') {
            originalSaveData();
        }
        
        // If in cloud mode, ALSO save directly to cloud
        if (cloudMode && currentUser && supabaseClient) {
            try {
                // Get the data that was just saved
                const localData = localStorage.getItem('financialPlannerData');
                if (!localData) return;
                
                const appData = JSON.parse(localData);
                
                // Direct save to Supabase
                const { error } = await supabaseClient
                    .from('plans')
                    .upsert({
                        user_id: currentUser.id,
                        data: appData,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'user_id'
                    });
                
                if (error) {
                    console.error('❌ Cloud save error:', error);
                } else {
                    console.log('✅ Saved to cloud');
                }
            } catch (err) {
                console.error('❌ Cloud sync error:', err);
            }
        }
    };
}

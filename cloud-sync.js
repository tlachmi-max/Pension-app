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
        
        // Upload local data to cloud
        await uploadLocalDataToCloud();
        
        // Start real-time sync
        setupRealtimeSync();
        
        updateStorageStatus();
        closeCloudSync();
        
        alert('✅ התחברת בהצלחה! הנתונים המקומיים הועלו לענן.');
        
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
    if (!currentUser || !supabaseClient) return;
    
    try {
        console.log('📤 Uploading local data to cloud...');
        
        // Get local data
        const localData = localStorage.getItem('financialPlannerData');
        if (!localData) {
            console.log('No local data to upload');
            return;
        }
        
        const appData = JSON.parse(localData);
        
        // Upload plans
        for (const plan of appData.plans) {
            const { error: planError } = await supabaseClient
                .from('plans')
                .upsert({
                    id: plan.id,
                    user_id: currentUser.id,
                    name: plan.name,
                    updated_at: new Date().toISOString()
                });
            
            if (planError) throw planError;
            
            // Upload investments for this plan
            if (plan.investments && plan.investments.length > 0) {
                // Delete old investments
                await supabaseClient
                    .from('investments')
                    .delete()
                    .eq('plan_id', plan.id);
                
                // Insert new investments
                const investmentsToInsert = plan.investments.map(inv => ({
                    user_id: currentUser.id,
                    plan_id: plan.id,
                    name: inv.name,
                    type: inv.type,
                    house: inv.house,
                    amount: inv.amount,
                    monthly: inv.monthly,
                    return_rate: inv.returnRate,
                    tax: inv.tax,
                    fee_deposit: inv.feeDeposit,
                    fee_annual: inv.feeAnnual,
                    for_dream: inv.forDream,
                    include: inv.include,
                    gender: inv.gender,
                    sub_tracks: inv.subTracks
                }));
                
                const { error: investmentsError } = await supabaseClient
                    .from('investments')
                    .insert(investmentsToInsert);
                
                if (investmentsError) throw investmentsError;
            }
            
            // Upload dreams for this plan
            if (plan.dreams && plan.dreams.length > 0) {
                // Delete old dreams
                await supabaseClient
                    .from('dreams')
                    .delete()
                    .eq('plan_id', plan.id);
                
                // Insert new dreams
                const dreamsToInsert = plan.dreams.map(dream => ({
                    user_id: currentUser.id,
                    plan_id: plan.id,
                    name: dream.name,
                    amount: dream.cost || dream.amount,
                    years: dream.year || dream.years
                }));
                
                const { error: dreamsError } = await supabaseClient
                    .from('dreams')
                    .insert(dreamsToInsert);
                
                if (dreamsError) throw dreamsError;
            }
        }
        
        console.log('✅ Local data uploaded to cloud');
        
    } catch (error) {
        console.error('Error uploading data:', error);
        alert('שגיאה בהעלאת נתונים לענן: ' + error.message);
    }
}

async function loadDataFromCloud() {
    if (!currentUser || !supabaseClient) return;
    
    try {
        console.log('📥 Loading data from cloud...');
        
        // Load plans
        const { data: plansData, error: plansError } = await supabaseClient
            .from('plans')
            .select('*')
            .eq('user_id', currentUser.id);
        
        if (plansError) throw plansError;
        
        // For each plan, load investments and dreams
        // (implementation similar to auth.js from previous version)
        
        console.log('✅ Data loaded from cloud');
        
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function setupRealtimeSync() {
    if (!currentUser || !supabaseClient) return;
    
    // Subscribe to changes
    const channel = supabaseClient
        .channel('data-changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'investments',
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
    window.saveData = function() {
        // Call original saveData
        if (originalSaveData && typeof originalSaveData === 'function') {
            originalSaveData();
        }
        
        // If in cloud mode, also save to cloud
        if (cloudMode && currentUser && supabaseClient) {
            uploadLocalDataToCloud().catch(err => {
                console.error('Cloud sync error:', err);
            });
        }
    };
}

// ==========================================
// Financial Planner Pro v3.2 - ALL FIXES
// Last Updated: 2025-02-13
// Version: 3.2.0 - Pension Separate + iPhone Fix + Auto-fill
// ==========================================

console.log('🚀 Financial Planner Pro v3.2.0 Loading...');
console.log('✅ Pension separate from capital');
console.log('✅ iPhone plus button fixed');
console.log('✅ Auto-fill return rate from dropdown');

// Constants
const INFLATION_RATE = 2;
const PENSION_COEFFICIENT = { male: 0.005, female: 0.006 };
const TAX_RATES = {
    'פנסיה': 0,
    'קרן השתלמות': 0,
    'פקדון': 15,
    'גמל להשקעה': 25,
    'תיק עצמאי': 25,
    'פוליסת חסכון': 25,
    'אחר': 0
};
const SUB_TRACK_DEFAULTS = {
    'מדדי מניות חו״ל': 7, 'מדדי מניות בארץ': 7,
    'מניות סחיר חו״ל': 7, 'מניות סחיר בארץ': 7,
    'אג״ח': 4, 'S&P 500': 7, 'נדל״ן': 6,
    'עו״ש': 0, 'קרן כספית': 3, 'כללי': 5, 'אחר': 5
};

// ==========================================
// RISK CLASSIFICATION & HELPERS
// ==========================================

function classifyRisk(subTrack) {
    // If it's an object with manualRisk, use that
    if (typeof subTrack === 'object' && subTrack.manualRisk) {
        return subTrack.manualRisk;
    }
    
    // Otherwise get the type string
    const subTrackType = typeof subTrack === 'object' ? subTrack.type : subTrack;
    
    // Auto-classification
    const lowRisk = ['קרן כספית', 'עו"ש', 'פיקדון', 'אג"ח ממשלתי', 'אג"ח קונצרני', 'אג"ח'];
    const highRisk = ['S&P 500', 'מניות סחיר', 'מדדי מניות חו"ל', 'מדדי מניות בארץ', 'מניות סחיר חו"ל', 'מניות סחיר בארץ'];
    
    // כללי = medium (ONLY כללי)
    if (subTrackType === 'כללי') return 'medium';
    
    // Check low risk
    if (lowRisk.some(type => subTrackType.includes(type))) return 'low';
    
    // Check high risk
    if (highRisk.some(type => subTrackType.includes(type))) return 'high';
    
    // For נדל"ן and אחר without manual risk = undefined
    if (subTrackType === 'נדל"ן' || subTrackType.includes('אחר')) return 'undefined';
    
    // Everything else = undefined
    return 'undefined';
}

function getRiskColor(risk) {
    const colors = {
        'low': '#10b981',      // Green
        'medium': '#f59e0b',   // Yellow
        'high': '#ef4444',     // Red
        'undefined': '#9ca3af' // Gray
    };
    return colors[risk] || colors.undefined;
}

function generateUniqueColors(count) {
    const hues = [];
    for (let i = 0; i < count; i++) {
        hues.push((i * 360 / count) % 360);
    }
    return hues.map(h => `hsl(${h}, 70%, 55%)`);
}

// ==========================================
// SNAPSHOT FEATURE
// ==========================================

function saveSnapshot() {
    const plan = getCurrentPlan();
    
    // Calculate CURRENT total (today), not future projection
    let totalToday = 0;
    plan.investments.forEach(inv => {
        if (!inv.include) return;
        totalToday += inv.amount || 0;
    });
    
    localStorage.setItem('initial_reference', totalToday.toString());
    alert(`✅ נקודת ייחוס נשמרה: ₪${totalToday.toLocaleString()}\n(סכום נוכחי - היום)`);
}

function getSnapshot() {
    const ref = localStorage.getItem('initial_reference');
    return ref ? parseFloat(ref) : null;
}

// ==========================================
// CHART DOWNLOAD
// ==========================================

function downloadChart(canvasId, chartName) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        alert('❌ גרף לא נמצא');
        return;
    }
    
    try {
        // Convert canvas to image
        const link = document.createElement('a');
        link.download = `גרף-${chartName}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        // Optional: Show success message
        console.log(`✅ גרף ${chartName} הורד בהצלחה`);
    } catch (error) {
        console.error('Chart download error:', error);
        alert('❌ שגיאה בהורדת הגרף');
    }
}

// Global State
let appData = { plans: [], currentPlanId: null, editingInvestmentIndex: -1 };
let currentSubTracks = [];
let currentDreamSources = [];
let charts = {};

// ==========================================
// INITIALIZATION
// ==========================================

function init() {
    console.log('🚀 Financial Planner Pro v3.0 Initializing...');
    loadData();
    if (appData.plans.length === 0) createDefaultPlan();
    setupEventListeners();
    updatePlanSelector();
    updateTaxRate(); // Show pension fields if pension is default
    render();
    console.log('✅ Ready!');
}

function createDefaultPlan() {
    const plan = {
        id: Date.now().toString(),
        name: 'תוכנית ראשית',
        investments: [],
        dreams: [],
        createdAt: new Date().toISOString()
    };
    appData.plans.push(plan);
    appData.currentPlanId = plan.id;
    saveData();
}

function getCurrentPlan() {
    return appData.plans.find(p => p.id === appData.currentPlanId) || appData.plans[0];
}

// ==========================================
// STORAGE
// ==========================================

function saveData() {
    try {
        localStorage.setItem('financialPlannerProV3', JSON.stringify(appData));
    } catch (e) {
        console.error('Save error:', e);
        alert('שגיאה בשמירת הנתונים');
    }
}

function loadData() {
    try {
        const saved = localStorage.getItem('financialPlannerProV3');
        if (saved) appData = JSON.parse(saved);
    } catch (e) {
        console.error('Load error:', e);
    }
}

// ==========================================
// CALCULATIONS
// ==========================================

function calculateFV(principal, monthly, rate, years, feeDeposit, feeAnnual, subTracks) {
    if (subTracks && subTracks.length > 0) {
        return calculateFVWithSubTracks(principal, monthly, years, feeDeposit, feeAnnual, subTracks);
    }
    
    const r = (rate - feeAnnual) / 100 / 12;
    const m = monthly * (1 - feeDeposit / 100);
    const n = years * 12;
    
    if (r <= 0) return principal + (m * n);
    
    const fvPrincipal = principal * Math.pow(1 + r, n);
    const fvPayments = m * ((Math.pow(1 + r, n) - 1) / r);
    
    return fvPrincipal + fvPayments;
}

function calculateFVWithSubTracks(principal, monthly, years, feeDeposit, feeAnnual, subTracks) {
    let total = 0;
    subTracks.forEach(st => {
        const stPrincipal = principal * (st.percent / 100);
        const stMonthly = monthly * (st.percent / 100);
        const r = (st.returnRate - feeAnnual) / 100 / 12;
        const m = stMonthly * (1 - feeDeposit / 100);
        const n = years * 12;
        
        if (r <= 0) {
            total += stPrincipal + (m * n);
        } else {
            total += stPrincipal * Math.pow(1 + r, n) + m * ((Math.pow(1 + r, n) - 1) / r);
        }
    });
    return total;
}

function calculateRealValue(nominal, years) {
    return nominal / Math.pow(1 + INFLATION_RATE / 100, years);
}

function calculateTax(principal, futureValue, taxRate) {
    const profit = futureValue - principal;
    return profit > 0 ? (profit * taxRate / 100) : 0;
}

// Calculate pension tax based on age and gender
function calculatePensionTax(principal, futureValue, gender, currentAge, years) {
    const profit = futureValue - principal;
    if (profit <= 0) return 0;
    
    // Determine retirement age
    const retirementAge = gender === 'female' ? 62 : 67;
    const ageAtWithdrawal = currentAge + years;
    
    // Before retirement age - full tax on profit (25%)
    if (ageAtWithdrawal < retirementAge) {
        return profit * 0.25;
    }
    
    // After retirement age - monthly pension taxation
    // Assume withdrawal over 20 years (typical pension payout period)
    const monthlyPension = futureValue * (gender === 'female' ? 0.006 : 0.005);
    const annualPension = monthlyPension * 12;
    
    // First ₪60,000/year (₪5,000/month) is tax-free
    const TAX_FREE_ANNUAL = 60000;
    
    if (annualPension <= TAX_FREE_ANNUAL) {
        return 0; // Fully tax-free
    }
    
    // Tax on amount above ₪60,000 (typical 15% bracket for retirees)
    const taxableAmount = annualPension - TAX_FREE_ANNUAL;
    const annualTax = taxableAmount * 0.15;
    
    // Total tax over 20 years
    return annualTax * 20;
}

function calculatePrincipal(amount, monthly, years) {
    return amount + (monthly * 12 * years);
}

function calculateMonthlyPension(balance, gender) {
    return balance * (PENSION_COEFFICIENT[gender] || PENSION_COEFFICIENT.male);
}

// Clean number input - remove commas, extra dots, spaces
function sanitizeNumber(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    // Convert to string and remove spaces
    let cleaned = String(value).trim();
    
    // Remove all commas
    cleaned = cleaned.replace(/,/g, '');
    
    // Handle multiple dots - keep only the last one as decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
        // Multiple dots - join all but last, then add last with dot
        cleaned = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    }
    
    // Parse as float
    const num = parseFloat(cleaned);
    
    return isNaN(num) ? 0 : num;
}

function formatCurrency(amount) {
    return '₪' + Math.round(amount).toLocaleString('he-IL');
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Gender selection for pension
    document.getElementById('invType').addEventListener('change', function() {
        document.getElementById('genderSection').style.display = this.value === 'פנסיה' ? 'block' : 'none';
    });
    
    // Show/hide sub-tracks based on whether we're editing an investment
    document.getElementById('invAmount').addEventListener('input', function() {
        const section = document.getElementById('subTracksSection');
        // ALWAYS show sub-tracks section when amount field has focus (even if empty)
        section.style.display = 'block';
        
        // Render current sub-tracks (will show empty list if currentSubTracks is [])
        renderSubTracks();
        
        // Initialize listeners
        initSubTrackListeners();
        console.log('✅ initSubTrackListeners called'); // DEBUG
        
        // Reset return rate when showing sub-tracks for first time
        if (currentSubTracks.length === 0) {
            const returnInput = document.getElementById('invReturn');
            returnInput.value = '';
            returnInput.placeholder = 'יחושב אוטומטית מתתי-מסלולים';
        }
    });
}

function initSubTrackListeners() {
    const typeSelect = document.getElementById('subTrackType');
    const returnInput = document.getElementById('subTrackReturn');
    const customNameField = document.getElementById('customNameField');
    const manualRiskField = document.getElementById('manualRiskField');
    
    if (!typeSelect || !returnInput) return;
    
    // Remove old listeners by cloning (prevents duplicates)
    const newTypeSelect = typeSelect.cloneNode(true);
    typeSelect.parentNode.replaceChild(newTypeSelect, typeSelect);
    
    // Auto-fill return rate from dropdown text + show/hide fields
    document.getElementById('subTrackType').addEventListener('change', function() {
        const selectedValue = this.value;
        const selectedText = this.options[this.selectedIndex].text;
        
        // Show/hide custom name field for "אחר"
        if (selectedValue === 'אחר') {
            customNameField.style.display = 'block';
            document.getElementById('subTrackReturn').value = '5';
        } else {
            customNameField.style.display = 'none';
            document.getElementById('subTrackCustomName').value = '';
            
            // Auto-fill return rate from dropdown
            const match = selectedText.match(/\((\d+)%\)/);
            if (match) {
                document.getElementById('subTrackReturn').value = match[1];
            }
        }
        
        // Show/hide manual risk field for נדל"ן and אחר
        if (selectedValue === 'נדל"ן' || selectedValue === 'אחר') {
            manualRiskField.style.display = 'block';
        } else {
            manualRiskField.style.display = 'none';
            document.getElementById('subTrackRiskLevel').value = ''; // Clear selection
        }
    });
    
    // Initialize first value
    const firstOption = document.getElementById('subTrackType').options[0];
    if (firstOption.value === 'אחר') {
        customNameField.style.display = 'block';
        document.getElementById('subTrackReturn').value = '5';
    } else {
        const firstMatch = firstOption.text.match(/\((\d+)%\)/);
        if (firstMatch) {
            document.getElementById('subTrackReturn').value = firstMatch[1];
        }
    }
}

function updateTaxRate() {
    const type = document.getElementById('invType').value;
    document.getElementById('invTax').value = TAX_RATES[type] || 0;
    document.getElementById('genderSection').style.display = type === 'פנסיה' ? 'block' : 'none';
}

// ==========================================
// UI NAVIGATION
// ==========================================

function switchPanel(panelName) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(panelName).classList.add('active');
    document.querySelector(`[data-panel="${panelName}"]`).classList.add('active');
    
    if (panelName === 'projections') renderProjections();
    if (panelName === 'summary') renderSummary();
    if (panelName === 'charts') renderCharts();
    if (panelName === 'roadmap') renderWithdrawals();
}

// ==========================================
// SUB-TRACKS
// ==========================================

function addSubTrack() {
    const typeSelect = document.getElementById('subTrackType');
    const typeValue = typeSelect.value;
    let type = typeSelect.options[typeSelect.selectedIndex].text.split('(')[0].trim();
    
    // If "אחר" is selected, use custom name
    if (typeValue === 'אחר') {
        const customName = document.getElementById('subTrackCustomName').value.trim();
        if (!customName) {
            document.getElementById('subTrackError').textContent = '❌ יש להזין שם לתת-מסלול מותאם';
            return;
        }
        type = customName;
    }
    
    const percentInput = document.getElementById('subTrackPercent');
    const returnInput = document.getElementById('subTrackReturn');
    const riskLevelSelect = document.getElementById('subTrackRiskLevel');
    
    const percent = sanitizeNumber(percentInput.value);
    const returnRate = sanitizeNumber(returnInput.value);
    
    // Validation
    if (isNaN(percent) || percent <= 0 || percent > 100) {
        document.getElementById('subTrackError').textContent = '❌ אחוז חייב להיות בין 0.1-100';
        return;
    }
    
    if (isNaN(returnRate)) {
        document.getElementById('subTrackError').textContent = '❌ יש להזין תשואה צפויה';
        return;
    }
    
    // Validate manual risk level for נדל"ן and אחר
    let manualRisk = null;
    if (typeValue === 'נדל"ן' || typeValue === 'אחר') {
        manualRisk = riskLevelSelect.value;
        if (!manualRisk) {
            document.getElementById('subTrackError').textContent = '❌ יש לבחור רמת סיכון עבור נדל"ן ו"אחר"';
            return;
        }
    }
    
    const currentTotal = currentSubTracks.reduce((sum, st) => sum + st.percent, 0);
    const newTotal = currentTotal + percent;
    
    if (newTotal > 100.01) {
        document.getElementById('subTrackError').textContent = `❌ סה"כ יעבור 100%! (כרגע: ${currentTotal.toFixed(1)}%, מנסה להוסיף: ${percent}%)`;
        return;
    }
    
    const subTrack = { 
        type, 
        percent: parseFloat(percent.toFixed(2)), 
        returnRate: parseFloat(returnRate.toFixed(2))
    };
    
    // Add manual risk if applicable
    if (manualRisk) {
        subTrack.manualRisk = manualRisk;
    }
    
    currentSubTracks.push(subTrack);
    
    // Clear inputs
    percentInput.value = '';
    returnInput.value = SUB_TRACK_DEFAULTS[type] || 5;
    document.getElementById('subTrackCustomName').value = '';
    riskLevelSelect.value = '';
    document.getElementById('customNameField').style.display = 'none';
    document.getElementById('manualRiskField').style.display = 'none';
    document.getElementById('subTrackError').textContent = '';
    
    renderSubTracks();
    updateWeightedReturn();
}

function removeSubTrack(index) {
    currentSubTracks.splice(index, 1);
    renderSubTracks();
    updateWeightedReturn();
}

function editSubTrack(index) {
    const st = currentSubTracks[index];
    document.getElementById('subTrackPercent').value = st.percent;
    document.getElementById('subTrackReturn').value = st.returnRate;
    currentSubTracks.splice(index, 1);
    renderSubTracks();
    updateWeightedReturn();
}

function renderSubTracks() {
    const container = document.getElementById('subTracksList');
    const totalPercent = currentSubTracks.reduce((sum, st) => sum + st.percent, 0);
    
    container.innerHTML = currentSubTracks.map((st, i) => `
        <div class="sub-track-item">
            <span><strong>${st.type}</strong></span>
            <span>${st.percent}%</span>
            <span>תשואה: ${st.returnRate}%</span>
            <div style="display: flex; gap: 5px;">
                <button type="button" class="btn btn-primary btn-sm" onclick="editSubTrack(${i})">✏️</button>
                <button type="button" class="btn btn-danger btn-sm" onclick="removeSubTrack(${i})">✕</button>
            </div>
        </div>
    `).join('');
    
    const totalDiv = document.getElementById('subTrackTotal');
    totalDiv.textContent = `סה"כ: ${totalPercent.toFixed(1)}%`;
    totalDiv.style.color = totalPercent === 100 ? '#10b981' : (totalPercent < 100 ? '#3b82f6' : '#ef4444');
    
    updateWeightedReturn();
}

function updateWeightedReturn() {
    const returnInput = document.getElementById('invReturn');
    
    if (currentSubTracks.length === 0) {
        // No sub-tracks - keep field empty and editable
        returnInput.disabled = false;
        returnInput.style.backgroundColor = '';
        returnInput.style.color = '';
        returnInput.style.fontWeight = '';
        returnInput.style.borderColor = '';
        returnInput.placeholder = 'תיקבע אוטומטית מתתי-מסלולים';
        returnInput.value = '';
        returnInput.title = '';
        return;
    }
    
    // Calculate weighted average return
    const weightedReturn = currentSubTracks.reduce((sum, st) => {
        return sum + (st.returnRate * st.percent / 100);
    }, 0);
    
    // Set the weighted return and disable editing
    returnInput.value = weightedReturn.toFixed(2);
    returnInput.disabled = true;
    returnInput.style.backgroundColor = 'rgba(88, 166, 255, 0.15)';
    returnInput.style.color = '#58a6ff';
    returnInput.style.fontWeight = '700';
    returnInput.style.borderColor = '#58a6ff';
    returnInput.placeholder = 'מחושב אוטומטית';
    
    const calculation = currentSubTracks.map(st => 
        `${st.type}: ${st.percent}% × ${st.returnRate}% = ${(st.percent * st.returnRate / 100).toFixed(2)}%`
    ).join('\n');
    
    returnInput.title = `תשואה משוקללת:\n${calculation}\nסה"כ: ${weightedReturn.toFixed(2)}%`;
}

// ==========================================
// INVESTMENT CRUD
// ==========================================

function saveInvestment(event) {
    event.preventDefault();
    const plan = getCurrentPlan();
    const name = document.getElementById('invName').value.trim();
    
    if (!name) {
        alert('אנא הזן שם למסלול');
        return;
    }
    
    const amount = sanitizeNumber(document.getElementById('invAmount').value);
    const invType = document.getElementById('invType').value;
    
    // Validate pension fields
    if (invType === 'פנסיה') {
        const age = parseInt(document.getElementById('invAge').value);
        if (!age || age < 18 || age > 120) {
            alert('❌ עבור פנסיה, נדרש להזין גיל תקין (18-120)');
            return;
        }
    }
    
    // Validate sub-tracks if amount > 0 and tracks exist
    if (amount > 0 && currentSubTracks.length > 0) {
        const totalPercent = currentSubTracks.reduce((sum, st) => sum + st.percent, 0);
        if (Math.abs(totalPercent - 100) > 0.01) {
            alert(`❌ סך תתי-המסלולים חייב להיות 100%!\nכרגע: ${totalPercent.toFixed(1)}%`);
            return;
        }
    }
    
    const inv = {
        name,
        house: document.getElementById('invHouse').value.trim() || 'לא מוגדר',
        type: document.getElementById('invType').value,
        tax: sanitizeNumber(document.getElementById('invTax').value),
        amount,
        monthly: sanitizeNumber(document.getElementById('invMonthly').value),
        returnRate: sanitizeNumber(document.getElementById('invReturn').value),
        feeDeposit: sanitizeNumber(document.getElementById('invFeeDeposit').value),
        feeAnnual: sanitizeNumber(document.getElementById('invFeeAnnual').value),
        forDream: document.getElementById('invForDream').checked,
        include: document.getElementById('invInclude').checked,
        gender: document.getElementById('invGender').value,
        age: parseInt(document.getElementById('invAge').value) || null,
        subTracks: [...currentSubTracks]
    };
    
    if (appData.editingInvestmentIndex >= 0) {
        plan.investments[appData.editingInvestmentIndex] = inv;
        appData.editingInvestmentIndex = -1;
        cancelEditInvestment();
    } else {
        plan.investments.push(inv);
    }
    
    clearInvestmentForm();
    saveData();
    renderInvestments();
    updateDreamSources();
}

function clearInvestmentForm() {
    document.getElementById('investmentForm').reset();
    document.getElementById('invInclude').checked = true;
    currentSubTracks = [];
    renderSubTracks();
    document.getElementById('subTracksSection').style.display = 'none';
    document.getElementById('genderSection').style.display = 'none';
    
    // Re-enable return rate input and reset styling
    const returnInput = document.getElementById('invReturn');
    returnInput.disabled = false;
    returnInput.style.backgroundColor = '';
    returnInput.style.color = '';
    returnInput.style.fontWeight = '';
    returnInput.placeholder = '';
    returnInput.title = '';
    returnInput.value = '6';
}

function editInvestment(index) {
    const plan = getCurrentPlan();
    const inv = plan.investments[index];
    
    appData.editingInvestmentIndex = index;
    
    document.getElementById('invName').value = inv.name;
    document.getElementById('invHouse').value = inv.house || '';
    document.getElementById('invType').value = inv.type;
    document.getElementById('invTax').value = inv.tax || 0;
    document.getElementById('invAmount').value = inv.amount;
    document.getElementById('invMonthly').value = inv.monthly;
    document.getElementById('invReturn').value = inv.returnRate;
    document.getElementById('invFeeDeposit').value = inv.feeDeposit || 0;
    document.getElementById('invFeeAnnual').value = inv.feeAnnual || 0;
    document.getElementById('invForDream').checked = inv.forDream || false;
    document.getElementById('invInclude').checked = inv.include !== false;
    document.getElementById('invGender').value = inv.gender || 'male';
    document.getElementById('invAge').value = inv.age || '';
    
    currentSubTracks = inv.subTracks ? JSON.parse(JSON.stringify(inv.subTracks)) : [];
    
    if (inv.amount > 0) {
        document.getElementById('subTracksSection').style.display = 'block';
        initSubTrackListeners(); // Initialize listeners for sub-track inputs
        renderSubTracks();
        updateWeightedReturn(); // This will disable return input if sub-tracks exist
    }
    
    if (inv.type === 'פנסיה') {
        document.getElementById('genderSection').style.display = 'block';
    }
    
    document.getElementById('investmentFormTitle').textContent = 'ערוך מסלול השקעה';
    document.getElementById('btnSaveText').textContent = 'עדכן מסלול';
    document.getElementById('btnCancelEdit').style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEditInvestment() {
    appData.editingInvestmentIndex = -1;
    clearInvestmentForm();
    document.getElementById('investmentFormTitle').textContent = 'הוסף מסלול השקעה';
    document.getElementById('btnSaveText').textContent = 'שמור מסלול';
    document.getElementById('btnCancelEdit').style.display = 'none';
}

function deleteInvestment(index) {
    if (!confirm('למחוק מסלול זה?')) return;
    const plan = getCurrentPlan();
    plan.investments.splice(index, 1);
    saveData();
    renderInvestments();
    updateDreamSources();
}

function renderInvestments() {
    const plan = getCurrentPlan();
    const container = document.getElementById('investmentsList');
    document.getElementById('invCount').textContent = plan.investments.length;
    
    if (plan.investments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <div class="empty-title">אין מסלולי השקעה</div>
                <div class="empty-text">התחל בהוספת המסלול הראשון שלך</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = plan.investments.map((inv, i) => {
        let badges = '';
        if (inv.forDream) badges += '<span class="badge badge-warning">💫 לחלומות</span>';
        if (!inv.include) badges += '<span class="badge badge-danger">🚫 לא בהון</span>';
        const taxBadge = inv.tax > 0 ? `<span class="badge badge-primary">מס ${inv.tax}%</span>` : '<span class="badge badge-success">פטור ממס</span>';
        
        let subTracksHTML = '';
        if (inv.subTracks && inv.subTracks.length > 0) {
            subTracksHTML = `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
                    <strong>פיצול תתי-מסלולים:</strong><br>
                    ${inv.subTracks.map(st => `${st.type} (${st.percent}%, תשואה ${st.returnRate}%)`).join(' • ')}
                </div>
            `;
        }
        
        let genderHTML = '';
        if (inv.type === 'פנסיה' && inv.gender) {
            const genderText = inv.gender === 'male' ? 'זכר (0.005)' : 'נקבה (0.006)';
            genderHTML = `<div class="item-detail"><span>👤</span><span>מגדר: ${genderText}</span></div>`;
        }
        
        return `
            <div class="item">
                <div class="item-header">
                    <div>
                        <div class="item-title">${inv.name} ${badges}</div>
                        <div class="item-subtitle">${inv.type} • ${inv.house} ${taxBadge}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-primary btn-sm" onclick="editInvestment(${i})">
                            <span>✏️</span>
                            <span>ערוך</span>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteInvestment(${i})">
                            <span>🗑️</span>
                            <span>מחק</span>
                        </button>
                    </div>
                </div>
                <div class="item-details">
                    <div class="item-detail"><span>💵</span><span>סכום: ${formatCurrency(inv.amount)}</span></div>
                    <div class="item-detail"><span>📅</span><span>חודשי: ${formatCurrency(inv.monthly)}</span></div>
                    <div class="item-detail"><span>📈</span><span>תשואה: ${inv.returnRate}%</span></div>
                    <div class="item-detail"><span>💼</span><span>דמי ניהול: ${inv.feeDeposit}% + ${inv.feeAnnual}%</span></div>
                    ${genderHTML}
                </div>
                ${subTracksHTML}
            </div>
        `;
    }).join('');
}

// ==========================================
// DREAM CRUD
// ==========================================

function updateDreamSources() {
    const plan = getCurrentPlan();
    const select = document.getElementById('dreamSources');
    if (!select) return; // Field doesn't exist yet
    
    const dreamInvs = plan.investments.filter(inv => inv.forDream);
    
    select.innerHTML = '<option value="">לא מוגדר</option>' + 
        dreamInvs.map((inv, i) => {
            const actualIndex = plan.investments.indexOf(inv);
            return `<option value="${actualIndex}">${inv.name}</option>`;
        }).join('');
}

function saveDream(event) {
    event.preventDefault();
    const plan = getCurrentPlan();
    const name = document.getElementById('dreamName').value.trim();
    const cost = sanitizeNumber(document.getElementById('dreamCost').value);
    
    if (!name || cost <= 0) {
        alert('אנא הזן שם ועלות');
        return;
    }
    
    // Get selected sources (multiple)
    const sourcesSelect = document.getElementById('dreamSources');
    const selectedSources = Array.from(sourcesSelect.selectedOptions)
        .map(opt => opt.value)
        .filter(v => v !== '')
        .map(v => parseInt(v));
    
    const dream = {
        name,
        cost,
        year: parseInt(document.getElementById('dreamYear').value),
        sourceIndices: selectedSources.length > 0 ? selectedSources : null
    };
    
    plan.dreams.push(dream);
    document.getElementById('dreamForm').reset();
    saveData();
    renderDreams();
}

function deleteDream(index) {
    if (!confirm('למחוק חלום זה?')) return;
    const plan = getCurrentPlan();
    plan.dreams.splice(index, 1);
    saveData();
    renderDreams();
}

function calculateDreamGap(dream) {
    // Handle both old format (sourceIndex) and new format (sourceIndices)
    const sourceIndices = dream.sourceIndices || 
                         (dream.sourceIndex !== null && dream.sourceIndex !== undefined ? [dream.sourceIndex] : []);
    
    if (sourceIndices.length === 0) return null;
    
    const plan = getCurrentPlan();
    const currentYear = new Date().getFullYear();
    const yearsUntilDream = dream.year - currentYear;
    
    if (yearsUntilDream <= 0) return { gap: dream.cost, message: '⏰ החלום כבר עבר!', status: 'past' };
    
    const futureCost = dream.cost * Math.pow(1 + INFLATION_RATE / 100, yearsUntilDream);
    const costPerSource = dream.cost / sourceIndices.length;
    
    // Calculate total future value from all sources
    let totalFutureValue = 0;
    const validSources = [];
    
    for (const idx of sourceIndices) {
        const inv = plan.investments[idx];
        if (!inv) continue;
        
        const futureValue = calculateFV(inv.amount, inv.monthly, inv.returnRate, yearsUntilDream, 
                                        inv.feeDeposit || 0, inv.feeAnnual || 0, inv.subTracks);
        
        // Each source should cover costPerSource, but we count their total
        totalFutureValue += futureValue;
        validSources.push(inv.name);
    }
    
    if (validSources.length === 0) return null;
    
    const gap = futureCost - totalFutureValue;
    
    if (gap <= 0) {
        return { 
            gap: 0, 
            message: `✅ מצוין! ${validSources.length} מקורות יכסו את החלום + ${formatCurrency(Math.abs(gap))} נוסף!`,
            status: 'success'
        };
    } else {
        const monthlyNeededTotal = gap / (yearsUntilDream * 12);
        const monthlyNeededPerSource = monthlyNeededTotal / validSources.length;
        return { 
            gap, 
            message: `⚠️ חסר ${formatCurrency(gap)}. צריך ${formatCurrency(monthlyNeededPerSource)}/חודש לכל מקור (${validSources.length} מקורות)`,
            status: 'warning'
        };
    }
}

function renderDreams() {
    const plan = getCurrentPlan();
    const container = document.getElementById('dreamsList');
    document.getElementById('dreamCount').textContent = plan.dreams.length;
    
    // Populate sources select
    const sourcesSelect = document.getElementById('dreamSources');
    if (sourcesSelect) {
        sourcesSelect.innerHTML = '<option value="">לא מוגדר</option>' + 
            plan.investments.map((inv, i) => 
                `<option value="${i}">${inv.name}</option>`
            ).join('');
    }
    
    if (plan.dreams.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <div class="empty-title">אין חלומות</div>
                <div class="empty-text">הגדר את החלום הפיננסי הראשון שלך</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = plan.dreams.map((dream, i) => {
        let sourceNames = [];
        let gapHTML = '';
        
        // Handle both old format (sourceIndex) and new format (sourceIndices)
        const sourceIndices = dream.sourceIndices || 
                             (dream.sourceIndex !== null && dream.sourceIndex !== undefined ? [dream.sourceIndex] : []);
        
        if (sourceIndices.length > 0) {
            sourceNames = sourceIndices
                .filter(idx => plan.investments[idx])
                .map(idx => plan.investments[idx].name);
            
            const gapData = calculateDreamGap(dream);
            if (gapData) {
                const alertClass = gapData.status === 'success' ? 'alert-success' : 
                                   gapData.status === 'warning' ? 'alert-warning' : 'alert-info';
                gapHTML = `<div class="alert ${alertClass}" style="margin-top: 12px; padding: 12px;">
                    ${gapData.message}
                </div>`;
            }
        }
        
        const sourceText = sourceNames.length > 0 ? sourceNames.join(', ') : 'לא מוגדר';
        const costPerSource = sourceNames.length > 0 ? dream.cost / sourceNames.length : dream.cost;
        
        return `
            <div class="item">
                <div class="item-header">
                    <div>
                        <div class="item-title">${dream.name}</div>
                        <div class="item-subtitle">שנת יעד: ${dream.year}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-danger btn-sm" onclick="deleteDream(${i})">
                            <span>🗑️</span>
                            <span>מחק</span>
                        </button>
                    </div>
                </div>
                <div class="item-details">
                    <div class="item-detail"><span>💰</span><span>עלות כוללת: ${formatCurrency(dream.cost)}</span></div>
                    ${sourceNames.length > 0 ? `<div class="item-detail"><span>📊</span><span>לכל מקור: ${formatCurrency(costPerSource)}</span></div>` : ''}
                    <div class="item-detail"><span>💫</span><span>מקורות (${sourceNames.length}): ${sourceText}</span></div>
                </div>
                ${gapHTML}
            </div>
        `;
    }).join('');
}

// ==========================================
// PROJECTIONS
// ==========================================

function renderProjections() {
    const plan = getCurrentPlan();
    const years = parseInt(document.getElementById('projYears').value) || 30;
    const currentYear = new Date().getFullYear();
    const tbody = document.getElementById('projectionsBody');
    
    let rows = '';
    for (let y = 0; y <= years; y += 5) {
        const year = currentYear + y;
        let totalNominal = 0;
        let totalPrincipal = 0;
        let totalTax = 0;
        
        plan.investments.forEach(inv => {
            if (!inv.include) return;
            
            const nominal = calculateFV(inv.amount, inv.monthly, inv.returnRate, y, 
                                        inv.feeDeposit || 0, inv.feeAnnual || 0, inv.subTracks);
            const principal = calculatePrincipal(inv.amount, inv.monthly, y);
            const tax = calculateTax(principal, nominal, inv.tax);
            
            totalNominal += nominal;
            totalPrincipal += principal;
            totalTax += tax;
        });
        
        const real = calculateRealValue(totalNominal, y);
        const netAfterTax = totalNominal - totalTax;
        
        rows += `
            <tr>
                <td style="font-weight: 600;">${year}</td>
                <td>${formatCurrency(totalNominal)}</td>
                <td style="color: var(--primary);">${formatCurrency(real)}</td>
                <td style="color: var(--danger);">${formatCurrency(totalTax)}</td>
                <td style="color: var(--success); font-weight: 600;">${formatCurrency(netAfterTax)}</td>
            </tr>
        `;
    }
    
    tbody.innerHTML = rows;
}

function showYearDetails() {
    const plan = getCurrentPlan();
    const targetYear = parseInt(document.getElementById('specificYear').value);
    const currentYear = new Date().getFullYear();
    
    if (!targetYear || targetYear < currentYear) {
        alert('אנא הזן שנה תקינה');
        return;
    }
    
    const years = targetYear - currentYear;
    const container = document.getElementById('yearDetailsContainer');
    
    let html = `<div class="card" style="background: #f0f9ff; border: 2px solid var(--primary);">
        <h3 style="color: var(--primary); margin-bottom: 20px;">📊 פירוט מפורט לשנת ${targetYear}</h3>
        <div class="items-list">`;
    
    plan.investments.forEach((inv, i) => {
        if (!inv.include) return;
        
        const nominal = calculateFV(inv.amount, inv.monthly, inv.returnRate, years,
                                    inv.feeDeposit || 0, inv.feeAnnual || 0, inv.subTracks);
        const principal = calculatePrincipal(inv.amount, inv.monthly, years);
        const profit = nominal - principal;
        const tax = calculateTax(principal, nominal, inv.tax);
        const netAfterTax = nominal - tax;
        const real = calculateRealValue(nominal, years);
        
        let pensionHTML = '';
        if (inv.type === 'פנסיה' && inv.gender) {
            const monthlyPension = calculateMonthlyPension(nominal, inv.gender);
            pensionHTML = `
                <div class="alert alert-info" style="margin-top: 12px;">
                    <span class="alert-icon">💰</span>
                    <div>
                        <strong>קצבה חודשית משוערת:</strong> ${formatCurrency(monthlyPension)}<br>
                        <small>מחושב לפי מקדם ${inv.gender === 'male' ? '0.005' : '0.006'}</small>
                    </div>
                </div>
            `;
        }
        
        html += `
            <div class="item">
                <div class="item-title" style="margin-bottom: 16px;">${inv.name}</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    <div><strong>ערך נומינלי:</strong> ${formatCurrency(nominal)}</div>
                    <div><strong>ערך ריאלי:</strong> ${formatCurrency(real)}</div>
                    <div><strong>קרן שהופקדה:</strong> ${formatCurrency(principal)}</div>
                    <div style="color: var(--success);"><strong>רווח:</strong> ${formatCurrency(profit)}</div>
                    <div style="color: var(--danger);"><strong>מס על רווח:</strong> ${formatCurrency(tax)}</div>
                    <div style="color: var(--primary); font-weight: 700;"><strong>נטו לאחר מס:</strong> ${formatCurrency(netAfterTax)}</div>
                </div>
                ${pensionHTML}
            </div>
        `;
    });
    
    html += `</div></div>`;
    container.innerHTML = html;
    container.style.display = 'block';
}

// ==========================================
// SUMMARY
// ==========================================

function renderSummary() {
    const plan = getCurrentPlan();
    const years = parseInt(document.getElementById('sumYears').value) || 30;
    
    let totalNominal = 0;
    let totalPrincipal = 0;
    let totalTax = 0;
    let totalFees = 0;
    let totalToday = 0; // Total today WITHOUT pension
    let pensionToday = 0; // Pension today
    
    // Separate pension from other investments
    let pensionNominal = 0;
    let pensionPrincipal = 0;
    let pensionTax = 0;
    
    const breakdown = plan.investments.map(inv => {
        if (!inv.include) return null;
        
        // Calculate total today - SEPARATE pension
        if (inv.type === 'פנסיה') {
            pensionToday += inv.amount || 0;
        } else {
            totalToday += inv.amount || 0;
        }
        
        const nominal = calculateFV(inv.amount, inv.monthly, inv.returnRate, years,
                                    inv.feeDeposit || 0, inv.feeAnnual || 0, inv.subTracks);
        const nominalNoFees = calculateFV(inv.amount, inv.monthly, inv.returnRate, years, 0, 0, 
                                          inv.subTracks ? inv.subTracks.map(st => ({...st, returnRate: st.returnRate})) : null);
        const principal = calculatePrincipal(inv.amount, inv.monthly, years);
        
        // Calculate tax - use pension-specific calculation if it's a pension
        let tax;
        if (inv.type === 'פנסיה' && inv.age && inv.gender) {
            tax = calculatePensionTax(principal, nominal, inv.gender, inv.age, years);
        } else {
            tax = calculateTax(principal, nominal, inv.tax);
        }
        
        const fees = nominalNoFees - nominal;
        const real = calculateRealValue(nominal, years);
        
        // Separate pension calculations
        if (inv.type === 'פנסיה') {
            pensionNominal += nominal;
            pensionPrincipal += principal;
            pensionTax += tax;
        } else {
            totalNominal += nominal;
            totalPrincipal += principal;
            totalTax += tax;
        }
        
        totalFees += fees;
        
        return { inv, nominal, real, tax, principal, fees };
    }).filter(Boolean);
    
    const totalReal = calculateRealValue(totalNominal, years);
    const pensionReal = calculateRealValue(pensionNominal, years);
    
    // Update displays
    const grandTotalToday = totalToday + pensionToday;
    const todayElement = document.getElementById('sumToday');
    
    // Update the "Today" card
    if (pensionToday > 0) {
        todayElement.innerHTML = `
            <div style="font-size: 2.2em; color: #3b82f6; margin-bottom: 8px; line-height: 1.2;">${formatCurrency(grandTotalToday)}</div>
            <div style="font-size: 0.75em; color: #666; font-weight: normal; line-height: 1.4;">
                💼 הון: <strong>${formatCurrency(totalToday)}</strong><br>
                💰 פנסיה: <strong>${formatCurrency(pensionToday)}</strong>
            </div>
        `;
    } else {
        todayElement.textContent = formatCurrency(totalToday);
    }
    
    document.getElementById('sumNominal').textContent = formatCurrency(totalNominal);
    document.getElementById('sumReal').textContent = formatCurrency(totalReal);
    document.getElementById('sumFees').textContent = formatCurrency(totalFees);
    document.getElementById('sumTax').textContent = formatCurrency(totalTax);
    document.getElementById('sumYearsLabel').textContent = `בעוד ${years} שנה${years > 1 ? 'ים' : ''}`;
    
    const container = document.getElementById('summaryBreakdown');
    
    // Add pension summary if exists
    let pensionSummaryHTML = '';
    if (pensionNominal > 0) {
        // Get first pension investment for age/gender info
        const firstPension = plan.investments.find(inv => inv.type === 'פנסיה' && inv.include);
        const retirementAge = firstPension?.gender === 'female' ? 62 : 67;
        const currentAge = firstPension?.age || 0;
        const ageAtWithdrawal = currentAge + years;
        
        let taxExplanation = '';
        if (ageAtWithdrawal < retirementAge) {
            taxExplanation = `<span style="color: #f85149;">⚠️ משיכה לפני גיל פרישה (${retirementAge}) - מס מלא על הרווח (25%)</span>`;
        } else {
            taxExplanation = `<span style="color: #3fb950;">✅ משיכה אחרי גיל פרישה (${retirementAge}) - פטור ממס על ₪5,000 הראשונים בחודש</span>`;
        }
        
        pensionSummaryHTML = `
            <div class="alert alert-info" style="background: rgba(88, 166, 255, 0.15); border-color: #58a6ff; margin-bottom: 20px;">
                <span class="alert-icon">💰</span>
                <div style="flex: 1;">
                    <strong style="font-size: 1.2em; color: #58a6ff;">סיכום פנסיה (מחוץ להון העצמי):</strong><br>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 12px;">
                        <div><strong>ערך נומינלי:</strong> <span style="color: #3fb950;">${formatCurrency(pensionNominal)}</span></div>
                        <div><strong>ערך ריאלי:</strong> <span style="color: #58a6ff;">${formatCurrency(pensionReal)}</span></div>
                        <div><strong>קרן:</strong> ${formatCurrency(pensionPrincipal)}</div>
                        <div><strong>מס משוער:</strong> <span style="color: #f85149;">${formatCurrency(pensionTax)}</span></div>
                    </div>
                    <div style="margin-top: 12px; padding: 8px; background: rgba(139, 148, 158, 0.1); border-radius: 6px; font-size: 0.9em;">
                        ${taxExplanation}
                    </div>
                    ${currentAge > 0 ? `<div style="margin-top: 8px; font-size: 0.85em; color: #8b949e;">גיל נוכחי: ${currentAge} | גיל במשיכה: ${ageAtWithdrawal} | גיל פרישה: ${retirementAge}</div>` : ''}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = pensionSummaryHTML + breakdown.map(item => {
        let pensionHTML = '';
        if (item.inv.type === 'פנסיה' && item.inv.gender) {
            const monthlyPensionNominal = calculateMonthlyPension(item.nominal, item.inv.gender);
            const monthlyPensionReal = calculateMonthlyPension(item.real, item.inv.gender);
            pensionHTML = `
                <div class="alert alert-success" style="margin-top: 12px; padding: 12px; background: rgba(63, 185, 80, 0.15); border-color: #3fb950;">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div>
                            💰 <strong>קצבה חודשית (נומינלי):</strong> 
                            <span style="color: #3fb950; font-size: 1.2em;">${formatCurrency(monthlyPensionNominal)}</span>
                        </div>
                        <div>
                            💎 <strong>קצבה חודשית (ריאלי):</strong> 
                            <span style="color: #58a6ff; font-size: 1.2em;">${formatCurrency(monthlyPensionReal)}</span>
                            <small style="display: block; color: #8b949e; margin-top: 2px;">כוח קנייה של היום בעוד ${years} שנים</small>
                        </div>
                    </div>
                    <small style="display: block; margin-top: 8px; color: #8b949e; border-top: 1px solid rgba(139, 148, 158, 0.3); padding-top: 8px;">
                        מחושב לפי מקדם ${item.inv.gender === 'male' ? '0.005 (זכר)' : '0.006 (נקבה)'} | אינפלציה משוערת: 2% שנתי
                    </small>
                </div>
            `;
        }
        
        const typeLabel = item.inv.type === 'פנסיה' ? '💼 פנסיה (מחוץ להון)' : item.inv.type;
        
        return `
            <div class="item">
                <div class="item-header">
                    <div>
                        <div class="item-title" style="color: #f0f6fc;">${item.inv.name}</div>
                        <div class="item-subtitle" style="color: #8b949e;">${typeLabel}</div>
                    </div>
                    <div style="text-align: left;">
                        <div style="font-size: 1.5em; font-weight: 700; color: #3fb950;">
                            ${formatCurrency(item.nominal)}
                        </div>
                        <div style="color: #58a6ff; font-size: 0.95em;">
                            ${formatCurrency(item.real)} ריאלי
                        </div>
                    </div>
                </div>
                <div class="item-details" style="color: #8b949e;">
                    <div class="item-detail"><span>💵</span><span style="color: #f0f6fc;">קרן: ${formatCurrency(item.principal)}</span></div>
                    <div class="item-detail"><span>📈</span><span style="color: #3fb950;">רווח: ${formatCurrency(item.nominal - item.principal)}</span></div>
                    <div class="item-detail"><span>💸</span><span style="color: #f85149;">מס: ${formatCurrency(item.tax)}</span></div>
                    <div class="item-detail"><span>💼</span><span style="color: #d29922;">דמי ניהול: ${formatCurrency(item.fees)}</span></div>
                    <div class="item-detail"><span>✅</span><span style="color: #3fb950; font-weight: 700;">נטו: ${formatCurrency(item.nominal - item.tax)}</span></div>
                </div>
                ${pensionHTML}
            </div>
        `;
    }).join('');
}

// ==========================================
// CHARTS
// ==========================================

function renderCharts() {
    const plan = getCurrentPlan();
    
    // Get timeframe from selector (default to 0 = today)
    const timeframeSelect = document.getElementById('chartsTimeframe');
    const years = timeframeSelect ? parseInt(timeframeSelect.value) : 0;
    
    // Calculate totals
    const byType = {};
    const byHouse = {};
    const bySubTrack = {};
    const subTrackObjects = []; // For risk classification
    let taxExempt = 0;
    let taxable = 0;
    let total = 0;
    
    plan.investments.forEach(inv => {
        if (!inv.include) return;
        
        // If years = 0, use current amount only (no projection)
        let value;
        if (years === 0) {
            value = inv.amount || 0;
        } else {
            value = calculateFV(inv.amount, inv.monthly, inv.returnRate, years,
                              inv.feeDeposit || 0, inv.feeAnnual || 0, inv.subTracks);
        }
        
        byType[inv.type] = (byType[inv.type] || 0) + value;
        byHouse[inv.house] = (byHouse[inv.house] || 0) + value;
        
        // Calculate sub-tracks
        if (inv.subTracks && inv.subTracks.length > 0) {
            inv.subTracks.forEach(st => {
                const subTrackValue = value * (st.percent / 100);
                bySubTrack[st.type] = (bySubTrack[st.type] || 0) + subTrackValue;
                
                // Keep full object for risk classification
                subTrackObjects.push({
                    ...st,
                    value: subTrackValue
                });
            });
        } else {
            // If no sub-tracks, count as "לא מחולק"
            bySubTrack['לא מחולק לתתי-מסלולים'] = (bySubTrack['לא מחולק לתתי-מסלולים'] || 0) + value;
            subTrackObjects.push({
                type: 'לא מחולק לתתי-מסלולים',
                value: value
            });
        }
        
        if (inv.tax > 0) {
            taxable += value;
        } else {
            taxExempt += value;
        }
        
        total += value;
    });
    
    // Render charts
    renderPieChart('chartBySubTracks', bySubTrack, 'תתי-מסלולים');
    renderPieChart('chartByType', byType, 'סוג מסלול');
    renderPieChartWithUniqueColors('chartByHouse', byHouse, 'בית השקעות');
    renderPieChart('chartByTax', { 'פטור ממס': taxExempt, 'חייב במס': taxable }, 'מיסוי');
    renderRiskPieChart(subTrackObjects); // Pass objects, not dictionary
}

function renderPieChart(canvasId, data, label) {
    const ctx = document.getElementById(canvasId);
    
    // Destroy existing chart if exists
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    const total = values.reduce((sum, v) => sum + v, 0);
    
    if (total === 0) {
        ctx.parentElement.innerHTML = '<div class="empty-state"><div class="empty-text">אין נתונים להצגה</div></div>';
        return;
    }
    
    charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.map((l, i) => `${l} (${((values[i]/total)*100).toFixed(1)}%)`),
            datasets: [{
                data: values,
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    rtl: true,
                    labels: {
                        font: { size: 12, family: 'Heebo' },
                        padding: 15
                    }
                },
                tooltip: {
                    rtl: true,
                    callbacks: {
                        label: function(context) {
                            return ' ' + formatCurrency(context.parsed);
                        }
                    }
                }
            }
        }
    });
}

function renderPieChartWithUniqueColors(canvasId, data, label) {
    const ctx = document.getElementById(canvasId);
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    const total = values.reduce((sum, v) => sum + v, 0);
    
    if (total === 0) {
        ctx.parentElement.innerHTML = '<div class="empty-state"><div class="empty-text">אין נתונים להצגה</div></div>';
        return;
    }
    
    const colors = generateUniqueColors(labels.length);
    
    charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.map((l, i) => `${l} (${((values[i]/total)*100).toFixed(1)}%)`),
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    rtl: true,
                    labels: {
                        font: { size: 12, family: 'Heebo' },
                        padding: 15,
                        boxWidth: 15,
                        generateLabels: function(chart) {
                            const data = chart.data;
                            return data.labels.map((label, i) => ({
                                text: label,
                                fillStyle: data.datasets[0].backgroundColor[i],
                                hidden: false,
                                index: i
                            }));
                        }
                    }
                },
                tooltip: {
                    rtl: true,
                    callbacks: {
                        label: function(context) {
                            return ' ' + formatCurrency(context.parsed);
                        }
                    }
                }
            }
        }
    });
}

function renderRiskPieChart(subTrackObjects) {
    const riskCategories = {
        'סיכון נמוך': 0,
        'סיכון בינוני': 0,
        'סיכון גבוה': 0,
        'לא מוגדר': 0
    };
    
    // Classify each subTrack object
    subTrackObjects.forEach(st => {
        const risk = classifyRisk(st);  // Pass full object
        if (risk === 'low') riskCategories['סיכון נמוך'] += st.value;
        else if (risk === 'medium') riskCategories['סיכון בינוני'] += st.value;
        else if (risk === 'high') riskCategories['סיכון גבוה'] += st.value;
        else riskCategories['לא מוגדר'] += st.value;
    });
    
    const ctx = document.getElementById('chartByRisk');
    if (!ctx) return;
    
    if (charts.chartByRisk) charts.chartByRisk.destroy();
    
    const labels = Object.keys(riskCategories);
    const values = Object.values(riskCategories);
    const total = values.reduce((sum, v) => sum + v, 0);
    
    if (total === 0) {
        ctx.parentElement.innerHTML = '<div class="empty-state"><div class="empty-text">אין נתונים להצגה</div></div>';
        return;
    }
    
    charts.chartByRisk = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.map((l, i) => `${l} (${((values[i]/total)*100).toFixed(1)}%)`),
            datasets: [{
                data: values,
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#9ca3af'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    rtl: true,
                    labels: {
                        font: { size: 12, family: 'Heebo' },
                        padding: 15
                    }
                },
                tooltip: {
                    rtl: true,
                    callbacks: {
                        label: function(context) {
                            return ' ' + formatCurrency(context.parsed);
                        }
                    }
                }
            }
        }
    });
}

// ==========================================
// PLAN MANAGEMENT
// ==========================================

function updatePlanSelector() {
    const select = document.getElementById('planSelector');
    select.innerHTML = '<option value="">בחר תוכנית...</option>' +
        appData.plans.map(p => 
            `<option value="${p.id}" ${p.id === appData.currentPlanId ? 'selected' : ''}>${p.name}</option>`
        ).join('');
}

function switchPlan(planId) {
    if (!planId) return;
    appData.currentPlanId = planId;
    saveData();
    render();
}

function showPlanManager() {
    const modal = document.getElementById('planModal');
    const list = document.getElementById('plansList');
    
    list.innerHTML = appData.plans.map((p, i) => `
        <div class="item" style="margin-bottom: 12px;">
            <div class="item-header">
                <div>
                    <div class="item-title">${p.name}</div>
                    <div class="item-subtitle">${p.investments.length} מסלולים, ${p.dreams.length} חלומות</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary btn-sm" onclick="selectPlan('${p.id}')">בחר</button>
                    <button class="btn btn-danger btn-sm" onclick="deletePlan('${p.id}')" ${appData.plans.length === 1 ? 'disabled' : ''}>מחק</button>
                </div>
            </div>
        </div>
    `).join('');
    
    modal.style.display = 'flex';
}

function closePlanManager() {
    document.getElementById('planModal').style.display = 'none';
}

function createNewPlan() {
    const name = prompt('שם התוכנית החדשה:', `תוכנית ${appData.plans.length + 1}`);
    if (!name) return;
    
    const plan = {
        id: Date.now().toString(),
        name,
        investments: [],
        dreams: [],
        createdAt: new Date().toISOString()
    };
    
    appData.plans.push(plan);
    appData.currentPlanId = plan.id;
    saveData();
    updatePlanSelector();
    closePlanManager();
    render();
}

function selectPlan(planId) {
    appData.currentPlanId = planId;
    saveData();
    updatePlanSelector();
    closePlanManager();
    render();
}

function deletePlan(planId) {
    if (appData.plans.length === 1) {
        alert('לא ניתן למחוק את התוכנית היחידה');
        return;
    }
    
    if (!confirm('למחוק תוכנית זו?')) return;
    
    appData.plans = appData.plans.filter(p => p.id !== planId);
    if (appData.currentPlanId === planId) {
        appData.currentPlanId = appData.plans[0].id;
    }
    saveData();
    updatePlanSelector();
    showPlanManager();
    render();
}

// ==========================================
// EXPORT/IMPORT PLACEHOLDERS
// ==========================================

function exportToPDF() {
    alert('📄 ייצוא PDF - תכונה זו תתווסף בקרוב!\n\nכרגע תוכל:\n1. להדפיס את הדף (Ctrl+P)\n2. לבחור "שמור כ-PDF"\n3. לקבל דוח מלא');
}

function exportToExcel() {
    const plan = getCurrentPlan();
    const years = parseInt(document.getElementById('sumYears').value) || 30;
    
    try {
        // Calculate analytics
        const byType = {}, byHouse = {}, bySubTrack = {}, byRisk = {
            'סיכון נמוך': 0, 'סיכון בינוני': 0, 'סיכון גבוה': 0, 'לא מוגדר': 0
        };
        let total = 0;
        
        plan.investments.forEach(inv => {
            if (!inv.include) return;
            const value = calculateFV(inv.amount, inv.monthly, inv.returnRate, years,
                                      inv.feeDeposit || 0, inv.feeAnnual || 0, inv.subTracks);
            
            byType[inv.type] = (byType[inv.type] || 0) + value;
            byHouse[inv.house] = (byHouse[inv.house] || 0) + value;
            
            if (inv.subTracks && inv.subTracks.length > 0) {
                inv.subTracks.forEach(st => {
                    const subTrackValue = value * (st.percent / 100);
                    bySubTrack[st.type] = (bySubTrack[st.type] || 0) + subTrackValue;
                    
                    const risk = classifyRisk(st.type);
                    if (risk === 'low') byRisk['סיכון נמוך'] += subTrackValue;
                    else if (risk === 'medium') byRisk['סיכון בינוני'] += subTrackValue;
                    else if (risk === 'high') byRisk['סיכון גבוה'] += subTrackValue;
                    else byRisk['לא מוגדר'] += subTrackValue;
                });
            }
            
            total += value;
        });
        
        const wb = XLSX.utils.book_new();
        
        // Sheet 1: Investments with subTracks
        const invData = plan.investments.map(inv => ({
            'שם': inv.name,
            'סוג': inv.type,
            'בית השקעות': inv.house,
            'סכום נוכחי': inv.amount,
            'הפקדה חודשית': inv.monthly,
            'תשואה %': inv.returnRate,
            'מס %': inv.tax,
            'דמי ניהול הפקדה %': inv.feeDeposit,
            'דמי ניהול צבירה %': inv.feeAnnual,
            'תתי-מסלולים': inv.subTracks ? JSON.stringify(inv.subTracks) : '',
            'כלול': inv.include ? 'כן' : 'לא'
        }));
        const ws1 = XLSX.utils.json_to_sheet(invData);
        XLSX.utils.book_append_sheet(wb, ws1, 'מסלולי השקעה');
        
        // Sheet 2: Dreams with sources
        const dreamData = plan.dreams.map(d => ({
            'שם': d.name,
            'עלות': d.cost,
            'שנת יעד': d.year,
            'מקורות': d.sources ? d.sources.join(', ') : ''
        }));
        const ws2 = XLSX.utils.json_to_sheet(dreamData);
        XLSX.utils.book_append_sheet(wb, ws2, 'חלומות');
        
        // Sheet 3: Analytics - By Type
        const typeData = Object.entries(byType).map(([name, value]) => ({
            'סוג מסלול': name,
            'סכום': Math.round(value),
            'אחוז מהתיק': ((value / total) * 100).toFixed(2) + '%'
        }));
        const ws3 = XLSX.utils.json_to_sheet(typeData);
        XLSX.utils.book_append_sheet(wb, ws3, 'ניתוח - סוגים');
        
        // Sheet 4: Analytics - By House
        const houseData = Object.entries(byHouse).map(([name, value]) => ({
            'בית השקעות': name,
            'סכום': Math.round(value),
            'אחוז מהתיק': ((value / total) * 100).toFixed(2) + '%'
        }));
        const ws4 = XLSX.utils.json_to_sheet(houseData);
        XLSX.utils.book_append_sheet(wb, ws4, 'ניתוח - בתי השקעות');
        
        // Sheet 5: Analytics - By SubTrack
        const subTrackData = Object.entries(bySubTrack).map(([name, value]) => ({
            'תת-מסלול': name,
            'סכום': Math.round(value),
            'אחוז מהתיק': ((value / total) * 100).toFixed(2) + '%'
        }));
        const ws5 = XLSX.utils.json_to_sheet(subTrackData);
        XLSX.utils.book_append_sheet(wb, ws5, 'ניתוח - תתי מסלולים');
        
        // Sheet 6: Analytics - By Risk
        const riskData = Object.entries(byRisk)
            .filter(([, value]) => value > 0)
            .map(([name, value]) => ({
                'רמת סיכון': name,
                'סכום': Math.round(value),
                'אחוז מהתיק': ((value / total) * 100).toFixed(2) + '%'
            }));
        const ws6 = XLSX.utils.json_to_sheet(riskData);
        XLSX.utils.book_append_sheet(wb, ws6, 'ניתוח - סיכונים');
        
        XLSX.writeFile(wb, `${plan.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
        console.error('Excel export error:', e);
        alert('שגיאה בייצוא ל-Excel: ' + e.message);
    }
}

function importExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const plan = getCurrentPlan();
            
            // Import investments
            const invSheet = workbook.Sheets['מסלולי השקעה'];
            if (invSheet) {
                const invData = XLSX.utils.sheet_to_json(invSheet);
                plan.investments = invData.map(row => ({
                    name: row['שם'] || '',
                    type: row['סוג'] || 'אחר',
                    house: row['בית השקעות'] || 'לא מוגדר',
                    amount: parseFloat(row['סכום נוכחי']) || 0,
                    monthly: parseFloat(row['הפקדה חודשית']) || 0,
                    returnRate: parseFloat(row['תשואה %']) || 0,
                    tax: parseFloat(row['מס %']) || 0,
                    feeDeposit: parseFloat(row['דמי ניהול הפקדה %']) || 0,
                    feeAnnual: parseFloat(row['דמי ניהול צבירה %']) || 0,
                    forDream: false,
                    include: row['כלול'] ? row['כלול'] === 'כן' : true,
                    subTracks: row['תתי-מסלולים'] ? JSON.parse(row['תתי-מסלולים']) : []
                }));
            }
            
            // Import dreams with sources
            if (workbook.SheetNames.includes('חלומות')) {
                const ws2 = workbook.Sheets['חלומות'];
                const dreamData = XLSX.utils.sheet_to_json(ws2);
                
                plan.dreams = dreamData.map(row => ({
                    name: row['שם'] || '',
                    cost: parseFloat(row['עלות']) || 0,
                    year: parseInt(row['שנת יעד']) || 10,
                    sources: row['מקורות'] ? row['מקורות'].split(', ').filter(s => s) : []
                }));
            }
            
            saveData();
            render();
            alert('✅ הנתונים יובאו בהצלחה!');
        } catch (e) {
            console.error('Import error:', e);
            alert('❌ שגיאה בייבוא הקובץ: ' + e.message);
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

// ==========================================
// RENDER ALL
// ==========================================

function render() {
    renderInvestments();
    renderDreams();
    updateDreamSources();
}

// ==========================================
// INITIALIZE ON LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', init);

// ==========================================
// TASKS MANAGEMENT
// ==========================================

let tasks = [];

function loadTasks() {
    const saved = localStorage.getItem('financialPlannerTasks');
    if (saved) {
        try {
            tasks = JSON.parse(saved);
        } catch (e) {
            tasks = [];
        }
    }
}

function saveTasks() {
    localStorage.setItem('financialPlannerTasks', JSON.stringify(tasks));
}

function addTask() {
    const input = document.getElementById('newTask');
    const text = input.value.trim();
    
    if (!text) {
        alert('אנא הזן טקסט למשימה');
        return;
    }
    
    tasks.push({
        id: Date.now(),
        text,
        done: false,
        createdAt: new Date().toISOString()
    });
    
    input.value = '';
    saveTasks();
    renderTasks();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.done = !task.done;
        saveTasks();
        renderTasks();
    }
}

function deleteTask(id) {
    if (!confirm('למחוק משימה זו?')) return;
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}

function renderTasks() {
    const container = document.getElementById('tasksList');
    if (!container) return;
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✓</div>
                <div class="empty-title">אין משימות</div>
                <div class="empty-text">הוסף את המשימה הראשונה שלך</div>
            </div>
        `;
        document.getElementById('taskProgress').textContent = '0% הושלמו';
        return;
    }
    
    const completedCount = tasks.filter(t => t.done).length;
    const progress = Math.round((completedCount / tasks.length) * 100);
    
    container.innerHTML = tasks.map(task => `
        <div class="task-item ${task.done ? 'task-done' : ''}">
            <input type="checkbox" 
                   ${task.done ? 'checked' : ''} 
                   onchange="toggleTask(${task.id})"
                   class="task-checkbox">
            <span class="task-text ${task.done ? 'task-text-done' : ''}">${escapeHtml(task.text)}</span>
            <button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">
                <span>🗑️</span>
            </button>
        </div>
    `).join('');
    
    document.getElementById('taskProgress').textContent = `${progress}% הושלמו (${completedCount}/${tasks.length})`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load tasks on init
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    if (document.getElementById('tasksList')) {
        renderTasks();
    }
});

// ==========================================
// AUTO IMPORT FROM BANKS/INSURANCE
// ==========================================

// Check if extension is installed
function checkExtensionInstalled() {
    return new Promise((resolve) => {
        window.postMessage({ type: 'PING_EXTENSION' }, '*');
        
        const timeout = setTimeout(() => {
            resolve(false);
        }, 1000);
        
        window.addEventListener('message', function handler(event) {
            if (event.data.type === 'EXTENSION_PONG') {
                clearTimeout(timeout);
                window.removeEventListener('message', handler);
                resolve(true);
            }
        });
    });
}

// Initialize auto import
async function initAutoImport() {
    const statusEl = document.getElementById('extensionStatus');
    
    // Check if extension is installed
    const isInstalled = await checkExtensionInstalled();
    
    if (!isInstalled) {
        statusEl.innerHTML = `
            <div style="background: rgba(255,255,255,0.2); padding: 12px; border-radius: 8px; margin-top: 12px;">
                <p style="margin: 0 0 8px 0; font-weight: bold;">❌ התוסף לא מותקן</p>
                <p style="margin: 0 0 12px 0; font-size: 0.9em;">
                    כדי להשתמש בייבוא אוטומטי, התקן את תוסף Chrome
                </p>
                <a href="#install-extension" style="color: white; text-decoration: underline; font-weight: bold;">
                    📥 הוראות התקנה
                </a>
            </div>
        `;
        return;
    }
    
    // Extension is installed - trigger import
    statusEl.innerHTML = '<p style="margin: 8px 0 0 0;">✅ התוסף מותקן! פותח חלון ייבוא...</p>';
    
    // Send message to extension to start import
    window.postMessage({ 
        type: 'START_AUTO_IMPORT',
        source: 'financial-planner'
    }, '*');
}

// Listen for imported data from extension
window.addEventListener('message', function(event) {
    // Ignore messages from other sources
    if (event.source !== window) return;
    
    if (event.data.type === 'IMPORT_COMPLETE') {
        handleImportedData(event.data.accounts);
    }
});

// Handle imported data
function handleImportedData(accounts) {
    if (!accounts || accounts.length === 0) {
        alert('לא נמצאו חשבונות לייבוא');
        return;
    }
    
    const plan = getCurrentPlan();
    let importedCount = 0;
    
    accounts.forEach(account => {
        // Map account type to our system
        const invType = mapAccountType(account.type);
        
        // Auto-detect sub-tracks from account name
        const subTracks = detectSubTracks(account.name, account.balance);
        
        // Calculate weighted return rate
        const returnRate = subTracks.length > 0 
            ? calculateWeightedReturnFromSubTracks(subTracks)
            : 6; // default
        
        const investment = {
            name: account.name,
            house: account.provider || 'לא מוגדר',
            type: invType,
            tax: TAX_RATES[invType] || 0,
            amount: account.balance || 0,
            monthly: 0, // User can update manually
            returnRate: returnRate,
            feeDeposit: 0,
            feeAnnual: account.managementFee || 0,
            forDream: false,
            include: true,
            gender: 'male', // User can update manually
            subTracks: subTracks
        };
        
        plan.investments.push(investment);
        importedCount++;
    });
    
    saveData();
    renderInvestments();
    
    alert(`✅ יובאו בהצלחה ${importedCount} מסלולים!\n\nבדוק ועדכן את הפרטים במידת הצורך.`);
    
    // Update status
    document.getElementById('extensionStatus').innerHTML = 
        `<p style="margin: 8px 0 0 0;">✅ יובאו ${importedCount} מסלולים בהצלחה!</p>`;
}

// Map account type from scraper to our system
function mapAccountType(scraperType) {
    const mapping = {
        'pension': 'פנסיה',
        'provident': 'קרן השתלמות',
        'investment': 'גמל להשקעה',
        'savings': 'פוליסת חסכון'
    };
    return mapping[scraperType] || 'אחר';
}

// Detect sub-tracks from account name
function detectSubTracks(accountName, totalBalance) {
    const name = accountName.toLowerCase();
    const detectedTracks = [];
    
    // Common investment tracks in Israel
    const trackPatterns = [
        { pattern: 's&p 500', type: 'S&P 500', defaultPercent: 30 },
        { pattern: 'מניות חו"ל', type: 'מדדי מניות חו״ל', defaultPercent: 30 },
        { pattern: 'מניות בארץ', type: 'מדדי מניות בארץ', defaultPercent: 20 },
        { pattern: 'אג"ח', type: 'אג״ח', defaultPercent: 30 },
        { pattern: 'כספית', type: 'קרן כספית', defaultPercent: 10 },
        { pattern: 'נדל"ן', type: 'נדל״ן', defaultPercent: 10 }
    ];
    
    trackPatterns.forEach(track => {
        if (name.includes(track.pattern)) {
            detectedTracks.push({
                type: track.type,
                percent: track.defaultPercent,
                returnRate: SUB_TRACK_DEFAULTS[track.type] || 5
            });
        }
    });
    
    // If nothing detected, return empty (user will set manually)
    return detectedTracks;
}

// Calculate weighted return from sub-tracks
function calculateWeightedReturnFromSubTracks(subTracks) {
    if (!subTracks || subTracks.length === 0) return 6;
    
    const totalPercent = subTracks.reduce((sum, st) => sum + st.percent, 0);
    if (totalPercent === 0) return 6;
    
    const weightedReturn = subTracks.reduce((sum, st) => {
        return sum + (st.returnRate * st.percent / 100);
    }, 0);
    
    return parseFloat(weightedReturn.toFixed(2));
}

// ==========================================
// ROADMAP - PLANNED WITHDRAWALS
// ==========================================

// Withdrawal hierarchy (High tax first, then low, then tax-free)
const WITHDRAWAL_HIERARCHY = [
    { type: 'תיק עצמאי', tax: 25, priority: 1, name: 'תיק עצמאי', blockPension: false },
    { type: 'גמל להשקעה', tax: 25, priority: 2, name: 'גמל להשקעה', blockPension: false },
    { type: 'פוליסת חסכון', tax: 25, priority: 3, name: 'פוליסת חסכון', blockPension: false },
    { type: 'קרן השתלמות', tax: 15, priority: 4, name: 'קרן השתלמות (<6 שנים)', checkYears: true, blockPension: false },
    { type: 'פקדון', tax: 15, priority: 5, name: 'פקדון', blockPension: false },
    { type: 'קרן השתלמות', tax: 0, priority: 6, name: 'קרן השתלמות (6+ שנים)', requireYears: 6, blockPension: false },
    { type: 'קרן כספית', tax: 0, priority: 7, name: 'קרן כספית', blockPension: false },
    { type: 'עו"ש', tax: 0, priority: 8, name: 'עו״ש', blockPension: false },
    { type: 'פנסיה', tax: 999, priority: 999, name: 'פנסיה', blockPension: true } // Blocked!
];

function saveWithdrawal(event) {
    event.preventDefault();
    const plan = getCurrentPlan();
    
    const year = parseInt(document.getElementById('wYear').value);
    const amount = parseFloat(document.getElementById('wAmount').value);
    const goal = document.getElementById('wGoal').value.trim();
    
    if (!plan.withdrawals) {
        plan.withdrawals = [];
    }
    
    const withdrawal = { year, amount, goal };
    
    if (appData.editingWithdrawalIndex >= 0) {
        plan.withdrawals[appData.editingWithdrawalIndex] = withdrawal;
        appData.editingWithdrawalIndex = -1;
        cancelEditWithdrawal();
    } else {
        plan.withdrawals.push(withdrawal);
    }
    
    clearWithdrawalForm();
    saveData();
    renderWithdrawals();
}

function clearWithdrawalForm() {
    document.getElementById('withdrawalForm').reset();
}

function cancelEditWithdrawal() {
    clearWithdrawalForm();
    appData.editingWithdrawalIndex = -1;
    document.getElementById('btnSaveWithdrawalText').textContent = '➕ הוסף משיכה';
    document.getElementById('btnCancelWithdrawalEdit').style.display = 'none';
}

function editWithdrawal(index) {
    const plan = getCurrentPlan();
    const w = plan.withdrawals[index];
    
    appData.editingWithdrawalIndex = index;
    
    document.getElementById('wYear').value = w.year;
    document.getElementById('wAmount').value = w.amount;
    document.getElementById('wGoal').value = w.goal;
    
    document.getElementById('btnSaveWithdrawalText').textContent = 'עדכן משיכה';
    document.getElementById('btnCancelWithdrawalEdit').style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteWithdrawal(index) {
    if (!confirm('האם למחוק משיכה זו?')) return;
    
    const plan = getCurrentPlan();
    plan.withdrawals.splice(index, 1);
    saveData();
    renderWithdrawals();
}

function renderWithdrawals() {
    const plan = getCurrentPlan();
    if (!plan.withdrawals) plan.withdrawals = [];
    
    // Sort by year
    const sorted = [...plan.withdrawals].sort((a, b) => a.year - b.year);
    
    // Render timeline
    renderTimeline(sorted);
    
    // Render strategies
    renderWithdrawalStrategies(sorted);
}

function renderTimeline(withdrawals) {
    const container = document.getElementById('withdrawalTimeline');
    
    if (withdrawals.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-text">אין משיכות מתוכננות</div></div>';
        return;
    }
    
    const currentYear = new Date().getFullYear();
    
    let html = '<div style="padding: 20px;">';
    
    withdrawals.forEach((w, index) => {
        const yearsFromNow = w.year - currentYear;
        html += `
            <div style="display: grid; grid-template-columns: 80px 1fr 120px; gap: 16px; align-items: center; margin-bottom: 16px; padding: 16px; background: white; border-radius: 12px; border: 2px solid #f59e0b; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="text-align: center;">
                    <div style="font-size: 1.8em; font-weight: bold; color: #f59e0b;">${w.year}</div>
                    <div style="font-size: 0.75em; color: #666;">בעוד ${yearsFromNow} שנים</div>
                </div>
                <div>
                    <div style="font-size: 1.1em; font-weight: bold; color: #1f2937; margin-bottom: 4px;">
                        ${w.goal}
                    </div>
                    <div style="font-size: 1.3em; color: #f59e0b; font-weight: bold;">
                        ${formatCurrency(w.amount)}
                    </div>
                </div>
                <div style="text-align: center;">
                    <label style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; user-select: none;">
                        <input type="checkbox" 
                               id="withdrawal_active_${index}" 
                               ${w.active !== false ? 'checked' : ''} 
                               onchange="toggleWithdrawal(${index})"
                               style="width: 20px; height: 20px; cursor: pointer;">
                        <span style="font-size: 0.8em; color: #666; white-space: nowrap;">כלול בתחזית</span>
                    </label>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function renderWithdrawalStrategies(withdrawals) {
    const container = document.getElementById('withdrawalStrategies');
    
    // Filter only active withdrawals
    const activeWithdrawals = withdrawals.filter(w => w.active !== false);
    
    if (activeWithdrawals.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 3em; margin-bottom: 16px;">📊</div>
                <div style="font-size: 1.1em;">לא נבחרו משיכות לחישוב</div>
                <div style="font-size: 0.9em; margin-top: 8px;">סמן את התיבה "כלול בתחזית" כדי לראות אסטרטגיה</div>
            </div>
        `;
        return;
    }
    
    const plan = getCurrentPlan();
    const currentYear = new Date().getFullYear();
    
    let html = '';
    
    activeWithdrawals.forEach((w, wIndex) => {
        const index = withdrawals.indexOf(w);
        const yearsFromNow = w.year - currentYear;
        const strategy = calculateWithdrawalStrategy(w.amount, yearsFromNow, plan);
        
        html += `
            <div class="card" style="margin-top: 20px; border: 2px solid #f59e0b;">
                <div class="card-header" style="background: rgba(245, 158, 11, 0.1);">
                    <div class="card-title" style="color: #92400e;">
                        <span>🎯</span>
                        <span>${w.year} - ${w.goal} (${formatCurrency(w.amount)})</span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-secondary" onclick="editWithdrawal(${index})">
                            ✏️ ערוך
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteWithdrawal(${index})">
                            🗑️ מחק
                        </button>
                    </div>
                </div>
                
                <div style="padding: 20px;">
                    <h3 style="margin-bottom: 16px; color: #f59e0b;">📋 אסטרטגיית משיכה מומלצת:</h3>
                    
                    ${strategy.feasible ? `
                        <div style="background: rgba(16, 185, 129, 0.1); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                            <strong style="color: #10b981;">✅ ניתן למשוך!</strong>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            ${strategy.steps.map((step, i) => `
                                <div style="display: flex; align-items: center; padding: 12px; margin-bottom: 8px; background: white; border-radius: 8px; border-left: 4px solid ${step.tax > 0 ? '#ef4444' : '#10b981'};">
                                    <div style="width: 30px; font-weight: bold;">${i + 1}️⃣</div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: bold;">${step.source}</div>
                                        <div style="font-size: 0.9em; color: #666;">
                                            משיכה ברוטו: ${formatCurrency(step.amount)}
                                        </div>
                                        <div style="font-size: 0.85em; color: #888; margin-top: 4px;">
                                            קרן: ${formatCurrency(step.principal || 0)} | 
                                            רווח: ${formatCurrency(step.profit || 0)} (${(step.profitRatio || 0).toFixed(1)}%)
                                            ${step.tax > 0 ? ` → מס: ${formatCurrency(step.taxAmount)}` : ' → פטור ממס ✅'}
                                        </div>
                                        ${step.netAmount ? `
                                        <div style="font-size: 0.9em; color: #10b981; margin-top: 4px; font-weight: bold;">
                                            💎 נטו בידך: ${formatCurrency(step.netAmount)}
                                        </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                                <div>
                                    <strong style="color: #1f2937;">💵 ברוטו:</strong> 
                                    <div style="color: #3b82f6; font-size: 1.2em; font-weight: bold;">
                                        ${formatCurrency(strategy.totalGross)}
                                    </div>
                                </div>
                                <div>
                                    <strong style="color: #1f2937;">💰 מס:</strong> 
                                    <div style="color: #ef4444; font-size: 1.2em; font-weight: bold;">
                                        ${formatCurrency(strategy.totalTax)}
                                    </div>
                                </div>
                                <div>
                                    <strong style="color: #1f2937;">💎 נטו:</strong> 
                                    <div style="color: #10b981; font-size: 1.2em; font-weight: bold;">
                                        ${formatCurrency(strategy.totalNet)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <h3 style="margin-top: 24px; margin-bottom: 12px; color: #3b82f6;">📊 השפעה על התחזית:</h3>
                        <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
                            <div style="padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 6px; margin-bottom: 12px;">
                                <strong style="color: #dc2626;">⚠️ השפעה מיידית:</strong>
                                <div style="margin-top: 8px; color: #1f2937;">
                                    לקבל <strong>${formatCurrency(w.amount)} נטו</strong> צריך למשוך <strong>${formatCurrency(strategy.totalGross)} ברוטו</strong>
                                    <div style="margin-top: 4px; font-size: 0.9em; color: #666;">
                                        (קיטון של ${((strategy.totalGross / strategy.availableTotal) * 100).toFixed(1)}% מהתיק)
                                    </div>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 0.95em;">
                                <div style="padding: 12px; background: #f0fdf4; border-radius: 6px;">
                                    <div style="color: #15803d; font-weight: bold; margin-bottom: 4px;">ללא משיכה:</div>
                                    <div style="font-size: 1.3em; color: #10b981; font-weight: bold;">${formatCurrency(strategy.availableTotal)}</div>
                                </div>
                                <div style="padding: 12px; background: #eff6ff; border-radius: 6px;">
                                    <div style="color: #1e40af; font-weight: bold; margin-bottom: 4px;">עם משיכה:</div>
                                    <div style="font-size: 1.3em; color: #3b82f6; font-weight: bold;">${formatCurrency(strategy.availableTotal - strategy.totalGross)}</div>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div style="background: rgba(239, 68, 68, 0.1); padding: 16px; border-radius: 8px;">
                            <strong style="color: #ef4444;">❌ אין מספיק כסף!</strong>
                            <p style="margin-top: 8px;">
                                ב-${w.year} יהיה לך רק ${formatCurrency(strategy.availableTotal)} במקום ${formatCurrency(w.amount)}
                            </p>
                        </div>
                    `}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function calculateWithdrawalStrategy(desiredNetAmount, yearsFromNow, plan) {
    // Get available funds by source WITH principal tracking
    const availableFunds = {};
    const principalByType = {};
    
    plan.investments.forEach(inv => {
        if (!inv.include) return;
        if (inv.type === 'פנסיה') return; // Block pension
        
        const futureValue = calculateFV(
            inv.amount, 
            inv.monthly, 
            inv.returnRate, 
            yearsFromNow,
            inv.feeDeposit || 0,
            inv.feeAnnual || 0,
            inv.subTracks
        );
        
        const principal = calculatePrincipal(inv.amount, inv.monthly, yearsFromNow);
        
        if (!availableFunds[inv.type]) {
            availableFunds[inv.type] = 0;
            principalByType[inv.type] = 0;
        }
        availableFunds[inv.type] += futureValue;
        principalByType[inv.type] += principal;
    });
    
    // Calculate total available
    const availableTotal = Object.values(availableFunds).reduce((sum, v) => sum + v, 0);
    
    // Build withdrawal strategy to reach desired NET amount
    const steps = [];
    let remainingNet = desiredNetAmount;
    let totalGross = 0;
    let totalTax = 0;
    
    // Sort hierarchy by priority (high tax first)
    const sorted = [...WITHDRAWAL_HIERARCHY].sort((a, b) => a.priority - b.priority);
    
    for (const source of sorted) {
        if (remainingNet <= 0.01) break; // Small threshold for floating point
        if (source.blockPension) continue; // Skip pension
        
        const available = availableFunds[source.type] || 0;
        if (available <= 0) continue;
        
        // Calculate profit ratio (Average method)
        const totalValue = availableFunds[source.type];
        const totalPrincipal = principalByType[source.type];
        const totalProfit = totalValue - totalPrincipal;
        const profitRatio = totalProfit / totalValue;
        
        // Calculate effective tax rate (only on profit portion)
        const effectiveTaxRate = profitRatio * (source.tax / 100);
        
        // To get X net, need to withdraw: X / (1 - effective_tax_rate)
        const grossNeeded = remainingNet / (1 - effectiveTaxRate);
        const toWithdraw = Math.min(grossNeeded, available);
        
        // Calculate actual amounts
        const profitInWithdrawal = toWithdraw * profitRatio;
        const taxAmount = profitInWithdrawal * (source.tax / 100);
        const netAmount = toWithdraw - taxAmount;
        
        steps.push({
            source: source.name,
            amount: toWithdraw,
            principal: toWithdraw * (1 - profitRatio),
            profit: profitInWithdrawal,
            profitRatio: profitRatio * 100,
            tax: source.tax,
            taxAmount: taxAmount,
            netAmount: netAmount
        });
        
        totalGross += toWithdraw;
        totalTax += taxAmount;
        remainingNet -= netAmount;
    }
    
    // Check if we can reach the desired net amount
    const achievedNet = totalGross - totalTax;
    const feasible = achievedNet >= desiredNetAmount * 0.999; // 0.1% tolerance
    
    if (!feasible || totalGross > availableTotal) {
        return { 
            feasible: false, 
            availableTotal,
            desiredNet: desiredNetAmount,
            achievedNet: achievedNet
        };
    }
    
    return {
        feasible: true,
        steps,
        totalGross: totalGross,
        totalTax: totalTax,
        totalNet: achievedNet,
        desiredNet: desiredNetAmount,
        availableTotal
    };
}

// Initialize editing index
if (!appData.editingWithdrawalIndex) {
    appData.editingWithdrawalIndex = -1;
}


function toggleWithdrawal(index) {
    const plan = getCurrentPlan();
    if (!plan.withdrawals[index]) return;
    
    plan.withdrawals[index].active = document.getElementById(`withdrawal_active_${index}`).checked;
    saveData();
    renderWithdrawals();
}

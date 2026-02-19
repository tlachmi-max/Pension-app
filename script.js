// ==========================================
// Financial Planner Pro v15.0 - THE FIX
// ==========================================

// Constants
const INFLATION_RATE = 2;
const SUB_TRACK_DEFAULTS = {
    'S&P 500': 7, 'מדדי מניות חו״ל': 7, 'כללי': 5, 'אג״ח': 4, 'קרן כספית': 3, 'עו״ש': 0, 'נדל״ן': 6, 'אחר': 5
};

let appData = JSON.parse(localStorage.getItem('financialPlannerData')) || {
    plans: [{ id: Date.now(), name: 'תוכנית ראשית', investments: [] }]
};

// --- לוגיקת סיווג סיכונים ---
function getClassifiedRisk(inv) {
    if (inv.type === 'נדל״ן' || inv.subType === 'אחר') return inv.manualRisk || 'Undefined';
    const lowRisk = ['עו״ש', 'קרן כספית', 'אג״ח'];
    const highRisk = ['S&P 500', 'מדדי מניות חו״ל', 'מניות'];
    
    if (lowRisk.includes(inv.subType)) return 'Low';
    if (highRisk.includes(inv.subType)) return 'High';
    if (inv.subType === 'כללי') return 'Medium';
    return 'Undefined';
}

// --- עדכון תתי-מסלולים (שחזור הרגרסיה) ---
const subTypeMap = {
    'פנסיה': ['S&P 500', 'מדדי מניות חו״ל', 'כללי', 'אג״ח', 'קרן כספית'],
    'קרן השתלמות': ['S&P 500', 'מדדי מניות חו״ל', 'כללי', 'אג״ח'],
    'נדל״ן': ['דירה להשקעה', 'משרד', 'קרקע'],
    'אחר': ['עו״ש', 'קרן כספית', 'קריפטו', 'זהב', 'אחר']
};

function updateSubTypes() {
    const type = document.getElementById('invType').value;
    const subTypeSelect = document.getElementById('invSubType');
    const options = subTypeMap[type] || ['כללי', 'אחר'];
    
    subTypeSelect.innerHTML = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    
    // הצגת שדות לפי סוג
    document.getElementById('pensionFields').style.display = (type === 'פנסיה') ? 'block' : 'none';
    document.getElementById('manualRiskField').style.display = (type === 'נדל״ן' || type === 'אחר') ? 'block' : 'none';
}

// --- חישובים ותצוגה ---
function calculateTotalEquity() {
    return appData.plans[0].investments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
}

function renderCharts() {
    const plan = appData.plans[0];
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    // גרף לפי שווי נוכחי (היום)
    const chartData = {
        labels: plan.investments.map(inv => inv.name || inv.type),
        datasets: [{
            data: plan.investments.map(inv => inv.amount),
            backgroundColor: ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#8b949e']
        }]
    };

    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: { plugins: { legend: { position: 'bottom', labels: { color: '#adbac7' } } } }
    });
    
    renderSummaryUI();
}

function renderSummaryUI() {
    const totalNow = calculateTotalEquity();
    const container = document.getElementById('summary-display');
    if (container) {
        container.innerHTML = `
            <div class="summary-card" style="background: #1c2128; padding: 20px; border-radius: 12px; border: 1px solid #444c56; text-align: center; margin-bottom: 20px;">
                <h3 style="color: #58a6ff; margin: 0;">💰 הון עצמי כולל להיום</h3>
                <div style="font-size: 2.2rem; font-weight: bold; color: #3fb950; margin: 10px 0;">₪ ${totalNow.toLocaleString()}</div>
                <p style="color: #8b949e; font-size: 0.8rem; margin: 0;">* מבוסס על נתונים נומינליים ללא הצמדה</p>
            </div>
        `;
    }
}

// שמירת נתונים
function addInvestment(e) {
    e.preventDefault();
    const inv = {
        id: Date.now(),
        type: document.getElementById('invType').value,
        subType: document.getElementById('invSubType').value,
        name: document.getElementById('invName').value || document.getElementById('invType').value,
        amount: Number(document.getElementById('invAmount').value),
        gender: document.getElementById('invGender')?.value || 'male',
        age: Number(document.getElementById('invAge')?.value) || 0,
        manualRisk: document.getElementById('manualRisk')?.value
    };
    
    appData.plans[0].investments.push(inv);
    saveData();
    renderCharts();
    e.target.reset();
    updateSubTypes();
}

function saveData() {
    localStorage.setItem('financialPlannerData', JSON.stringify(appData));
    // כאן יבוא הסנכרון לענן בהמשך
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    updateSubTypes();
    renderCharts();
});

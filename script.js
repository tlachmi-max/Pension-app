// ==========================================
// Financial Planner Pro v15.0 - FIXED
// ==========================================

// Constants & Rates
const INFLATION_RATE = 2;
const SUB_TRACK_DEFAULTS = {
    'מדדי מניות חו״ל': 7, 'מדדי מניות בארץ': 7,
    'מניות סחיר חו״ל': 7, 'מניות סחיר בארץ': 7,
    'אג״ח': 4, 'S&P 500': 7, 'נדל״ן': 6,
    'עו״ש': 0, 'קרן כספית': 3, 'אחר': 5, 'כללי': 5
};

let appData = JSON.parse(localStorage.getItem('financialPlannerData')) || {
    plans: [{ id: Date.now(), name: 'תוכנית ראשית', investments: [] }]
};

// --- תיקון: הצגת הון נוכחי להיום ---
function calculateTotalNow() {
    const plan = appData.plans[0];
    return plan.investments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
}

// --- תיקון: שחזור תתי-מסלולים ---
const subTypeMap = {
    'פנסיה': ['S&P 500', 'מדדי מניות חו״ל', 'מניות סחיר', 'כללי', 'אג״ח', 'קרן כספית'],
    'קרן השתלמות': ['S&P 500', 'מדדי מניות חו״ל', 'כללי', 'אג״ח'],
    'קופת גמל': ['S&P 500', 'כללי', 'מנייתי'],
    'נדל״ן': ['דירה להשקעה', 'משרד', 'קרקע', 'אחר'],
    'השקעות חופשיות': ['עו״ש', 'קרן כספית', 'תיק מנוהל', 'קריפטו', 'אחר']
};

function updateSubTypes() {
    const type = document.getElementById('invType').value;
    const subTypeSelect = document.getElementById('invSubType');
    const options = subTypeMap[type] || ['כללי', 'אחר'];
    
    subTypeSelect.innerHTML = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    
    // הצגת שדות פנסיה אם נבחר פנסיה
    document.getElementById('pensionFields').style.display = (type === 'פנסיה') ? 'block' : 'none';
    // הצגת בחירת סיכון ידנית לנדל"ן או אחר
    document.getElementById('manualRiskField').style.display = (type === 'נדל״ן' || type === 'השקעות חופשיות') ? 'block' : 'none';
}

// --- עדכון לוגיקת הגרפים (היום במקום 30 שנה) ---
function renderCharts() {
    const plan = appData.plans[0];
    if (!plan.investments.length) return;

    const ctx = document.getElementById('mainChart').getContext('2d');
    
    // מציג את ה-Amount המקורי (היום)
    const data = {
        labels: plan.investments.map(inv => inv.name),
        datasets: [{
            data: plan.investments.map(inv => inv.amount),
            backgroundColor: ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#8b949e', '#bc8cff']
        }]
    };

    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: { plugins: { legend: { position: 'bottom', labels: { color: '#adbac7' } } } }
    });
    
    renderSummary();
}

function renderSummary() {
    const total = calculateTotalNow();
    const container = document.getElementById('summary-display');
    if (container) {
        container.innerHTML = `
            <div class="summary-card">
                <h3 style="color: #58a6ff;">💰 סה"כ הון עצמי (נכון להיום)</h3>
                <div style="font-size: 2rem; font-weight: bold;">₪ ${total.toLocaleString()}</div>
            </div>
        `;
    }
}

// פונקציות עזר לשמירה
function saveData() {
    localStorage.setItem('financialPlannerData', JSON.stringify(appData));
    if (typeof syncToCloud === 'function') syncToCloud();
}

// אתחול
document.addEventListener('DOMContentLoaded', () => {
    updateSubTypes();
    renderCharts();
});

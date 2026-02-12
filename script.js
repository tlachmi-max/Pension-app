// ==========================================
// Financial Planner Pro v3.0
// Complete JavaScript Logic
// ==========================================

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
    'עו״ש': 0, 'קרן כספית': 3, 'אחר': 5
};

// Global State
let appData = { plans: [], currentPlanId: null, editingInvestmentIndex: -1 };
let currentSubTracks = [];
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

function calculatePrincipal(amount, monthly, years) {
    return amount + (monthly * 12 * years);
}

function calculateMonthlyPension(balance, gender) {
    return balance * (PENSION_COEFFICIENT[gender] || PENSION_COEFFICIENT.male);
}

function formatCurrency(amount) {
    return '₪' + Math.round(amount).toLocaleString('he-IL');
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    document.getElementById('invType').addEventListener('change', function() {
        document.getElementById('genderSection').style.display = this.value === 'פנסיה' ? 'block' : 'none';
    });
    
    document.getElementById('invAmount').addEventListener('input', function() {
        document.getElementById('subTracksSection').style.display = (parseFloat(this.value) || 0) > 0 ? 'block' : 'none';
    });
    
    document.getElementById('subTrackType').addEventListener('change', function() {
        const type = this.options[this.selectedIndex].text.split('(')[0].trim();
        document.getElementById('subTrackReturn').value = SUB_TRACK_DEFAULTS[type] || 5;
    });
    
    // Initialize return rate
    const type = document.getElementById('subTrackType').options[0].text.split('(')[0].trim();
    document.getElementById('subTrackReturn').value = SUB_TRACK_DEFAULTS[type] || 7;
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
}

// ==========================================
// SUB-TRACKS
// ==========================================

function addSubTrack() {
    const typeSelect = document.getElementById('subTrackType');
    const type = typeSelect.options[typeSelect.selectedIndex].text.split('(')[0].trim();
    const percent = parseFloat(document.getElementById('subTrackPercent').value) || 0;
    const returnRate = parseFloat(document.getElementById('subTrackReturn').value);
    
    if (percent <= 0 || percent > 100) {
        document.getElementById('subTrackError').textContent = '❌ אחוז חייב להיות בין 0.1-100';
        return;
    }
    
    const currentTotal = currentSubTracks.reduce((sum, st) => sum + st.percent, 0);
    if (currentTotal + percent > 100) {
        document.getElementById('subTrackError').textContent = `❌ סה"כ יעבור 100%! (כרגע: ${currentTotal}%, מנסה להוסיף: ${percent}%)`;
        return;
    }
    
    currentSubTracks.push({ type, percent, returnRate: isNaN(returnRate) ? SUB_TRACK_DEFAULTS[type] : returnRate });
    document.getElementById('subTrackPercent').value = '';
    document.getElementById('subTrackError').textContent = '';
    renderSubTracks();
}

function removeSubTrack(index) {
    currentSubTracks.splice(index, 1);
    renderSubTracks();
}

function editSubTrack(index) {
    const st = currentSubTracks[index];
    document.getElementById('subTrackPercent').value = st.percent;
    document.getElementById('subTrackReturn').value = st.returnRate;
    currentSubTracks.splice(index, 1);
    renderSubTracks();
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
    
    const amount = parseFloat(document.getElementById('invAmount').value) || 0;
    
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
        tax: parseFloat(document.getElementById('invTax').value) || 0,
        amount,
        monthly: parseFloat(document.getElementById('invMonthly').value) || 0,
        returnRate: parseFloat(document.getElementById('invReturn').value) || 0,
        feeDeposit: parseFloat(document.getElementById('invFeeDeposit').value) || 0,
        feeAnnual: parseFloat(document.getElementById('invFeeAnnual').value) || 0,
        forDream: document.getElementById('invForDream').checked,
        include: document.getElementById('invInclude').checked,
        gender: document.getElementById('invGender').value,
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
    
    currentSubTracks = inv.subTracks || [];
    
    if (inv.amount > 0) {
        document.getElementById('subTracksSection').style.display = 'block';
        renderSubTracks();
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
    const select = document.getElementById('dreamSource');
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
    const cost = parseFloat(document.getElementById('dreamCost').value) || 0;
    
    if (!name || cost <= 0) {
        alert('אנא הזן שם ועלות');
        return;
    }
    
    const sourceIndex = document.getElementById('dreamSource').value;
    
    const dream = {
        name,
        cost,
        year: parseInt(document.getElementById('dreamYear').value),
        sourceIndex: sourceIndex !== '' ? parseInt(sourceIndex) : null
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
    if (dream.sourceIndex === null) return null;
    
    const plan = getCurrentPlan();
    const inv = plan.investments[dream.sourceIndex];
    if (!inv) return null;
    
    const currentYear = new Date().getFullYear();
    const yearsUntilDream = dream.year - currentYear;
    
    if (yearsUntilDream <= 0) return { gap: dream.cost, message: '⏰ החלום כבר עבר!', status: 'past' };
    
    const futureCost = dream.cost * Math.pow(1 + INFLATION_RATE / 100, yearsUntilDream);
    const futureValue = calculateFV(inv.amount, inv.monthly, inv.returnRate, yearsUntilDream, 
                                     inv.feeDeposit || 0, inv.feeAnnual || 0, inv.subTracks);
    
    const gap = futureCost - futureValue;
    
    if (gap <= 0) {
        return { 
            gap: 0, 
            message: `✅ מצוין! יהיה לך ${formatCurrency(Math.abs(gap))} נוסף!`,
            status: 'success'
        };
    } else {
        const monthlyNeeded = gap / (yearsUntilDream * 12);
        return { 
            gap, 
            message: `⚠️ חסר ${formatCurrency(gap)}. צריך להוסיף ${formatCurrency(monthlyNeeded)}/חודש`,
            status: 'warning'
        };
    }
}

function renderDreams() {
    const plan = getCurrentPlan();
    const container = document.getElementById('dreamsList');
    document.getElementById('dreamCount').textContent = plan.dreams.length;
    
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
        let sourceName = 'לא מוגדר';
        let gapHTML = '';
        
        if (dream.sourceIndex !== null && plan.investments[dream.sourceIndex]) {
            sourceName = plan.investments[dream.sourceIndex].name;
            const gapData = calculateDreamGap(dream);
            if (gapData) {
                const alertClass = gapData.status === 'success' ? 'alert-success' : 
                                   gapData.status === 'warning' ? 'alert-warning' : 'alert-info';
                gapHTML = `<div class="alert ${alertClass}" style="margin-top: 12px; padding: 12px;">
                    ${gapData.message}
                </div>`;
            }
        }
        
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
                    <div class="item-detail"><span>💰</span><span>עלות: ${formatCurrency(dream.cost)}</span></div>
                    <div class="item-detail"><span>💫</span><span>מקור: ${sourceName}</span></div>
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
    
    const breakdown = plan.investments.map(inv => {
        if (!inv.include) return null;
        
        const nominal = calculateFV(inv.amount, inv.monthly, inv.returnRate, years,
                                    inv.feeDeposit || 0, inv.feeAnnual || 0, inv.subTracks);
        const nominalNoFees = calculateFV(inv.amount, inv.monthly, inv.returnRate, years, 0, 0, 
                                          inv.subTracks ? inv.subTracks.map(st => ({...st, returnRate: st.returnRate})) : null);
        const principal = calculatePrincipal(inv.amount, inv.monthly, years);
        const tax = calculateTax(principal, nominal, inv.tax);
        const fees = nominalNoFees - nominal;
        const real = calculateRealValue(nominal, years);
        
        totalNominal += nominal;
        totalPrincipal += principal;
        totalTax += tax;
        totalFees += fees;
        
        return { inv, nominal, real, tax, principal, fees };
    }).filter(Boolean);
    
    const totalReal = calculateRealValue(totalNominal, years);
    
    document.getElementById('sumNominal').textContent = formatCurrency(totalNominal);
    document.getElementById('sumReal').textContent = formatCurrency(totalReal);
    document.getElementById('sumFees').textContent = formatCurrency(totalFees);
    document.getElementById('sumTax').textContent = formatCurrency(totalTax);
    document.getElementById('sumYearsLabel').textContent = `בעוד ${years} שנה${years > 1 ? 'ים' : ''}`;
    
    const container = document.getElementById('summaryBreakdown');
    container.innerHTML = breakdown.map(item => {
        let pensionHTML = '';
        if (item.inv.type === 'פנסיה' && item.inv.gender) {
            const monthlyPension = calculateMonthlyPension(item.nominal, item.inv.gender);
            pensionHTML = `
                <div class="alert alert-success" style="margin-top: 12px; padding: 12px;">
                    💰 <strong>קצבה חודשית:</strong> ${formatCurrency(monthlyPension)}
                </div>
            `;
        }
        
        return `
            <div class="item">
                <div class="item-header">
                    <div>
                        <div class="item-title">${item.inv.name}</div>
                        <div class="item-subtitle">${item.inv.type}</div>
                    </div>
                    <div style="text-align: left;">
                        <div style="font-size: 1.5em; font-weight: 700; color: var(--success);">
                            ${formatCurrency(item.nominal)}
                        </div>
                        <div style="color: var(--primary); font-size: 0.95em;">
                            ${formatCurrency(item.real)} ריאלי
                        </div>
                    </div>
                </div>
                <div class="item-details">
                    <div class="item-detail"><span>💵</span><span>קרן: ${formatCurrency(item.principal)}</span></div>
                    <div class="item-detail"><span>📈</span><span>רווח: ${formatCurrency(item.nominal - item.principal)}</span></div>
                    <div class="item-detail"><span>💸</span><span>מס: ${formatCurrency(item.tax)}</span></div>
                    <div class="item-detail"><span>💼</span><span>דמי ניהול: ${formatCurrency(item.fees)}</span></div>
                    <div class="item-detail"><span>✅</span><span>נטו: ${formatCurrency(item.nominal - item.tax)}</span></div>
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
    const years = parseInt(document.getElementById('sumYears').value) || 30;
    
    // Calculate totals
    const byType = {};
    const byHouse = {};
    let taxExempt = 0;
    let taxable = 0;
    let total = 0;
    
    plan.investments.forEach(inv => {
        if (!inv.include) return;
        const value = calculateFV(inv.amount, inv.monthly, inv.returnRate, years,
                                  inv.feeDeposit || 0, inv.feeAnnual || 0, inv.subTracks);
        
        byType[inv.type] = (byType[inv.type] || 0) + value;
        byHouse[inv.house] = (byHouse[inv.house] || 0) + value;
        
        if (inv.tax > 0) {
            taxable += value;
        } else {
            taxExempt += value;
        }
        
        total += value;
    });
    
    // Render charts
    renderPieChart('chartByType', byType, 'סוג מסלול');
    renderPieChart('chartByHouse', byHouse, 'בית השקעות');
    renderPieChart('chartByTax', { 'פטור ממס': taxExempt, 'חייב במס': taxable }, 'מיסוי');
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
    
    try {
        const wb = XLSX.utils.book_new();
        
        // Investments sheet
        const invData = plan.investments.map(inv => ({
            'שם': inv.name,
            'סוג': inv.type,
            'בית השקעות': inv.house,
            'סכום נוכחי': inv.amount,
            'הפקדה חודשית': inv.monthly,
            'תשואה %': inv.returnRate,
            'מס %': inv.tax,
            'דמי ניהול הפקדה %': inv.feeDeposit,
            'דמי ניהול צבירה %': inv.feeAnnual
        }));
        
        const ws1 = XLSX.utils.json_to_sheet(invData);
        XLSX.utils.book_append_sheet(wb, ws1, 'מסלולי השקעה');
        
        // Dreams sheet
        const dreamData = plan.dreams.map(d => ({
            'שם': d.name,
            'עלות': d.cost,
            'שנת יעד': d.year
        }));
        
        const ws2 = XLSX.utils.json_to_sheet(dreamData);
        XLSX.utils.book_append_sheet(wb, ws2, 'חלומות');
        
        XLSX.writeFile(wb, `תוכנית_${plan.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
        console.error('Excel export error:', e);
        alert('שגיאה בייצוא ל-Excel');
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
                    include: true,
                    subTracks: []
                }));
            }
            
            saveData();
            render();
            alert('✅ הנתונים יובאו בהצלחה!');
        } catch (e) {
            console.error('Import error:', e);
            alert('❌ שגיאה בייבוא הקובץ');
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

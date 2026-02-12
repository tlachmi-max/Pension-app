/* style.css - Premium Dark Mode Edition */
:root {
    --bg-color: #0d1117;
    --card-bg: #161b22;
    --text-primary: #f0f6fc;
    --text-secondary: #8b949e;
    --accent-blue: #58a6ff;
    --accent-green: #3fb950;
    --accent-red: #f85149;
    --border-color: #30363d;
}

body {
    background-color: var(--bg-color);
    color: var(--text-primary);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    direction: rtl;
    margin: 0;
    padding: 15px;
    line-height: 1.5;
}

/* כרטיסיות המוצרים והסיכום */
.card, .product-card, .summary-card {
    background-color: var(--card-bg) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 12px !important;
    padding: 20px;
    margin-bottom: 15px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}

h1, h2, h3 {
    color: var(--accent-blue) !important;
    margin-top: 0;
}

/* שדות קלט מותאמים לכהה */
input, select, textarea {
    background-color: #0d1117 !important;
    border: 1px solid var(--border-color) !important;
    color: var(--text-primary) !important;
    border-radius: 8px;
    padding: 12px;
    width: 100%;
    box-sizing: border-box;
    margin: 8px 0;
    font-size: 16px; /* מונע זום אוטומטי מעצבן באייפון */
}

/* עיצוב כפתורים */
button {
    background-color: var(--accent-blue) !important;
    color: #ffffff !important;
    border: none;
    border-radius: 8px;
    padding: 12px 20px;
    font-weight: bold;
    cursor: pointer;
    width: 100%;
}

/* הדגשת תוצאות פיננסיות */
.result-value {
    color: var(--accent-green) !important;
    font-size: 1.4em;
    font-weight: 800;
    display: block;
    margin-top: 5px;
}

/* התאמה לגרפים */
.chart-container {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 10px;
}

# 📊 InsightFlow — Business Intelligence Dashboard

A professional, dynamic Business Intelligence dashboard built with **Python Flask**, **Pandas**, **HTML/CSS/JavaScript**, and **Chart.js**. Features multi-section navigation, real-time data filtering, interactive charts, sortable/searchable tables, CSV export, and a premium dark glassmorphism UI — inspired by tools like Power BI and Tableau.

![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=for-the-badge&logo=flask&logoColor=white)
![Pandas](https://img.shields.io/badge/Pandas-2.x-150458?style=for-the-badge&logo=pandas&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-4.x-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)

---

## ✨ Features

### Dashboard Sections

| Section | Description |
|---------|-------------|
| **Overview** | 6 KPI cards, Revenue & Profit trend (line), Sales by Category (doughnut), Revenue by Region (horizontal bar), Quarterly Goals (progress bars) |
| **Sales** | Sales KPIs, Sales Trend with dual-axis (revenue + orders), Top Products table (sortable/searchable), Recent Orders table with status badges |
| **Customers** | Customer KPIs (total, new, LTV, repeat rate), Segment doughnut chart, Top Customers table, Monthly Acquisition bar chart |
| **Analytics** | Category comparison (grouped bar), Regional Performance (stacked bar), Daily Revenue Trend (area chart), Profitability Analysis cards |

### Core Capabilities

| Feature | Details |
|---------|---------|
| **Dynamic Filters** | Date range picker, Category dropdown, Region dropdown — all update charts & tables without page reload |
| **Interactive Charts** | 8+ Chart.js visualizations (line, bar, doughnut, horizontal bar, stacked bar, grouped bar, area) with tooltips |
| **Sortable Tables** | Click any column header to sort ascending/descending |
| **Searchable Tables** | Real-time search with 250ms debounce across all data fields |
| **CSV Export** | Download filtered dataset as CSV with one click |
| **Pandas Processing** | Server-side data aggregation, filtering, and analytics using Pandas |
| **6000+ Record Dataset** | Realistic sales data spanning Jan 2024 – Apr 2026 with seasonal patterns |
| **Responsive Design** | Fully responsive with collapsible mobile sidebar |
| **Dark Glassmorphism UI** | Premium theme with backdrop blur, floating cards, gradient accents, micro-animations |
| **Fade-In Animations** | Staggered scroll-triggered animations using IntersectionObserver |

---

## 📁 Project Structure

```
dashboard/
├── app.py                      # Flask backend — REST APIs + Pandas processing
├── requirements.txt            # Python dependencies
├── README.md                   # Documentation (this file)
├── templates/
│   └── index.html              # Main dashboard template (Jinja2)
└── static/
    ├── css/
    │   └── style.css           # Complete design system & styling
    └── js/
        └── dashboard.js        # Frontend logic — charts, tables, filters
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.8+** installed on your system
- **pip** (Python package manager)

### Installation & Run

```bash
# 1. Navigate to the project directory
cd dashboard

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the application
python app.py

# 4. Open in your browser
#    http://127.0.0.1:5000
```

The dashboard will load with 6000+ pre-generated sales records and display the Overview section.

---

## 🖥️ Usage Guide

### Navigating Sections

Use the **left sidebar** to switch between the 4 main sections:
- **Overview** — High-level KPIs, revenue trends, regional breakdown, and goals
- **Sales** — Detailed sales analytics, product rankings, and order history
- **Customers** — Customer segmentation, acquisition trends, and top buyers
- **Analytics** — Deep-dive category comparisons, regional stacked charts, and profitability

### Using Filters

The **header filter bar** is available on every section:
1. **Date Range** — Set "From" and "To" dates to narrow the time window
2. **Category** — Filter by product category (Electronics, Apparel, etc.)
3. **Region** — Filter by geographic region (North America, Europe, etc.)
4. Click **Apply** to refresh all charts and tables with filtered data

### Sorting Tables

Click any **column header** in the data tables to toggle sort order:
- First click → Ascending (A-Z or low-high)
- Second click → Descending (Z-A or high-low)

### Searching Tables

Type in the **search box** above any table to instantly filter rows. The search matches across all columns with a 250ms debounce for performance.

### Exporting Data

Click the **Export CSV** button to download the currently filtered dataset as a `.csv` file. The export respects all active filters.

### Mobile View

On smaller screens, the sidebar collapses automatically. Tap the **☰ menu icon** to toggle it.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend** | Python 3 + Flask | REST API server, routing, and HTML templating |
| **Data Processing** | Pandas | Data filtering, aggregation, and analytics |
| **Frontend** | HTML5, CSS3, Vanilla JS | Dashboard UI, SPA navigation, AJAX data fetching |
| **Charts** | Chart.js 4.x | Interactive data visualizations (8 chart types) |
| **Icons** | Material Icons (Google) | Consistent iconography throughout |
| **Fonts** | Inter (Google Fonts) | Modern, professional typography |

---

## 🔌 API Reference

All endpoints accept optional query parameters for filtering:

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `start_date` | string | `2025-01-01` | Filter from this date |
| `end_date` | string | `2026-04-16` | Filter until this date |
| `category` | string | `Electronics` | Filter by product category |
| `region` | string | `Europe` | Filter by region |

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/filters` | Available filter options (categories, regions, date range) |
| `GET` | `/api/overview` | KPIs, revenue trend, category/region breakdowns, goals |
| `GET` | `/api/sales` | Sales summary, trend, top products, recent orders |
| `GET` | `/api/customers` | Customer KPIs, segments, top customers, acquisition trend |
| `GET` | `/api/analytics` | Category comparison, region performance, daily trend, profitability |
| `GET` | `/api/export/csv` | Download filtered dataset as CSV file |

### Example Response — `/api/overview`

```json
{
  "kpis": {
    "revenue": 1250019.42,
    "revenue_change": 8.3,
    "profit": 742584.50,
    "profit_change": 12.1,
    "orders": 3358,
    "orders_change": 9.2,
    "customers": 200,
    "customers_change": 5.7,
    "avg_order_value": 372.25,
    "avg_order_change": 2.1,
    "profit_margin": 59.4,
    "margin_change": 1.8
  },
  "revenue_trend": {
    "labels": ["2025-04", "2025-05", ...],
    "revenue": [95000, 102000, ...],
    "profit": [55000, 61000, ...]
  },
  "category_breakdown": { "labels": [...], "data": [...] },
  "region_breakdown": { "labels": [...], "data": [...] },
  "goals": [
    { "label": "Revenue Target", "current": 1250019, "target": 1562524, "color": "#6366f1" }
  ]
}
```

---

## 🎨 Customization

### Connecting Real Data

Replace the `generate_sample_data()` function in `app.py` with your actual data source:

```python
# Example: Load from a CSV file
DATA = pd.read_csv("your_sales_data.csv", parse_dates=["date"])

# Example: Load from a database
import sqlalchemy
engine = sqlalchemy.create_engine("postgresql://user:pass@host/db")
DATA = pd.read_sql("SELECT * FROM sales", engine, parse_dates=["date"])
```

Ensure your DataFrame has these columns: `date`, `order_id`, `customer_id`, `customer_name`, `segment`, `region`, `category`, `product`, `units`, `revenue`, `cost`, `profit`, `status`.

### Changing Theme Colors

Edit the CSS custom properties in `static/css/style.css`:

```css
:root {
    --accent-1: #6366f1;       /* Primary accent */
    --accent-2: #8b5cf6;       /* Secondary accent */
    --bg-primary: #06081a;     /* Main background */
    --bg-card: rgba(17, 20, 48, 0.72);  /* Card background */
}
```

### Adding New Charts

1. Create a data endpoint in `app.py` (or add to an existing one)
2. Add a `<canvas>` element in `templates/index.html`
3. Write a render function in `static/js/dashboard.js`
4. Call it from the section loader

---

## 📜 License

This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).

---

<p align="center">
  Built with Flask, Pandas & Chart.js
</p>

"""
InsightFlow — Business Intelligence Dashboard
=============================================
Flask backend with Pandas data processing, REST APIs,
dynamic filtering, and CSV export.
"""

import random
import io
import csv
from datetime import datetime, timedelta

import pandas as pd
from flask import Flask, render_template, jsonify, request, Response

# ═══════════════════════════════════════════════════════════════════════════════
# App Configuration
# ═══════════════════════════════════════════════════════════════════════════════

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

# ═══════════════════════════════════════════════════════════════════════════════
# Sample Data Generation
# ═══════════════════════════════════════════════════════════════════════════════

# Product catalog: (product_name, base_price, base_cost)
PRODUCT_CATALOG = {
    "Electronics": [
        ("Wireless Headphones Pro", 79.99, 32.00),
        ("Ultra-Slim Laptop 15\"", 1299.99, 680.00),
        ("Smart Fitness Watch", 249.99, 105.00),
        ("Bluetooth Speaker Max", 149.99, 58.00),
        ("4K Action Camera", 399.99, 165.00),
        ("Noise Cancelling Earbuds", 199.99, 78.00),
    ],
    "Apparel": [
        ("Premium Denim Jacket", 129.99, 42.00),
        ("Running Shoes Elite", 179.99, 62.00),
        ("Cashmere Sweater", 249.99, 88.00),
        ("Performance Polo Shirt", 69.99, 20.00),
        ("Winter Parka", 299.99, 115.00),
        ("Athletic Shorts", 49.99, 14.00),
    ],
    "Home & Garden": [
        ("Smart LED Lamp Set", 89.99, 30.00),
        ("Espresso Machine Deluxe", 499.99, 210.00),
        ("Robot Vacuum Pro", 649.99, 280.00),
        ("Organic Herb Garden Kit", 39.99, 12.00),
        ("Memory Foam Pillow Set", 79.99, 25.00),
        ("Air Purifier 360", 299.99, 120.00),
    ],
    "Sports": [
        ("Carbon Fiber Tennis Racket", 229.99, 90.00),
        ("Yoga Mat Premium", 59.99, 18.00),
        ("Adjustable Dumbbell Set", 349.99, 145.00),
        ("Mountain Bike Helmet", 119.99, 42.00),
        ("Resistance Band Kit", 34.99, 10.00),
        ("Insulated Water Bottle", 29.99, 8.00),
    ],
    "Books": [
        ("Data Science Handbook", 49.99, 15.00),
        ("Leadership Mastery", 24.99, 7.00),
        ("Creative Design Thinking", 34.99, 10.00),
        ("Financial Freedom Guide", 19.99, 6.00),
        ("AI & Machine Learning", 59.99, 18.00),
        ("Mindfulness Journal", 14.99, 4.00),
    ],
    "Beauty": [
        ("Organic Skincare Set", 89.99, 28.00),
        ("Professional Hair Dryer", 149.99, 52.00),
        ("Vitamin C Serum Bundle", 64.99, 18.00),
        ("Luxury Perfume Collection", 199.99, 65.00),
        ("Anti-Aging Eye Cream", 79.99, 22.00),
        ("Natural Lip Care Kit", 29.99, 8.00),
    ],
}

REGIONS = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"]

CUSTOMER_FIRST = [
    "James", "Sarah", "Michael", "Emma", "Robert", "Olivia", "William",
    "Sophia", "David", "Isabella", "Richard", "Mia", "Joseph", "Charlotte",
    "Thomas", "Amelia", "Charles", "Harper", "Daniel", "Evelyn",
    "Alexander", "Aria", "Henry", "Chloe", "Benjamin", "Luna",
    "Lucas", "Grace", "Mason", "Lily", "Ethan", "Zoe",
]

CUSTOMER_LAST = [
    "Anderson", "Thompson", "Garcia", "Martinez", "Robinson", "Clark",
    "Rodriguez", "Lewis", "Lee", "Walker", "Hall", "Allen",
    "Young", "King", "Wright", "Lopez", "Hill", "Scott",
    "Green", "Adams", "Baker", "Nelson", "Carter", "Mitchell",
    "Perez", "Roberts", "Turner", "Phillips", "Campbell", "Parker",
]

STATUSES = ["completed", "completed", "completed", "completed", "pending", "processing"]

SEGMENTS = ["Enterprise", "SMB", "Startup", "Individual"]


def generate_sample_data(n_records=6000):
    """Generate a realistic sales dataset with seasonal patterns."""
    random.seed(42)

    # Date range: Jan 2024 → Apr 2026
    start = datetime(2024, 1, 1)
    end = datetime(2026, 4, 16)
    total_days = (end - start).days

    # Pre-generate customer pool
    customers = []
    for i in range(200):
        fname = random.choice(CUSTOMER_FIRST)
        lname = random.choice(CUSTOMER_LAST)
        customers.append({
            "customer_id": f"CUST-{1000 + i}",
            "customer_name": f"{fname} {lname}",
            "segment": random.choice(SEGMENTS),
            "region": random.choice(REGIONS),
        })

    records = []
    for i in range(n_records):
        # Random date with slight upward trend (more recent = more orders)
        day_offset = int(random.triangular(0, total_days, total_days * 0.7))
        order_date = start + timedelta(days=day_offset)

        # Seasonal multiplier (Q4 boost, Q1 dip)
        month = order_date.month
        seasonal = 1.0
        if month in (11, 12):
            seasonal = 1.35  # Holiday season
        elif month in (1, 2):
            seasonal = 0.85  # Post-holiday dip
        elif month in (6, 7):
            seasonal = 1.15  # Summer boost

        # Pick customer & product
        customer = random.choice(customers)
        category = random.choice(list(PRODUCT_CATALOG.keys()))
        product_name, base_price, base_cost = random.choice(PRODUCT_CATALOG[category])

        # Add price variation (±15%)
        price_var = random.uniform(0.85, 1.15)
        unit_price = round(base_price * price_var, 2)
        unit_cost = round(base_cost * price_var, 2)

        # Units sold (1-5 for expensive, 1-20 for cheap)
        max_units = 5 if base_price > 200 else (10 if base_price > 50 else 20)
        units = max(1, int(random.expovariate(0.5) * seasonal))
        units = min(units, max_units)

        revenue = round(unit_price * units, 2)
        cost = round(unit_cost * units, 2)
        profit = round(revenue - cost, 2)

        records.append({
            "date": order_date.strftime("%Y-%m-%d"),
            "order_id": f"ORD-{100000 + i}",
            "customer_id": customer["customer_id"],
            "customer_name": customer["customer_name"],
            "segment": customer["segment"],
            "region": customer["region"],
            "category": category,
            "product": product_name,
            "units": units,
            "unit_price": unit_price,
            "revenue": revenue,
            "cost": cost,
            "profit": profit,
            "status": random.choice(STATUSES),
        })

    df = pd.DataFrame(records)
    df["date"] = pd.to_datetime(df["date"])
    return df


# ── Generate data at startup ──────────────────────────────────────────────────
DATA = generate_sample_data()


# ═══════════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════════

def apply_filters(df):
    """Apply date, category, and region filters from query parameters."""
    filtered = df.copy()

    start_date = request.args.get("start_date", "")
    end_date = request.args.get("end_date", "")
    category = request.args.get("category", "all")
    region = request.args.get("region", "all")

    if start_date:
        filtered = filtered[filtered["date"] >= pd.to_datetime(start_date)]
    if end_date:
        filtered = filtered[filtered["date"] <= pd.to_datetime(end_date)]
    if category and category != "all":
        filtered = filtered[filtered["category"] == category]
    if region and region != "all":
        filtered = filtered[filtered["region"] == region]

    return filtered


def compute_change(current, previous):
    """Compute percentage change between two values."""
    if previous == 0:
        return 0.0
    return round((current - previous) / previous * 100, 1)


def get_previous_period(df):
    """Get data from the previous period of equal length for comparison."""
    start_date = request.args.get("start_date", "")
    end_date = request.args.get("end_date", "")
    category = request.args.get("category", "all")
    region = request.args.get("region", "all")

    if start_date and end_date:
        s = pd.to_datetime(start_date)
        e = pd.to_datetime(end_date)
        delta = e - s
        prev_end = s - timedelta(days=1)
        prev_start = prev_end - delta
    else:
        # Default: compare last 6 months vs previous 6 months
        latest = df["date"].max()
        prev_end = latest - timedelta(days=180)
        prev_start = prev_end - timedelta(days=180)

        # Also filter the "current" to last 6 months if no explicit range
        start_date = (latest - timedelta(days=180)).strftime("%Y-%m-%d")

    prev = df[(df["date"] >= prev_start) & (df["date"] <= prev_end)]

    if category and category != "all":
        prev = prev[prev["category"] == category]
    if region and region != "all":
        prev = prev[prev["region"] == region]

    return prev


# ═══════════════════════════════════════════════════════════════════════════════
# Routes — Pages
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/")
def index():
    """Serve the main dashboard page."""
    return render_template("index.html")


# ═══════════════════════════════════════════════════════════════════════════════
# Routes — REST APIs
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/filters")
def api_filters():
    """Return available filter options (categories, regions, date range)."""
    return jsonify({
        "categories": sorted(DATA["category"].unique().tolist()),
        "regions": sorted(DATA["region"].unique().tolist()),
        "date_range": {
            "min": DATA["date"].min().strftime("%Y-%m-%d"),
            "max": DATA["date"].max().strftime("%Y-%m-%d"),
        },
    })


@app.route("/api/overview")
def api_overview():
    """Return KPIs, revenue trend, category/region breakdowns, and goals."""
    filtered = apply_filters(DATA)
    prev = get_previous_period(DATA)

    # ── KPIs ──────────────────────────────────────────────
    revenue = filtered["revenue"].sum()
    profit = filtered["profit"].sum()
    orders = len(filtered)
    customers = filtered["customer_id"].nunique()
    avg_order = revenue / orders if orders > 0 else 0
    margin = (profit / revenue * 100) if revenue > 0 else 0

    prev_revenue = prev["revenue"].sum()
    prev_profit = prev["profit"].sum()
    prev_orders = len(prev)
    prev_customers = prev["customer_id"].nunique()
    prev_avg = prev_revenue / prev_orders if prev_orders > 0 else 0
    prev_margin = (prev_profit / prev_revenue * 100) if prev_revenue > 0 else 0

    kpis = {
        "revenue": round(revenue, 2),
        "revenue_change": compute_change(revenue, prev_revenue),
        "profit": round(profit, 2),
        "profit_change": compute_change(profit, prev_profit),
        "orders": orders,
        "orders_change": compute_change(orders, prev_orders),
        "customers": customers,
        "customers_change": compute_change(customers, prev_customers),
        "avg_order_value": round(avg_order, 2),
        "avg_order_change": compute_change(avg_order, prev_avg),
        "profit_margin": round(margin, 1),
        "margin_change": compute_change(margin, prev_margin),
    }

    # ── Revenue Trend (monthly) ───────────────────────────
    monthly = (
        filtered.groupby(filtered["date"].dt.to_period("M"))
        .agg(revenue=("revenue", "sum"), profit=("profit", "sum"))
        .reset_index()
    )
    monthly["date"] = monthly["date"].astype(str)
    revenue_trend = {
        "labels": monthly["date"].tolist(),
        "revenue": [round(v, 2) for v in monthly["revenue"].tolist()],
        "profit": [round(v, 2) for v in monthly["profit"].tolist()],
    }

    # ── Category Breakdown ────────────────────────────────
    by_cat = (
        filtered.groupby("category")["revenue"]
        .sum()
        .sort_values(ascending=False)
        .reset_index()
    )
    category_breakdown = {
        "labels": by_cat["category"].tolist(),
        "data": [round(v, 2) for v in by_cat["revenue"].tolist()],
    }

    # ── Region Breakdown ──────────────────────────────────
    by_reg = (
        filtered.groupby("region")["revenue"]
        .sum()
        .sort_values(ascending=False)
        .reset_index()
    )
    region_breakdown = {
        "labels": by_reg["region"].tolist(),
        "data": [round(v, 2) for v in by_reg["revenue"].tolist()],
    }

    # ── Goals ─────────────────────────────────────────────
    goals = [
        {"label": "Revenue Target", "current": round(revenue, 0),
         "target": round(revenue * 1.25, 0), "color": "#6366f1"},
        {"label": "Profit Goal", "current": round(profit, 0),
         "target": round(profit * 1.30, 0), "color": "#10b981"},
        {"label": "Customer Acquisition", "current": customers,
         "target": int(customers * 1.20), "color": "#8b5cf6"},
        {"label": "Order Volume", "current": orders,
         "target": int(orders * 1.15), "color": "#f59e0b"},
    ]

    return jsonify({
        "kpis": kpis,
        "revenue_trend": revenue_trend,
        "category_breakdown": category_breakdown,
        "region_breakdown": region_breakdown,
        "goals": goals,
    })


@app.route("/api/sales")
def api_sales():
    """Return sales summary, trend, top products, and recent orders."""
    filtered = apply_filters(DATA)

    # ── Summary Cards ─────────────────────────────────────
    total_sales = round(filtered["revenue"].sum(), 2)
    total_orders = len(filtered)
    top_cat = (
        filtered.groupby("category")["revenue"].sum().idxmax()
        if len(filtered) > 0 else "N/A"
    )

    summary = {
        "total_sales": total_sales,
        "total_orders": total_orders,
        "top_category": top_cat,
    }

    # ── Sales Trend (monthly) ─────────────────────────────
    monthly = (
        filtered.groupby(filtered["date"].dt.to_period("M"))
        .agg(revenue=("revenue", "sum"), orders=("order_id", "count"))
        .reset_index()
    )
    monthly["date"] = monthly["date"].astype(str)
    sales_trend = {
        "labels": monthly["date"].tolist(),
        "revenue": [round(v, 2) for v in monthly["revenue"].tolist()],
        "orders": monthly["orders"].tolist(),
    }

    # ── Top Products ──────────────────────────────────────
    top_products = (
        filtered.groupby(["product", "category"])
        .agg(revenue=("revenue", "sum"), units=("units", "sum"),
             profit=("profit", "sum"), orders=("order_id", "count"))
        .sort_values("revenue", ascending=False)
        .head(10)
        .reset_index()
    )
    top_products_list = []
    for _, row in top_products.iterrows():
        top_products_list.append({
            "product": row["product"],
            "category": row["category"],
            "revenue": round(row["revenue"], 2),
            "units": int(row["units"]),
            "profit": round(row["profit"], 2),
            "orders": int(row["orders"]),
        })

    # ── Recent Orders (last 100) ──────────────────────────
    recent = filtered.sort_values("date", ascending=False).head(100)
    recent_orders = []
    for _, row in recent.iterrows():
        recent_orders.append({
            "order_id": row["order_id"],
            "date": row["date"].strftime("%Y-%m-%d"),
            "customer": row["customer_name"],
            "product": row["product"],
            "category": row["category"],
            "region": row["region"],
            "units": int(row["units"]),
            "revenue": round(row["revenue"], 2),
            "status": row["status"],
        })

    return jsonify({
        "summary": summary,
        "sales_trend": sales_trend,
        "top_products": top_products_list,
        "recent_orders": recent_orders,
    })


@app.route("/api/customers")
def api_customers():
    """Return customer KPIs, segments, top customers, and acquisition trend."""
    filtered = apply_filters(DATA)

    # ── Customer KPIs ─────────────────────────────────────
    total_customers = filtered["customer_id"].nunique()
    # "New" customers = those whose first order is within the filtered range
    first_orders = filtered.groupby("customer_id")["date"].min()
    if len(filtered) > 0:
        cutoff = filtered["date"].max() - timedelta(days=90)
        new_customers = (first_orders >= cutoff).sum()
    else:
        new_customers = 0

    avg_ltv = round(
        filtered.groupby("customer_id")["revenue"].sum().mean(), 2
    ) if total_customers > 0 else 0

    # Repeat rate: customers with >1 order
    order_counts = filtered.groupby("customer_id")["order_id"].count()
    repeat_rate = round(
        (order_counts > 1).sum() / total_customers * 100, 1
    ) if total_customers > 0 else 0

    kpis = {
        "total_customers": total_customers,
        "new_customers": int(new_customers),
        "avg_lifetime_value": float(avg_ltv),
        "repeat_rate": repeat_rate,
    }

    # ── Segments ──────────────────────────────────────────
    seg = (
        filtered.groupby("segment")["customer_id"]
        .nunique()
        .reset_index(name="count")
    )
    segments = {
        "labels": seg["segment"].tolist(),
        "data": seg["count"].tolist(),
    }

    # ── Top Customers ─────────────────────────────────────
    top_cust = (
        filtered.groupby(["customer_id", "customer_name"])
        .agg(revenue=("revenue", "sum"), orders=("order_id", "count"),
             last_order=("date", "max"))
        .sort_values("revenue", ascending=False)
        .head(10)
        .reset_index()
    )
    top_customers_list = []
    for _, row in top_cust.iterrows():
        top_customers_list.append({
            "customer_id": row["customer_id"],
            "name": row["customer_name"],
            "revenue": round(row["revenue"], 2),
            "orders": int(row["orders"]),
            "last_order": row["last_order"].strftime("%Y-%m-%d"),
        })

    # ── Monthly Acquisition ───────────────────────────────
    first_order_dates = DATA.groupby("customer_id")["date"].min().reset_index()
    first_order_dates.columns = ["customer_id", "first_date"]
    monthly_new = (
        first_order_dates.groupby(first_order_dates["first_date"].dt.to_period("M"))
        .size()
        .reset_index(name="count")
    )
    monthly_new["first_date"] = monthly_new["first_date"].astype(str)
    acquisition = {
        "labels": monthly_new["first_date"].tolist(),
        "data": monthly_new["count"].tolist(),
    }

    return jsonify({
        "kpis": kpis,
        "segments": segments,
        "top_customers": top_customers_list,
        "acquisition": acquisition,
    })


@app.route("/api/analytics")
def api_analytics():
    """Return advanced analytics: category comparison, region heatmap,
    daily trend, and profitability data."""
    filtered = apply_filters(DATA)

    # ── Category Comparison ───────────────────────────────
    cat_comp = (
        filtered.groupby("category")
        .agg(revenue=("revenue", "sum"), profit=("profit", "sum"),
             orders=("order_id", "count"))
        .reset_index()
    )
    category_comparison = {
        "labels": cat_comp["category"].tolist(),
        "revenue": [round(v, 2) for v in cat_comp["revenue"].tolist()],
        "profit": [round(v, 2) for v in cat_comp["profit"].tolist()],
        "orders": cat_comp["orders"].tolist(),
    }

    # ── Region Performance (monthly, stacked) ─────────────
    reg_monthly = (
        filtered.groupby([filtered["date"].dt.to_period("M"), "region"])
        ["revenue"].sum()
        .reset_index()
    )
    reg_monthly["date"] = reg_monthly["date"].astype(str)
    region_labels = sorted(reg_monthly["date"].unique().tolist())
    region_datasets = []
    colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"]
    for idx, reg in enumerate(REGIONS):
        rdata = reg_monthly[reg_monthly["region"] == reg]
        vals = []
        for lbl in region_labels:
            match = rdata[rdata["date"] == lbl]
            vals.append(round(float(match["revenue"].sum()), 2) if len(match) > 0 else 0)
        region_datasets.append({
            "label": reg,
            "data": vals,
            "backgroundColor": colors[idx % len(colors)] + "cc",
            "borderColor": colors[idx % len(colors)],
            "borderWidth": 1,
        })
    region_performance = {
        "labels": region_labels,
        "datasets": region_datasets,
    }

    # ── Daily Trend (last 30 days) ────────────────────────
    if len(filtered) > 0:
        latest = filtered["date"].max()
        last_30 = filtered[filtered["date"] >= (latest - timedelta(days=30))]
        daily = (
            last_30.groupby(last_30["date"].dt.date)
            .agg(revenue=("revenue", "sum"), orders=("order_id", "count"))
            .reset_index()
        )
        daily_trend = {
            "labels": [d.strftime("%b %d") for d in daily["date"].tolist()],
            "revenue": [round(v, 2) for v in daily["revenue"].tolist()],
            "orders": daily["orders"].tolist(),
        }
    else:
        daily_trend = {"labels": [], "revenue": [], "orders": []}

    # ── Profitability by Category ─────────────────────────
    prof = (
        filtered.groupby("category")
        .agg(revenue=("revenue", "sum"), profit=("profit", "sum"),
             units=("units", "sum"))
        .reset_index()
    )
    prof["margin"] = round(prof["profit"] / prof["revenue"] * 100, 1)
    profitability = []
    for _, row in prof.iterrows():
        profitability.append({
            "category": row["category"],
            "revenue": round(row["revenue"], 2),
            "profit": round(row["profit"], 2),
            "margin": float(row["margin"]),
            "units": int(row["units"]),
        })

    return jsonify({
        "category_comparison": category_comparison,
        "region_performance": region_performance,
        "daily_trend": daily_trend,
        "profitability": profitability,
    })


# ═══════════════════════════════════════════════════════════════════════════════
# Export — CSV Download
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/export/csv")
def export_csv():
    """Export the filtered dataset as a downloadable CSV file."""
    filtered = apply_filters(DATA)
    filtered_export = filtered.copy()
    filtered_export["date"] = filtered_export["date"].dt.strftime("%Y-%m-%d")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(filtered_export.columns.tolist())
    for _, row in filtered_export.iterrows():
        writer.writerow(row.tolist())

    csv_content = output.getvalue()
    output.close()

    return Response(
        csv_content,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=insightflow_export.csv"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Entry Point
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    print(f"\n  * InsightFlow BI Dashboard")
    print(f"  * Running on http://0.0.0.0:{port}\n")
    # debug=False is crucial for production, host="0.0.0.0" makes it accessible externally
    app.run(host="0.0.0.0", port=port, debug=False)

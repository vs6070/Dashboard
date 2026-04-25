/**
 * InsightFlow — Dashboard JavaScript
 * ===================================
 * Handles navigation, data fetching, chart rendering,
 * table sorting/searching, filters, and CSV export.
 */

(function () {
    "use strict";

    // ══════════════════════════════════════════════════════════════════════
    // State
    // ══════════════════════════════════════════════════════════════════════

    const state = {
        activeSection: "overview",
        charts: {},    // Chart.js instances keyed by canvas ID
        sortState: {}, // { tableId: { column, direction } }
    };

    // ══════════════════════════════════════════════════════════════════════
    // Chart.js Global Defaults
    // ══════════════════════════════════════════════════════════════════════

    Chart.defaults.color = "#94a3b8";
    Chart.defaults.borderColor = "rgba(99,102,241,0.06)";
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyle = "circle";
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = "#1e293b";
    Chart.defaults.plugins.tooltip.borderColor = "rgba(99,102,241,0.25)";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
    Chart.defaults.plugins.tooltip.titleColor = "#f1f5f9";
    Chart.defaults.plugins.tooltip.bodyColor = "#94a3b8";

    // ══════════════════════════════════════════════════════════════════════
    // DOM References
    // ══════════════════════════════════════════════════════════════════════

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const loadingOverlay = $("#loadingOverlay");
    const sidebar = $("#sidebar");
    const sidebarOverlay = $("#sidebarOverlay");
    const menuToggle = $("#menuToggle");
    const sectionTitle = $("#sectionTitle");
    const sectionSubtitle = $("#sectionSubtitle");
    const btnApplyFilters = $("#btnApplyFilters");
    const btnExportCSV = $("#btnExportCSV");
    const startDateInput = $("#startDate");
    const endDateInput = $("#endDate");
    const categorySelect = $("#categoryFilter");
    const regionSelect = $("#regionFilter");

    // ══════════════════════════════════════════════════════════════════════
    // Utility Functions
    // ══════════════════════════════════════════════════════════════════════

    /** Format number as currency string */
    function fmtCurrency(n) {
        if (Math.abs(n) >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
        if (Math.abs(n) >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K";
        return "$" + n.toFixed(2);
    }

    /** Format number with commas */
    function fmtNumber(n) {
        return Number(n).toLocaleString("en-US");
    }

    /** Build query-string from current filter values */
    function getFilterParams() {
        const params = new URLSearchParams();
        if (startDateInput.value) params.set("start_date", startDateInput.value);
        if (endDateInput.value) params.set("end_date", endDateInput.value);
        if (categorySelect.value) params.set("category", categorySelect.value);
        if (regionSelect.value) params.set("region", regionSelect.value);
        return params.toString();
    }

    /** Fetch JSON from an API endpoint with current filters */
    async function fetchAPI(endpoint) {
        const qs = getFilterParams();
        const url = `/api/${endpoint}` + (qs ? `?${qs}` : "");
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
    }

    /** Destroy an existing chart instance */
    function destroyChart(id) {
        if (state.charts[id]) {
            state.charts[id].destroy();
            delete state.charts[id];
        }
    }

    /** Trigger IntersectionObserver fade-in on .fade-up elements */
    function initFadeAnimations() {
        const observer = new IntersectionObserver(
            (entries) => entries.forEach((e) => {
                if (e.isIntersecting) e.target.classList.add("visible");
            }),
            { threshold: 0.08 }
        );
        $$(".fade-up").forEach((el) => {
            el.classList.remove("visible");
            observer.observe(el);
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ══════════════════════════════════════════════════════════════════════

    const SECTION_META = {
        overview:  { title: "Dashboard Overview",    subtitle: "Key metrics & performance summary" },
        sales:     { title: "Sales Analytics",       subtitle: "Revenue, products & order tracking" },
        customers: { title: "Customer Insights",     subtitle: "Segments, acquisition & lifetime value" },
        analytics: { title: "Advanced Analytics",    subtitle: "Deep-dive into trends & profitability" },
    };

    function switchSection(sectionId) {
        if (state.activeSection === sectionId) return;
        state.activeSection = sectionId;

        // Update nav active state
        $$(".nav-item").forEach((item) => {
            item.classList.toggle("active", item.dataset.section === sectionId);
        });

        // Toggle section visibility
        $$(".section").forEach((section) => {
            section.classList.toggle("active", section.id === `section-${sectionId}`);
        });

        // Update header title
        const meta = SECTION_META[sectionId] || {};
        sectionTitle.textContent = meta.title || "";
        sectionSubtitle.textContent = meta.subtitle || "";

        // Load data for the section
        loadSectionData(sectionId);

        // Close mobile sidebar
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("show");
    }

    // ══════════════════════════════════════════════════════════════════════
    // SECTION DATA LOADERS
    // ══════════════════════════════════════════════════════════════════════

    async function loadSectionData(section) {
        try {
            switch (section) {
                case "overview":  await loadOverview(); break;
                case "sales":     await loadSales(); break;
                case "customers": await loadCustomers(); break;
                case "analytics": await loadAnalytics(); break;
            }
            initFadeAnimations();
        } catch (err) {
            console.error(`Failed to load ${section}:`, err);
        }
    }

    // ── Overview ─────────────────────────────────────────────────────────

    async function loadOverview() {
        const data = await fetchAPI("overview");

        // KPIs
        renderKPIs("overviewKpis", [
            { label: "Total Revenue",   value: fmtCurrency(data.kpis.revenue),  change: data.kpis.revenue_change,  icon: "payments",     cls: "blue" },
            { label: "Net Profit",      value: fmtCurrency(data.kpis.profit),   change: data.kpis.profit_change,   icon: "trending_up",  cls: "green" },
            { label: "Total Orders",    value: fmtNumber(data.kpis.orders),     change: data.kpis.orders_change,   icon: "shopping_cart", cls: "yellow" },
            { label: "Customers",       value: fmtNumber(data.kpis.customers),  change: data.kpis.customers_change, icon: "people",       cls: "purple" },
            { label: "Avg Order Value", value: "$" + data.kpis.avg_order_value.toFixed(2), change: data.kpis.avg_order_change, icon: "receipt", cls: "cyan" },
            { label: "Profit Margin",   value: data.kpis.profit_margin + "%",   change: data.kpis.margin_change,   icon: "pie_chart",    cls: "pink" },
        ]);

        // Revenue Trend
        renderLineChart("revenueChart", {
            labels: data.revenue_trend.labels,
            datasets: [
                {
                    label: "Revenue", data: data.revenue_trend.revenue,
                    borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.08)",
                    fill: true, tension: 0.4, borderWidth: 2.5,
                },
                {
                    label: "Profit", data: data.revenue_trend.profit,
                    borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.08)",
                    fill: true, tension: 0.4, borderWidth: 2.5,
                },
            ],
        }, { yPrefix: "$", yDivide: 1000, ySuffix: "K" });

        // Category Breakdown
        renderDoughnutChart("categoryChart", {
            labels: data.category_breakdown.labels,
            data: data.category_breakdown.data,
            colors: ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed"],
        });

        // Region Breakdown
        renderHBarChart("regionChart", {
            labels: data.region_breakdown.labels,
            data: data.region_breakdown.data,
            color: "#8b5cf6",
        });

        // Goals
        renderGoals("overviewGoals", data.goals);
    }

    // ── Sales ────────────────────────────────────────────────────────────

    async function loadSales() {
        const data = await fetchAPI("sales");

        // Summary KPIs
        renderKPIs("salesKpis", [
            { label: "Total Sales",   value: fmtCurrency(data.summary.total_sales),  icon: "point_of_sale", cls: "blue" },
            { label: "Total Orders",  value: fmtNumber(data.summary.total_orders),   icon: "receipt_long",  cls: "green" },
            { label: "Top Category",  value: data.summary.top_category,              icon: "category",      cls: "purple" },
        ]);

        // Sales Trend
        renderLineChart("salesTrendChart", {
            labels: data.sales_trend.labels,
            datasets: [
                {
                    label: "Revenue", data: data.sales_trend.revenue,
                    borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.10)",
                    fill: true, tension: 0.4, borderWidth: 2.5,
                    yAxisID: "y",
                },
                {
                    label: "Orders", data: data.sales_trend.orders,
                    borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)",
                    fill: false, tension: 0.4, borderWidth: 2,
                    yAxisID: "y1",
                },
            ],
        }, { dualAxis: true });

        // Top Products Table
        renderSortableTable("topProductsBody", data.top_products, [
            { key: "product",  label: "Product",  bold: true },
            { key: "category", label: "Category" },
            { key: "revenue",  label: "Revenue",  format: fmtCurrency, bold: true },
            { key: "units",    label: "Units",    format: fmtNumber },
            { key: "profit",   label: "Profit",   format: fmtCurrency },
            { key: "orders",   label: "Orders",   format: fmtNumber },
        ]);

        // Recent Orders Table
        renderSortableTable("recentOrdersBody", data.recent_orders, [
            { key: "order_id", label: "Order ID", bold: true },
            { key: "date",     label: "Date" },
            { key: "customer", label: "Customer" },
            { key: "product",  label: "Product" },
            { key: "category", label: "Category" },
            { key: "region",   label: "Region" },
            { key: "revenue",  label: "Revenue", format: fmtCurrency, bold: true },
            { key: "status",   label: "Status",  badge: true },
        ]);
    }

    // ── Customers ────────────────────────────────────────────────────────

    async function loadCustomers() {
        const data = await fetchAPI("customers");

        // KPIs
        renderKPIs("customerKpis", [
            { label: "Total Customers",    value: fmtNumber(data.kpis.total_customers),     icon: "people",         cls: "blue" },
            { label: "New (Last 90d)",     value: fmtNumber(data.kpis.new_customers),       icon: "person_add",     cls: "green" },
            { label: "Avg Lifetime Value", value: fmtCurrency(data.kpis.avg_lifetime_value), icon: "account_balance", cls: "purple" },
            { label: "Repeat Rate",        value: data.kpis.repeat_rate + "%",               icon: "loop",           cls: "yellow" },
        ]);

        // Segments Doughnut
        renderDoughnutChart("segmentChart", {
            labels: data.segments.labels,
            data: data.segments.data,
            colors: ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b"],
        });

        // Top Customers Table
        renderSortableTable("topCustomersBody", data.top_customers, [
            { key: "customer_id", label: "ID", bold: true },
            { key: "name",        label: "Customer" },
            { key: "revenue",     label: "Revenue",    format: fmtCurrency, bold: true },
            { key: "orders",      label: "Orders",     format: fmtNumber },
            { key: "last_order",  label: "Last Order" },
        ]);

        // Monthly Acquisition Bar Chart
        renderBarChart("acquisitionChart", {
            labels: data.acquisition.labels,
            data: data.acquisition.data,
            color: "#8b5cf6",
            label: "New Customers",
        });
    }

    // ── Analytics ────────────────────────────────────────────────────────

    async function loadAnalytics() {
        const data = await fetchAPI("analytics");

        // Category Comparison Grouped Bar
        renderGroupedBarChart("categoryCompChart", {
            labels: data.category_comparison.labels,
            datasets: [
                { label: "Revenue", data: data.category_comparison.revenue, color: "#6366f1" },
                { label: "Profit",  data: data.category_comparison.profit,  color: "#10b981" },
            ],
        });

        // Region Performance Stacked Bar
        renderStackedBarChart("regionPerfChart", data.region_performance);

        // Daily Trend (area)
        renderLineChart("dailyTrendChart", {
            labels: data.daily_trend.labels,
            datasets: [
                {
                    label: "Daily Revenue", data: data.daily_trend.revenue,
                    borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.12)",
                    fill: true, tension: 0.35, borderWidth: 2.5,
                    pointRadius: 3, pointHoverRadius: 6,
                },
            ],
        }, { yPrefix: "$" });

        // Profitability Cards
        renderProfitability("profitGrid", data.profitability);
    }

    // ══════════════════════════════════════════════════════════════════════
    // RENDER FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════

    /** Render KPI cards into a container */
    function renderKPIs(containerId, kpis) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = kpis.map((k) => {
            const dir = k.change >= 0 ? "up" : "down";
            const arrow = k.change >= 0 ? "arrow_upward" : "arrow_downward";
            const changeHTML = k.change !== undefined
                ? `<span class="kpi-change ${dir}">
                       <span class="material-icons-round">${arrow}</span>
                       ${Math.abs(k.change)}%
                   </span>`
                : "";
            return `
                <div class="kpi-card fade-up">
                    <div class="kpi-top">
                        <span class="kpi-label">${k.label}</span>
                        <div class="kpi-icon ${k.cls}">
                            <span class="material-icons-round">${k.icon}</span>
                        </div>
                    </div>
                    <div class="kpi-value">${k.value}</div>
                    ${changeHTML}
                </div>`;
        }).join("");
    }

    /** Render goal progress bars */
    function renderGoals(containerId, goals) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = goals.map((g) => {
            const pct = Math.min((g.current / g.target) * 100, 100).toFixed(1);
            const fCurrent = g.current >= 1000 ? fmtNumber(g.current) : g.current;
            const fTarget  = g.target >= 1000 ? fmtNumber(g.target) : g.target;
            return `
                <div class="goal-item">
                    <div class="goal-top">
                        <h4>${g.label}</h4>
                        <span style="color:${g.color}">${pct}%</span>
                    </div>
                    <div class="goal-bar">
                        <div class="goal-fill" style="width:${pct}%;background:${g.color}"></div>
                    </div>
                    <div class="goal-meta">
                        <span>Current: ${fCurrent}</span>
                        <span>Target: ${fTarget}</span>
                    </div>
                </div>`;
        }).join("");
    }

    /** Render profitability cards */
    function renderProfitability(containerId, items) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = items.map((p) => {
            const cls = p.margin >= 55 ? "high" : p.margin >= 40 ? "medium" : "low";
            return `
                <div class="profit-item fade-up">
                    <h4>${p.category}</h4>
                    <div class="margin-value ${cls}">${p.margin}%</div>
                    <small>Revenue: ${fmtCurrency(p.revenue)}</small>
                </div>`;
        }).join("");
    }

    // ── Chart Renderers ──────────────────────────────────────────────────

    function renderLineChart(canvasId, chartData, opts = {}) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        const scalesConfig = {
            x: { grid: { display: false } },
            y: {
                grid: { color: "rgba(99,102,241,0.05)" },
                ticks: {
                    callback: (v) => {
                        if (opts.yDivide) v = v / opts.yDivide;
                        return (opts.yPrefix || "") + (typeof v === 'number' ? v.toLocaleString() : v) + (opts.ySuffix || "");
                    },
                },
            },
        };

        if (opts.dualAxis) {
            scalesConfig.y1 = {
                position: "right",
                grid: { display: false },
                ticks: { color: "#f59e0b" },
            };
        }

        state.charts[canvasId] = new Chart(ctx, {
            type: "line",
            data: { labels: chartData.labels, datasets: chartData.datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: { position: "top", align: "end" },
                    tooltip: {
                        callbacks: {
                            label: (c) => ` ${c.dataset.label}: ${opts.yPrefix === "$" ? fmtCurrency(c.parsed.y) : fmtNumber(c.parsed.y)}`,
                        },
                    },
                },
                scales: scalesConfig,
            },
        });
    }

    function renderDoughnutChart(canvasId, chartData) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        state.charts[canvasId] = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: chartData.labels,
                datasets: [{
                    data: chartData.data,
                    backgroundColor: chartData.colors,
                    borderColor: "transparent",
                    borderWidth: 2,
                    hoverOffset: 8,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "65%",
                plugins: {
                    legend: { position: "bottom", labels: { padding: 14, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: (c) => ` ${c.label}: ${fmtCurrency(c.parsed)}`,
                        },
                    },
                },
            },
        });
    }

    function renderHBarChart(canvasId, chartData) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        state.charts[canvasId] = new Chart(ctx, {
            type: "bar",
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: "Revenue",
                    data: chartData.data,
                    backgroundColor: chartData.labels.map((_, i) => {
                        const colors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8"];
                        return colors[i % colors.length] + "cc";
                    }),
                    borderRadius: 6,
                    borderSkipped: false,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: { label: (c) => ` Revenue: ${fmtCurrency(c.parsed.x)}` },
                    },
                },
                scales: {
                    x: { grid: { color: "rgba(99,102,241,0.05)" }, ticks: { callback: (v) => "$" + (v / 1000).toFixed(0) + "K" } },
                    y: { grid: { display: false } },
                },
            },
        });
    }

    function renderBarChart(canvasId, chartData) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        state.charts[canvasId] = new Chart(ctx, {
            type: "bar",
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: chartData.label || "Value",
                    data: chartData.data,
                    backgroundColor: chartData.color + "b3",
                    borderColor: chartData.color,
                    borderWidth: 1,
                    borderRadius: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: "rgba(99,102,241,0.05)" }, beginAtZero: true },
                },
            },
        });
    }

    function renderGroupedBarChart(canvasId, chartData) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        state.charts[canvasId] = new Chart(ctx, {
            type: "bar",
            data: {
                labels: chartData.labels,
                datasets: chartData.datasets.map((ds) => ({
                    label: ds.label,
                    data: ds.data,
                    backgroundColor: ds.color + "b3",
                    borderColor: ds.color,
                    borderWidth: 1,
                    borderRadius: 6,
                })),
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "top", align: "end" },
                    tooltip: {
                        callbacks: { label: (c) => ` ${c.dataset.label}: ${fmtCurrency(c.parsed.y)}` },
                    },
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: "rgba(99,102,241,0.05)" }, ticks: { callback: (v) => "$" + (v / 1000).toFixed(0) + "K" } },
                },
            },
        });
    }

    function renderStackedBarChart(canvasId, chartData) {
        destroyChart(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        state.charts[canvasId] = new Chart(ctx, {
            type: "bar",
            data: {
                labels: chartData.labels,
                datasets: chartData.datasets.map((ds) => ({
                    ...ds,
                    borderRadius: 4,
                })),
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "top", align: "end", labels: { font: { size: 10 } } },
                    tooltip: {
                        callbacks: { label: (c) => ` ${c.dataset.label}: ${fmtCurrency(c.parsed.y)}` },
                    },
                },
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, grid: { color: "rgba(99,102,241,0.05)" }, ticks: { callback: (v) => "$" + (v / 1000).toFixed(0) + "K" } },
                },
            },
        });
    }

    // ── Table Renderers ──────────────────────────────────────────────────

    /** Render rows into a <tbody> */
    function renderSortableTable(tbodyId, rows, columns) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;

        // Store data for sorting/searching
        tbody.dataset.rows = JSON.stringify(rows);
        tbody.dataset.columns = JSON.stringify(columns);

        _renderTableRows(tbody, rows, columns);
    }

    function _renderTableRows(tbody, rows, columns) {
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columns.length}" class="table-empty">No data found</td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map((row) => {
            const cells = columns.map((col) => {
                let val = row[col.key];
                if (col.format) val = col.format(val);
                if (col.badge) return `<td><span class="badge-status ${row[col.key]}">${row[col.key]}</span></td>`;
                return `<td${col.bold ? ' class="td-bold"' : ''}>${val}</td>`;
            }).join("");
            return `<tr>${cells}</tr>`;
        }).join("");
    }

    // ══════════════════════════════════════════════════════════════════════
    // TABLE SORTING
    // ══════════════════════════════════════════════════════════════════════

    function setupTableSorting() {
        $$(".data-table th[data-sort]").forEach((th) => {
            th.addEventListener("click", () => {
                const tableId = th.closest("table").querySelector("tbody").id;
                const col = th.dataset.sort;
                const tbody = document.getElementById(tableId);
                if (!tbody) return;

                // Determine sort direction
                const current = state.sortState[tableId];
                let dir = "asc";
                if (current && current.column === col && current.direction === "asc") dir = "desc";
                state.sortState[tableId] = { column: col, direction: dir };

                // Update sort icons
                th.closest("thead").querySelectorAll("th").forEach((h) => h.classList.remove("sorted"));
                th.classList.add("sorted");
                const icon = th.querySelector(".sort-icon");
                if (icon) icon.textContent = dir === "asc" ? "arrow_upward" : "arrow_downward";

                // Sort data
                const rows = JSON.parse(tbody.dataset.rows || "[]");
                const columns = JSON.parse(tbody.dataset.columns || "[]");

                rows.sort((a, b) => {
                    let va = a[col], vb = b[col];
                    if (typeof va === "string") va = va.toLowerCase();
                    if (typeof vb === "string") vb = vb.toLowerCase();
                    if (va < vb) return dir === "asc" ? -1 : 1;
                    if (va > vb) return dir === "asc" ? 1 : -1;
                    return 0;
                });

                _renderTableRows(tbody, rows, columns);
            });
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    // TABLE SEARCHING
    // ══════════════════════════════════════════════════════════════════════

    function setupTableSearch(inputId, tbodyId) {
        const input = document.getElementById(inputId);
        const tbody = document.getElementById(tbodyId);
        if (!input || !tbody) return;

        let timer;
        input.addEventListener("input", () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                const query = input.value.toLowerCase().trim();
                const rows = JSON.parse(tbody.dataset.rows || "[]");
                const columns = JSON.parse(tbody.dataset.columns || "[]");

                const filtered = query
                    ? rows.filter((row) => Object.values(row).some((v) =>
                        String(v).toLowerCase().includes(query)
                    ))
                    : rows;

                _renderTableRows(tbody, filtered, columns);
            }, 250); // Debounce 250ms
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    // FILTERS & EXPORT
    // ══════════════════════════════════════════════════════════════════════

    /** Populate filter dropdowns from API */
    async function loadFilters() {
        try {
            const data = await fetch("/api/filters").then((r) => r.json());

            // Populate category select
            categorySelect.innerHTML = '<option value="all">All Categories</option>';
            data.categories.forEach((c) => {
                categorySelect.innerHTML += `<option value="${c}">${c}</option>`;
            });

            // Populate region select
            regionSelect.innerHTML = '<option value="all">All Regions</option>';
            data.regions.forEach((r) => {
                regionSelect.innerHTML += `<option value="${r}">${r}</option>`;
            });

            // Set date range defaults (last 12 months)
            const maxDate = new Date(data.date_range.max);
            const startDefault = new Date(maxDate);
            startDefault.setFullYear(startDefault.getFullYear() - 1);
            startDateInput.value = startDefault.toISOString().split("T")[0];
            endDateInput.value = data.date_range.max;
            startDateInput.min = data.date_range.min;
            startDateInput.max = data.date_range.max;
            endDateInput.min = data.date_range.min;
            endDateInput.max = data.date_range.max;
        } catch (err) {
            console.error("Failed to load filters:", err);
        }
    }

    /** Export filtered data as CSV download */
    function exportCSV() {
        const qs = getFilterParams();
        const url = `/api/export/csv` + (qs ? `?${qs}` : "");
        window.open(url, "_blank");
    }

    // ══════════════════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ══════════════════════════════════════════════════════════════════════

    function setupEventListeners() {
        // Navigation
        $$(".nav-item[data-section]").forEach((item) => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                switchSection(item.dataset.section);
            });
        });

        // Mobile sidebar
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
            sidebarOverlay.classList.toggle("show");
        });
        sidebarOverlay.addEventListener("click", () => {
            sidebar.classList.remove("open");
            sidebarOverlay.classList.remove("show");
        });

        // Filters
        btnApplyFilters.addEventListener("click", () => {
            loadSectionData(state.activeSection);
        });

        // Export
        btnExportCSV.addEventListener("click", exportCSV);

        // Table search inputs
        setupTableSearch("salesSearch", "recentOrdersBody");
        setupTableSearch("productSearch", "topProductsBody");
        setupTableSearch("customerSearch", "topCustomersBody");
    }

    // ══════════════════════════════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════════════════════════════

    async function init() {
        await loadFilters();
        setupEventListeners();
        await loadOverview();
        setupTableSorting();
        initFadeAnimations();
        loadingOverlay.classList.add("hide");
    }

    // Kick off when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();

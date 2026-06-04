---
type: process
slug: executive-dashboard
title: Executive Dashboard — Process
source_collection: consulting-toolkits
domain: metrics
model_name: 5-Category Executive Dashboard Build
---
# Executive Dashboard Toolkit

**One-liner:** Monitor and visualise every KPI that matters — company, function, project, portfolio — in a single executive view.

**Core value:** A set of live, data-driven dashboards that give executives an instant, one-screen picture of organisational performance — so every leadership decision is grounded in numbers, not gut feel.

---

## When to Use This Toolkit

Deploy the Executive Dashboard Toolkit when any of the following triggers apply:

- **New leadership mandate:** a new CEO, CFO, or division head needs to understand performance fast and establish a data-driven operating rhythm within 90 days.
- **Board or investor reporting:** the organisation presents to its board, investors, or audit committee and needs charts that communicate clearly — not spreadsheets emailed as attachments.
- **Performance recovery:** a business unit is underperforming and the leadership team needs a common fact base before diagnosing root causes and making resource decisions.
- **Budget and planning cycle:** finance needs a vehicle to compare actuals against budget in real time throughout the year.
- **Strategic plan execution:** the leadership team has a 3–5-year plan and needs a live mechanism to track whether initiatives are on schedule and delivering outcomes.
- **Investment monitoring:** an individual investor, family office, or corporate treasury team needs to consolidate a multi-asset portfolio and track net worth trajectory.

This toolkit is appropriate regardless of organisational size. The same dashboard architecture applies to a 20-person startup and a 20,000-person enterprise; the number of metrics and dashboards scales, but the structure does not change.

---

## The Process at a Glance

| Phase | Goal | Key Question | Deliverable | Gate |
|---|---|---|---|---|
| 1. Company Overall Performance | Enterprise financial and operational view in one screen | How are we performing vs. revenue, profit, margin, and cash targets? | Company Performance Dashboard (KPI scorecard, waterfall, gauge, combo charts) | C-suite sponsor confirms all headline KPIs captured and chart stories correct |
| 2. Functional Dashboards | Purpose-built dashboards for each function | How is each function performing vs. its own KPIs? | Suite of functional dashboards (Sales, Marketing, Ops, HR, Finance) | Each functional head and CFO sign off on KPI definitions and roll-up arithmetic |
| 3. Project Dashboards | Real-time project status across the portfolio | Are our projects on time, on budget, on scope? | Project Portfolio Dashboard (Gantt, Budget vs. Actual, initiative tracker) | PMO Director and sponsors confirm the dashboard reflects portfolio health |
| 4. Strategic Plan & Roadmap | Translate strategy into a trackable visual | Are we executing our strategic plan? | Strategic Plan & Roadmap Dashboard (roadmap, Balanced Scorecard, initiative ROI) | CEO and Board Chair confirm alignment with approved strategy |
| 5. Investment & Net Worth | Portfolio performance and wealth trajectory | Is my portfolio generating returns above benchmark? | Investment & Net Worth Dashboard (allocation, performance vs. benchmark, net worth) | Investor validates numbers match brokerage statements |

---

## Phase 1: Build the Company Overall Performance Dashboard

### Goal
Create a single integrated dashboard that gives the C-suite a real-time view of enterprise-wide financial and operational performance versus target.

### Key Question
How is the company performing against revenue, profit, margin, and cash targets — and what is driving any variance?

### Step 1.1 — Collect and Structure the Raw Financial Data

**How:** Pull monthly actuals from your ERP or accounting system: revenue by product/region, a full P&L (Revenue → COGS → Gross Profit → SG&A → EBITDA → EBIT → Interest → Tax → Net Profit), and cash flow (Operating, Investing, Financing, Net Change, Cash Balance). Lay the data in a single Input tab with one row per line item and one column per month (Jan–Dec + Total), exactly mirroring the raw-data template. Ensure that budget/target rows sit directly beneath each actual row so variance formulas are simple subtractions.

**Input:** ERP or accounting system export; budget file; prior-year actuals.

**Output:** Structured raw-data Input tab covering all 12 months for P&L, cash flow, and product-level revenue.

**Owner:** FP&A Analyst / Finance Manager.

### Step 1.2 — Design the KPI Scorecard with RAG Status

**How:** Identify the 8–12 headline KPIs the executive committee monitors monthly (Revenue, Gross Margin %, EBITDA, Net Profit, Operating Cash Flow, DSO, Inventory Turns, Website Traffic Growth, Subscriber Growth). For each KPI, define: (a) the monthly target, (b) a green threshold (actual ≥ target), (c) an amber threshold (actual between 95 % and 100 % of target), and (d) a red threshold (actual < 95 % of target). Use Excel conditional formatting rules so the scorecard tile changes colour automatically as actuals update.

**Input:** Raw-data Input tab; executive-defined KPI list and thresholds.

**Output:** KPI scorecard block with auto-updating RAG colour coding for current month and YTD.

**Owner:** Finance Manager / Consultant.

### Step 1.3 — Build Revenue and Profit Waterfall Charts

**How:** Use the Excel stacked-bar waterfall technique: create an invisible base bar equal to the prior period, then add a positive or negative visible bar for each movement. For the Revenue Waterfall (bridge), show: Prior Year Revenue → Price Effect → Volume Effect → New Products/Markets → FX → Current Year Revenue. For the Profit Bridge: Revenue → COGS → Gross Profit → SG&A → EBITDA → D&A → EBIT → Interest → Tax → Net Profit. Colour positive bars green and negative bars red. Add data labels showing both the absolute amount and the percentage change.

**Input:** Revenue and P&L actuals vs. prior year and vs. budget from the raw-data Input tab.

**Output:** Revenue Waterfall chart; Profit Bridge / Waterfall chart.

**Owner:** Finance Manager / Consultant.

### Step 1.4 — Build Gauge Charts for Non-Financial KPIs

**How:** Construct donut-based gauge charts for KPIs such as Website Traffic Growth and Subscriber Growth. In the raw-data tab, set up a gauge-data block: Start = 0; three equal arc sections (Low, Average, High each = 0.3); Total = 0.9; Performance = the actual value mapped to the arc scale. The donut chart's first series (invisible) creates the bottom half; the coloured three sections create the upper arc; a tiny bar-chart needle overlaid in the centre shows the actual reading. Use traffic-light colours: red for Low, amber for Average, green for High.

**Input:** Gauge raw-data table (sections + actual performance value on the arc scale).

**Output:** Gauge chart for each non-financial KPI (typically 2–4 gauges).

**Owner:** Finance Manager / Analyst.

### Step 1.5 — Assemble the Combo Chart

**How:** Create a combo chart per major financial KPI (Revenue, Profit, Margin) merging: (1) a clustered-column series showing monthly actuals; (2) a line series showing the 3-month rolling average (to smooth seasonality); (3) a flat line series showing the target monthly run-rate (annual target ÷ 12). This single chart shows whether the company is on track (actual vs. target line), whether momentum is improving (trend line), and where volatility lies. If margin is on the same chart as revenue, use a secondary axis.

**Input:** Monthly actuals; 3-month rolling average formula; annualised target.

**Output:** Combo chart per major KPI embedded in the dashboard page.

**Owner:** Finance Manager / Analyst.

### Step 1.6 — Assemble and Publish the One-Page C-Suite Dashboard

**How:** Arrange all elements on a single Excel dashboard page using a grid layout: scorecard tiles at the top row, combo/waterfall charts in the centre two-thirds, gauge charts at the bottom right. Add Excel slicers for Month and YTD/Full-Year toggle. Protect all formula cells; leave only the raw-data Input tab editable. Export to PDF for board distribution.

**Input:** All chart components; company branding guidelines.

**Output:** Company Overall Performance Dashboard — Excel workbook and PDF export.

**Owner:** Finance Manager / Consultant.

### Deliverable
Company Overall Performance Dashboard: one-page Excel/PDF showing enterprise KPIs, waterfall charts, gauge charts, and combo charts.

### KPIs for This Phase
- All 12 months loaded with zero formula errors.
- Data updated within 48 hours of month close.
- All board-mandated KPIs visible in a single scroll.

### Exit Gate
C-suite sponsor reviews and signs off: all headline KPIs captured; chart stories align with management narrative.

---

## Phase 2: Build the Functional Dashboards

### Goal
Deploy purpose-built dashboards for each major business function so functional leaders have their own KPI view aligned to company targets.

### Key Question
How is each function performing against its own KPIs, and how do those KPIs roll up to enterprise goals?

### Step 2.1 — Identify KPIs for Each Function (SMART-KPI Workshop)

**How:** For each function, run a 30-minute structured KPI alignment session with the functional head and one FP&A analyst. Use the SMART-KPI filter: every candidate metric must be Specific (unambiguous definition), Measurable (a single formula from an identified data source), Aligned (linked to a company OKR or strategic pillar), Relevant (actionable by the functional team), and Time-bound (reported monthly or quarterly). Capture 6–10 validated KPIs per function, recording them in a KPI Dictionary tab: Metric Name, Definition, Formula, Owner, Data Source, Target, and Reporting Frequency.

**Input:** Company strategy, functional OKRs, prior-period reporting packs.

**Output:** KPI Dictionary tab with 6–10 validated, SMART-filtered KPIs per function.

**Owner:** Consultant / FP&A with each functional head.

### Step 2.2 — Map Data Sources and Build Input Tabs

**How:** For each functional KPI, identify the system of record: CRM (Salesforce, HubSpot) for Sales; Google Analytics or similar for Marketing; ERP or MES for Operations; HRIS (Workday, SuccessFactors) for HR. Build one raw-data Input tab per function inside the master workbook, mirroring the company-level input structure. A monthly data-entry action in each functional tab automatically updates all charts.

**Input:** System-of-record exports (CRM, ERP, HRIS, analytics platform).

**Output:** Per-function raw-data Input tabs with 13 months of history.

**Owner:** FP&A Analyst / IT liaison.

### Step 2.3 — Build Functional Scorecards and Trend Charts

**How:** For each function, create: (1) a scorecard table (current month actual vs. target vs. prior month, RAG indicator); (2) a 12-month trend line chart for each KPI; (3) at least one combo chart merging two related metrics (e.g., Sales Revenue columns + Win Rate line). Use the same conditional-formatting RAG palette as the company dashboard to ensure visual coherence when all dashboards are viewed together.

**Input:** Functional Input tabs; KPI Dictionary targets and thresholds.

**Output:** Functional scorecard block and trend charts for each of the five or six major functions.

**Owner:** Finance Manager / Consultant.

### Step 2.4 — Add Function-Specific Deep-Dive Charts

**How:** Each function needs 2–3 charts that reveal the 'why behind the what': Sales — a funnel chart showing Leads → Qualified → Proposal → Close with conversion rates at each stage; HR — a headcount waterfall (Opening Balance + Hires − Exits − Internal Transfers = Closing Balance); Marketing — a channel-mix donut showing lead volume and cost per lead by channel; Operations — an on-time delivery heat-map by week and product line; Finance — a cash conversion cycle trend.

**Input:** Functional Input tab; process-specific data (funnel stages, headcount movements, channel data).

**Output:** 2–3 function-specific deep-dive visualisations per function.

**Owner:** Functional Analyst / Consultant.

### Step 2.5 — Link Functional Dashboards to the Company Overview

**How:** Add a navigation panel (set of hyperlink buttons, one per function) to the company overview dashboard tab. Ensure that 2–3 key metrics from each functional dashboard feed directly into the company KPI scorecard as sub-metrics, maintaining hierarchical consistency. Document the roll-up logic in the KPI Dictionary.

**Input:** All functional dashboards; company overview dashboard.

**Output:** Integrated multi-tab workbook with navigation, metric roll-ups, and KPI Dictionary.

**Owner:** Finance Manager.

### Deliverable
Suite of functional dashboards (Sales, Marketing, Operations, HR, Finance) each with scorecard, trend charts, and function-specific deep-dive visuals.

### KPIs for This Phase
- All functions have at least 6 KPIs tracked monthly.
- All functional KPIs linked to at least one company-level KPI.
- Data updated within 72 hours of month close.

### Exit Gate
Each functional head signs off on KPI definitions and thresholds. CFO validates roll-up arithmetic. Proceed only when all functions confirmed.

---

## Phase 3: Build the Project Dashboards

### Goal
Give project managers and executive sponsors a real-time portfolio view of project status, schedule, budget, and milestone health.

### Key Question
Are our projects on time, on budget, and on scope — and what corrective action is needed?

### Step 3.1 — Build the Project Portfolio Input Table

**How:** Create a single Project Portfolio Input tab listing every active project. Columns: Project Name, Strategic Pillar (link to Phase 4), Owner, Department, Start Date, Planned End Date, Revised End Date, % Complete Planned, % Complete Actual, Budget Allocated ($), Spend to Date ($), Forecast at Completion ($), and Overall RAG Status (formula-driven based on schedule and budget variance). One row per project. This is the sole data source for all project dashboard visuals.

**Input:** Project plans, budget tracking sheets, monthly PM status reports.

**Output:** Project Portfolio Input table with one row per active project and auto-calculated RAG status.

**Owner:** PMO / Project Manager.

### Step 3.2 — Build the Gantt / Timeline Chart

**How:** Construct a stacked-bar Gantt chart: the first (invisible) series offsets the start date from the chart origin; the second (coloured) series represents project duration. Add a separate scatter data point for today's date, rendered as a vertical line using error bars (±0 horizontal, ±100 vertical in axis units). Overlay a secondary series showing actual completion to date as a darker shade on top of the planned bar. Colour bars by phase: Planning (blue), Execution (orange), Closure (green).

**Input:** Project Portfolio Input table (Start Date, Planned End, % Complete Actual).

**Output:** Dynamic Gantt chart for all active projects (one bar per project).

**Owner:** PMO / Project Manager.

### Step 3.3 — Build the Budget vs. Actual Chart

**How:** Plot a clustered-column chart, two bars per project: Budget Allocated and Spend to Date. Add data labels showing the variance amount and percentage. Conditionally colour the Spend bar red when Spend > Budget × 1.05 (over budget), amber when within 0–5 % over, green when under. Add a summary row below the chart: Total Portfolio Budget, Total Spend to Date, Portfolio Variance ($), and Forecast at Completion.

**Input:** Budget and spend data from Project Portfolio Input table.

**Output:** Project budget vs. actual clustered-column chart with portfolio summary.

**Owner:** PMO / Finance.

### Step 3.4 — Add the Initiative-Status Milestone Tracker

**How:** Build a structured table: rows = active projects, columns = Top 3 Milestones for the current quarter. Each cell shows: Milestone Name | Planned Date | Actual/Forecast Date | Status. Apply in-cell green/amber/red background fills for instant readability. On Track = green (forecast within 2 weeks of planned); At Risk = amber (forecast 2–4 weeks late); Delayed = red (forecast >4 weeks late or milestone already missed).

**Input:** Milestone schedules per project; PM weekly updates.

**Output:** Initiative-status milestone tracker embedded in the dashboard page.

**Owner:** PMO.

### Step 3.5 — Assemble the One-Page Project Dashboard

**How:** Lay out the dashboard page: portfolio-summary scorecard tiles at the top (Total Projects, On Track count, At Risk count, Delayed count, Portfolio Budget, Spend to Date, Forecast at Completion); Gantt chart occupying the top two-thirds of the body; Budget vs. Actual chart in the bottom-left quadrant; Initiative-Status Tracker in the bottom-right quadrant. Add a project-name slicer so the view can be filtered to a single project or business unit.

**Input:** Gantt chart, Budget vs. Actual chart, Milestone Tracker, Portfolio Input table summary.

**Output:** One-page Project Portfolio Dashboard (Excel + PDF).

**Owner:** PMO / Consultant.

### Deliverable
Project Portfolio Dashboard: one-page view of Gantt, Budget vs. Actual, Initiative-Status Tracker, and portfolio-level scorecard.

### KPIs for This Phase
- 100 % of active projects listed with % complete and RAG status.
- Budget vs. actual for all projects with >$50K allocation.
- Dashboard updated weekly.
- Executive can identify top 3 at-risk projects in under 60 seconds.

### Exit Gate
PMO Director and project sponsors confirm the dashboard accurately reflects portfolio health. Finance validates budget numbers against the cost-tracking system.

---

## Phase 4: Build the Strategic Plan and Business Roadmap Dashboard

### Goal
Translate the multi-year strategic plan into a visual, trackable dashboard so leadership can monitor whether strategic initiatives are being executed on schedule.

### Key Question
Are we executing our strategic plan, and are the initiatives that will deliver our long-term goals on track?

### Step 4.1 — Map Strategic Pillars and Initiatives to the Roadmap

**How:** Extract the 3–5 strategic pillars from the approved strategy document. For each pillar, list 3–6 flagship initiatives planned over the next 1–3 years. Enter each in the Strategic Roadmap Input table: Pillar, Initiative Name, Owner (name + role), Start Quarter/Year, End Quarter/Year, Current Status (RAG), and the single Strategic Outcome KPI this initiative is designed to move. This input table is the sole data source for all strategic dashboard visuals.

**Input:** Company strategy document, annual operating plan, initiative sponsors' briefing notes.

**Output:** Strategic Roadmap Input table: pillars × initiatives × timeline × owner × outcome KPI.

**Owner:** Strategy Director / Consultant.

### Step 4.2 — Build the Multi-Year Roadmap Timeline Chart

**How:** Construct a horizontal Gantt-style roadmap using stacked bars, grouped and sorted by strategic pillar. The x-axis spans years (e.g., 2024–2028), subdivided by quarter. Each initiative is one horizontal bar. Assign a colour per pillar (e.g., Growth = teal, Digital = orange, People = purple, Operations = grey). Add a vertical 'Now' line. This chart replaces the static PowerPoint roadmap and updates automatically as the Input table changes.

**Input:** Strategic Roadmap Input table (pillars, initiatives, start/end quarters).

**Output:** Multi-year strategic roadmap timeline chart (up to 5-year horizon).

**Owner:** Strategy Director / Finance.

### Step 4.3 — Add the Balanced Scorecard Perspective Grid

**How:** Robert Kaplan and David Norton's Balanced Scorecard (1992, Harvard Business Review) structures strategy measurement across four perspectives: Financial, Customer, Internal Process, and Learning & Growth. Map each of the organisation's strategic KPIs to one of the four perspectives. Display the 3 most important KPIs per perspective in a 2×2 grid of mini-scorecards, each with the current value, target, RAG indicator, and a 12-month trend sparkline. This ensures that financial performance is contextualised alongside leading indicators.

**Input:** Strategic KPI list; monthly actuals drawn from functional dashboards (Phase 2).

**Output:** Balanced Scorecard grid (4 perspectives × 3 KPIs) embedded in the strategic dashboard.

**Owner:** Strategy Director / FP&A.

### Step 4.4 — Build the Initiative ROI Scatter Chart

**How:** Create a bubble scatter chart: x-axis = % of initiative complete (0–100 %); y-axis = ROI to date (actual benefit realised ÷ total cost incurred × 100); bubble size = total investment ($). This chart instantly reveals four quadrant types: top-right (high ROI, nearly complete — protect and harvest), bottom-right (high spend, nearly done, low ROI — scrutinise or close), top-left (early-stage, already generating ROI — accelerate), bottom-left (early, low ROI — decide quickly).

**Input:** Initiative % complete, investment to date, benefit realised to date.

**Output:** Initiative ROI bubble/scatter chart.

**Owner:** Strategy Director / Finance.

### Step 4.5 — Assemble the Strategic Plan Dashboard

**How:** Lay out the dashboard: strategic summary scorecard tiles at the top (Total Initiatives, On Track %, Investment to Date, Target Outcome KPI vs. actual); multi-year roadmap chart occupying the top two-thirds of the body; Balanced Scorecard grid in the bottom-left; Initiative ROI scatter in the bottom-right.

**Input:** All strategic dashboard components.

**Output:** Strategic Plan & Roadmap Dashboard (Excel + PDF).

**Owner:** Strategy Director / Consultant.

### Deliverable
Strategic Plan & Roadmap Dashboard: multi-year roadmap chart, Balanced Scorecard grid, and Initiative ROI scatter assembled into one executive view.

### KPIs for This Phase
- All strategic initiatives mapped to at least one Balanced Scorecard KPI.
- Roadmap covers at least 2 years and updated quarterly.
- Initiative ROI scatter populated for all initiatives with >3 months of spend.

### Exit Gate
CEO and Board Chair review and confirm the initiative portfolio aligns with the approved strategy and the KPIs are the right leading indicators.

---

## Phase 5: Build the Stock Investment and Net Worth Dashboard

### Goal
Give individual investors, family offices, or corporate treasury teams a live dashboard to monitor portfolio performance, asset allocation, and net worth trajectory.

### Key Question
Is my portfolio generating returns above benchmark, and is my net worth growing on plan?

### Step 5.1 — Build the Portfolio Input Table

**How:** Create a Portfolio Input tab with one row per holding: Ticker/Asset Name, Asset Class, Purchase Date, Purchase Price per Unit, Quantity Held, Current Price (updated monthly), Currency, and calculated fields: Current Market Value (= Quantity × Current Price), Gain/Loss ($), Gain/Loss (%), % of Total Portfolio, and Annualised Return (= (Current Price / Purchase Price)^(1/Years Held) − 1). This table drives all portfolio visualisations.

**Input:** Brokerage statements; current market prices (manually sourced or data feed).

**Output:** Portfolio Input table with current valuations, returns, and portfolio weights.

**Owner:** Investor / Treasury Analyst.

### Step 5.2 — Build the Asset-Allocation Donut Chart

**How:** Summarise the Portfolio Input table by asset class using SUMIF: total current market value per class (Equity, Fixed Income, Real Estate, Cash, Alternatives). Plot a two-ring donut chart: inner ring = actual allocation (%); outer ring = target allocation (%). Segments that deviate from target by more than 5 percentage points are highlighted in red. Add a legend and a rebalancing-action table showing the $ amount to buy or sell per asset class to return to target.

**Input:** Portfolio Input table aggregated by asset class; target allocation percentages.

**Output:** Asset-allocation dual-donut chart with rebalancing-action table.

**Owner:** Investor / Analyst.

### Step 5.3 — Build the Portfolio Performance vs. Benchmark Chart

**How:** Create a line chart with three series: (1) Cumulative Portfolio Return (month-by-month, calculated as portfolio value at end of month ÷ portfolio value at start of measurement period − 1); (2) Cumulative Benchmark Return (e.g., S&P 500 or relevant index, sourced from a public data provider — Yahoo Finance, MSCI, Bloomberg); (3) Risk-free Rate (annualised 10-year Treasury yield divided by 12, cumulated). The gap between line 1 and line 2 is alpha (or negative alpha). Data labels on the most recent month show each series' cumulative return.

**Input:** Monthly portfolio valuations; benchmark index monthly data (publicly available); risk-free rate data.

**Output:** Portfolio vs. benchmark cumulative-return line chart.

**Owner:** Investor / Analyst.

### Step 5.4 — Build the Net Worth Tracker

**How:** In a Net Worth tab, list all assets (Investment Portfolio = from Portfolio Input tab; Primary Residence at current estimated value; Other Real Estate; Business Equity; Pension/Retirement Accounts; Cash & Savings) and all liabilities (Mortgage Outstanding; Car Loan; Student Loan; Credit Card Balance; Other). Net Worth = Total Assets − Total Liabilities. Build a 24-month bar chart with a target net-worth trajectory line (based on a planned annual savings/investment rate). Add a CAGR display tile.

**Input:** Asset valuations and liability balances (monthly snapshot).

**Output:** Net Worth Tracker — 24-month bar chart + CAGR display + current net worth tile.

**Owner:** Investor.

### Step 5.5 — Assemble the Investment Dashboard

**How:** Combine on one dashboard page: portfolio summary scorecard tiles at the top (Total Portfolio Value, YTD Return %, vs. Benchmark %, Sharpe Ratio, No. of Holdings); Asset-Allocation donut chart (top-left); Portfolio vs. Benchmark line chart (top-right); Net Worth bar chart (centre); Top 5 Holdings and Bottom 5 Holdings tables (bottom). Add a date slicer for the measurement period.

**Input:** All investment dashboard components.

**Output:** Stock Investment & Net Worth Dashboard (Excel + PDF).

**Owner:** Investor / Analyst.

### Deliverable
Stock Investment & Net Worth Dashboard: asset-allocation donut, portfolio vs. benchmark performance, and net worth tracker in one investor view.

### KPIs for This Phase
- 100 % of holdings included with current prices.
- Benchmark data loaded for at least 12 months.
- Net worth tracker populated for at least 6 consecutive months.

### Exit Gate
Investor validates holdings, valuations, and net worth figures match brokerage statements. Dashboard published.

---

## The Frameworks & Tools

### KPI Input Table
A structured spreadsheet table that serves as the single source of truth for all dashboard data. Rows represent metrics; columns represent time periods (months). Actuals and targets share adjacent rows. Every chart and calculation in the workbook is driven by formulas referencing this table, so updating the table for a new month automatically refreshes all visuals. This architecture eliminates the 'copy-paste-update' cycle that leads to errors in manual reporting.

### Income Statement Waterfall (Profit Bridge)
A waterfall chart that disaggregates changes in profit by moving from revenue through each cost line to net profit. Positive bars (revenue, gross profit) are coloured green; negative bars (COGS, SG&A, tax) are coloured red. The chart makes it instantly clear which cost line is the biggest drag on profitability. Developed as a standard management accounting tool in the mid-20th century; widely used by McKinsey and BCG in profitability diagnosis.

### KPI Scorecard with RAG Status
A tabular view showing each headline KPI with the current period actual, the target, the variance ($ and %), and a colour-coded status indicator (Green = on or above target, Amber = within 5 % below target, Red = more than 5 % below target). The RAG formula is implemented in conditional formatting, not manual colouring, so the dashboard self-updates. This is the standard operating dashboard format used in corporate boardrooms globally, derived from the traffic-light system popularised in management by objective (MBO) disciplines.

### Waterfall Chart (Revenue Bridge)
A variant of the waterfall focused on revenue movements period-over-period: Prior Year Revenue → Price Effect → Volume Effect → New Products → FX → Current Year Revenue. Each bar represents an incremental driver. The bridge makes it immediately clear whether revenue growth is driven by pricing power (sustainable) or volume (scalable) vs. FX tailwinds (uncontrollable). Originated in financial reporting and became a McKinsey/BCG strategy standard for revenue-diagnostic presentations.

### Gauge Chart (Donut-Needle)
A circular progress indicator built using a donut chart (for the arc) and an overlaid tiny bar chart (for the needle). The arc is divided into three coloured sections representing Low, Average, and High performance bands. The needle (data marker) points to the actual performance value on the arc. Gauge charts are most effective for KPIs with a clear range and a non-financial character (e.g., Website Traffic Growth, Net Promoter Score, Customer Satisfaction) where the audience benefits from an intuitive 'dashboard dial' metaphor.

### Combo Chart (Column + Line)
A single chart that merges two chart types: typically a clustered-column series for monthly actuals and a line series for a moving average or target. The dual-series presentation eliminates the need for two separate charts and helps the viewer see both the period snapshot (column) and the trend direction (line) simultaneously. The target line provides an instant on-track/off-track reference. Combo charts are a standard feature in Microsoft Excel and equivalent tools; their design practice follows Tufte's data-ink ratio principle of maximising information per pixel.

### SMART-KPI Framework
A framework for designing metrics that are actionable: Specific (unambiguous single-formula definition), Measurable (from an identified system of record), Aligned (linked to a company OKR or strategic objective), Relevant (the team can actually influence the metric), and Time-bound (a defined reporting cadence). Applied during the functional dashboard design phase to prevent 'vanity metrics' — metrics that look impressive but do not drive decisions. Adapted from George Doran's SMART objectives framework (Management Review, 1981).

### Gantt Chart (Project Timeline)
A horizontal stacked-bar chart where each bar represents a project or initiative, and the bar length represents its planned duration. A 'Today' vertical line indicates the current date. Actual completion shading overlays the planned bar to show schedule adherence at a glance. The Gantt chart was developed by Henry Gantt circa 1910 as a production scheduling tool and became the standard for project management timelines worldwide. In the dashboard context it is constructed using Excel's stacked-bar technique because no native Gantt chart type exists in Excel.

### Balanced Scorecard
A strategic performance management framework developed by Robert Kaplan and David Norton (Harvard Business Review, 1992) that organises strategy measurement across four perspectives: Financial (shareholder value), Customer (customer experience and outcomes), Internal Process (operational efficiency and quality), and Learning & Growth (capabilities and culture). The Balanced Scorecard prevents the common failure mode of managing only financial lagging indicators by forcing the inclusion of customer and process leading indicators. In the dashboard context, it provides the four-perspective grid that organises the strategic plan's KPIs.

### Roadmap Timeline Chart
A multi-year strategic roadmap built as a horizontal Gantt chart where rows are grouped by strategic pillar. Each initiative is one bar spanning from its start to end quarter. Pillar-based colour coding lets viewers instantly see whether a given time period is heavily loaded in one pillar and sparse in another. The roadmap replaces the static PowerPoint slide with a live, data-driven view that updates as the Strategic Roadmap Input table changes.

---

## A Worked End-to-End Example

**Company:** MidScale Manufacturing Co., a $120M revenue industrial manufacturer with 850 employees, preparing for a board presentation after a difficult year of margin compression.

**Situation:** The CFO has been presenting a 40-tab Excel pack to the board. Directors routinely spend the first 20 minutes of every board meeting finding the right tab. The CEO wants a single-page view.

**Phase 1 — Company Overall Performance Dashboard:**
The FP&A team pulls the full-year P&L from the ERP (SAP Business One). Revenue is $120M actual vs. $114M budget (+5.3 %); however, Gross Margin is 41 % vs. the 45 % target — margin is being compressed by raw-material cost inflation. The waterfall chart immediately reveals the culprit: COGS increased by $6M vs. budget, fully erasing the revenue overperformance at the profit line. The gauge chart for Website Traffic Growth reads 72 % — in the 'High' band — suggesting digital marketing is working. The C-suite dashboard shows at a glance: the top-line is good, the margin story is the problem.

**Phase 2 — Functional Dashboards:**
The Operations dashboard is built next. The 8 operational KPIs include On-Time Delivery (88 % vs. 95 % target — red), Defect Rate (1.8 % vs. 1.0 % target — red), and Raw Material Cost per Unit ($18.50 vs. $15.00 budget — red). These three red indicators corroborate the waterfall finding: the margin compression is an operational issue, not a pricing or volume issue. The HR dashboard reveals Employee Turnover of 22 % — above the 15 % target — in the manufacturing workforce, which likely explains the quality and delivery shortfalls.

**Phase 3 — Project Dashboard:**
The company has 12 active projects. The Project Dashboard shows 4 On Track (green), 5 At Risk (amber), and 3 Delayed (red). The three delayed projects are all in the Operations Excellence programme (automation investment designed to address the very quality and cost issues identified above). The budget vs. actual chart shows the automation projects are also 18 % over budget.

**Phase 4 — Strategic Plan Dashboard:**
The 3-year strategic plan has four pillars: Growth, Customer Excellence, Operations Transformation, and People Development. The Balanced Scorecard grid shows green in Financial (revenue) and Customer (NPS = 42, above the 40 target) but red in Internal Process (OTD, defect rate) and Learning & Growth (employee engagement score 58 % vs. 70 % target). The roadmap chart shows the Operations Transformation programme — the one experiencing project delays — was supposed to be 60 % complete by Q3; it is only 30 % complete.

**Conclusion for the board:** In 15 minutes, using four dashboard pages, the board can see the complete picture: strong revenue, compressed margins driven by operational failures (inflated COGS, poor OTD, high defects), an underperforming transformation programme that is supposed to fix those failures, and a people crisis (high turnover) at the root of the operational failure. The board can make a focused decision: accelerate or restructure the automation programme, and address workforce retention immediately.

---

## Templates

### Template 1: Company Performance Dashboard Raw-Data Input Tab

This fill-in template structures the monthly data entry that drives all Phase 1 charts.

**Columns:** Month (Jan–Dec + Total)

**Revenue section:**
- Revenue — Actual
- Revenue — Target
- Revenue — Variance ($)
- Revenue — Variance (%)

**Revenue by Product:**
- Product A — Actual
- Product B — Actual
- Product C — Actual

**P&L Summary:**
- Revenue — Actual
- COGS — Actual (parenthetical negative)
- Gross Profit — Actual (formula)
- Gross Margin % — Actual (formula)
- SG&A — Actual (parenthetical negative)
- D&A — Actual (parenthetical negative)
- EBITDA — Actual (formula)
- Interest — Actual (parenthetical negative)
- Tax — Actual (parenthetical negative)
- Net Profit — Actual (formula)
- Net Margin % — Actual (formula)

*Repeat the above block with 'Target' suffix.*

**Cash Flow Summary:**
- Cash from Operations — Actual
- Cash from Investing — Actual
- Cash from Financing — Actual
- Net Change in Cash — Actual (formula)
- Cash Balance — Actual (cumulative formula)

**Gauge Data:**
- KPI 1 (e.g., Website Traffic Growth): Start / Low / Average / High / Total / Performance
- KPI 2 (e.g., Subscriber Growth): Start / Low / Average / High / Total / Performance

### Template 2: KPI Dictionary

| # | KPI Name | Pillar / Function | Formula | System of Record | Owner | Monthly Target | Green Threshold | Amber Threshold | Red Threshold | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Revenue | Finance | Sum of product revenue | ERP | CFO | $X | ≥ Target | 95–100 % | < 95 % | |
| 2 | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | |

### Template 3: Project Portfolio Input Table

| Project Name | Strategic Pillar | Owner | Start Date | Planned End | Revised End | % Complete (Plan) | % Complete (Actual) | Budget ($K) | Spend to Date ($K) | FAC ($K) | RAG | Top Risk |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [formula] | [FILL] |

### Template 4: Strategic Roadmap Input Table

| Pillar | Initiative Name | Owner | Start Q/Year | End Q/Year | Status (RAG) | Outcome KPI | Investment ($K) | Benefit Target ($K) | Benefit Realised ($K) | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [formula] | [FILL] | [FILL] | [FILL] | [FILL] | |

### Template 5: Portfolio Input Table (Investments)

| Asset Name | Asset Class | Purchase Date | Purchase Price | Quantity | Current Price | Currency | Current Value | Gain/Loss ($) | Gain/Loss (%) | % of Portfolio | Annualised Return |
|---|---|---|---|---|---|---|---|---|---|---|---|
| [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [FILL] | [formula] | [formula] | [formula] | [formula] | [formula] |

---

## Pitfalls and Best Practices

1. **Do not build dashboards before agreeing on KPIs.** The most common failure is building a beautiful dashboard for the wrong metrics. Run the SMART-KPI workshop (Step 2.1) before touching any chart.

2. **Do not use manual colour coding.** Every RAG indicator must be driven by a conditional formatting formula. Manual colouring breaks the first time someone forgets to update it.

3. **One data-entry point, one truth.** All charts must reference the raw-data Input tab directly. The moment a chart is built from a separate table that is manually maintained, the dashboard becomes inconsistent.

4. **Match chart type to the question.** Waterfalls answer 'what drove the change?'; combo charts answer 'are we on track and is the trend improving?'; gauge charts answer 'how are we doing on an absolute scale?'; Gantt charts answer 'are we on schedule?'. Mismatching a chart type to its question is a common source of confusion in board presentations.

5. **Do not show more than 12 KPIs on a single scorecard.** Human working memory limits meaningful simultaneous comparisons to approximately 7 ± 2 items. Twelve is a defensible maximum for an executive KPI scorecard; beyond that, build a hierarchy with a summary scorecard drilling into functional detail.

6. **Protect formula cells.** Lock all formula and chart cells; allow data entry only in the raw-data Input tab. This prevents accidental overwrites that silently corrupt the dashboard.

7. **Plan for the month-close cycle.** Know exactly when the accounting close occurs and build the dashboard update process (who updates what, by when) as a documented SOP. A dashboard that is 2 weeks late is less valuable than a timely management estimate.

8. **Test the gauge chart needle calculation carefully.** The gauge chart's needle position is sensitive to the raw-data setup. Test with known performance values (e.g., 0 %, 50 %, 100 %) before deploying in a live dashboard.

---

## Sources

1. Kaplan, R.S. & Norton, D.P. (1992). 'The Balanced Scorecard — Measures That Drive Performance'. *Harvard Business Review*, Jan–Feb 1992.
2. Doran, G.T. (1981). 'There's a S.M.A.R.T. Way to Write Management's Goals and Objectives'. *Management Review*, Vol. 70, Issue 11.
3. Gantt, H.L. (1910). *Work, Wages and Profit*. Engineering Magazine Co., New York.
4. Tufte, E.R. (2001). *The Visual Display of Quantitative Information* (2nd ed.). Graphics Press.
5. Domont, A. (2023). *Executive Dashboard Toolkit — Overview & Approach* (preview deck). Domont Consulting.
6. Microsoft Corporation. *Create a waterfall chart in Excel*. https://support.microsoft.com/en-us/office/create-a-waterfall-chart-8de1ece4-ff21-4d37-acd7-546f5527f185
7. Corporate Finance Institute. *Dashboard Design Best Practices*. https://corporatefinanceinstitute.com/resources/excel/dashboard-design/

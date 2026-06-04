---
type: concept
slug: gantt-chart
title: Gantt Chart (Project Timeline)
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: project
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Gantt Chart (Project Timeline)

*Category: project · Toolkit: Executive Dashboard*

## What it is
A horizontal bar chart where each bar represents a project, phase, or task, with the bar length proportional to the planned duration. A vertical 'Today' line overlays the actual date. Actual completion shading on top of planned bars shows schedule adherence at a glance.

**Origin:** Developed by Henry Gantt circa 1910 as a production scheduling tool for manufacturing operations (*Work, Wages and Profit*, 1910). Adopted by the US Army during World War I. Now the universal standard for project timelines across project management methodologies (PMBOK, PRINCE2, Agile).

## Why it works
The horizontal layout maps time to the x-axis intuitively (past on left, future on right) and projects or tasks to the y-axis. The human eye is highly efficient at judging relative bar lengths — the Gantt chart exploits this to make schedule adherence (is the actual completion bar shorter or longer than the planned bar?) a pre-attentive assessment, not a calculation. The 'Today' line provides a consistent reference point: bars that end before Today are complete; bars that extend past Today are active; gaps between Today and a bar's start are pre-start.

## When to use
Use for any dashboard that monitors the delivery of multiple projects or initiatives against a timeline. The Gantt is the standard visual for project portfolio management at the executive level.

## Visual
`process-flow`

## Step-by-step tutorial
1. Prepare a project data table: Project Name, Start Date (as a number using =DATEVALUE), Planned Duration (days), % Complete Actual, and Actual Duration to Date (=Planned Duration × % Complete).
2. Insert a Stacked Bar chart. Add the Start Date as the first invisible series (base) and Planned Duration as the second visible series.
3. Format the Start Date series as No Fill (invisible) — this offsets each bar to its correct start position.
4. Add a third series (Actual Duration to Date) with a darker shade on top of the Planned series. Set this series' base to match the Start Date series so it overlays correctly.
5. Add the Today line: create a scatter data point at (TODAY(), midpoint of y-axis). Add error bars to the scatter point: vertical error bars of ±50 (in axis units), horizontal error bars = 0. This creates a vertical line.
6. Format the x-axis as a Date axis. Set the Minimum to the earliest project start date.
7. Sort projects from top (earliest start) to bottom (latest start) for readability.
8. Add data labels inside each bar showing the Project Name (or use y-axis labels if bars are wide enough).
9. Group projects by phase or strategic pillar using bold row separators in the y-axis.

## Real-life example — Tesla — Gigafactory Nevada construction programme, 2014–2016
Tesla's construction programme for the Nevada Gigafactory was tracked using a multi-level Gantt chart covering five construction phases across 30+ workstreams. The Gantt allowed Tesla's operations leadership team to see at a glance which workstreams were running behind the critical path (a 2-week delay in foundation work cascaded into a 3-week delay for structural steel). The chart became the centrepiece of weekly executive reviews, replacing a 60-page narrative progress report.

**So what:** The Gantt chart's value in complex programmes is not just showing individual project status — it is revealing schedule dependencies and critical path implications that are invisible in a status-table format.

## Template
Fill in one row per project. Start Date must be entered as a number (=DATEVALUE('DD/MM/YYYY')) for the chart to position bars correctly. Planned Duration is in calendar days. % Complete is between 0 and 1.

- [ ] Project Name: [enter project name]
- [ ] Strategic Pillar: [link to strategic pillar for colour coding]
- [ ] Start Date (number): [=DATEVALUE('DD/MM/YYYY')]
- [ ] Planned Duration (days): [number of calendar days]
- [ ] % Complete Actual: [0 to 1]
- [ ] Actual Duration to Date: [formula: =Planned Duration × % Complete]
- [ ] RAG Status: [formula: Red if % Complete Actual < % Complete Planned by >10pp, or if Forecast End > Planned End]
- [ ] Today date (for Today line): =TODAY()

## Pitfalls
- Plotting dates as category labels instead of as a numeric date axis — the bar lengths will be wrong unless the x-axis is configured as a Date or Value axis.
- Overcrowding the Gantt with too many tasks — a project-level Gantt (one row per project) is appropriate for an executive dashboard; a task-level Gantt (one row per task) belongs in the project-management tool.
- Not updating the 'Today' line formula — if it is hard-coded rather than =TODAY(), the line will not move with time.

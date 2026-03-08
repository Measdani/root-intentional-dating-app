# Rooted Hearts Admin Dashboard Wireframe Copy

Version: 2026-03-08  
Purpose: UI copy and content structure for moderation-first dashboard sections.

## Global header
- Title: `Rooted Hearts Admin`
- Subtitle: `Safety, quality, and trust operations`
- Primary actions:
- `Open Review Queue`
- `View Urgent Cases`
- `Generate Daily Summary`

## A) Today Overview

### Section title
`Today Overview`

### KPI cards
- `Blocked First Messages`
- Helper: `Messages stopped before delivery in the last 24h.`
- `Profiles Needing Edits`
- Helper: `Profiles requiring revision before going live.`
- `New Reports`
- Helper: `Reports submitted in the last 24h.`
- `Urgent Reports`
- Helper: `Reports prioritized for immediate review.`
- `Rising Risk Users`
- Helper: `Accounts with meaningful risk score increase.`

### Empty state
`No critical activity right now. Monitoring is active.`

## B) Review Queue

### Section title
`Review Queue`

### Filter labels
- `Severity`
- `Source Type`
- `Agent`
- `Confidence Band`
- `Repeat Offender`
- `Appeal Status`

### Table columns
- `Case ID`
- `Created`
- `Severity`
- `Source`
- `Summary`
- `Confidence`
- `Assigned To`
- `Status`
- `Action`

### Row actions
- `Open Case`
- `Assign`
- `Mark In Review`

### Empty state
`No open cases match current filters.`

## C) First Message Monitor

### Section title
`First Message Monitor`

### Metrics
- `Blocked Messages (24h)`
- `Rewrite Success Rate`
- `Top Block Reasons`

### List item format
`Reason: sexual opener | Count: 8 | Trend: +12% vs yesterday`

### Empty state
`No blocked first-message events in the selected period.`

## D) Profile Review Center

### Section title
`Profile Review Center`

### Tabs
- `Needs Edits`
- `Rejected`
- `Repeat Violators`

### Review panel labels
- `Quality Score`
- `Safety Score`
- `Detected Labels`
- `Suggested User Guidance`

### Reviewer actions
- `Approve`
- `Return With Edits`
- `Reject`
- `Escalate`

## E) Reports Center

### Section title
`Reports Center`

### Tabs
- `All New`
- `Urgent`
- `Linked Duplicates`
- `Reporter History`

### Report detail blocks
- `Reporter Statement`
- `AI Summary`
- `Evidence Excerpts`
- `Prior Related Reports`
- `Recommended Priority`

### Reviewer actions
- `Create/Link Case`
- `Request More Info`
- `Resolve`

### User acknowledgment template
`Thanks for reporting this. We have received your report and will review it based on urgency and the information provided.`

## F) Growth Mode Insights

### Section title
`Growth Mode Insights`

### Metrics
- `New Users in Growth Mode`
- `Most Recommended Modules`
- `Low Engagement Users`
- `Upcoming Reassessments`

### Suggested actions
- `Send Reengagement Nudge`
- `Review Recommendation Quality`

## G) Admin Summaries

### Section title
`Admin Summaries`

### Blocks
- `Daily Summary`
- `Weekly Summary`
- `Pattern Alerts`

### Daily summary template
`In the last 24 hours, {blocked_first_messages} first messages were blocked, mostly for {top_reasons}. {profiles_needing_edits} profiles were returned for edits. {urgent_reports} reports were marked urgent.`

### Pattern alert template
`Potential pattern detected: {category} tied to {account_count} account(s) over {window}.`

## Case detail view copy

### Header
`Case {case_id} - {severity}`

### Status chip text
- `Open`
- `In Review`
- `Resolved`
- `Appealed`

### Decision actions
- `Apply Temporary Restriction`
- `Send Warning Notice`
- `Escalate to Senior Reviewer`
- `Request Legal Review`

### Decision helper text
`Use the lightest effective action that protects user safety and platform trust.`

## Draft notice templates

### Warning notice
`Your recent activity does not meet our communication standards. Please keep interactions respectful and avoid pressure, solicitation, or harmful language.`

### Temporary lock notice
`Your messaging access is temporarily limited due to repeated policy violations. You can continue after the cooldown period if future messages meet standards.`

### Profile edits notice
`Your profile needs a few updates before it can go live. Please remove harmful language and add clearer, respectful details about your relationship goals.`

## Error states
- Summary generation failure:
- `Summary could not be generated. Try again or open raw metrics.`
- Queue load failure:
- `Queue data is temporarily unavailable. Please retry.`
- Action save failure:
- `Action was not saved. Confirm your network and try again.`

## Loading states
- `Loading moderation metrics...`
- `Loading open cases...`
- `Generating summary...`

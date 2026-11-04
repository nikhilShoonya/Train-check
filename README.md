# TrainCheck interactive prototype

Standalone HTML5, CSS3 and vanilla JavaScript. Fictional data and LocalStorage only. This demonstrates the learning journey; it does not implement production security.

The current emerald/teal, navy and white theme follows the latest supplied login reference. `css/layout-fixes.css` holds targeted refinements: readable table text (14px cells, 13px headers; 13px in compact dashboard cards), dashboard tables that fit their cards on laptops, a full-width Import centre, a sidebar that never shifts sideways or needs a scrollbar on shorter windows, and a phone header without sideways scrolling. It changes no colour, border, icon or component. All 104 automated tests pass. The secure assessment journey was also walked through in a real Chromium browser (see [Secure assessment workflow](#secure-assessment-workflow)).

## Run

Open `index.html`, or run this optional loopback-only static preview from the repository root:

```powershell
node TrainCheck-Prototype/serve.cjs
```

Then open **http://127.0.0.1:4173**. Stop with Ctrl+C. No package installation, backend or CDN is needed. Node v24.19.0 was used for local development checks; it is not required to open the HTML. LocalStorage on `file:` URLs varies by browser, so the static server is preferred.

## View the reference dashboards

Use **clear@traincheck.demo** to open the employee dashboard without a due gate. The main employee account deliberately opens its mandatory assessment first. The shared header includes scoped search (Ctrl/Cmd+K), a navigation-language selector, notifications and a profile menu. Sidebars collapse on desktop and open as a drawer on mobile. Tables support sorting and eight-row pagination; exports include all matching rows.

Manager, L&D and HR retain their separate reference dashboard layouts with the new green theme. Login uses the latest supplied office/foliage artwork and horizontal Kirkpatrick features. Branding and facade use viewport crops of the new reference; existing persona portraits remain from the earlier supplied images. Live metrics remain actual demo data. Google/Microsoft buttons explain the unconnected SSO dependency. Remember my demo email stores only an email preference. HR's Download Centre lists that user's local CSV/XLSX reports and can regenerate them with current data and permissions.

## Demo accounts

All accounts use **TrainCheck123!**. These are public fictional selectors, not real credentials.

| Email | Perspective |
|---|---|
| employee@traincheck.demo | Aarav Mehta, E001; two initial due assessments |
| clear@traincheck.demo | Isha Rao, E002; no initially blocking assessment |
| manager@traincheck.demo | Neha Kapoor, M001; Operations E001–E005 |
| manager2@traincheck.demo | Kabir Das, M002; Customer Experience E006–E010 |
| admin@traincheck.demo | Riya Anand; L&D administration and KPI entry |
| hr@traincheck.demo | Dev Malhotra; read-only HR/Leadership |

Role cards prefill the primary accounts. Change the email for the second manager or clear employee. **Switch account** signs out. **Demo guide → Reset demo data** restores only this prototype’s fictional records after confirmation.

Progress uses `traincheck-prototype-v1` in LocalStorage. Only the fictional persona ID is kept in sessionStorage; passwords and actual session secrets are not stored. Existing prototype records are upgraded without deleting attempt history. Legacy manager ratings remain separately labelled in the behaviour report.

## Employee quick-start

1. Sign in. Due post-training work opens the full-screen morning greeting before normal navigation. Multiple assessments run in completion-date order.
2. Start or resume. The secure journey runs: system check → full screen → instructions → live assessment. See [Secure assessment workflow](#secure-assessment-workflow). Reloading keeps the deadline and saved answers in this browser.
3. View the big score, explicit Passed/Not Passed badge, first/best score and topic breakdown. Correct responses/explanations appear only if enabled when that attempt started.
4. Continue to the inline Level 1 feedback form. Rate relevance, trainer, logistics and intent (1–5) and recommendation (0–10); the comment is optional. Required items are validated, the record is saved against employee, training and attempt, and it cannot be submitted twice. Skipping remains possible and is never stored as a zero. After saving, the next due assessment opens, or the dashboard if none remain.
5. If Not Passed, open refresher guidance/material and acknowledge it. Sign out/in for an eligible retake. Three failures create Needs Re-training and local notification records; they do not create an indefinite lock.
6. Once the queue is clear, use Training history for all attempts and printable sample certificates. Certificates are not official Finvasia awards.
7. My behaviour follow-ups shows configured cycles. When a task is due, rate each competency and supply an example. L&D can advance the demo date for testing.
8. An optional pre-test appears in Training history only for enabled, active, assigned training before completion. It records a baseline and does not satisfy the post-training gate.

## Secure assessment workflow

**Employee login → System check → Full screen → Instructions → Live assessment → Submission → Result → Level 1 feedback → Dashboard (or next due assessment).** Implemented in `js/secure-exam.js` and `css/secure-exam.css`, on top of the existing domain model (`T.start`, `T.finish`, queue, history, retakes).

| Stage | What happens |
|---|---|
| System check | Browser features, JavaScript, network status (`navigator.onLine`), a same-origin `HEAD` request to this site, storage write/read, Full-screen API availability, screen/window size and detected browser. Required checks must be **Ready** before Continue is enabled; **Retry check** re-runs them. Opening `index.html` as a file shows the application check as *Not applicable*. No speed test or invented values. |
| Full screen | The employee selects **Enter full screen** (Fullscreen API, user gesture). Success is verified; a blocked request shows the reason and can be retried. |
| Instructions | Training, questions, total marks, duration, pass mark, attempt number and every rule (navigation, saving, timer, full screen, tabs, restricted actions, violation policy, automatic submission, monitoring scope). **Start assessment** stays disabled until the acknowledgement box is ticked. The timer starts only at this point. |
| Live assessment | Navy secure-mode header (connection, full screen, violations x/3, timer, End test); question navigator (answered, marked, not answered, current, with shape cues as well as colour); single choice, multiple choice, true/false and scenario questions; Previous, Next, Mark for review, Clear response, Review & submit; status panel. Each selection saves to LocalStorage immediately. Question and option order is a stored snapshot, so it survives refresh. |
| Timer | Countdown from the stored deadline. Amber at 5:00, red at 1:00, each announced once (toast and screen-reader live region). At 0:00 the saved answers are submitted automatically. Refresh, closing the tab or going offline never reset or pause it. |
| Submission | Manual (`MANUAL`), time expiry (`TIME_EXPIRED`) and violation limit (`VIOLATION_LIMIT`) all go through one idempotent `T.finish`. A finalised attempt is never re-scored, duplicated or re-opened. |
| Result | Score %, Passed / Not Passed badge, marks earned, pass mark, attempt x of y, first/best/latest score, topic performance, submission reason, time taken, answered/correct counts and any recorded security events. Explanations follow the training's configuration. Not Passed shows refresher guidance and the next-login retake rule. |

### Security monitoring (browser-level, best-effort)

- **Monitored signals:** tab or window hidden (`visibilitychange`), focus loss (`blur`), full-screen exit (`fullscreenchange`), back navigation (`popstate`) and in-app hash navigation (`hashchange`). The browser's own "Leave site?" prompt is shown when the page is closed or reloaded.
- **One shared handler, one count per incident:** events within 2 seconds of a counted violation are merged into it. While the employee is away (hidden or unfocused), every further signal joins the same incident until they have been back for 2 seconds. For example, switching tabs fires blur, visibility and full-screen events but counts once.
- **Policy:** violation 1 shows a warning, violation 2 a final warning, violation 3 stops answering, saves, finalises once with `VIOLATION_LIMIT` and opens the result. Each record holds number, type, merged signals, timestamp and attempt ID. While full screen is off, questions are hidden behind a *Return to full screen* panel; the timer keeps running.
- **Not violations:** refreshing (recovery path, BR 6.5) and going offline. The leave prompt's own blur and full-screen exit are ignored for 1.5 seconds, and every signal is ignored once the page is actually unloading; switching tabs while the prompt is open still counts. An offline period is stored as an interruption on the attempt.
- **Score:** violations never change the score. Unanswered questions receive no marks.
- **Deterrents:** copy, cut, paste, the context menu, text selection and dragging are blocked during an armed attempt. Keyboard navigation (Tab, arrows, Space, Enter) is untouched.
- **Configuration:** defaults are in `DEFAULT_POLICY` in `js/secure-exam.js` and can be overridden per browser through `TC.state.examPolicy` (`violationLimit`, `dedupeMs`, `requireFullscreen`, `blockCopy`, `blockCut`, `blockPaste`, `blockContextMenu`, `blockSelection`, `blockNavigation`, `warnSeconds`, `criticalSeconds`). Each attempt stores its own policy snapshot.
- **Honest limits:** a web page cannot detect or prevent a second monitor or device, screenshots, screen sharing, browser extensions or developer tools, and cannot reliably tell a refresh from closing the tab. Browsers differ in which events they fire. Nothing here is lockdown or proctoring; only event type and time are recorded (no camera, screen recording or keystrokes). iPhone Safari does not support the Fullscreen API for pages, so with `requireFullscreen` on, iPhone users cannot start.

### Testing security scenarios

Run `node TrainCheck-Prototype/serve.cjs`, open http://127.0.0.1:4173 and sign in as **employee@traincheck.demo**. Each pre-assessment step has a **Demo testing tools** panel with **Reset demo assessment**, which restores this fictional employee's attempts, assignments, feedback, pre-tests and notifications only.

| Scenario | How to test |
|---|---|
| Failed system check | Turn the network off (DevTools → Network → Offline), then Retry check. Stop the local server to see *Application connection* fail. |
| Full-screen failure | Block full screen for the site in browser settings, or use a browser without the Fullscreen API. |
| Violations | During the assessment, press **Esc** (full-screen exit), switch tab (Ctrl+Tab), or click another window (focus loss). Wait a few seconds between actions; the third violation submits automatically. |
| Duplicate events | Switch tab once while in full screen: only one violation is counted, with several merged signals in the result's security log. |
| Navigation | Press the browser Back button or edit the URL hash. |
| Refresh and resume | Reload during the assessment and accept the browser prompt. Select *Enter full screen and resume*: same attempt, answers, marks and deadline, with no violation counted. |
| Offline | DevTools → Network → Offline, then answer a question and go back online. The banner appears, answers keep saving and the timer continues. |
| Timer warnings and expiry | In the status panel's **Demo testing tools**, choose *Set 4:55*, *Set 0:55* or *Set 0:10 remaining*. This only shortens the stored deadline of the current demo attempt. |
| Manual submission | **End test** or **Review & submit** → confirm. |
| Feedback and queue | After the result, choose *Continue to feedback*. Submit with missing ratings to see validation; after saving, E001 moves to the second due assessment (Customer Handling). |
| Retakes | Fail, open refresher material and acknowledge it, sign out and in again. Attempts 1–3 are preserved; the third failure flags **Needs Re-training** and records a manager/HR demo notification. |

## Admin guide

### Training, question bank and completion

1. Create a draft training; add questions and set count, pass mark, duration, attempts, randomisation and optional exact difficulty counts. Activate only with a sufficient active pool.
2. Evaluation settings configures answer review, optional pre-test, schedule mode, calendar-day delay, follow-up intervals, trainer, item sample minimum and refresher content/HTTPS link.
3. Create a batch for the same training and assign employees. Duplicate employee/training assignments are skipped. Assignment and completion are different facts.
4. Record completion separately or import completion rows. Same-day, next-working-day and delayed schedules store a due timestamp and a calendar snapshot. Future due work stays out of the queue.
5. Evaluation & KPI setup provides a demo date/calendar and a manual reminder check. The initial calendar is an **illustrative Monday–Friday UTC date calendar**, not Finvasia policy. Review intervals use calendar days. No work happens in the background while the application is closed.

### Full question imports

In **Import centre**, use **Download CSV template** or **Download Excel template** to get an importable file with the correct headers and a sample row.

- Read the first worksheet only; use plain values, not formulas. CSV must be UTF-8.
- Headers: `id, training, topic, competency, type, question, option_a, option_b, option_c, option_d, options_extra, correct, explanation, difficulty, marks, level, language, active`.
- Types: `single`, `multiple`, `boolean`, `scenario`. Scenarios use one objectively correct choice.
- Extra options use `|`; correct answers use letters such as `A` or `A|C`. Up to 12 options are supported by full import; the editor supports 2–6.
- Difficulty: Easy/Medium/Hard; level: L2; language: English/Hindi/Hinglish; status: Active/Inactive; marks must be positive.
- XLSX reads actual compressed/uncompressed workbook content. It does not display unrelated sample rows.
- Limits: 1 MB upload, 5,000 rows, 5 MB total expanded archive, 2 MB per part. Formula cells, macros, encrypted files and external links are rejected. Older browsers without raw-deflate decompression must use CSV.
- Validate, inspect row errors, download the error report and explicitly confirm valid rows. Duplicates are rejected/skipped, never silently overwritten.
- The compact question format (`id, training, topic, question, option_a, option_b, correct`) and completion imports (`employee, training, completion_date`) are also accepted. Completion dates must be text in YYYY-MM-DD format, not Excel serial dates.

### Behaviour, KPI and reports

- Both employee and manager forms use the training’s same competency IDs and period. Ratings are 1–5 with sample anchors; each requires an example. Due/overdue/submitted/not-due states follow the demo date.
- **User-confirmed policy:** HR stays read-only; L&D enters KPI evidence. Use Add KPI evidence for up to three records per training. Enter units, direction, cohort, ordered periods, owner, source and explicit cost/benefit/currency when ROI is desired. No cost or benefit is inferred.
- Reports & evidence includes all nine requested report families. Apply date, department, training, result, search, location, manager, trainer, batch and grade filters. Date filters explicitly select the **training-completion cohort**.
- Download real CSV or XLSX of the same scoped rows. Print / Save PDF opens the full report in a print dialog; choose Save as PDF in the browser. PDF rendering has not been verified here.
- Learning gain uses matched pre-test and first post-test; normalised gain is unavailable at a 100% baseline. First/best scores remain separate.
- NPS-style score is % 9–10 recommendations minus % 0–6; 7–8 are passive. It is labelled as a demo metric, with sample wording awaiting approval.
- Item analysis groups question versions, excludes blank answers, shows sample size and only flags >70% incorrect when the configured minimum is met. Seed scores without question responses are excluded.
- Demo report schedules save a weekly/monthly setting and allowed persona recipient. **They send no email.** Pending-assessment and overdue-review reminders are local deduplicated records.
- Change history shows local admin edits. It is inspectable/editable through browser tools, not a protected audit log.

## Four-role walkthrough

1. Finish E001’s two quizzes; test question review, refresh/resume, result, immediate feedback and next queued quiz.
2. For failure, acknowledge refresher and log in again. Confirm preserved attempt history and maximum-attempt outcome.
3. As L&D, enable a pre-test on T003, create a T003 batch and assign E001 before recording completion. E001 can take a pre-test; record completion afterward to create a separate post-test obligation.
4. As L&D, choose next-working/same-day/delay and record a new completion. Move the demo date to verify due queue activation.
5. Move demo date past a review cycle. Sign in as employee and manager to record matching competencies. Inspect the rating gap report.
6. Upload the full Excel/CSV examples; validate, confirm and repeat to verify duplicate rejection.
7. Add KPI evidence as L&D. Sign in as HR and inspect all four scorecard levels, filter each report and export it. HR cannot change KPI/training settings.
8. Sign in as M002 and verify that M001’s individual team records are absent. Managers cannot open organisation KPI/combined scorecard reports.

## Implemented scope and remaining backend work

Local functional demonstrations cover gate navigation, assessment/retake state, snapshots, timing, pre-test/gains, immediate L1, configurable L3 tasks/forms/comparisons, KPI entry/ROI, full question imports, nine reports, CSV/XLSX downloads, print workflow, reminders/schedule configuration and change history.

**Complete production requirements remain unfulfilled:** server gate and API allowlist, server-only answer keys, trusted scoring/timing, transaction-safe one-active-attempt, secure email/SSO/MFA, PostgreSQL/migrations, HRMS sync, encrypted/private files, approved retention/privacy handling, protected audit, background scheduling, real email/Teams/WhatsApp delivery, KPI bulk import, autonomous PDF generation/export centre, backup/restore/security/UAT and formal accessibility verification.

Synthetic answer keys necessarily exist in browser code/storage for this offline demonstration. Do not use it for real exams or employee records. No production roadmap item is marked complete.

## Verification

From the repository root:

```powershell
node --check TrainCheck-Prototype/js/data.js
node --check TrainCheck-Prototype/js/evaluation.js
node --check TrainCheck-Prototype/js/workbook.js
node --check TrainCheck-Prototype/js/app.js
node --check TrainCheck-Prototype/js/interactions.js
node --check TrainCheck-Prototype/js/workflows.js
node --check TrainCheck-Prototype/js/reference-ui.js
node --check TrainCheck-Prototype/js/role-dashboards.js
node --check TrainCheck-Prototype/js/secure-exam.js
node --check TrainCheck-Prototype/serve.cjs
node --test TrainCheck-Prototype/tests/domain.test.cjs TrainCheck-Prototype/tests/evaluation.test.cjs TrainCheck-Prototype/tests/ui.test.cjs TrainCheck-Prototype/tests/secure-exam.test.cjs
```

**104 automated tests pass** (domain, evaluation, UI and secure-assessment suites) using Node’s built-in test runner with isolated domain/render/action-handler harnesses.

Browser checks were run in Chromium: every role’s pages at 1885, 1440, 1280, 1024, 768 and 390 px; the full secure assessment journey; and before/after pixel comparison for the layout refinements and code cleanup. **Not yet verified:** Firefox and Safari, keyboard-only and screen-reader use, 200% zoom and print/PDF output. WCAG AA is a target, not a conformance claim.

The UI uses the latest user-selected green/teal reference theme with system font fallbacks. Supplied artwork is used only in this prototype; official corporate brand approval is not implied.

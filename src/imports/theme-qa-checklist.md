# Light / Dark Theme — Browser QA Checklist
*Run this checklist against every item before marking Gate 2 (UI/UX & Responsive Stability) as PASSED.*  
*Test by toggling the theme switch in the sidebar header. Repeat each item in both Light and Dark.*

---

## How to use
1. Open the app in Chrome with DevTools → **No throttling**, viewport **1440px** (desktop first).  
2. Toggle **Light** mode → work through every section below.  
3. Toggle **Dark** mode → verify the same sections look correct in dark.  
4. Repeat at **375px** (mobile) width for sections marked 📱.  
5. Mark each item **✅ Pass** / **❌ Fail + description** in a copy of this file.

---

## 1 — Calendar (Content Calendar page)

| # | Area | What to look for | L ✓/✗ | D ✓/✗ |
|---|------|-----------------|-------|-------|
| 1.1 | Filter bar card | Background ≈ light gray tint, border visible, "Filter by Platform" heading dark | | |
| 1.2 | View-mode toggle (List / Calendar) | Active button has visible dark bg; inactive text readable | | |
| 1.3 | Platform filter pills | Active pill: dark bg + dark text; inactive: light bg + gray text | | |
| 1.4 | List view — date headings & post rows | All text dark; teal left-border visible | | |
| 1.5 | List view — caption text & hashtag chips | Gray captions; chips with teal/colored border | | |
| 1.6 | Calendar grid view — day numbers | Dark numbers; platform event chips colored + white text ← critical | | |
| 1.7 | Calendar grid — Platform Legend labels | Labels in readable gray | | |
| 1.8 | Content Summary card | "Total Posts" / "Active Days" / "Platforms" labels not washed out | | |
| 1.9 | **Post detail modal (click any event)** | Modal bg: white in Light / dark-purple in Dark | | |
| 1.10 | Modal — platform icon badge | Colored bg (Instagram gradient, blue for FB, etc.) + white icon ← exception check | | |
| 1.11 | Modal — platform name & date/time | Name dark in Light; date muted gray | | |
| 1.12 | Modal — close ✕ button | Visible, clickable, correct hover state | | |
| 1.13 | 📱 Mobile: filter bar stacks vertically | No horizontal overflow | | |

---

## 2 — Mockups (Social Mockups page)

| # | Area | What to look for | L ✓/✗ | D ✓/✗ |
|---|------|-----------------|-------|-------|
| 2.1 | "Week 1 Social Media Mockups" header card | Light tinted bg; white heading → dark in Light | | |
| 2.2 | Mockup cards grid | Cards with subtle border; platform header bar keeps its brand color + white icon | | |
| 2.3 | Card post-type badge ("Carousel", "Story"…) | Black/60 bg → badge readable in both modes | | |
| 2.4 | Card caption text | Readable gray in Light; white/70 in Dark | | |
| 2.5 | Card footer (time, hashtag count) | Muted but visible | | |
| 2.6 | Hover overlay "View Details" | Dark text on semi-transparent black overlay — legible | | |
| 2.7 | Week Summary stat cards | Gradient number text readable; label "Platform Mix" etc. visible | | |
| 2.8 | **Mockup detail modal — phone frame** | Phone frame stays **dark purple** in Light (mockup-device exception) | | |
| 2.9 | Modal phone — platform header | Brand color bg + white icon/text inside frame | | |
| 2.10 | Modal phone — engagement icons (♥ 💬 ↗) | White/60 on dark frame; hover turns accent color | | |
| 2.11 | Modal phone — caption preview | white/80 on dark frame | | |
| 2.12 | Modal right panel — Caption label & text box | Dark label text in Light; text box has light bg | | |
| 2.13 | Modal right panel — Hashtags, Visual Concept, CTA sections | All readable; purple/emerald tinted boxes visible | | |
| 2.14 | Download button | Gradient bg preserves white text in Light | | |

---

## 3 — ContentAnalyticsDashboard — Chart Tooltips

| # | Area | What to look for | L ✓/✗ | D ✓/✗ |
|---|------|-----------------|-------|-------|
| 3.1 | Pie chart — hover any segment | Tooltip appears with **dark bg** (rgba ~dark) + **white text name** | | |
| 3.2 | Pie tooltip — sub-line "N cards · X%" | White/60 (muted) text — NOT invisible | | |
| 3.3 | Pie tooltip — border | Subtle white border (not gray-300 override) | | |
| 3.4 | Engagement bar chart — hover any bar | Tooltip: dark bg, white label, colored dots + white values | | |
| 3.5 | Engagement tooltip — legend color swatches | Colored squares visible | | |
| 3.6 | Chart axes & tick labels | `chartCursor` fill visible; axis labels readable | | |
| 3.7 | KPI cards (Total Posts, Avg Engagement…) | Gradient number text vivid; labels muted gray | | |

---

## 4 — ContentBoard SLA Callout Banner

*Only appears when cards have been in `pending_approval` beyond the SLA threshold.*  
*To force it: use Demo Seed data — there should be overdue cards.*

| # | Area | What to look for | L ✓/✗ | D ✓/✗ |
|---|------|-----------------|-------|-------|
| 4.1 | Breached banner (red) | Red border, faint red bg, Timer icon = **red-700** in Light, text = **red-700** | | |
| 4.2 | Warning banner (amber) | Amber border, faint amber bg, text = **amber-700** in Light | | |
| 4.3 | "Review →" right-hand label | red-300/60 → **red-600 at 65%** in Light — legible | | |
| 4.4 | "+N at risk" secondary label | amber-300/60 → amber-600 muted in Light | | |
| 4.5 | Per-card SLA badge (compact, on cards) | "SLA Breached" = red-700 text; "At Risk" = amber-700 | | |
| 4.6 | Per-card SLA progress panel | "Time elapsed" label muted; bold value in red/amber | | |
| 4.7 | "On Time" SLA badge (green) | green-700 text on light green bg | | |

---

## 5 — ActivityFeedPage

| # | Area | What to look for | L ✓/✗ | D ✓/✗ |
|---|------|-----------------|-------|-------|
| 5.1 | Page header + icon | Gradient icon bg, white icon inside (exception applies) | | |
| 5.2 | Filter bar — refresh / load-more buttons | isDark conditional → correct styles | | |
| 5.3 | Search input | Light bg, dark placeholder, teal focus border | | |
| 5.4 | Action filter pills — all 14 types | Active pill: teal bg; inactive: `text-*-400` → richer -700 in Light | | |
| 5.5 | User avatars — gradient initials | White initial letter on gradient → exception applies | | |
| 5.6 | Avatar `border-white/20` ring | Converts to gray-300 ring in Light | | |
| 5.7 | Event rows — date group headers | Divider line visible; event count label readable | | |
| 5.8 | Event row card group border | `border-white/8` → gray-200; `divide-white/5` → gray-100 | | |
| 5.9 | Event detail — action icon (sky/violet/emerald etc.) | -400 → -700 mapping; no washed-out icons | | |
| 5.10 | Platform badge (Instagram gradient etc.) | White text on brand gradient ← exception check | | |
| 5.11 | ADMIN role badge | purple-400 text → purple-700 in Light | | |
| 5.12 | "Clear all" filters button | text-white/40 → gray-400, hover → dark | | |
| 5.13 | Empty state illustration | `bg-white/5` tint + icon faint color | | |
| 5.14 | Load more button | Light styling (isDark=false path) | | |
| 5.15 | 📱 Mobile: filter pills wrap cleanly | No overlap | | |

---

## 6 — SocialPublishPage

| # | Area | What to look for | L ✓/✗ | D ✓/✗ |
|---|------|-----------------|-------|-------|
| 6.1 | Stat cards row (Connections / Published etc.) | isDark path → light bordered card | | |
| 6.2 | Tab bar (Connections / History) | Inactive tabs: `text-white/40` → gray; active: `bg-white/15 text-white` → light | | |
| 6.3 | Twitter connection card | `text-white` icon → dark in Light; `bg-white/6` → faint tint; `border-white/12` → gray-300 | | |
| 6.4 | Other platform cards (Telegram, WhatsApp etc.) | Colored icon text remapped from -400 → -700 | | |
| 6.5 | Status dot — "Not yet tested" (gray dot) | isDark → gray-300 in Light | | |
| 6.6 | Test / Edit buttons | isDark → light gray style | | |
| 6.7 | Error message block (red for expired token) | red-300/70 → red-600 text; red/10 bg visible | | |
| 6.8 | "Connect Account" teal gradient button | Gradient bg preserves white text | | |
| 6.9 | History tab — publish records list | isDark-conditional border & dividers → light gray | | |
| 6.10 | Empty state (no connections) | Dark bg empty-state box → light gray in Light | | |

---

## 7 — LoginPage

| # | Area | What to look for | L ✓/✗ | D ✓/✗ |
|---|------|-----------------|-------|-------|
| 7.1 | Page hero / gradient bg | Gradient renders correctly | | |
| 7.2 | Login card container | Light mode: white/80 frosted card, gray-200 border | | |
| 7.3 | "Password" / "Magic Link" tabs | Active = teal bg + white text; inactive = muted gray | | |
| 7.4 | Form labels | Gray-700 in Light | | |
| 7.5 | Email / Password inputs | White bg, gray-300 border, dark text, gray placeholder | | |
| 7.6 | Eye icon (show/hide password) | gray-400 normal; gray-600 hover | | |
| 7.7 | "Sign In" teal button | Teal bg, white text (inline style exception) | | |
| 7.8 | hCaptcha disclaimer links | Underlined; hover → gray-600 | | |
| 7.9 | Demo Mode toggle pill | Toggle thumb white; track changes color | | |
| 7.10 | Demo account quick-fill cards | Light bordered cards; muted text | | |
| 7.11 | "Seed Data" button | Muted border + text; orange Zap icon | | |
| 7.12 | Sign-up tab — form fields | Same as login form | | |
| 7.13 | "Check Your Inbox" success state | Gray-50 card, readable email address | | |

---

## 8 — All 10 Public Marketing Pages (Web Light)

*Toggle light/dark via the globe icon in WebLayout nav.*

| # | Page | Items to check | L ✓/✗ | D ✓/✗ |
|---|------|---------------|-------|-------|
| 8.1 | **Home** | Hero text, stats row, dashboard mockup card, floating "↑312% ROI" badge | | |
| 8.2 | Home | "Watch Demo" outline button → dark text + gray border in Light | | |
| 8.3 | Home | Ticker logos `text-white/25` → visible muted text | | |
| 8.4 | Home | "Problem" and "Solution" sections — all text dark | | |
| 8.5 | **Features** | Tab buttons (inactive/active); feature panels; integration logos | | |
| 8.6 | Features | CTA button gradient + white text | | |
| 8.7 | **Pricing** | Billing toggle (`bg-white text-black` active pill stays correct) | | |
| 8.8 | Pricing | Plan cards: highlighted card = teal gradient border; others = subtle border | | |
| 8.9 | Pricing | "Most Popular" orange badge on highlighted card | | |
| 8.10 | Pricing | Comparison table — alternating rows; ✓ icons; X icons muted | | |
| 8.11 | Pricing | FAQ accordion — question text dark; answer muted | | |
| 8.12 | **About** | All stat numbers dark; team cards; office location pills | | |
| 8.13 | **Blog** | Featured article card; article grid; author avatar initials on gradient | | |
| 8.14 | Blog | Search input (light bg, dark placeholder) | | |
| 8.15 | Blog | Category filter pills | | |
| 8.16 | Blog | Ghost `BookOpen` icon inside gradient card header — faint but visible | | |
| 8.17 | Blog | Newsletter input + Subscribe button | | |
| 8.18 | **Contact** | All form inputs (Name, Email, Company, Subject `<select>`, Message) | | |
| 8.19 | Contact | Submit button teal gradient | | |
| 8.20 | Contact | Loading spinner `border-white/40 border-t-white` on teal bg | | |
| 8.21 | Contact | Success state (CheckCircle + confirmation text) | | |
| 8.22 | Contact | Office cards; support channel cards | | |
| 8.23 | **Careers** | All text and layout (no white patterns — confirm nothing washed out) | | |
| 8.24 | **Request Access** | Form fields and CTA | | |
| 8.25 | **Privacy** | Long-form text readable — no contrast issues | | |
| 8.26 | **Terms** | Long-form text readable | | |

---

## 9 — Cross-cutting checks (run once in Light, once in Dark)

| # | Check | L ✓/✗ | D ✓/✗ |
|---|-------|-------|-------|
| 9.1 | Nav sidebar: all menu items readable; active item highlighted | | |
| 9.2 | Nav sidebar: group-hover arrow icons → gray-500 in Light (not white) | | |
| 9.3 | Sonner toast messages: text legible in both modes | | |
| 9.4 | All `<select>` dropdowns: `color-scheme: light` set correctly (no dark OS picker in Light) | | |
| 9.5 | Modal backdrops (`bg-black/80`) → near-white in web-light; correct overlay on dashboard | | |
| 9.6 | FoldableContainer panel headers — title, description, collapse chevron | | |
| 9.7 | Recharts bars/lines: `chartCursor` hover fill visible in both modes | | |
| 9.8 | AnimatePresence enter/exit transitions don't flash wrong colors | | |
| 9.9 | `bg-bt-teal`, `bg-bt-orange`, `bg-bt-purple` accent surfaces retain white text in Light | | |
| 9.10 | Gradient CTAs (`from-bt-teal to-bt-teal-dark` etc.) retain white text in Light | | |
| 9.11 | ContentCalendarView — selected day number is **purple-700** (not near-white) | | |
| 9.12 | ContentCard — "Apply Caption & Hashtags" AI button text is readable purple | | |
| 9.13 | ContentBoard — "Share for Review Mode" banner description text is orange (not invisible) | | |
| 9.14 | ContentBoard — overdue/due-today schedule alert: orange or green text visible | | |
| 9.15 | MFAEnrollPage — current step indicator number is purple-600 (not invisible pale lavender) | | |
| 9.16 | MFAChallengeModal — OTP digit inputs: dark text on light bg; gray placeholder | | |
| 9.17 | StatusBadge — "superadmin" chip: indigo-700 text, not light lavender | | |
| 9.18 | LandingUSP / LandingFAB — rose accent labels readable on light bg | | |
| 9.19 | ProfileBanner — amber/orange/green status pills readable in Light mode | | |
| 9.20 | EmployeeNav — notification dropdown: dark heading "Notifications", dark card titles | | |

---

## Failure escalation

If any item fails:  
1. Note the **component name**, **className string**, and **exact symptom** (e.g., "white text on white bg").  
2. Determine whether the fix belongs in:  
   - `dashboard-light.css` (dashboard & employee portal pages), OR  
   - `web-light.css` (public marketing pages), OR  
   - Component-level `isDark` conditional (inline `style` values only).  
3. Add the selector to the appropriate file using the existing pattern families.  
4. Re-run the specific row that failed.  

**Gate 2 is PASSED only when every row above shows ✅ in both L and D columns.**
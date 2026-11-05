# Jebarson's prep guide: slides 9–12

Your slides: **09 System Architecture · 10 Database Design · 11 Tools & Technologies · 12 Modules**.
Every claim on those slides is mapped below to the exact file and line, so you can open it in VS Code when someone says "show me".

---

## 0. The one-minute mental model

```
Browser (React SPA)  --HTTPS + "Authorization: Bearer <JWT>"-->  Express API  --Mongoose-->  MongoDB Atlas
                                                                     |
                                                                     +--fetch()--> Groq gpt-oss-120b  (or local Ollama)
                                                                     +--fallback.js (rules + TF-IDF) if AI fails
```

Request lifecycle (say this if asked "walk me through a request"):

1. React page calls `api.get(...)` → Axios interceptor adds the JWT → [client/src/api/client.js:5-9](../client/src/api/client.js)
2. On Vercel, `/api/*` is rewritten to one serverless function → [vercel.json](../vercel.json), [api/index.js](../api/index.js)
3. That function connects to Mongo once (`ensureDB`) and hands the request to Express → [server/src/config/db.js:17-24](../server/src/config/db.js)
4. Express global middleware: `helmet` → `cors` → `express.json` → `morgan` → [server/src/app.js:11-14](../server/src/app.js)
5. Route-level chain: `protect` (JWT) → `requireRole` → validators → `validate` → controller → [server/src/routes/index.js](../server/src/routes/index.js)
6. Controller calls services (analyzer / matcher / LLM) and Mongoose models
7. Any thrown `HttpError` lands in the central `errorHandler` → JSON `{ message }` → [server/src/middleware/error.js:19-39](../server/src/middleware/error.js)

---

## 1. Slide 09: System Architecture (3 tiers + external AI)

| Slide says | Where it is in code | What to say |
|---|---|---|
| **React 18 SPA (Vite)** | [client/package.json](../client/package.json), [client/src/main.jsx](../client/src/main.jsx) | `createRoot` renders `<App/>` inside `BrowserRouter` → `AuthProvider` → `ToastProvider`. Single page; the server only ever sends `index.html` + JS bundle. |
| **React Router** | [client/src/App.jsx:21-66](../client/src/App.jsx) | Routes grouped under `<ProtectedRoute roles={[...]}>` wrappers. `*` redirects to `/`. |
| Front-end role guard | [client/src/components/ProtectedRoute.jsx](../client/src/components/ProtectedRoute.jsx) | No user → `/login`; wrong role → that role's home. **This is only UX; real security is the server's `requireRole`.** |
| **Axios with JWT interceptor** | [client/src/api/client.js](../client/src/api/client.js) | Request interceptor reads `localStorage.token` and sets `Authorization: Bearer …`. Response interceptor: on 401 it deletes the token and fires `auth:logout`, which `AuthContext` listens for. |
| **Chart.js** | [client/src/components/Charts.jsx:1-13](../client/src/components/Charts.jsx) | `react-chartjs-2` wrapper; registers only the pieces used (Arc, Bar, scales, Tooltip, Legend) for a smaller bundle. Bar + Doughnut used on admin dashboard. |
| **Express 5 REST API** | [server/src/app.js](../server/src/app.js), [server/src/routes/index.js](../server/src/routes/index.js) | Resource-style URLs: `/auth`, `/resumes`, `/jobs`, `/applications`, `/admin`. Express 5 auto-catches rejected promises from `async` handlers, so controllers just `throw new HttpError(...)` with no try/catch. |
| **helmet** | [app.js:11](../server/src/app.js) | Sets security headers (CSP, X-Content-Type-Options, HSTS, frameguard…). `crossOriginResourcePolicy: 'cross-origin'` so resume downloads aren't blocked. |
| **CORS** | [app.js:12](../server/src/app.js) | Whitelist: `CLIENT_URL` + localhost:5173. In production the SPA and API share one domain, so CORS barely matters there. Locally the Vite proxy also avoids it ([vite.config.js:8](../client/vite.config.js)). |
| **JWT** | [server/src/middleware/auth.js:6-28](../server/src/middleware/auth.js) | `signToken` puts `{ id, role }` in the payload, signed with `JWT_SECRET`, expires in `7d` (HS256 default). `protect` verifies it, **re-loads the user from DB** (so deleted/deactivated users are blocked immediately), attaches `req.user`. |
| **role guards** | [auth.js:30-37](../server/src/middleware/auth.js), [routes/index.js:14-16](../server/src/routes/index.js) | `requireRole(...roles)` is a middleware factory. Presets: `seeker`, `recruiter` (recruiter **or** admin), `adminOnly`. |
| **validation** | [routes/index.js:19-33, 49-54, 66](../server/src/routes/index.js) + [error.js:5-12](../server/src/middleware/error.js) | `express-validator` `body(...)` chains, then our `validate` middleware turns the first error into a 400. Plus Mongoose schema validation (enum, required, min) → also 400. |
| **services** | [server/src/services/](../server/src/services) | Business logic kept out of controllers: `llmClient`, `resumeAnalyzer`, `matcher`, `fallback`, `skills`, `textExtractor`. |
| **MongoDB 7 via Mongoose; Atlas M0 (AWS Mumbai)** | [server/src/config/db.js](../server/src/config/db.js), [docker-compose.yml](../docker-compose.yml) | Locally `mongo:7` in Docker; production is Atlas free tier (M0) in AWS Mumbai. |
| **Groq gpt-oss-120b, or local Ollama llama3.2** | [server/src/services/llmClient.js](../server/src/services/llmClient.js), [server/src/config/env.js:3-5](../server/src/config/env.js) | `LLM_PROVIDER` env picks one; default = Groq if `GROQ_API_KEY` is set, else Ollama. Callers only see `chatJSON`, `isReady`, `getHealth`. |

**Key line from your speaker notes:** "Only the server calls the AI provider, so API keys never reach the browser." Proof: the key is read only in `env.js` from `process.env.GROQ_API_KEY` and used only in `llmClient.js:117`. No client file references Groq.

**Deployment detail (slide 11 notes mention it too):**
- [vercel.json](../vercel.json): `regions: ["bom1"]` = Mumbai, same region as the Atlas cluster → low DB latency.
- Rewrites: `/api/(.*)` → `/api` (the serverless function); everything else → `/index.html` (so React Router deep links like `/seeker/jobs` work on refresh).
- `maxDuration: 60` s so the LLM call doesn't time out; `includeFiles` bundles pdfjs's legacy build.
- [api/index.js](../api/index.js): if Mongo is unreachable it returns a **503 JSON** instead of crashing.
- `ensureDB` ([db.js:17-24](../server/src/config/db.js)) caches the connection promise across warm invocations; on failure it resets so the next request retries.

---

## 2. Slide 10: Database Design (4 collections)

### Why MongoDB? (speaker note)
The AI analysis and match breakdown are **nested objects whose shape can change** (LLM adds fields, lists vary in length). A document DB stores them as embedded sub-documents with no joins/migrations. The four main entities still **reference** each other by ObjectId (`ref` + `populate`), like foreign keys.

**Embedding vs referencing (very likely question):**
- *Embedded* (owned, read together): `resume.analysis`, `application.matchBreakdown`. Defined as sub-schemas with `{ _id: false }`.
- *Referenced* (independent entities, shared): `job.recruiter → User`, `application.job/seeker/resume`, `resume.user`.

### users — [server/src/models/User.js](../server/src/models/User.js)
| Slide | Line | Detail |
|---|---|---|
| Unique lower-cased email | 9 | `unique: true, lowercase: true, trim: true` → unique index; "A@x.com" and "a@x.com" are the same. |
| bcrypt hash | 10, 19-22 | `password` has `select: false` (never returned by queries). `pre('save')` hook hashes with **bcrypt, 10 salt rounds**, only if the password changed. |
| | 24-26 | `matchPassword` = `bcrypt.compare` (used at login). |
| | 28-33 | `toJSON` strips `password` and `__v` even if selected, extra safety. |
| role enum | 4, 11 | `['seeker','recruiter','admin']`, default `seeker`. Register only allows seeker/recruiter ([authController.js:7](../server/src/controllers/authController.js)), so nobody can self-register as admin. |
| isActive | 14 | Admin can deactivate; `protect` returns **403** for inactive users ([auth.js:24](../server/src/middleware/auth.js)). |

### resumes — [server/src/models/Resume.js](../server/src/models/Resume.js)
| Slide | Line | Detail |
|---|---|---|
| Original file (≤ 4 MB) | 25 | `fileData: Buffer, select: false`. Stored **in MongoDB**, not disk, because Vercel serverless has no persistent filesystem. 4 MB fits Vercel's 4.5 MB request limit and Mongo's 16 MB document limit. |
| rawText | 26 | `select: false`, extracted text, loaded only when matching needs it (`.select('+rawText')`). |
| embedded AI analysis | 3-16, 27 | summary, skills, experienceYears, education, strengths, weaknesses, suggestions, suggestedRoles, `atsScore` (min 0, max 100). |
| analyzedBy | 28 | enum `groq | ollama | fallback`, shows who produced the analysis. |
| | 30 | `isPrimary`: the resume used for matching; newest upload becomes primary ([resumeController.js:25](../server/src/controllers/resumeController.js)). |

### jobs — [server/src/models/Job.js](../server/src/models/Job.js)
| Slide | Line | Detail |
|---|---|---|
| Recruiter ref | 7 | `ObjectId, ref: 'User', index: true`. |
| requiredSkills | 13 | Array of strings, normalised to canonical names on save ([jobController.js:29-32](../server/src/controllers/jobController.js)). |
| minExperience | 14 | `min: 0`; also validated 0–40 at the route ([routes/index.js:52](../server/src/routes/index.js)). |
| text index for search | 21 | `{ title:'text', description:'text', company:'text' }`. |
| | 3, 11, 16 | `type` enum (Full-time, Part-time, Internship, Contract, Remote), `status` enum open/closed (indexed). |

> ⚠️ Honest-answer trap: the **text index exists**, but the actual job search in `buildFilter` ([jobController.js:11-24](../server/src/controllers/jobController.js)) uses **case-insensitive regex** across title/company/description/skills (escaped to prevent regex injection) because regex matches partial words like "reac" → "React". If asked: "The text index supports full-text `$text` queries; for the search box we chose regex for partial matching."

### applications — [server/src/models/Application.js](../server/src/models/Application.js)
| Slide | Line | Detail |
|---|---|---|
| matchScore + breakdown | 5-16, 24-25 | breakdown = skillScore, textScore, aiScore, matchedSkills, missingSkills, aiReasoning, scoredBy. Score is computed **once at apply time** and stored ([applicationController.js:35-44](../server/src/controllers/applicationController.js)); recruiter can `rescore`. |
| status enum | 3, 26 | `applied → shortlisted / rejected / hired`. |
| unique (job, seeker) | 31 | `index({ job:1, seeker:1 }, { unique:true })`: DB-level guarantee of one application per job per seeker. The controller also checks first and returns a friendly **409** ([applicationController.js:28](../server/src/controllers/applicationController.js)); if a race slips through, Mongo's `11000` error is mapped to 409 in [error.js:32-35](../server/src/middleware/error.js). |

### Indexes (full list, if asked)
`users.email` (unique) · `resumes.user` · `jobs.recruiter` · `jobs.status` · `jobs` text index · `applications.job` · `applications.seeker` · `applications {job, seeker}` unique compound.

### Data integrity / cascade deletes (no foreign keys in Mongo, so done in code)
- Delete job → delete its applications ([jobController.js:94-99](../server/src/controllers/jobController.js))
- Admin deletes user → delete their applications, their jobs (+ those jobs' applications), their resumes ([adminController.js:88-101](../server/src/controllers/adminController.js))
- Can't delete a resume that's attached to an application → 409 ([resumeController.js:75-77](../server/src/controllers/resumeController.js))

---

## 3. Slide 11: Tools & Technologies

### Front end — [client/package.json](../client/package.json)
| Tool | Used for / where |
|---|---|
| React 18 + Vite 6 | UI library + dev server/bundler (fast HMR, `vite build` → `client/dist`). Proxy `/api` → `localhost:5000` in dev ([vite.config.js](../client/vite.config.js)). |
| React Router 6 | [App.jsx](../client/src/App.jsx): nested routes, `<Outlet/>`, `<Navigate/>`. Params via `useParams` (e.g. `/jobs/:id`). |
| Axios | [api/client.js](../client/src/api/client.js): one instance, `baseURL: '/api'`, interceptors. `errMsg()` turns errors into readable text. |
| Chart.js | [Charts.jsx](../client/src/components/Charts.jsx) + [pages/admin/Dashboard.jsx](../client/src/pages/admin/Dashboard.jsx). |
| HTML5 · CSS3 · ES2022 | Plain CSS in [index.css](../client/src/index.css) with CSS variables; ES modules, `async/await`, optional chaining `?.`, `??=`. Form validation via HTML5 attributes (`required`, `type="email"`, `minLength={6}`) in [Register.jsx:58-72](../client/src/pages/Register.jsx). |
| Light / dark themes | [ThemeToggle.jsx](../client/src/components/ThemeToggle.jsx) sets `<html data-theme="dark">`, saves to `localStorage`, falls back to OS `prefers-color-scheme`. Applied before first render in [main.jsx:9-14](../client/src/main.jsx) to avoid a flash. |
| State management | React Context: [AuthContext.jsx](../client/src/context/AuthContext.jsx) (user, login, register, logout), `ToastContext` (notifications). No Redux needed. |

### Back end — [server/package.json](../server/package.json)
| Tool | Used for / where |
|---|---|
| Node.js 20 + Express 5 | Runtime + web framework. ES modules (`"type": "module"`). |
| jsonwebtoken | [auth.js](../server/src/middleware/auth.js): `jwt.sign` / `jwt.verify`. |
| bcryptjs | [User.js:19-26](../server/src/models/User.js): hash + compare. Pure-JS bcrypt (no native build, works on Vercel). |
| helmet · CORS · morgan | [app.js:11-14](../server/src/app.js). morgan = HTTP request logging (`dev` format). |
| express-validator | [routes/index.js](../server/src/routes/index.js) + `validate` in [error.js](../server/src/middleware/error.js). |
| Multer | [middleware/upload.js](../server/src/middleware/upload.js): `memoryStorage` (buffer in RAM, no disk), 4 MB limit, extension filter (.pdf/.docx/.txt), field name `resume`. |
| pdfjs-dist · mammoth | [services/textExtractor.js](../server/src/services/textExtractor.js): pdfjs reads PDF text items and rebuilds lines from the Y coordinate; mammoth gets raw text from DOCX; TXT is UTF-8 decode. < 50 chars → 422 "scanned/image-only not supported". |
| dotenv | [config/env.js](../server/src/config/env.js): all config from env vars with safe defaults. |
| nodemon | Dev auto-restart. |

### Database
MongoDB 7 (Docker `mongo:7` locally, [docker-compose.yml](../docker-compose.yml)), Mongoose 8 schemas with `required`, `enum`, `min/max`, `maxlength`, `unique`, `select:false`, indexes, pre-save hooks; Atlas M0 in the cloud.

### AI & Deploy
| Tool | Where |
|---|---|
| Groq gpt-oss-120b | [llmClient.js:99-134](../server/src/services/llmClient.js): OpenAI-compatible `/chat/completions`, `response_format: json_object` (JSON mode), `reasoning_effort`, +6000 tokens budget for reasoning, **1 retry on 429** honouring `Retry-After`. |
| Ollama llama3.2 (local) | [llmClient.js:136-162](../server/src/services/llmClient.js): `/api/chat`, `format: 'json'`, `num_ctx 8192`, `keep_alive 15m`. |
| Rule-based fallback | [services/fallback.js](../server/src/services/fallback.js): dictionary skill extraction, regex experience estimate, heuristic ATS score, TF-IDF cosine. |
| Vercel | [vercel.json](../vercel.json) + [api/index.js](../api/index.js): static `client/dist` + one serverless function. |
| Git/GitHub · Postman | Version control; Postman for the 23 API test cases. |

---

## 4. Slide 12: Modules (6)

### 01 Auth & Users
- Routes: [routes/index.js:19-35](../server/src/routes/index.js) → [authController.js](../server/src/controllers/authController.js)
- Register: validate → role must be seeker/recruiter → recruiter needs company → duplicate email 409 → `User.create` (hook hashes) → return `{ token, user }` (201).
- Login: `findOne(...).select('+password')` → `matchPassword` → **same message for wrong email or password** (doesn't leak which emails exist) → 403 if deactivated.
- `GET /auth/me`: used on page reload to restore the session ([AuthContext.jsx:17-24](../client/src/context/AuthContext.jsx)).
- `requireRole` guard, deactivation via admin.

### 02 Resume & AI Analysis
- Routes: [routes/index.js:41-46](../server/src/routes/index.js) → [resumeController.js](../server/src/controllers/resumeController.js)
- Flow in `uploadResume` (lines 17-43): Multer buffer → `extractText` → `analyzeResume` → un-primary old resumes → save new one as primary → respond without rawText/fileData.
- [resumeAnalyzer.js](../server/src/services/resumeAnalyzer.js): always computes rule-based result first; if AI ready, sends a strict JSON-only system prompt; up to **2 attempts** (2nd at temperature 0), no retry on timeout; `normalize()` validates every field, unions LLM skills with dictionary skills, **blends ATS score 70% LLM + 30% rules** (Groq; 50/50 for Ollama); any field missing → rule value.
- Re-analyse (`/resumes/:id/reanalyze`) reruns on stored rawText; set primary; delete (blocked if used in an application).
- Front end: [ResumePage.jsx](../client/src/pages/seeker/ResumePage.jsx) (also checks 4 MB client-side, line 31), [AnalysisReport.jsx](../client/src/pages/seeker/AnalysisReport.jsx).

### 03 Job Management
- Routes: [routes/index.js:49-63](../server/src/routes/index.js) → [jobController.js](../server/src/controllers/jobController.js)
- `pickJobFields` whitelists fields (prevents mass-assignment, e.g. someone can't set `recruiter`).
- `findOwnJob`: recruiter can only edit/delete own jobs (403), admin can do any.
- Search `buildFilter`: keyword `q`, `location`, `type`, comma-separated `skills` — only `status: 'open'` jobs.
- Close = `PUT /jobs/:id { status: 'closed' }` ([recruiter/Dashboard.jsx:22](../client/src/pages/recruiter/Dashboard.jsx)).
- `myJobs` uses an aggregation for applicants count, avg score, shortlisted count (lines 102-122).

### 04 Matching & Applications
- [services/matcher.js](../server/src/services/matcher.js)
  - `fastMatch` (22-49): `skillScore = matched/required × 100`, reduced by up to 25% if under min experience (`× (0.75 + 0.25 × years/min)`); `textScore` = TF-IDF cosine scaled (÷0.4, capped at 100); **fast score = 0.75 × skill + 0.25 × text**.
  - `rankJobs` (120-125): builds one IDF corpus for the resume + all jobs, ranks all open jobs. Used by `GET /jobs/matches`.
  - `fullMatch` (91-117): fast score + LLM `aiFit` → final blend; **in-memory cache** keyed by resume+job ids and `updatedAt`, max 500 entries; on any AI error returns fast score.
- "Check my fit" = `GET /jobs/:id/fit` → [JobDetail.jsx:37](../client/src/pages/JobDetail.jsx).
- Apply = `POST /applications` → [applicationController.js:23-46](../server/src/controllers/applicationController.js) (open job? duplicate 409? has resume? → `fullMatch` → store).
- Ranked applicants: `.sort({ matchScore: -1 })` ([applicationController.js:75](../server/src/controllers/applicationController.js)).
- Discover candidates: `GET /jobs/:id/candidates` → `suggestedCandidates` ([jobController.js:125-137](../server/src/controllers/jobController.js)): every active seeker's primary resume, fast-scored, top 20.
- Access control on one application: `loadForViewer` ([applicationController.js:11-21](../server/src/controllers/applicationController.js)): owner seeker, the job's recruiter, or admin only.

> ⚠️ **Mismatch with slide 8** (Vamshi's slide): slide says *Final = 0.60 × skill + 0.40 × AI*. The code ([matcher.js:107](../server/src/services/matcher.js)) uses **0.5/0.5 when provider is Groq** (what's live) and 0.6/0.4 only for Ollama. If asked: "60/40 is the local-model weighting; with the larger hosted model we trust its judgement more and weigh it equally." Tell the team before presenting.

### 05 Administration
- Routes: [routes/index.js:76-82](../server/src/routes/index.js) → [adminController.js](../server/src/controllers/adminController.js)
- `stats` runs **10 queries in parallel with `Promise.all`**, mostly aggregation pipelines: `$group` by role/status, `$avg` match & ATS scores, `$unwind` + `$group` + `$sort` + `$limit 10` for top skills (supply from resumes vs demand from jobs), signups per day over 14 days with `$dateToString`, plus AI health.
- Charts in [pages/admin/Dashboard.jsx](../client/src/pages/admin/Dashboard.jsx).
- Manage users (role change, activate/deactivate, delete with cascade; admin can't modify/delete self), moderate jobs (open/close, delete).
- User search regex is escaped (prevents ReDoS / regex injection), line 68.

### 06 AI Provider & Fallback
- [llmClient.js](../server/src/services/llmClient.js): provider-agnostic interface.
  - `getHealth` (51-70): checks Groq `/models` or Ollama `/api/tags`, **cached 60 s (Groq) / 15 s (Ollama)**.
  - `isReady` = online **and** model available.
  - `parseJsonLoose` (78-92): tolerates code fences / trailing commas / smart quotes.
  - Timeouts via `AbortSignal.timeout` (30 s Groq / 90 s Ollama default; 20 s for fit).
- Health badge: `GET /api/ai/health` polled every 30 s by [AiStatus.jsx](../client/src/components/AiStatus.jsx) → "AI online · model" / "Model missing" / "AI fallback".
- Fallback: [fallback.js](../server/src/services/fallback.js) + [skills.js](../server/src/services/skills.js) (dictionary in [data/skills.json](../server/src/data/skills.json), `Canonical|alias|alias`, whole-word regex, longest alias first, case-sensitive for words like "Go"/"REST").
- `analyzedBy` / `scoredBy` fields record which path was used.

---

## 5. Concepts you may be quizzed on (short answers)

**JWT:** header.payload.signature, base64url. Ours is signed (HS256) not encrypted, so payload `{id, role, iat, exp}` is readable but can't be forged without `JWT_SECRET`. Stateless: server stores no session. Downside: can't revoke before expiry, which we mitigate by re-checking the user and `isActive` in DB on every request (`protect`).

**Where's the token stored?** `localStorage` (client.js). Trade-off: simple and works with our Bearer header, but readable by JS if there's XSS. Mitigations: React escapes output by default, helmet sets CSP. Alternative would be an httpOnly cookie (needs CSRF protection).

**bcrypt:** slow, salted one-way hash. Salt is random per password and stored inside the hash string. Cost factor 10 = 2¹⁰ rounds. Same password → different hashes. Compare with `bcrypt.compare`, never decrypt.

**401 vs 403:** 401 = not authenticated (no/invalid/expired token). 403 = authenticated but not allowed (wrong role, deactivated, not your job). 400 = bad input, 404 = not found, 409 = conflict/duplicate, 422 = file unreadable, 503 = DB unavailable.

**Middleware:** function `(req, res, next)` in a chain; can modify `req`, end the response, or call `next()`/throw. Ours: global (helmet, cors, json, morgan), route (protect, requireRole, validators, multer), error handler (4 args `err, req, res, next`), 404 `notFound`.

**Why validate both sides?** Client validation = fast UX feedback; server validation = actual security (anyone can call the API with Postman, bypassing the UI).

**CORS:** browser rule blocking JS from reading responses from another origin unless the server sends `Access-Control-Allow-Origin`. We whitelist our client URL.

**helmet:** sets ~15 HTTP security headers in one line.

**Mongoose `populate`:** replaces an ObjectId ref with the referenced document (like a JOIN done by Mongoose with extra queries). Example: [applicationController.js:12-15](../server/src/controllers/applicationController.js).

**Aggregation pipeline:** stages processed in order on the server: `$match` (filter) → `$unwind` (array → one doc per element) → `$group` (count/avg) → `$sort` → `$limit`. Example: top skills in [adminController.js:21-27](../server/src/controllers/adminController.js).

**`select: false`:** field is excluded unless explicitly asked for with `.select('+field')`. Used for password, rawText, fileData.

**Index:** B-tree that lets Mongo find documents without scanning the whole collection. Unique index also enforces a constraint.

**SPA:** one HTML page; React Router swaps components on URL change without full page reloads. Vercel rewrite sends all non-API paths to `index.html`.

**Serverless:** the Express app runs as a function per request; no always-on server and no persistent disk → files stored in Mongo, DB connection cached between warm invocations.

**TF-IDF + cosine:** TF = how often a word appears in this doc (we use `1+log(count)`); IDF = rarer across docs → higher weight (`log((1+n)/(1+df))+1`, smoothed). Each doc becomes a weighted word vector; cosine = angle between resume vector and job vector (1 = same direction). Code: [fallback.js:23-61](../server/src/services/fallback.js).

**Why hybrid scoring?** Fast score is deterministic and instant across all jobs; LLM is slow (~3.6 s) and can fail, so it runs on demand (Check my fit / apply) and is cached; fallback keeps the app working if AI is down.

**Why Groq over OpenAI/Gemini?** Free tier, very fast inference, OpenAI-compatible API, open-weights model; and the same code can switch to fully local Ollama for privacy.

**MERN:** MongoDB, Express, React, Node. Ours is MERN + LLM.

---

## 6. "Pull up the code" demo order (if they ask)

1. [server/src/routes/index.js](../server/src/routes/index.js): every endpoint + guards on one screen. Best single file to show architecture.
2. [server/src/middleware/auth.js](../server/src/middleware/auth.js): JWT + role guard.
3. [server/src/models/User.js](../server/src/models/User.js) → [Application.js](../server/src/models/Application.js): bcrypt hook, unique compound index.
4. [server/src/app.js](../server/src/app.js): helmet/cors/morgan.
5. [client/src/api/client.js](../client/src/api/client.js): Axios interceptor.
6. [client/src/App.jsx](../client/src/App.jsx) + [ProtectedRoute.jsx](../client/src/components/ProtectedRoute.jsx): routing.
7. [server/src/services/llmClient.js](../server/src/services/llmClient.js) → [matcher.js](../server/src/services/matcher.js): AI + fallback.
8. [vercel.json](../vercel.json) + [api/index.js](../api/index.js): deployment.

Tip: in VS Code, `Ctrl+P` and type the filename; `Ctrl+G` to jump to a line; `Ctrl+Shift+F` to search e.g. `requireRole`.

---

## 7. Small things to be careful about saying

- **Node 20** isn't pinned anywhere in package.json; it's the Vercel runtime / what you run locally. Fine to say, just don't claim it's enforced.
- **MongoDB 7** is the local Docker image; Atlas M0 runs whatever version Atlas currently provides.
- `package.json` description still says "MERN + Ollama"; production uses Groq.
- `filePath` on Resume is a legacy field from when files were saved to `server/uploads/`; new uploads live in `fileData`.
- Fit cache is **in-memory**, so on serverless it's per warm instance and resets on cold start.
- There are no automated Jest tests yet (listed as future work); the 23 test cases were run with Postman.

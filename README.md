# HireSense: AI-Assisted Resume Analysis & Job Matching Portal

A MERN-stack web application where:

- **Job seekers** upload a resume and get an AI analysis: ATS score, skills, strengths, weaknesses and suggestions. Open jobs are ranked for them by how well they fit.
- **Recruiters** post jobs and see applicants ranked by AI match score. They can also discover suitable candidates who have not applied yet.
- **Admins** monitor platform statistics and manage users and job posts.

The AI runs **locally through [Ollama](https://ollama.com)**, so no paid API is needed and resume data never leaves the machine. If Ollama is not running, a rule-based engine (a skills dictionary plus TF-IDF) takes over, so the app always works.

| Layer    | Technology |
|----------|------------|
| Frontend | React 18, Vite, React Router, Axios, Chart.js, plain CSS (light/dark) |
| Backend  | Node.js, Express 5, Mongoose, JWT, Multer, pdfjs-dist, mammoth |
| Database | MongoDB 7 (Docker) |
| AI       | Ollama (`llama3.2:3b` by default), plus a rule-based fallback |

---

## 1. Prerequisites

- **Node.js 20+**
- **Docker Desktop** (for MongoDB), or a local MongoDB / Atlas URI
- **Ollama** (optional, but needed for real AI analysis): https://ollama.com/download

## 2. Setup

```bash
# from the project root
npm run install:all            # installs root, server and client dependencies
cp server/.env.example server/.env   # Windows: copy server\.env.example server\.env

npm run db                     # starts MongoDB in Docker on port 27017
npm run seed                   # demo users, 20 jobs, 5 resumes, 13 applications
npm run samples                # writes sample resume PDFs to ./samples (for upload testing)
```

### Local LLM (Ollama)

```bash
ollama pull llama3.2:3b        # ~2 GB; runs on most laptops
# Ollama usually runs as a background service after install. If not:
ollama serve
```

On a machine with a strong GPU, a bigger model gives better analysis. Pull it and set it in `server/.env`:

```env
OLLAMA_MODEL=qwen2.5:7b
```

You can also run Ollama in Docker: `docker compose --profile ollama up -d`, then
`docker exec -it resume-portal-ollama ollama pull llama3.2:3b`.

To re-seed with AI-generated analyses (slower): `npm --prefix server run seed -- --ai`

## 3. Run

```bash
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:5000/api
- AI status: http://localhost:5000/api/ai/health

The navbar shows a badge: **AI online** (green), **Model missing** (amber) or **AI fallback** (grey).

### Demo accounts (password `password123`)

| Role      | Email                | Notes |
|-----------|----------------------|-------|
| Seeker    | `seeker@demo.com`    | Arun, full stack developer, with resume & applications |
| Seeker    | `fresher@demo.com`   | No resume yet: try the upload flow with `samples/*.pdf` |
| Recruiter | `recruiter@demo.com` | TechCorp Solutions (10 jobs) |
| Recruiter | `hr@datawise.com`    | DataWise Analytics (10 jobs) |
| Admin     | `admin@demo.com`     | Platform overview, users, jobs |

---

## 4. How the AI works

```
Upload (PDF/DOCX/TXT)
   │  Multer → pdfjs-dist / mammoth → plain text
   ▼
Resume analysis (services/resumeAnalyzer.js)
   ├─ Ollama /api/chat, format:"json", temperature 0.2
   │    → summary, skills, experienceYears, education, strengths,
   │      weaknesses, suggestions, suggestedRoles, atsScore
   ├─ validate + normalise (skill aliases, clamp numbers, repair JSON)
   ├─ blend with rule-based signals (skills union, ATS = 50% LLM + 50% heuristic)
   └─ on timeout / bad output → rule-based analysis (services/fallback.js)
   ▼
Job matching (services/matcher.js)
   ├─ skillScore = required skills matched ÷ required (× experience penalty)
   ├─ textScore  = TF-IDF cosine similarity between resume and job text
   ├─ fast score = 0.75·skill + 0.25·text          ← used to rank every job instantly
   └─ AI score   = LLM fit judgement (0-100 + reasoning + missing skills)
        final    = 0.6·skill + 0.4·AI              ← used when applying / "Check my fit"
```

- **Fast scoring** runs for every open job on each request, so lists stay instant.
- **LLM scoring** runs in three places, because a local model can take several seconds per call:
  - when a seeker applies;
  - when a seeker clicks *Check my fit*;
  - when a recruiter clicks *Re-score*.
- LLM results are cached in memory per resume/job version.

## 5. Project structure

```
webtech/
├─ docker-compose.yml        MongoDB (+ optional Ollama profile)
├─ samples/                  generated sample resumes (npm run samples)
├─ server/
│  └─ src/
│     ├─ config/             env + MongoDB connection
│     ├─ models/             User, Resume, Job, Application
│     ├─ middleware/         JWT auth + role guard, upload, errors/validation
│     ├─ services/           ollamaClient, resumeAnalyzer, matcher, fallback, skills, textExtractor
│     ├─ data/skills.json    ~220 skills with aliases, grouped by category
│     ├─ controllers/        auth, resume, job, application, admin
│     ├─ routes/index.js     all REST routes
│     └─ seed/               seed script, demo jobs, sample resumes
└─ client/
   └─ src/
      ├─ api/, context/      axios client (JWT interceptor), auth + toast contexts
      ├─ components/         Navbar, ProtectedRoute, ScoreRing, JobCard, MatchBreakdown, Charts…
      └─ pages/              Landing, Login, Register, JobDetail
         ├─ seeker/          Dashboard, ResumePage, AnalysisReport, JobMatches, MyApplications
         ├─ recruiter/       Dashboard, JobFormPage, Applicants, CandidateView
         └─ admin/           Dashboard (charts), Users, Jobs
```

## 6. REST API

All routes are prefixed with `/api`. 🔒 means a JWT is required, and the role is shown in brackets.

| Method | Route | Description |
|---|---|---|
| POST | `/auth/register` | Register as seeker or recruiter |
| POST | `/auth/login` | Log in → `{ token, user }` |
| GET | `/auth/me` 🔒 | Current user |
| GET | `/ai/health` | Ollama status (`?force=1` skips the cache) |
| POST | `/resumes` 🔒[seeker] | Upload (`multipart/form-data`, field `resume`) + analyse |
| GET | `/resumes` · `/resumes/:id` 🔒[seeker] | List / get own resumes |
| POST | `/resumes/:id/reanalyze` 🔒[seeker] | Run the analysis again (e.g. after starting Ollama) |
| PATCH | `/resumes/:id/primary` 🔒[seeker] | Use this resume for matching |
| DELETE | `/resumes/:id` 🔒[seeker] | Delete a resume not attached to applications |
| GET | `/jobs` 🔒 | Open jobs (`q`, `location`, `type`, `skills`) |
| GET | `/jobs/matches` 🔒[seeker] | Open jobs ranked for the primary resume |
| GET | `/jobs/:id/fit` 🔒[seeker] | AI fit check for one job |
| GET | `/jobs/mine` 🔒[recruiter] | Own jobs + applicant stats |
| GET | `/jobs/:id/candidates` 🔒[recruiter] | Rank all seekers for a job |
| POST · PUT · DELETE | `/jobs`, `/jobs/:id` 🔒[recruiter] | Manage job posts |
| POST | `/applications` 🔒[seeker] | Apply (`jobId`, `coverNote`) → AI match score |
| GET | `/applications/mine` 🔒[seeker] | Own applications |
| DELETE | `/applications/:id` 🔒[seeker] | Withdraw a pending application |
| GET | `/applications/job/:jobId` 🔒[recruiter] | Applicants ranked by score |
| GET | `/applications/:id` 🔒 | Application detail (owner, job recruiter or admin) |
| GET | `/applications/:id/resume-file` 🔒 | Download the original resume |
| PATCH | `/applications/:id/status` 🔒[recruiter] | `applied` / `shortlisted` / `rejected` / `hired` |
| POST | `/applications/:id/rescore` 🔒[recruiter] | Re-run AI scoring |
| GET | `/admin/stats` 🔒[admin] | Dashboard statistics |
| GET · PATCH · DELETE | `/admin/users[/:id]` 🔒[admin] | Manage users (activate, role, delete) |
| GET · PATCH · DELETE | `/admin/jobs[/:id]` 🔒[admin] | Moderate job posts |

## 7. Troubleshooting

- **"Could not connect to MongoDB"**: run `npm run db`, and check that Docker Desktop is running.
- **Badge says "AI fallback"**: Ollama is not reachable. Start it with `ollama serve`, then click *Re-analyse* on a resume.
- **Badge says "Model missing"**: run `ollama pull llama3.2:3b`, or the model named in `OLLAMA_MODEL`.
- **Analysis is slow**: the first request loads the model into memory. Later calls are faster, or you can use a smaller model.
- **"No readable text found"**: the PDF is a scanned image. Upload a text-based PDF or DOCX.

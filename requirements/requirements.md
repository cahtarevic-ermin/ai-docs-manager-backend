
---

# High-level project summary

**Project:** AI Document Manager (MVP)
**Goal:** upload documents (PDFs/images), extract text, generate AI summaries & tags, store metadata, searchable UI, user auth, roles. Serverless-friendly, deployable with Terraform.

**Tech stack (recommended):**

* Frontend: **Next.js** (App Router or Pages) + Tailwind CSS
* Backend: **NestJS** (REST API) + TypeScript
* DB: **PostgreSQL** (RDS or managed provider) — for portfolio, can use Supabase or Dockerized Postgres
* File Storage: **S3** (raw and processed buckets)
* Text extraction: **Tesseract / AWS Textract / PyPDF2** (Lambda or Nest worker)
* AI: **OpenAI** (or other LLM) for summarization & tagging (server-side calls from backend)
* Queue/task: **SQS** or Redis (BullMQ) for background processing (optional)
* Infra: **Terraform** (separate repo)
* CI/CD: GitHub Actions
* Local dev: Docker Compose for backend + db
* Auth: JWT (access + refresh), optional NextAuth for frontend convenience

---

# Project phases & milestones

### Phase 0 — Prep

* Create two repos: `ai-docs-frontend` and `ai-docs-backend`, plus `ai-docs-infra` (Terraform).
* Create project skeletons (Next.js + NestJS).
* Add README, CONTRIBUTING, LICENSE.

**Deliverable:** repo skeletons + README.

---

### Phase 1 — MVP backend + storage

* Implement NestJS REST API:

  * `POST /auth/register`, `POST /auth/login` (JWT)
  * `POST /documents` → receives upload metadata or presigned S3 URL
  * `GET /documents/:id`, `GET /documents` (list with search & pagination)
* S3 buckets: `raw-docs`, `processed-docs`
* When new S3 object placed, trigger processing (SQS or Lambda). For dev, Nest worker polls queue or direct webhook.
* Implement DB models: users, documents, processing_tasks, tags, summaries.
* Integrate text extraction (simple): if PDF/image, use Tesseract or PyPDF2 in worker.

**Deliverable:** working upload flow (local) and DB + storage wiring (dev).

---

### Phase 2 — AI integration + processing pipeline

* On extracted text, call OpenAI (or chosen LLM) to:

  * generate summary (short & long)
  * generate tags/keywords
  * optionally generate title
* Store results in DB (summaries, tags).
* Mark task as complete, save processed file (e.g., flattened PDF with watermark / preview image).
* Send notification (SNS / Slack / email) on completion.

**Deliverable:** pipeline producing summaries + tags stored in DB.

---

### Phase 3 — Frontend

* Next.js app with:

  * auth (login/register)
  * upload page (drag & drop or presigned uploads)
  * document list (search, tags, filters)
  * document detail page (preview, summary, full text, download)
  * admin area (view processing logs)
* Nice UI styling (Tailwind), example images/screenshots.

**Deliverable:** functional UI talking to backend locally / staging.

---

### Phase 4 — Infra & Deployment

* Terraform to create:

  * S3 buckets (with lifecycle rules)
  * IAM roles (lambda/Nest/ECS roles)
  * Lambda (if using) + EventBridge/S3 triggers or SQS
  * RDS (Postgres) or managed DB endpoint (or use Supabase for portfolio)
  * SNS topic (notifications)
* GitHub Actions: tests + terraform plan + apply (manual for production)
* Add secrets in GitHub Actions/Secrets Manager

**Deliverable:** reproducible infra in `ai-docs-infra` repo.

---

### Phase 5 — Polish, tests, docs

* Add unit tests (Nest + some frontend tests)
* Add E2E test script (Playwright or simple cURL flows)
* Complete README with architecture diagram, deploy steps, sample env vars
* Add screenshots, demo GIFs, and the sample asset path note (use `/mnt/data/...` locally)

**Deliverable:** portfolio-ready project with README and demo.

---

# Minimum Viable Feature List (MVP)

1. User auth (register/login)
2. Upload document (presigned S3 or direct)
3. Background worker extracts text
4. LLM summary & tags generation
5. Document list with search & tag filters
6. Document detail with summary & download
7. Terraform infra skeleton

---

# Data model (Postgres) — simplified schema

```sql
users
- id (uuid) PK
- email
- password_hash
- name
- role (user|admin)
- created_at

documents
- id (uuid) PK
- user_id FK -> users.id
- s3_key_raw
- s3_key_processed (nullable)
- filename
- file_type
- file_size
- status (uploaded|processing|done|error)
- created_at
- updated_at

processing_tasks
- id (uuid)
- document_id FK
- task_type (extract_text, summarize, watermark)
- status
- started_at
- finished_at
- error (text)

summaries
- id
- document_id FK
- summary_short (text)
- summary_long (text)
- created_at

tags
- id
- document_id FK
- tag (text)
- score (float)
```

Indexes:

* `documents(created_at)`, `documents(user_id)`, `tags(tag)`, text index on summaries for search (pg_trgm or simple ilike).

---

# API design (REST examples)

**Auth**

* `POST /auth/register` {email,password,name} -> tokens
* `POST /auth/login` {email,password} -> tokens

**Documents**

* `POST /documents/presign` {filename, contentType} -> {uploadUrl, key, expires}
* `POST /documents` {key, filename, userId} -> create document record
* `GET /documents?search=&tag=&page=` -> paginated list
* `GET /documents/:id` -> document + summary + tags
* `DELETE /documents/:id`

**Webhooks**

* `POST /webhook/s3-event` -> (if using S3 notifications to API)

  * Accept S3 event and enqueue processing

**Admin**

* `GET /tasks` -> monitoring

---

# Processing flow (detailed)

1. User requests presigned upload -> uploads file to `raw-docs` S3 bucket.
2. S3 Event (ObjectCreated) triggers Lambda or sends to SQS.
3. Worker (Lambda or NestJS worker) downloads file:

   * If PDF: extract text via PyPDF2 or pdfminer
   * If image: run Tesseract OCR or use AWS Textract if available
4. Clean text (strip, normalize)
5. Call OpenAI API: prompt -> generate summary & tags
6. Store summary & tags in Postgres
7. Optionally: generate processed file (e.g., flattened PDF with watermark or preview JPEG), upload to `processed-docs`
8. Send notification via SNS / Slack webhook
9. Update document status to `done`

---

# Infra outline for Terraform (files)

* `providers.tf` – provider config
* `s3.tf` – buckets + policies
* `iam.tf` – roles & policies for lambda & app
* `lambda.tf` – lambda function (if using)
* `rds.tf` or `supabase.tf` – DB (or instruct to use Docker for local dev)
* `sns.tf` – topic + subscriptions
* `sqs.tf` – queue (if used)
* `outputs.tf` – outputs (buckets ARNs, endpoints)

Security:

* Limited IAM permissions for Lambda (only S3 read/write on buckets, SNS publish)
* Secrets stored in SSM Parameter Store or Secrets Manager (DB credentials, OPENAI_KEY)

---

# Dev workflow & local testing

* Use Docker Compose for NestJS + Postgres for local dev.
* For S3 emulation use `localstack` (optional) or upload to a personal test bucket.
* For Lambda local invocation, use SAM CLI or `serverless` offline plugin.
* For LLM integration, use mock responses during local dev to avoid costs or expose a dev key.

---

# UX / UI thumbnails & screenshots

Include:

* upload screen (drag & drop)
* document list with tags & summary snippets
* document detail with full summary & download button
* processing progress indicator

Use the sample image path you supplied as demo watermark/preview in README or screenshots:
`/mnt/data/6267aba6-f4a2-4094-891f-c2da0421df12.png`

---

# CI / CD

* GitHub Actions:

  * `lint & test` on PRs
  * `build & terraform plan` on push to main (or protected)
  * manual `terraform apply` step (or gated with approvals)
* Optionally deploy backend to ECS Fargate or AWS Lambda (via container image) and frontend to Vercel.

---

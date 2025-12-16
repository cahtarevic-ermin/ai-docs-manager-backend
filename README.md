# Atlas - AI Document Manager backend service

A NestJS-based backend API for intelligent document management with AI-powered text extraction, summarization, and tagging.

## Overview

This backend service provides a REST API for uploading documents (PDFs/images), extracting text, generating AI summaries and tags, and managing document metadata with full user authentication and role-based access control.

## Features

### Core Features
- **Document Management**
  - Upload documents via presigned S3 URLs
  - Support for PDFs and images
  - Background processing pipeline
  - Document search and filtering
  - Tag-based organization

- **AI-Powered Processing**
  - Automatic text extraction (Tesseract OCR / AWS Textract / PyPDF2)
  - AI-generated summaries (short & long) via OpenAI
  - Automatic tag/keyword generation
  - Smart document categorization

- **Authentication & Authorization**
  - JWT-based authentication (access + refresh tokens)
  - User registration and login
  - Role-based access control (USER, ADMIN)
  - Password hashing with Argon2
  - Protected routes with guards

- **Storage & Processing**
  - AWS S3 integration (raw and processed buckets)
  - Background job processing (SQS/BullMQ)
  - Processing task tracking
  - Status notifications

- **Database**
  - PostgreSQL with Prisma ORM
  - Optimized indexes for search performance
  - Full-text search capabilities

## Tech Stack

- **Framework:** NestJS 11
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** Passport.js + JWT
- **File Storage:** AWS S3
- **Queue/Tasks:** SQS or Redis (BullMQ)
- **AI/LLM:** OpenAI API
- **Text Extraction:** Tesseract / AWS Textract / PyPDF2
- **Validation:** class-validator, class-transformer, Zod

## Database Schema

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

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user `{email, password, name}`
- `POST /auth/login` - Login with credentials `{email, password}`
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

### Documents
- `POST /documents/presign` - Get presigned S3 upload URL `{filename, contentType}`
- `POST /documents` - Create document record `{key, filename, userId}`
- `GET /documents` - List documents with search, tags & pagination `?search=&tag=&page=`
- `GET /documents/:id` - Get document details with summary and tags
- `DELETE /documents/:id` - Delete document (admin or owner)

### Admin
- `GET /tasks` - View processing tasks and monitoring

### Webhooks
- `POST /webhook/s3-event` - Handle S3 event notifications for processing

## Processing Pipeline

1. **Upload**: User requests presigned URL and uploads file to `raw-docs` S3 bucket
2. **Trigger**: S3 Event (ObjectCreated) triggers Lambda or sends to SQS
3. **Extract Text**: 
   - PDFs: PyPDF2 or pdfminer
   - Images: Tesseract OCR or AWS Textract
4. **Clean**: Normalize and clean extracted text
5. **AI Processing**: Call OpenAI API to generate:
   - Summary (short & long versions)
   - Tags/keywords
   - Optional title generation
6. **Store**: Save results to PostgreSQL (summaries, tags)
7. **Process File**: Generate processed file (flattened PDF with watermark or preview image)
8. **Upload**: Store processed file in `processed-docs` bucket
9. **Notify**: Send completion notification (SNS/Slack/email)
10. **Complete**: Update document status to `done`

## Project Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- AWS account (S3, SQS/SNS optional for production)
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_docs_manager"

# JWT
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# AWS S3
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_RAW="raw-docs"
S3_BUCKET_PROCESSED="processed-docs"

# OpenAI
OPENAI_API_KEY="your-openai-key"

# Queue (optional)
REDIS_HOST="localhost"
REDIS_PORT=6379
# OR
SQS_QUEUE_URL="your-sqs-queue-url"

# App
PORT=3000
NODE_ENV="development"
```

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Project Structure

```
src/
├── auth/                  # Authentication module
│   ├── decorators/        # Custom decorators (@CurrentUser, @Public, @Roles)
│   ├── dto/               # Data transfer objects
│   ├── guards/            # Route guards (JWT, Roles)
│   └── strategies/        # Passport strategies
├── documents/             # Document management module
│   ├── dto/               # Document DTOs
│   ├── entities/          # Document entities
│   └── documents.service.ts
├── processing/            # Background processing module
│   ├── workers/           # Processing workers
│   ├── extractors/        # Text extraction services
│   └── ai/                # AI integration (OpenAI)
├── storage/               # S3 storage module
│   └── storage.service.ts
├── webhooks/              # Webhook handlers
│   └── s3-events.controller.ts
├── config/                # Configuration management
├── database/              # Prisma service and module
└── main.ts                # Application entry point
```

## Local Development with Docker

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Run migrations
npx prisma migrate dev

# Start the application
npm run start:dev
```

## Deployment

This application is designed to be deployed using Terraform (see separate `ai-docs-infra` repository).

### AWS Resources Required
- S3 buckets (raw and processed)
- RDS PostgreSQL instance
- SQS queue (for job processing)
- SNS topic (for notifications)
- Lambda function (optional for processing) or ECS Fargate
- IAM roles and policies

### CI/CD
GitHub Actions workflow included for:
- Linting and testing on PRs
- Building and deploying to staging/production
- Running database migrations

## Architecture Diagram

```
User → API (NestJS) → PostgreSQL
         ↓
    S3 (raw-docs)
         ↓
    SQS/Lambda/Worker
         ↓
   Text Extraction → OpenAI API
         ↓
    PostgreSQL (summaries/tags)
         ↓
   S3 (processed-docs)
         ↓
    SNS Notification
```

## Security

- JWT tokens with short expiration and refresh token rotation
- Password hashing with Argon2
- Role-based access control
- AWS IAM policies with least privilege
- Secrets stored in AWS Secrets Manager or SSM Parameter Store
- API rate limiting (recommended for production)
- Input validation on all endpoints

## Performance Considerations

- Database indexes on frequently queried fields
- Full-text search using PostgreSQL pg_trgm
- Background processing for heavy operations
- Presigned URLs for direct S3 uploads (reduces server load)
- Caching layer for frequently accessed documents (optional)

## Future Enhancements

- Document versioning
- Collaborative document sharing
- Advanced search with filters and facets
- Document comparison and diff
- Multi-language support for text extraction
- Batch document upload
- Custom AI prompts per user
- Document templates and workflows

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

UNLICENSED - Private project for portfolio demonstration

## Support

For issues, questions, or contributions, please open an issue in the GitHub repository.

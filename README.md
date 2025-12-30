# Atlas - AI Document Manager Backend

NestJS backend API for the AI Document Manager. Provides authentication, document management, and acts as a gateway to the Logos RAG engine for AI-powered document processing and chat.

## Tech Stack

- **Framework:** NestJS 11
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** Passport.js + JWT (access + refresh tokens)
- **Password Hashing:** Argon2
- **HTTP Client:** Axios
- **Validation:** class-validator, class-transformer

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Lumen (Next.js Frontend)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Atlas (NestJS Backend)                       │
├─────────────────────────────────────────────────────────────────┤
│  Auth Module     │  Documents Module  │  Chat Module            │
│  - Register      │  - Upload (proxy)  │  - SSE streaming        │
│  - Login         │  - List/Get/Delete │  - RAG queries          │
│  - Refresh       │  - Status sync     │                         │
│  - Logout        │                    │                         │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    PostgreSQL          Logos RAG API         Logos RAG API
    (Users, Docs)       (Processing)          (Chat/SSE)
```

## Features

### Authentication
- JWT-based authentication with access and refresh tokens
- User registration and login
- Role-based access control (USER, ADMIN)
- Secure password hashing with Argon2
- Token refresh rotation
- Global route protection with `@Public()` decorator for exceptions

### Document Management
- Upload documents (proxied to Logos RAG service)
- List user's documents with ownership filtering
- Get document details and processing status
- Sync status from Logos
- Delete documents (cascades to Logos)

### Chat
- Real-time chat with documents via SSE streaming
- Conversation history support
- Proxied to Logos RAG engine

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login with credentials | Public |
| POST | `/auth/refresh` | Refresh access token | Refresh Token |
| POST | `/auth/logout` | Logout and invalidate token | Access Token |

### Documents
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/documents/upload` | Upload document (multipart) | Access Token |
| GET | `/documents` | List user's documents | Access Token |
| GET | `/documents/:id` | Get document details | Access Token |
| GET | `/documents/:id/status` | Get processing status | Access Token |
| POST | `/documents/:id/sync` | Sync status from Logos | Access Token |
| DELETE | `/documents/:id` | Delete document | Access Token |

### Chat
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/chat` | Chat with document (SSE stream) | Access Token |

## Database Schema

```prisma
enum Role {
  USER
  ADMIN
}

enum DocumentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model User {
  id             String         @id @default(uuid())
  email          String         @unique
  password_hash  String
  name           String?
  role           Role           @default(USER)
  created_at     DateTime       @default(now())
  updated_at     DateTime       @updatedAt
  refresh_tokens RefreshToken[]
  documents      Document[]
}

model RefreshToken {
  id         String   @id @default(uuid())
  token      String   @unique
  user_id    String
  user       User     @relation(...)
  created_at DateTime @default(now())
  expires_at DateTime
}

model Document {
  id             String         @id @default(uuid())
  user_id        String
  user           User           @relation(...)
  filename       String
  content_type   String
  logos_id       String?        @unique  // Reference to Logos service
  status         DocumentStatus @default(PENDING)
  summary        String?
  classification String?
  error_message  String?
  created_at     DateTime       @default(now())
  updated_at     DateTime       @updatedAt
}
```

## Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── decorators/          # @CurrentUser, @Public, @Roles
│   ├── dto/                 # Login, Register, Tokens DTOs
│   ├── guards/              # JwtAuthGuard, RolesGuard
│   ├── strategies/          # JWT and Refresh strategies
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── documents/               # Document management
│   ├── dto/                 # Document DTOs
│   ├── documents.controller.ts
│   ├── documents.service.ts
│   └── documents.module.ts
├── chat/                    # Chat with documents
│   ├── dto/                 # Chat DTOs
│   ├── chat.controller.ts
│   ├── chat.service.ts
│   └── chat.module.ts
├── logos/                   # Logos RAG service client
│   ├── logos.service.ts     # HTTP client for Logos API
│   └── logos.module.ts
├── database/                # Prisma setup
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── config/                  # Configuration
│   ├── configuration.ts
│   └── validation.ts
├── app.module.ts
└── main.ts

prisma/
├── schema.prisma            # Database schema
└── migrations/              # Database migrations
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Logos RAG service running

### Installation

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/atlas

# JWT
JWT_ACCESS_TOKEN_SECRET=your-access-secret
JWT_REFRESH_TOKEN_SECRET=your-refresh-secret
JWT_ACCESS_TOKEN_EXPIRATION=30m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Logos RAG Service
LOGOS_BASE_URL=http://localhost:8000

# App
PORT=3000
```

### Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### Running the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

## Docker Development

```bash
# Start PostgreSQL
docker compose -f docker-compose.dev.yml up -d db

# Run migrations
npx prisma migrate dev

# Start the application
npm run start:dev
```

## Makefile Commands

```bash
make dev        # Start dev environment
make build      # Build application
make migrate    # Run database migrations
make clean      # Clean up containers
```

## Authentication Flow

### Registration
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123", "name": "John"}'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Using Protected Endpoints
```bash
curl http://localhost:3000/documents \
  -H "Authorization: Bearer <access_token>"
```

## Document Upload Flow

1. Frontend sends file to `/documents/upload`
2. Atlas validates file type and size
3. Atlas proxies upload to Logos RAG service
4. Logos returns document ID and queues processing
5. Atlas creates local document record with Logos reference
6. Frontend polls `/documents/:id/status` for updates
7. When complete, document is ready for chat

## Chat Flow

1. Frontend sends POST to `/chat` with document_id and message
2. Atlas validates document ownership and status
3. Atlas proxies request to Logos `/chat` endpoint
4. Logos performs RAG: embed query → vector search → LLM
5. Response streams back via SSE through Atlas to frontend

## Security

- JWT tokens with short expiration (30 min access, 7 day refresh)
- Refresh token rotation on each use
- Password hashing with Argon2
- Role-based access control
- Document ownership validation
- Global JWT guard with `@Public()` exceptions

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Related Projects

- **[Logos](../logos)** - Python RAG engine (FastAPI + LangChain + pgvector)
- **[Lumen](../lumen)** - Next.js frontend application

## Scripts Reference

```bash
npm run start:dev    # Development with hot reload
npm run start:debug  # Debug mode
npm run build        # Build for production
npm run start:prod   # Run production build
npm run lint         # ESLint
npm run format       # Prettier
npm run test         # Jest unit tests
npm run test:e2e     # E2E tests
npm run test:cov     # Coverage report
```

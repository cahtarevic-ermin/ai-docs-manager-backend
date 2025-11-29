# NestJS Starter

A production-ready NestJS starter template with authentication, authorization, and database integration.

## Overview

This is a TypeScript-based NestJS starter project that provides a solid foundation for building scalable server-side applications. It comes pre-configured with essential features commonly needed in modern web applications.

## Features

- **Authentication & Authorization**
  - JWT-based authentication (access + refresh tokens)
  - User registration and login
  - Role-based access control (USER, ADMIN)
  - Password hashing with Argon2
  - Protected routes with guards

- **Database**
  - PostgreSQL integration via Prisma ORM
  - User and RefreshToken models
  - Database migrations

- **Configuration**
  - Environment-based configuration
  - Schema validation with Zod
  - Type-safe configuration module

- **Code Quality**
  - TypeScript strict mode
  - ESLint + Prettier
  - Class validation and transformation
  - Jest for testing

## Tech Stack

- **Framework:** NestJS 11
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma
- **Authentication:** Passport.js + JWT
- **Validation:** class-validator, class-transformer, Zod

## Project Setup

```bash
# Install dependencies
$ npm install

# Set up environment variables
# Create a .env file with your configuration

# Run database migrations
$ npx prisma migrate dev

# Generate Prisma client
$ npx prisma generate
```

## Running the Application

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Testing

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Project Structure

```
src/
├── auth/               # Authentication module
│   ├── decorators/     # Custom decorators (@CurrentUser, @Public, @Roles)
│   ├── dto/            # Data transfer objects
│   ├── guards/         # Route guards (JWT, Roles)
│   └── strategies/     # Passport strategies
├── config/             # Configuration management
├── database/           # Prisma service and module
└── main.ts             # Application entry point
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login with credentials
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

## License

UNLICENSED

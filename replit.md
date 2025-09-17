# project.md

## Overview

This is a secure task management system built as a full-stack web application for TurboVets. The system implements role-based access control (RBAC) with three user roles: admin, manager, and employee. Users can create, manage, and track tasks within their organization, with different permission levels based on their role. The application features a modern React frontend with TypeScript, an Express.js backend, and PostgreSQL database with Drizzle ORM for data management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming and dark mode support
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Icons**: Lucide React for consistent iconography

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful API with middleware-based authentication and authorization
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: OIDC integration with session-based auth using Passport.js
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Role-Based Access Control**: Middleware functions for role and organization-based permissions

### Database Schema Design
- **Users**: Stores user profiles with role (admin/manager/employee) and organization association
- **Organizations**: Multi-tenant architecture supporting multiple organizations
- **Tasks**: Core entity with status (todo/in_progress/done), priority levels, assignments, and due dates
- **Task Comments**: Threaded comments system for task collaboration
- **Sessions**: Secure session storage in PostgreSQL

### Security Implementation
- **Authentication**: OIDC-based authentication with secure session management
- **Authorization**: Role-based middleware ensuring users can only access appropriate resources
- **Multi-tenancy**: Organization-scoped data access preventing cross-organization data leaks
- **Input Validation**: Zod schemas for runtime type checking and validation
- **CORS**: Configured for secure cross-origin requests

### API Structure
- **Auth Routes**: `/api/auth/*` for login, logout, and user profile
- **Task Routes**: `/api/tasks/*` for CRUD operations with filtering and search
- **User Routes**: `/api/users/*` for user management (admin only)
- **Organization Routes**: Organization-scoped operations with automatic filtering

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL via Neon serverless with connection pooling
- **Authentication Provider**: OIDC for user authentication
- **UI Framework**: Radix UI primitives for accessible component foundation
- **Validation**: Zod for schema validation across frontend and backend
- **Date Handling**: date-fns for date manipulation and formatting

### Development Tools
- **Build System**: Vite for fast development and optimized production builds
- **TypeScript**: Full type safety across the entire stack
- **Database Migrations**: Drizzle Kit for schema management and migrations
- **Code Quality**: ESBuild for production bundling

### Deployment Configuration
- **Environment Variables**: DATABASE_URL, SESSION_SECRET, REPL_ID, ISSUER_URL, REPLIT_DOMAINS
- **Production Build**: Separate client and server builds with static asset serving
- **Development**: Hot reload with Vite dev server and TypeScript compilation
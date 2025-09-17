# Task Management System

## Overview

This is a secure task management system built as a full-stack web application for TurboVets. The system implements role-based access control (RBAC) with three user roles: admin, manager, and employee. It provides comprehensive task management capabilities including creation, assignment, tracking, commenting, and real-time collaboration features within a multi-tenant architecture.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool for fast development and optimized production builds
- **UI Components**: Shadcn/ui component library built on Radix UI primitives, providing accessible and customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and comprehensive dark mode support
- **State Management**: TanStack Query (React Query) for server state management, caching, and synchronization
- **Routing**: Wouter for lightweight client-side routing with minimal bundle impact
- **Forms**: React Hook Form with Zod validation for type-safe form handling and runtime validation
- **Icons**: Lucide React for consistent iconography throughout the application
- **Drag & Drop**: DnD Kit for intuitive task reordering and Kanban board functionality

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js for robust server-side development
- **API Design**: RESTful API with middleware-based authentication and authorization layers
- **Database ORM**: Drizzle ORM for type-safe database operations and schema management
- **Authentication**: OIDC integration with session-based authentication using Passport.js
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple for scalable session management
- **Real-time Communication**: WebSocket integration for live notifications and updates
- **Role-Based Access Control**: Middleware functions enforcing role and organization-based permissions

### Database Schema Design
- **Multi-tenant Architecture**: Organization-scoped data access preventing cross-tenant data leaks
- **Users Table**: Stores user profiles with roles (admin/manager/employee) and organization associations
- **Organizations Table**: Supports multiple organizations with isolated data boundaries
- **Tasks Table**: Core entity with status tracking (todo/in_progress/done), priority levels, assignments, due dates, and positioning for ordering
- **Task Comments Table**: Threaded comments system enabling task collaboration and communication
- **Notifications Table**: Real-time notification system for task assignments and updates
- **Sessions Table**: Secure session storage in PostgreSQL with automatic expiration

### Security Implementation
- **Authentication**: OIDC-based authentication with secure session management and token handling
- **Authorization**: Comprehensive role-based middleware ensuring users can only access appropriate resources
- **Multi-tenancy**: Organization-scoped data access with strict isolation between tenants
- **Input Validation**: Zod schemas providing runtime type checking and validation across the application
- **CORS Configuration**: Secure cross-origin requests with appropriate headers and policies
- **Session Security**: HTTP-only cookies with secure flags and proper expiration handling

### API Structure
- **Authentication Routes** (`/api/auth/*`): Login, logout, and user profile management
- **Task Routes** (`/api/tasks/*`): Full CRUD operations with filtering, search, and reordering capabilities
- **User Routes** (`/api/users/*`): User management, role assignments, and organization membership
- **Organization Routes** (`/api/organizations/*`): Organization creation and management
- **WebSocket Endpoint** (`/api/ws`): Real-time communication for notifications and live updates

## External Dependencies

### Database
- **PostgreSQL**: Primary database using Neon serverless PostgreSQL for scalable data storage
- **Drizzle ORM**: Type-safe database operations with schema migrations and query building

### Authentication & Session Management
- **OIDC Provider**: External OpenID Connect provider for secure authentication
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **Passport.js**: Authentication middleware supporting multiple strategies

### UI & Styling
- **Radix UI**: Headless UI primitives for accessible component foundations
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Feather-inspired icon library for consistent iconography

### Development & Build Tools
- **Vite**: Fast build tool with hot module replacement and optimized bundling
- **TypeScript**: Type safety across frontend and backend codebases
- **Zod**: Runtime type validation and schema definition
- **React Hook Form**: Performant form library with validation integration

### Real-time & State Management
- **TanStack Query**: Server state management with caching and synchronization
- **WebSocket (ws)**: Real-time bidirectional communication for live features
- **DnD Kit**: Drag and drop functionality for interactive task management
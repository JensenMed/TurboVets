# Task Management System

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
- **User Routes**: `/api/users/*` for user management and role assignments
- **Organization Routes**: `/api/organizations/*` for organization creation and management

### Development Features
- **Hot Reload**: Vite dev server with TypeScript compilation
- **Dark Mode**: Complete theming system with light/dark mode toggle
- **Responsive Design**: Mobile-first design with sidebar navigation
- **Drag & Drop**: Kanban-style task management with drag-and-drop reordering
- **Real-time Updates**: WebSocket integration for live notifications
- **Authentication Provider**: OIDC for user authentication
- **Database Migrations**: Drizzle Kit for schema management and migrations
- **Code Quality**: ESBuild for production bundling

### Deployment Configuration
- **Environment Variables**: DATABASE_URL, SESSION_SECRET, CLIENT_ID, ISSUER_URL, ALLOWED_DOMAINS
- **Production Build**: Separate client and server builds with static asset serving
- **Development**: Hot reload with Vite dev server and TypeScript compilation

### Key Features Implemented
- **User Authentication**: OIDC-based login/logout with session management
- **Organization Management**: Multi-tenant architecture with organization creation
- **Task Management**: Full CRUD operations with status tracking and assignments
- **Role-Based Permissions**: Admin, Manager, and Employee roles with appropriate access controls
- **Kanban Interface**: Drag-and-drop task reordering between columns
- **Dark Mode Toggle**: User preference persistence with smooth transitions
- **Real-time Notifications**: WebSocket-based notification system
- **Responsive UI**: Mobile-friendly design with collapsible sidebar

### Recent Updates (September 2025)
- Completed drag-and-drop task reordering with full Kanban board implementation
- Added dark mode toggle with theme provider and localStorage persistence
- Built complete real-time notification system with WebSocket integration
- Resolved server architecture conflicts and optimized performance
- Implemented organization onboarding flow for new users
- Fixed task creation issues and improved assignee handling
- Added comprehensive logout functionality with proper session cleanup

The application is production-ready with comprehensive security measures, scalable architecture, and a modern user experience optimized for task management workflows.

## Running from Terminal

### Prerequisites
- Node.js 20 or higher
- PostgreSQL 16
- npm or yarn package manager

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-name>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory with the following variables:
   ```bash
   DATABASE_URL=postgresql://username:password@localhost:5432/your_database
   SESSION_SECRET=your-secret-key-here
   CLIENT_ID=your-oidc-client-id
   ISSUER_URL=your-oidc-issuer-url
   ALLOWED_DOMAINS=yourdomain.com
   PORT=5000
   ```

4. **Set up the database:**
   ```bash
   npm run db:push
   ```

5. **Run the application:**

   **Development mode (with hot reload):**
   ```bash
   npm run dev
   ```

   **Production build:**
   ```bash
   npm run build
   npm run start
   ```

6. **Access the application:**
   Open your browser and navigate to `http://localhost:5000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking
- `npm run db:push` - Push database schema changes

### Development Notes

- The application runs on port 5000 by default
- Frontend is built with Vite and served by the Express server
- WebSocket connections are available for real-time features
- Database migrations are handled automatically via Drizzle ORM
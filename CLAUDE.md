# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm start` or `npm run start` - Start development server with proxy configuration (proxy.conf.json)
- `npm run build` - Build for production
- `npm run watch` - Build in watch mode for development
- `npm test` - Run unit tests with Karma/Jasmine
- `npm run lint` - Run Angular linting
- `npm run e2e` - Run end-to-end tests with Playwright

### Development Server Notes
- Development server runs on `http://localhost:4200`
- Backend API proxy configured to `http://localhost:5171` for `/admin/*`, `/auth/*`, and `/api/*` endpoints
- Use `npm run start:proxy` for explicit proxy configuration in development mode

## Project Architecture

### Technology Stack
- **Angular 20** with standalone components and OnPush change detection strategy
- **Angular Material 20** for UI components
- **SCSS** for styling with design system variables
- **RxJS** for reactive programming
- **Chart.js**, **ng2-charts**, and **@swimlane/ngx-charts** for data visualization
- **Playwright** for E2E testing, **Karma/Jasmine** for unit testing

### Application Structure
This is a POS (Point of Sale) system called "Toko Eniwan POS" with the following main modules:

#### Core Modules
- **Authentication**: Login/register with cookie-based auth, role-based guards
- **Dashboard**: Main dashboard with analytics and home views
- **POS (Point of Sale)**: Transaction processing, receipt generation, barcode scanning
- **Inventory**: Product management, stock mutations, low stock alerts
- **Reports**: Analytics dashboard with charts and data visualization
- **Membership**: Customer membership management with points system
- **Category Management**: Product category organization
- **User Management**: Admin user controls with role-based permissions
- **Activity Logs**: System activity tracking and monitoring
- **Notifications**: Real-time notification system

#### Architecture Patterns
- **Standalone Components**: All components use Angular 20 standalone architecture
- **Feature Modules**: Each business domain has its own lazy-loaded module
- **State Management**: Uses Angular Signals for reactive state management
- **HTTP Interceptors**: Centralized API request/response handling with `appHttpInterceptor`
- **Guards**: `authGuard` for authentication, `roleGuard` for authorization
- **Services**: Domain-specific services for each module (pos.service.ts, product.service.ts, etc.)

### Routing Structure
- `/login` - Authentication page
- `/dashboard` - Main application (requires auth)
  - `/dashboard/analytics` - Dashboard analytics (Admin/Manager/User)
  - `/dashboard/users` - User management (Admin/Manager)
  - `/dashboard/categories` - Category management (Admin/Manager)
  - `/dashboard/membership` - Membership management (All roles)
  - `/dashboard/inventory` - Inventory management (All roles)
  - `/dashboard/reports` - Reports & analytics (Admin/Manager)
  - `/dashboard/logs` - Activity logs (Admin/Manager)
  - `/dashboard/pos` - Point of sale (All roles + Cashier)
  - `/dashboard/notifications` - Notifications (All roles)
  - `/dashboard/profile` - User profile (All roles)

### Role-Based Permissions
The application supports four user roles with different access levels:
- **Admin**: Full system access
- **Manager**: Management functions excluding user administration
- **User**: Standard user operations
- **Cashier**: POS-focused operations

### Key Services
- **AuthService**: Cookie-based authentication, user management
- **NotificationService**: Real-time notifications and alerts
- **LayoutService**: Navigation and UI layout management
- **StateService**: Application state management
- **ProductService**: Product and inventory operations
- **POSService**: Point of sale transactions
- **ReportsService**: Analytics and reporting data

### Styling and UI
- Uses **Angular Material** design system
- **SCSS** with design system variables in `src/styles/`
- **Mobile-first** responsive design approach
- **CSS variables** for theming (avoid SCSS mixins per project guidelines)
- **Material Design Icons** for consistent iconography

### Testing Strategy
- **Unit Tests**: Karma + Jasmine (currently configured to skip tests by default in angular.json)
- **E2E Tests**: Playwright with multi-browser support (Chromium, Firefox, WebKit)
- Test files located in `e2e/` directory

### Development Guidelines
Based on the Copilot instructions, when working on this project:

1. **Always use Angular 20 standalone components** with OnPush change detection
2. **Use Signals for state management** instead of traditional observables where appropriate
3. **Follow mobile-first design** patterns
4. **Implement proper role-based access control** using guards and service permissions
5. **Use reactive forms** with proper validation
6. **Implement proper error handling** in HTTP interceptors
7. **Follow the established module structure** for new features
8. **Use CSS variables** from the design system rather than SCSS mixins

### Backend Integration
- API endpoints proxied to `http://localhost:5171`
- Cookie-based authentication (no JWT tokens)
- HTTP interceptor handles auth headers and error responses
- API responses follow `ApiResponse<T>` pattern

### PWA Features
The application appears to be configured for Progressive Web App capabilities with service worker support and notification systems.
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev          # Start Vite dev server (http://localhost:5173)

# Build & Production
npm run build        # Build for production
npm run serve        # Preview production build

# Code Quality
npm run type-check   # Run TypeScript type checking
npm run lint         # Run ESLint with auto-fix
npm run format       # Format code with Prettier

# Testing
npm run test:e2e           # Run Playwright E2E tests
npm run test:e2e:ui        # Run Playwright tests with UI
npm run test:e2e:headed    # Run Playwright tests in headed mode
```

## Architecture Overview

### Tech Stack
- **Frontend**: React Admin v5.8.0 + React 19
- **UI**: Material-UI v7
- **Language**: TypeScript
- **Build**: Vite
- **Testing**: Playwright (E2E)
- **API**: REST API with JWT authentication

### Key Architectural Patterns

1. **Authentication Flow**
   - JWT-based with access + refresh tokens
   - Auto-refresh 5 minutes before expiry
   - Dev credentials: `testdev` / `testpass123`
   - Token storage in localStorage
   - Automatic logout on 401/403

2. **Data Provider Pattern**
   - Custom provider extends `ra-data-simple-rest`
   - Authenticated requests with JWT tokens
   - Specialized methods for care plan operations
   - Base URL: `VITE_SIMPLE_REST_URL` env var

3. **Resource Organization**
   - Each resource has its own directory under `src/`
   - Standard React Admin CRUD components
   - Custom forms for complex operations (e.g., CarePlanDetailEditDialog)

### Core Data Models & Relationships

```
Patient
  └── CarePlan (many)
        ├── CarePlanDetail (many)
        │     ├── LongTermCareItemQuantity (many)
        │     └── CareOccurrence (many)
        └── MedicalCareSummaryPerPatient (CNS Plan) (optional)
```

### Important API Endpoints

- Auth: `/api/v1/auth/login`, `/api/v1/auth/refresh`
- Care Plans: Standard REST endpoints + custom methods
- CNS Integration: `getCnsCarePlanDetails`, `getLatestCnsCarePlanForPatient`

### Key Components

- **App.tsx**: Resource definitions and admin configuration
- **authProvider.ts**: JWT authentication logic
- **dataProvider.ts**: API integration with custom methods
- **CarePlanDetailEditDialog**: Complex form for care plan details
- **Time Components**: EnhancedTimeInput, SmartTimeInput for time tracking

### Development Tips

1. **API Configuration**: Set `VITE_SIMPLE_REST_URL` in `.env` (copy from `.env.example`)
2. **Token Management**: authService handles automatic refresh - don't manually manage tokens
3. **Type Safety**: Use existing TypeScript interfaces in component directories
4. **Form Validation**: React Admin's built-in validation + custom validators
5. **Custom API Calls**: Add methods to dataProvider.ts, not direct fetch calls
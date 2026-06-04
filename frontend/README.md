# Frontend (React + TypeScript)

A Google Drive-like encrypted file storage application built with React, TypeScript, and Vite.

## Project Overview

This is the frontend of the ft_transcendence project. It communicates with a Go backend (Fiber API) to manage encrypted file uploads, downloads, sharing, and storage using PostgreSQL + MinIO.

## Quick Start

### 1. Install Dependencies

**For the first time setup**, follow the installation guide in [docs/scripts.md](../docs/scripts.md#npm-install-for-frontend)

```bash
cd frontend
npm install
```

This downloads all required libraries (React, TypeScript, Vite, Zustand, Axios, etc.) into `node_modules/`. **You only do this ONCE per machine.** After that, all npm scripts work:

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Create production build
npm run lint     # Check code quality
```

### 2. Why `npm install`?

`npm install` reads `package.json` and downloads all the libraries your project needs. Without it, your React app cannot run. The exact versions are locked in `package-lock.json` so everyone on the team has identical dependencies.

---

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI building blocks
│   ├── pages/               # Full page views (routes)
│   ├── store/               # Global state management (Zustand)
│   ├── services/            # API calls & business logic
│   ├── utils/               # Helper functions
│   ├── types/               # TypeScript interfaces
│   ├── App.tsx              # Main app component
│   └── main.tsx             # React entry point
├── public/                  # Static assets (images, icons, etc)
├── Dockerfile               # Docker build instructions
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
└── README.md
```

### Understanding Each Folder

#### **src/components/** - Reusable UI Pieces
Small, focused building blocks used multiple times across the app.

**Examples:**
- `FileList.tsx` - Display files in a list
- `FileUpload.tsx` - Handle file uploads
- `Navigation.tsx` - Top navigation bar
- `ShareModal.tsx` - Share files modal
- `SearchBar.tsx` - Search functionality

**Key point:** Components are reusable and nested inside pages.

#### **src/pages/** - Full Page Views
Each page represents a complete route/screen combining multiple components.

**Examples:**
- `Dashboard.tsx` - Main file explorer (route: `/dashboard`)
- `Login.tsx` - Login page (route: `/login`)
- `Signup.tsx` - Registration page (route: `/signup`)
- `Settings.tsx` - User settings (route: `/settings`)
- `SharedWithMe.tsx` - View shared files (route: `/shared`)

#### **src/store/** - Global State Management (Zustand)
Shared data accessible from ANY component without prop drilling.

**Examples:**
- `authStore.ts` - User authentication, login status, tokens
- `fileStore.ts` - Current folder, file list, selected files
- `uiStore.ts` - Dark mode, sidebar collapse, modals visibility

**Why it's useful:** Instead of passing data through 10 nested components, just access the store directly.

#### **src/services/** - Business Logic & API Calls
Handles communication with the Go backend and complex operations.

**Examples:**
- `api.ts` - Axios instance with backend endpoints (`/api/files`, `/api/auth`, etc)
- `fileService.ts` - Upload, download, delete operations
- `encryptionService.ts` - Encrypt/decrypt files client-side using crypto-js

**Key point:** Services are called from components via store actions.

#### **src/utils/** - Helper Functions
Pure utility functions reused across services and components.

**Examples:**
- `crypto.ts` - Encryption helper functions
- `validators.ts` - File validation (size, type, name)
- `helpers.ts` - General utilities (format dates, file sizes, etc)

#### **src/types/** - TypeScript Interfaces
Type definitions for type safety across the app.

**Examples:**
- `file.ts` - File, Folder interfaces
- `user.ts` - User, Auth interfaces
- `api.ts` - API request/response types

---

## Key Technologies Explained

### **TypeScript (.ts vs .tsx)**
- **`.ts`** - Pure TypeScript (logic, services, utilities)
- **`.tsx`** - TypeScript + JSX (React components with HTML syntax)

```typescript
// utils/helpers.ts
export const formatFileSize = (bytes: number) => {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

// components/Button.tsx
export const Button = () => {
  return <button>Click me</button>
}
```

### **Zustand** - State Management
Global state library. Instead of passing props through many components:

```typescript
// store/authStore.ts
import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  isLoggedIn: false,
  login: (userData) => set({ user: userData, isLoggedIn: true }),
  logout: () => set({ user: null, isLoggedIn: false })
}))

// Use it anywhere in your app:
const user = useAuthStore((state) => state.user)
```

### **Vite** - Build Tool
Fast bundler for development and production:
- Hot reload in development (changes instantly)
- Compiles your code for production
- Optimizes imports and assets

### **Axios** - HTTP Client
Makes API calls to your Go backend:
```typescript
const response = await api.get('/api/files')
const data = response.data
```

### **Web crypto API** - Encryption
Client-side encryption/decryption for sensitive files.

---

## How Frontend Works with Docker

### Development Flow

```
Your React code (src/)
    ↓
npm install        (installs dependencies)
    ↓
npm run build      (Vite compiles to /dist)
    ↓
Docker Dockerfile  (copies /dist to Caddy)
    ↓
Caddy web server   (serves files to browser)
    ↓
Browser            (downloads and runs your app)
```

### Docker Build Process

When you run `make dev`:

1. **Build Stage** - Docker reads `Dockerfile`
   - Runs `npm install` (installs all packages)
   - Runs `npm run build` (compiles TypeScript/React to JavaScript)
   - Creates `/dist` folder with production-ready code

2. **Runtime Stage** - Docker serves built files
   - Caddy web server copies compiled files from `/dist`
   - Serves them at `https://localhost` (configured in `Caddyfile.dev`)
   - Your browser downloads and runs the app

### Why This Works

- **package.json** - Lists all dependencies
- **tsconfig.json** - Tells TypeScript how to compile
- **vite.config.ts** - Tells Vite how to bundle
- **Dockerfile** - Orchestrates the build process in Docker

---

## Configuration Files Explained

### **package.json**
```json
{
  "scripts": {
    "dev": "vite",           // Start dev server
    "build": "vite build",   // Create production build
    "lint": "eslint src"     // Check code quality
  },
  "dependencies": {
    "react": "^18.2.0",      // UI library
    "zustand": "^4.4.0",     // State management
    "axios": "^1.6.0"        // HTTP client
  }
}
```

### **tsconfig.json**
Tells TypeScript compiler how to compile your code:
- `strict: true` - Enable strict type checking
- `jsx: react-jsx` - Use React 18+ JSX syntax
- `target: ES2020` - JavaScript version to compile to

### **vite.config.ts**
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080'  // Proxy API calls to Go backend
    }
  }
})
```

---

## Summary

| What             | Why                                  | How                                              |
|------------------|--------------------------------------|--------------------------------------------------|
| **npm install**  | Install all required libraries       | Read `package.json`, download to `node_modules/` |
| **package.json** | Define project dependencies          | List React, Zustand, Axios, etc.                 |
| **Zustand**      | Share data across components         | Global state store                               |
| **Vite**         | Bundle code for production           | Compile and optimize                             |

---

## Next Steps

1. Read [docs/scripts.md](../docs/scripts.md#npm-install-for-frontend) to install dependencies
2. Run `npm run dev` to start the development server
3. Start building components in `src/components/`
4. Create pages in `src/pages/`
5. Use Zustand stores in `src/store/` for global state
6. Call backend APIs via `src/services/api.ts`

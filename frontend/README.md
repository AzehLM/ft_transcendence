# Frontend (React + TypeScript)
 exemple structure : 

 frontend/
├── src/
│   ├── components/
│   │   ├── Navigation.tsx
│   │   ├── Sidebar.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   ├── store/
│   │   ├── authStore.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── encryptionService.ts
│   ├── utils/
│   │   ├── crypto.ts
│   │   └── helpers.ts
│   ├── types/
│   │   ├── file.ts
│   │   ├── user.ts
│   │   └── api.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md

components/ - Reusable UI pieces

- Small, focused building blocks
- Used in multiple places across the app
- Examples: Button.tsx, FileList.tsx, SearchBar.tsx, Modal.tsx
- Can be nested inside other components

pages/ - Full page views

- Represent complete routes/screens
- Usually combine multiple components together
- Examples: Dashboard.tsx, Login.tsx, Settings.tsx
- Each page = one route in your router (e.g., /dashboard, /settings)


store/ - Shared data management (Zustand)

- Global state accessible from any component
- Examples: user authentication, dark mode toggle, current folder
- Avoids prop drilling

services/ - Business logic & API calls

- Communicates with Go backend
- Handles encryption/decryption
- Examples: fileService.upload(), api.getFiles()
- Called from components via store actions

utils/ - Helper functions

- Pure utility functions
- Crypto operations, validators, formatters
- Reused across services and components

public/ - Static assets

- Files that don't need processing (images, icons, fonts, etc.)
- Served as-is by the web server
- Examples: favicon.ico, logo.png, index.html
- You reference them in your code like /logo.png


package.json - Project dependencies & scripts

Lists all npm packages your project needs (React, TypeScript, Zustand, etc.)
Defines scripts to run: npm run dev, npm run build, npm run lint
Contains project metadata (name, version, description)

tsconfig.json - TypeScript configuration

Tells TypeScript how to compile your .ts and .tsx files
Sets rules like strict mode, target version, module resolution
Ensures type checking is consistent across the project

vite.config.ts - Build tool configuration

Vite is a fast build tool for React projects
Configures how your code gets bundled for production
Sets up dev server settings, build output, plugins


ts vs tsx
- ts = TypeScript file (logic, utilities, services)
- tsx = TypeScript + JSX (React components with HTML-like syntax)

Zustand
- State management library for React. Instead of prop drilling (passing data through many components), Zustand creates global stores.

Vite
Fast build tool for React. It:
- Bundles your code for production
- Provides hot reload in development (changes instantly)
- Optimizes imports and assets

Key points:

package.json = "Install these libraries"
tsconfig.json = "Compile TypeScript like this"
vite.config.ts = "Bundle and optimize like this"
axios = for API calls to Go backend
crypto-js = encryption/decryption client-side
Zustand = global state management (login, files, etc)
Vite = bundles and serves your React app with hot reload

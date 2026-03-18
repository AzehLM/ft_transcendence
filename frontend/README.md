# Frontend (React + TypeScript)

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

Example hierarchy:

pages/Dashboard.tsx
├── components/Navigation.tsx
├── components/Sidebar.tsx
├── components/FileList.tsx
│   └── components/FileItem.tsx
└── components/FileUpload.tsx


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



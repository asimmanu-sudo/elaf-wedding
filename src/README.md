# Elaf Wedding Dress Management System

## Setup Instructions (Local PC)

1. **Install Node.js**: Ensure Node.js is installed.
2. **Create Project**: `npm create vite@latest elaf-wedding -- --template react-ts`
3. **Install Dependencies**:
   ```bash
   cd elaf-wedding
   npm install
   npm install lucide-react recharts clsx tailwind-merge
   ```
4. **Setup Files**:
   - Copy `App.tsx`, `types.ts`, `constants.ts` into `src/`.
   - Create `src/services/mockDb.ts`.
   - **Delete** `src/main.tsx` (Important: conflicting entry point).
   - **Delete** `src/index.css`.
5. **Update index.html**:
   - Ensure the script tag points to `/src/App.tsx`:
     `<script type="module" src="/src/App.tsx"></script>`

## Running the App
```bash
npm run dev
```

## Troubleshooting
- **Error: Failed to resolve import "./index.css"**: This means `main.tsx` still exists. Delete `src/main.tsx`.
- **White Screen**: Check console for errors. Ensure `App.tsx` has the `root.render` logic at the bottom.

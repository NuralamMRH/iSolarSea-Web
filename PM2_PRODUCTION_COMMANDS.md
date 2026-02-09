# PM2 Production Commands

## ❌ WRONG Commands (Still use HTTPS)

```bash
# These commands still run in development mode with HTTPS
pm2 start "npx vite --port 5173" --name itrucksea-frontend --env NODE_ENV=production
pm2 start "npx vite --port 5173" --name itrucksea-frontend
```

## ✅ CORRECT Commands (HTTP Only)

### Option 1: Using ecosystem.config.cjs (Recommended)

```bash
# Start both frontend and backend
pm2 start ecosystem.config.cjs

# Or start individually
pm2 start ecosystem.config.cjs --only itrucksea-frontend
pm2 start ecosystem.config.cjs --only itrucksea-backend
```

### Option 2: Direct PM2 commands

```bash
# Frontend (HTTP only)
pm2 start "npx vite preview --port 5173 --mode production" --name itrucksea-frontend --env NODE_ENV=production

# Backend
pm2 start "npx tsx server.ts" --name itrucksea-backend --env NODE_ENV=production
```

### Option 3: Using yarn scripts

```bash
# Frontend and backend together
pm2 start "yarn start:prod" --name itrucksea-fullstack --env NODE_ENV=production

# Or separately
pm2 start "yarn start:prod" --name itrucksea-frontend --env NODE_ENV=production
pm2 start "yarn server:prod" --name itrucksea-backend --env NODE_ENV=production
```

## Key Differences

| Command                                          | Mode        | HTTPS  | URL                      |
| ------------------------------------------------ | ----------- | ------ | ------------------------ |
| `npx vite --port 5173`                           | Development | ✅ Yes | `https://localhost:5173` |
| `npx vite preview --port 5173 --mode production` | Production  | ❌ No  | `http://localhost:5173`  |
| `yarn start:prod`                                | Production  | ❌ No  | `http://localhost:5173`  |

## Quick Fix for Current Issue

If you're currently running the wrong command:

```bash
# Stop the current process
pm2 stop itrucksea-frontend
pm2 delete itrucksea-frontend

# Start with correct command
pm2 start "npx vite preview --port 5173 --mode production" --name itrucksea-frontend --env NODE_ENV=production

# Or use ecosystem config
pm2 start ecosystem.config.cjs
```

## Verification

After starting with the correct command, check:

```bash
pm2 status
pm2 logs itrucksea-frontend
```

You should see the application running on `http://localhost:5173` (not https).

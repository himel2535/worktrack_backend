# WorkTrack API

Express + MongoDB backend for WorkTrack ERP.

## Requirements

- Node.js 20+ (works on Node 24 with `tsx`)
- MongoDB 7+ (local, Docker, or [MongoDB Atlas](https://www.mongodb.com/atlas))

## Quick Start (Docker MongoDB)

```powershell
# 1. Start MongoDB
docker compose up -d

# 2. Copy env file (already included as .env)
copy .env.example .env

# 3. Seed demo data
npm run seed

# 4. Start API
npm run dev
```

API runs at **http://localhost:4000**  
Health check: http://localhost:4000/api/health

## Demo Login Credentials

After seeding (password for all: `password123`):

| Role     | Email                      |
|----------|----------------------------|
| Admin    | admin@worktrack.com        |
| Manager  | manager.dev@worktrack.com  |
| Employee | himel@worktrack.com        |

## Scripts

| Command       | Description                |
|---------------|----------------------------|
| `npm run dev` | Start dev server (tsx)     |
| `npm run seed`| Seed database              |
| `npm run build` | Compile TypeScript       |
| `npm start`   | Run compiled production build |

## MongoDB Atlas

1. Atlas → Database Access → create user (username + password)
2. Atlas → Network Access → Add IP → `0.0.0.0/0` (dev) or your IP
3. Update `.env`:
   ```
   MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@himelcluster.fxzuftr.mongodb.net/worktrack?retryWrites=true&w=majority&appName=HimelCluster
   USE_MEMORY_DB=false
   ```
4. Password-এ `@`, `#`, `%` থাকলে [URL encode](https://www.urlencoder.org/) করুন
5. `npm run seed` then `npm run dev`

## Frontend

Set in `worktrack/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Troubleshooting

**`ts-node` / `fileExists` error on Node 24**  
This project uses `tsx` instead of `ts-node`. Run `npm install` again if scripts fail.

**`ECONNREFUSED 127.0.0.1:27017`**  
MongoDB is not running. Use `docker compose up -d` or set `MONGODB_URI` to Atlas.

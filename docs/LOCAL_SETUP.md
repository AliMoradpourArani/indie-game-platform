# Local Setup

Prerequisites: **Node 20+**, **npm 10+**, **Docker + Compose**, **Git**, **gh** (optional).

## 1. Clone & configure

```bash
git clone https://github.com/AliMoradpourArani/indie-game-platform.git
cd indie-game-platform
cp .env.example .env   # no real secrets; dev values only
docker compose up -d db
docker compose ps      # db should be healthy
```

No Docker? Install PostgreSQL 16 locally and set
`DATABASE_URL=postgresql://indie:indie_dev_password@localhost:5432/indie_game_platform`.

## 2. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run db:seed        # creates dev accounts + sample games
npm run dev            # http://localhost:4000/api/v1/health
npm test               # unit + integration (needs test DB, see below)
```

Test DB (integration): create `indie_game_platform_test` once and set
`DATABASE_URL` to it when running `npm test`, or use the provided script
(`npm run test` handles migrate+truncate automatically from Phase 1 on).

## 3. Frontend

```bash
cd ../frontend
npm install
npm run dev            # http://localhost:5173
```

## 4. Dev accounts (seeded, LOCAL ONLY)

| Role      | Email             | Password     |
|-----------|-------------------|--------------|
| Admin     | admin@local.test  | Admin1234!   |
| Developer | dev@local.test    | Dev1234!     |
| Player    | player@local.test | Player1234!  |

Admin login page: `http://localhost:5173/admin/login` (linked from footer `Admin`).

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| `db` unhealthy / port 5432 taken | `docker compose down; docker compose up -d db`, or change port mapping |
| Prisma `P1001` can't reach DB | Check `DATABASE_URL`, `docker compose logs db` |
| `EADDRINUSE :4000/:5173` | Stop other dev servers or change `PORT`/Vite port |
| Windows path issues | Run PowerShell as-is; do not use WSL paths for `./storage` |

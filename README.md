# TickerBase (Modules 1-3 MVP)

Implemented from `产品规格文档.md`:
- Module 1: Data intake (Ticker + AI JSON + Markdown report, duplicate update/skip)
- Module 2: Table view (sorting, multi-filter, column toggle, soft archive, TradingView export, create watchlist, dynamic JSON columns, multi-theme/multi-category per stock)
- Module 3: Detail panel (right slide panel, markdown report display, report history)
- Module 5: Settings (Themes management, Category management, Table JSON-field configuration)

## 1) Backend setup

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```

Backend runs on `http://localhost:3000`.

## 2) Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## 3) Main API endpoints

- `POST /api/stocks/import`
- `GET /api/stocks?includeArchived=true|false`
- `PATCH /api/stocks/:ticker/archive`
- `PATCH /api/stocks/:ticker/tags`
- `GET /api/stocks/:ticker/reports`
- `GET /api/reports/:id/content`
- `GET /api/watchlists`
- `POST /api/watchlists`
- `GET /api/settings`
- `POST /api/settings/themes`
- `PUT /api/settings/themes/:id`
- `DELETE /api/settings/themes/:id`
- `POST /api/settings/categories`
- `PUT /api/settings/categories/:id`
- `DELETE /api/settings/categories/:id`
- `PUT /api/settings/table-fields`

# Blueprint — Scaffold پنل ادمین (استاندارد Nibmarket)

> **نحوه استفاده:** این فایل را به ایجنت بدهید و بگویید:  
> «طبق `docs/project-scaffold-blueprint.md` ساختار پروژه را از صفر پیاده‌سازی کن.»

این سند بر اساس استانداردهای **nibmarket** نوشته شده: Atomic Design، BFF داخلی، RTL فارسی، semantic spacing، Zustand + React Query، next-intl، و **Prisma داخلی + PostgreSQL**.

---

## پروفایل پروژه (تأیید‌شده)

| موضوع | تصمیم |
|-------|--------|
| **نوع پروژه** | پنل ادمین (Admin Panel) |
| **Auth (فاز ۱)** | ورود با **username + password** — یک صفحه login تمپلیت |
| **Database** | **Prisma داخلی** — بدون backend خارجی؛ handlers مستقیم از PostgreSQL می‌خوانند |
| **Route groups** | `(auth)` + `(admin)` + `(panel)` — فعلاً هر سه نگه داشته شوند |

---

## ۰. قبل از شروع — مقادیر را پر کنید

| متغیر | مقدار پیشنهادی | توضیح |
|-------|----------------|-------|
| `{{PROJECT_NAME}}` | `admin-panel` | نام npm package |
| `{{APP_DISPLAY_NAME}}` | `Admin Panel` | نام نمایشی |
| `{{DB_NAME}}` | `admin_panel` | نام دیتابیس PostgreSQL |
| `{{DB_USER}}` | `admin_user` | کاربر دیتابیس |
| `{{DB_PASSWORD}}` | `admin_dev_pass` | پسورد dev |
| `{{COOKIE_PREFIX}}` | `admin` | پیشوند کوکی‌ها: `admin_token`, `admin_role` |
| `{{LOCALE}}` | `fa` | locale پیش‌فرض |
| `{{PRIMARY_COLOR}}` | `#721bd9` | رنگ primary design system |

---

## ۱. Tech Stack (الزامی)

| ابزار | نسخه/انتخاب | کاربرد |
|-------|-------------|---------|
| Next.js | 16.x App Router | SSR، Route Handlers (BFF) |
| React | 19.x | UI |
| TypeScript | 5.x strict | type safety |
| Tailwind CSS | 4.x | styling با `@theme` |
| TanStack Query | 5.x | server state |
| Zustand | 5.x | client state (auth, ui) |
| next-intl | 4.x | i18n فارسی RTL |
| Zod | 4.x | env validation |
| Prisma | 7.x | ORM server-only — **تنها لایه دیتابیس** |
| PostgreSQL | 16+ | database |
| lucide-react | latest | icons |
| clsx + tailwind-merge | latest | `cn()` helper |
| bcryptjs | latest | password hash |
| husky + lint-staged | latest | pre-commit |
| eslint + prettier | latest | lint/format |

**Package manager:** yarn

---

## ۲. اصول معماری (غیرقابل نقض)

```
┌─────────────────────────────────────────────────────────────┐
│  Admin UI         app/(admin)/admin/*                       │
│  Auth             app/(auth)/login/                         │
│  Panel (رزرو)    app/(panel)/dashboard/                    │
│  Components       atoms → molecules → organisms             │
├─────────────────────────────────────────────────────────────┤
│  features/*/queries.ts   ← React Query hooks                │
│  features/*/service.ts   ← apiClient calls                  │
│  store/slices/           ← Zustand (auth + ui)              │
├─────────────────────────────────────────────────────────────┤
│  apiClient  →  /api/v1/*  (Next.js BFF — داخلی)            │
├─────────────────────────────────────────────────────────────┤
│  route-registry → handlers → repositories → Prisma          │
│  PrismaClient → PostgreSQL  (DATABASE_URL از env.server)    │
└─────────────────────────────────────────────────────────────┘
```

### قوانین طلایی

1. **بدون backend خارجی** — هیچ `backendFetch`، proxy به API بیرونی، یا SSO در فاز ۱
2. **Client فقط `/api/v1/*`** — هرگز مستقیم به database
3. **`DATABASE_URL` server-only** — فقط در `env.server.ts` و Prisma؛ هرگز `NEXT_PUBLIC_`
4. **Prisma فقط در server** — handlers و repositories
5. **هیچ رشته UI hardcode نشود** — فقط `t("key")` از next-intl
6. **State split:** server = React Query، UI global = Zustand، local = useState
7. **Spacing semantic** — نه `p-4`, `gap-6`
8. **RTL logical properties** — `ps-*`, `pe-*`, `start-*`, `end-*`
9. **Atoms بدون margin بیرونی** — فاصله با `gap-*` روی parent

---

## ۳. Route Groups

| Group | مسیر URL | کاربرد |
|-------|----------|--------|
| `(auth)` | `/login` | صفحه login تمپلیت (public) |
| `(admin)` | `/admin`, `/admin/*` | **پنل ادمین اصلی** — sidebar + header |
| `(panel)` | `/dashboard`, `/dashboard/*` | رزرو برای آینده — scaffold minimal |

**Redirect پیش‌فرض:** `/` → `/admin` (نه `/dashboard`)

**Middleware (`proxy.ts`):**

| مسیر | دسترسی |
|------|---------|
| `/login` | public |
| `/admin/*` | authenticated + role `manager` \| `admin` |
| `/dashboard/*` | authenticated + role `client` \| `manager` \| `admin` |

---

## ۴. ساختار پوشه‌ها (الزامی)

```
.
├── .cursor/rules/          ← api, auth, components, state, resources, performance
├── .husky/pre-commit
├── docs/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/fonts/IRANSans/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       ├── page.tsx              ← Server wrapper
│   │   │       └── LoginForm.tsx         ← Client — username + password
│   │   ├── (admin)/
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx              ← overview / redirect
│   │   │   │   └── dashboard/
│   │   │   │       └── page.tsx          ← admin home
│   │   │   ├── layout.tsx
│   │   │   ├── template.tsx
│   │   │   └── AdminLayoutShell.tsx      ← sidebar + header
│   │   ├── (panel)/                      ← scaffold minimal — رزرو
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── PanelLayoutShell.tsx
│   │   ├── api/v1/[...path]/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx                      ← redirect → /admin
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── atoms/          ← Design System (Button, Input, Card, ...)
│   │   ├── molecules/      ← StatCard, SectionHeader, ApiErrorToaster
│   │   ├── organisms/
│   │   │   ├── admin/      ← AdminSidebar, AdminHeader
│   │   │   └── layout/     ← PanelSidebar, PanelHeader (رزرو)
│   │   ├── ui/DataTable.tsx
│   │   └── errors/
│   │
│   ├── config/
│   │   ├── env.ts
│   │   ├── env.client.ts
│   │   ├── env.server.ts   ← DATABASE_URL + AUTH_SECRET (Zod)
│   │   ├── routes.ts
│   │   ├── roles.ts
│   │   └── assets.ts
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── queries.ts  ← useLogin, useLogout
│   │   │   └── service.ts
│   │   └── admin/
│   │       ├── queries.ts  ← useAdminOverview
│   │       └── service.ts
│   │
│   ├── lib/
│   │   ├── api/client.ts, endpoints.ts
│   │   ├── api/server/
│   │   │   ├── bff-route-handler.ts
│   │   │   ├── route-registry.ts
│   │   │   ├── session.ts
│   │   │   └── handlers/
│   │   │       ├── auth.handler.ts
│   │   │       └── admin.handler.ts
│   │   └── db/
│   │       ├── prisma.ts
│   │       └── repositories/
│   │           ├── user.repository.ts
│   │           └── admin.repository.ts
│   │
│   ├── proxy.ts
│   ├── resources/messages/fa/
│   ├── store/slices/ + hooks/
│   ├── styles/globals.css
│   └── types/domain.ts, api.ts
│
├── .env.example
├── .env.local              ← gitignore — DATABASE_URL اینجا
├── docker-compose.yml      ← PostgreSQL
├── eslint.config.mjs
├── package.json
└── tsconfig.json
```

---

## ۵. Prisma داخلی — کانفیگ کامل

> **Prisma تنها راه ارتباط با دیتابیس است.** schema، migration و seed داخل همین repo.

### ۵.۱ Environment

**`.env.example`:**

```env
# ── Database (server-only — هرگز NEXT_PUBLIC_) ──────────────
DATABASE_URL=postgresql://{{DB_USER}}:{{DB_PASSWORD}}@localhost:5432/{{DB_NAME}}

# ── Auth ─────────────────────────────────────────────────────
AUTH_SECRET=change_me_in_production_min_32_chars

# ── App ──────────────────────────────────────────────────────
APP_ENV=development
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_NAME={{APP_DISPLAY_NAME}}
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**`src/config/env.server.ts`:**

```ts
import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  AUTH_SECRET: z.string().min(32),
  APP_ENV: z.enum(["development", "production"]).default("development"),
});

function loadServerEnv() {
  const parsed = serverSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    APP_ENV: process.env.APP_ENV,
  });
  if (!parsed.success) {
    throw new Error(`Invalid server env: ${parsed.error.message}`);
  }
  return parsed.data;
}

export const serverEnv = loadServerEnv();
```

**`src/config/env.ts`** — re-export امن برای client (بدون DATABASE_URL):

```ts
export { clientEnv as env } from "./env.client";
// DATABASE_URL فقط از env.server.ts import شود
```

### ۵.۲ Docker PostgreSQL

**`docker-compose.yml`:**

```yaml
services:
  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: {{DB_NAME}}
      POSTGRES_USER: {{DB_USER}}
      POSTGRES_PASSWORD: {{DB_PASSWORD}}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U {{DB_USER}} -d {{DB_NAME}}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### ۵.۳ Schema — username-based admin users

**`prisma/schema.prisma`:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRoleName {
  client
  manager
  admin
}

model User {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String   @map("password_hash")
  fullName     String   @map("full_name")
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  roles UserRole[]

  @@map("users")
}

model Role {
  id   Int          @id @default(autoincrement())
  name UserRoleName @unique

  users UserRole[]

  @@map("roles")
}

model UserRole {
  userId String @map("user_id")
  roleId Int    @map("role_id")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@map("user_roles")
}
```

### ۵.۴ PrismaClient singleton

**`src/lib/db/prisma.ts`:**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

> **قانون import:** فقط از `lib/db/repositories/*` و server handlers به `prisma` دسترسی باشد.

### ۵.۵ Scripts

```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  }
}
```

### ۵.۶ Seed — کاربر admin dev

**`prisma/seed.ts`:**

| فیلد | مقدار |
|------|-------|
| username | `admin` |
| password | `Admin@1234` (bcrypt hash) |
| fullName | `مدیر سیستم` |
| role | `admin` |

```bash
cp .env.example .env.local
docker compose up -d db
yarn db:migrate
yarn db:seed
```

---

## ۶. Auth — username + password (تمپلیت)

### ۶.۱ API

**`POST /api/v1/auth/login`** — body:

```json
{ "username": "admin", "password": "Admin@1234" }
```

**جریان `auth.handler.ts`:**

```
1. validate body (Zod: username min 3, password min 8)
2. user.repository.findByUsername(username)
3. bcrypt.compare(password, user.passwordHash)
4. بررسی isActive
5. خواندن role از user_roles
6. sign JWT → set httpOnly cookies
7. return { userId, username, fullName, role }
```

**`POST /api/v1/auth/logout`** — پاک کردن cookies

### ۶.۲ کوکی‌های httpOnly

| کوکی | مقدار |
|------|-------|
| `{{COOKIE_PREFIX}}_token` | JWT access |
| `{{COOKIE_PREFIX}}_role` | `"admin"` \| `"manager"` \| `"client"` |

### ۶.۳ صفحه Login تمپلیت

**`src/app/(auth)/login/LoginForm.tsx`** — `"use client"`:

```
┌─────────────────────────────────────┐
│         [Logo / App Name]           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Card                       │   │
│  │  Input: username            │   │
│  │  Input: password (type=pass)│   │
│  │  [Button primary — ورود]    │   │
│  │  Alert: error (if any)      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

- centered layout، `Card` + `Input` + `Button` از atoms
- `useLogin()` mutation → `POST /auth/login` → `setAuth()` → `router.push("/admin")`
- loading state روی Button
- error از `handleApiError()` در Alert
- تمام label/placeholder از `resources/messages/fa/auth.json`

**`src/resources/messages/fa/auth.json` (نمونه keys):**

```json
{
  "loginTitle": "ورود به پنل ادمین",
  "usernameLabel": "نام کاربری",
  "usernamePlaceholder": "admin",
  "passwordLabel": "رمز عبور",
  "passwordPlaceholder": "••••••••",
  "submit": "ورود",
  "invalidCredentials": "نام کاربری یا رمز عبور اشتباه است"
}
```

### ۶.۴ Zustand auth slice

```ts
// auth.slice.ts
interface AuthState {
  token: string | null;
  role: UserRole | null;
  userId: string | null;
  username: string | null;
  fullName: string | null;
  setAuth: (payload: AuthPayload) => void;
  clearAuth: () => void;
}
```

---

## ۷. BFF Layer

**`src/lib/api/endpoints.ts`:**

```ts
export const BFF_API_BASE = "/api/v1";

export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
  },
  ADMIN: {
    OVERVIEW: "/admin/overview",
  },
} as const;
```

**`src/lib/api/server/route-registry.ts`:**

```ts
const CUSTOM_ROUTES = {
  "POST:/auth/login": loginHandler,
  "POST:/auth/logout": logoutHandler,
  "GET:/admin/overview": adminOverviewHandler,
};
```

**جریان:**

```
route.ts → bff-route-handler → route-registry → handler → repository → prisma
```

---

## ۸. Admin UI — صفحات اولیه

| مسیر | محتوا |
|------|-------|
| `/` | redirect → `/admin` |
| `/login` | LoginForm تمپلیت |
| `/admin` | redirect → `/admin/dashboard` |
| `/admin/dashboard` | AdminOverview — StatCard × 3 + SectionHeader |
| `/dashboard` | placeholder minimal (panel group — رزرو) |

**`AdminLayoutShell`:**

- `AdminSidebar` — nav items از `config/routes.ts`
- `AdminHeader` — profile dropdown + logout
- `useAdminOverview()` — داده از Prisma

**Organisms admin:**

```
components/organisms/admin/
├── AdminSidebar.tsx
├── AdminHeader.tsx
└── AdminOverviewStats.tsx
```

---

## ۹. Design System + Atomic Design

| سطح | مسیر | قوانین |
|-----|------|--------|
| Atom | `components/atoms/` | بدون margin بیرونی، `@level atom` JSDoc |
| Molecule | `components/molecules/` | ترکیب atoms |
| Organism | `components/organisms/admin/` | بخش کامل admin UI |

**Atoms الزامی:** Button, Input, Label, Card, Alert, Badge, Spinner, Modal, Table, Sidebar, EmptyState, Avatar, Tabs, Select, Checkbox, Toggle, Divider

**Spacing:** فقط semantic tokens — `gap-mol`, `p-pad-mol`, `ps-pad-atom-md`  
**RTL:** `ps-*`, `pe-*`, `start-*`, `end-*`  
**Import:** `import { Button, Input, Card } from "@/components/atoms"`

---

## ۱۰. scaffold — گام‌به‌گام

### گام ۱ — Init

```bash
yarn create next-app {{PROJECT_NAME}} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd {{PROJECT_NAME}}
```

### گام ۲ — Dependencies

```bash
yarn add @tanstack/react-query clsx tailwind-merge lucide-react next-intl zod zustand bcryptjs
yarn add @prisma/client
yarn add -D prisma @tailwindcss/postcss prettier prettier-plugin-tailwindcss husky lint-staged tsx
```

### گام ۳ — Prisma + DB

- فایل‌های بخش ۵ را بساز
- `docker compose up -d db && yarn db:migrate && yarn db:seed`

### گام ۴ — BFF + repositories

- `prisma.ts`, `user.repository.ts`, `admin.repository.ts`
- `auth.handler.ts`, `admin.handler.ts`
- `route-registry.ts`, `bff-route-handler.ts`

### گام ۵ — Client layer

- `apiClient`, `features/auth/*`, `features/admin/*`
- Zustand slices + selector hooks
- `proxy.ts` middleware

### گام ۶ — UI

- atoms scaffold
- LoginForm تمپلیت
- AdminLayoutShell + dashboard
- `globals.css` با `@theme` tokens + IRANSans

### گام ۷ — Tooling

- ESLint (Persian + spacing rules)
- Husky + lint-staged
- `.cursor/rules/` از nibmarket

---

## ۱۱. الگوی Feature جدید

```
1. prisma/schema.prisma       ← model + migrate
2. lib/db/repositories/       ← Prisma queries
3. lib/api/endpoints.ts       ← ENDPOINTS.*
4. lib/api/server/handlers/   ← handler
5. route-registry.ts          ← register
6. features/{name}/service.ts
7. features/{name}/queries.ts
8. app/(admin)/admin/{path}/  ← page.tsx
9. resources/messages/fa/     ← i18n keys
10. components/organisms/admin/
```

---

## ۱۲. Checklist تأیید نهایی

- [ ] `yarn install && yarn db:migrate && yarn db:seed` موفق
- [ ] `yarn type-check && yarn lint && yarn build` بدون خطا
- [ ] `yarn dev` → `/login` باز می‌شود
- [ ] login با `admin` / `Admin@1234` → redirect به `/admin/dashboard`
- [ ] `/admin/dashboard` داده از Prisma (نه mock) نشان می‌دهد
- [ ] logout کار می‌کند
- [ ] `/admin/*` بدون login → redirect به `/login`
- [ ] `DATABASE_URL` فقط در server env — نه `NEXT_PUBLIC_`
- [ ] هیچ fetch به backend خارجی نیست
- [ ] route groups `(auth)`, `(admin)`, `(panel)` موجودند
- [ ] LoginForm تمپلیت با username + password
- [ ] atoms + spacing semantic + i18n رعایت شده
- [ ] `.cursor/rules/` و `.env.example` کامل

---

## ۱۳. دستور نمونه برای ایجنت

```
پروژه پنل ادمین {{PROJECT_NAME}} را طبق docs/project-scaffold-blueprint.md بساز.

مشخصات:
- Admin Panel — redirect پیش‌فرض /admin
- Auth: username + password — صفحه login تمپلیت
- Prisma داخلی — PostgreSQL از DATABASE_URL
- Route groups: (auth), (admin), (panel) — هر سه scaffold شوند
- Seed: admin / Admin@1234

فقط scaffold — feature business اضافه نکن جز admin dashboard نمونه.
بعد از اتمام checklist بخش ۱۲ را اجرا و گزارش بده.
```

---

## مرجع

استخراج‌شده از استانداردهای **nibmarket**:

- `docs/architecture.md`
- `docs/spacing.md`
- `docs/components/design-system.md`
- `.cursor/rules/*.md`

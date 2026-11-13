# Pishe product copy (voice & literature)

Source of truth for **end-user** UI wording. Agents and humans must follow this when adding or changing strings.

## Where copy lives

| Audience | Location | Language in file |
|----------|----------|------------------|
| End users (app UI) | `src/resources/messages/fa/*.json` | Persian |
| Operators / engineers | README, `docs/`, logs, API `message` fields for ops | English |

- **Never** hardcode user-visible Persian (or English marketing) in JSX/TS. Use `next-intl` keys from `resources/messages/fa/`.
- Reviewing copy = open the JSON files under `resources/messages/fa/` (one file per area: `auth`, `common`, `home`, …).

## Voice

- Friendly but **more formal** than street chat. Prefer clear sentences over slang.
- Prefer second person that feels respectful (e.g. «شما» / neutral phrasing) over heavy colloquial «رو / برات / منو».
- Short. One idea per sentence. No exclamation spam.
- Success states: calm and definitive (e.g. «درخواست ثبت شد»), not overly cute.

## Never show to end users

Do **not** put any of the following in `resources/messages/fa/` or in UI:

- Internal product / stack names: Keycloak, SigNoz, noz, SSO hostnames, realm names, Admin API, OTEL, WireGuard, BFF, Node, Docker
- Operator workflows: «اپراتور»، «لاگ مانیتورینگ»، «در کنسول ست می‌کنیم»
- Engineering roadmap: «فاز ۱»، «MVP»، ticket IDs, env var names
- Raw error codes or English infra messages as the primary user text

Those belong in English README, operator docs, or server logs only.

## Auth & pre-registration (intent)

- After pre-registration: confirm the **request was received**; say access will be enabled **after review**; do **not** explain how ops approve accounts.
- Pending login: say the request is still under review — not technical blockers.
- Outages: generic «temporarily unavailable / try again later» — never «check Keycloak» or «import realm».

## Checklist before shipping a string

1. Would a shop owner understand it with zero platform knowledge?
2. If we removed our brand name, would it still avoid leaking how we run infra?
3. Is the key in `resources/messages/fa/` and referenced via `useTranslations` / `t(...)`?

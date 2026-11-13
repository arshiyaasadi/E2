import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type LoginSessionRecord = {
  id: string;
  userId: string;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
  deviceLabel: string;
};

type StoreDoc = { sessions: LoginSessionRecord[] };

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "login-sessions.json");
const MAX_PER_USER = 50;

const empty = (): StoreDoc => ({ sessions: [] });

let writeChain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn);
  writeChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function ensure() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(empty(), null, 2), "utf8");
  }
}

async function read(): Promise<StoreDoc> {
  await ensure();
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreDoc;
    return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] };
  } catch {
    return empty();
  }
}

async function write(doc: StoreDoc) {
  await ensure();
  const tmp = `${STORE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(doc, null, 2), "utf8");
  await fs.rename(tmp, STORE_PATH);
}

function labelFromUa(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/iPhone|iPad/i.test(ua)) return "iPhone / iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Browser";
}

export async function recordLoginSession(input: {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<LoginSessionRecord> {
  return withLock(async () => {
    const doc = await read();
    const row: LoginSessionRecord = {
      id: randomUUID(),
      userId: input.userId,
      createdAt: new Date().toISOString(),
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      deviceLabel: labelFromUa(input.userAgent ?? null),
    };
    const others = doc.sessions.filter((s) => s.userId !== input.userId);
    const mine = [row, ...doc.sessions.filter((s) => s.userId === input.userId)].slice(
      0,
      MAX_PER_USER,
    );
    doc.sessions = [...mine, ...others].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    await write(doc);
    return row;
  });
}

export async function listLoginSessionsForUser(
  userId: string,
): Promise<LoginSessionRecord[]> {
  const doc = await read();
  return doc.sessions
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30);
}

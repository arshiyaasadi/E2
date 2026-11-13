import { promises as fs } from "node:fs";
import path from "node:path";

export type ProfileOverride = {
  userId: string;
  firstName: string;
  lastName: string;
  updatedAt: string;
};

type StoreDoc = { profiles: ProfileOverride[] };

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "profiles.json");

const empty = (): StoreDoc => ({ profiles: [] });

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
    return { profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [] };
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

export async function getProfileOverride(
  userId: string,
): Promise<ProfileOverride | null> {
  const doc = await read();
  return doc.profiles.find((p) => p.userId === userId) ?? null;
}

export async function upsertProfileNames(input: {
  userId: string;
  firstName: string;
  lastName: string;
}): Promise<ProfileOverride> {
  return withLock(async () => {
    const doc = await read();
    const row: ProfileOverride = {
      userId: input.userId,
      firstName: input.firstName,
      lastName: input.lastName,
      updatedAt: new Date().toISOString(),
    };
    const idx = doc.profiles.findIndex((p) => p.userId === input.userId);
    if (idx >= 0) doc.profiles[idx] = row;
    else doc.profiles.push(row);
    await write(doc);
    return row;
  });
}

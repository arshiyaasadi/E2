import { deleteObject, deleteObjectsByPrefix } from "@/lib/storage/object-storage";

function objectDirFromStorageKey(storageKey: string) {
  const idx = storageKey.lastIndexOf("/");
  if (idx <= 0) return storageKey;
  return storageKey.slice(0, idx);
}

/** Removes objects for a media row from MinIO (original + thumb when present). */
export async function purgeMediaObjects(storageKey: string) {
  // New layout: folder/yyyy/mm/uuid/original.ext → wipe the whole uuid directory
  if (/\/original\.[^./]+$/i.test(storageKey)) {
    await deleteObjectsByPrefix(objectDirFromStorageKey(storageKey));
    return;
  }

  // Legacy flat key: folder/uuid.ext
  await deleteObject(storageKey);
}

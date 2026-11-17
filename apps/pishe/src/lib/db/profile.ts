import { prisma } from "@/lib/db/prisma";
import { allocateUniqueInviteCode } from "@/lib/db/codes";
import { ensureUserFileSpace } from "@/lib/db/spaces";
import type { Profile } from "@prisma/client";

/**
 * Upsert thin Profile by Keycloak `sub` on session use.
 * Generates invite code on first create.
 */
export async function upsertProfileFromSession(input: {
  keycloakSub: string;
  displayName?: string | null;
}): Promise<Profile> {
  const existing = await prisma.profile.findUnique({
    where: { keycloakSub: input.keycloakSub },
  });
  if (existing) {
    await ensureUserFileSpace(existing.id);
    if (
      input.displayName &&
      input.displayName.trim() &&
      input.displayName !== existing.displayName
    ) {
      return prisma.profile.update({
        where: { id: existing.id },
        data: { displayName: input.displayName.trim() },
      });
    }
    return existing;
  }

  const inviteCode = await allocateUniqueInviteCode();
  const created = await prisma.profile.create({
    data: {
      keycloakSub: input.keycloakSub,
      inviteCode,
      displayName: input.displayName?.trim() || null,
    },
  });
  await ensureUserFileSpace(created.id);
  return created;
}

export async function requireProfileBySub(
  keycloakSub: string,
): Promise<Profile> {
  return upsertProfileFromSession({ keycloakSub });
}

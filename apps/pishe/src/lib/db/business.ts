import type { Business, BusinessLink, MembershipRole, Profile } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { allocateUniqueBusinessCode } from "@/lib/db/codes";
import {
  ensureBusinessFileSpace,
  ensureBusinessTelegramIngestConfig,
} from "@/lib/db/spaces";

export type BusinessWithLinks = Business & { links: BusinessLink[] };

export type MemberRow = {
  membershipId: string;
  role: MembershipRole;
  profile: {
    id: string;
    inviteCode: string;
    displayName: string | null;
    keycloakSub: string;
  };
};

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `biz-${Date.now().toString(36)}`;
}

export async function ensureUniqueSlug(name: string, excludeId?: string) {
  const slug = slugify(name);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const existing = await prisma.business.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

export async function createBusiness(input: {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  color?: string | null;
  assignedAt?: Date | null;
  links?: Array<{ title: string; url: string }>;
}): Promise<BusinessWithLinks> {
  const code = await allocateUniqueBusinessCode();
  const slug = await ensureUniqueSlug(input.name);
  const created = await prisma.business.create({
    data: {
      code,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      logoUrl: input.logoUrl?.trim() || null,
      color: input.color?.trim() || null,
      assignedAt: input.assignedAt ?? new Date(),
      links: input.links?.length
        ? {
            create: input.links.map((l, idx) => ({
              title: l.title.trim(),
              url: l.url.trim(),
              sortOrder: idx,
            })),
          }
        : undefined,
    },
    include: { links: { orderBy: { sortOrder: "asc" } } },
  });
  await ensureBusinessFileSpace(created.id);
  await ensureBusinessTelegramIngestConfig(created.id);
  return created;
}

export async function updateBusiness(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    logoUrl?: string | null;
    color?: string | null;
    assignedAt?: Date | null;
    links?: Array<{ title: string; url: string }>;
  },
): Promise<BusinessWithLinks> {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) {
    data.name = input.name.trim();
    data.slug = await ensureUniqueSlug(input.name, id);
  }
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }
  if (input.logoUrl !== undefined) {
    data.logoUrl = input.logoUrl?.trim() || null;
  }
  if (input.color !== undefined) {
    data.color = input.color?.trim() || null;
  }
  if (input.assignedAt !== undefined) {
    data.assignedAt = input.assignedAt;
  }

  if (input.links) {
    await prisma.businessLink.deleteMany({ where: { businessId: id } });
    data.links = {
      create: input.links.map((l, idx) => ({
        title: l.title.trim(),
        url: l.url.trim(),
        sortOrder: idx,
      })),
    };
  }

  return prisma.business.update({
    where: { id },
    data,
    include: { links: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function listBusinesses(): Promise<BusinessWithLinks[]> {
  return prisma.business.findMany({
    orderBy: { assignedAt: "desc" },
    include: { links: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function getBusiness(id: string): Promise<BusinessWithLinks | null> {
  return prisma.business.findUnique({
    where: { id },
    include: { links: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function deleteBusiness(id: string): Promise<void> {
  await prisma.business.delete({ where: { id } });
}

export async function listMemberships(businessId: string): Promise<MemberRow[]> {
  const rows = await prisma.businessMembership.findMany({
    where: { businessId },
    include: {
      profile: {
        select: {
          id: true,
          inviteCode: true,
          displayName: true,
          keycloakSub: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    membershipId: r.id,
    role: r.role,
    profile: r.profile,
  }));
}

export async function addMembership(input: {
  businessId: string;
  profileId: string;
  role: MembershipRole;
}) {
  return prisma.businessMembership.upsert({
    where: {
      profileId_businessId: {
        profileId: input.profileId,
        businessId: input.businessId,
      },
    },
    create: {
      profileId: input.profileId,
      businessId: input.businessId,
      role: input.role,
    },
    update: { role: input.role },
    include: {
      profile: {
        select: {
          id: true,
          inviteCode: true,
          displayName: true,
          keycloakSub: true,
        },
      },
    },
  });
}

export async function removeMembership(membershipId: string) {
  await prisma.businessMembership.delete({ where: { id: membershipId } });
}

export async function getMembership(
  profileId: string,
  businessId: string,
) {
  return prisma.businessMembership.findUnique({
    where: {
      profileId_businessId: { profileId, businessId },
    },
  });
}

export async function findProfileByInviteCode(
  inviteCode: string,
): Promise<Profile | null> {
  return prisma.profile.findUnique({ where: { inviteCode } });
}

export async function listBusinessesForProfile(profileId: string) {
  const rows = await prisma.businessMembership.findMany({
    where: { profileId },
    include: {
      business: {
        include: { links: { orderBy: { sortOrder: "asc" } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    role: r.role,
    business: r.business,
  }));
}

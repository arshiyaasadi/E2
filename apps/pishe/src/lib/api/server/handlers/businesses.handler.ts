import { z } from "zod";
import { MembershipRole } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/api/server/session";
import {
  addMembership,
  createBusiness,
  deleteBusiness,
  findProfileByInviteCode,
  getBusiness,
  getMembership,
  listBusinesses,
  listBusinessesForProfile,
  listMemberships,
  removeMembership,
  updateBusiness,
} from "@/lib/db/business";
import { requireProfileBySub } from "@/lib/db/profile";
import type { ApiResponse } from "@/types/api";

const linkSchema = z.object({
  title: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(2048),
});

const businessWriteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  logoUrl: z.string().trim().url().max(2048).nullable().optional(),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .nullable()
    .optional(),
  assignedAt: z.string().datetime().nullable().optional(),
  links: z.array(linkSchema).max(20).optional(),
});

const businessPatchSchema = businessWriteSchema.partial().extend({
  name: z.string().trim().min(2).max(120).optional(),
});

const memberAddSchema = z.object({
  inviteCode: z.string().trim().regex(/^\d{8}$/),
  role: z.enum(["MANAGER", "ASSISTANT"]).default("ASSISTANT"),
});

function unauthorized(): ApiResponse<never> {
  return {
    success: false,
    error: { code: "UNAUTHORIZED", message: "Not authenticated" },
  };
}

function forbidden(message = "Forbidden"): ApiResponse<never> {
  return { success: false, error: { code: "FORBIDDEN", message } };
}

function notFound(message = "Not found"): ApiResponse<never> {
  return { success: false, error: { code: "NOT_FOUND", message } };
}

function validation(message: string): ApiResponse<never> {
  return { success: false, error: { code: "VALIDATION_ERROR", message } };
}

async function sessionProfile() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  const profile = await requireProfileBySub(session.sub);
  return { session, profile };
}

function serializeBusiness(
  b: Awaited<ReturnType<typeof getBusiness>> & object,
) {
  if (!b) return null;
  return {
    id: b.id,
    code: b.code,
    name: b.name,
    slug: b.slug,
    description: b.description,
    logoUrl: b.logoUrl,
    color: b.color,
    assignedAt: b.assignedAt.toISOString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    links: b.links.map((l) => ({
      id: l.id,
      title: l.title,
      url: l.url,
      sortOrder: l.sortOrder,
    })),
  };
}

export async function listMyBusinessesHandler(): Promise<
  ApiResponse<{ businesses: Array<{ role: MembershipRole; business: ReturnType<typeof serializeBusiness> }> }>
> {
  const ctx = await sessionProfile();
  if (!ctx) return unauthorized();

  if (ctx.profile.isSuperAdmin) {
    const all = await listBusinesses();
    return {
      success: true,
      data: {
        businesses: all.map((b) => ({
          role: "MANAGER" as MembershipRole,
          business: serializeBusiness(b),
        })),
      },
    };
  }

  const rows = await listBusinessesForProfile(ctx.profile.id);
  return {
    success: true,
    data: {
      businesses: rows.map((r) => ({
        role: r.role,
        business: serializeBusiness(r.business),
      })),
    },
  };
}

export async function listAllBusinessesHandler(): Promise<
  ApiResponse<{ businesses: Array<ReturnType<typeof serializeBusiness>> }>
> {
  const ctx = await sessionProfile();
  if (!ctx) return unauthorized();
  if (!ctx.profile.isSuperAdmin) return forbidden("Super-admin only");

  const rows = await listBusinesses();
  return {
    success: true,
    data: { businesses: rows.map((b) => serializeBusiness(b)) },
  };
}

export async function createBusinessHandler(
  body: unknown,
): Promise<ApiResponse<{ business: ReturnType<typeof serializeBusiness> }>> {
  const ctx = await sessionProfile();
  if (!ctx) return unauthorized();
  if (!ctx.profile.isSuperAdmin) return forbidden("Super-admin only");

  const parsed = businessWriteSchema.safeParse(body);
  if (!parsed.success) {
    return validation(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const created = await createBusiness({
    name: parsed.data.name,
    description: parsed.data.description,
    logoUrl: parsed.data.logoUrl,
    color: parsed.data.color,
    assignedAt: parsed.data.assignedAt
      ? new Date(parsed.data.assignedAt)
      : undefined,
    links: parsed.data.links,
  });

  // Super-admin who creates is also MANAGER by default.
  await addMembership({
    businessId: created.id,
    profileId: ctx.profile.id,
    role: "MANAGER",
  });

  return { success: true, data: { business: serializeBusiness(created) } };
}

export async function getBusinessHandler(
  businessId: string,
): Promise<ApiResponse<{ business: ReturnType<typeof serializeBusiness> }>> {
  const ctx = await sessionProfile();
  if (!ctx) return unauthorized();

  const business = await getBusiness(businessId);
  if (!business) return notFound("Business not found");

  if (!ctx.profile.isSuperAdmin) {
    const membership = await getMembership(ctx.profile.id, businessId);
    if (!membership) return forbidden();
  }

  return { success: true, data: { business: serializeBusiness(business) } };
}

export async function patchBusinessHandler(
  businessId: string,
  body: unknown,
): Promise<ApiResponse<{ business: ReturnType<typeof serializeBusiness> }>> {
  const ctx = await sessionProfile();
  if (!ctx) return unauthorized();
  if (!ctx.profile.isSuperAdmin) return forbidden("Super-admin only");

  const existing = await getBusiness(businessId);
  if (!existing) return notFound("Business not found");

  const parsed = businessPatchSchema.safeParse(body);
  if (!parsed.success) {
    return validation(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const updated = await updateBusiness(businessId, {
    name: parsed.data.name,
    description: parsed.data.description,
    logoUrl: parsed.data.logoUrl,
    color: parsed.data.color,
    assignedAt:
      parsed.data.assignedAt === undefined
        ? undefined
        : parsed.data.assignedAt
          ? new Date(parsed.data.assignedAt)
          : null,
    links: parsed.data.links,
  });

  return { success: true, data: { business: serializeBusiness(updated) } };
}

export async function deleteBusinessHandler(
  businessId: string,
): Promise<ApiResponse<{ ok: true }>> {
  const ctx = await sessionProfile();
  if (!ctx) return unauthorized();
  if (!ctx.profile.isSuperAdmin) return forbidden("Super-admin only");

  const existing = await getBusiness(businessId);
  if (!existing) return notFound("Business not found");

  await deleteBusiness(businessId);
  return { success: true, data: { ok: true } };
}

export async function listMembersHandler(
  businessId: string,
): Promise<
  ApiResponse<{
    members: Array<{
      membershipId: string;
      role: MembershipRole;
      inviteCode: string;
      displayName: string | null;
      profileId: string;
    }>;
  }>
> {
  const ctx = await sessionProfile();
  if (!ctx) return unauthorized();

  const business = await getBusiness(businessId);
  if (!business) return notFound("Business not found");

  const membership = await getMembership(ctx.profile.id, businessId);
  if (!ctx.profile.isSuperAdmin && !membership) return forbidden();

  const rows = await listMemberships(businessId);
  return {
    success: true,
    data: {
      members: rows.map((r) => ({
        membershipId: r.membershipId,
        role: r.role,
        inviteCode: r.profile.inviteCode,
        displayName: r.profile.displayName,
        profileId: r.profile.id,
      })),
    },
  };
}

export async function addMemberHandler(
  businessId: string,
  body: unknown,
): Promise<
  ApiResponse<{
    member: {
      membershipId: string;
      role: MembershipRole;
      inviteCode: string;
      displayName: string | null;
      profileId: string;
    };
  }>
> {
  const ctx = await sessionProfile();
  if (!ctx) return unauthorized();

  const business = await getBusiness(businessId);
  if (!business) return notFound("Business not found");

  const membership = await getMembership(ctx.profile.id, businessId);
  const canManage =
    ctx.profile.isSuperAdmin || membership?.role === "MANAGER";
  if (!canManage) return forbidden("Manager only");

  const parsed = memberAddSchema.safeParse(body);
  if (!parsed.success) {
    return validation(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const target = await findProfileByInviteCode(parsed.data.inviteCode);
  if (!target) return notFound("Invite code not found");

  const row = await addMembership({
    businessId,
    profileId: target.id,
    role: parsed.data.role,
  });

  return {
    success: true,
    data: {
      member: {
        membershipId: row.id,
        role: row.role,
        inviteCode: row.profile.inviteCode,
        displayName: row.profile.displayName,
        profileId: row.profile.id,
      },
    },
  };
}

export async function removeMemberHandler(
  businessId: string,
  membershipId: string,
): Promise<ApiResponse<{ ok: true }>> {
  const ctx = await sessionProfile();
  if (!ctx) return unauthorized();

  const business = await getBusiness(businessId);
  if (!business) return notFound("Business not found");

  const membership = await getMembership(ctx.profile.id, businessId);
  const canManage =
    ctx.profile.isSuperAdmin || membership?.role === "MANAGER";
  if (!canManage) return forbidden("Manager only");

  const rows = await listMemberships(businessId);
  const target = rows.find((r) => r.membershipId === membershipId);
  if (!target) return notFound("Membership not found");

  await removeMembership(membershipId);
  return { success: true, data: { ok: true } };
}

export async function searchProfileByInviteHandler(
  searchParams?: URLSearchParams,
): Promise<
  ApiResponse<{
    profile: {
      id: string;
      inviteCode: string;
      displayName: string | null;
    };
  }>
> {
  const ctx = await sessionProfile();
  if (!ctx) return unauthorized();

  const code = (searchParams?.get("code") ?? "").trim();
  if (!/^\d{8}$/.test(code)) {
    return validation("Invite code must be 8 digits");
  }

  const profile = await findProfileByInviteCode(code);
  if (!profile) return notFound("Invite code not found");

  return {
    success: true,
    data: {
      profile: {
        id: profile.id,
        inviteCode: profile.inviteCode,
        displayName: profile.displayName,
      },
    },
  };
}

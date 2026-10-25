import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

const SALT_ROUNDS = 12;

export function sanitizeAdminUser(user: {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  roleId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: { id: string; name: string; description: string | null } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isActive: user.isActive,
    roleId: user.roleId,
    roleName: user.role?.name ?? null,
    roleDescription: user.role?.description ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function findAdminUserByEmail(email: string) {
  return prisma.adminUser.findFirst({
    where: {
      email,
      deletedAt: null,
    },
    include: {
      role: true,
    },
  });
}

export async function findAdminUserByKeycloakSub(keycloakSub: string) {
  return prisma.adminUser.findFirst({
    where: {
      keycloakSub,
      deletedAt: null,
    },
    include: {
      role: true,
    },
  });
}

/** Resolve or create the local admin row linked to a Keycloak subject. */
export async function upsertAdminUserFromKeycloak(input: {
  keycloakSub: string;
  email: string;
  fullName: string | null;
  roleName: string;
}) {
  const role = await prisma.role.findFirst({
    where: { name: input.roleName, deletedAt: null },
  });
  if (!role) {
    throw new Error(`Unknown role: ${input.roleName}`);
  }

  const bySub = await findAdminUserByKeycloakSub(input.keycloakSub);
  if (bySub) {
    return prisma.adminUser.update({
      where: { id: bySub.id },
      data: {
        email: input.email.toLowerCase(),
        fullName: input.fullName ?? bySub.fullName,
        roleId: role.id,
        isActive: true,
        passwordHash: null,
        updatedAt: new Date(),
      },
      include: { role: true },
    });
  }

  const byEmail = await findAdminUserByEmail(input.email.toLowerCase());
  if (byEmail) {
    return prisma.adminUser.update({
      where: { id: byEmail.id },
      data: {
        keycloakSub: input.keycloakSub,
        fullName: input.fullName ?? byEmail.fullName,
        roleId: role.id,
        isActive: true,
        passwordHash: null,
        updatedAt: new Date(),
      },
      include: { role: true },
    });
  }

  return prisma.adminUser.create({
    data: {
      email: input.email.toLowerCase(),
      keycloakSub: input.keycloakSub,
      fullName: input.fullName,
      roleId: role.id,
      isActive: true,
      passwordHash: null,
    },
    include: { role: true },
  });
}

export async function listAdminUsers() {
  const users = await prisma.adminUser.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { role: true },
  });

  return users.map(sanitizeAdminUser);
}

export async function findAdminUserById(userId: string) {
  const user = await prisma.adminUser.findFirst({
    where: { id: userId, deletedAt: null },
    include: { role: true },
  });

  return user ? sanitizeAdminUser(user) : null;
}

export async function createAdminUser(input: {
  email: string;
  password: string;
  fullName: string | null;
  roleId: string;
  isActive: boolean;
}) {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.adminUser.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      fullName: input.fullName,
      roleId: input.roleId,
      isActive: input.isActive,
    },
    include: { role: true },
  });

  return sanitizeAdminUser(user);
}

export async function updateAdminUser(
  userId: string,
  input: {
    email?: string;
    fullName?: string | null;
    roleId?: string;
    isActive?: boolean;
    password?: string;
  },
) {
  const data: {
    email?: string;
    fullName?: string | null;
    roleId?: string;
    isActive?: boolean;
    passwordHash?: string;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (input.email !== undefined) data.email = input.email.toLowerCase();
  if (input.fullName !== undefined) data.fullName = input.fullName;
  if (input.roleId !== undefined) data.roleId = input.roleId;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.adminUser.update({
    where: { id: userId },
    data,
    include: { role: true },
  });

  return sanitizeAdminUser(user);
}

export async function softDeleteAdminUser(userId: string) {
  await prisma.adminUser.update({
    where: { id: userId },
    data: { deletedAt: new Date(), isActive: false, updatedAt: new Date() },
  });
}

export async function touchAdminLastLogin(userId: string) {
  return prisma.adminUser.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

export async function findAdminUserRecord(userId: string) {
  return prisma.adminUser.findFirst({
    where: { id: userId, deletedAt: null },
    include: { role: true },
  });
}

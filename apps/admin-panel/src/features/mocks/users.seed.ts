export type MockUser = {
  id: string;
  displayName: string;
  mobile: string | null;
  email: string;
  active: boolean;
};

/** Shared fake SSO users for payment + notification journeys. */
export const MOCK_USERS: MockUser[] = [
  {
    id: "sso_u_aria",
    displayName: "آریا محمدی",
    mobile: "09121234567",
    email: "aria@example.com",
    active: true,
  },
  {
    id: "sso_u_sara",
    displayName: "سارا کریمی",
    mobile: "09129876543",
    email: "sara@example.com",
    active: true,
  },
  {
    id: "sso_u_nima",
    displayName: "نیما بدون موبایل",
    mobile: null,
    email: "nima@example.com",
    active: true,
  },
  {
    id: "sso_u_disabled",
    displayName: "کاربر غیرفعال",
    mobile: "09121110000",
    email: "disabled@example.com",
    active: false,
  },
];

export const MOCK_ADMIN_ID = "admin_d8t";

export function findMockUser(userId: string) {
  return MOCK_USERS.find((user) => user.id === userId) ?? null;
}

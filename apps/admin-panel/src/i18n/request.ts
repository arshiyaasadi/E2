import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const [common, auth, admin, blog] = await Promise.all([
    import("@/resources/messages/fa/common.json"),
    import("@/resources/messages/fa/auth.json"),
    import("@/resources/messages/fa/admin.json"),
    import("@/resources/messages/fa/blog.json"),
  ]);

  return {
    locale: "fa",
    messages: {
      common: common.default,
      auth: auth.default,
      admin: admin.default,
      blog: blog.default,
    },
  };
});

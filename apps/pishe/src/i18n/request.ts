import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const [common, auth, home, products, profile, notifications] =
    await Promise.all([
      import("@/resources/messages/fa/common.json"),
      import("@/resources/messages/fa/auth.json"),
      import("@/resources/messages/fa/home.json"),
      import("@/resources/messages/fa/products.json"),
      import("@/resources/messages/fa/profile.json"),
      import("@/resources/messages/fa/notifications.json"),
    ]);

  return {
    locale: "fa",
    messages: {
      common: common.default,
      auth: auth.default,
      home: home.default,
      products: products.default,
      profile: profile.default,
      notifications: notifications.default,
    },
  };
});

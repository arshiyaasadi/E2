import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const mediaHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "http://localhost:9000").hostname;
  } catch {
    return "localhost";
  }
})();

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: mediaHost,
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: mediaHost,
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9000",
        pathname: "/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);

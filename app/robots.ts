import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/pricing",
        "/login",
        "/signup",
      ],
      disallow: [
        "/dashboard",
        "/customers",
        "/properties",
        "/boilers",
        "/permits",
        "/documents",
        "/notifications",
        "/users",
        "/settings",
        "/onboarding",
        "/billing",
        "/api/",
        "/auth/",
      ],
    },
    sitemap:
      "https://www.getpermitwatch.com/sitemap.xml",
  };
}
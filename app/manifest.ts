import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PermitWatch",
    short_name: "PermitWatch",
    description:
      "Boiler permit and compliance management platform.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#059669",
  };
}
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cologne Catalog",
    short_name: "Colognes",
    description: "Catalog your colognes, look up any fragrance, and find the best price.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ee",
    theme_color: "#f7f3ee",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

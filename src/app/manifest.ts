import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rail Atlas — BD Railway seats",
    short_name: "Rail Atlas",
    description:
      "Live Bangladesh Railway seat availability across all classes & stops, with a split-ticket finder.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#080d0b",
    theme_color: "#07a25c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    categories: ["travel", "utilities"],
  };
}

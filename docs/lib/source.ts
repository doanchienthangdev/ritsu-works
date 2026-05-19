import { docs, meta } from "@/.source";
import { loader } from "fumadocs-core/source";
import { createMDXSource } from "fumadocs-mdx";
import { i18n } from "@/lib/i18n";
import { icons } from "lucide-react";
import { createElement } from "react";

export const source = loader({
  baseUrl: "/docs",
  i18n,
  // v1.3: resolve `icon: "<LucideName>"` in meta.json → React element
  icon(icon) {
    if (!icon) return undefined;
    if (icon in icons) {
      return createElement(icons[icon as keyof typeof icons]);
    }
    return undefined;
  },
  source: createMDXSource(docs, meta),
});

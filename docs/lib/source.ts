import { docs, meta } from "../source.config";
import { loader } from "fumadocs-core/source";

export const source = loader({
  baseUrl: "/docs",
  source: { files: docs, meta },
});

import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-spot-it",
  description: "An accessible browser-local shared matching-symbol race.",
  accentHex: "#e05252",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});

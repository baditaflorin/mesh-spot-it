import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";

test("a correct symbol advances the shared race for another peer", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", {
    storagePrefix: "mesh-spot-it",
  });
  try {
    await a.getByLabel("Your display name").fill("Ari");
    await b.getByLabel("Your display name").fill("Bea");
    await a.getByRole("button", { name: "Card A symbol ☀" }).click();
    await expect(b.getByText(/Ari spotted the last match/i)).toBeVisible({ timeout: 10_000 });
    await expect(b.getByText("Ari", { exact: true })).toBeVisible();
  } finally {
    await cleanup();
  }
});

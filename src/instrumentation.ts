/**
 * Next.js calls register() once when the server process boots. Everything the
 * platform needs to do on a timer lives here.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { sweepStopsAndTargets } = await import("@/lib/trading");
  const { refreshAnchors, priceSource } = await import("@/lib/prices/sources");
  const { db } = await import("@/lib/db");

  const g = globalThis as unknown as { vfxTickers?: boolean };
  if (g.vfxTickers) return; // dev hot-reload calls register again
  g.vfxTickers = true;

  if (priceSource() === "ecb") {
    await refreshAnchors(true).catch(() => {});
    setInterval(() => void refreshAnchors().catch(() => {}), 60 * 60 * 1000).unref?.();
  }

  // Stop loss / take profit are evaluated server-side, so they trigger whether or
  // not the client who placed the trade still has a browser open.
  setInterval(() => {
    void sweepStopsAndTargets().catch((e) => console.error("[stops] sweep failed", e));
  }, 3000).unref?.();

  // Expired sessions are already rejected at read time; this just keeps the table small.
  setInterval(
    () => {
      void db.session
        .deleteMany({ where: { expiresAt: { lt: new Date() } } })
        .catch(() => {});
    },
    60 * 60 * 1000,
  ).unref?.();
}

import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getAccountState } from "@/lib/trading";
import { getNews } from "@/lib/news";
import { Terminal } from "@/components/terminal/Terminal";
import { NewsStrip } from "@/components/NewsStrip";

export const metadata: Metadata = { title: "Trading terminal" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  // Rendered on the server so the terminal has real numbers in its first paint,
  // not a spinner that resolves a moment later.
  const [state, news] = await Promise.all([getAccountState(user.id), getNews(8)]);

  return (
    <>
      <Terminal initial={state} />
      <NewsStrip items={news} />
    </>
  );
}

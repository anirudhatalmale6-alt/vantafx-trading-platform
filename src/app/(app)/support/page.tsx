import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Support" };
export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Support</h1>
      <p className="mt-1 text-sm text-mist-500">
        {site.supportHours}. Messages reach the desk immediately - no ticket number, no waiting on email.
      </p>

      <div className="mt-5">
        <ChatPanel
          className="h-[calc(100vh-260px)] min-h-[420px]"
          emptyHint={`Hello ${user.firstName}, how can we help? Ask about your account, a position, or anything on the platform.`}
        />
      </div>
    </div>
  );
}

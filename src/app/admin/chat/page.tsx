import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { ChatConsole } from "./ChatConsole";

export const metadata: Metadata = { title: "Support inbox" };
export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Support inbox</h1>
      <p className="mt-1 text-sm text-mist-500">
        Every client conversation in one place. New messages arrive live - the list reorders itself.
      </p>

      <div className="mt-5">
        <ChatConsole />
      </div>
    </div>
  );
}

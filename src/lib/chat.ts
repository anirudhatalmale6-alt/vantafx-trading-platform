import "server-only";
import { db } from "@/lib/db";
import { publish } from "@/lib/chat-bus";

export type ChatMessageDto = {
  id: string;
  body: string;
  fromAdmin: boolean;
  authorName: string;
  createdAt: string;
};

/** Every client has exactly one support thread; create it lazily. */
export async function ensureThread(userId: string) {
  const existing = await db.chatThread.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.chatThread.create({ data: { userId } });
}

export async function loadMessages(threadId: string, take = 100): Promise<ChatMessageDto[]> {
  const rows = await db.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take,
    include: { author: { select: { firstName: true, lastName: true } } },
  });
  return rows.map((m) => ({
    id: m.id,
    body: m.body,
    fromAdmin: m.fromAdmin,
    authorName: m.fromAdmin ? "Support" : `${m.author.firstName} ${m.author.lastName}`.trim(),
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function postMessage(opts: {
  threadId: string;
  authorId: string;
  authorName: string;
  fromAdmin: boolean;
  body: string;
}): Promise<ChatMessageDto> {
  const now = new Date();
  const [message] = await db.$transaction([
    db.chatMessage.create({
      data: {
        threadId: opts.threadId,
        authorId: opts.authorId,
        fromAdmin: opts.fromAdmin,
        body: opts.body,
      },
    }),
    db.chatThread.update({
      where: { id: opts.threadId },
      data: {
        lastMessageAt: now,
        // The unread counter belongs to whoever did NOT write the message.
        ...(opts.fromAdmin ? { unreadForUser: { increment: 1 } } : { unreadForAdmin: { increment: 1 } }),
      },
    }),
  ]);

  const dto: ChatMessageDto = {
    id: message.id,
    body: message.body,
    fromAdmin: message.fromAdmin,
    authorName: opts.fromAdmin ? "Support" : opts.authorName,
    createdAt: message.createdAt.toISOString(),
  };

  publish({ type: "message", threadId: opts.threadId, message: dto });
  return dto;
}

export async function markRead(threadId: string, byAdmin: boolean) {
  await db.chatThread.update({
    where: { id: threadId },
    data: byAdmin ? { unreadForAdmin: 0 } : { unreadForUser: 0 },
  });
  publish({ type: "read", threadId, byAdmin });
}

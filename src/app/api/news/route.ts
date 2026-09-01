import { NextResponse } from "next/server";
import { getNews } from "@/lib/news";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET() {
  const items = await getNews(10);
  return NextResponse.json({ items });
}

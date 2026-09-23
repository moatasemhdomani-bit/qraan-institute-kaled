import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const file = await getFile(path.join("/"));
  if (!file) return new NextResponse("لم يُعثر على الملف.", { status: 404 });
  return new NextResponse(Readable.toWeb(file.body) as ReadableStream, {
    headers: { "Content-Type": file.contentType || "application/octet-stream" },
  });
}

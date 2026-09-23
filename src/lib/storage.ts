import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";

const s3 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL,
  forcePathStyle: true,
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME as string;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

export function mimeFromExt(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream";
}

/** يرفع ملفًا إلى دلو التخزين (Railway Bucket) ويُرجع رابطه العام عبر بروكسي /uploads — تخزين دائم، بخلاف قرص الحاوية المؤقت. */
export async function uploadFile(key: string, buf: Buffer, contentType: string): Promise<string> {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buf, ContentType: contentType }));
  return `/uploads/${key}`;
}

/** يجلب ملفًا من الدلو لبثّه عبر مسار /uploads — يُرجع null إن لم يوجد. */
export async function getFile(key: string): Promise<{ body: Readable; contentType?: string } | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    return { body: res.Body as Readable, contentType: res.ContentType };
  } catch {
    return null;
  }
}

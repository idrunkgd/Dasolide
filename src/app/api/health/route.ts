import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Sonde de santé — utilisée par le health check de Coolify.
 * Vérifie que le serveur répond ET que la base est joignable.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "up" });
  } catch {
    return NextResponse.json({ status: "degraded", database: "down" }, { status: 503 });
  }
}

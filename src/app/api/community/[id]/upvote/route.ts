import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import CommunityReport from "@/models/CommunityReport";
import { requireUserId } from "@/lib/session";

export async function PUT(_req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const report = await CommunityReport.findById(params.id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const hasUpvoted = report.upvotes.some((id: { toString(): string }) => id.toString() === userId);

  if (hasUpvoted) {
    report.upvotes = report.upvotes.filter(
      (id: { toString(): string }) => id.toString() !== userId
    );
  } else {
    report.upvotes.push(userId);
  }
  await report.save();

  return NextResponse.json({ upvotes: report.upvotes.length, upvoted: !hasUpvoted });
}

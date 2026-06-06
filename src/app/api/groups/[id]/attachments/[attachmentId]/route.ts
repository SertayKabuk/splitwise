import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroupMembership } from "@/lib/repositories/groupRepository";
import { getAttachmentById, getExpenseByIdAndGroupId } from "@/lib/repositories/expenseRepository";
import fs from "fs";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string; attachmentId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId, attachmentId } = await params;

  // Verify group membership
  const membership = getGroupMembership(groupId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get attachment details
  const attachment = getAttachmentById(attachmentId);
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  // Verify attachment belongs to this group
  const expense = getExpenseByIdAndGroupId(attachment.expense_id, groupId);
  if (!expense) {
    return NextResponse.json({ error: "Attachment not found in this group" }, { status: 404 });
  }

  // Read file from disk
  const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), attachment.file_path);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": attachment.mime_type,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.original_name)}"`,
    },
  });
}

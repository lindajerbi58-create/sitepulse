import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeName, role, date, entries, comments, superiorEmail } = body;

    if (!superiorEmail) {
      return NextResponse.json({ message: "Superior email not found" }, { status: 400 });
    }

    // Mock Email Body Content
    const emailBody = `
Subject: Daily Report - ${employeeName} - ${date}
To: ${superiorEmail}
      
Daily Work Report
-----------------
Name: ${employeeName}
Role: ${role}
Date: ${date}

Work Performed:
${entries.map((e: any) => `- [${e.progress}%] ${e.taskTitle}: ${e.workDescription}${e.comment ? ` (Note: ${e.comment})` : ''}`).join('\n')}

Comments:
${comments || "No additional comments."}
`;

    // Printing to server console acting as mail dispatcher
    console.log("Mock Email Sent:\n", emailBody);

    return NextResponse.json({ message: "Email successfully sent", emailBody });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

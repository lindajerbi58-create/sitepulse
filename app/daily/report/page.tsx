"use client";

import { useUserStore } from "@/store/useUserStore";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DailyReportPage() {
  const { currentUser, users } = useUserStore() as any;
  const router = useRouter();
  
  const [reportData, setReportData] = useState<any>(null);
  const [generalComment, setGeneralComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // superior extraction
  const superiorUser = users.find((u: any) => u._id === currentUser?.reportsTo || u.id === currentUser?.reportsTo);

  useEffect(() => {
    if (currentUser) {
      fetchTodayReport();
    }
  }, [currentUser]);

  const fetchTodayReport = async () => {
    const today = new Date().toISOString().split("T")[0];
    try {
      const res = await fetch(`/api/daily/report?userId=${currentUser._id}&date=${today}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        setGeneralComment(data?.generalComment || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    const today = new Date().toISOString().split("T")[0];
    await fetch("/api/daily/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_REPORT",
        userId: currentUser._id,
        reportDate: today,
        generalComment,
        userFullName: currentUser.fullName,
        userRole: currentUser.role
      })
    });
    alert("Draft saved!");
  };

  const handleSendEmail = async () => {
    if (!superiorUser?.email) {
      alert("No superior email found in hierarchy.");
      return;
    }
    
    setSending(true);
    await handleSaveDraft(); // Implicit save
    
    try {
      const res = await fetch("/api/daily/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeName: currentUser.fullName,
          role: currentUser.role,
          date: new Date().toISOString().split("T")[0],
          entries: reportData?.entries || [],
          comments: generalComment,
          superiorEmail: superiorUser.email
        })
      });
      
      if (res.ok) {
        alert("Daily report emailed successfully!");
        
        // Mark document as sent
        await fetch("/api/daily/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE_REPORT",
            userId: currentUser._id,
            reportDate: new Date().toISOString().split("T")[0],
            isSent: true
          })
        });
        
        fetchTodayReport();
      }
    } catch(e) {
      console.error(e);
      alert("Error sending email");
    } finally {
      setSending(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  if (loading) return <div className="p-8 text-white min-h-screen bg-[#0b1220]">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-[#0b1220] text-gray-200 p-8 print:bg-white print:text-black print:p-0">
      <div className="max-w-4xl mx-auto">
        
        {/* Important Native Warning - Print hidden */}
        <div className="bg-yellow-500/20 border border-yellow-500/50 p-4 rounded-xl text-yellow-200 mb-8 print:hidden text-center font-bold">
          Please send your report before the end of the day.
        </div>
        
        <div className="flex justify-between items-center mb-8 print:hidden">
          <h1 className="text-3xl font-bold text-white">Daily Report Dashboard</h1>
          <Link href="/dashboard" className="px-5 py-2 text-sm font-semibold bg-gray-700 hover:bg-gray-600 rounded-lg shadow-sm">
            Back to Dashboard
          </Link>
        </div>

        {/* Printable Output Area Starts */}
        <div className="bg-[#111827] border border-gray-800 p-10 rounded-2xl shadow-2xl print:bg-white print:border-none print:shadow-none print:p-0">
          
          <div className="border-b border-gray-700 pb-6 mb-8 print:border-gray-400">
            <h1 className="text-4xl font-extrabold text-blue-500 mb-2">SitePulse</h1>
            <h2 className="text-2xl font-bold text-white print:text-black">Daily Execution Report</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-gray-400 print:text-gray-800">
              <div><strong className="text-gray-200 print:text-black">Employee:</strong> {currentUser?.fullName}</div>
              <div><strong className="text-gray-200 print:text-black">Role:</strong> {currentUser?.role}</div>
              <div><strong className="text-gray-200 print:text-black">Date:</strong> {new Date().toLocaleDateString()}</div>
              <div>
                <strong className="text-gray-200 print:text-black">Reporting To:</strong> {superiorUser?.fullName || "None"} 
                {superiorUser?.email && ` (${superiorUser.email})`}
              </div>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-800 pb-3 print:border-gray-300 print:text-black">Work Performed Today</h3>
            
            {(!reportData?.entries || reportData.entries.length === 0) ? (
              <p className="text-gray-500 italic font-medium">No task updates actively recorded today.</p>
            ) : (
              <div className="space-y-6">
                {reportData.entries.map((entry: any, i: number) => (
                  <div key={i} className="bg-[#1f2937] p-6 rounded-xl print:bg-gray-50 print:border print:border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-lg text-blue-400 print:text-blue-700">{entry.taskTitle}</h4>
                      <span className="font-bold bg-blue-900/50 text-blue-300 px-4 py-1 rounded-full text-sm shadow-sm print:bg-blue-100 print:text-blue-800">
                        {entry.progress}% Complete
                      </span>
                    </div>
                    <p className="text-gray-300 mb-2 print:text-black">
                      <strong className="text-gray-400 print:text-gray-600">Action:</strong> {entry.workDescription}
                    </p>
                    {entry.comment && (
                      <p className="text-gray-400 text-sm italic print:text-gray-600">Note: {entry.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-8 print:block">
            <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-800 pb-3 print:text-black print:border-gray-300">General Comments</h3>
            
            <div className="print:hidden">
               <textarea 
                  value={generalComment}
                  onChange={(e) => setGeneralComment(e.target.value)}
                  placeholder="Any overarching blockers, achievements, or notes needed?"
                  className="w-full h-32 bg-[#1f2937] border border-gray-700 p-4 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-inner"
               />
               <button onClick={handleSaveDraft} className="mt-4 px-5 py-2.5 font-semibold bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 shadow transition-colors">
                  Save Draft Comments
               </button>
            </div>
            
            <div className="hidden print:block text-black">
               {generalComment ? <p className="whitespace-pre-wrap leading-relaxed">{generalComment}</p> : <p className="italic text-gray-500">No additional comments entered.</p>}
            </div>
            
          </div>
          
          {reportData?.isSent && (
             <div className="mt-4 text-green-400 font-bold print:text-gray-500 print:text-sm print:font-normal">
               ✓ Report officially sent to manager records
             </div>
          )}
          
        </div>
        {/* Printable Area Ends */}

        <div className="flex flex-wrap justify-center gap-6 mt-10 mb-20 print:hidden">
          <button 
            onClick={handlePrintPdf}
            className="px-8 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-all shadow-xl hover:shadow-slate-600/20 text-lg flex items-center gap-2"
          >
            📄 Export to PDF
          </button>
          <button 
            disabled={sending || reportData?.isSent}
            onClick={handleSendEmail}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-xl hover:shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 text-lg"
          >
            {sending ? "Sending Sequence..." : reportData?.isSent ? "✓ Already Sent" : "✉ Send to Manager"}
          </button>
        </div>

      </div>
    </div>
  );
}

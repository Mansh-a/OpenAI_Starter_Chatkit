import React from "react";
import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fff8f3] dark:bg-[#111827] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Header section */}
      <div className="max-w-6xl w-full mx-auto text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#D9D9D9] dark:border-[#3f4947] rounded-full bg-white dark:bg-[#181d24] text-xs font-semibold text-[#176863] dark:text-[#a7f0e9] mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#67B96D] animate-pulse" />
          Native Vercel & Google Sheets Setup
        </div>
        <h1 className="text-4xl font-serif font-bold text-[#1e1b18] dark:text-[#f6efea] sm:text-5xl tracking-tight mb-3">
          Crocadilo Triage Center
        </h1>
        <p className="max-w-xl mx-auto text-sm text-[#3f4947] dark:text-[#bec9c7] leading-relaxed">
          Refactored high-performance assistant. Handles classifications, generates structured JSON intents, and logs data asynchronously to Google Sheets natively without external services.
        </p>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex items-center justify-center max-w-6xl w-full mx-auto">
        <ChatInterface />
      </div>

      {/* Footer section */}
      <div className="max-w-6xl w-full mx-auto text-center mt-10 pt-6 border-t border-[#D9D9D9]/55 dark:border-[#3f4947]/45 text-[11px] text-[#3f4947]/70 dark:text-[#bec9c7]/75 font-medium tracking-wide uppercase">
        © {new Date().getFullYear()} Crocadilo.com • Refactored Architecture Bypassing n8n Webhooks
      </div>
      
    </main>
  );
}

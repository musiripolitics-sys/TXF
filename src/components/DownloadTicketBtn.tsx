"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import QRCode from "react-qr-code";
import { type TXFEvent } from "@/lib/data";
import { Icon } from "./Icon";

interface Props {
  event: TXFEvent;
  ticketCode: string;
  attendeeName?: string;
  className?: string;
}

export function DownloadTicketBtn({ event, ticketCode, attendeeName, className = "" }: Props) {
  const [downloading, setDownloading] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    try {
      setDownloading(true);
      
      const dataUrl = await toPng(ticketRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `TXF-Ticket-${ticketCode}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to download ticket", err);
      alert("Failed to download ticket. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className={`inline-flex items-center gap-2 rounded-full border border-brand/50 bg-brand/10 px-4 py-2 text-sm font-medium text-brand hover:bg-brand/20 transition-colors disabled:opacity-50 ${className}`}
      >
        <Icon name="arrow-down-tray" className="h-4 w-4" />
        {downloading ? "Downloading..." : "Download Ticket"}
      </button>

      {/* Hidden Ticket Template for Download */}
      <div className="absolute -left-[9999px] top-0 p-8">
        {/* We wrap the ticket in a div with some padding to ensure shadow and cutouts don't clip in html2canvas */}
        <div 
          ref={ticketRef}
          className="w-[900px] h-[480px] flex rounded-3xl bg-white shadow-2xl overflow-hidden relative"
          style={{ fontFamily: "'Inter', sans-serif" }} 
        >
          {/* Subtle grid pattern / dots in background using SVG data URI instead of radial-gradient for html2canvas compatibility */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23FF4F18'/%3E%3C/svg%3E")` }}
          />

          {/* Huge faint TXF watermark */}
          <div className="absolute top-1/2 left-[30%] -translate-y-1/2 -translate-x-1/2 text-[300px] font-black italic text-black/5 pointer-events-none select-none tracking-tighter">
            TXF
          </div>

          {/* Left Side: Details */}
          <div className="flex-1 p-10 flex flex-col justify-between relative z-10">
            {/* Top Logo and Category */}
            <div>
              <div className="mb-8">
                <img src="/logo.png" alt="TXF Logo" className="h-16 w-auto object-contain -ml-2" />
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm font-bold uppercase tracking-widest text-[#FF4F18]">
                  {event.category}
                </span>
                <div className="h-[2px] w-12 bg-[#FF4F18]" />
              </div>

              <h1 className="text-[44px] font-black text-[#1A1A1A] leading-[1.05] tracking-tight uppercase max-w-[600px] mb-4">
                {event.title}
              </h1>
              
              <p className="text-lg text-gray-600 font-medium">
                {event.blurb || "Uniting Ideas. Building Futures. Creating Impact."}
              </p>
            </div>

            {/* Bottom Section */}
            <div>
              <div className="flex items-center gap-4 mb-8">
                {/* Date & Time */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl border-2 border-[#FF4F18]/20 flex items-center justify-center text-[#FF4F18]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Date & Time</p>
                    <p className="text-[#FF4F18] font-bold text-lg leading-tight uppercase">{event.dateLabel}</p>
                    <p className="text-gray-900 text-xs font-semibold">{event.time}</p>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-10 bg-gray-200" />

                {/* Venue */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl border-2 border-[#FF4F18]/20 flex items-center justify-center text-[#FF4F18]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Venue</p>
                    <p className="text-gray-900 font-bold text-lg leading-tight uppercase truncate max-w-[150px]">{event.venue}</p>
                    <p className="text-gray-500 text-xs font-semibold truncate max-w-[150px]">{event.city}</p>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-10 bg-gray-200" />

                {/* Attendee */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl border-2 border-[#FF4F18]/20 flex items-center justify-center text-[#FF4F18]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Attendee</p>
                    <p className="text-gray-900 font-bold text-lg leading-tight uppercase truncate max-w-[150px]">{attendeeName || "Guest"}</p>
                  </div>
                </div>
              </div>

              {/* Bottom Footer */}
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold tracking-widest">
                <div className="text-[#FF4F18]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                </div>
                WWW.TECHXFLUENCE.COM
              </div>
            </div>
          </div>

          {/* Center Perforation Line */}
          <div className="w-0 border-r-2 border-dashed border-gray-300 relative z-20 h-[480px]">
             {/* Top Cutout */}
             <div className="absolute -top-4 -translate-x-1/2 w-8 h-8 rounded-full bg-ink-2"></div>
             {/* Bottom Cutout */}
             <div className="absolute -bottom-4 -translate-x-1/2 w-8 h-8 rounded-full bg-ink-2"></div>
          </div>

          {/* Right Side: QR Code Stub */}
          <div className="w-[280px] bg-white flex flex-col items-center justify-between relative z-10">
            <div className="pt-10 w-full px-8">
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="h-[2px] w-6 bg-[#FF4F18]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-800">
                  Scan For Entry
                </span>
                <div className="h-[2px] w-6 bg-[#FF4F18]" />
              </div>
              
              <div className="flex justify-center relative">
                <div className="p-2 border border-gray-200 rounded-2xl shadow-sm bg-white">
                  <QRCode 
                    value={ticketCode} 
                    size={160}
                    level="H"
                    fgColor="#1A1A1A"
                  />
                </div>
                {/* Logo Overlaid on QR */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#1A1A1A] rounded-lg flex items-center justify-center border-2 border-white">
                  <span className="text-white text-xs font-black italic tracking-tighter">TX<span className="text-[#FF4F18]">F</span></span>
                </div>
              </div>

              <div className="mt-8 text-center border-t border-dashed border-gray-300 pt-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Ticket Code</p>
                <p className="text-[#FF4F18] font-mono font-bold tracking-widest text-2xl">{ticketCode.toUpperCase()}</p>
              </div>
            </div>

            <div className="w-full h-[60px] bg-[#FF4F18] flex items-center justify-center gap-3 text-white">
              <span className="text-lg">✦</span>
              <span className="text-sm font-bold uppercase tracking-widest">Admit One</span>
              <span className="text-lg">✦</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

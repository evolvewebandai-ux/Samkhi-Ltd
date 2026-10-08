import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, ShieldCheck, MailWarning, CalendarClock, Users, CheckCircle } from 'lucide-react';

interface SystemHealthPanelProps {
  failedCount?: number;
}

/**
 * SystemHealthPanel in Gentelella styling
 * Integration health tiles with #1ABB9C active signals, #E6E9ED borders,
 * and high-contrast light typography.
 */
export default function SystemHealthPanel({ failedCount = 0 }: SystemHealthPanelProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3 font-sans text-xs">
      <div className="grid grid-cols-2 gap-2.5">
        {/* SendGrid */}
        <div className="p-2.5 bg-white rounded-[3px] border border-[#E6E9ED] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#73879C] uppercase tracking-wider text-[9px]">SendGrid Mailer</span>
            <span className="w-2 h-2 rounded-full bg-[#1ABB9C] shrink-0" />
          </div>
          <p className="font-bold text-[#2A3F54] text-xs sm:text-sm">CONNECTED</p>
          <div className="text-[10px] text-[#73879C] font-mono">98.4% delivery rate</div>
        </div>

        {/* Fygaro */}
        <div className="p-2.5 bg-white rounded-[3px] border border-[#E6E9ED] space-y-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#73879C] uppercase tracking-wider text-[9px]">Fygaro Gateway</span>
            <span className="w-2 h-2 rounded-full bg-[#1ABB9C] shrink-0 animate-ping" />
          </div>
          <p className="font-bold text-[#2A3F54] text-xs sm:text-sm">ACTIVE</p>
          <div className="text-[10px] text-[#73879C] font-mono">Webhook status green</div>
        </div>

        {/* Firestore */}
        <div className="p-2.5 bg-white rounded-[3px] border border-[#E6E9ED] space-y-1 col-span-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#73879C] uppercase tracking-wider text-[9px]">Firestore Real-time DB</span>
            <span className="inline-flex items-center gap-1 text-[#1ABB9C] bg-[#1ABB9C]/10 border border-[#1ABB9C]/30 px-2 py-0.5 rounded-[3px] text-[9px] font-bold uppercase font-mono">
              <CheckCircle size={10} /> Operational
            </span>
          </div>
          <p className="text-[#2A3F54] text-[11px] leading-relaxed">
            Real-time listener sockets operational. Sync mode active on port 3000.
          </p>
        </div>
      </div>

      {/* Mini ledger stats */}
      <div className="space-y-1.5 border-t border-[#E6E9ED] pt-2.5">
        <div 
          onClick={() => navigate('/admin/notifications')}
          className="flex items-center justify-between p-2 hover:bg-[#F9F9F9] rounded-[3px] cursor-pointer transition-colors border border-dashed border-[#E6E9ED]"
        >
          <span className="flex items-center gap-2 text-[#2A3F54] font-medium text-xs">
            {failedCount > 0 ? (
              <MailWarning size={14} className="text-[#F39C12] animate-pulse" />
            ) : (
              <Server size={14} className="text-[#73879C]" />
            )}
            Failed Mail Queue
          </span>
          {failedCount > 0 ? (
            <span className="px-2 py-0.5 bg-amber-50 text-[#F39C12] border border-amber-200 rounded-[3px] font-mono font-bold text-[10px]">
              {failedCount} failed
            </span>
          ) : (
            <span className="text-[#73879C] text-[11px] font-mono">0 in queue</span>
          )}
        </div>

        <div className="flex items-center justify-between p-2 border border-[#E6E9ED] bg-[#FAFAFA] rounded-[3px] text-xs text-[#2A3F54]">
          <span className="flex items-center gap-2 font-medium">
            <CalendarClock size={14} className="text-[#73879C]" />
            Last Automated Snapshot
          </span>
          <span className="font-mono text-[#73879C] text-[11px]">03:00 AM (UTC-5)</span>
        </div>

        <div className="flex items-center justify-between p-2 border border-[#E6E9ED] bg-[#FAFAFA] rounded-[3px] text-xs text-[#2A3F54]">
          <span className="flex items-center gap-2 font-medium">
            <Users size={14} className="text-[#73879C]" />
            Active Administrator Sessions
          </span>
          <span className="font-mono text-[#1ABB9C] font-bold text-[11px]">2 online</span>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Order, TimelineEntry } from '../../types';
import { 
  MessageSquare, 
  Settings, 
  Mail, 
  Paperclip, 
  Plus, 
  Send,
  Loader2,
  FileCode,
  Calendar
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { showToast } from '../../lib/toast';
import { cn } from '../../lib/utils';

interface OrderStatusHistoryProps {
  order: Order;
}

export default function OrderStatusHistory({ order }: OrderStatusHistoryProps) {
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAdminAuth();
  const activeOperatorEmail = user?.email || 'admin@samkhi.com';

  const timelineEntries = order.timeline || [];

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSending(true);
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-US');
    const fullTimestamp = `${timeStr} ${dateStr}`;

    const newComment: TimelineEntry = {
      id: `tl_user_comment_${Date.now()}`,
      type: 'comment',
      content: commentText.trim(),
      timestamp: fullTimestamp,
      author: activeOperatorEmail
    };

    try {
      const docRef = doc(db, 'orders', order.id);
      await updateDoc(docRef, {
        timeline: arrayUnion(newComment)
      });
      setCommentText('');
      showToast('Timeline comment posted successfully.', 'success');
    } catch (err: any) {
      console.error('Failed to post timeline comment:', err);
      showToast('Error saving comment: ' + err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const getTimelineIcon = (type: 'comment' | 'system' | 'email') => {
    switch (type) {
      case 'comment':
        return <MessageSquare size={14} className="text-blue-600" />;
      case 'system':
        return <Settings size={14} className="text-slate-600" />;
      case 'email':
        return <Mail size={14} className="text-purple-600" />;
      default:
        return <MessageSquare size={14} />;
    }
  };

  const getTimelineBg = (type: 'comment' | 'system' | 'email') => {
    switch (type) {
      case 'comment':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'system':
        return 'bg-slate-50 border-slate-200 text-slate-800';
      case 'email':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-slate-50';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm w-full font-sans">
      <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
        <Calendar size={14} />
        Order Life Timeline & Audit Trail
      </h3>

      {/* TIMELINE LIST */}
      <div className="relative border-l-2 border-slate-100 pl-6 ml-2.5 pb-2 min-h-[100px] space-y-6">
        {timelineEntries.length === 0 ? (
          <div className="absolute top-1 left-6">
            <p className="text-xs text-slate-400 font-medium italic">No timeline history recorded for this order yet.</p>
          </div>
        ) : (
          timelineEntries.map((entry, index) => {
            const iconBg = getTimelineBg(entry.type);
            const isSystem = entry.type === 'system';
            const isEmail = entry.type === 'email';

            return (
              <div key={entry.id || index} className="relative group/time">
                {/* Visual Connector Dot */}
                <div className={cn(
                  "absolute -left-[37px] top-1 w-6 h-6 rounded-full flex items-center justify-center border text-[10px]",
                  iconBg
                )}>
                  {getTimelineIcon(entry.type)}
                </div>

                {/* Entry Header */}
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] text-slate-400 font-bold">{entry.timestamp}</span>
                  {entry.author && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {entry.author.split('@')[0]}
                    </span>
                  )}
                  {isSystem && (
                    <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200/50 px-1 py-0.2 rounded uppercase font-black tracking-widest">
                      SYSTEM
                    </span>
                  )}
                  {isEmail && (
                    <span className="text-[9px] bg-purple-100 text-purple-700 border border-purple-200/30 px-1 py-0.2 rounded uppercase font-black tracking-widest">
                      DISPATCH
                    </span>
                  )}
                </div>

                {/* Entry content (interprets simple bold markdown inside timelines) */}
                <div className="mt-1.5 text-xs text-slate-700 font-medium leading-relaxed max-w-2xl pl-1 text-slate-600">
                  <p 
                    dangerouslySetInnerHTML={{ 
                      __html: entry.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-900">$1</strong>')
                        .replace(/_(.*?)_/g, '<em class="italic text-slate-800">$1</em>')
                    }} 
                  />
                </div>

                {/* Optional Attachments */}
                {entry.attachments && entry.attachments.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2 pl-1">
                    {entry.attachments.map((file, fIdx) => (
                      <a
                        key={fIdx}
                        href={file.url}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200/50 transition-colors shrink-0"
                      >
                        <FileCode size={11} />
                        <span>{file.name}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* POST Timelime Comment box */}
      <div className="border-t border-slate-100 mt-6 pt-6">
        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3 block">Append Log Comment / Manual Note</h4>
        <form onSubmit={handlePostComment} className="flex gap-3">
          <input
            type="text"
            required
            placeholder="Type comment or note detail to append to this order's team timeline..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={sending}
            className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-4 h-11 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-black focus:bg-white placeholder:text-slate-400 transition-all"
          />
          <button
            type="submit"
            disabled={sending || !commentText.trim()}
            className="bg-black hover:bg-slate-800 disabled:opacity-40 text-white font-bold h-11 px-5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-slate-100 select-none"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            <span>Post Note</span>
          </button>
        </form>
      </div>
    </div>
  );
}

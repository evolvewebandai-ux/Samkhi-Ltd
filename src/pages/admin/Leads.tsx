import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { 
  Search, 
  Filter, 
  Target, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Building2, 
  FileText, 
  Trash2, 
  Check, 
  User, 
  Clock, 
  SlidersHorizontal,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/toast';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  parish?: string;
  monthlyBill?: string;
  propertyType?: 'Residential' | 'Commercial';
  source: string; // 'solar-solutions' | 'scaler-savings-today' | 'contact-message'
  subject?: string;
  message?: string;
  notes?: string;
  stage: 'new' | 'contacted' | 'assigned' | 'qualified' | 'closed';
  createdAt: string;
}

const STAGES = [
  { id: 'new', label: 'New', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'contacted', label: 'Contacted', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'assigned', label: 'Assigned', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'qualified', label: 'Qualified', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'closed', label: 'Closed / Won', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
];

const SOURCES = {
  'solar-solutions': { label: 'Solar Assessment Form', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  'scaler-savings-today': { label: 'Scale Your Savings Form', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  'contact-message': { label: 'Contact Message Form', color: 'bg-[#101F30]/5 text-[#101F30] border-slate-200' },
  'newsletter-subscription': { label: 'Newsletter Subscription Form', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
};

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [notesEdit, setNotesEdit] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);

  // Synchronize leads in real-time from Firestore
  useEffect(() => {
    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLeads: Lead[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedLeads.push({
          id: doc.id,
          ...data
        } as Lead);
      });
      setLeads(fetchedLeads);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to leads stream:", error);
      showToast("Failed to load real-time portal leads.", "error");
      handleFirestoreError(error, OperationType.GET, 'leads');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  // Keep notes synchronized when selectedLead changes
  useEffect(() => {
    if (selectedLead) {
      setNotesEdit(selectedLead.notes || '');
    } else {
      setNotesEdit('');
    }
  }, [selectedLeadId, selectedLead?.id]);

  const handleUpdateStage = async (leadId: string, flag: 'new' | 'contacted' | 'assigned' | 'qualified' | 'closed') => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, { stage: flag });
      showToast(`Lead status marked as ${flag.toUpperCase()}!`, 'success');
    } catch (err) {
      console.error("Error updating lead stage:", err);
      showToast("Failed to change stage status.", "error");
      handleFirestoreError(err, OperationType.UPDATE, `leads/${leadId}`);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedLeadId) return;
    setIsSavingNotes(true);
    try {
      const leadRef = doc(db, 'leads', selectedLeadId);
      await updateDoc(leadRef, { notes: notesEdit.trim() });
      showToast("Lead discussion notes saved successfully!", "success");
    } catch (err) {
      console.error("Error updating lead notes:", err);
      showToast("Failed to save follow-up notes.", "error");
      handleFirestoreError(err, OperationType.UPDATE, `leads/${selectedLeadId}`);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      showToast("Website lead has been deleted successfully.", "success");
      if (selectedLeadId === leadId) {
        setSelectedLeadId(null);
      }
      setDeletingLeadId(null);
    } catch (err) {
      console.error("Error deleting lead:", err);
      showToast("Failed to remove website lead.", "error");
      handleFirestoreError(err, OperationType.DELETE, `leads/${leadId}`);
    }
  };

  // Filter leads based on filters and search
  const filteredLeads = leads.filter(l => {
    const matchesSearch = 
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone && l.phone.includes(search)) ||
      (l.message && l.message.toLowerCase().includes(search.toLowerCase()));

    const matchesStage = stageFilter === 'All' || l.stage === stageFilter;
    const matchesSource = sourceFilter === 'All' || l.source === sourceFilter;

    return matchesSearch && matchesStage && matchesSource;
  });

  const getSourceDisplay = (source: string) => {
    return SOURCES[source as keyof typeof SOURCES] || { label: source, color: 'bg-zinc-100 text-zinc-800' };
  };

  return (
    <div id="leads-container" className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-black text-blue-600 block mb-1">CRM Channels</span>
          <h1 className="text-2xl font-black text-[#1E293B] flex items-center gap-2 font-display">
            <Target size={26} className="text-blue-600" />
            Website Leads Inbox
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline monitoring for user submissions, product queries, and solar consulting requests.
          </p>
        </div>
        <div className="bg-white px-4 py-2 border border-[#e3e3e3] rounded-lg text-xs font-semibold text-[#1e1e1e] shadow-sm flex items-center gap-2 font-mono">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse border-2 border-white" />
          {leads.length} LEADS REGISTERED
        </div>
      </div>

      {/* Main Core Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Master Table/List */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Search, filters, controls */}
          <div className="bg-white border border-[#e3e3e3] rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* SearchBar */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter name, email, phone number, messages..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-xs font-medium outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all text-[#1a1a1a]"
                />
                {search && (
                  <button 
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filters toggle */}
              <div className="flex gap-2">
                <select 
                  value={stageFilter}
                  onChange={e => setStageFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-[#333] outline-none cursor-pointer focus:bg-white focus:border-blue-600 transition-all text-ellipsis"
                >
                  <option value="All">All Stages</option>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>

                <select 
                  value={sourceFilter}
                  onChange={e => setSourceFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-[#333] outline-none cursor-pointer focus:bg-white focus:border-blue-600 transition-all text-ellipsis"
                >
                  <option value="All">All Completed Forms</option>
                  {Object.entries(SOURCES).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table Container Cards List */}
          <div className="bg-white border border-[#e3e3e3] rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Syncing Firestore Feed...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="py-24 text-center max-w-md mx-auto space-y-4 px-4">
                <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 mx-auto">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-secondary text-base">No Leads Found</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    No website form submissions match your current query fields. Clear search text or adjust selection filters.
                  </p>
                </div>
                {(search || stageFilter !== 'All' || sourceFilter !== 'All') && (
                  <button 
                    onClick={() => {
                      setSearch('');
                      setStageFilter('All');
                      setSourceFilter('All');
                    }}
                    className="px-4 py-2 border border-[#e3e3e3] text-[#1a1a1a] hover:bg-zinc-50 rounded-lg font-bold text-xs tracking-wide active:scale-95 transition-all"
                  >
                    Reset Inbox Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#e3e3e3] text-[10px] font-black text-[#616161] uppercase tracking-wider font-mono">
                      <th className="px-5 py-3">Completed Form</th>
                      <th className="px-5 py-3">Lead Subject</th>
                      <th className="px-5 py-3">Capture Date</th>
                      <th className="px-5 py-3">Flow Stage</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f1f1]">
                    {filteredLeads.map((lead) => {
                      const isChosen = selectedLeadId === lead.id;
                      const sourceConf = getSourceDisplay(lead.source);
                      const currentStage = STAGES.find(s => s.id === lead.stage) || { label: lead.stage, color: 'bg-zinc-50 border-zinc-200 text-zinc-700' };

                      return (
                        <tr 
                          key={lead.id}
                          className={cn(
                            "group hover:bg-[#fafafa] cursor-pointer transition-colors text-xs text-[#1e1e1e]",
                            isChosen ? "bg-blue-50/40 hover:bg-blue-50/65" : ""
                          )}
                          onClick={() => setSelectedLeadId(lead.id)}
                        >
                          {/* Channel */}
                          <td className="px-5 py-4">
                            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", sourceConf.color)}>
                              {sourceConf.label}
                            </span>
                          </td>

                          {/* Lead Profile Brief */}
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                              {lead.name}
                              {lead.notes && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full" title="Contains internal follow up notes" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5 font-mono">
                              {lead.email}
                            </div>
                          </td>

                          {/* Time */}
                          <td className="px-5 py-4 font-mono text-[10.5px] text-slate-400">
                            {new Date(lead.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric'
                            })}
                            <span className="block text-[9px] mt-0.5">
                              {new Date(lead.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>

                          {/* Stage Dropdown Select */}
                          <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                            <select 
                              value={lead.stage}
                              onChange={e => handleUpdateStage(lead.id, e.target.value as any)}
                              className={cn(
                                "border px-2.5 py-1 text-[11px] font-black uppercase rounded-lg outline-none cursor-pointer tracking-wider",
                                currentStage.color
                              )}
                            >
                              {STAGES.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>
                          </td>

                          {/* Detail Toggle Trigger */}
                          <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => setSelectedLeadId(lead.id)}
                                className="p-1 px-2 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                                title="View details"
                              >
                                <ChevronRight size={16} />
                              </button>
                              <button 
                                onClick={() => setDeletingLeadId(lead.id)}
                                className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                                title="Delete Lead"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Detail Inspector Sidebar / Notes Container */}
        <div id="inspector-card" className="space-y-4">
          <AnimatePresence mode="wait">
            {!selectedLead ? (
              <motion.div 
                key="empty-inspector"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white border border-[#e3e3e3] rounded-xl p-8 text-center text-slate-500 shadow-sm align-middle h-full flex flex-col justify-center py-24"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-4">
                  <FileText size={20} />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">Lead Details Card</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  Select a specific lead from the pipeline list to view structured form parameters and log discussion action notes.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedLead.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white border border-[#e3e3e3] rounded-xl shadow-sm overflow-hidden flex flex-col h-full font-sans"
              >
                {/* Header Profile Title card block */}
                <div className="p-5 border-b border-[#f1f1f1] bg-slate-50 flex justify-between items-start">
                  <div className="space-y-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider",
                      getSourceDisplay(selectedLead.source).color
                    )}>
                      {getSourceDisplay(selectedLead.source).label}
                    </span>
                    <h3 className="font-bold text-slate-800 text-base">{selectedLead.name}</h3>
                    <div className="text-[10px] text-slate-400 font-mono tracking-tight">{selectedLead.id}</div>
                  </div>
                  <button 
                    onClick={() => setSelectedLeadId(null)}
                    className="p-1 hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 rounded-full transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Sub-fields detail list section */}
                <div className="p-5 space-y-5 overflow-y-auto">
                  
                  {/* Customer Information Contact Info */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-[#f1f1f1] pb-1.5 flex items-center gap-1">
                      <User size={12} /> Contact Profile
                    </h4>
                    
                    <div className="space-y-2 text-xs">
                      {/* Email address */}
                      <a 
                        href={`mailto:${selectedLead.email}`}
                        className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-semibold truncate transition-colors py-1 group/link"
                      >
                        <Mail size={14} className="text-slate-400 group-hover/link:text-blue-500 shrink-0" />
                        <span className="truncate">{selectedLead.email}</span>
                        <ArrowUpRight size={13} className="text-slate-300 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
                      </a>

                      {/* Phone number */}
                      {selectedLead.phone && (
                        <a 
                          href={`tel:${selectedLead.phone}`}
                          className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-semibold transition-colors py-1 group/link"
                        >
                          <Phone size={14} className="text-slate-400 group-hover/link:text-blue-500 shrink-0" />
                          <span>{selectedLead.phone}</span>
                          <ArrowUpRight size={13} className="text-slate-300 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
                        </a>
                      )}

                      {/* Registration Date */}
                      <div className="flex items-center gap-2 text-slate-500 font-medium py-1">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <span>Registered {new Date(selectedLead.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Form Submission Payload Metadata (Displays variables dynamically if they exist) */}
                  {(selectedLead.parish || selectedLead.propertyType || selectedLead.monthlyBill || selectedLead.subject) && (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-[#ececed] pb-1.5 flex items-center gap-1">
                        <Building2 size={12} /> Submission Scope
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-3 text-[11px] font-medium text-slate-600">
                        {/* Selected parish */}
                        {selectedLead.parish && (
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Parish</span>
                            <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                              <MapPin size={11} className="text-blue-500 shrink-0" /> {selectedLead.parish}
                            </span>
                          </div>
                        )}

                        {/* Property Type */}
                        {selectedLead.propertyType && (
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Property Type</span>
                            <span className="font-bold text-slate-800 block mt-0.5">
                              {selectedLead.propertyType}
                            </span>
                          </div>
                        )}

                        {/* Power Bill */}
                        {selectedLead.monthlyBill && (
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Avg Monthly Bill (J$)</span>
                            <span className="font-bold text-emerald-700 flex items-center gap-0.5 mt-0.5">
                              JMD ${selectedLead.monthlyBill}
                            </span>
                          </div>
                        )}

                        {/* Contact Subject */}
                        {selectedLead.subject && (
                          <div className="col-span-2">
                            <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Form Subject</span>
                            <span className="font-bold text-slate-800 block mt-0.5">
                              {selectedLead.subject}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Message body */}
                  {selectedLead.message && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-[#f1f1f1] pb-1.5 flex items-center gap-1">
                        <FileText size={12} /> User Message
                      </h4>
                      <p className="text-xs text-slate-600 bg-slate-50/50 p-4 border border-slate-100 rounded-xl leading-relaxed whitespace-pre-wrap">
                        {selectedLead.message}
                      </p>
                    </div>
                  )}

                  {/* Internal Notes CRM Field */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-[#f1f1f1] pb-1.5">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Clock size={12} /> Follow-Up Discussion Notes
                      </h4>
                      {selectedLead.notes && (
                        <span className="text-[9px] text-slate-500 font-mono">Contains saved logs</span>
                      )}
                    </div>
                    
                    <div className="space-y-2.5">
                      <textarea 
                        rows={5}
                        value={notesEdit}
                        onChange={e => setNotesEdit(e.target.value)}
                        placeholder="Log active client touchpoints, notes, callbacks, or quote outcomes here..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs md:text-[11.5px] outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all font-medium leading-relaxed resize-none text-slate-700"
                      />
                      <button 
                        onClick={handleSaveNotes}
                        disabled={isSavingNotes || notesEdit.trim() === (selectedLead.notes || '')}
                        className={cn(
                          "w-full py-2 bg-blue-600 hover:bg-blue-700 text-white hover:text-white rounded-lg flex items-center justify-center gap-1.5 font-bold text-xs tracking-wider uppercase transition-all shadow active:scale-95",
                          (notesEdit.trim() === (selectedLead.notes || '')) ? "opacity-40 cursor-not-allowed bg-slate-300 shadow-none hover:bg-slate-300 hover:text-white" : ""
                        )}
                      >
                        {isSavingNotes ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                            Updating Notes...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} />
                            Save Internal Notes
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Operational Settings */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-[#f1f1f1] pb-1.5 flex items-center gap-1 text-red-600">
                      Pipeline Administration Action
                    </h4>
                    
                    <button 
                      onClick={() => setDeletingLeadId(selectedLead.id)}
                      className="w-full py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-600 hover:text-white flex items-center justify-center gap-2 font-bold text-xs tracking-wider uppercase transition-colors"
                    >
                      <Trash2 size={13} />
                      Purge Lead Account Document
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Delete Lead Modal Confirmation Overlay */}
      <AnimatePresence>
        {deletingLeadId && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingLeadId(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white border border-[#e3e3e3] rounded-lg shadow-xl z-[60] overflow-hidden p-6 text-center font-sans"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
                <Trash2 size={22} />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Purge CRM Contact?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Are you absolutely sure you want to permanently delete this lead? This document will be completely removed from the pipeline registry.
              </p>
              
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setDeletingLeadId(null)}
                  className="flex-1 py-2 px-4 border border-[#e3e3e3] rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => deletingLeadId && handleDeleteLead(deletingLeadId)}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 active:scale-95 transition-all shadow"
                >
                  Delete Document
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

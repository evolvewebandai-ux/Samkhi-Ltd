import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Mail, 
  Settings, 
  ClipboardList, 
  Bell, 
  Eye, 
  Code, 
  Check, 
  X,
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Play, 
  Search, 
  Sparkles, 
  ChevronRight,
  Send,
  Sliders,
  CheckCircle2,
  Trash2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../lib/toast';
import BulkActionBar from '../../components/admin/BulkActionBar';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

// Initialize Firebase client SDK
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

interface Template {
  id: string;
  name: string;
  description: string;
  event_trigger: string;
  channel: 'email';
  is_active: boolean;
  subject: string;
  preheader?: string;
  body_html: string;
  body_text?: string;
  variables: string[];
}

interface LogEntry {
  id: string;
  template_id: string;
  event_trigger: string;
  to_email: string;
  order_id?: string;
  status: 'sent' | 'failed' | 'queued' | 'delivered';
  sendgrid_message_id?: string;
  error?: string;
  sent_at: string;
}

export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState<'templates' | 'logs' | 'settings'>('templates');

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const selectedCount = Object.keys(selectedIds).filter(id => selectedIds[id]).length;

  // Clear selections on tab switch
  useEffect(() => {
    setSelectedIds({});
  }, [activeTab]);

  const handleBulkTemplatesStatus = async (is_active: boolean) => {
    setBulkLoading(true);
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    try {
      await Promise.all(ids.map(id => updateDoc(doc(db, 'notification_templates', id), { is_active })));
      // Refresh list
      await fetchTemplates();
      showToast(`Successfully set ${ids.length} templates to ${is_active ? 'ACTIVE' : 'OFF'}!`, 'success');
      setSelectedIds({});
    } catch (e) {
      showToast('Error editing mail templates status state.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };
  
  // States for Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  
  // Editor States for Selected Template
  const [editorSubject, setEditorSubject] = useState('');
  const [editorPreheader, setEditorPreheader] = useState('');
  const [editorBodyHtml, setEditorBodyHtml] = useState('');
  const [editorIsActive, setEditorIsActive] = useState(true);
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');
  const [activeField, setActiveField] = useState<'subject' | 'body_html'>('body_html');
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  // Live Test State
  const [testToEmail, setTestToEmail] = useState('admin@samkhi.com');
  const [testOrderId, setTestOrderId] = useState('#90281');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState('');
  const [testErrorMessage, setTestErrorMessage] = useState('');

  // States for Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsFilterTrigger, setLogsFilterTrigger] = useState('all');
  const [logsFilterStatus, setLogsFilterStatus] = useState('all');

  // States for Settings
  const [settings, setSettings] = useState({
    default_from_name: 'Jamaica Solar Store',
    default_from_email: 'noreply@samkhi.com',
    reply_to_email: 'support@samkhi.com',
    bcc_admin: true,
    admin_email: 'admin@samkhi.com'
  });
  const [customApiKey, setCustomApiKey] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  // Domain verification helper message
  const isDomainVerified = useMemo(() => {
    const email = settings.default_from_email || '';
    if (!email.includes('@')) return false;
    const parts = email.split('@');
    const domain = parts[parts.length - 1]?.toLowerCase() || '';
    // Let user know samkhi.com is standard domain
    return domain === 'samkhi.com';
  }, [settings.default_from_email]);

  // Load Templates
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const snap = await getDocs(collection(db, 'notification_templates'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Template));
      // Sort templates alphabetically by name
      list.sort((a, b) => a.name.localeCompare(b.name));
      setTemplates(list);
      
      if (list.length > 0) {
        // Retain selection if valid, else select first
        const currentId = selectedTemplate?.id;
        const exists = list.find(t => t.id === currentId);
        selectTemplate(exists || list[0]);
      }
    } catch (e) {
      console.error("Error reading templates from Firestore:", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Load Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(collection(db, 'notification_logs'), orderBy('sent_at', 'desc'), limit(150));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogEntry));
      setLogs(list);
    } catch (e) {
      console.error("Error reading logs from Firestore:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Load Settings
  const fetchSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'notifications'));
      if (snap.exists()) {
        const d = snap.data();
        setSettings({
          default_from_name: d.default_from_name || 'Jamaica Solar Store',
          default_from_email: d.default_from_email || 'noreply@samkhi.com',
          reply_to_email: d.reply_to_email || 'support@samkhi.com',
          bcc_admin: d.bcc_admin !== undefined ? d.bcc_admin : true,
          admin_email: d.admin_email || 'admin@samkhi.com'
        });
      }
    } catch (e) {
      console.warn("Could not load setting file from firestore:", e);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const selectTemplate = (t: Template) => {
    setSelectedTemplate(t);
    setEditorSubject(t.subject);
    setEditorPreheader(t.preheader || '');
    setEditorBodyHtml(t.body_html);
    setEditorIsActive(t.is_active);
    setEditorTab('edit');
    // For test messaging responses
    setTestSuccessMessage('');
    setTestErrorMessage('');
  };

  // Autocomplete/clickable pills variable helper insertion
  const handlePillClick = (v: string) => {
    const wrappedVar = `{{${v}}}`;
    if (activeField === 'subject') {
      setEditorSubject(prev => prev + wrappedVar);
    } else {
      setEditorBodyHtml(prev => prev + wrappedVar);
    }
  };

  // Save changes to current template
  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    setSavingTemplate(true);
    try {
      const docRef = doc(db, 'notification_templates', selectedTemplate.id);
      const updatedData = {
        subject: editorSubject,
        preheader: editorPreheader,
        body_html: editorBodyHtml,
        is_active: editorIsActive,
        updated_at: new Date().toISOString(),
        updated_by: "Administrator Manager Control Panel"
      };
      
      await updateDoc(docRef, updatedData);
      
      // Update local state list transparently
      setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? { ...t, ...updatedData } : t));
      setSelectedTemplate(prev => prev ? { ...prev, ...updatedData } : null);
      
      setTestSuccessMessage("✓ Template changes recorded successfully in database!");
      setTimeout(() => setTestSuccessMessage(''), 4000);
    } catch (e: any) {
      setTestErrorMessage(`Firestore rule error saving: ${e.message}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Send Test Email live from editorial sandbox
  const handleSendTest = async () => {
    if (!selectedTemplate) return;
    setSendingTest(true);
    setTestSuccessMessage('');
    setTestErrorMessage('');
    
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          to_email: testToEmail,
          order_id: testOrderId,
          subject: editorSubject,
          body_html: editorBodyHtml
        })
      });

      const resData = await response.json();
      if (response.ok) {
        setTestSuccessMessage(resData.message || "🟢 Live-rendered test notification sent successfully!");
      } else {
        setTestErrorMessage(resData.error || "Failed sending test email checkout.");
      }
    } catch (err: any) {
      setTestErrorMessage(err.message || "An exception error occurred while dispatching test.");
    } finally {
      setSendingTest(false);
    }
  };

  // Test Connection to SendGrid
  const handleTestConnection = async () => {
    if (!customApiKey) {
      setConnectionError("Please input a valid SendGrid Api Key credentials first.");
      return;
    }
    setTestingConnection(true);
    setConnectionMessage('');
    setConnectionError('');
    try {
      const response = await fetch('/api/notifications/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: customApiKey })
      });
      const data = await response.json();

      if (response.ok) {
        setConnectionMessage(data.message || "✓ Successfully authenticated with SendGrid API!");
      } else {
        setConnectionError(data.error || "Authentication failed. Double check your SendGrid key API.");
      }
    } catch (err: any) {
      setConnectionError(err.message || "Connection network error.");
    } finally {
      setTestingConnection(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      await setDoc(doc(db, 'settings', 'notifications'), {
        ...settings,
        updated_at: new Date().toISOString()
      });
      setSettingsMessage("✓ System configurations successfully stored!");
      setTimeout(() => setSettingsMessage(''), 4000);
    } catch (e: any) {
      console.error("Settings save error:", e);
      setSettingsMessage(`Error writing settings: ${e.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  // Render dummy live compiled variables preview body HTML
  const getCompiledPreviewBody = () => {
    let mockValues: Record<string, string> = {
      customer_name: "Nils J. Patterson",
      order_number: testOrderId || "#90281",
      fulfillment_type: "Courier delivery",
      shipping_parish: "St. James",
      shipping_cost: "$3,500 JMD",
      subtotal: "$385,000 JMD",
      grand_total: "$388,500 JMD",
      shipping_address: "15 Sunset Blvd, Montego Bay, St. James",
      pickup_location_name: "Kingston Main Warehouse",
      pickup_location_address: "12 Constant Spring Road, Kingston 10",
      pickup_hours: "Mon - Fri, 8:00 AM - 5:00 PM",
      date: new Date().toLocaleDateString('en-US'),
      tracking_link: "https://samkhi.com/track/90281",
      cancellation_reason: "Customer requested cancellation with full refund",
      product_name: "400W Monocrystalline Panel",
      available: "4",
      product_sku: "JAM-SLR-400W",
      order_items_table: `
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-family: 'Poppins', sans-serif; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; background-color: #f1f5f9;">
              <th style="padding: 8px; font-weight: 600;">Product</th>
              <th style="padding: 8px; font-weight: 600; text-align: center;">Qty</th>
              <th style="padding: 8px; font-weight: 600; text-align: right;">Price</th>
              <th style="padding: 8px; font-weight: 600; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px;">400W Monocrystalline Solar Panel</td>
              <td style="padding: 8px; text-align: center;">6</td>
              <td style="padding: 8px; text-align: right;">$60,000 JMD</td>
              <td style="padding: 8px; text-align: right; font-weight: 600;">$360,000 JMD</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px;">3KW Off-Grid Hybrid Inverter</td>
              <td style="padding: 8px; text-align: center;">1</td>
              <td style="padding: 8px; text-align: right;">$25,000 JMD</td>
              <td style="padding: 8px; text-align: right; font-weight: 600;">$25,000 JMD</td>
            </tr>
          </tbody>
        </table>
      `
    };

    let compiled = editorBodyHtml;
    for (const [key, value] of Object.entries(mockValues)) {
      const rx = new RegExp(`{{${key}}}`, 'g');
      compiled = compiled.replace(rx, value);
    }
    return compiled;
  };

  // Filtered Logs matching search
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const searchMatch = !logsSearch || 
        log.to_email.toLowerCase().includes(logsSearch.toLowerCase()) ||
        log.template_id.toLowerCase().includes(logsSearch.toLowerCase()) ||
        (log.order_id && log.order_id.toLowerCase().includes(logsSearch.toLowerCase())) ||
        (log.sendgrid_message_id && log.sendgrid_message_id.toLowerCase().includes(logsSearch.toLowerCase()));
        
      const triggerMatch = logsFilterTrigger === 'all' || log.event_trigger === logsFilterTrigger;
      const statusMatch = logsFilterStatus === 'all' || log.status === logsFilterStatus;

      return searchMatch && triggerMatch && statusMatch;
    });
  }, [logs, logsSearch, logsFilterTrigger, logsFilterStatus]);

  return (
    <div className="max-w-7xl mx-auto p-6 font-sans">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Bell size={24} className="text-blue-600" />
            Notification Manager
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Administer transactional automated emails, configure SendGrid services, and audit real-time dispatch logs.
          </p>
        </div>
        
        {/* Navigation Tabs bar */}
        <div className="bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 flex gap-1 self-stretch sm:self-auto shadow-inner">
          <button 
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'templates' ? 'bg-white text-blue-700 shadow-md border-zinc-200' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Mail size={14} />
            Email Templates
          </button>
          
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'logs' ? 'bg-white text-blue-700 shadow-md border-zinc-200' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <ClipboardList size={14} />
            Delivery Logs
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'settings' ? 'bg-white text-blue-700 shadow-md border-zinc-200' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Settings size={14} />
            SMTP Configurations
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: TEMPLATE ARCHITECTURE */}
        {activeTab === 'templates' && (
          <motion.div 
            key="templates-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            {/* List Panels Column */}
            <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col max-h-[800px]">
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    className="rounded border-zinc-300 accent-black cursor-pointer bg-white"
                    checked={templates.length > 0 && templates.every(t => !!selectedIds[t.id])}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const nextSel = { ...selectedIds };
                      templates.forEach(t => {
                        nextSel[t.id] = checked;
                      });
                      setSelectedIds(nextSel);
                    }}
                  />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Select Template ({templates.length})</span>
                </div>
                <button 
                  onClick={fetchTemplates}
                  title="Reload templates list"
                  className="p-1 hover:bg-zinc-200 rounded text-slate-600 transition-colors"
                >
                  <RefreshCw size={13} className={loadingTemplates ? "animate-spin" : ""} />
                </button>
              </div>

               {loadingTemplates ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-blue-600" size={24} />
                  <p className="text-xs font-medium text-slate-500">Querying templates collection...</p>
                </div>
              ) : (
                <div className="overflow-y-auto divide-y divide-zinc-100">
                  {templates.map(t => {
                    const isSelected = selectedTemplate?.id === t.id;
                    return (
                      <div 
                        key={t.id}
                        className={`p-4 cursor-pointer transition-all flex gap-3 items-start ${isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-zinc-50'}`}
                      >
                        <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                          <input 
                            type="checkbox" 
                            className="rounded border-zinc-300 accent-black cursor-pointer bg-white"
                            checked={!!selectedIds[t.id]}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedIds(prev => ({ ...prev, [t.id]: checked }));
                            }}
                          />
                        </div>
                        <div className="flex-1" onClick={() => selectTemplate(t)}>
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <p className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>{t.name}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ${t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                              {t.is_active ? "ACTIVE" : "OFF"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">{t.description}</p>
                          <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span>Trigger: {t.event_trigger}</span>
                            <span className="flex items-center gap-0.5 text-blue-600 font-bold hover:underline">
                              Select <ChevronRight size={10} />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Editing Section Area */}
            <div className="lg:col-span-8 space-y-6">
              {selectedTemplate ? (
                <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
                  {/* Editor Header Area */}
                  <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-zinc-50">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles size={16} className="text-[#fec001] fill-[#fec001]" />
                        Editing: {selectedTemplate.name}
                      </h2>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">ID: {selectedTemplate.id} (Channel: Electronic Mail)</p>
                    </div>
                    
                    {/* Save layout controls state */}
                    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                      <div className="flex items-center gap-1 mr-2">
                        <span className="text-[11px] font-bold text-slate-600 mr-1">Active Status:</span>
                        <button 
                          onClick={() => setEditorIsActive(!editorIsActive)}
                          className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative flex items-center ${editorIsActive ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                        >
                          <span className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transition-transform block ${editorIsActive ? 'translate-x-4.5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      <button 
                        onClick={handleSaveTemplate}
                        disabled={savingTemplate}
                        className="bg-black hover:bg-black/90 active:scale-98 disabled:bg-zinc-400 text-white text-xs font-bold py-1.5 px-4 rounded-md shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        {savingTemplate ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Save Template
                      </button>
                    </div>
                  </div>

                  {/* Variables Autocomplete toolbar wrapper */}
                  <div className="p-3 bg-slate-50 border-b border-zinc-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Code size={12} className="text-blue-500" />
                      Template Variables Click Helper (inserts directly at text caret position):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {['customer_name', 'order_number', 'grand_total', 'subtotal', 'shipping_cost', 'fulfillment_type', 'shipping_address', 'order_items_table'].map(v => (
                        <button 
                          key={v}
                          onClick={() => handlePillClick(v)}
                          title={`Click to insert {{${v}}}`}
                          className="bg-white border border-zinc-200 hover:border-blue-300 hover:bg-blue-50/50 text-[10.5px] text-slate-700 font-mono py-1 px-2 rounded transition-colors"
                        >
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject and Preheader Input lines */}
                  <div className="p-4 space-y-4 border-b border-zinc-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">EMAIL SUBJECT LINE</label>
                      <input 
                        type="text"
                        value={editorSubject}
                        onChange={(e) => setEditorSubject(e.target.value)}
                        onFocus={() => setActiveField('subject')}
                        className="w-full bg-white border border-zinc-300 rounded-md py-1.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans text-slate-900 font-medium"
                        placeholder="Define transactional subject line..."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">PREHEADER SUMMARY TEXT (Optional snippet beneath inbox title)</label>
                      <input 
                        type="text"
                        value={editorPreheader}
                        onChange={(e) => setEditorPreheader(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-md py-1.5 px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans text-slate-900"
                        placeholder="Define small preheader caption..."
                      />
                    </div>
                  </div>

                  {/* Editor vs preview tab select list */}
                  <div className="flex border-b border-zinc-200 bg-zinc-50 px-4">
                    <button 
                      onClick={() => setEditorTab('edit')}
                      className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${editorTab === 'edit' ? 'border-black text-black' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                      <Code size={14} />
                      ✏️ Edit Template HTML/Text
                    </button>
                    <button 
                      onClick={() => setEditorTab('preview')}
                      className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${editorTab === 'preview' ? 'border-black text-black' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                      <Eye size={14} />
                      👁️ Real-time Live Render Preview
                    </button>
                  </div>

                  {/* HTML Area Board */}
                  <div className="p-4 bg-zinc-50/50 min-h-[400px]">
                    <AnimatePresence mode="wait">
                      {editorTab === 'edit' ? (
                        <motion.div 
                          key="editor-text-view"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full flex flex-col"
                        >
                          <textarea 
                            value={editorBodyHtml}
                            onChange={(e) => setEditorBodyHtml(e.target.value)}
                            onFocus={() => setActiveField('body_html')}
                            className="w-full h-[400px] p-4 font-mono text-xs border border-zinc-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 overflow-y-auto leading-relaxed text-slate-850"
                            placeholder="Input layout HTML parameters here..."
                          />
                          <p className="text-[10px] text-slate-400 mt-2 font-mono">
                            Press variables pills above to automatically append snippets. Customize CSS rules safely inline to secure maximum client device rendering.
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="editor-preview-view"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border border-zinc-300 rounded-md bg-white overflow-hidden shadow-inner h-[400px] flex flex-col"
                        >
                          {/* Emulated Client Header bar */}
                          <div className="bg-zinc-100 px-4 py-2 border-b border-zinc-200 flex items-center gap-2 text-[10px] font-mono text-slate-500">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                            <span className="ml-2 font-semibold">Preview compiler rendered with Nilsson Patterson mock variables:</span>
                          </div>
                          
                          <div className="flex-1 bg-[#f8fafc] overflow-y-auto p-4 flex justify-center">
                            <iframe 
                              srcDoc={getCompiledPreviewBody()} 
                              title="Live Compiled Preview Frame"
                              className="w-full max-w-2xl bg-white border border-zinc-200 rounded-lg shadow-sm min-h-[350px]"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Sandboxed Test Sender Controls Card */}
                  <div className="p-4 border-t border-zinc-200 bg-slate-50">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Send size={13} className="text-blue-600" />
                      Simulate Test Email Dispatch
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">To Sandbox Email Address</label>
                        <input 
                          type="email"
                          value={testToEmail}
                          onChange={(e) => setTestToEmail(e.target.value)}
                          className="w-full bg-white border border-zinc-300 rounded-md py-1 px-3 text-xs focus:ring-2 focus:ring-blue-500/25 transition-all text-slate-900"
                        />
                      </div>
                      
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1 font-mono">Simulated Order Number</label>
                        <select 
                          value={testOrderId} 
                          onChange={(e) => setTestOrderId(e.target.value)}
                          className="w-full bg-white border border-zinc-300 rounded-md py-1 px-2 text-xs focus:ring-2"
                        >
                          <option value="#90281">#90281 (Active Shopify Order)</option>
                          <option value="#1105">#1105 (Small LED Lighting Order)</option>
                          <option value="#77501">#77501 (Industrial Solar Array PO)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <button 
                          onClick={handleSendTest}
                          disabled={sendingTest}
                          className="w-full bg-zinc-800 hover:bg-zinc-950 active:scale-97 disabled:bg-zinc-300 text-white text-xs font-bold py-1.5 px-3 rounded shadow-sm text-center flex items-center justify-center gap-1.5 transition-all"
                        >
                          {sendingTest ? <Loader2 size={13} className="animate-spin" /> : <Play size={10} />}
                          📧 Send Live Test
                        </button>
                      </div>
                    </div>

                    {/* Operational Feedback lines */}
                    {testSuccessMessage && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-xs font-medium flex items-start gap-2 animate-fade-in">
                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green-600" />
                        <div>{testSuccessMessage}</div>
                      </div>
                    )}

                    {testErrorMessage && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-xs font-medium flex items-start gap-2 animate-fade-in">
                        <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-600" />
                        <div>{testErrorMessage}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-white border border-zinc-200 rounded-lg shadow-sm flex flex-col items-center justify-center">
                  <Mail size={40} className="text-zinc-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-500">Pick an email template on the left panel to begin editing.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 2: AUDIT DELIVERY LOGS */}
        {activeTab === 'logs' && (
          <motion.div 
            key="logs-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Filter controls ledger */}
            <div className="bg-white border border-zinc-200 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  value={logsSearch}
                  onChange={(e) => setLogsSearch(e.target.value)}
                  placeholder="Query recipient email, reference order, or Msg ID..."
                  className="w-full bg-slate-50 border border-zinc-300 rounded-md py-1.5 pl-9 pr-4 text-xs font-medium focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all text-slate-900"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div>
                  <select 
                    value={logsFilterTrigger}
                    onChange={(e) => setLogsFilterTrigger(e.target.value)}
                    className="bg-white border border-zinc-350 rounded-md p-1.5 text-xs font-semibold text-slate-700"
                  >
                    <option value="all">📁 All Triggers</option>
                    <option value="order_placed">order_placed</option>
                    <option value="payment_confirmed">payment_confirmed</option>
                    <option value="ready_for_pickup">ready_for_pickup</option>
                    <option value="ready_for_delivery">ready_for_delivery</option>
                    <option value="order_completed">order_completed</option>
                    <option value="order_cancelled">order_cancelled</option>
                  </select>
                </div>

                <div>
                  <select 
                    value={logsFilterStatus}
                    onChange={(e) => setLogsFilterStatus(e.target.value)}
                    className="bg-white border border-zinc-350 rounded-md p-1.5 text-xs font-semibold text-slate-700"
                  >
                    <option value="all">⚫ All Statuses</option>
                    <option value="sent">🟢 Sent</option>
                    <option value="failed">🔴 Failed</option>
                    <option value="queued">🟡 Queued</option>
                  </select>
                </div>

                <button 
                  onClick={fetchLogs}
                  disabled={loadingLogs}
                  className="bg-zinc-800 hover:bg-zinc-950 text-white p-2 rounded-md transition-all active:scale-95"
                >
                  <RefreshCw size={14} className={loadingLogs ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Logs Table Ledger */}
            <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-slate-500 font-bold font-mono uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">Fulfillment Date/Time</th>
                      <th className="p-3.5">Trigger Code</th>
                      <th className="p-3.5">Recipient Destination</th>
                      <th className="p-3.5">Linked Order</th>
                      <th className="p-3.5">Status Code</th>
                      <th className="p-3.5">SendGrid Trace ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {loadingLogs ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="animate-spin text-blue-600" size={24} />
                            <p className="font-semibold text-zinc-500">Retrieving operational delivery logs...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 font-semibold font-mono">
                          No matching transactional delivery logs discovered.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="p-3.5 text-slate-600 font-mono whitespace-nowrap">
                            {new Date(log.sent_at).toLocaleString('en-US', { hour12: true })}
                          </td>
                          <td className="p-3.5">
                            <span className="bg-zinc-100 text-slate-700 font-mono px-2 py-0.5 rounded border border-zinc-250 font-bold block w-fit">
                              {log.event_trigger}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium text-slate-900 whitespace-nowrap">
                            {log.to_email}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-blue-700">
                            {log.order_id || "None"}
                          </td>
                          <td className="p-3.5">
                            {log.status === 'sent' && (
                              <span className="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                DISPATCHED
                              </span>
                            )}
                            {log.status === 'failed' && (
                              <div className="group relative w-fit">
                                <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 cursor-help">
                                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                                  CRITICAL ERROR
                                </span>
                                {log.error && (
                                  <div className="absolute bottom-full left-0 mb-1 z-50 bg-black text-white p-2.5 rounded shadow text-[10px] font-mono leading-normal min-w-64 max-w-xs opacity-0 scale-95 pointer-events-none group-hover:scale-100 group-hover:pointer-events-auto group-hover:opacity-100 transition-all">
                                    <p className="font-bold border-b border-zinc-700 pb-1 mb-1 text-red-400">Secure Exception Response:</p>
                                    {log.error}
                                  </div>
                                )}
                              </div>
                            )}
                            {log.status === 'queued' && (
                              <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                QUEUED
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-[10px] text-slate-400 font-mono select-all font-medium whitespace-nowrap">
                            {log.sendgrid_message_id || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: SETTINGS TAB BOARD */}
        {activeTab === 'settings' && (
          <motion.div 
            key="settings-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start"
          >
            {/* Credentials Card Column */}
            <div className="md:col-span-7 bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-105 bg-zinc-50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sliders size={16} className="text-blue-600" />
                  Service Configurations
                </h2>
                
                <button 
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="bg-black hover:bg-black/90 text-white text-xs font-bold py-1 px-4 rounded transition-all active:scale-98 disabled:bg-zinc-400"
                >
                  Save Settings
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* SendGrid setup block */}
                <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                        SendGrid API Key Override
                      </label>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">
                        Test connection here before committing key directly to server container secrets or <span className="font-bold">.env</span> file.
                      </p>
                    </div>

                    <div className="text-[9px] font-bold text-slate-500 bg-white border border-zinc-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Lock size={10} className="text-emerald-600" />
                      Zero-Trust
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <input 
                      type="password"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder="SG.xxxxxxx..."
                      className="w-full bg-white border border-zinc-300 rounded-md py-1.5 px-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />

                    <div className="flex items-center justify-between gap-3">
                      <button 
                        onClick={handleTestConnection}
                        disabled={testingConnection}
                        className="bg-zinc-800 hover:bg-zinc-950 active:scale-95 text-white text-[11px] font-bold py-1.5 px-3.5 rounded transition-all flex items-center gap-1 shadow-sm"
                      >
                        {testingConnection && <Loader2 size={12} className="animate-spin" />}
                        🔑 Test Connection
                      </button>

                      <div className="text-[10px] font-mono font-medium max-w-[200px] truncate text-slate-500">
                        Env Status: <span className="text-emerald-700 font-bold">Configured ✓ (Active Container)</span>
                      </div>
                    </div>

                    {connectionMessage && (
                      <div className="p-2.5 bg-green-50 border border-green-200 text-green-700 rounded text-[11px] font-bold font-mono">
                        {connectionMessage}
                      </div>
                    )}

                    {connectionError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 rounded text-[11px] font-bold font-mono flex items-start gap-1">
                        <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
                        <div>{connectionError}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sender Settings fields */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-750 uppercase tracking-wider mb-1.5">DEFAULT FROM SENDER NAME</label>
                    <input 
                      type="text"
                      value={settings.default_from_name}
                      onChange={(e) => setSettings(prev => ({ ...prev, default_from_name: e.target.value }))}
                      className="w-full bg-slate-50/50 border border-zinc-300 rounded-md py-1.5 px-3 text-xs focus:bg-white text-slate-900 font-medium"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-750 uppercase tracking-wider mb-1.5">DEFAULT FROM EMAIL</label>
                    <input 
                      type="email"
                      value={settings.default_from_email}
                      onChange={(e) => setSettings(prev => ({ ...prev, default_from_email: e.target.value }))}
                      className="w-full bg-slate-50/50 border border-zinc-300 rounded-md py-1.5 px-3 text-xs focus:bg-white text-slate-900 font-medium"
                    />
                    {isDomainVerified ? (
                      <p className="text-[10px] text-emerald-700 font-bold mt-1 font-mono">✓ Verified Business Domain (samkhi.com)</p>
                    ) : (
                      <p className="text-[10px] text-amber-600 font-semibold mt-1 font-mono">⚠️ Non-business domains are subject to spam metrics.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-750 uppercase tracking-wider mb-1.5">REPLY-TO CUSTOMER EMAIL</label>
                  <input 
                    type="email"
                    value={settings.reply_to_email}
                    onChange={(e) => setSettings(prev => ({ ...prev, reply_to_email: e.target.value }))}
                    className="w-full bg-slate-50/50 border border-zinc-300 rounded-md py-1.5 px-3 text-xs focus:bg-white text-slate-900 font-medium"
                  />
                </div>

                {/* BCC admin checkbox fields */}
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="bcc_admin"
                      checked={settings.bcc_admin}
                      onChange={(e) => setSettings(prev => ({ ...prev, bcc_admin: e.target.checked }))}
                      className="w-4.5 h-4.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="bcc_admin" className="text-xs font-bold text-slate-800">
                      BCC Administrator on all transactional orders
                    </label>
                  </div>
                  
                  {settings.bcc_admin && (
                    <div className="mt-2.5">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">BCC Destination Admin Email</label>
                      <input 
                        type="email"
                        value={settings.admin_email}
                        onChange={(e) => setSettings(prev => ({ ...prev, admin_email: e.target.value }))}
                        className="w-full bg-white border border-zinc-300 rounded-md py-1 px-3 text-xs focus:ring-2 focus:ring-blue-500/10 text-slate-900 font-medium"
                      />
                    </div>
                  )}
                </div>

                {settingsMessage && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-zinc-800 rounded text-xs font-bold font-mono">
                    {settingsMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Service Guidelines Column */}
            <div className="md:col-span-5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-lg shadow-sm p-6 space-y-4">
              <h3 className="text-xs font-bold text-[#fec001] font-mono tracking-wider uppercase">
                ⚙️ SMTP Operational Guardrails
              </h3>
              
              <ul className="text-xs space-y-3 leading-relaxed text-zinc-400">
                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                  <div>
                    <span className="text-zinc-200 font-bold font-mono">Domain Registration:</span> Verify that your from-address domain records (<span className="text-blue-400">noreply@samkhi.com</span>) are actively authenticated with SPF, DKIM, and DMARC settings in SendGrid sender settings.
                  </div>
                </li>

                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                  <div>
                    <span className="text-zinc-200 font-bold font-mono">Rule Security:</span> Security rules protect template edits dynamically. Direct CRUD access can only be executed by authenticated <span className="font-semibold text-zinc-200">Managers</span> or <span className="font-semibold text-zinc-200">Super Admins</span>.
                  </div>
                </li>

                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                  <div>
                    <span className="text-zinc-200 font-bold font-mono">BCC Alerting:</span> BCC carbon copy sends transparently on same SMTP transactions, guaranteeing absolute visibility without incurring additional SendGrid billing counts.
                  </div>
                </li>
              </ul>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>Version: SMTP-2.0.1</span>
                <span>Powered by SendGrid API</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Notifications Bulk Action Bar */}
      {activeTab === 'templates' && (
        <BulkActionBar
          selectedCount={selectedCount}
          totalCount={templates.length}
          onClearSelection={() => setSelectedIds({})}
          onSelectAllPages={() => {
            const nextSel: Record<string, boolean> = {};
            templates.forEach(t => {
              nextSel[t.id] = true;
            });
            setSelectedIds(nextSel);
            showToast(`Selected all ${templates.length} system templates!`, 'success');
          }}
          isAllPagesSelected={templates.length > 0 && templates.every(t => !!selectedIds[t.id])}
          loading={bulkLoading}
          loadingMessage="Configuring notification templates..."
          actions={[
            {
              id: 'activate-templates',
              label: 'Enable Templates',
              icon: Check,
              variant: 'success' as const,
              onClick: () => handleBulkTemplatesStatus(true)
            },
            {
              id: 'deactivate-templates',
              label: 'Disable Templates',
              icon: X,
              onClick: () => handleBulkTemplatesStatus(false)
            }
          ]}
        />
      )}
    </div>
  );
}

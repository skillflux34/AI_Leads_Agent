import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Phone, Users, Activity, MessageSquare, CheckCircle, ChevronDown,
  RefreshCcw, Clock, X, Calendar, Zap, History, Plus, Star, Settings,
  Upload, UserPlus, FileText, AlertCircle, Shield, LogOut, Trash2,
  Pencil, Building2, Mail, PhoneCall, TrendingUp
} from 'lucide-react';

const API = "http://localhost:8000";

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
const DeleteConfirmModal = ({ lead, onConfirm, onCancel }) => {
  if (!lead) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}>
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0f1623 0%, #0b0f1a 100%)',
          border: '1px solid rgba(239,68,68,0.25)',
          boxShadow: '0 0 0 1px rgba(239,68,68,0.08), 0 24px 60px rgba(0,0,0,0.7), 0 0 40px rgba(239,68,68,0.06)',
        }}
      >
        {/* Top accent bar */}
        <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent, #ef4444 40%, #ef4444 60%, transparent)' }} />

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Trash2 size={28} className="text-red-400" />
              </div>
              <div className="absolute -inset-3 rounded-full opacity-20 blur-xl"
                style={{ background: 'radial-gradient(circle, #ef4444, transparent)' }} />
            </div>
          </div>

          <h3 className="text-center text-[17px] font-bold text-white mb-1">Delete Lead?</h3>
          <p className="text-center text-[13px] text-slate-400 mb-1">
            This will permanently remove
          </p>
          <p className="text-center text-[14px] font-semibold text-red-300 mb-1">"{lead.name}"</p>
          {lead.company && (
            <p className="text-center text-[12px] text-slate-500 mb-4">{lead.company}</p>
          )}

          {/* Warning box */}
          <div className="rounded-xl p-3 mb-5 flex items-start gap-2.5"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="m-0 text-[11px] text-red-300 leading-relaxed">
              This action removes the lead from the local database <span className="font-semibold">and HubSpot CRM</span>. It cannot be undone.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 cursor-pointer transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white cursor-pointer transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 4px 14px rgba(239,68,68,0.25)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(239,68,68,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(239,68,68,0.25)'; }}
            >
              <Trash2 size={13} /> Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Score Bar ────────────────────────────────────────────────────────────────
const ScoreBar = ({ score }) => {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444';
  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
    </div>
  );
};

// ─── Calling Button ───────────────────────────────────────────────────────────
const CallingButton = ({ onClick, isCalling }) => (
  <button
    onClick={onClick}
    disabled={isCalling}
    title={isCalling ? 'Calling...' : 'Call now'}
    className="relative w-8 h-8 rounded-xl border-none flex items-center justify-center cursor-pointer transition-all overflow-visible flex-shrink-0"
    style={{
      background: isCalling
        ? 'radial-gradient(circle, #1d4ed8, #1e3a8a)'
        : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      boxShadow: isCalling ? '0 0 14px rgba(59,130,246,0.5)' : '0 2px 8px rgba(37,99,235,0.35)',
    }}
  >
    {isCalling && (
      <>
        <span className="absolute inset-0 rounded-xl animate-ping" style={{ background: 'rgba(59,130,246,0.3)' }} />
        <span className="absolute inset-[-5px] rounded-xl animate-ping" style={{ background: 'rgba(59,130,246,0.15)', animationDelay: '0.3s' }} />
      </>
    )}
    <PhoneCall size={13} className={`text-white relative z-10 ${isCalling ? 'animate-bounce' : ''}`} />
  </button>
);

// ─── Avatar ───────────────────────────────────────────────────────────────────
const LeadAvatar = ({ name, status }) => {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  const colors = {
    qualified: 'from-green-700 to-emerald-900',
    cold:      'from-red-800 to-rose-950',
    handoff:   'from-yellow-700 to-amber-900',
    rescheduled: 'from-blue-700 to-indigo-900',
  };
  const grad = colors[status] || 'from-violet-700 to-purple-900';
  return (
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0`}
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <span className="text-[11px] font-bold text-white">{initials}</span>
    </div>
  );
};

// ─── Lead Card ────────────────────────────────────────────────────────────────
const LeadCard = ({ lead, callingId, onCall, onReschedule, onEdit, onDelete }) => {
  const isCalling = callingId === lead.id;

  const accentMap = {
    qualified:   { border: 'rgba(34,197,94,0.2)',  glow: 'rgba(34,197,94,0.04)',   badge: 'rgba(34,197,94,0.12)', badgeText: '#4ade80', badgeBorder: 'rgba(34,197,94,0.2)',  label: '✦ Qualified'   },
    cold:        { border: 'rgba(239,68,68,0.2)',   glow: 'rgba(239,68,68,0.04)',   badge: 'rgba(239,68,68,0.12)', badgeText: '#f87171', badgeBorder: 'rgba(239,68,68,0.2)',   label: '● Cold'        },
    handoff:     { border: 'rgba(234,179,8,0.22)',  glow: 'rgba(234,179,8,0.04)',   badge: 'rgba(234,179,8,0.12)', badgeText: '#facc15', badgeBorder: 'rgba(234,179,8,0.22)',  label: '⚡ Handoff'    },
    rescheduled: { border: 'rgba(99,102,241,0.22)', glow: 'rgba(99,102,241,0.04)',  badge: 'rgba(99,102,241,0.12)',badgeText: '#818cf8', badgeBorder: 'rgba(99,102,241,0.22)', label: '◷ Rescheduled' },
  };
  const accent = accentMap[lead.status] || { border: 'rgba(100,116,139,0.18)', glow: 'transparent', badge: 'rgba(100,116,139,0.12)', badgeText: '#94a3b8', badgeBorder: 'rgba(100,116,139,0.2)', label: 'New' };
  const scoreColor = lead.score >= 70 ? '#22c55e' : lead.score >= 40 ? '#eab308' : '#ef4444';

  return (
    <div
      className="rounded-xl p-3 transition-all duration-200 group"
      style={{
        background: `linear-gradient(145deg, #0f1825 0%, #0b1120 100%)`,
        border: `1px solid ${accent.border}`,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 2px 12px rgba(0,0,0,0.3)`,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.03) inset, 0 4px 20px rgba(0,0,0,0.4), 0 0 24px ${accent.glow}`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.03) inset, 0 2px 12px rgba(0,0,0,0.3)`; }}
    >
      {/* Top row: avatar + name + actions */}
      <div className="flex items-start gap-2.5 mb-2.5">
        <LeadAvatar name={lead.name} status={lead.status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="m-0 font-semibold text-[13px] text-white truncate leading-tight">{lead.name}</p>
            {lead.score >= 70 && <Star size={10} className="text-yellow-400 flex-shrink-0" fill="currentColor" />}
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 size={9} className="text-slate-600 flex-shrink-0" />
            <p className="m-0 text-[11px] truncate" style={{ color: '#64748b' }}>{lead.company || 'No Company'}</p>
          </div>
        </div>

        {/* Action buttons — compact row */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <CallingButton onClick={() => onCall(lead.id)} isCalling={isCalling} />

          {onReschedule && (
            <button
              onClick={() => onReschedule(lead)}
              title="Reschedule"
              className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'; }}
            >
              <Clock size={12} className="text-violet-400" />
            </button>
          )}

          <button
            onClick={() => onEdit(lead)}
            title="Edit Lead"
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; }}
          >
            <Pencil size={11} className="text-blue-400" />
          </button>

          <button
            onClick={() => onDelete(lead)}
            title="Delete Lead"
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.18)'; }}
          >
            <Trash2 size={11} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* Score bar + metadata row */}
      <div className="space-y-1.5">
        {lead.score > 0 && (
          <div className="flex items-center gap-2">
            <TrendingUp size={9} style={{ color: scoreColor, flexShrink: 0 }} />
            <ScoreBar score={lead.score} />
            <span className="text-[10px] font-bold flex-shrink-0" style={{ color: scoreColor }}>{lead.score}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: accent.badge, color: accent.badgeText, border: `1px solid ${accent.badgeBorder}` }}
          >
            {accent.label}
          </span>

          {lead.reschedule_time && (
            <div className="flex items-center gap-1">
              <Calendar size={9} className="text-blue-400" />
              <span className="text-[10px] text-blue-400">{new Date(lead.reschedule_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>
      </div>

      {isCalling && (
        <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
          <span className="text-[10px] text-blue-300 font-semibold tracking-wide animate-pulse">Connecting call...</span>
        </div>
      )}
    </div>
  );
};

// ─── Metric Card ──────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, colorClass }) => (
  <div className="bg-[#0d1526] border border-slate-800 rounded-xl p-3.5">
    <p className="m-0 mb-1.5 text-[10px] text-slate-600 uppercase tracking-widest">{label}</p>
    <p className={`m-0 text-[15px] font-semibold ${colorClass}`}>{value}</p>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [qualifiedLeads, setQualifiedLeads] = useState([]);
  const [rescheduledLeads, setRescheduledLeads] = useState([]);
  const [transcriptMessages, setTranscriptMessages] = useState([]);
  const [stats, setStats] = useState({ active: 0, completed: 0, leads: 0, rescheduled: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [handoffAlert, setHandoffAlert] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [editLead, setEditLead] = useState(null);
  const [deleteConfirmLead, setDeleteConfirmLead] = useState(null);
  const [activeMetrics, setActiveMetrics] = useState({ sentiment: 'Waiting...', intent: 'Discovery', leadScore: 'N/A' });
  const [callingId, setCallingId] = useState(null);
  const [meetingAlerts, setMeetingAlerts] = useState([]);
  const transcriptEndRef = useRef(null);

  // Upload modal
  const [uploadModal, setUploadModal] = useState(false); // false | 'menu' | 'single' | 'csv'
  const [singleLead, setSingleLead] = useState({ name: '', phone: '', company: '', email: '' });
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const csvInputRef = useRef(null);

  const [usersList, setUsersList] = useState([]); // Array of all users/admins
  const [selectedUserId, setSelectedUserId] = useState(''); // Tracking active dropdown choice
  const localUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = localUser.role === 'admin';

  const token = localStorage.getItem('token');
  const authHeaders = { Authorization: `Bearer ${token}` };

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Ref so WebSocket closure always reads latest selectedUserId
  const selectedUserIdRef = useRef(selectedUserId);
  useEffect(() => { selectedUserIdRef.current = selectedUserId; }, [selectedUserId]);

  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, []);

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const fetchLeads = async () => {
    try {
      const queryParam = selectedUserId ? `?user_id=${selectedUserId}` : '';
      const res = await fetch(`${API}/leads/queue${queryParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { console.error('fetchLeads failed:', res.status); return; }
      const data = await res.json();
      const leads = Array.isArray(data) ? data : data.leads ?? data.items ?? [];
      const normalized = leads.map(l => ({ ...l, score: Number(l.score) || 0 }));
      setLeads(normalized);
      const qualified = normalized.filter(l => l.score >= 70);
      setQualifiedLeads(qualified);
      setStats(prev => ({ ...prev, leads: normalized.length, completed: qualified.length }));
    } catch (e) { console.error('fetchLeads error:', e); }
  };

  useEffect(() => {
    fetchLeads();
    fetchRescheduled();
  }, [selectedUserId]);

  const fetchRescheduled = async () => {
    try {
      const res = await fetch(`${API}/leads/rescheduled`, { headers: authHeaders });

      if (!res.ok) {
        console.error('fetchRescheduled failed:', res.status, await res.text());
        return;
      }

      const data = await res.json();
      const rescheduled = Array.isArray(data) ? data : data.leads ?? data.items ?? [];

      setRescheduledLeads(rescheduled);
      setStats(prev => ({ ...prev, rescheduled: rescheduled.length }));
    } catch (e) { console.error('fetchRescheduled error:', e); }
  };

  const handleSingleLeadUpload = async () => {
    if (!singleLead.name || !singleLead.phone) { toast.error('Name and phone are required'); return; }
    setUploading(true); setUploadResult(null);
    try {
      const res = await fetch(`${API}/leads/upload-single`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(singleLead)
      });
      const data = await res.json();
      if (res.ok) {
        setUploadResult({ success: true, message: data.message });
        setSingleLead({ name: '', phone: '', company: '', email: '' });
        toast.success('Lead added successfully');
        setTimeout(() => { fetchLeads(); fetchRescheduled(); }, 400);
      } else {
        setUploadResult({ success: false, message: data.detail || 'Upload failed' });
        toast.error(data.detail || 'Upload failed');
      }
    } catch (e) { toast.error('Could not reach server'); }
    finally { setUploading(false); }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) { toast.error('Please select a CSV file'); return; }
    setUploading(true); setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      const res = await fetch(`${API}/leads/upload-csv`, { method: 'POST', headers: authHeaders, body: formData });
      const data = await res.json();
      if (res.ok) {
        setUploadResult({ success: data.failed === 0, message: data.message, errors: data.errors });
        setCsvFile(null);
        if (csvInputRef.current) csvInputRef.current.value = '';
        toast.success(`${data.success} lead(s) imported`);
        setTimeout(() => { fetchLeads(); fetchRescheduled(); }, 400);
      } else {
        setUploadResult({ success: false, message: data.detail || 'CSV upload failed' });
        toast.error(data.detail || 'CSV upload failed');
      }
    } catch (e) { toast.error('Could not reach server'); }
    finally { setUploading(false); }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // 1. Get the logged-in user's token
      const token = localStorage.getItem('token'); 
      
      // 2. Pass it into the headers of the request
      const response = await fetch(`${API}/leads/sync`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`, // 👈 This securely authenticates the user
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`Sync failed with status: ${response.status}`);
      }

      // Keep your delay to allow the backend to complete saving records
      setTimeout(() => { 
        fetchLeads(); 
        fetchRescheduled(); 
      }, 3000);

    } catch (e) { 
      console.error(e); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handleDeleteLead = (lead) => {
    // Open the confirmation modal with the full lead object
    setDeleteConfirmLead(lead);
  };

  const confirmDeleteLead = async () => {
    if (!deleteConfirmLead) return;
    const leadId = deleteConfirmLead.id;
    setDeleteConfirmLead(null);
    try {
      const res = await fetch(`${API}/leads/${leadId}`, {
        method: "DELETE",
        headers: authHeaders
      });
      if (!res.ok) { toast.error("Delete failed"); return; }
      toast.success("Lead permanently deleted");
      setLeads(prev => prev.filter(l => l.id !== leadId));
      setQualifiedLeads(prev => prev.filter(l => l.id !== leadId));
      setRescheduledLeads(prev => prev.filter(l => l.id !== leadId));
    } catch (e) {
      console.error(e);
      toast.error("Server error");
    }
  };

  const handleEditLead = (lead) => {
    setEditLead({ ...lead }); // Clones the lead object to prevent accidental mutation of the view list
  };

  const submitEditLead = async () => {
    // Enhanced strict checking to ensure fields aren't just whitespace strings
    if (!editLead || !editLead.name?.trim() || !editLead.phone?.trim()) {
      toast.error("Name and Phone are required");
      return;
    }

    try {
      const res = await fetch(`${API}/leads/${editLead.id}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editLead.name.trim(),
          phone: editLead.phone.trim(),
          company: editLead.company || "",
          email: editLead.email || ""
        })
      });

      if (res.ok) {
        toast.success("Lead updated successfully");
        setEditLead(null); // Safely closes modal window
        
        // Optimistic React state re-rendering (Refreshes the UI instantly)
        fetchLeads();      
        fetchRescheduled();
      } else {
        const data = await res.json();
        toast.error(data.detail || "Update failed");
      }
    } catch (e) {
      console.error(e);
      toast.error("Server error");
    }
  };

  // DropDown
  const fetchUsersDropdownData = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (e) {
      console.error("Error loading accounts list for filter dropdown:", e);
    }
  };

  useEffect(() => {
    fetchUsersDropdownData();
  }, []);

  // ─── Call Trigger ───────────────────────────────────────────────────────────
  const triggerCall = async (leadId) => {
    setCallingId(leadId);
    const lead =
      leads.find(l => l.id === leadId) ||
      rescheduledLeads.find(l => l.id === leadId) ||
      qualifiedLeads.find(l => l.id === leadId);

    toast.info(`📞 Calling ${lead?.name || 'lead'}...`, { autoClose: 8000 });

    // 1. Retrieve the JWT from localStorage
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API}/calls/trigger/${leadId}`, { 
        method: 'POST',
        // 2. Add the proper security headers
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Handle explicit authentication kicks gracefully
      if (res.status === 401) {
        toast.error("❌ Session expired. Please log in again.");
        navigate('/login');
        return;
      }

      const data = await res.json();
      if (data.error) {
        toast.error(`❌ ${data.error}`, { autoClose: 5000 });
        setCallingId(null);
      }
    } catch (e) {
      console.error(e);
      toast.error('❌ Could not reach server');
      setCallingId(null);
    } finally {
      setTimeout(() => setCallingId(null), 8000);
    }
  };

  // ─── Reschedule Submit ──────────────────────────────────────────────────────
  const submitReschedule = async () => {
    if (!rescheduleModal || !rescheduleTime) return;
    try {
      const scheduledTime = new Date(rescheduleTime);
      const diffMinutes = (scheduledTime - new Date()) / 1000 / 60;

      const res = await fetch(`${API}/leads/reschedule`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: rescheduleModal.id, reschedule_time: scheduledTime.toISOString() })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || `Reschedule failed (${res.status})`);
        return;
      }

      toast.success(`🕐 ${rescheduleModal.name} rescheduled for ${scheduledTime.toLocaleString()}`, { autoClose: 5000 });

      // Only call immediately if the scheduled time is already PAST
      // Future times are handled by the background scheduler
      if (diffMinutes < 0) {
        toast.info('⏰ Scheduled time is in the past — calling now');
        await triggerCall(rescheduleModal.id);
      } else {
        toast.info(`⏳ Scheduler will call at ${scheduledTime.toLocaleTimeString()}`, { autoClose: 4000 });
      }

      setRescheduleModal(null);
      setRescheduleTime('');
      fetchLeads();
      fetchRescheduled();
    } catch (e) {
      console.error(e);
      toast.error('❌ Reschedule failed');
    }
  };

  // ─── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchLeads();
    fetchRescheduled();

    let ws;
    const connect = () => {
      ws = new WebSocket(`ws://localhost:8000/ws`);

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);

        // ── USER SCOPE FILTER ──────────────────────────────────────
        // If the message carries a user_id, only process it if:
        // - It belongs to the current logged-in user, OR
        // - Current user is admin and is watching all/that workspace
        if (data.user_id !== undefined && data.user_id !== null) {
          const currentUserId = localUser.id;
          const isMyCall = data.user_id === currentUserId;
          const isAdminWatchingAll = isAdmin && selectedUserIdRef.current === '';
          const isAdminWatchingThisUser = isAdmin && selectedUserIdRef.current == data.user_id;
          if (!isMyCall && !isAdminWatchingAll && !isAdminWatchingThisUser) return;
        }
        // ──────────────────────────────────────────────────────────

        if (data.type === 'TRANSCRIPT_UPDATE') {
          const lines = data.text.split('\n').filter(Boolean);
          const parsed = lines.map(line => {
            const i = line.indexOf(':');
            if (i === -1) return { role: 'system', content: line };
            const role = line.substring(0, i).trim().toLowerCase();
            return { role: role === 'bot' ? 'assistant' : role, content: line.substring(i + 1).trim() };
          });
          setTranscriptMessages(parsed);
        }

        if (data.type === 'HANDOFF_TRIGGERED') {
          setHandoffAlert({ lead_name: data.lead_name, lead_score: data.lead_score, timestamp: data.timestamp });
          setTimeout(() => setHandoffAlert(null), 300000);
          toast.warning(`🚨 Handoff triggered for ${data.lead_name}`, { autoClose: 6000 });
        }

        if (data.type === 'ACTIVE_CALLS_UPDATE') {
          setStats(prev => {
            // Only toast when a NEW call starts (count goes up)
            if (data.count > prev.active && data.count > 0) {
              toast.info(`📞 Call connected — ${data.count} active`, { autoClose: 4000 });
            }
            return { ...prev, active: data.count };
          });
        }

        if (data.type === 'CALL_STATUS_UPDATE') {
          fetchLeads();
          fetchRescheduled();
          setActiveMetrics({
            sentiment: data.sentiment || 'Unknown',
            intent: data.intent || 'Unknown',
            leadScore: data.lead_score !== undefined ? `${data.lead_score}` : 'N/A'
          });
          if (data.lead_score >= 70) setActiveTab('qualified');

          // Only toast with meaningful data
          if (data.sentiment && data.sentiment !== 'Error') {
            const scoreText = data.lead_score > 0 ? ` — Score: ${data.lead_score}` : '';
            if (data.lead_score >= 70) {
              toast.success(`🌟 Qualified lead! ${data.sentiment}${scoreText}`, { autoClose: 6000 });
            } else {
              toast.info(`✅ Call completed — ${data.sentiment}${scoreText}`, { autoClose: 4000 });
            }
          }
        }

        if (data.type === 'MEETING_BOOKED') {
          setMeetingAlerts(prev => [{
            lead_name: data.lead_name,
            lead_email: data.lead_email,
            scheduled_time: data.scheduled_time,
            timestamp: data.timestamp,
            id: Date.now()
          }, ...prev].slice(0, 5));
          toast.success(`📅 Meeting booked for ${data.lead_name}`, { autoClose: 8000 });
        }

        if (data.type === 'LEAD_REMOVED') {
          setLeads(prev => prev.filter(l => l.id !== data.lead_id));
          setQualifiedLeads(prev => prev.filter(l => l.id !== data.lead_id));
        }
      };

      ws.onclose = () => { if (!unmounted) setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
    };

    let unmounted = false;
    connect();
    return () => { unmounted = true; ws && ws.close(); };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptMessages]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const sentimentColor = (s) => {
    if (s === 'Positive') return 'text-green-400';
    if (s === 'Negative') return 'text-red-400';
    return 'text-slate-400';
  };

  const statCards = [
    { icon: <Activity size={18} />,    label: 'Live Calls',  value: stats.active,          colorClass: 'text-blue-400',   borderClass: 'border-blue-900',   glowClass: 'bg-blue-900' },
    { icon: <Users size={18} />,       label: 'Total Leads', value: leads.length,           colorClass: 'text-violet-400', borderClass: 'border-violet-900', glowClass: 'bg-violet-900' },
    { icon: <CheckCircle size={18} />, label: 'Qualified',   value: qualifiedLeads.length,  colorClass: 'text-green-400',  borderClass: 'border-green-900',  glowClass: 'bg-green-900' },
    { icon: <Clock size={18} />,       label: 'Rescheduled', value: rescheduledLeads.length, colorClass: 'text-yellow-400', borderClass: 'border-yellow-900', glowClass: 'bg-yellow-900' },
  ];

  const TABS = [
    { key: 'queue',       label: 'Lead Queue', count: null },
    { key: 'qualified',   label: 'Qualified',  count: qualifiedLeads.length },
    { key: 'rescheduled', label: 'Rescheduled', count: rescheduledLeads.length > 0 ? rescheduledLeads.length : null },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-200" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      <ToastContainer
        position="bottom-right"
        theme="dark"
        autoClose={4000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        newestOnTop
      />

      {/* ── Top Bar ── */}
      <div className="border-b border-slate-800 px-8 py-4 bg-[#0a0f1e] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="m-0 font-bold text-[15px] tracking-tight">Cyberify Voice AI</p>
            <p className="m-0 text-[11px] text-slate-500">Orchestration Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">

          {isAdmin && (
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2.5 bg-[#0d1526] border border-slate-700 rounded-lg px-3 py-2 cursor-pointer min-w-[210px] select-none"
              >
                {/* Icon or avatar */}
                {selectedUserId ? (
                  <div className="w-6 h-6 rounded-full bg-green-950 border border-green-800 flex items-center justify-center text-[10px] font-semibold text-green-400 flex-shrink-0">
                    {(usersList.find(u => u.id == selectedUserId)?.full_name || 'U').slice(0,2).toUpperCase()}
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-md bg-indigo-950 border border-indigo-800 flex items-center justify-center flex-shrink-0">
                    <Users size={12} className="text-indigo-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="m-0 text-[10px] text-slate-500 uppercase tracking-widest leading-none">Workspace</p>
                  <p className="m-0 text-[13px] font-semibold text-slate-200 truncate">
                    {selectedUserId
                      ? (usersList.find(u => u.id == selectedUserId)?.full_name || 'User')
                      : 'All Workspaces'}
                  </p>
                </div>

                <ChevronDown size={13} className={`text-slate-500 flex-shrink-0 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {dropdownOpen && (
                <div className="absolute top-[calc(100%+6px)] left-0 bg-[#0d1526] border border-slate-700 rounded-xl overflow-hidden z-50 min-w-[240px] shadow-2xl">
                  {/* All workspaces */}
                  <div
                    onClick={() => { setSelectedUserId(''); setDropdownOpen(false); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-slate-800 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-indigo-950 border border-indigo-800 flex items-center justify-center flex-shrink-0">
                      <Users size={13} className="text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <p className="m-0 text-[13px] font-semibold text-slate-200">All Workspaces</p>
                      <p className="m-0 text-[11px] text-slate-500">View all leads</p>
                    </div>
                    {!selectedUserId && <CheckCircle size={14} className="text-indigo-400 flex-shrink-0" />}
                  </div>

                  <div className="h-px bg-slate-800 mx-3" />

                  {/* User list */}
                  {usersList.map(u => {
                    const initials = (u.full_name || u.email).slice(0, 2).toUpperCase();
                    const isSelected = selectedUserId == u.id;
                    const colors = u.role === 'admin'
                      ? 'bg-indigo-950 border-indigo-800 text-indigo-400'
                      : 'bg-green-950 border-green-800 text-green-400';

                    return (
                      <div
                        key={u.id}
                        onClick={() => { setSelectedUserId(u.id); setDropdownOpen(false); }}
                        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-slate-800 transition-colors"
                      >
                        <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${colors}`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="m-0 text-[13px] font-semibold text-slate-200 truncate">{u.full_name || u.email}</p>
                            {u.role === 'admin' && (
                              <span className="text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-800 px-1.5 py-0.5 rounded-full font-bold uppercase flex-shrink-0">Admin</span>
                            )}
                          </div>
                          <p className="m-0 text-[11px] text-slate-500 truncate">{u.email}</p>
                        </div>
                        {isSelected && <CheckCircle size={14} className="text-indigo-400 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upload Leads */}
          <div className="relative">
            <button
              onClick={() => setUploadModal(m => m ? false : 'menu')}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-lg text-[12px] font-semibold cursor-pointer transition-colors"
              style={{ border: 'none' }}
            >
              <Upload size={13} /> Add Leads
            </button>
            {uploadModal === 'menu' && (
              <div className="absolute top-[calc(100%+6px)] right-0 bg-[#0d1526] border border-slate-700 rounded-xl z-50 w-44 p-1.5 shadow-xl">
                <button onClick={() => setUploadModal('single')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#131f35] transition-colors bg-transparent border-none cursor-pointer text-left">
                  <UserPlus size={13} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="m-0 text-[12px] text-slate-200 font-semibold">Single Lead</p>
                    <p className="m-0 text-[10px] text-slate-500">Add one contact</p>
                  </div>
                </button>
                <button onClick={() => setUploadModal('csv')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#131f35] transition-colors bg-transparent border-none cursor-pointer text-left">
                  <FileText size={13} className="text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="m-0 text-[12px] text-slate-200 font-semibold">CSV Upload</p>
                    <p className="m-0 text-[10px] text-slate-500">Bulk import</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {isAdmin && (
            <button onClick={() => navigate('/admin')} className="flex items-center gap-1.5 px-3 py-2 bg-violet-950 hover:bg-violet-900 border border-violet-800 text-violet-300 rounded-lg text-[12px] font-semibold cursor-pointer transition-colors" style={{ border: 'none' }}>
              <Shield size={13} /> Admin
            </button>
          )}

          <button onClick={() => navigate('/settings')} className="flex items-center gap-1.5 px-3 py-2 bg-[#0d1526] hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[12px] cursor-pointer transition-colors">
            <Settings size={13} /> Settings
          </button>

          <button onClick={() => navigate('/create-assistant')} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[12px] font-semibold transition-colors border-none cursor-pointer">
            <Plus size={14} /> Assistant
          </button>

          <button onClick={() => navigate('/call-logs')} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[12px] cursor-pointer transition-colors">
            <History size={13} /> Logs
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #4ade80' }} />
              <span className="text-[11px] text-slate-500">Online</span>
            </div>
            <button
              onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }}
              className="p-1.5 rounded-lg bg-transparent border-none cursor-pointer text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {statCards.map((s, i) => (
            <div key={i} className={`bg-[#0d1526] border ${s.borderClass} rounded-xl p-5 relative overflow-hidden`}>
              <div className={`absolute top-0 right-0 w-20 h-20 rounded-full ${s.glowClass} opacity-40 blur-3xl`} />
              <div className="flex items-center gap-2 mb-3">
                <span className={s.colorClass}>{s.icon}</span>
                <span className="text-[11px] text-slate-500 uppercase tracking-widest">{s.label}</span>
              </div>
              <p className={`m-0 text-4xl font-bold leading-none ${s.colorClass}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: '340px 1fr' }}>

          {/* ── Left Panel ── */}
          <div className="bg-[#0d1526] border border-slate-800 rounded-2xl flex flex-col h-[640px]">

            {/* Tabs */}
            <div className="flex border-b border-slate-800 px-1">
              {TABS.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 py-3.5 text-[12px] font-medium border-b-2 transition-all cursor-pointer bg-transparent border-l-0 border-r-0 border-t-0 flex items-center justify-center gap-1.5
                    ${activeTab === key ? 'text-violet-400 border-b-violet-500' : 'text-slate-500 border-b-transparent hover:text-slate-300'}`}
                >
                  {count !== null && count > 0 && (
                    <span className={`rounded-full text-[10px] px-1.5 py-0.5 font-bold ${key === 'qualified' ? 'bg-green-400 text-black' : 'bg-yellow-400 text-black'}`}>
                      {count}
                    </span>
                  )}
                  {label}
                </button>
              ))}
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className={`px-3 bg-transparent border-none cursor-pointer transition-colors ${isSyncing ? 'text-slate-600' : 'text-orange-500 hover:text-orange-400'}`}
                title="Sync HubSpot"
              >
                <RefreshCcw size={15} className={isSyncing ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">

              {/* Lead Queue */}
              {activeTab === 'queue' && (
                leads.length === 0
                  ? <p className="text-center text-slate-600 mt-16 text-[13px]">No leads. Sync from HubSpot.</p>
                  : leads.map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      callingId={callingId} 
                      onCall={triggerCall} 
                      onReschedule={setRescheduleModal}
                      onEdit={handleEditLead}
                      onDelete={handleDeleteLead}
                    />
                  ))
              )}

              {/* Qualified */}
              {activeTab === 'qualified' && (
                qualifiedLeads.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-950 border border-green-800 flex items-center justify-center">
                        <Star size={20} className="text-green-400" />
                      </div>
                      <p className="text-center text-slate-600 text-[13px]">No qualified leads yet.<br />Leads with score ≥ 70 appear here.</p>
                    </div>
                  )
                  : qualifiedLeads.map(lead => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      callingId={callingId} 
                      onCall={triggerCall} 
                      onReschedule={setRescheduleModal}
                      onEdit={handleEditLead}
                      onDelete={handleDeleteLead} 
                    />
                  ))
              )}

              {/* Rescheduled */}
              {activeTab === 'rescheduled' && (
                rescheduledLeads.length === 0
                  ? <p className="text-center text-slate-600 mt-16 text-[13px]">No rescheduled calls.</p>
                  : rescheduledLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      callingId={callingId}
                      onCall={triggerCall}
                      onReschedule={setRescheduleModal}
                      onEdit={handleEditLead}
                      onDelete={handleDeleteLead}
                    />
                  ))
              )}
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="flex flex-col gap-5">

            {/* Live Transcript */}
            <div className="bg-[#0d1526] border border-slate-800 rounded-2xl p-6 flex-1">
              <div className="flex items-center gap-2.5 mb-4">
                <MessageSquare size={18} className="text-violet-400" />
                <h2 className="m-0 text-[15px] font-semibold">Live Orchestration</h2>
                {stats.active > 0 && (
                  <div className="ml-auto flex items-center gap-2 bg-green-950 border border-green-800 rounded-full px-3 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[11px] text-green-400 font-semibold">{stats.active} Active</span>
                  </div>
                )}
              </div>

              <div
                className="bg-[#060a14] rounded-xl p-4 overflow-y-auto border border-slate-900"
                style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12, height: 420 }}
              >
                <p className="text-green-500 mb-3">{'>'} SYSTEM_READY: Monitoring Vapi stream...</p>
                {transcriptMessages.length === 0
                  ? <p className="text-slate-700 italic">Waiting for live call...</p>
                  : (
                    <div className="flex flex-col gap-2.5">
                      {transcriptMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[78%] px-3 py-2 rounded-xl border ${
                            msg.role === 'assistant' ? 'bg-green-950 border-green-900 rounded-tl-none' :
                            msg.role === 'user'      ? 'bg-blue-950 border-blue-900 rounded-tr-none' :
                            'bg-slate-800 border-slate-700'
                          }`}>
                            <span className={`text-[9px] uppercase tracking-widest block mb-1 ${
                              msg.role === 'assistant' ? 'text-green-500' :
                              msg.role === 'user'      ? 'text-blue-400' : 'text-slate-500'
                            }`}>
                              {msg.role === 'assistant' ? '🤖 AI Agent' : msg.role === 'user' ? '👤 Lead' : msg.role}
                            </span>
                            <span className={
                              msg.role === 'assistant' ? 'text-green-300' :
                              msg.role === 'user'      ? 'text-blue-300' : 'text-slate-400'
                            }>
                              {msg.content}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div ref={transcriptEndRef} />
                    </div>
                  )}
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-3.5">
              <MetricCard label="Sentiment"  value={activeMetrics.sentiment}  colorClass={sentimentColor(activeMetrics.sentiment)} />
              <MetricCard label="Intent"     value={activeMetrics.intent}     colorClass="text-blue-400" />
              <MetricCard label="Lead Score" value={activeMetrics.leadScore}  colorClass="text-violet-400" />
              {handoffAlert ? (
                <div className="bg-red-950 border border-red-900 rounded-xl p-3.5 relative">
                  <button onClick={() => setHandoffAlert(null)} className="absolute top-2 right-2 bg-transparent border-none cursor-pointer text-red-400">
                    <X size={12} />
                  </button>
                  <p className="m-0 mb-1 text-[10px] text-red-400 uppercase tracking-widest">🚨 Handoff</p>
                  <p className="m-0 mb-0.5 text-[13px] font-semibold text-red-300">{handoffAlert.lead_name}</p>
                  <p className="m-0 text-[11px] text-red-400">Score: {handoffAlert.lead_score}</p>
                </div>
              ) : (
                <MetricCard label="Handoff" value="Standby" colorClass="text-slate-500" />
              )}
            </div>

            {/* Meetings Booked Panel */}
            {meetingAlerts.length > 0 && (
              <div className="bg-[#0d1526] border border-green-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <h3 className="m-0 text-[13px] font-semibold text-green-400 uppercase tracking-widest">
                      Meetings Booked
                    </h3>
                  </div>
                  <button
                    onClick={() => setMeetingAlerts([])}
                    className="bg-transparent border-none cursor-pointer text-slate-600 hover:text-slate-400"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  {meetingAlerts.map(meeting => (
                    <div key={meeting.id} className="flex items-center justify-between bg-green-950/40 border border-green-900 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                        <div>
                          <p className="m-0 text-[13px] font-semibold text-green-300">{meeting.lead_name}</p>
                          <p className="m-0 text-[11px] text-green-700">{meeting.lead_email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="m-0 text-[11px] text-green-400 font-medium">
                          {meeting.scheduled_time ? new Date(meeting.scheduled_time).toLocaleString() : 'Link sent'}
                        </p>
                        <p className="m-0 text-[10px] text-green-700">
                          {new Date(meeting.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Upload Modal ── */}
      {(uploadModal === 'single' || uploadModal === 'csv') && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => { setUploadModal(false); setUploadResult(null); }}>
          <div className="bg-[#0d1526] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${uploadModal === 'single' ? 'bg-emerald-950 border border-emerald-800' : 'bg-blue-950 border border-blue-800'}`}>
                  {uploadModal === 'single' ? <UserPlus size={15} className="text-emerald-400" /> : <FileText size={15} className="text-blue-400" />}
                </div>
                <div>
                  <p className="m-0 font-bold text-[14px]">{uploadModal === 'single' ? 'Add Single Lead' : 'CSV Bulk Import'}</p>
                  <p className="m-0 text-[11px] text-slate-500">{uploadModal === 'single' ? 'Add one contact manually' : 'Import multiple leads at once'}</p>
                </div>
              </div>
              <button onClick={() => { setUploadModal(false); setUploadResult(null); }} className="p-1.5 rounded-lg hover:bg-slate-800 bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-300 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {uploadModal === 'single' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Full Name *</label>
                      <input type="text" value={singleLead.name} onChange={e => setSingleLead(p => ({ ...p, name: e.target.value }))} placeholder="John Smith" className="w-full bg-[#060a14] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-[13px] outline-none focus:border-indigo-600 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Phone *</label>
                      <input type="text" value={singleLead.phone} onChange={e => setSingleLead(p => ({ ...p, phone: e.target.value }))} placeholder="+12345678901" className="w-full bg-[#060a14] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-[13px] outline-none focus:border-indigo-600 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Company</label>
                      <input type="text" value={singleLead.company} onChange={e => setSingleLead(p => ({ ...p, company: e.target.value }))} placeholder="Acme Corp" className="w-full bg-[#060a14] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-[13px] outline-none focus:border-indigo-600 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Email</label>
                      <input type="email" value={singleLead.email} onChange={e => setSingleLead(p => ({ ...p, email: e.target.value }))} placeholder="john@acme.com" className="w-full bg-[#060a14] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-[13px] outline-none focus:border-indigo-600 transition-colors" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 m-0">Lead will be saved and synced to HubSpot if connected.</p>
                </>
              )}

              {uploadModal === 'csv' && (
                <>
                  <div onClick={() => csvInputRef.current?.click()} className="border-2 border-dashed border-slate-700 hover:border-indigo-600 rounded-xl p-8 text-center cursor-pointer transition-colors">
                    <FileText size={28} className="text-slate-600 mx-auto mb-2" />
                    {csvFile
                      ? <p className="m-0 text-[13px] text-emerald-400 font-medium">{csvFile.name}</p>
                      : <><p className="m-0 text-[13px] text-slate-400 font-medium">Click to select CSV file</p><p className="m-0 text-[11px] text-slate-600 mt-1">or drag and drop</p></>
                    }
                    <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={e => setCsvFile(e.target.files[0])} />
                  </div>
                  <div className="bg-[#060a14] border border-slate-800 rounded-lg px-4 py-3">
                    <p className="m-0 text-[11px] text-slate-400 font-semibold mb-1">Expected columns:</p>
                    <code className="text-[11px] text-slate-500">name, phone, company, email</code>
                    <p className="m-0 text-[11px] text-slate-600 mt-1">First row must be the header. Phone must be unique.</p>
                  </div>
                </>
              )}

              {uploadResult && (
                <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border ${uploadResult.success ? 'bg-emerald-950/40 border-emerald-800' : 'bg-red-950/40 border-red-800'}`}>
                  {uploadResult.success ? <CheckCircle size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" /> : <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className={`m-0 text-[12px] font-semibold ${uploadResult.success ? 'text-emerald-300' : 'text-red-300'}`}>{uploadResult.message}</p>
                    {uploadResult.errors?.length > 0 && <p className="m-0 text-[11px] text-red-400 mt-1">{uploadResult.errors.slice(0, 3).join(' · ')}</p>}
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button onClick={() => { setUploadModal(false); setUploadResult(null); }} className="flex-1 py-2 bg-transparent border border-slate-700 rounded-lg text-slate-400 text-[13px] cursor-pointer hover:bg-slate-800 transition-colors">Cancel</button>
                <button onClick={uploadModal === 'single' ? handleSingleLeadUpload : handleCsvUpload} disabled={uploading} className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-900 disabled:cursor-not-allowed border-none rounded-lg text-white text-[13px] font-semibold cursor-pointer transition-colors flex items-center justify-center gap-2">
                  {uploading ? <RefreshCcw size={13} className="animate-spin" /> : <Upload size={13} />}
                  {uploading ? 'Uploading...' : uploadModal === 'single' ? 'Add Lead' : 'Import CSV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule Modal ── */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
          <div className="bg-[#0d1526] border border-slate-800 rounded-2xl p-7 w-96 relative">
            <button
              onClick={() => { setRescheduleModal(null); setRescheduleTime(''); }}
              className="absolute top-4 right-4 bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#1a1a2e] border border-violet-900 flex items-center justify-center">
                <Clock size={18} className="text-violet-400" />
              </div>
              <div>
                <p className="m-0 font-semibold text-[15px]">Reschedule Call</p>
                <p className="m-0 text-[12px] text-slate-500">{rescheduleModal.name}</p>
              </div>
            </div>

            <div className="bg-[#060a14] rounded-xl p-3.5 mb-5 border border-slate-800 space-y-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-500">Current Score</span>
                <span className="text-violet-400 font-semibold">{rescheduleModal.score}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-500">Status</span>
                <span className="text-blue-400 font-semibold">{rescheduleModal.status}</span>
              </div>
            </div>

            <label className="text-[12px] text-slate-400 block mb-2">Schedule for</label>
            <input
              type="datetime-local"
              value={rescheduleTime}
              onChange={e => setRescheduleTime(e.target.value)}
              className="w-full bg-[#060a14] border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-200 text-[14px] outline-none mb-4 focus:border-violet-700 transition-colors"
            />

            <div className="flex gap-2.5">
              <button
                onClick={() => { setRescheduleModal(null); setRescheduleTime(''); }}
                className="flex-1 py-2.5 bg-transparent border border-slate-700 hover:border-slate-500 rounded-lg text-slate-500 cursor-pointer text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitReschedule}
                disabled={!rescheduleTime}
                className={`flex-1 py-2.5 rounded-lg text-[13px] font-semibold border-none transition-colors
                  ${rescheduleTime ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer' : 'bg-indigo-950 text-slate-600 cursor-not-allowed'}`}
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      <DeleteConfirmModal
        lead={deleteConfirmLead}
        onConfirm={confirmDeleteLead}
        onCancel={() => setDeleteConfirmLead(null)}
      />

      {/* ── Edit Lead Modal ── */}
      {editLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}>
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #0f1825 0%, #0b1120 100%)',
              border: '1px solid rgba(59,130,246,0.2)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 24px 60px rgba(0,0,0,0.7), 0 0 40px rgba(59,130,246,0.06)',
            }}>
            {/* Top accent bar */}
            <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent, #3b82f6 40%, #6366f1 60%, transparent)' }} />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.22)' }}>
                    <Pencil size={15} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="m-0 text-[15px] font-bold text-white leading-tight">Edit Lead</h3>
                    <p className="m-0 text-[11px]" style={{ color: '#64748b' }}>{editLead.name}</p>
                  </div>
                </div>
                <button onClick={() => setEditLead(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all border-none"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
                  <X size={15} className="text-slate-400" />
                </button>
              </div>

              {/* Fields */}
              <div className="space-y-3 mb-5">
                {[
                  { label: 'Full Name', key: 'name', type: 'text', icon: <Users size={12} className="text-slate-500" /> },
                  { label: 'Phone Number', key: 'phone', type: 'text', icon: <Phone size={12} className="text-slate-500" /> },
                  { label: 'Company', key: 'company', type: 'text', icon: <Building2 size={12} className="text-slate-500" /> },
                  { label: 'Email Address', key: 'email', type: 'email', icon: <Mail size={12} className="text-slate-500" /> },
                ].map(({ label, key, type, icon }) => (
                  <div key={key}>
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#64748b' }}>
                      {icon} {label}
                    </label>
                    <input
                      type={type}
                      value={editLead[key] || ''}
                      onChange={e => setEditLead({ ...editLead, [key]: e.target.value })}
                      className="w-full rounded-xl px-3.5 py-2.5 text-[13px] text-slate-200 outline-none transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        caretColor: '#3b82f6',
                      }}
                      onFocus={e => { e.currentTarget.style.border = '1px solid rgba(59,130,246,0.4)'; e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; }}
                      onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    />
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => setEditLead(null)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 cursor-pointer transition-all border-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
                  Cancel
                </button>
                <button onClick={submitEditLead}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white cursor-pointer transition-all flex items-center justify-center gap-2 border-none"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.45)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(59,130,246,0.3)'; e.currentTarget.style.filter = 'brightness(1)'; }}>
                  <CheckCircle size={13} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;


import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Phone, Users, Activity, MessageSquare, CheckCircle,
  RefreshCcw, Clock, X, Calendar, Zap, History, Plus, Star
} from 'lucide-react';

const API = "http://localhost:8000";

// ─── Calling Button ───────────────────────────────────────────────────────────
const CallingButton = ({ onClick, isCalling }) => (
  <button
    onClick={onClick}
    disabled={isCalling}
    className="relative w-9 h-9 rounded-full border-none flex items-center justify-center cursor-pointer transition-all overflow-visible"
    style={{
      background: isCalling
        ? 'radial-gradient(circle, #1d4ed8, #1e3a8a)'
        : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    }}
    title={isCalling ? 'Calling...' : 'Call now'}
  >
    {isCalling && (
      <>
        <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(59,130,246,0.35)' }} />
        <span className="absolute inset-[-6px] rounded-full animate-ping" style={{ background: 'rgba(59,130,246,0.18)', animationDelay: '0.3s' }} />
      </>
    )}
    <Phone size={14} className={`text-white relative z-10 ${isCalling ? 'animate-bounce' : ''}`} />
  </button>
);

// ─── Lead Card ────────────────────────────────────────────────────────────────
const LeadCard = ({ lead, callingId, onCall, onReschedule }) => {
  const isCalling = callingId === lead.id;

  const borderColor = {
    qualified: 'border-green-900 hover:border-green-700',
    cold:      'border-red-900 hover:border-red-700',
    handoff:   'border-yellow-900 hover:border-yellow-700',
    rescheduled: 'border-blue-900 hover:border-blue-700',
  }[lead.status] || 'border-slate-700 hover:border-slate-500';

  const statusBadge = {
    qualified:   'bg-green-950 text-green-400 border border-green-800',
    cold:        'bg-red-950 text-red-400 border border-red-900',
    handoff:     'bg-yellow-950 text-yellow-400 border border-yellow-900',
    rescheduled: 'bg-blue-950 text-blue-400 border border-blue-900',
  }[lead.status] || 'bg-violet-950 text-violet-400 border border-violet-900';

  const statusLabel = {
    handoff:     '⚡ Handoff',
    rescheduled: '🕐 Rescheduled',
    qualified:   '✅ Qualified',
    cold:        '❄️ Cold',
  }[lead.status] || `Score: ${lead.score}`;

  const scoreColor = lead.score >= 70 ? 'text-green-400' : lead.score >= 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className={`p-3.5 bg-[#111827] rounded-xl border ${borderColor} transition-colors`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="m-0 font-semibold text-[14px] truncate">{lead.name}</p>
            {lead.score >= 70 && <Star size={11} className="text-yellow-400 flex-shrink-0" fill="currentColor" />}
          </div>
          <p className="m-0 text-[11px] text-slate-500 mb-2">{lead.company || 'No Company'}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusBadge}`}>
              {statusLabel}
            </span>
            {lead.score > 0 && (
              <span className={`text-[11px] font-bold ${scoreColor}`}>{lead.score}/100</span>
            )}
          </div>
          {lead.reschedule_time && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Calendar size={10} className="text-blue-400" />
              <span className="text-[10px] text-blue-400">{new Date(lead.reschedule_time).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <div className="flex flex-col items-center gap-0.5">
            <CallingButton onClick={() => onCall(lead.id)} isCalling={isCalling} />
            {isCalling && (
              <span className="text-[9px] text-blue-400 font-semibold tracking-wide animate-pulse">calling...</span>
            )}
          </div>
          {onReschedule && (
            <button
              onClick={() => onReschedule(lead)}
              className="w-9 h-9 rounded-full bg-[#1a1a2e] border border-violet-900 flex items-center justify-center cursor-pointer hover:bg-violet-950 transition-colors"
              title="Reschedule"
            >
              <Clock size={13} className="text-violet-400" />
            </button>
          )}
        </div>
      </div>
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
  const [activeMetrics, setActiveMetrics] = useState({ sentiment: 'Waiting...', intent: 'Discovery', leadScore: 'N/A' });
  const [callingId, setCallingId] = useState(null);
  const [meetingAlerts, setMeetingAlerts] = useState([]);
  const transcriptEndRef = useRef(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const fetchLeads = async () => {
    try {
      const res = await fetch(`${API}/leads/queue`);
      const data = await res.json();
      setLeads(data);
      const qualified = data.filter(l => l.score >= 70);
      setQualifiedLeads(qualified);
      setStats(prev => ({ ...prev, leads: data.length, completed: qualified.length }));
    } catch (e) { console.error(e); }
  };

  const fetchRescheduled = async () => {
    try {
      const res = await fetch(`${API}/leads/rescheduled`);
      const data = await res.json();
      setRescheduledLeads(data);
      setStats(prev => ({ ...prev, rescheduled: data.length }));
    } catch (e) { console.error(e); }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch(`${API}/leads/sync`, { method: 'POST' });
      setTimeout(() => { fetchLeads(); fetchRescheduled(); }, 3000);
    } catch (e) { console.error(e); }
    finally { setIsSyncing(false); }
  };

  // ─── Call Trigger ───────────────────────────────────────────────────────────
  const triggerCall = async (leadId) => {
    setCallingId(leadId);
    const lead =
      leads.find(l => l.id === leadId) ||
      rescheduledLeads.find(l => l.id === leadId) ||
      qualifiedLeads.find(l => l.id === leadId);

    toast.info(`📞 Calling ${lead?.name || 'lead'}...`, { autoClose: 8000 });

    try {
      const res = await fetch(`${API}/calls/trigger/${leadId}`, { method: 'POST' });
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

      await fetch(`${API}/leads/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: rescheduleModal.id, reschedule_time: scheduledTime.toISOString() })
      });

      toast.success(`🕐 ${rescheduleModal.name} rescheduled for ${scheduledTime.toLocaleString()}`, { autoClose: 5000 });

      // If time is now or within 2 minutes — call immediately
      if (diffMinutes <= 2) {
        await triggerCall(rescheduleModal.id);
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
    { icon: <Activity size={18} />,    label: 'Live Calls',  value: stats.active,    colorClass: 'text-blue-400',   borderClass: 'border-blue-900',   glowClass: 'bg-blue-900' },
    { icon: <Users size={18} />,       label: 'Total Leads', value: stats.leads,     colorClass: 'text-violet-400', borderClass: 'border-violet-900', glowClass: 'bg-violet-900' },
    { icon: <CheckCircle size={18} />, label: 'Qualified',   value: stats.completed, colorClass: 'text-green-400',  borderClass: 'border-green-900',  glowClass: 'bg-green-900' },
    { icon: <Clock size={18} />,       label: 'Rescheduled', value: stats.rescheduled, colorClass: 'text-yellow-400', borderClass: 'border-yellow-900', glowClass: 'bg-yellow-900' },
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
          <button
            onClick={() => navigate('/create-assistant')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer"
          >
            <Plus size={16} /> New Assistant
          </button>
          <button
            onClick={() => navigate('/call-logs')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-[13px] cursor-pointer transition-colors"
          >
            <History size={14} /> Call Logs
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 8px #4ade80' }} />
            <span className="text-[12px] text-slate-500">System Online</span>
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
                    <LeadCard key={lead.id} lead={lead} callingId={callingId} onCall={triggerCall} onReschedule={setRescheduleModal} />
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
                    <LeadCard key={lead.id} lead={lead} callingId={callingId} onCall={triggerCall} onReschedule={setRescheduleModal} />
                  ))
              )}

              {/* Rescheduled */}
              {activeTab === 'rescheduled' && (
                rescheduledLeads.length === 0
                  ? <p className="text-center text-slate-600 mt-16 text-[13px]">No rescheduled calls.</p>
                  : rescheduledLeads.map(lead => (
                    <div key={lead.id} className="p-3.5 bg-[#0a1520] rounded-xl border border-blue-900 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="m-0 font-semibold text-[14px]">{lead.name}</p>
                          <p className="m-0 text-[11px] text-slate-500 mt-0.5">{lead.company || 'No Company'}</p>
                        </div>
                        <CallingButton onClick={() => triggerCall(lead.id)} isCalling={callingId === lead.id} />
                      </div>
                      {lead.reschedule_time && (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-blue-400" />
                          <span className="text-[11px] text-blue-400">{new Date(lead.reschedule_time).toLocaleString()}</span>
                        </div>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-900 font-semibold inline-block">
                        Score: {lead.score}
                      </span>
                    </div>
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
                style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12, height: 320 }}
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

    </div>
  );
};

export default Dashboard;



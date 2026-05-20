import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, PhoneOff, Clock, Search, Filter,
  ChevronDown, Play, Pause, Mic, MicOff, TrendingUp,
  TrendingDown, Minus, User, Building2, Calendar, Hash,
  X, Volume2, FileText, Activity, ChevronRight, Download, Users
} from 'lucide-react';

const API = "http://localhost:8000";

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtDuration = (seconds) => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const SentimentIcon = ({ sentiment }) => {
  if (sentiment === 'Positive') return <TrendingUp size={13} className="text-green-400" />;
  if (sentiment === 'Negative') return <TrendingDown size={13} className="text-red-400" />;
  return <Minus size={13} className="text-slate-500" />;
};

const SentimentPill = ({ sentiment }) => {
  const cfg = {
    Positive: 'bg-green-950 text-green-400 border-green-800',
    Negative: 'bg-red-950 text-red-400 border-red-900',
    Neutral: 'bg-slate-800 text-slate-400 border-slate-700',
  };
  const cls = cfg[sentiment] || 'bg-slate-800 text-slate-500 border-slate-700';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${cls}`}>
      <SentimentIcon sentiment={sentiment} />
      {sentiment || 'Unknown'}
    </span>
  );
};

const StatusPill = ({ status }) => {
  const cfg = {
    completed: 'bg-green-950 text-green-400 border-green-800',
    queued: 'bg-yellow-950 text-yellow-400 border-yellow-900',
    in_progress: 'bg-blue-950 text-blue-400 border-blue-900',
    failed: 'bg-red-950 text-red-400 border-red-900',
  };
  const cls = cfg[status] || 'bg-slate-800 text-slate-400 border-slate-700';
  const label = status?.replace('_', ' ') || 'Unknown';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
};

const LeadScoreBadge = ({ score }) => {
  if (score === null || score === undefined) return <span className="text-slate-600 text-[12px]">—</span>;
  const color = score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`font-bold text-[14px] ${color}`}>{score}</span>;
};

// ─── Audio Player ────────────────────────────────────────────────────────────

const AudioPlayer = ({ url }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0);
  };

  const handleLoaded = () => setDuration(audioRef.current?.duration || 0);
  const handleEnded = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-3 bg-[#060a14] border border-slate-800 rounded-xl px-4 py-3">
      <audio ref={audioRef} src={url} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoaded} onEnded={handleEnded} />
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center border-none cursor-pointer transition-colors flex-shrink-0"
      >
        {playing ? <Pause size={13} className="text-white" /> : <Play size={13} className="text-white ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="h-1.5 bg-slate-800 rounded-full cursor-pointer relative overflow-hidden"
          onClick={seek}
        >
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
      <Volume2 size={13} className="text-slate-600 flex-shrink-0" />
    </div>
  );
};

// ─── Transcript Viewer ────────────────────────────────────────────────────────

const TranscriptViewer = ({ transcript }) => {
  if (!transcript) return <p className="text-slate-600 text-[13px] italic">No transcript available.</p>;

  const lines = transcript.split('\n').filter(Boolean).map((line) => {
    const i = line.indexOf(':');
    if (i === -1) return { role: 'system', content: line };
    const role = line.substring(0, i).trim().toLowerCase();
    return { role: role === 'bot' ? 'assistant' : role, content: line.substring(i + 1).trim() };
  });

  return (
    <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
      {lines.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
          <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[12px]
            ${msg.role === 'assistant'
              ? 'bg-green-950 border border-green-900 rounded-tl-none'
              : msg.role === 'user'
              ? 'bg-blue-950 border border-blue-900 rounded-tr-none'
              : 'bg-slate-800 border border-slate-700'}`}
          >
            <span className={`text-[9px] uppercase tracking-widest block mb-1
              ${msg.role === 'assistant' ? 'text-green-500' : msg.role === 'user' ? 'text-blue-400' : 'text-slate-500'}`}>
              {msg.role === 'assistant' ? '🤖 AI Agent' : msg.role === 'user' ? '👤 Lead' : msg.role}
            </span>
            <span className={msg.role === 'assistant' ? 'text-green-300' : msg.role === 'user' ? 'text-blue-300' : 'text-slate-400'}>
              {msg.content}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────

const DetailDrawer = ({ call, onClose }) => {
  const [recordingUrl, setRecordingUrl] = useState(call.recording_url || null);
  const [loadingRecording, setLoadingRecording] = useState(false);
  const [activeSection, setActiveSection] = useState('transcript');

  useEffect(() => {
    if (!recordingUrl) {
      setLoadingRecording(true);
      const _token = localStorage.getItem('token');
      fetch(`${API}/calls/logs/${call.id}/recording`, { headers: { Authorization: `Bearer ${_token}` } })
        .then(r => r.json())
        .then(d => setRecordingUrl(d.recording_url || null))
        .catch(() => {})
        .finally(() => setLoadingRecording(false));
    }
  }, [call.id]);

  const sections = [
    { key: 'transcript', label: 'Transcript', icon: <FileText size={13} /> },
    { key: 'details', label: 'Details', icon: <Activity size={13} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-[#080c14] border-l border-slate-800 flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusPill status={call.status} />
              <SentimentPill sentiment={call.sentiment} />
            </div>
            <h2 className="m-0 text-[18px] font-bold text-slate-100">{call.lead?.name}</h2>
            <p className="m-0 text-[12px] text-slate-500 mt-0.5">{call.lead?.company || 'No Company'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors border-none"
          >
            <X size={15} className="text-slate-400" />
          </button>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-3 gap-0 border-b border-slate-800">
          {[
            { label: 'Duration', value: fmtDuration(call.duration), icon: <Clock size={12} /> },
            { label: 'Lead Score', value: call.lead?.score ?? '—', icon: <TrendingUp size={12} /> },
            { label: 'Intent', value: call.intent || '—', icon: <Activity size={12} /> },
          ].map((m, i) => (
            <div key={i} className={`px-5 py-4 ${i < 2 ? 'border-r border-slate-800' : ''}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-slate-600">{m.icon}</span>
                <span className="text-[10px] text-slate-600 uppercase tracking-widest">{m.label}</span>
              </div>
              <p className="m-0 text-[15px] font-semibold text-slate-200">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Recording */}
        <div className="px-6 pt-5 pb-3">
          <p className="m-0 text-[10px] text-slate-600 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
            <Mic size={11} /> Recording
          </p>
          {loadingRecording ? (
            <div className="bg-[#060a14] border border-slate-800 rounded-xl px-4 py-3 text-[12px] text-slate-600">
              Fetching recording...
            </div>
          ) : recordingUrl ? (
            <AudioPlayer url={recordingUrl} />
          ) : (
            <div className="bg-[#060a14] border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-2">
              <MicOff size={13} className="text-slate-700" />
              <span className="text-[12px] text-slate-600">Recording not available</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-1.5 py-3 mr-5 text-[12px] font-medium border-b-2 bg-transparent border-l-0 border-r-0 border-t-0 cursor-pointer transition-all
                ${activeSection === s.key ? 'text-violet-400 border-b-violet-500' : 'text-slate-500 border-b-transparent hover:text-slate-300'}`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeSection === 'transcript' && (
            <TranscriptViewer transcript={call.transcript} />
          )}
          {activeSection === 'details' && (
            <div className="space-y-3">
              {[
                { label: 'Call ID', value: call.id, icon: <Hash size={12} /> },
                { label: 'Vapi Call ID', value: call.vapi_call_id || '—', icon: <Hash size={12} /> },
                { label: 'Date & Time', value: fmtDateTime(call.created_at), icon: <Calendar size={12} /> },
                { label: 'Lead Phone', value: call.lead?.phone || '—', icon: <Phone size={12} /> },
                { label: 'Lead Status', value: call.lead?.status || '—', icon: <Activity size={12} /> },
              ].map((row, i) => (
                <div key={i} className="flex items-start justify-between py-3 border-b border-slate-800/60">
                  <div className="flex items-center gap-2 text-slate-500">
                    {row.icon}
                    <span className="text-[12px]">{row.label}</span>
                  </div>
                  <span className="text-[12px] text-slate-300 font-medium text-right max-w-[55%] break-all">{row.value}</span>
                </div>
              ))}
              {recordingUrl && (
                <a
                  href={recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-[12px] transition-colors"
                >
                  <Download size={13} /> Download Recording
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const STATUSES = ['all', 'completed', 'queued', 'in_progress', 'failed'];
const SENTIMENTS = ['all', 'Positive', 'Neutral', 'Negative'];

const CallLogs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [selectedCall, setSelectedCall] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const localUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = localUser.role === 'admin';
  const token = localStorage.getItem('token');
  const authHeaders = { Authorization: `Bearer ${token}` };

  const [usersList, setUsersList] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  const fetchLogs = async (userId = selectedUserId) => {
    setLoading(true);
    try {
      const query = userId ? `?user_id=${userId}` : '';
      const res = await fetch(`${API}/calls/logs${query}`, { headers: authHeaders });
      if (!res.ok) { console.error('fetchLogs failed:', res.status); setLogs([]); return; }
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : data.calls ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API}/admin/users`, { headers: authHeaders });
      if (res.ok) setUsersList(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchLogs();
    fetchUsers();
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setUserDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { fetchLogs(selectedUserId); }, [selectedUserId]);

  const filtered = logs
    .filter(l => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        l.lead?.name?.toLowerCase().includes(q) ||
        l.lead?.company?.toLowerCase().includes(q) ||
        l.lead?.phone?.includes(q) ||
        l.vapi_call_id?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchSentiment = sentimentFilter === 'all' || l.sentiment === sentimentFilter;
      return matchSearch && matchStatus && matchSentiment;
    })
    .sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (sortBy === 'lead.score') { va = a.lead?.score ?? 0; vb = b.lead?.score ?? 0; }
      if (sortBy === 'duration') { va = a.duration ?? 0; vb = b.duration ?? 0; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const callsWithDuration = logs.filter(l => l.duration > 0);
  const summary = {
    total: logs.length,
    completed: logs.filter(l => l.status === 'completed').length,
    avgDuration: callsWithDuration.length
      ? Math.round(callsWithDuration.reduce((a, l) => a + l.duration, 0) / callsWithDuration.length)
      : 0,
    positive: logs.filter(l => l.sentiment === 'Positive').length,
  };

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronDown size={11} className="text-slate-700 ml-0.5" />;
    return sortDir === 'asc'
      ? <ChevronDown size={11} className="text-violet-400 ml-0.5 rotate-180" />
      : <ChevronDown size={11} className="text-violet-400 ml-0.5" />;
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-200" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* Top bar */}
      <div className="border-b border-slate-800 px-8 py-4 bg-[#0a0f1e] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-200 transition-colors bg-transparent border-none cursor-pointer text-[13px]"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <div className="w-px h-5 bg-slate-800" />
          <div>
            <p className="m-0 font-bold text-[15px] tracking-tight">Call Logs</p>
            <p className="m-0 text-[11px] text-slate-500">Complete call history & analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Admin user filter dropdown */}
          {isAdmin && (
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setUserDropdownOpen(o => !o)}
                className="flex items-center gap-2 bg-[#0d1526] border border-[#1e3a5f] rounded-[10px] px-3 py-1.5 cursor-pointer min-w-[190px] select-none"
              >
                <div className="w-[20px] h-[20px] rounded-[5px] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <Users size={10} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-[9px] text-slate-500 uppercase tracking-widest font-semibold leading-none">Filter by user</p>
                  <p className="m-0 text-[12px] text-slate-200 font-semibold truncate">
                    {selectedUserId ? (usersList.find(u => u.id == selectedUserId)?.full_name || 'User') : 'All Users'}
                  </p>
                </div>
                <ChevronDown size={13} className={`text-slate-500 flex-shrink-0 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {userDropdownOpen && (
                <div className="absolute top-[calc(100%+6px)] right-0 bg-[#0d1526] border border-[#1e3a5f] rounded-xl z-50 min-w-[220px] p-1.5 shadow-xl">
                  <div
                    onClick={() => { setSelectedUserId(''); setUserDropdownOpen(false); }}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${!selectedUserId ? 'bg-indigo-950' : 'hover:bg-[#131f35]'}`}
                  >
                    <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Users size={11} className="text-slate-400" />
                    </div>
                    <p className="m-0 text-[12px] text-slate-200 font-semibold flex-1">All Users</p>
                    {!selectedUserId && <div className="w-3 h-3 rounded-full bg-indigo-500" />}
                  </div>
                  <div className="h-px bg-slate-800 my-1" />
                  {usersList.map(u => {
                    const initials = (u.full_name || u.email).slice(0, 2).toUpperCase();
                    const isSel = selectedUserId == u.id;
                    return (
                      <div
                        key={u.id}
                        onClick={() => { setSelectedUserId(u.id); setUserDropdownOpen(false); }}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${isSel ? 'bg-indigo-950' : 'hover:bg-[#131f35]'}`}
                      >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${u.role === 'admin' ? 'bg-indigo-950 border border-indigo-800 text-indigo-400' : 'bg-green-950 border border-green-800 text-green-400'}`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="m-0 text-[12px] text-slate-200 font-semibold truncate">{u.full_name || u.email}</p>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border flex-shrink-0 ${u.role === 'admin' ? 'bg-indigo-950 text-indigo-400 border-indigo-800' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                        {isSel && <div className="w-3 h-3 rounded-full bg-indigo-500 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => fetchLogs()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-[13px] cursor-pointer transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="px-8 py-6">

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Calls', value: summary.total, color: 'text-violet-400', border: 'border-violet-900', glow: 'bg-violet-900', icon: <Phone size={16} /> },
            { label: 'Completed', value: summary.completed, color: 'text-green-400', border: 'border-green-900', glow: 'bg-green-900', icon: <PhoneOff size={16} /> },
            { label: 'Avg Duration', value: fmtDuration(summary.avgDuration), color: 'text-blue-400', border: 'border-blue-900', glow: 'bg-blue-900', icon: <Clock size={16} /> },
            { label: 'Positive Calls', value: summary.positive, color: 'text-yellow-400', border: 'border-yellow-900', glow: 'bg-yellow-900', icon: <TrendingUp size={16} /> },
          ].map((s, i) => (
            <div key={i} className={`bg-[#0d1526] border ${s.border} rounded-xl p-5 relative overflow-hidden`}>
              <div className={`absolute top-0 right-0 w-20 h-20 rounded-full ${s.glow} opacity-30 blur-3xl`} />
              <div className="flex items-center gap-2 mb-3">
                <span className={s.color}>{s.icon}</span>
                <span className="text-[11px] text-slate-500 uppercase tracking-widest">{s.label}</span>
              </div>
              <p className={`m-0 text-4xl font-bold leading-none ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              placeholder="Search by name, company, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#0d1526] border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 outline-none focus:border-violet-800 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-600" />
            <span className="text-[11px] text-slate-600 uppercase tracking-widest">Status</span>
          </div>
          <div className="flex gap-1.5">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all
                  ${statusFilter === s ? 'bg-violet-600 border-violet-500 text-white' : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[11px] text-slate-600 uppercase tracking-widest">Sentiment</span>
            {SENTIMENTS.map(s => (
              <button
                key={s}
                onClick={() => setSentimentFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all
                  ${sentimentFilter === s ? 'bg-violet-600 border-violet-500 text-white' : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#0d1526] border border-slate-800 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid text-[10px] uppercase tracking-widest text-slate-600 px-5 py-3 border-b border-slate-800 bg-[#0a0f1e]"
            style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 36px' }}>
            {[
              { label: 'Lead', col: null },
              { label: 'Date & Time', col: 'created_at' },
              { label: 'Duration', col: 'duration' },
              { label: 'Status', col: 'status' },
              { label: 'Sentiment', col: 'sentiment' },
              { label: 'Intent', col: 'intent' },
              { label: '', col: null },
            ].map((h, i) => (
              <div
                key={i}
                onClick={() => h.col && toggleSort(h.col)}
                className={`flex items-center gap-0.5 ${h.col ? 'cursor-pointer hover:text-slate-400 transition-colors select-none' : ''}`}
              >
                {h.label}
                {h.col && <SortIcon col={h.col} />}
              </div>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div className="py-24 text-center text-slate-600 text-[13px]">Loading call logs…</div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center text-slate-600 text-[13px]">No calls match your filters.</div>
          ) : (
            filtered.map((call, i) => (
              <div
                key={call.id}
                onClick={() => setSelectedCall(call)}
                className={`grid items-center px-5 py-4 cursor-pointer transition-colors hover:bg-[#111827] group
                  ${i < filtered.length - 1 ? 'border-b border-slate-800/60' : ''}`}
                style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 36px' }}
              >
                {/* Lead */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#1a1a3a] border border-violet-900/50 flex items-center justify-center flex-shrink-0">
                    <User size={13} className="text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-[13px] font-semibold truncate">{call.lead?.name || '—'}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Building2 size={10} className="text-slate-600 flex-shrink-0" />
                      <p className="m-0 text-[11px] text-slate-500 truncate">{call.lead?.company || 'No Company'}</p>
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <p className="m-0 text-[12px] text-slate-300">{fmtDate(call.created_at)}</p>
                  <p className="m-0 text-[11px] text-slate-600">{fmtTime(call.created_at)}</p>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-slate-600" />
                  <span className="text-[13px] text-slate-300">{fmtDuration(call.duration)}</span>
                </div>

                {/* Status */}
                <div><StatusPill status={call.status} /></div>

                {/* Sentiment */}
                <div><SentimentPill sentiment={call.sentiment} /></div>

                {/* Intent */}
                <div>
                  <span className="text-[12px] text-slate-400">{call.intent || '—'}</span>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-end">
                  <ChevronRight size={15} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <p className="text-[11px] text-slate-700 mt-3 text-center">
            Showing {filtered.length} of {logs.length} calls
            {isAdmin && selectedUserId && ` · ${usersList.find(u => u.id == selectedUserId)?.full_name || 'User'}'s logs`}
          </p>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedCall && (
        <DetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  );
};

export default CallLogs;


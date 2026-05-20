import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Users, Activity, CheckCircle, Phone, Zap, LogOut,
  ChevronDown, ChevronUp, Shield, Link as LinkIcon,
  ToggleLeft, ToggleRight, Trash2, X
} from 'lucide-react';

const API = "http://localhost:8000";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [expandedUser, setExpandedUser] = useState(null);
  const [userLeads, setUserLeads] = useState({});
  const [userCalls, setUserCalls] = useState({});
  const [loadingLeads, setLoadingLeads] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  const token = localStorage.getItem('token');

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchOverview = async () => {
    try {
      const res = await fetch(`${API}/admin/overview`, { headers: authHeaders });
      if (res.status === 403) { navigate('/'); return; }
      setOverview(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/admin/users`, { headers: authHeaders });
      setUsers(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchUserData = async (userId) => {
    if (userLeads[userId]) return;
    setLoadingLeads(userId);
    try {
      const [leadsRes, callsRes] = await Promise.all([
        fetch(`${API}/admin/users/${userId}/leads`, { headers: authHeaders }),
        fetch(`${API}/admin/users/${userId}/calls`, { headers: authHeaders }),
      ]);

      // Resolve JSON BEFORE passing to state setters
      const [leads, calls] = await Promise.all([
        leadsRes.json(),
        callsRes.json(),
      ]);

      setUserLeads(prev => ({ ...prev, [userId]: leads }));
      setUserCalls(prev => ({ ...prev, [userId]: calls }));
    } catch (e) { console.error(e); }
    finally { setLoadingLeads(null); }
  };

  const toggleExpand = (userId) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      fetchUserData(userId);
    }
  };

  const toggleUserActive = async (user) => {
    try {
      await fetch(`${API}/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active })
      });
      toast.success(`User ${user.is_active ? 'disabled' : 'enabled'}`);
      fetchUsers();
    } catch (e) { toast.error('Update failed'); }
  };

  const deleteUser = async (userId) => {
    try {
      await fetch(`${API}/admin/users/${userId}`, { method: 'DELETE', headers: authHeaders });
      toast.success('User deleted');
      setDeleteModal(null);
      fetchUsers();
      fetchOverview();
    } catch (e) { toast.error('Delete failed'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    fetchOverview();
    fetchUsers();
  }, []);

  const statusColor = (status) => {
    if (status === 'qualified') return 'text-green-400';
    if (status === 'cold') return 'text-red-400';
    if (status === 'rescheduled') return 'text-blue-400';
    if (status === 'handoff') return 'text-yellow-400';
    return 'text-slate-400';
  };

  const sentimentColor = (s) => {
    if (s === 'Positive') return 'text-green-400';
    if (s === 'Negative') return 'text-red-400';
    return 'text-slate-400';
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <ToastContainer position="bottom-right" theme="dark" />

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
          <div className="bg-[#0d1526] border border-slate-800 rounded-2xl p-7 w-80 relative">
            <button onClick={() => setDeleteModal(null)} className="absolute top-4 right-4 bg-transparent border-none cursor-pointer text-slate-500"><X size={16} /></button>
            <div className="w-10 h-10 rounded-full bg-red-950 border border-red-800 flex items-center justify-center mb-4">
              <Trash2 size={18} className="text-red-400" />
            </div>
            <p className="m-0 font-bold text-[15px] mb-1">Delete User?</p>
            <p className="m-0 text-[12px] text-slate-500 mb-6">This deletes <span className="text-slate-300 font-medium">{deleteModal.email}</span> and all their leads. Cannot be undone.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-2 bg-transparent border border-slate-700 rounded-lg text-slate-500 text-[13px] cursor-pointer">Cancel</button>
              <button onClick={() => deleteUser(deleteModal.id)} className="flex-1 py-2 bg-red-700 hover:bg-red-600 border-none rounded-lg text-white text-[13px] font-semibold cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="border-b border-slate-800 bg-[#0a0f1e] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="m-0 font-bold text-[15px]">Admin Dashboard</p>
            <p className="m-0 text-[11px] text-slate-500">Cyberify Voice AI</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-[13px] cursor-pointer transition-colors border-none flex items-center gap-2">
            <Zap size={13} /> User View
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 text-[13px] cursor-pointer transition-colors border-none">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      <div className="px-8 py-6">

        {/* Overview Stats */}
        {overview && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Users', value: overview.users.total, sub: `${overview.users.active} active`, color: 'text-violet-400', border: 'border-violet-900', glow: 'bg-violet-900', icon: <Users size={17} /> },
              { label: 'HubSpot Connected', value: overview.users.hubspot_connected, sub: 'accounts linked', color: 'text-orange-400', border: 'border-orange-900', glow: 'bg-orange-900', icon: <LinkIcon size={17} /> },
              { label: 'Total Leads', value: overview.leads.total, sub: `${overview.leads.qualified} qualified`, color: 'text-green-400', border: 'border-green-900', glow: 'bg-green-900', icon: <CheckCircle size={17} /> },
              { label: 'Total Calls', value: overview.calls.total, sub: `${overview.calls.completed} completed`, color: 'text-blue-400', border: 'border-blue-900', glow: 'bg-blue-900', icon: <Phone size={17} /> },
            ].map((s, i) => (
              <div key={i} className={`bg-[#0d1526] border ${s.border} rounded-xl p-5 relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-full ${s.glow} opacity-30 blur-3xl`} />
                <div className="flex items-center gap-2 mb-3">
                  <span className={s.color}>{s.icon}</span>
                  <span className="text-[11px] text-slate-500 uppercase tracking-widest">{s.label}</span>
                </div>
                <p className={`m-0 text-4xl font-bold leading-none ${s.color}`}>{s.value}</p>
                <p className="m-0 text-[11px] text-slate-600 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-[#0d1526] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-semibold flex items-center gap-2">
              <Users size={16} className="text-violet-400" /> All Users
            </h2>
            <span className="text-[12px] text-slate-500">{users.length} total</span>
          </div>

          <div className="divide-y divide-slate-800">
            {users.map(user => (
              <div key={user.id}>
                {/* User Row */}
                <div
                  className="px-6 py-4 flex items-center gap-4 hover:bg-slate-800/30 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(user.id)}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center flex-shrink-0 text-[13px] font-bold text-indigo-400">
                    {(user.full_name || user.email)[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[14px]">{user.full_name || '—'}</span>
                      {user.role === 'admin' && (
                        <span className="text-[9px] bg-violet-950 text-violet-400 border border-violet-800 px-1.5 py-0.5 rounded-full font-bold uppercase">Admin</span>
                      )}
                      {!user.is_active && (
                        <span className="text-[9px] bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded-full font-bold uppercase">Disabled</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">{user.email}</span>
                  </div>

                  {/* HubSpot status */}
                  <div className={`text-[11px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${user.hubspot_connected ? 'bg-orange-950 text-orange-400 border-orange-800' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                    {user.hubspot_connected ? '🔗 HubSpot' : 'No HubSpot'}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-center flex-shrink-0">
                    <div>
                      <p className="m-0 text-[14px] font-bold text-violet-400">{user.stats.leads}</p>
                      <p className="m-0 text-[10px] text-slate-600">Leads</p>
                    </div>
                    <div>
                      <p className="m-0 text-[14px] font-bold text-blue-400">{user.stats.calls}</p>
                      <p className="m-0 text-[10px] text-slate-600">Calls</p>
                    </div>
                    <div>
                      <p className="m-0 text-[14px] font-bold text-green-400">{user.stats.qualified}</p>
                      <p className="m-0 text-[10px] text-slate-600">Qualified</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => toggleUserActive(user)}
                      className={`p-1.5 rounded-lg border-none cursor-pointer transition-colors ${user.is_active ? 'bg-green-950 text-green-400 hover:bg-green-900' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                      title={user.is_active ? 'Disable user' : 'Enable user'}
                    >
                      {user.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => setDeleteModal(user)}
                        className="p-1.5 rounded-lg bg-transparent border-none cursor-pointer text-slate-600 hover:text-red-400 hover:bg-red-950 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {expandedUser === user.id ? <ChevronUp size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
                  </div>
                </div>

                {/* Expanded: Leads + Calls */}
                {expandedUser === user.id && (
                  <div className="bg-[#060a14] border-t border-slate-800 px-6 py-5">
                    {loadingLeads === user.id ? (
                      <p className="text-slate-600 text-[13px]">Loading data...</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-6">
                        {/* Leads */}
                        <div>
                          <p className="m-0 mb-3 text-[11px] text-slate-500 uppercase tracking-widest font-semibold">
                            Leads ({userLeads[user.id]?.length || 0})
                          </p>
                          <div className="space-y-1.5 max-h-52 overflow-y-auto">
                            {(userLeads[user.id] || []).length === 0
                              ? <p className="text-slate-700 text-[12px]">No leads yet</p>
                              : (userLeads[user.id] || []).map(lead => (
                                <div key={lead.id} className="flex items-center justify-between bg-[#0d1526] rounded-lg px-3 py-2 border border-slate-800">
                                  <div>
                                    <p className="m-0 text-[12px] font-medium">{lead.name}</p>
                                    <p className="m-0 text-[10px] text-slate-600">{lead.phone}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[11px] font-bold ${lead.score >= 70 ? 'text-green-400' : lead.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                      {lead.score}pts
                                    </span>
                                    <span className={`text-[10px] ${statusColor(lead.status)}`}>{lead.status}</span>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        </div>

                        {/* Calls */}
                        <div>
                          <p className="m-0 mb-3 text-[11px] text-slate-500 uppercase tracking-widest font-semibold">
                            Recent Calls ({userCalls[user.id]?.length || 0})
                          </p>
                          <div className="space-y-1.5 max-h-52 overflow-y-auto">
                            {(userCalls[user.id] || []).length === 0
                              ? <p className="text-slate-700 text-[12px]">No calls yet</p>
                              : (userCalls[user.id] || []).slice(0, 10).map(call => (
                                <div key={call.id} className="flex items-center justify-between bg-[#0d1526] rounded-lg px-3 py-2 border border-slate-800">
                                  <div>
                                    <p className="m-0 text-[12px] font-medium">{call.lead?.name || 'Test Call'}</p>
                                    <p className="m-0 text-[10px] text-slate-600">
                                      {call.created_at ? new Date(call.created_at).toLocaleDateString() : '—'}
                                      {call.duration ? ` · ${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, '0')}` : ''}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {call.sentiment && (
                                      <span className={`text-[10px] font-medium ${sentimentColor(call.sentiment)}`}>{call.sentiment}</span>
                                    )}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${call.status === 'completed' ? 'bg-green-950 text-green-500' : 'bg-slate-800 text-slate-500'}`}>
                                      {call.status}
                                    </span>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {users.length === 0 && (
              <div className="px-6 py-12 text-center text-slate-600 text-[13px]">No users yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


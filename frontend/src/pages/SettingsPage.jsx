import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Zap, CheckCircle, XCircle, ArrowLeft, LogOut, User, Link as LinkIcon } from 'lucide-react';

const API = "http://localhost:8000";

const SettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [hubspotStatus, setHubspotStatus] = useState({ connected: false, portal_id: null });
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const token = localStorage.getItem('token');

  const fetchMe = async () => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { navigate('/login'); return; }
      const data = await res.json();
      setUser(data);
    } catch (e) { console.error(e); }
  };

  const fetchHubspotStatus = async () => {
    try {
      const res = await fetch(`${API}/hubspot-oauth/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setHubspotStatus(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchMe();
    fetchHubspotStatus();

    // Handle redirect back from HubSpot
    const hubspotResult = searchParams.get('hubspot');
    if (hubspotResult === 'success') {
      toast.success('✅ HubSpot connected successfully!');
      fetchHubspotStatus();
    } else if (hubspotResult === 'error') {
      toast.error('❌ HubSpot connection failed. Try again.');
    }
  }, []);

  const handleHubspotConnect = () => {
    // Redirect to backend which redirects to HubSpot OAuth
    window.location.href = `${API}/hubspot-oauth/connect?token=${token}`;
  };

  const handleHubspotDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch(`${API}/hubspot-oauth/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setHubspotStatus({ connected: false, portal_id: null });
      toast.success('HubSpot disconnected');
    } catch (e) {
      toast.error('Disconnect failed');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <ToastContainer position="top-right" theme="dark" />

      {/* Top bar */}
      <div className="border-b border-slate-800 bg-[#0a0f1e] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors bg-transparent border-none cursor-pointer text-slate-400"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <p className="m-0 font-bold text-[15px]">Settings</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 text-[13px] cursor-pointer transition-colors border-none"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-8 space-y-6">

        {/* Account Info */}
        <div className="bg-[#0d1526] border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-violet-400" />
            <h2 className="m-0 text-[14px] font-semibold uppercase tracking-widest text-violet-400">Account</h2>
          </div>
          {user && (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-[13px] text-slate-500">Full Name</span>
                <span className="text-[13px] font-medium">{user.full_name || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-[13px] text-slate-500">Email</span>
                <span className="text-[13px] font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-[13px] text-slate-500">Role</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${user.role === 'admin' ? 'bg-violet-950 text-violet-400 border border-violet-800' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                  {user.role}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[13px] text-slate-500">Member since</span>
                <span className="text-[13px] font-medium">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* HubSpot Connection */}
        <div className="bg-[#0d1526] border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <LinkIcon size={16} className="text-orange-400" />
            <h2 className="m-0 text-[14px] font-semibold uppercase tracking-widest text-orange-400">HubSpot Integration</h2>
          </div>

          {loading ? (
            <p className="text-slate-500 text-[13px]">Checking connection...</p>
          ) : hubspotStatus.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-green-950/40 border border-green-800 rounded-xl px-4 py-3">
                <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                <div>
                  <p className="m-0 text-[13px] font-semibold text-green-300">Connected</p>
                  {hubspotStatus.portal_id && (
                    <p className="m-0 text-[11px] text-green-600">Portal ID: {hubspotStatus.portal_id}</p>
                  )}
                </div>
              </div>
              <p className="text-[12px] text-slate-500 m-0">
                Your HubSpot account is connected. Leads will sync from your HubSpot CRM when you click Sync on the dashboard.
              </p>
              <button
                onClick={handleHubspotDisconnect}
                disabled={disconnecting}
                className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-800 text-red-400 text-[13px] font-medium rounded-lg cursor-pointer transition-colors border-none"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect HubSpot'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-slate-800/40 border border-slate-700 rounded-xl px-4 py-3">
                <XCircle size={18} className="text-slate-500 flex-shrink-0" />
                <div>
                  <p className="m-0 text-[13px] font-semibold text-slate-400">Not connected</p>
                  <p className="m-0 text-[11px] text-slate-600">Connect your HubSpot to start syncing leads</p>
                </div>
              </div>
              <p className="text-[12px] text-slate-500 m-0">
                Click below to authorize Cyberify Voice AI to access your HubSpot contacts. You'll be redirected to HubSpot to approve the connection.
              </p>
              <button
                onClick={handleHubspotConnect}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-[13px] font-semibold rounded-lg cursor-pointer transition-colors border-none"
              >
                <img src="https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png" alt="" className="w-4 h-4" />
                Connect HubSpot
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;


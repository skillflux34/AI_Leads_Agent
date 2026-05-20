import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Save,
  Play,
  Sparkles,
  Mic,
  PhoneOff,
  MessageSquare,
  Brain,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Trash2,
  CheckCircle2,
  Zap,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Vapi from '@vapi-ai/web';

const API = "http://localhost:8000";

const CreateAssistant = () => {
  const navigate = useNavigate();

  const vapi = useMemo(() => {
    const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
    if (!publicKey) console.error("Vapi Public Key is missing from .env");
    return new (Vapi.default || Vapi)(publicKey);
  }, []);

  const [loading, setLoading] = useState(false);
  const [assistants, setAssistants] = useState([]);
  const [isCalling, setIsCalling] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assistantToDelete, setAssistantToDelete] = useState(null);
  const [setActiveLoading, setSetActiveLoading] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    firstMessage: 'Hello! This is Sarah from Techflow. How can I help you today?',
    systemPrompt: 'You are a helpful assistant...',
    voiceId: 'jennifer',
    modelName: 'gpt-4o-mini',
    vapi_assistant_id: null,
  });

  const localUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = localUser.role === 'admin';
  const token = localStorage.getItem('token');
  const authHeaders = { Authorization: `Bearer ${token}` };

  const [usersList, setUsersList] = useState([]);
  const [selectedFilterUserId, setSelectedFilterUserId] = useState('');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Active assistant = the one with is_active: true
  const activeAssistant = assistants.find(a => a.is_active);

  useEffect(() => {
    if (!vapi) return;

    const handleCallStart = (call) => {
      setIsCalling(true);
      fetch(`${API}/calls/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vapi_call_id: call.id, assistant_id: formData.vapi_assistant_id })
      }).catch(err => console.error("Registration failed:", err));
    };

    const handleEnd = () => setIsCalling(false);
    const handleError = (err) => { console.error("Vapi Error:", err); setIsCalling(false); };

    vapi.on('call-start', handleCallStart);
    vapi.on('call-end', handleEnd);
    vapi.on('error', handleError);

    return () => {
      vapi.off('call-start', handleCallStart);
      vapi.off('call-end', handleEnd);
      vapi.off('error', handleError);
    };
  }, [vapi, formData.vapi_assistant_id]);

  const fetchAssistants = async (userId = selectedFilterUserId) => {
    try {
      const query = userId ? `?user_id=${userId}` : '';
      const res = await fetch(`${API}/assistants/list${query}`, { headers: authHeaders });
      if (!res.ok) { console.error('fetchAssistants failed:', res.status); return; }
      const data = await res.json();
      setAssistants(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Error fetching assistants:", err); }
  };

  const fetchUsersForFilter = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API}/admin/users`, { headers: authHeaders });
      if (res.ok) setUsersList(await res.json());
    } catch (err) { console.error("Error fetching users:", err); }
  };

  useEffect(() => {
    fetchAssistants();
    fetchUsersForFilter();
  }, []);

  useEffect(() => { fetchAssistants(selectedFilterUserId); }, [selectedFilterUserId]);

  const handleSelectAssistant = (assistant) => {
    setFormData({
      name: assistant.name,
      firstMessage: assistant.first_message,
      systemPrompt: assistant.system_prompt,
      voiceId: assistant.voice_id,
      modelName: assistant.model_name,
      vapi_assistant_id: assistant.vapi_assistant_id,
    });
  };

  const handleSetActive = async (e, vapiAssistantId) => {
    e.stopPropagation();
    setSetActiveLoading(vapiAssistantId);
    try {
      const res = await fetch(`${API}/assistants/set-active/${vapiAssistantId}`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (res.ok) {
        await fetchAssistants();
        setSuccessMessage(`✅ "${data.message}"`);
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) { console.error("Set active failed:", err); }
    finally { setSetActiveLoading(null); }
  };

  const toggleCall = async () => {
    if (isCalling) {
      vapi.stop();
    } else {
      if (!formData.vapi_assistant_id) {
        alert("Please select an assistant from the list below to test.");
        return;
      }
      try { await vapi.start(formData.vapi_assistant_id); }
      catch (err) { console.error("Failed to start Vapi call:", err); }
    }
  };

  const confirmDelete = (e, id) => {
    e.stopPropagation();
    setAssistantToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API}/assistants/${assistantToDelete}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) {
        setAssistants(assistants.filter(a => a.vapi_assistant_id !== assistantToDelete));
        if (formData.vapi_assistant_id === assistantToDelete) {
          setFormData({ ...formData, vapi_assistant_id: null });
        }
        setShowDeleteModal(false);
      }
    } catch (err) { console.error("Delete failed:", err); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/assistants/create`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          system_prompt: formData.systemPrompt,
          first_message: formData.firstMessage,
          voice_id: formData.voiceId,
          model_name: formData.modelName,
        }),
      });
      if (res.ok) {
        await fetchAssistants();
        setFormData(prev => ({ ...prev, name: '' }));
      }
    } catch (err) { console.error("Failed to save assistant", err); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-slate-200">

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
          <div className="bg-[#0d1526] border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="text-red-500" size={24} />
            </div>
            <h2 className="text-xl text-white font-bold">Delete Assistant?</h2>
            <p className="text-slate-400 mt-2 text-sm">This action cannot be undone. The assistant will be removed from your database.</p>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none">Cancel</button>
              <button onClick={handleDelete} className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg text-white font-bold transition-all cursor-pointer border-none">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="border-b border-slate-800 bg-[#060a14]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer bg-transparent border-none text-slate-200">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white m-0">AI Assistant Manager</h1>
              <p className="text-xs text-slate-500 m-0">Configure and activate your AI agent for outbound calls</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin workspace filter */}
            {isAdmin && (
              <div className="relative">
                <div
                  onClick={() => setFilterDropdownOpen(o => !o)}
                  className="flex items-center gap-2 bg-[#0d1526] border border-[#1e3a5f] rounded-[10px] px-3 py-1.5 cursor-pointer min-w-[190px] select-none"
                >
                  <div className="w-[20px] h-[20px] rounded-[5px] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                    <Users size={10} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 text-[9px] text-slate-500 uppercase tracking-widest font-semibold leading-none">Filter by user</p>
                    <p className="m-0 text-[12px] text-slate-200 font-semibold truncate">
                      {selectedFilterUserId
                        ? (usersList.find(u => u.id == selectedFilterUserId)?.full_name || 'User')
                        : 'All Users'}
                    </p>
                  </div>
                  <ChevronDown size={13} className={`text-slate-500 flex-shrink-0 transition-transform ${filterDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {filterDropdownOpen && (
                  <div className="absolute top-[calc(100%+6px)] right-0 bg-[#0d1526] border border-[#1e3a5f] rounded-xl overflow-hidden z-50 min-w-[220px] p-1.5 shadow-xl">
                    <div
                      onClick={() => { setSelectedFilterUserId(''); setFilterDropdownOpen(false); }}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${!selectedFilterUserId ? 'bg-indigo-950' : 'hover:bg-[#131f35]'}`}
                    >
                      <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <Users size={11} className="text-slate-400" />
                      </div>
                      <p className="m-0 text-[12px] text-slate-200 font-semibold flex-1">All Users</p>
                      {!selectedFilterUserId && <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 flex items-center justify-center"><CheckCircle2 size={8} className="text-white" /></div>}
                    </div>
                    <div className="h-px bg-slate-800 my-1" />
                    {usersList.map(u => {
                      const initials = (u.full_name || u.email).slice(0, 2).toUpperCase();
                      const isSel = selectedFilterUserId == u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => { setSelectedFilterUserId(u.id); setFilterDropdownOpen(false); }}
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
                          {isSel && <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0"><CheckCircle2 size={8} className="text-white" /></div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Active assistant indicator */}
            {activeAssistant && (
              <div className="flex items-center gap-2 bg-green-950 border border-green-800 rounded-full px-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[11px] text-green-400 font-semibold">Active: {activeAssistant.name}</span>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={loading || !formData.name}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all border-none cursor-pointer ${
                formData.name ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Creating...' : <><Save size={18} />Save Assistant</>}
            </button>
          </div>
        </div>
      </div>

      {/* Success toast */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-950 border border-green-700 text-green-300 px-5 py-3 rounded-xl text-sm font-medium shadow-xl animate-pulse">
          {successMessage}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">

          {/* Active call assistant banner */}
          {activeAssistant ? (
            <div className="bg-green-950/40 border border-green-800 rounded-xl px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-900 border border-green-700 flex items-center justify-center">
                  <Zap size={14} className="text-green-400" />
                </div>
                <div>
                  <p className="m-0 text-[13px] font-semibold text-green-300">
                    <span className="text-green-500">"{activeAssistant.name}"</span> will handle all outbound calls
                  </p>
                  <p className="m-0 text-[11px] text-green-600 mt-0.5">Click a different assistant below to switch</p>
                </div>
              </div>
              <CheckCircle2 size={20} className="text-green-500" />
            </div>
          ) : (
            <div className="bg-yellow-950/40 border border-yellow-800 rounded-xl px-5 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-900 border border-yellow-700 flex items-center justify-center">
                <Zap size={14} className="text-yellow-400" />
              </div>
              <div>
                <p className="m-0 text-[13px] font-semibold text-yellow-300">No active assistant selected</p>
                <p className="m-0 text-[11px] text-yellow-600 mt-0.5">Select an assistant below and click "Set Active for Calls"</p>
              </div>
            </div>
          )}

          {/* Identity Section */}
          <section className="bg-[#0d1526] border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4 text-indigo-400">
              <ShieldCheck size={18} />
              <h2 className="font-semibold uppercase tracking-wider text-xs m-0">Identity & Model</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Assistant Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sales Closer - Alex"
                  className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-4 py-2.5 focus:border-indigo-500 outline-none transition-colors text-slate-200"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Model</label>
                  <select
                    className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-4 py-2.5 outline-none text-slate-200"
                    value={formData.modelName}
                    onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                  >
                    <option value="gpt-4o-mini">GPT-4o-Mini (Fastest)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Voice</label>
                  <select
                    className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-4 py-2.5 outline-none text-slate-200"
                    value={formData.voiceId}
                    onChange={(e) => setFormData({ ...formData, voiceId: e.target.value })}
                  >
                    <option value="jennifer">Jennifer (Cartesia)</option>
                    <option value="steven">Steven (Cartesia)</option>
                    <option value="rachel">Rachel (11Labs)</option>
                    <option value="Layla">Layla (Vapi)</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Behavior Section */}
          <section className="bg-[#0d1526] border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Brain size={18} />
              <h2 className="font-semibold uppercase tracking-wider text-xs m-0">Behavior & Prompting</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">First Message</label>
                <input
                  type="text"
                  className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-4 py-2.5 focus:border-emerald-500 outline-none transition-colors text-slate-200"
                  value={formData.firstMessage}
                  onChange={(e) => setFormData({ ...formData, firstMessage: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">System Prompt</label>
                <textarea
                  rows={8}
                  className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-4 py-2.5 focus:border-emerald-500 outline-none transition-colors resize-none text-sm font-mono text-slate-200"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5">
          <div className="sticky top-24">

            {/* Preview card */}
            <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-indigo-500/30 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={120} /></div>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-xl transition-all duration-500 ${isCalling ? 'bg-red-500 shadow-red-500/40 animate-pulse' : 'bg-indigo-600 shadow-indigo-500/40'}`}>
                  <Mic size={40} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{formData.name || 'Untitled Agent'}</h3>
                <div className="flex gap-2 mb-6 flex-wrap justify-center">
                  <span className="bg-slate-800 px-3 py-1 rounded-full text-[10px] uppercase font-bold text-slate-400 border border-slate-700">{formData.modelName}</span>
                  <span className="bg-slate-800 px-3 py-1 rounded-full text-[10px] uppercase font-bold text-slate-400 border border-slate-700">{formData.voiceId}</span>
                </div>
                <div className="w-full bg-[#060a14]/60 rounded-xl p-4 text-left border border-slate-800 mb-6">
                  <p className="text-[10px] text-indigo-400 uppercase font-bold mb-2 flex items-center gap-1 m-0"><MessageSquare size={12} />Greeting</p>
                  <p className="text-sm italic text-slate-300 m-0">"{formData.firstMessage}"</p>
                </div>

                <button
                  onClick={toggleCall}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border-none cursor-pointer ${
                    isCalling ? 'bg-red-500 text-white' : 'bg-white text-black hover:bg-slate-200'
                  }`}
                >
                  {isCalling ? <PhoneOff size={18} /> : <Play size={18} fill="black" />}
                  {isCalling ? 'End Test Call' : 'Test This Assistant'}
                </button>
                <p className="text-[11px] text-slate-500 mt-4 m-0">Testing uses your Vapi credits. Mic access required.</p>
              </div>
            </div>

            {/* Assistants List */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-semibold text-slate-400 m-0">
                  {isAdmin && selectedFilterUserId
                    ? `${usersList.find(u => u.id == selectedFilterUserId)?.full_name || 'User'}'s Assistants`
                    : isAdmin ? 'All Assistants' : 'Your Assistants'}
                </h3>
                <span className="text-[11px] text-slate-600">Click to preview · Set active for calls</span>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {assistants.length > 0 ? assistants.map((assistant) => {
                  const isSelected = formData.vapi_assistant_id === assistant.vapi_assistant_id;
                  const isActive = assistant.is_active;
                  const isSettingActive = setActiveLoading === assistant.vapi_assistant_id;

                  return (
                    <div
                      key={assistant.id}
                      onClick={() => handleSelectAssistant(assistant)}
                      className={`border rounded-xl transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-green-950/30 border-green-700'
                          : isSelected
                          ? 'bg-indigo-600/10 border-indigo-600'
                          : 'bg-[#0d1526] border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {/* Main row */}
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isActive ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' :
                            isSelected ? 'bg-indigo-400' : 'bg-slate-600'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-200">{assistant.name}</span>
                              {isActive && (
                                <span className="text-[9px] bg-green-900 text-green-400 border border-green-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  Active
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase">{assistant.model_name} · {assistant.voice_id}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => confirmDelete(e, assistant.vapi_assistant_id)}
                            className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all bg-transparent border-none cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                          <ChevronRight size={15} className="text-slate-600 group-hover:text-slate-300 transition-colors" />
                        </div>
                      </div>

                      {/* Set Active button — only shows when selected but not yet active */}
                      {isSelected && !isActive && (
                        <div className="px-3 pb-3">
                          <button
                            onClick={(e) => handleSetActive(e, assistant.vapi_assistant_id)}
                            disabled={isSettingActive}
                            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold border-none cursor-pointer transition-colors flex items-center justify-center gap-2"
                          >
                            <Zap size={13} />
                            {isSettingActive ? 'Activating...' : 'Set Active for Outbound Calls'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-600 m-0">
                      {isAdmin && selectedFilterUserId
                        ? 'This user has no assistants yet.'
                        : 'No assistants yet. Create one above.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default CreateAssistant;


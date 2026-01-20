
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { User, Message, JournalEntry, Emotion, Exercise, Soundscape, VisualizationType } from '../types';

const AdminPortal: React.FC = () => {
  const { getAllUsers, fetchUserData, logout, createAdmin } = useAuth();
  const { exercises, soundscapes, addExercise, deleteExercise, addSoundscape, deleteSoundscape } = useContent();
  
  const [activeView, setActiveView] = useState<'users' | 'content' | 'admins'>('users');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const users = getAllUsers();
  const selectedUser = selectedUserId ? users.find(u => u.id === selectedUserId) : null;
  
  // Local state for fetched user data
  const [userData, setUserData] = useState<{ journal: JournalEntry[], chat: Message[] } | null>(null);

  // Fetch data when user selection changes
  useEffect(() => {
    if (selectedUserId) {
        fetchUserData(selectedUserId).then(data => {
            setUserData(data);
        }).catch(err => {
            console.error("Failed to fetch user data:", err);
            setUserData(null);
        });
    } else {
        setUserData(null);
    }
  }, [selectedUserId]); // Dependency on selectedUserId matches useEffect usage

  // --- New Admin Creation State ---
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [adminMsg, setAdminMsg] = useState('');

  // --- Content Management State ---
  // Exercise Form
  const [exTitle, setExTitle] = useState('');
  const [exDesc, setExDesc] = useState('');
  const [exDuration, setExDuration] = useState('5 mins');
  const [exCategory, setExCategory] = useState<'Breathing' | 'Meditation' | 'Grounding' | 'Physical'>('Meditation');
  const [exType, setExType] = useState<VisualizationType>('LIST');
  const [exSteps, setExSteps] = useState('');

  // Soundscape Form
  const [soundName, setSoundName] = useState('');
  const [soundUrl, setSoundUrl] = useState('');

  // --- Data Processing Helpers ---

  const activityData = useMemo(() => {
    if (!userData) return [];
    
    // Get last 7 days
    const days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i)); // 6 days ago to today
      return d;
    });

    const counts: Record<string, number> = {};
    userData.chat.forEach(msg => {
      const dateKey = new Date(msg.timestamp).toLocaleDateString();
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });

    return days.map(d => {
      const dateKey = d.toLocaleDateString();
      return {
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        count: counts[dateKey] || 0,
        fullDate: dateKey
      };
    });
  }, [userData]);

  const moodStats = useMemo(() => {
    if (!userData || userData.journal.length === 0) return [];
    
    const counts: Record<string, number> = {};
    userData.journal.forEach(e => {
      counts[e.mood] = (counts[e.mood] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([mood, count]) => ({ 
        mood: mood as Emotion, 
        count, 
        percentage: Math.round((count / userData.journal.length) * 100) 
      }))
      .sort((a, b) => b.count - a.count);
  }, [userData]);

  const heatmapData = useMemo(() => {
    // Initialize default empty map (7 days x 24 hours)
    const map = Array(7).fill(0).map(() => Array(24).fill(0));
    
    if (!userData) return { map, max: 0 };

    let max = 0;

    userData.chat.forEach(msg => {
      const date = new Date(msg.timestamp);
      const day = date.getDay(); // 0 = Sunday, 6 = Saturday
      const hour = date.getHours(); // 0-23
      map[day][hour]++;
      if (map[day][hour] > max) max = map[day][hour];
    });

    return { map, max };
  }, [userData]);

  const maxActivityCount = useMemo(() => {
    return Math.max(...activityData.map(d => d.count), 5); // Minimum scale of 5
  }, [activityData]);

  const getMoodColor = (mood: Emotion) => {
    switch (mood) {
      case Emotion.HAPPY: return 'bg-green-400';
      case Emotion.SAD: return 'bg-blue-400';
      case Emotion.ANGRY: return 'bg-red-400';
      case Emotion.ANXIOUS: return 'bg-amber-400';
      case Emotion.TIRED: return 'bg-purple-400';
      case Emotion.SURPRISED: return 'bg-pink-400';
      default: return 'bg-slate-300';
    }
  };

  const getHeatmapColor = (count: number, max: number) => {
    if (count === 0) return 'bg-slate-50';
    const ratio = max > 0 ? count / max : 0;
    if (ratio < 0.2) return 'bg-indigo-100';
    if (ratio < 0.4) return 'bg-indigo-300';
    if (ratio < 0.6) return 'bg-indigo-400';
    if (ratio < 0.8) return 'bg-indigo-500';
    return 'bg-indigo-600';
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword || !newAdminName) return;
    const success = await createAdmin(newAdminEmail, newAdminPassword, newAdminName);
    if (success) {
      setAdminMsg('Admin created successfully.');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminName('');
    } else {
      setAdminMsg('Failed: Email might already exist.');
    }
    setTimeout(() => setAdminMsg(''), 3000);
  };

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    const stepsArray = exSteps.split('\n').filter(s => s.trim() !== '');
    if (!exTitle || !exDesc || stepsArray.length === 0) return;

    const newEx: Exercise = {
      id: Date.now().toString(),
      title: exTitle,
      description: exDesc,
      duration: exDuration,
      category: exCategory,
      visualizationType: exType,
      steps: stepsArray
    };

    addExercise(newEx);
    // Reset form
    setExTitle('');
    setExDesc('');
    setExSteps('');
  };

  const handleAddSoundscape = (e: React.FormEvent) => {
    e.preventDefault();
    if (!soundName || !soundUrl) return;
    const newSound: Soundscape = {
      id: Date.now().toString(),
      name: soundName,
      url: soundUrl
    };
    addSoundscape(newSound);
    setSoundName('');
    setSoundUrl('');
  };

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const HOURS = Array.from({length: 24}, (_, i) => i);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Admin Header */}
      <header className="bg-slate-800 text-white p-4 shadow-md flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-500 flex items-center justify-center font-bold">
            A
          </div>
          <div>
            <h1 className="font-semibold text-sm">SoulTalk Admin</h1>
            <p className="text-[10px] text-slate-400">Monitoring Portal</p>
          </div>
        </div>
        <div className="flex gap-4">
            <button 
              onClick={() => setActiveView('users')}
              className={`text-xs px-3 py-1 rounded ${activeView === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'}`}
            >
               Users
            </button>
            <button 
              onClick={() => setActiveView('content')}
              className={`text-xs px-3 py-1 rounded ${activeView === 'content' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'}`}
            >
               Content
            </button>
            <button 
              onClick={() => setActiveView('admins')}
              className={`text-xs px-3 py-1 rounded ${activeView === 'admins' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'}`}
            >
               Admins
            </button>
            <div className="w-[1px] bg-slate-600 mx-2"></div>
            <button 
            onClick={logout}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
            >
            Logout
            </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* USERS VIEW SIDEBAR */}
        {activeView === 'users' && (
            <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto hidden md:block">
            <div className="p-4 border-b border-slate-100">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Users ({users.filter(u => !u.isAdmin).length})</h2>
            </div>
            <ul>
                {users.filter(u => !u.isAdmin).map(user => (
                <li key={user.id}>
                    <button
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 ${
                        selectedUserId === user.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'
                    }`}
                    >
                    <p className="font-medium text-slate-700 text-sm">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </button>
                </li>
                ))}
            </ul>
            </div>
        )}

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          
          {/* ----- USER ANALYTICS VIEW ----- */}
          {activeView === 'users' && (
             selectedUser && userData ? (
                <div className="max-w-5xl mx-auto space-y-6 animate-pop-in">
                {/* User Header */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedUser.name}</h2>
                    <p className="text-sm text-slate-500 font-mono">ID: {selectedUser.id}</p>
                    <p className="text-sm text-slate-500">{selectedUser.email}</p>
                    </div>
                    <div className="flex gap-4">
                    <div className="text-center px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        <span className="block text-2xl font-bold text-indigo-600">{userData.chat.length}</span>
                        <span className="text-[10px] text-indigo-400 uppercase tracking-wide">Messages</span>
                    </div>
                    <div className="text-center px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                        <span className="block text-2xl font-bold text-emerald-600">{userData.journal.length}</span>
                        <span className="text-[10px] text-emerald-400 uppercase tracking-wide">Journal Entries</span>
                    </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Activity Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-semibold text-slate-700 text-sm mb-6">Message Frequency (Last 7 Days)</h3>
                    <div className="h-48 flex items-end gap-2 sm:gap-4 justify-between px-2">
                        {activityData.map((data, idx) => (
                        <div key={idx} className="flex flex-col items-center flex-1 group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {data.count} msgs on {data.fullDate}
                            </div>
                            {/* Bar */}
                            <div 
                            className="w-full max-w-[40px] bg-indigo-500 rounded-t-sm transition-all duration-500 hover:bg-indigo-600 relative overflow-hidden"
                            style={{ height: `${(data.count / maxActivityCount) * 100}%` }}
                            >
                            {data.count > 0 && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
                            )}
                            </div>
                            {/* Label */}
                            <span className="text-[10px] text-slate-400 mt-2 font-medium">{data.label}</span>
                        </div>
                        ))}
                    </div>
                    </div>

                    {/* Mood Distribution Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-semibold text-slate-700 text-sm mb-6">Journal Mood Distribution</h3>
                    <div className="h-48 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {moodStats.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                            No mood data available.
                        </div>
                        ) : (
                        moodStats.map(stat => (
                            <div key={stat.mood} className="group">
                            <div className="flex justify-between text-xs mb-1.5">
                                <span className="font-medium text-slate-700 flex items-center gap-2">
                                {stat.mood}
                                </span>
                                <span className="text-slate-500">{stat.count} ({stat.percentage}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div 
                                className={`h-full rounded-full ${getMoodColor(stat.mood)} transition-all duration-700 ease-out`}
                                style={{ width: `${stat.percentage}%` }}
                                ></div>
                            </div>
                            </div>
                        ))
                        )}
                    </div>
                    </div>
                </div>

                {/* Activity Heatmap */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                    <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-slate-700 text-sm">Activity Heatmap</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>Low</span>
                        <div className="flex gap-0.5">
                            <div className="w-2 h-2 bg-indigo-100 rounded-[1px]"></div>
                            <div className="w-2 h-2 bg-indigo-300 rounded-[1px]"></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-[1px]"></div>
                        </div>
                        <span>High</span>
                    </div>
                    </div>
                    
                    <div className="min-w-[600px]">
                    <div className="flex mb-2">
                        <div className="w-10"></div> {/* Spacer for row labels */}
                        <div className="flex-1 grid grid-cols-24 gap-1">
                            {HOURS.map(h => (
                            <div key={h} className="text-[9px] text-slate-400 text-center">
                                {h % 6 === 0 ? h : ''}
                            </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        {DAYS.map((day, dIdx) => (
                            <div key={day} className="flex items-center">
                            <div className="w-10 text-[10px] text-slate-500 font-medium">{day}</div>
                            <div className="flex-1 grid grid-cols-24 gap-1">
                                {heatmapData.map[dIdx] && heatmapData.map[dIdx].map((count, hIdx) => (
                                    <div 
                                    key={hIdx} 
                                    className={`aspect-square rounded-[2px] ${getHeatmapColor(count, heatmapData.max)} hover:ring-1 hover:ring-indigo-400 relative group transition-colors`}
                                    title={`${day} @ ${hIdx}:00 - ${count} messages`}
                                    >
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                                        {count} msgs
                                    </div>
                                    </div>
                                ))}
                            </div>
                            </div>
                        ))}
                    </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chat History Monitor */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[400px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                        <h3 className="font-semibold text-slate-700 text-sm">Recent Chat Transcripts</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                        {userData.chat.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 mt-10">No chat history found.</p>
                        ) : (
                        userData.chat.slice().reverse().map(msg => (
                            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-lg text-xs ${
                                msg.role === 'user' 
                                ? 'bg-indigo-100 text-indigo-900 rounded-br-none' 
                                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                            }`}>
                                <p>{msg.text}</p>
                            </div>
                            <div className="flex justify-between w-full mt-1 px-1">
                                <span className="text-[10px] text-slate-400">
                                    {msg.role === 'user' ? 'User' : 'AI'} • {new Date(msg.timestamp).toLocaleString()}
                                </span>
                                {msg.sentiment && (
                                    <span className={`text-[10px] font-medium px-1.5 rounded ${
                                        msg.sentiment.includes('POSITIVE') ? 'bg-green-100 text-green-700' :
                                        msg.sentiment.includes('NEGATIVE') ? 'bg-red-100 text-red-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {msg.sentiment}
                                    </span>
                                )}
                            </div>
                            </div>
                        ))
                        )}
                    </div>
                    </div>

                    {/* Journal Monitor */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[400px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                        <h3 className="font-semibold text-slate-700 text-sm">Recent Journal Entries</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                        {userData.journal.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 mt-10">No journal entries found.</p>
                        ) : (
                        userData.journal.map(entry => (
                            <div key={entry.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide ${
                                    entry.mood === Emotion.HAPPY ? 'bg-green-100 text-green-700' :
                                    entry.mood === Emotion.SAD ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                {entry.mood}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                {new Date(entry.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{entry.content}</p>
                            </div>
                        ))
                        )}
                    </div>
                    </div>
                </div>

                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-pop-in">
                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-6 text-3xl shadow-inner text-slate-400">
                    👥
                </div>
                <h3 className="text-lg font-semibold text-slate-600 mb-2">Select a User</h3>
                <p className="text-sm max-w-xs text-center">Choose a registered user from the sidebar to view their detailed activity, mood analysis, and chat history.</p>
                </div>
            )
          )}

          {/* ----- CONTENT MANAGEMENT VIEW ----- */}
          {activeView === 'content' && (
              <div className="max-w-6xl mx-auto space-y-8 animate-pop-in">
                 
                 {/* Exercises Management */}
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                         <h3 className="font-bold text-slate-800 mb-4">Add New Exercise</h3>
                         <form onSubmit={handleAddExercise} className="space-y-4">
                             <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                                 <input value={exTitle} onChange={e => setExTitle(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm" required />
                             </div>
                             <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                                 <textarea value={exDesc} onChange={e => setExDesc(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm h-20" required />
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                                 <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Duration</label>
                                    <input value={exDuration} onChange={e => setExDuration(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="e.g. 5 mins" required />
                                 </div>
                                 <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                                    <select value={exCategory} onChange={e => setExCategory(e.target.value as any)} className="w-full p-2 border border-slate-200 rounded text-sm bg-white">
                                        <option value="Breathing">Breathing</option>
                                        <option value="Meditation">Meditation</option>
                                        <option value="Grounding">Grounding</option>
                                        <option value="Physical">Physical</option>
                                    </select>
                                 </div>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Visualization Type</label>
                                <select value={exType} onChange={e => setExType(e.target.value as VisualizationType)} className="w-full p-2 border border-slate-200 rounded text-sm bg-white">
                                    <option value="LIST">List (Simple Timer)</option>
                                    <option value="COUNTDOWN">Countdown (5-4-3-2-1)</option>
                                    <option value="BREATHING_CIRCLE">Breathing Circle</option>
                                </select>
                             </div>
                             <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">Steps (One per line)</label>
                                 <textarea value={exSteps} onChange={e => setExSteps(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm h-32" placeholder="Step 1...&#10;Step 2..." required />
                             </div>
                             <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">Add Exercise</button>
                         </form>
                     </div>

                     <div className="lg:col-span-2 space-y-6">
                         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                             <h3 className="font-bold text-slate-800 mb-4">Existing Exercises</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {exercises.map(ex => (
                                    <div key={ex.id} className="p-4 border border-slate-100 rounded-lg relative group bg-slate-50">
                                        <button 
                                          onClick={() => deleteExercise(ex.id)}
                                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Delete"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                        </button>
                                        <h4 className="font-semibold text-sm">{ex.title}</h4>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{ex.category}</span>
                                            <span className="text-[10px] text-slate-500">{ex.duration}</span>
                                        </div>
                                    </div>
                                ))}
                             </div>
                         </div>

                         {/* Soundscapes Management */}
                         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                             <h3 className="font-bold text-slate-800 mb-4">Soundscapes</h3>
                             <div className="flex flex-col md:flex-row gap-6">
                                 <form onSubmit={handleAddSoundscape} className="md:w-1/3 space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                                        <input value={soundName} onChange={e => setSoundName(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">URL (MP3)</label>
                                        <input value={soundUrl} onChange={e => setSoundUrl(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm" placeholder="https://..." required />
                                    </div>
                                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">Add Sound</button>
                                 </form>
                                 <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                     {soundscapes.map(s => (
                                         <div key={s.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50">
                                             <span className="text-sm font-medium">{s.name}</span>
                                             <button onClick={() => deleteSoundscape(s.id)} className="text-slate-400 hover:text-red-500">
                                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                   <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                 </svg>
                                             </button>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
              </div>
          )}

          {/* ----- ADMIN MANAGEMENT VIEW ----- */}
          {activeView === 'admins' && (
              <div className="max-w-2xl mx-auto space-y-6 animate-pop-in">
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                      <h2 className="text-xl font-bold text-slate-800 mb-6">Create New Administrator</h2>
                      <form onSubmit={handleCreateAdmin} className="space-y-4">
                          <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                             <input value={newAdminName} onChange={e => setNewAdminName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg" required />
                          </div>
                          <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                             <input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg" required />
                          </div>
                          <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                             <input type="password" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg" required />
                          </div>
                          {adminMsg && (
                              <div className={`text-sm p-3 rounded ${adminMsg.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {adminMsg}
                              </div>
                          )}
                          <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-lg font-medium hover:bg-slate-900 transition-colors">
                              Create Admin Account
                          </button>
                      </form>
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h3 className="font-bold text-slate-700 mb-4">Existing Admins</h3>
                      <ul className="space-y-2">
                          {users.filter(u => u.isAdmin).map(admin => (
                              <li key={admin.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                      {admin.name.charAt(0)}
                                  </div>
                                  <div>
                                      <p className="text-sm font-medium text-slate-800">{admin.name}</p>
                                      <p className="text-xs text-slate-500">{admin.email}</p>
                                  </div>
                                  {admin.id === 'admin-001' && (
                                      <span className="ml-auto text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded">Super Admin</span>
                                  )}
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminPortal;

import React, { useState, useEffect } from 'react';
import type { User, JournalEntry } from '../../../types';
import { Emotion } from '../../../types';

interface JournalProps {
  user: User;
}

const Journal: React.FC<JournalProps> = ({ user }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<Emotion>(Emotion.NEUTRAL);
  const [view, setView] = useState<'write' | 'history' | 'insights'>('write');

  const storageKey = `soultalk_journal_${user.id}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load journal", e);
      }
    }
  }, [storageKey]);

  const saveEntry = () => {
    if (!content.trim()) return;

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      content,
      mood: selectedMood,
      tags: []
    };

    const updatedEntries = [newEntry, ...entries];
    setEntries(updatedEntries);
    localStorage.setItem(storageKey, JSON.stringify(updatedEntries));
    setContent('');
    setSelectedMood(Emotion.NEUTRAL);
    setView('history');
  };

  const getMoodColor = (mood: Emotion) => {
    switch (mood) {
      case Emotion.HAPPY: return 'bg-green-100 text-green-700 border-green-200';
      case Emotion.SAD: return 'bg-blue-100 text-blue-700 border-blue-200';
      case Emotion.ANGRY: return 'bg-red-100 text-red-700 border-red-200';
      case Emotion.ANXIOUS: return 'bg-amber-100 text-amber-700 border-amber-200';
      case Emotion.TIRED: return 'bg-purple-100 text-purple-700 border-purple-200';
      case Emotion.SURPRISED: return 'bg-pink-100 text-pink-700 border-pink-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Stats Logic
  const getMoodStats = () => {
    if (entries.length === 0) return [];
    
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      counts[e.mood] = (counts[e.mood] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([mood, count]) => ({ mood, count, percentage: Math.round((count / entries.length) * 100) }))
      .sort((a, b) => b.count - a.count);
  };

  const stats = getMoodStats();

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Journal Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-slate-800">Private Journal</h2>
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setView('write')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${view === 'write' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            New Entry
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${view === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            History
          </button>
          <button
            onClick={() => setView('insights')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${view === 'insights' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Experiences
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {view === 'write' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-100 p-6 animate-pop-in">
            <label className="block text-sm font-medium text-slate-700 mb-3">How are you feeling right now?</label>
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.values(Emotion).map((emotion) => (
                <button
                  key={emotion}
                  onClick={() => setSelectedMood(emotion)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedMood === emotion
                      ? 'ring-2 ring-offset-1 ring-indigo-500 ' + getMoodColor(emotion)
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {emotion}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium text-slate-700 mb-3">Write your thoughts...</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind? This is private to you."
              className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none resize-none text-slate-700 leading-relaxed"
            />

            <div className="mt-6 flex justify-end">
              <button
                onClick={saveEntry}
                disabled={!content.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
              >
                Save Entry
              </button>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="max-w-2xl mx-auto space-y-4 animate-pop-in">
            {entries.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p>No journal entries yet.</p>
                <button onClick={() => setView('write')} className="text-indigo-600 hover:underline mt-2 text-sm">Write your first entry</button>
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getMoodColor(entry.mood)}`}>
                      {entry.mood}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">{entry.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {view === 'insights' && (
          <div className="max-w-2xl mx-auto animate-pop-in">
            {entries.length === 0 ? (
               <div className="text-center py-10 text-slate-400">
                <p>Add some journal entries to see your experiences history.</p>
              </div>
            ) : (
              <div className="space-y-6">
                 {/* Summary Cards */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                       <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Entries</p>
                       <p className="text-3xl font-semibold text-indigo-600">{entries.length}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                       <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Dominant Mood</p>
                       <p className="text-3xl font-semibold text-slate-700">{stats[0]?.mood || 'N/A'}</p>
                    </div>
                 </div>

                 {/* Mood Distribution */}
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-800 mb-4">Mood Breakdown</h3>
                    <div className="space-y-3">
                      {stats.map(stat => (
                        <div key={stat.mood}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-600">{stat.mood}</span>
                            <span className="text-slate-400">{stat.count} entries ({stat.percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${getMoodColor(stat.mood as Emotion).split(' ')[0]}`}
                              style={{ width: `${stat.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>

                 {/* Recent Highlights (Positive Emotions) */}
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                   <h3 className="text-sm font-semibold text-slate-800 mb-4">Positive Moments</h3>
                   {entries.filter(e => [Emotion.HAPPY, Emotion.SURPRISED].includes(e.mood)).length > 0 ? (
                     <div className="space-y-3">
                       {entries.filter(e => [Emotion.HAPPY, Emotion.SURPRISED].includes(e.mood))
                         .slice(0, 3)
                         .map(e => (
                           <div key={e.id} className="p-3 bg-green-50 rounded-lg border border-green-100">
                             <p className="text-xs text-green-800 line-clamp-2 italic">"{e.content}"</p>
                             <p className="text-[10px] text-green-600 mt-1 text-right">{new Date(e.timestamp).toLocaleDateString()}</p>
                           </div>
                         ))
                       }
                     </div>
                   ) : (
                     <p className="text-xs text-slate-400 italic">No happy moments recorded yet. Keep looking for the silver lining!</p>
                   )}
                 </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Journal;
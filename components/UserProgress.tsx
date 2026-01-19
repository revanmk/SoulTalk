
import React, { useMemo } from 'react';
import { JournalEntry, Emotion } from '../types';

interface UserProgressProps {
  entries: JournalEntry[];
}

const UserProgress: React.FC<UserProgressProps> = ({ entries }) => {
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

  const moodStats = useMemo(() => {
    if (entries.length === 0) return [];
    
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      counts[e.mood] = (counts[e.mood] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([mood, count]) => ({ 
        mood: mood as Emotion, 
        count, 
        percentage: Math.round((count / entries.length) * 100) 
      }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  const recentTimeline = useMemo(() => {
    return entries.slice(0, 7).reverse(); // Last 7 entries chronological
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400 animate-pop-in">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-2xl">
           📊
        </div>
        <p className="text-center text-sm">Use the journal to track your moods and unlock personal insights.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto animate-pop-in">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
           <h2 className="text-xl font-bold mb-2">Your Emotional Journey</h2>
           <p className="text-indigo-100 text-sm opacity-90">
             You have logged <span className="font-bold text-white">{entries.length}</span> updates. 
             Tracking your feelings is the first step to understanding them.
           </p>
        </div>

        {/* Top Mood */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Dominant Mood</p>
             <h3 className="text-3xl font-bold text-slate-800">{moodStats[0]?.mood || 'Neutral'}</h3>
           </div>
           <div className={`w-12 h-12 rounded-full opacity-20 ${getMoodColor(moodStats[0]?.mood as Emotion)}`}></div>
        </div>
      </div>

      {/* Mood Distribution Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-700 mb-4">Mood Breakdown</h3>
        <div className="flex w-full h-4 rounded-full overflow-hidden mb-4">
          {moodStats.map(stat => (
            <div 
              key={stat.mood} 
              className={getMoodColor(stat.mood)} 
              style={{ width: `${stat.percentage}%` }}
              title={`${stat.mood}: ${stat.count}`}
            ></div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
           {moodStats.map(stat => (
             <div key={stat.mood} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getMoodColor(stat.mood)}`}></div>
                <span className="text-xs text-slate-600 font-medium">{stat.mood} ({stat.percentage}%)</span>
             </div>
           ))}
        </div>
      </div>

      {/* Recent Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
         <h3 className="font-bold text-slate-700 mb-6">Recent Timeline</h3>
         <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pl-6 pb-2">
            {recentTimeline.map((entry) => (
               <div key={entry.id} className="relative">
                  <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white shadow-sm ${getMoodColor(entry.mood)}`}></div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-1">
                     <span className="text-sm font-bold text-slate-700">{entry.mood}</span>
                     <span className="text-xs text-slate-400">{new Date(entry.timestamp).toLocaleDateString()} • {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 italic">"{entry.content}"</p>
               </div>
            ))}
         </div>
      </div>

    </div>
  );
};

export default UserProgress;

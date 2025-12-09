import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { analyzeJournalEntry } from '../services/geminiService';

interface JournalProps {
  entries: JournalEntry[];
  onAddEntry: (entry: JournalEntry) => void;
}

const Journal: React.FC<JournalProps> = ({ entries, onAddEntry }) => {
  const [newEntry, setNewEntry] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const handleSave = async () => {
    if (!newEntry.trim()) return;

    // Optional: Get quick AI sentiment before saving
    setLoadingAi(true);
    // In a real app we might save first then update with insight
    const entry: JournalEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        content: newEntry,
        mood: 'Neutral', // Default, could be selected
        highlights: [],
        persons: [],
        images: []
    };
    onAddEntry(entry);
    setNewEntry('');
    setIsAdding(false);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-bold text-emerald-50">Daily Journal</h2>
            <p className="text-emerald-400/60">Reflect on your journey.</p>
        </div>
        <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-medium shadow-lg shadow-emerald-600/20 transition-all"
        >
            {isAdding ? 'Cancel' : '+ New Entry'}
        </button>
      </div>

      {isAdding && (
          <div className="glass-card p-6 rounded-2xl animate-fade-in">
              <label className="block text-emerald-300 text-sm font-bold mb-2">How was your day?</label>
              <textarea 
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                className="w-full bg-black/20 border border-emerald-500/20 rounded-xl p-4 text-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none h-40 resize-none"
                placeholder="Write your thoughts here..."
              />
              <div className="flex justify-end mt-4 gap-3">
                  <button 
                    onClick={handleSave}
                    disabled={loadingAi}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                      {loadingAi ? 'Saving...' : 'Save Entry'}
                  </button>
              </div>
          </div>
      )}

      <div className="grid gap-6">
        {entries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
            <div key={entry.id} className="glass-card p-6 rounded-2xl hover:border-emerald-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-emerald-400 font-mono text-sm bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/20">
                        {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    {entry.mood && <span className="text-xl">✨</span>}
                </div>
                <p className="text-emerald-100/90 whitespace-pre-wrap leading-relaxed">
                    {entry.content}
                </p>
            </div>
        ))}
        
        {entries.length === 0 && !isAdding && (
            <div className="text-center py-20 opacity-50">
                <p>No journal entries yet. Start writing today!</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Journal;
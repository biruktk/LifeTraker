import React, { useState, useEffect } from 'react';
import { JournalEntry, AppData } from '../types';
import { generateJournalFromDay, continueJournalEntry } from '../services/geminiService';
import { uploadFile } from '../services/imageService';
import { SUPABASE_STORAGE_URL } from '../services/supabaseClient';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  data: AppData;
  existingEntry?: JournalEntry;
  onSave: (entry: JournalEntry) => void;
  userId: string;
}

const JournalModal: React.FC<JournalModalProps> = ({ isOpen, onClose, date, data, existingEntry, onSave, userId }) => {
  const [content, setContent] = useState('');
  const [highlights, setHighlights] = useState<string[]>([]);
  const [persons, setPersons] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]); // URLs now
  const [mood, setMood] = useState<'Happy' | 'Neutral' | 'Sad' | 'Productive' | 'Tired'>('Neutral');
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState('');
  
  const [newHighlight, setNewHighlight] = useState('');
  const [newPerson, setNewPerson] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const MOODS: { label: 'Happy' | 'Neutral' | 'Sad' | 'Productive' | 'Tired', icon: string, color: string }[] = [
    { label: 'Happy', icon: '😄', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' },
    { label: 'Productive', icon: '🚀', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
    { label: 'Neutral', icon: '😐', color: 'bg-gray-500/20 text-gray-300 border-gray-500/50' },
    { label: 'Tired', icon: '😴', color: 'bg-purple-500/20 text-purple-300 border-purple-500/50' },
    { label: 'Sad', icon: '😔', color: 'bg-blue-500/20 text-blue-300 border-blue-500/50' },
  ];

  useEffect(() => {
    if (isOpen) {
        if (existingEntry) {
            setContent(existingEntry.content || '');
            setHighlights(existingEntry.highlights || []);
            setPersons(existingEntry.persons || []);
            setImages(existingEntry.images || []);
            setMood(existingEntry.mood || 'Neutral');
            setLocation(existingEntry.location || '');
            setWeather(existingEntry.weather || '');
        } else {
            setContent('');
            setHighlights([]);
            setPersons([]);
            setImages([]);
            setMood('Neutral');
            setLocation('');
            setWeather('');
        }
    }
  }, [isOpen, existingEntry, date]);

  if (!isOpen) return null;

  const handleAutoGenerate = async () => {
      setIsGenerating(true);
      const generatedText = await generateJournalFromDay(date, data);
      setContent(prev => prev ? prev + "\n\n" + generatedText : generatedText);
      setIsGenerating(false);
  };

  const handleContinueWriting = async () => {
      if (!content.trim()) return;
      setIsGenerating(true);
      const continuation = await continueJournalEntry(content);
      setContent(prev => prev + " " + continuation);
      setIsGenerating(false);
  };

  const toggleListening = () => {
      if (isListening) {
          setIsListening(false);
          return;
      }
      if (!('webkitSpeechRecognition' in window)) {
          alert("Voice input is not supported in this browser.");
          return;
      }
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setContent(prev => prev ? prev + " " + transcript : transcript);
      };
      recognition.start();
  };

  const addHighlight = () => {
      if (newHighlight.trim()) {
          setHighlights([...highlights, newHighlight.trim()]);
          setNewHighlight('');
      }
  };

  const addPerson = () => {
      if (newPerson.trim()) {
          setPersons([...persons, newPerson.trim()]);
          setNewPerson('');
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploading(true);
          try {
              const url = await uploadFile(file, userId);
              setImages([...images, url]);
          } catch (e: any) {
              let msg = "Failed to upload file.";
              if (e.message === "RLS_POLICY_ERROR") {
                  msg = "PERMISSION DENIED: You created the bucket, but you need to add a POLICY.\n\n1. Go to Supabase -> Storage -> Configuration\n2. Click 'New Policy' on the 'images' bucket\n3. Check INSERT/SELECT/UPDATE for 'Authenticated' and 'Anon' roles\n4. Save.";
              }
              if (window.confirm(`${msg}\n\nOpen Dashboard Instructions?`)) {
                  window.open(SUPABASE_STORAGE_URL, '_blank');
              }
          } finally {
              setIsUploading(false);
          }
      }
  };

  const removeImage = (index: number) => {
      setImages(images.filter((_, i) => i !== index));
  };

  const handleSave = () => {
      const entry: JournalEntry = {
          id: existingEntry?.id || crypto.randomUUID(),
          date,
          content,
          highlights,
          persons,
          images,
          mood,
          location,
          weather
      };
      onSave(entry);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="glass-card w-full max-w-3xl rounded-3xl p-6 border border-emerald-500/30 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-6 border-b border-emerald-500/20 pb-4">
            <div>
                <h2 className="text-2xl font-bold text-emerald-50">Daily Journal</h2>
                <p className="text-emerald-400">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <button onClick={onClose} className="text-emerald-400 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
            
            {/* Mood Selector */}
            <div className="bg-black/20 rounded-xl p-4 border border-emerald-500/10">
                <label className="block text-sm font-bold text-emerald-300 mb-3">How are you feeling today?</label>
                <div className="flex gap-2 flex-wrap">
                    {MOODS.map(m => (
                        <button
                            key={m.label}
                            onClick={() => setMood(m.label)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${mood === m.label ? m.color : 'bg-black/20 border-emerald-500/10 text-emerald-500/40 hover:bg-black/40'}`}
                        >
                            <span className="text-xl">{m.icon}</span>
                            <span className="text-xs font-bold">{m.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Context Inputs (Location/Weather) */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">📍 Location</label>
                    <input 
                        value={location} 
                        onChange={(e) => setLocation(e.target.value)} 
                        placeholder="e.g. Home, Coffee Shop" 
                        className="w-full bg-black/30 border border-emerald-500/20 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500" 
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">☀️ Weather</label>
                    <input 
                        value={weather} 
                        onChange={(e) => setWeather(e.target.value)} 
                        placeholder="e.g. Sunny, Rain" 
                        className="w-full bg-black/30 border border-emerald-500/20 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500" 
                    />
                </div>
            </div>

            {/* Highlights & People Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/20 rounded-xl p-4">
                    <label className="block text-sm font-bold text-emerald-300 mb-2">✨ Highlights</label>
                    <div className="flex gap-2 mb-3">
                        <input value={newHighlight} onChange={(e) => setNewHighlight(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addHighlight()} placeholder="Add highlight..." className="flex-1 bg-black/30 border border-emerald-500/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
                        <button onClick={addHighlight} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded-lg">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {highlights.map((h, i) => (
                            <span key={i} className="bg-emerald-900/40 text-emerald-100 text-xs px-2 py-1 rounded-md border border-emerald-500/10 flex items-center gap-2">
                                {h} <button onClick={() => setHighlights(highlights.filter((_, idx) => idx !== i))} className="text-emerald-500 hover:text-white">×</button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="bg-black/20 rounded-xl p-4">
                    <label className="block text-sm font-bold text-emerald-300 mb-2">👥 People Met</label>
                    <div className="flex gap-2 mb-3">
                        <input value={newPerson} onChange={(e) => setNewPerson(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addPerson()} placeholder="Add person..." className="flex-1 bg-black/30 border border-emerald-500/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
                        <button onClick={addPerson} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded-lg">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {persons.map((p, i) => (
                            <span key={i} className="bg-emerald-900/40 text-emerald-100 text-xs px-2 py-1 rounded-md border border-emerald-500/10 flex items-center gap-2">
                                {p} <button onClick={() => setPersons(persons.filter((_, idx) => idx !== i))} className="text-emerald-500 hover:text-white">×</button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-bold text-emerald-300">📝 Journal Entry</label>
                        <button onClick={toggleListening} className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-2 transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40'}`}>
                            <span className="text-sm">🎙️</span> {isListening ? 'Listening...' : 'Voice Input'}
                        </button>
                    </div>
                    
                    <div className="flex gap-2">
                        <button onClick={handleContinueWriting} disabled={isGenerating || !content} className="text-xs bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all">
                            {isGenerating ? 'Writing...' : '✨ Continue Writing'}
                        </button>
                        <button onClick={handleAutoGenerate} disabled={isGenerating} className="text-xs bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all">
                            {isGenerating ? 'Writing...' : '🔄 Auto-Draft'}
                        </button>
                    </div>
                </div>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-64 bg-black/20 border border-emerald-500/20 rounded-xl p-4 text-emerald-50 leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none resize-none placeholder-emerald-500/20" placeholder="Write here..." />
            </div>

            {/* Attachments */}
            <div>
                 <label className="block text-sm font-bold text-emerald-300 mb-2">📸 Attachments</label>
                 <div className="flex flex-wrap gap-4">
                     {images.map((img, i) => (
                         <div key={i} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-emerald-500/30">
                             <img src={img} alt="attachment" className="w-full h-full object-cover" />
                             <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                         </div>
                     ))}
                     
                     <label className="w-24 h-24 rounded-lg border-2 border-dashed border-emerald-500/30 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-500/10 transition-colors text-emerald-500/50 hover:text-emerald-400">
                         {isUploading ? <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div> : <span className="text-[10px]">Add Image</span>}
                         <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                     </label>
                 </div>
            </div>

        </div>

        <div className="pt-6 mt-2 border-t border-emerald-500/20 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2 rounded-xl text-emerald-300 hover:bg-emerald-900/30 transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-8 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all">Save Entry</button>
        </div>

      </div>
    </div>
  );
};

export default JournalModal;
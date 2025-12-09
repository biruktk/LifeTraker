import React, { useState, useRef, useEffect } from 'react';
import { SocialPost } from '../types';

interface SocialMediaManagerProps {
    queue: SocialPost[];
    onUpdateQueue: (queue: SocialPost[]) => void;
}

const SOCIAL_PLATFORMS = [
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: 'bg-blue-500' },
  { id: 'twitter', name: 'X / Twitter', icon: '✖️', color: 'bg-black' },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-700' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'bg-pink-600' },
];

const SocialMediaManager: React.FC<SocialMediaManagerProps> = ({ queue, onUpdateQueue }) => {
  // Composer State
  const [postContent, setPostContent] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloud Sync State
  const [syncUrl, setSyncUrl] = useState('');
  const [syncMethod, setSyncMethod] = useState<'POST' | 'PUT'>('PUT');
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [showConfig, setShowConfig] = useState(false);

  // Load Sync Config from LS
  useEffect(() => {
      const savedUrl = localStorage.getItem('life_tracker_sync_url');
      const savedMethod = localStorage.getItem('life_tracker_sync_method');
      if (savedUrl) setSyncUrl(savedUrl);
      if (savedMethod) setSyncMethod(savedMethod as any);
  }, []);

  const saveConfig = () => {
      localStorage.setItem('life_tracker_sync_url', syncUrl);
      localStorage.setItem('life_tracker_sync_method', syncMethod);
      setShowConfig(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePlatform = (id: string) => {
    if (selectedPlatforms.includes(id)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== id));
    } else {
      setSelectedPlatforms([...selectedPlatforms, id]);
    }
  };

  const setQuickSchedule = (type: '1H' | '3H' | 'MORNING' | 'NOON' | 'EVENING') => {
      const now = new Date();
      let target = new Date();

      switch(type) {
          case '1H':
              target = new Date(now.getTime() + 60 * 60 * 1000);
              break;
          case '3H':
              target = new Date(now.getTime() + 3 * 60 * 60 * 1000);
              break;
          case 'MORNING': // Tomorrow 9 AM
              target.setDate(now.getDate() + 1);
              target.setHours(9, 0, 0, 0);
              break;
          case 'NOON': // Tomorrow 12 PM
              target.setDate(now.getDate() + 1);
              target.setHours(12, 0, 0, 0);
              break;
          case 'EVENING': // Tomorrow 6 PM
              target.setDate(now.getDate() + 1);
              target.setHours(18, 0, 0, 0);
              break;
      }
      
      // Format for datetime-local (YYYY-MM-DDTHH:mm) taking timezone into account
      const offset = target.getTimezoneOffset() * 60000;
      const localDate = new Date(target.getTime() - offset);
      setScheduledDate(localDate.toISOString().slice(0, 16));
  };

  const addToQueue = () => {
      if (!postContent && !attachedImage) return;
      if (selectedPlatforms.length === 0) return;
      if (!scheduledDate) {
          alert("Please pick a date/time to schedule this post.");
          return;
      }

      const newPost: SocialPost = {
          id: crypto.randomUUID(),
          content: postContent,
          image: attachedImage,
          platforms: selectedPlatforms,
          scheduledTime: new Date(scheduledDate).toISOString(),
          status: 'QUEUED'
      };

      onUpdateQueue([...queue, newPost]);
      
      // Reset Form
      setPostContent('');
      setAttachedImage(null);
      setSelectedPlatforms([]);
      setScheduledDate('');
      setSyncStatus('IDLE'); // Reset sync status to prompt re-sync
  };

  const removeFromQueue = (id: string) => {
      if(window.confirm("Remove this post from queue?")) {
          onUpdateQueue(queue.filter(p => p.id !== id));
      }
  };

  const handleCloudSync = async () => {
      if (!syncUrl) {
          setShowConfig(true);
          return;
      }

      setSyncStatus('SYNCING');

      // Sort queue by date before syncing
      const sortedQueue = [...queue].sort((a,b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
      
      // The payload is the entire schedule array
      const payload = {
          updatedAt: new Date().toISOString(),
          schedule: sortedQueue
      };

      try {
          const res = await fetch(syncUrl, {
              method: syncMethod,
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload)
          });

          if (res.ok) {
              setSyncStatus('SUCCESS');
              onUpdateQueue(sortedQueue.map(p => ({ ...p, status: 'PUBLISHED' }))); // Mark as pushed
              setTimeout(() => setSyncStatus('IDLE'), 3000);
          } else {
              throw new Error(`HTTP ${res.status}`);
          }
      } catch (e) {
          console.error(e);
          setSyncStatus('ERROR');
      }
  };

  // NEW: Fetch updates from cloud (e.g. if n8n marked something as SENT)
  const handleFetchStatus = async () => {
      if (!syncUrl) {
          setShowConfig(true);
          return;
      }
      setSyncStatus('SYNCING');
      
      try {
          const res = await fetch(syncUrl);
          if (res.ok) {
              const data = await res.json();
              // Support standard JSON or JSONBin record wrapper
              const remoteSchedule: SocialPost[] = data.record ? data.record.schedule : (data.schedule || []);
              
              if (remoteSchedule.length > 0) {
                  onUpdateQueue(remoteSchedule);
                  setSyncStatus('SUCCESS');
              } else {
                  // If empty or invalid, don't overwrite local with empty
                  setSyncStatus('IDLE');
                  alert("Remote schedule appears empty. Not overwriting local data.");
              }
              setTimeout(() => setSyncStatus('IDLE'), 3000);
          } else {
              throw new Error(`HTTP ${res.status}`);
          }
      } catch (e) {
          console.error(e);
          setSyncStatus('ERROR');
      }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] animate-fade-in flex flex-col md:flex-row gap-6">
        
        {/* LEFT: COMPOSER */}
        <div className="w-full md:w-1/2 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            
            <div className="glass-card p-6 rounded-2xl border border-emerald-500/20">
                <h2 className="text-2xl font-bold text-emerald-50 mb-4 flex items-center gap-2">
                    <span className="text-3xl">✍️</span> Compose
                </h2>

                <div className="space-y-4">
                    {/* Platforms */}
                    <div>
                        <label className="block text-xs font-bold text-emerald-500 uppercase mb-2">1. Select Channels</label>
                        <div className="flex flex-wrap gap-2">
                            {SOCIAL_PLATFORMS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => togglePlatform(p.id)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                                        selectedPlatforms.includes(p.id) 
                                        ? `${p.color} text-white shadow-lg`
                                        : 'bg-black/30 text-emerald-400/50 hover:bg-black/50'
                                    }`}
                                >
                                    <span>{p.icon}</span>
                                    <span>{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                         <label className="block text-xs font-bold text-emerald-500 uppercase mb-2">2. Content</label>
                         <textarea
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            className="w-full h-32 bg-black/30 border border-emerald-500/20 rounded-xl p-3 text-white outline-none focus:border-emerald-500 resize-none"
                            placeholder="Write your post..."
                         />
                    </div>

                    {/* Image */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-xs font-bold text-emerald-500 uppercase">3. Media (Optional)</label>
                             <button onClick={() => fileInputRef.current?.click()} className="text-xs text-emerald-400 underline">Upload</button>
                             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                        </div>
                        {attachedImage && (
                            <div className="relative inline-block">
                                <img src={attachedImage} alt="Preview" className="h-24 rounded-lg border border-emerald-500/30" />
                                <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">×</button>
                            </div>
                        )}
                    </div>

                    {/* Schedule */}
                    <div>
                        <label className="block text-xs font-bold text-emerald-500 uppercase mb-2">4. Schedule Time</label>
                        
                        {/* Quick Presets */}
                        <div className="grid grid-cols-5 gap-2 mb-2">
                            <button onClick={() => setQuickSchedule('1H')} className="bg-emerald-950/40 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-200 hover:text-white rounded px-2 py-1 text-[10px] transition-colors">+1 Hour</button>
                            <button onClick={() => setQuickSchedule('3H')} className="bg-emerald-950/40 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-200 hover:text-white rounded px-2 py-1 text-[10px] transition-colors">+3 Hours</button>
                            <button onClick={() => setQuickSchedule('MORNING')} className="bg-emerald-950/40 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-200 hover:text-white rounded px-2 py-1 text-[10px] transition-colors" title="Tomorrow 9AM">Tom. AM</button>
                            <button onClick={() => setQuickSchedule('NOON')} className="bg-emerald-950/40 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-200 hover:text-white rounded px-2 py-1 text-[10px] transition-colors" title="Tomorrow 12PM">Tom. Noon</button>
                            <button onClick={() => setQuickSchedule('EVENING')} className="bg-emerald-950/40 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-200 hover:text-white rounded px-2 py-1 text-[10px] transition-colors" title="Tomorrow 6PM">Tom. Eve</button>
                        </div>

                        <input 
                            type="datetime-local"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="w-full bg-black/30 border border-emerald-500/20 rounded-xl p-3 text-white outline-none"
                        />
                    </div>

                    <button 
                        onClick={addToQueue}
                        disabled={!scheduledDate || (!postContent && !attachedImage) || selectedPlatforms.length === 0}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Add to Queue
                    </button>
                </div>
            </div>
        </div>

        {/* RIGHT: QUEUE & SYNC */}
        <div className="w-full md:w-1/2 flex flex-col gap-4 h-full">
            
            <div className="glass-card flex-1 rounded-2xl border border-emerald-500/20 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-emerald-500/20 bg-emerald-950/50 flex justify-between items-center">
                    <div>
                        <h2 className="font-bold text-white flex items-center gap-2">
                            <span className="text-xl">📅</span> Scheduled Queue
                        </h2>
                        <p className="text-xs text-emerald-400/60">{queue.length} posts pending</p>
                    </div>
                    <button onClick={() => setShowConfig(!showConfig)} className="text-xs text-emerald-400 underline">
                        {showConfig ? 'Close Settings' : 'Cloud Settings'}
                    </button>
                </div>

                {/* Cloud Config Panel */}
                {showConfig && (
                    <div className="p-4 bg-black/40 border-b border-emerald-500/20 space-y-3">
                        <p className="text-xs text-emerald-300">
                            Enter the URL where n8n will check for this schedule.
                            <br/>
                            <span className="opacity-50">Suggestion: Use <a href="https://jsonbin.io" target="_blank" className="underline hover:text-white">JSONBin.io</a> (create a bin, paste URL here) OR your n8n Webhook URL.</span>
                        </p>
                        <input 
                            value={syncUrl}
                            onChange={(e) => setSyncUrl(e.target.value)}
                            placeholder="https://api.jsonbin.io/v3/b/..."
                            className="w-full bg-black/50 border border-emerald-500/30 rounded-lg p-2 text-xs text-white"
                        />
                        <div className="flex justify-between items-center">
                            <div className="flex gap-2">
                                <button onClick={() => setSyncMethod('PUT')} className={`px-3 py-1 text-xs rounded ${syncMethod === 'PUT' ? 'bg-emerald-600 text-white' : 'bg-black/30 text-emerald-500'}`}>PUT (JSONBin)</button>
                                <button onClick={() => setSyncMethod('POST')} className={`px-3 py-1 text-xs rounded ${syncMethod === 'POST' ? 'bg-emerald-600 text-white' : 'bg-black/30 text-emerald-500'}`}>POST (Webhook)</button>
                            </div>
                            <button onClick={saveConfig} className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded hover:bg-emerald-500/40">Save</button>
                        </div>
                    </div>
                )}

                {/* Queue List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {queue.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-emerald-500/30 text-center">
                            <span className="text-4xl mb-2">📭</span>
                            <p>Queue is empty.</p>
                            <p className="text-xs max-w-[200px]">Add posts from the composer.</p>
                        </div>
                    ) : (
                        queue.sort((a,b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()).map(post => (
                            <div key={post.id} className="bg-black/20 border border-emerald-500/10 rounded-xl p-3 flex gap-3 group hover:bg-black/30 transition-colors">
                                <div className="flex flex-col items-center gap-1 min-w-[50px] border-r border-emerald-500/10 pr-3">
                                    <span className="text-xs font-bold text-emerald-400">
                                        {new Date(post.scheduledTime).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                    </span>
                                    <span className="text-lg font-bold text-white">
                                        {new Date(post.scheduledTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex gap-2 mb-1">
                                        {post.platforms.map(pid => {
                                            const p = SOCIAL_PLATFORMS.find(sp => sp.id === pid);
                                            return <span key={pid} className="text-xs opacity-70">{p?.icon}</span>;
                                        })}
                                        {post.status === 'PUBLISHED' && <span className="ml-auto text-[10px] bg-emerald-900 text-emerald-300 px-1 rounded border border-emerald-500/20">Synced</span>}
                                        {post.status === 'SENT' && <span className="ml-auto text-[10px] bg-green-500 text-white px-1 rounded border border-green-400/20">Sent</span>}
                                        {post.status === 'QUEUED' && <span className="ml-auto text-[10px] bg-yellow-900/50 text-yellow-300 px-1 rounded border border-yellow-500/20">Local</span>}
                                    </div>
                                    <p className="text-sm text-emerald-100 truncate">{post.content || '(Image Only)'}</p>
                                </div>
                                <button onClick={() => removeFromQueue(post.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity px-2 hover:bg-red-900/20 rounded">×</button>
                            </div>
                        ))
                    )}
                </div>

                {/* Sync Action */}
                <div className="p-4 border-t border-emerald-500/20 bg-emerald-950/30 flex gap-2">
                    <button 
                        onClick={handleCloudSync}
                        disabled={queue.length === 0 || syncStatus === 'SYNCING'}
                        className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                            syncStatus === 'SUCCESS' ? 'bg-green-600 text-white' :
                            syncStatus === 'ERROR' ? 'bg-red-600 text-white' :
                            'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:scale-[1.02]'
                        } disabled:opacity-50 disabled:scale-100`}
                    >
                        {syncStatus === 'SYNCING' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {syncStatus === 'IDLE' && '☁️ Push'}
                        {syncStatus === 'SYNCING' && '...'}
                    </button>
                    
                    <button 
                        onClick={handleFetchStatus}
                        disabled={syncStatus === 'SYNCING'}
                        className="px-4 py-3 rounded-xl bg-black/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50 hover:text-white transition-all font-bold text-sm"
                        title="Check if items were sent by n8n"
                    >
                        🔄 Check Status
                    </button>
                </div>
                {syncStatus === 'SUCCESS' && <p className="text-[10px] text-center p-2 bg-black/40 text-emerald-400">Synced Successfully!</p>}

            </div>
        </div>

    </div>
  );
};

export default SocialMediaManager;
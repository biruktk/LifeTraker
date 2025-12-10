import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ActionModal from './components/TradeModal';
import JournalModal from './components/JournalModal';
import Auth from './components/Auth';
import VisionBoard from './components/VisionBoard';
import SimpleChat from './components/SimpleChat';
import SocialMediaManager from './components/SocialMediaManager';
import Timeline from './components/Timeline';
import AdminPanel from './components/AdminPanel'; // Import Admin Panel
import { AppData, Todo, Habit, JournalEntry, Expense, SocialPost, VisionImage, SavedMessage } from './types';
import { chatWithAI } from './services/geminiService';
import { StorageService } from './services/storage';
import { supabase } from './services/supabaseClient';

// Add types for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

type ViewState = 'VISION' | 'DASHBOARD' | 'CHAT' | 'SOCIAL' | 'TIMELINE' | 'ADMIN';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'SAVED' | 'SAVING' | 'ERROR'>('SAVED');
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, type: 'TODO'|'HABIT'|'EXPENSE'|'NON_NEGOTIABLE'|'GOAL'|'MILESTONE'}>({ isOpen: false, type: 'TODO' });
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewState>('VISION');

  // Dashboard AI Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'model', text: string}[]>([
      { role: 'model', text: 'Hello! I am your Life Assistant. How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // 1. INITIAL LOAD (Supabase Auth & Data)
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData();
      else setLoadingData(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          fetchUserData();
      } else {
          setData(null);
          setLoadingData(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async () => {
      setLoadingData(true);
      const cloudData = await StorageService.getUserData();
      if (cloudData) {
          // Migration: Ensure new fields exist if loading old data
          if (!cloudData.visionBoard) cloudData.visionBoard = [];
          if (!cloudData.savedChat) cloudData.savedChat = [];
          setData(cloudData);
      }
      setLoadingData(false);
  };

  // 2. AUTO-SAVE (Debounced)
  useEffect(() => {
    if (session && data) {
        setSyncStatus('SAVING');
        const timeoutId = setTimeout(() => {
            console.log("Auto-saving to Supabase...");
            StorageService.saveUserData(data)
                .then(() => setSyncStatus('SAVED'))
                .catch(() => setSyncStatus('ERROR'));
        }, 1500); // 1.5s debounce
        return () => clearTimeout(timeoutId);
    }
  }, [data, session]);


  const handleLogout = () => {
    StorageService.logout();
    setSession(null);
    setData(null);
  };

  const updateData = (newData: AppData) => {
    setData(newData);
  };

  // --- HANDLERS ---
  const handleAddItem = (item: any) => {
    if (!data) return;
    const newData = { ...data };
    
    if (modalConfig.type === 'GOAL') {
        newData.goals = item;
    } else {
        if (modalConfig.type === 'TODO' || modalConfig.type === 'EXPENSE') {
            item.date = selectedDate; 
        }

        if (modalConfig.type === 'TODO') newData.todos = [item, ...newData.todos];
        if (modalConfig.type === 'HABIT') newData.habits = [...newData.habits, { id: item.id, name: item.name, logs: {} }];
        if (modalConfig.type === 'NON_NEGOTIABLE') newData.nonNegotiables = [...newData.nonNegotiables, { id: item.id, title: item.name }];
        if (modalConfig.type === 'EXPENSE') newData.expenses = [item, ...newData.expenses];
        if (modalConfig.type === 'MILESTONE') newData.milestones = [...newData.milestones, item];
    }
    updateData(newData);
  };

  const saveJournalEntry = (entry: JournalEntry) => {
      if (!data) return;
      const existingIndex = data.journal.findIndex(j => j.date === entry.date);
      let newJournal = [...data.journal];
      if (existingIndex >= 0) {
          newJournal[existingIndex] = entry;
      } else {
          newJournal.push(entry);
      }
      updateData({ ...data, journal: newJournal });
  };

  const updateSocialQueue = (newQueue: SocialPost[]) => {
      if (!data) return;
      updateData({ ...data, socialQueue: newQueue });
  };

  const updateVisionBoard = (newImages: VisionImage[]) => {
      if (!data) return;
      updateData({ ...data, visionBoard: newImages });
  };

  const updateSavedChat = (newMessages: SavedMessage[]) => {
      if (!data) return;
      updateData({ ...data, savedChat: newMessages });
  }

  const toggleTodo = (id: string) => {
    if (!data) return;
    const newTodos = data.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    updateData({ ...data, todos: newTodos });
  };

  const deleteTodo = (id: string) => {
      if (!data) return;
      if (window.confirm("Delete this task?")) {
        const newTodos = data.todos.filter(t => t.id !== id);
        updateData({ ...data, todos: newTodos });
      }
  };

  const toggleHabit = (id: string) => {
      if (!data) return;
      const newHabits = data.habits.map(h => {
          if (h.id === id) {
              const isDone = !!h.logs[selectedDate];
              const newLogs = { ...h.logs };
              if (isDone) delete newLogs[selectedDate];
              else newLogs[selectedDate] = true;
              return { ...h, logs: newLogs };
          }
          return h;
      });
      updateData({ ...data, habits: newHabits });
  };

  const deleteHabit = (id: string) => {
    if (!data) return;
    if (window.confirm("Stop tracking this habit? History will be kept but it will be removed from list.")) {
        const newHabits = data.habits.filter(h => h.id !== id);
        updateData({ ...data, habits: newHabits });
    }
  };

  const toggleNonNegotiable = (id: string) => {
      if (!data) return;
      const currentLogs = data.nonNegotiableLogs[selectedDate] || [];
      let newLogs;
      if (currentLogs.includes(id)) {
          newLogs = currentLogs.filter(logId => logId !== id);
      } else {
          newLogs = [...currentLogs, id];
      }
      updateData({ ...data, nonNegotiableLogs: { ...data.nonNegotiableLogs, [selectedDate]: newLogs } });
  };

  const deleteNonNegotiable = (id: string) => {
    if (!data) return;
    if (window.confirm("Remove this non-negotiable rule?")) {
        const newNN = data.nonNegotiables.filter(nn => nn.id !== id);
        updateData({ ...data, nonNegotiables: newNN });
    }
  };

  const deleteExpense = (id: string) => {
      if (!data) return;
      updateData({ ...data, expenses: data.expenses.filter(e => e.id !== id) });
  };

  const toggleMilestone = (id: string) => {
      if (!data) return;
      const newMilestones = data.milestones.map(m => m.id === id ? { ...m, completed: !m.completed } : m);
      updateData({ ...data, milestones: newMilestones });
  };

  const deleteMilestone = (id: string) => {
      if (!data) return;
      if(window.confirm('Delete this milestone?')) {
          updateData({ ...data, milestones: data.milestones.filter(m => m.id !== id) });
      }
  };

  // --- AI CHAT HANDLER ---
  const handleSendMessage = async () => {
      if (!chatInput.trim() || !data) return;
      
      const userMsg = { role: 'user' as const, text: chatInput };
      setChatMessages(prev => [...prev, userMsg]);
      setChatInput('');
      setChatLoading(true);

      const response = await chatWithAI(userMsg.text, data);
      
      setChatMessages(prev => [...prev, { role: 'model', text: response.text }]);
      
      // Auto-add extracted tasks
      if (response.tasks && response.tasks.length > 0) {
          const newTodos: Todo[] = response.tasks.map(t => ({
              id: crypto.randomUUID(),
              title: t.title,
              priority: t.priority,
              completed: false,
              date: selectedDate
          }));
          updateData({ ...data, todos: [...newTodos, ...data.todos] });
      }
      
      setChatLoading(false);
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
          setChatInput(transcript);
      };

      recognition.start();
  };

  if (!session) {
    return <Auth onLogin={() => {}} />;
  }

  if (loadingData || !data) {
      return (
          <div className="min-h-screen bg-emerald-950 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  return (
    <Layout 
      user={data.user} 
      onLogout={handleLogout} 
      currentTab={currentView}
      onTabChange={setCurrentView}
      syncStatus={syncStatus}
    >
        {/* VIEW ROUTING */}
        {currentView === 'VISION' && (
            <VisionBoard 
                userId={session.user.id}
                images={data.visionBoard}
                onUpdateImages={updateVisionBoard} 
            />
        )}
        
        {currentView === 'TIMELINE' && (
            <Timeline 
                milestones={data.milestones} 
                onAddClick={() => setModalConfig({ isOpen: true, type: 'MILESTONE' })}
                onToggle={toggleMilestone}
                onDelete={deleteMilestone}
            />
        )}

        {currentView === 'SOCIAL' && (
            <SocialMediaManager 
                queue={data.socialQueue}
                onUpdateQueue={updateSocialQueue}
                userId={session.user.id}
            />
        )}

        {currentView === 'CHAT' && (
            <SimpleChat 
                userId={session.user.id}
                messages={data.savedChat}
                onUpdateMessages={updateSavedChat}
            />
        )}
        
        {currentView === 'ADMIN' && (
            <AdminPanel currentUserEmail={session.user.email} />
        )}

        {currentView === 'DASHBOARD' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
                
                {/* 1. Header & Goals */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-1">Good Morning, {data.user.name}</h1>
                        <p className="text-emerald-400">Let's make today count.</p>
                    </div>
                    <button 
                        onClick={() => setModalConfig({ isOpen: true, type: 'GOAL' })}
                        className="bg-emerald-950/50 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-xl text-sm transition-all"
                    >
                        🎯 Edit Goals
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT COLUMN: Calendar & Stats */}
                    <div className="space-y-8">
                        <Dashboard 
                            data={data} 
                            selectedDate={selectedDate} 
                            onSelectDate={setSelectedDate} 
                            onDeleteTodo={deleteTodo}
                            onDeleteHabit={deleteHabit}
                            onDeleteNonNegotiable={deleteNonNegotiable}
                        />
                        
                        {/* Non-Negotiables */}
                        <div className="glass-card p-6 rounded-3xl">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-white text-lg">⚠️ Non-Negotiables</h3>
                                <button onClick={() => setModalConfig({ isOpen: true, type: 'NON_NEGOTIABLE' })} className="text-emerald-400 hover:text-white text-xl">+</button>
                             </div>
                             <div className="space-y-3">
                                 {data.nonNegotiables.map(nn => {
                                     const isDone = (data.nonNegotiableLogs[selectedDate] || []).includes(nn.id);
                                     return (
                                         <div 
                                            key={nn.id} 
                                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 group relative overflow-hidden ${isDone ? 'bg-emerald-600 border-emerald-500 shadow-lg shadow-emerald-900/50' : 'bg-black/30 border-red-900/30 hover:border-red-500/50'}`}
                                            onClick={() => toggleNonNegotiable(nn.id)}
                                         >
                                             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isDone ? 'border-white bg-white/20' : 'border-emerald-500/30'}`}>
                                                 {isDone && <span className="text-white text-xs">✓</span>}
                                             </div>
                                             <span className={`font-bold flex-1 ${isDone ? 'text-white' : 'text-emerald-100/50'}`}>{nn.title}</span>
                                             <button onClick={(e) => { e.stopPropagation(); deleteNonNegotiable(nn.id); }} className="text-emerald-500/30 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                         </div>
                                     )
                                 })}
                                 {data.nonNegotiables.length === 0 && <p className="text-emerald-500/30 text-sm italic">No rules set yet.</p>}
                             </div>
                        </div>

                        {/* Habits */}
                        <div className="glass-card p-6 rounded-3xl">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-white text-lg">🔁 Habits</h3>
                                <button onClick={() => setModalConfig({ isOpen: true, type: 'HABIT' })} className="text-emerald-400 hover:text-white text-xl">+</button>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                 {data.habits.map(h => {
                                     const isDone = !!h.logs[selectedDate];
                                     return (
                                         <div key={h.id} className="relative group">
                                             <button 
                                                onClick={() => toggleHabit(h.id)}
                                                className={`w-full p-3 rounded-xl border text-sm font-bold transition-all text-left ${isDone ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-black/20 border-emerald-500/10 text-emerald-500/50'}`}
                                             >
                                                 {h.name}
                                             </button>
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); deleteHabit(h.id); }}
                                                className="absolute -top-1 -right-1 bg-red-900 text-red-200 w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                             >×</button>
                                         </div>
                                     );
                                 })}
                             </div>
                        </div>
                    </div>

                    {/* MIDDLE COLUMN: Tasks */}
                    <div className="space-y-6">
                         <div className="flex justify-between items-end">
                             <h2 className="text-2xl font-bold text-white">Tasks</h2>
                             <button 
                                onClick={() => setModalConfig({ isOpen: true, type: 'TODO' })}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all"
                             >
                                 + New Task
                             </button>
                         </div>

                         {/* Top Priorities */}
                         {data.todos.filter(t => t.date === selectedDate && t.priority === 'TOP').length > 0 && (
                             <div className="space-y-3">
                                 <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Top Priorities</p>
                                 {data.todos.filter(t => t.date === selectedDate && t.priority === 'TOP').map(todo => (
                                     <div key={todo.id} className="glass-card p-4 rounded-xl border-l-4 border-l-red-500 flex items-center gap-4 group">
                                         <button 
                                            onClick={() => toggleTodo(todo.id)}
                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${todo.completed ? 'bg-emerald-500 border-emerald-500' : 'border-emerald-500/30 hover:border-emerald-500'}`}
                                         >
                                             {todo.completed && <span className="text-white text-xs">✓</span>}
                                         </button>
                                         <span className={`flex-1 font-bold text-lg ${todo.completed ? 'text-emerald-500/50 line-through' : 'text-white'}`}>{todo.title}</span>
                                         <button onClick={() => deleteTodo(todo.id)} className="text-emerald-500/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                     </div>
                                 ))}
                             </div>
                         )}

                         {/* Other Tasks */}
                         <div className="space-y-3">
                             <p className="text-xs font-bold text-emerald-500/50 uppercase tracking-wider">To-Do List</p>
                             {data.todos.filter(t => t.date === selectedDate && t.priority !== 'TOP').map(todo => (
                                 <div key={todo.id} className="bg-black/20 p-4 rounded-xl border border-emerald-500/10 flex items-center gap-4 hover:bg-black/30 transition-all group">
                                     <button 
                                        onClick={() => toggleTodo(todo.id)}
                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${todo.completed ? 'bg-emerald-600 border-emerald-600' : 'border-emerald-500/20 hover:border-emerald-500'}`}
                                     >
                                         {todo.completed && <span className="text-white text-xs">✓</span>}
                                     </button>
                                     <span className={`flex-1 ${todo.completed ? 'text-emerald-500/30 line-through' : 'text-emerald-100/80'}`}>{todo.title}</span>
                                     <span className={`text-[10px] px-2 py-1 rounded border ${
                                         todo.priority === 'HIGH' ? 'border-orange-500/30 text-orange-400' : 
                                         todo.priority === 'MEDIUM' ? 'border-blue-500/30 text-blue-400' : 
                                         'border-gray-500/30 text-gray-400'
                                     }`}>
                                         {todo.priority}
                                     </span>
                                     <button onClick={() => deleteTodo(todo.id)} className="text-emerald-500/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                 </div>
                             ))}
                             {data.todos.filter(t => t.date === selectedDate).length === 0 && (
                                 <div className="text-center py-10 text-emerald-500/30">
                                     <p>No tasks for today.</p>
                                     <p className="text-sm">Enjoy your freedom!</p>
                                 </div>
                             )}
                         </div>
                    </div>

                    {/* RIGHT COLUMN: Journal & AI */}
                    <div className="space-y-8">
                        
                        {/* Journal Preview */}
                        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                 <span className="text-6xl">📖</span>
                             </div>
                             <h3 className="font-bold text-white text-xl mb-2">Daily Journal</h3>
                             <div className="bg-black/20 rounded-xl p-4 min-h-[120px] mb-4 text-emerald-100/70 text-sm leading-relaxed whitespace-pre-wrap">
                                 {data.journal.find(j => j.date === selectedDate)?.content 
                                    ? data.journal.find(j => j.date === selectedDate)?.content.substring(0, 150) + '...' 
                                    : "Hasn't been written yet."}
                             </div>
                             <button 
                                onClick={() => setIsJournalModalOpen(true)}
                                className="w-full py-3 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl font-bold transition-all border border-emerald-500/20"
                             >
                                 Open Journal
                             </button>
                        </div>

                        {/* Quick Expenses */}
                        <div className="glass-card p-6 rounded-3xl">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-white text-lg">💸 Daily Spend</h3>
                                <button onClick={() => setModalConfig({ isOpen: true, type: 'EXPENSE' })} className="text-emerald-400 hover:text-white text-xl">+</button>
                             </div>
                             <div className="space-y-2">
                                 {data.expenses.filter(e => e.date === selectedDate).map(e => (
                                     <div key={e.id} className="flex justify-between items-center text-sm p-2 hover:bg-black/20 rounded-lg">
                                         <span className="text-emerald-100/70">{e.description}</span>
                                         <div className="flex items-center gap-3">
                                            <span className="font-bold text-white">${e.amount}</span>
                                            <button onClick={() => deleteExpense(e.id)} className="text-emerald-500/30 hover:text-red-400">×</button>
                                         </div>
                                     </div>
                                 ))}
                                 <div className="border-t border-emerald-500/20 mt-2 pt-2 flex justify-between font-bold text-emerald-300">
                                     <span>Total</span>
                                     <span>${data.expenses.filter(e => e.date === selectedDate).reduce((sum, e) => sum + e.amount, 0).toFixed(2)}</span>
                                 </div>
                             </div>
                        </div>

                        {/* Floating AI Chat Trigger (Desktop) */}
                        <div className="hidden lg:block">
                            <button 
                                onClick={() => setIsChatOpen(!isChatOpen)}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 border border-emerald-500/30 flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-lg shadow-emerald-900/50"
                            >
                                <span className="text-2xl">🤖</span>
                                <div className="text-left">
                                    <p className="font-bold text-emerald-100 leading-none">AI Assistant</p>
                                    <p className="text-[10px] text-emerald-400">Ask about your day...</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* MODALS */}
                <ActionModal 
                    isOpen={modalConfig.isOpen} 
                    onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} 
                    type={modalConfig.type}
                    onSubmit={handleAddItem}
                />
                
                <JournalModal 
                    isOpen={isJournalModalOpen}
                    onClose={() => setIsJournalModalOpen(false)}
                    date={selectedDate}
                    data={data}
                    existingEntry={data.journal.find(j => j.date === selectedDate)}
                    onSave={saveJournalEntry}
                    userId={session.user.id}
                />

                {/* AI CHAT OVERLAY */}
                {isChatOpen && (
                    <div className="fixed bottom-6 right-6 w-96 h-[500px] glass-card rounded-2xl border border-emerald-500/30 shadow-2xl flex flex-col overflow-hidden z-50 animate-fade-in-up">
                        <div className="p-4 bg-emerald-900/80 flex justify-between items-center border-b border-emerald-500/20">
                            <h3 className="font-bold text-white flex items-center gap-2">🤖 Assistant</h3>
                            <button onClick={() => setIsChatOpen(false)} className="text-emerald-400 hover:text-white">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/40">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-emerald-900/50 text-emerald-100 rounded-bl-none border border-emerald-500/20'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && <div className="text-emerald-500/50 text-xs italic">Thinking...</div>}
                        </div>
                        <div className="p-3 bg-emerald-900/80 border-t border-emerald-500/20 flex gap-2">
                            <button 
                                onClick={toggleListening}
                                className={`p-2 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-700'}`}
                            >
                                🎙️
                            </button>
                            <input 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                className="flex-1 bg-black/30 border border-emerald-500/30 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-400"
                                placeholder={isListening ? "Listening..." : "Type or speak..."}
                            />
                            <button onClick={handleSendMessage} className="bg-emerald-500 hover:bg-emerald-400 text-white p-2 rounded-lg">
                                ➤
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}
    </Layout>
  );
};

export default App;
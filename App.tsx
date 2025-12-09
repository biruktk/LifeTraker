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
import { AppData, Todo, Habit, JournalEntry, Expense, SocialPost } from './types';
import { chatWithAI } from './services/geminiService';

// Add types for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// Initial Mock Data Structure (used as template)
const INITIAL_DATA_TEMPLATE: AppData = {
  goals: {
      main: "Build a $1M Business",
      weekly: "Launch MVP by Friday"
  },
  user: { name: 'User', profileImage: '' },
  nonNegotiables: [
      { id: 'nn1', title: '5am Wake Up' },
      { id: 'nn2', title: 'No Phone First Hour' }
  ],
  milestones: [
      { id: 'm1', title: 'Launch App', date: new Date().toISOString().split('T')[0], completed: true, description: 'Deploy the MVP to Vercel and get first user.' },
      { id: 'm2', title: 'Reach 100 Users', date: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0], completed: false, description: 'Marketing campaign on Twitter and Reddit.' }
  ],
  socialQueue: [],
  nonNegotiableLogs: {},
  todos: [
    { id: '1', title: 'Start your journey', priority: 'TOP', completed: false, date: new Date().toISOString().split('T')[0] }
  ],
  habits: [
    { id: 'h1', name: 'Drink Water', logs: {} },
  ],
  journal: [],
  expenses: []
};

type ViewState = 'VISION' | 'DASHBOARD' | 'CHAT' | 'SOCIAL' | 'TIMELINE';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string, email: string } | null>(null);
  const [data, setData] = useState<AppData>(INITIAL_DATA_TEMPLATE);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, type: 'TODO'|'HABIT'|'EXPENSE'|'NON_NEGOTIABLE'|'GOAL'|'MILESTONE'}>({ isOpen: false, type: 'TODO' });
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  
  // Navigation State - Default to Vision Board
  const [currentView, setCurrentView] = useState<ViewState>('VISION');

  // Dashboard AI Chat (Separate from global chat tab)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'model', text: string}[]>([
      { role: 'model', text: 'Hello! I am your Life Assistant. How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Voice Interaction State
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Auth Initialization
  useEffect(() => {
    const session = localStorage.getItem('life_tracker_session');
    if (session) {
      setCurrentUser(JSON.parse(session));
    }
  }, []);

  // Data Loading per User
  useEffect(() => {
    if (currentUser) {
      const stored = localStorage.getItem(`life_tracker_data_${currentUser.id}`);
      if (stored) {
        setData(JSON.parse(stored));
      } else {
        // Init data for new user
        setData({ ...INITIAL_DATA_TEMPLATE, user: { name: currentUser.name } });
      }
    }
  }, [currentUser]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
      return () => {
          window.speechSynthesis.cancel();
      };
  }, []);

  const handleLogin = (user: { id: string; name: string; email: string }) => {
    localStorage.setItem('life_tracker_session', JSON.stringify(user));
    setCurrentUser(user);
    setCurrentView('VISION'); // Ensure we start at Vision Board on login
  };

  const handleLogout = () => {
    localStorage.removeItem('life_tracker_session');
    setCurrentUser(null);
    setData(INITIAL_DATA_TEMPLATE);
    window.speechSynthesis.cancel();
  };

  const updateData = (newData: AppData) => {
    setData(newData);
    if (currentUser) {
        localStorage.setItem(`life_tracker_data_${currentUser.id}`, JSON.stringify(newData));
    }
  };

  const handleAddItem = (item: any) => {
    const newData = { ...data };
    
    if (modalConfig.type === 'GOAL') {
        newData.goals = item;
    } else {
        // Force the date to be the selected date for relevant items
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
      const existingIndex = data.journal.findIndex(j => j.date === entry.date);
      let newJournal = [...data.journal];
      if (existingIndex >= 0) {
          newJournal[existingIndex] = entry;
      } else {
          newJournal.push(entry);
      }
      updateData({ ...data, journal: newJournal });
  };

  // Social Queue Handler
  const updateSocialQueue = (newQueue: SocialPost[]) => {
      updateData({ ...data, socialQueue: newQueue });
  };

  // -- Data Helpers for Selected Date --
  const todaysTodos = data.todos.filter(t => t.date === selectedDate);
  const topPriorityTodos = todaysTodos.filter(t => t.priority === 'TOP').sort((a,b) => Number(a.completed) - Number(b.completed));
  const otherTodos = todaysTodos.filter(t => t.priority !== 'TOP').sort((a,b) => Number(a.completed) - Number(b.completed));
  
  const todaysJournal = data.journal.find(j => j.date === selectedDate);
  const todaysExpenses = data.expenses.filter(e => e.date === selectedDate);
  const completedNN = data.nonNegotiableLogs[selectedDate] || [];
  
  // -- Handlers --
  const toggleTodo = (id: string) => {
    const newTodos = data.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    updateData({ ...data, todos: newTodos });
  };

  const toggleHabit = (id: string) => {
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

  const toggleNonNegotiable = (id: string) => {
      const currentLogs = data.nonNegotiableLogs[selectedDate] || [];
      let newLogs;
      if (currentLogs.includes(id)) {
          newLogs = currentLogs.filter(logId => logId !== id);
      } else {
          newLogs = [...currentLogs, id];
      }
      updateData({ ...data, nonNegotiableLogs: { ...data.nonNegotiableLogs, [selectedDate]: newLogs } });
  };

  const deleteExpense = (id: string) => {
      updateData({ ...data, expenses: data.expenses.filter(e => e.id !== id) });
  };

  // Milestone Handlers
  const toggleMilestone = (id: string) => {
      const newMilestones = data.milestones.map(m => m.id === id ? { ...m, completed: !m.completed } : m);
      updateData({ ...data, milestones: newMilestones });
  };

  const deleteMilestone = (id: string) => {
      if(window.confirm('Delete this milestone?')) {
          updateData({ ...data, milestones: data.milestones.filter(m => m.id !== id) });
      }
  };

  // --- VOICE FUNCTIONS ---
  const startListening = () => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          alert("Speech recognition is not supported in this browser. Please use Chrome.");
          return;
      }

      if (isListening) {
          recognitionRef.current?.stop();
          return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
      };

      recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setChatInput(transcript);
      };

      recognition.start();
  };

  const speakText = (text: string) => {
      window.speechSynthesis.cancel(); // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      // Try to find a nice sounding voice
      const preferredVoice = voices.find(v => 
          (v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.includes('Female')) && v.lang.startsWith('en')
      );
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
  };

  const handleSendChat = async () => {
      if (!chatInput.trim()) return;
      
      // Stop listening if active
      if (isListening) recognitionRef.current?.stop();
      
      const userMsg = chatInput;
      setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setChatInput('');
      setChatLoading(true);
      
      const { text, tasks } = await chatWithAI(userMsg, data);
      
      let newMessage = { role: 'model' as const, text: text };
      const newMessages = [...chatMessages, { role: 'user' as const, text: userMsg }, newMessage];
      
      // Handle Extracted Tasks
      if (tasks && tasks.length > 0) {
          const newTodos: Todo[] = tasks.map(t => ({
              id: crypto.randomUUID(),
              title: t.title,
              priority: (['TOP', 'HIGH', 'MEDIUM', 'LOW'].includes(t.priority) ? t.priority : 'MEDIUM') as any,
              completed: false,
              date: selectedDate
          }));
          
          setData(prev => ({
              ...prev,
              todos: [...newTodos, ...prev.todos]
          }));

          const taskMsg = `✅ I've extracted and added ${newTodos.length} items to your Todo list for ${selectedDate}.`;
          newMessages.push({ role: 'model', text: taskMsg });
          
          // Append task message for speech
          if (isSpeechEnabled) speakText(text + " " + taskMsg);
      } else {
          if (isSpeechEnabled) speakText(text);
      }
      
      setChatMessages(newMessages);
      setChatLoading(false);
  };

  // RENDER AUTH IF NOT LOGGED IN
  if (!currentUser) {
      return <Auth onLogin={handleLogin} />;
  }

  return (
    <Layout 
        user={{ name: currentUser.name }} 
        onLogout={handleLogout}
        currentTab={currentView}
        onTabChange={setCurrentView}
    >
      
      {/* --- TAB 1: VISION BOARD (Main Page) --- */}
      {currentView === 'VISION' && (
          <VisionBoard userId={currentUser.id} />
      )}

      {/* --- TAB 2: TIMELINE --- */}
      {currentView === 'TIMELINE' && (
          <Timeline 
             milestones={data.milestones}
             onAddClick={() => setModalConfig({ isOpen: true, type: 'MILESTONE' })}
             onToggle={toggleMilestone}
             onDelete={deleteMilestone}
          />
      )}

      {/* --- TAB 3: CHAT & FILES --- */}
      {currentView === 'CHAT' && (
          <SimpleChat userId={currentUser.id} />
      )}
      
      {/* --- TAB 4: SOCIAL MEDIA --- */}
      {currentView === 'SOCIAL' && (
          <SocialMediaManager 
             queue={data.socialQueue || []} 
             onUpdateQueue={updateSocialQueue}
          />
      )}

      {/* --- TAB 5: DASHBOARD (Original Functionality) --- */}
      {currentView === 'DASHBOARD' && (
        <>
            <div className="flex justify-end -mt-4 mb-2">
                <button 
                        onClick={() => setModalConfig({ isOpen: true, type: 'GOAL' })} 
                        className="text-xs text-emerald-400/50 hover:text-emerald-300 underline"
                >
                    Edit Goals
                </button>
            </div>

            <Dashboard data={data} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

            {/* --- DAY DETAIL VIEW --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
                {/* ... (Existing Dashboard components remain unchanged) ... */}
                {/* LEFT COLUMN: NON-NEGOTIABLES & HABITS */}
                <div className="space-y-6">
                    
                    {/* NON-NEGOTIABLES */}
                    <div className="glass-card rounded-2xl p-5 border border-red-500/30 bg-red-950/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-red-50 flex items-center gap-2">
                                <span className="text-xl">⚠️</span> Non-Negotiables
                            </h3>
                            <button 
                                onClick={() => setModalConfig({ isOpen: true, type: 'NON_NEGOTIABLE' })}
                                className="text-xs text-red-400/60 hover:text-red-300 px-2 py-1 rounded"
                            >
                                + Add
                            </button>
                        </div>
                        <div className="space-y-3">
                            {data.nonNegotiables.map(nn => {
                                const isDone = completedNN.includes(nn.id);
                                return (
                                    <div 
                                        key={nn.id} 
                                        onClick={() => toggleNonNegotiable(nn.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isDone ? 'bg-red-500/10 border-red-500/20' : 'bg-black/20 border-transparent hover:border-red-500/30'}`}
                                    >
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isDone ? 'bg-red-500 border-red-500' : 'border-red-500/40'}`}>
                                            {isDone && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className={`font-bold text-sm ${isDone ? 'text-red-300 line-through opacity-70' : 'text-red-50'}`}>{nn.title}</span>
                                    </div>
                                );
                            })}
                            {data.nonNegotiables.length === 0 && <p className="text-xs text-red-400/40 text-center py-2">No non-negotiables set.</p>}
                        </div>
                    </div>

                    {/* SIMPLE HABITS */}
                    <div className="glass-card rounded-2xl p-5 border border-emerald-500/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-emerald-50 flex items-center gap-2">
                                <span className="text-xl">🔄</span> Daily Habits
                            </h3>
                            <button 
                                onClick={() => setModalConfig({ isOpen: true, type: 'HABIT' })}
                                className="text-xs bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/30"
                            >
                                + Add
                            </button>
                        </div>
                        <div className="grid gap-2">
                            {data.habits.map(habit => {
                                const isDone = !!habit.logs[selectedDate];
                                return (
                                    <div 
                                        key={habit.id} 
                                        onClick={() => toggleHabit(habit.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isDone ? 'bg-emerald-500/20' : 'bg-black/20 hover:bg-black/30'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-emerald-500/40'}`}>
                                            {isDone && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className={`text-sm font-medium ${isDone ? 'text-emerald-300' : 'text-emerald-100'}`}>{habit.name}</span>
                                    </div>
                                );
                            })}
                            {data.habits.length === 0 && <p className="text-xs text-emerald-400/40 text-center py-2">No habits added.</p>}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: TASKS (Priorities & Normal) */}
                <div className="space-y-6">
                    
                    <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 min-h-[400px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-emerald-50 flex items-center gap-2">
                                <span className="text-xl">✅</span> Tasks
                            </h3>
                            <button 
                                onClick={() => setModalConfig({ isOpen: true, type: 'TODO' })}
                                className="text-xs bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/30"
                            >
                                + Add Task
                            </button>
                        </div>
                        
                        <div className="space-y-2">
                            {/* TOP PRIORITY TASKS */}
                            {topPriorityTodos.map(todo => (
                                <div key={todo.id} className={`flex items-start gap-3 p-3 rounded-xl border border-red-500/40 bg-red-950/20 hover:bg-red-900/20 transition-all group ${todo.completed ? 'opacity-60 grayscale' : ''}`}>
                                    <button 
                                        onClick={() => toggleTodo(todo.id)}
                                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${todo.completed ? 'bg-red-500 border-red-500' : 'border-red-500/60 hover:border-red-400'}`}
                                    >
                                        {todo.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className={`text-sm font-bold truncate ${todo.completed ? 'text-red-400/50 line-through' : 'text-red-50'}`}>{todo.title}</p>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-950/50 px-1.5 py-0.5 rounded ml-2">TOP PRIORITY</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* REGULAR TASKS */}
                            {otherTodos.map(todo => (
                                <div key={todo.id} className={`flex items-start gap-3 p-3 rounded-xl bg-black/20 hover:bg-black/30 transition-all group ${todo.completed ? 'opacity-50' : ''}`}>
                                    <button 
                                        onClick={() => toggleTodo(todo.id)}
                                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${todo.completed ? 'bg-emerald-500 border-emerald-500' : 'border-emerald-500/40 hover:border-emerald-400'}`}
                                    >
                                        {todo.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${todo.completed ? 'text-emerald-500 line-through' : 'text-emerald-50'}`}>{todo.title}</p>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${todo.priority === 'HIGH' ? 'text-amber-400' : 'text-emerald-400/60'}`}>
                                            {todo.priority !== 'MEDIUM' && todo.priority}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {todaysTodos.length === 0 && (
                                <div className="text-center py-10 text-emerald-400/40 text-sm border-2 border-dashed border-emerald-500/10 rounded-xl">
                                    No tasks scheduled.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* JOURNAL & EXPENSES COMPACT */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* JOURNAL */}
                        <div 
                            onClick={() => setIsJournalModalOpen(true)}
                            className="glass-card rounded-2xl p-4 border border-emerald-500/20 cursor-pointer hover:bg-emerald-900/20 transition-all group"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-sm text-emerald-50 flex items-center gap-2">
                                    <span className="text-lg">📔</span> Daily Journal
                                </h3>
                                <span className="text-xs text-emerald-400 opacity-60 group-hover:opacity-100 underline">Open & Edit</span>
                            </div>
                            
                            <div className="bg-black/20 rounded-xl border border-emerald-500/10 p-3 text-sm h-24 overflow-hidden relative">
                                {todaysJournal?.content ? (
                                    <p className="text-emerald-100/80">{todaysJournal.content}</p>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-emerald-500/40 gap-2">
                                        <span className="text-xl opacity-50">✨</span>
                                        <span className="text-xs">Tap to write or auto-generate with AI</span>
                                    </div>
                                )}
                                {/* Highlights Preview Chips */}
                                {todaysJournal?.highlights && todaysJournal.highlights.length > 0 && (
                                    <div className="absolute bottom-2 left-2 flex gap-1">
                                        {todaysJournal.highlights.slice(0, 2).map((h, i) => (
                                            <span key={i} className="text-[10px] bg-emerald-900/80 text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-500/20 truncate max-w-[80px]">{h}</span>
                                        ))}
                                        {todaysJournal.highlights.length > 2 && <span className="text-[10px] bg-emerald-900/80 text-emerald-200 px-1.5 py-0.5 rounded">+{todaysJournal.highlights.length - 2}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* EXPENSES */}
                        <div className="glass-card rounded-2xl p-4 border border-emerald-500/20">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-sm text-emerald-50 flex items-center gap-2">
                                    <span className="text-lg">💰</span> Expenses
                                </h3>
                                <button onClick={() => setModalConfig({ isOpen: true, type: 'EXPENSE' })} className="text-xs text-emerald-400 underline">+ Add</button>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                {todaysExpenses.map(exp => (
                                    <div key={exp.id} className="flex justify-between items-center p-2 rounded bg-black/20 text-xs">
                                        <span className="text-emerald-100 truncate max-w-[60%]">{exp.description}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-emerald-50">${exp.amount.toFixed(2)}</span>
                                            <button onClick={() => deleteExpense(exp.id)} className="text-emerald-600 hover:text-red-400">×</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* FIXED BOTTOM AI BAR - Only visible on Dashboard Tab */}
            <div className={`fixed bottom-0 left-0 md:left-64 right-0 z-30 transition-all duration-300 ${isChatOpen ? 'h-[500px]' : 'h-16'} bg-emerald-950/90 backdrop-blur-xl border-t border-emerald-500/30 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]`}>
                {isChatOpen ? (
                    <div className="flex flex-col h-full max-w-5xl mx-auto">
                        <div className="flex justify-between items-center p-3 border-b border-emerald-800/50">
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-emerald-100 flex items-center gap-2">
                                    <span className="text-xl">🤖</span> Life Assistant
                                </h3>
                                {/* VOICE OUTPUT TOGGLE */}
                                <button 
                                    onClick={() => {
                                        if (isSpeechEnabled) window.speechSynthesis.cancel();
                                        setIsSpeechEnabled(!isSpeechEnabled);
                                    }}
                                    className={`p-1.5 rounded-lg transition-colors ${isSpeechEnabled ? 'bg-emerald-500 text-white' : 'bg-black/20 text-emerald-500/50'}`}
                                    title={isSpeechEnabled ? "Voice Output On" : "Voice Output Off"}
                                >
                                    {isSpeechEnabled ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                                    )}
                                </button>
                            </div>
                            <button onClick={() => { setIsChatOpen(false); window.speechSynthesis.cancel(); }} className="text-emerald-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-emerald-900/60 text-emerald-50 rounded-bl-none border border-emerald-500/20'}`}>
                                            {msg.text}
                                        </div>
                                </div>
                            ))}
                            {chatLoading && <div className="text-xs text-emerald-500 animate-pulse ml-4">Thinking...</div>}
                        </div>
                        
                        <div className="p-3 bg-emerald-950 border-t border-emerald-500/20">
                            <div className="flex gap-2 items-center">
                                {/* MICROPHONE BUTTON */}
                                <button 
                                    onClick={startListening}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-black/30 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/50'}`}
                                    title="Speak"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </button>

                                <input 
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                                        placeholder={isListening ? "Listening..." : "Ask AI or tap mic..."}
                                        className={`flex-1 bg-black/30 border border-emerald-500/30 rounded-full px-4 py-2 text-sm text-white focus:border-emerald-400 outline-none transition-all ${isListening ? 'border-red-500/50 placeholder-red-400/50' : ''}`}
                                />
                                <button onClick={handleSendChat} className="bg-emerald-500 hover:bg-emerald-400 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setIsChatOpen(true)} className="w-full h-full flex items-center justify-center gap-2 text-emerald-300 hover:text-white hover:bg-emerald-900/50 transition-colors">
                        <span className="text-xl">✨</span>
                        <span className="font-medium text-sm">Ask AI Assistant</span>
                    </button>
                )}
            </div>

            <ActionModal 
                isOpen={modalConfig.isOpen} 
                type={modalConfig.type} 
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleAddItem}
            />

            <JournalModal
                isOpen={isJournalModalOpen}
                onClose={() => setIsJournalModalOpen(false)}
                date={selectedDate}
                data={data}
                existingEntry={todaysJournal}
                onSave={saveJournalEntry}
            />
        </>
      )}

    </Layout>
  );
};

export default App;
import React, { ReactNode, useState } from 'react';

interface LayoutProps {
  children: ReactNode;
  user?: { name: string };
  onLogout?: () => void;
  currentTab?: 'VISION' | 'DASHBOARD' | 'CHAT' | 'SOCIAL' | 'TIMELINE';
  onTabChange?: (tab: 'VISION' | 'DASHBOARD' | 'CHAT' | 'SOCIAL' | 'TIMELINE') => void;
  syncStatus?: 'SAVED' | 'SAVING' | 'ERROR';
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentTab = 'VISION', onTabChange, syncStatus = 'SAVED' }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-500 selection:text-white flex bg-[#022c22]">
      
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-emerald-950/60 backdrop-blur-xl border-r border-emerald-500/10 h-screen sticky top-0 z-50">
          <div className="p-6 border-b border-emerald-500/10">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent tracking-tight">
                Life Tracker
              </h1>
              <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-emerald-400/60">Productivity OS</p>
                  {syncStatus === 'SAVING' && <span className="text-[10px] text-yellow-400 animate-pulse">☁️ Saving...</span>}
                  {syncStatus === 'SAVED' && <span className="text-[10px] text-emerald-600">☁️ Saved</span>}
                  {syncStatus === 'ERROR' && <span className="text-[10px] text-red-500">☁️ Error</span>}
              </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
               <button 
                  onClick={() => onTabChange?.('VISION')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentTab === 'VISION' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-emerald-400/60 hover:text-emerald-200 hover:bg-white/5'}`}
               >
                  <span className="text-xl">🖼️</span>
                  <span className="font-bold text-sm">Vision Board</span>
               </button>

               <button 
                  onClick={() => onTabChange?.('TIMELINE')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentTab === 'TIMELINE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-emerald-400/60 hover:text-emerald-200 hover:bg-white/5'}`}
               >
                  <span className="text-xl">⏳</span>
                  <span className="font-bold text-sm">Timeline</span>
               </button>

               <button 
                  onClick={() => onTabChange?.('DASHBOARD')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentTab === 'DASHBOARD' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-emerald-400/60 hover:text-emerald-200 hover:bg-white/5'}`}
               >
                  <span className="text-xl">📊</span>
                  <span className="font-bold text-sm">Dashboard</span>
               </button>

               <button 
                  onClick={() => onTabChange?.('SOCIAL')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentTab === 'SOCIAL' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-emerald-400/60 hover:text-emerald-200 hover:bg-white/5'}`}
               >
                  <span className="text-xl">📢</span>
                  <span className="font-bold text-sm">Social Media</span>
               </button>

               <button 
                  onClick={() => onTabChange?.('CHAT')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentTab === 'CHAT' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-emerald-400/60 hover:text-emerald-200 hover:bg-white/5'}`}
               >
                  <span className="text-xl">💬</span>
                  <span className="font-bold text-sm">Chat & Files</span>
               </button>
          </nav>

          {user && (
              <div className="p-4 border-t border-emerald-500/10">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-emerald-500/5 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-bold text-sm text-white shadow-lg">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-emerald-100 truncate">{user.name}</p>
                          <button onClick={onLogout} className="text-[10px] text-red-400 hover:text-red-300 transition-colors">Log Out</button>
                      </div>
                  </div>
              </div>
          )}
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-emerald-950/90 backdrop-blur-xl border-b border-emerald-500/20 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-emerald-100">Life Tracker</h1>
            {syncStatus === 'SAVING' && <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>}
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-emerald-300">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
          </button>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-emerald-950/95 backdrop-blur-xl pt-20 px-6 space-y-4">
               <button onClick={() => {onTabChange?.('VISION'); setIsMobileMenuOpen(false)}} className="w-full text-left p-4 rounded-xl bg-emerald-900/40 text-emerald-100 font-bold">🖼️ Vision Board</button>
               <button onClick={() => {onTabChange?.('TIMELINE'); setIsMobileMenuOpen(false)}} className="w-full text-left p-4 rounded-xl bg-emerald-900/40 text-emerald-100 font-bold">⏳ Timeline</button>
               <button onClick={() => {onTabChange?.('DASHBOARD'); setIsMobileMenuOpen(false)}} className="w-full text-left p-4 rounded-xl bg-emerald-900/40 text-emerald-100 font-bold">📊 Dashboard</button>
               <button onClick={() => {onTabChange?.('SOCIAL'); setIsMobileMenuOpen(false)}} className="w-full text-left p-4 rounded-xl bg-emerald-900/40 text-emerald-100 font-bold">📢 Social Media</button>
               <button onClick={() => {onTabChange?.('CHAT'); setIsMobileMenuOpen(false)}} className="w-full text-left p-4 rounded-xl bg-emerald-900/40 text-emerald-100 font-bold">💬 Chat & Files</button>
               <div className="border-t border-emerald-500/20 pt-4 mt-8 flex flex-col gap-3">
                   <button onClick={onLogout} className="text-red-400 font-bold py-2">Log Out</button>
               </div>
          </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-4 md:p-8 pt-20 md:pt-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};

export default Layout;
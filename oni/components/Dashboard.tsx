import React, { useState, useEffect } from 'react';
import { AppData } from '../types';

interface DashboardProps {
  data: AppData;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, selectedDate, onSelectDate }) => {
  const [showWeeklyGoal, setShowWeeklyGoal] = useState(false);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Goal Animation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setShowWeeklyGoal(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const getDayScore = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Todos Score
    const tasksForDay = data.todos.filter(t => t.date === dateStr);
    const completedTasks = tasksForDay.filter(t => t.completed).length;
    
    // Non-Negotiables Score
    const totalNN = data.nonNegotiables.length;
    const completedNN = (data.nonNegotiableLogs[dateStr] || []).length;

    // Habits Score (Boolean now)
    const totalHabits = data.habits.length;
    const completedHabits = data.habits.filter(h => h.logs[dateStr]).length;

    const totalItems = tasksForDay.length + totalNN + totalHabits;
    if (totalItems === 0) return -1;

    const totalDone = completedTasks + completedNN + completedHabits;
    return (totalDone / totalItems) * 100;
  };

  const getInlineStyle = (score: number, isSelected: boolean) => {
      const baseStyle: any = {};
      
      if (score !== -1) {
          const hue = Math.min(score * 1.2, 120);
          baseStyle.backgroundColor = `hsla(${hue}, 70%, 40%, 0.4)`;
          baseStyle.borderColor = `hsla(${hue}, 70%, 60%, 0.6)`;
      } else {
           baseStyle.backgroundColor = 'rgba(6, 78, 59, 0.2)'; // dark emerald tint
           baseStyle.borderColor = 'rgba(52, 211, 153, 0.1)';
      }

      if (isSelected) {
          baseStyle.borderColor = '#ffffff';
          baseStyle.borderWidth = '2px';
          baseStyle.backgroundColor = score !== -1 ? `hsla(${Math.min(score * 1.2, 120)}, 70%, 45%, 0.8)` : 'rgba(16, 185, 129, 0.4)';
          baseStyle.boxShadow = '0 0 15px rgba(16, 185, 129, 0.4)';
          baseStyle.transform = 'scale(1.05)';
      }

      return baseStyle;
  };

  const tasksForSelected = data.todos.filter(t => t.date === selectedDate);
  const tasksDoneSelected = tasksForSelected.filter(t => t.completed).length;
  
  return (
    <div className="space-y-6">
      
      {/* Animated Goal Ticker */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex items-center justify-center min-h-[100px] border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
          <div className="text-center w-full">
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">
                  {showWeeklyGoal ? '🎯 Weekly Focus' : '🚀 Main Vision'}
              </p>
              <div className="relative h-8 overflow-hidden">
                  <h2 
                    className={`text-2xl md:text-3xl font-bold text-white transition-all duration-700 transform absolute w-full left-0 ${showWeeklyGoal ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}
                  >
                      {data.goals.main}
                  </h2>
                  <h2 
                    className={`text-2xl md:text-3xl font-bold text-white transition-all duration-700 transform absolute w-full left-0 ${showWeeklyGoal ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
                  >
                      {data.goals.weekly}
                  </h2>
              </div>
          </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
        <div className="flex justify-between items-center mb-6 px-2">
            <div>
                 <h3 className="text-2xl font-bold text-emerald-50">{today.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                 <p className="text-emerald-400/60 text-sm">Select a date to manage details</p>
            </div>
            
            <div className="flex items-center gap-3 text-xs font-medium text-emerald-400/60 bg-black/20 px-3 py-1.5 rounded-full">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/50"></span>0%</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500/50"></span>50%</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/50"></span>100%</div>
            </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2 md:gap-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-emerald-500/50 text-xs font-bold uppercase tracking-wider mb-2">{d}</div>
            ))}
            
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const score = getDayScore(day);
                const isSelected = dateStr === selectedDate;
                const isToday = day === today.getDate();
                
                return (
                    <button 
                        key={day}
                        onClick={() => onSelectDate(dateStr)}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold relative transition-all duration-200 border ${isToday && !isSelected ? 'ring-1 ring-emerald-400 ring-offset-1 ring-offset-emerald-950' : ''}`}
                        style={getInlineStyle(score, isSelected)}
                    >
                        <span className={isSelected ? 'text-white' : 'text-emerald-100/80'}>{day}</span>
                        {score !== -1 && (
                            <div className="h-1 w-6 rounded-full mt-1 bg-black/20 overflow-hidden">
                                <div className="h-full bg-white/80" style={{ width: `${score}%` }}></div>
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
      </div>
      
      {/* Selection Summary */}
      <div className="flex items-center justify-between px-2">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            {selectedDate === new Date().toISOString().split('T')[0] && <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">Today</span>}
          </h2>
          <div className="flex gap-4 text-sm text-emerald-400">
               <span>Tasks: <strong className="text-white">{tasksDoneSelected}/{tasksForSelected.length}</strong></span>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
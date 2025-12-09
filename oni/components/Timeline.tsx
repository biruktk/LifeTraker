import React from 'react';
import { Milestone } from '../types';

interface TimelineProps {
  milestones: Milestone[];
  onAddClick: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const Timeline: React.FC<TimelineProps> = ({ milestones, onAddClick, onToggle, onDelete }) => {
  // Sort by date: Earliest first (top) -> Latest (bottom)
  const sortedMilestones = [...milestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="max-w-4xl mx-auto min-h-screen pb-20 animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-12 px-4">
        <div>
           <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200 mb-2">Life Milestones</h1>
           <p className="text-emerald-400/60">Your journey, mapped out step by step.</p>
        </div>
        <button 
           onClick={onAddClick}
           className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all flex items-center gap-2"
        >
            <span className="text-xl">+</span> Add Milestone
        </button>
      </div>

      {milestones.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-emerald-500/20 rounded-3xl bg-black/10 mx-4">
              <span className="text-6xl mb-4 block">🚩</span>
              <p className="text-emerald-400/50">No milestones yet.</p>
              <button onClick={onAddClick} className="text-emerald-400 hover:text-white underline mt-2">Start your timeline</button>
          </div>
      ) : (
          <div className="relative px-4">
              {/* The Vertical Line */}
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500/50 via-emerald-500/20 to-transparent"></div>

              <div className="space-y-12">
                  {sortedMilestones.map((milestone, index) => {
                      const isCompleted = milestone.completed;
                      const isLeft = index % 2 === 0; // Alternating sides for desktop
                      
                      return (
                          <div key={milestone.id} className={`relative flex items-center md:justify-between ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                              
                              {/* The Dot on the Line */}
                              <div className={`absolute left-8 md:left-1/2 w-4 h-4 rounded-full border-2 transform -translate-x-1/2 z-10 transition-all duration-500 ${isCompleted ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'bg-black border-emerald-500/50'}`}>
                                  {isCompleted && <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20"></div>}
                              </div>

                              {/* Empty space for the other side (Desktop only) */}
                              <div className="hidden md:block w-5/12"></div>

                              {/* Content Card */}
                              <div className="ml-16 md:ml-0 w-full md:w-5/12 group">
                                  <div 
                                    className={`relative p-6 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 cursor-pointer
                                        ${isCompleted 
                                            ? 'bg-emerald-900/30 border-emerald-500/40 shadow-[0_0_20px_rgba(6,78,59,0.4)]' 
                                            : 'bg-black/40 border-emerald-500/10 hover:border-emerald-500/30'
                                        }
                                    `}
                                    onClick={() => onToggle(milestone.id)}
                                  >
                                      {/* Connector Line (Mobile) */}
                                      <div className={`absolute top-1/2 -left-8 w-8 h-0.5 md:hidden ${isCompleted ? 'bg-emerald-500/50' : 'bg-emerald-500/20'}`}></div>
                                      
                                      {/* Connector Line (Desktop) */}
                                      <div className={`hidden md:block absolute top-1/2 w-8 h-0.5 ${isCompleted ? 'bg-emerald-500/50' : 'bg-emerald-500/20'} ${isLeft ? '-right-8' : '-left-8'}`}></div>

                                      <div className="flex justify-between items-start mb-2">
                                          <span className={`text-xs font-mono font-bold uppercase tracking-wider ${isCompleted ? 'text-emerald-300' : 'text-emerald-500/60'}`}>
                                              {new Date(milestone.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                          </span>
                                          
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); onDelete(milestone.id); }}
                                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs transition-opacity"
                                          >
                                              Delete
                                          </button>
                                      </div>

                                      <h3 className={`text-xl font-bold mb-2 ${isCompleted ? 'text-white decoration-emerald-500' : 'text-emerald-50'}`}>
                                          {milestone.title} 
                                          {isCompleted && <span className="ml-2 text-emerald-400">✓</span>}
                                      </h3>
                                      
                                      {milestone.description && (
                                          <p className="text-sm text-emerald-200/60 leading-relaxed">{milestone.description}</p>
                                      )}

                                      <div className="mt-4 pt-3 border-t border-emerald-500/10 flex justify-end">
                                          <span className={`text-xs px-2 py-1 rounded-full border ${isCompleted ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10' : 'border-emerald-500/20 text-emerald-500/50'}`}>
                                              {isCompleted ? 'Achieved' : 'In Progress'}
                                          </span>
                                      </div>
                                  </div>
                              </div>

                          </div>
                      );
                  })}
              </div>
          </div>
      )}
    </div>
  );
};

export default Timeline;
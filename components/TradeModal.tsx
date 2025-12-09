import React, { useState } from 'react';
import { Priority } from '../types';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'TODO' | 'HABIT' | 'EXPENSE' | 'NON_NEGOTIABLE' | 'GOAL' | 'MILESTONE';
  onSubmit: (data: any) => void;
}

const ActionModal: React.FC<ActionModalProps> = ({ isOpen, onClose, type, onSubmit }) => {
  const [formData, setFormData] = useState<any>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = crypto.randomUUID();
    
    // Process based on type
    if (type === 'GOAL') {
        onSubmit(formData); // { main: '...', weekly: '...' }
    } else {
        const data = { ...formData, id };
        if (type === 'TODO') {
            data.date = data.date || new Date().toISOString().split('T')[0];
            data.completed = false;
            // Ensure priority is set, default to MEDIUM if not selected
            data.priority = data.priority || 'MEDIUM';
        } else if (type === 'HABIT') {
            data.logs = {};
        } else if (type === 'EXPENSE') {
            data.date = data.date || new Date().toISOString().split('T')[0];
            data.amount = Number(data.amount);
        } else if (type === 'MILESTONE') {
            data.completed = false;
        }
        onSubmit(data);
    }
    
    onClose();
    setFormData({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-emerald-500/30 shadow-2xl animate-fade-in-up">
        <h2 className="text-2xl font-bold text-emerald-50 mb-6">
            {type === 'TODO' && 'Add New Task'}
            {type === 'HABIT' && 'Add Daily Habit'}
            {type === 'NON_NEGOTIABLE' && 'Add Non-Negotiable'}
            {type === 'EXPENSE' && 'Log Expense'}
            {type === 'GOAL' && 'Update Goals'}
            {type === 'MILESTONE' && 'Add Life Milestone'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* GOAL FORM */}
            {type === 'GOAL' ? (
                <>
                    <div>
                        <label className="block text-sm font-medium text-emerald-400 mb-1">Main Vision / Goal</label>
                        <input name="main" onChange={handleChange} placeholder="e.g. Financial Freedom" className="w-full bg-black/30 border border-emerald-500/20 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-emerald-400 mb-1">Weekly Goal</label>
                        <input name="weekly" onChange={handleChange} placeholder="e.g. Save $500" className="w-full bg-black/30 border border-emerald-500/20 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required />
                    </div>
                </>
            ) : (
                /* STANDARD FORMS */
                <>
                    <div>
                        <label className="block text-sm font-medium text-emerald-400 mb-1">
                            {type === 'EXPENSE' ? 'Description' : (type === 'MILESTONE' ? 'Milestone Title' : 'Title / Name')}
                        </label>
                        <input 
                            name={type === 'HABIT' || type === 'NON_NEGOTIABLE' ? 'name' : (type === 'EXPENSE' ? 'description' : 'title')}
                            onChange={handleChange}
                            className="w-full bg-black/30 border border-emerald-500/20 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            required
                            autoFocus
                        />
                    </div>

                    {/* TODO Specifics */}
                    {type === 'TODO' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-emerald-400 mb-1">Date</label>
                                    <input type="date" name="date" onChange={handleChange} defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-black/30 border border-emerald-500/20 rounded-lg p-3 text-white outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-emerald-400 mb-1">Priority</label>
                                    <select name="priority" onChange={handleChange} className="w-full bg-black/30 border border-emerald-500/20 rounded-lg p-3 text-white outline-none">
                                        <option value="MEDIUM">Medium</option>
                                        <option value="TOP">TOP PRIORITY 🚨</option>
                                        <option value="HIGH">High</option>
                                        <option value="LOW">Low</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {/* EXPENSE Specifics */}
                    {type === 'EXPENSE' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-emerald-400 mb-1">Amount ($)</label>
                                    <input type="number" name="amount" step="0.01" onChange={handleChange} className="w-full bg-black/30 border border-emerald-500/20 rounded-lg p-3 text-white outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-emerald-400 mb-1">Category</label>
                                    <select name="category" onChange={handleChange} className="w-full bg-black/30 border border-emerald-500/20 rounded-lg p-3 text-white outline-none">
                                        <option value="Food">Food</option>
                                        <option value="Transport">Transport</option>
                                        <option value="Shopping">Shopping</option>
                                        <option value="Bills">Bills</option>
                                        <option value="Entertainment">Entertainment</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-emerald-400 mb-1">Date</label>
                                <input type="date" name="date" onChange={handleChange} defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-black/30 border border-emerald-500/20 rounded-lg p-3 text-white outline-none" />
                            </div>
                        </>
                    )}
                    
                    {/* MILESTONE Specifics */}
                    {type === 'MILESTONE' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-emerald-400 mb-1">Target Date</label>
                                <input type="date" name="date" onChange={handleChange} className="w-full bg-black/30 border border-emerald-500/20 rounded-lg p-3 text-white outline-none" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-emerald-400 mb-1">Details / Plans</label>
                                <textarea name="description" onChange={handleChange} rows={3} className="w-full bg-black/30 border border-emerald-500/20 rounded-lg p-3 text-white outline-none resize-none" placeholder="How will you achieve this?" />
                            </div>
                        </>
                    )}
                </>
            )}

            <div className="flex gap-3 mt-6">
                <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-emerald-500/20 text-emerald-200 hover:bg-emerald-900/30 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-600/20 hover:scale-[1.02] transition-all">Save</button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ActionModal;
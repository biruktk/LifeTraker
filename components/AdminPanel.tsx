import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storage';
import { AppData } from '../types';
import { supabase } from '../services/supabaseClient';

interface AdminPanelProps {
  currentUserEmail: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUserEmail }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [jsonEditorContent, setJsonEditorContent] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
        const data = await StorageService.getAllUsersData();
        setUsers(data || []);
        setError('');
    } catch (err: any) {
        console.error(err);
        if (err.message && err.message.includes('policy')) {
             setError("⚠️ ACCESS DENIED: RLS Policy detected.\nTo use this Admin Panel, you must run this SQL in Supabase SQL Editor:\n\nCREATE POLICY \"Enable all for authenticated\" ON \"public\".\"user_data\" AS PERMISSIVE FOR ALL TO authenticated USING (true);");
        } else {
             setError("Failed to fetch users. " + err.message);
        }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (id: string, name: string) => {
      if (window.confirm(`⚠️ DANGER: Are you sure you want to DELETE data for "${name}"?\n\nThis will remove their tasks, journal, etc. from the database.\n(It does NOT delete their Auth account - do that in Supabase Dashboard)`)) {
          try {
              await StorageService.adminDeleteUserData(id);
              setUsers(users.filter(u => u.id !== id));
          } catch (e: any) {
              alert("Delete failed: " + e.message);
          }
      }
  };

  const handleEditClick = (user: any) => {
      setEditingId(user.id);
      setJsonEditorContent(JSON.stringify(user.content, null, 2));
  };

  const handleSaveEdit = async () => {
      if (!editingId) return;
      try {
          const parsed = JSON.parse(jsonEditorContent);
          await StorageService.adminUpdateUserData(editingId, parsed);
          setEditingId(null);
          fetchUsers(); // Refresh
      } catch (e: any) {
          alert("Save failed. Invalid JSON? " + e.message);
      }
  };

  return (
    <div className="min-h-screen p-8 animate-fade-in pb-24">
        <div className="max-w-6xl mx-auto space-y-6">
            
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-red-400">⚡ Admin Panel</h1>
                    <p className="text-emerald-400/60">Managing App Data ({users.length} Records)</p>
                </div>
                <button onClick={fetchUsers} className="bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 px-4 py-2 rounded-xl">🔄 Refresh</button>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl text-red-200 whitespace-pre-wrap font-mono text-xs">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 text-emerald-500 animate-pulse">Loading database records...</div>
            ) : (
                <div className="grid gap-4">
                    {users.map(u => {
                        const content = u.content as AppData;
                        const userName = content?.user?.name || 'Unknown';
                        const isMe = currentUserEmail && currentUserEmail.toLowerCase().includes(userName.toLowerCase()); // Rough check

                        return (
                            <div key={u.id} className="glass-card p-4 rounded-xl border border-emerald-500/20 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                <div className="w-12 h-12 rounded-full bg-emerald-900 flex items-center justify-center font-bold text-emerald-300 shrink-0">
                                    {userName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-emerald-100 flex items-center gap-2">
                                        {userName}
                                        <span className="text-[10px] font-mono opacity-50 bg-black/30 px-1 rounded">{u.id}</span>
                                    </h3>
                                    <p className="text-xs text-emerald-400/60 truncate">
                                        Updated: {new Date(u.updated_at).toLocaleString()} | Tasks: {content?.todos?.length || 0}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleEditClick(u)}
                                        className="px-4 py-2 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all text-sm font-bold"
                                    >
                                        JSON Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteUser(u.id, userName)}
                                        className="px-4 py-2 rounded-lg bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600 hover:text-white transition-all text-sm font-bold"
                                    >
                                        Delete Data
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>

        {/* JSON Editor Modal */}
        {editingId && (
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                <div className="w-full max-w-4xl h-[80vh] bg-emerald-950 border border-emerald-500/30 rounded-2xl flex flex-col p-4 shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-white">Editing User Data</h3>
                        <button onClick={() => setEditingId(null)} className="text-emerald-400 hover:text-white">✕</button>
                    </div>
                    <textarea 
                        value={jsonEditorContent} 
                        onChange={(e) => setJsonEditorContent(e.target.value)} 
                        className="flex-1 bg-black/30 text-emerald-300 font-mono text-xs p-4 rounded-xl border border-emerald-500/10 outline-none resize-none"
                    />
                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => setEditingId(null)} className="px-6 py-2 rounded-lg text-emerald-400 hover:bg-emerald-900/50">Cancel</button>
                        <button onClick={handleSaveEdit} className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg">Save Changes</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminPanel;
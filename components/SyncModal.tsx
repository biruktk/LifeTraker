import React, { useRef, useState } from 'react';
import { StorageService } from '../services/storage';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, onRefresh }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ type: 'success'|'error', text: string } | null>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    StorageService.exportDatabase();
    setMsg({ type: 'success', text: 'Database downloaded! You can now upload this file to another browser to restore your data.' });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        await StorageService.importDatabase(file);
        setMsg({ type: 'success', text: 'Database restored successfully! Refreshing...' });
        setTimeout(() => {
            onRefresh();
            onClose();
        }, 1500);
    } catch (err) {
        setMsg({ type: 'error', text: 'Invalid database file. Please select a valid db.json.' });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
        <div className="glass-card w-full max-w-lg p-8 rounded-3xl border border-emerald-500/30 shadow-2xl relative">
            
            <button onClick={onClose} className="absolute top-4 right-4 text-emerald-500/50 hover:text-white">✕</button>

            <div className="text-center mb-8">
                <span className="text-4xl mb-2 block">💾</span>
                <h2 className="text-2xl font-bold text-white mb-2">Database Manager</h2>
                <p className="text-emerald-400/60 text-sm">
                    Since this is a secure, private app without a central tracking server, 
                    your data lives on this device.
                </p>
            </div>

            <div className="space-y-4">
                <div className="bg-emerald-900/30 p-4 rounded-xl border border-emerald-500/20 text-center">
                    <p className="text-emerald-100 font-bold mb-1">To Sync with Firefox / Mobile:</p>
                    <ol className="text-xs text-emerald-400/70 text-left list-decimal pl-8 space-y-1">
                        <li>Click <strong>Export Database</strong> below to save your <code>db.json</code>.</li>
                        <li>Send that file to your other device (Email, USB, Drive).</li>
                        <li>Open this app on the new device and click <strong>Import Database</strong>.</li>
                    </ol>
                </div>

                <button 
                    onClick={handleExport}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-600/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                    <span>⬇️</span> Export Database (db.json)
                </button>

                <button 
                    onClick={handleImportClick}
                    className="w-full py-4 rounded-xl bg-black/40 border border-emerald-500/30 text-emerald-300 font-bold hover:bg-emerald-900/40 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                    <span>⬆️</span> Import Database
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept=".json" 
                />
            </div>

            {msg && (
                <div className={`mt-6 p-3 rounded-lg text-center text-sm font-bold ${msg.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {msg.text}
                </div>
            )}

            <div className="mt-8 text-center">
                <p className="text-[10px] text-emerald-500/30 uppercase tracking-widest">Local Storage v2.0</p>
            </div>
        </div>
    </div>
  );
};

export default SyncModal;
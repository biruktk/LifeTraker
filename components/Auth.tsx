import React, { useState } from 'react';
import { StorageService } from '../services/storage';

interface AuthProps {
  onLogin: () => void; // No arguments needed, App handles session state
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);

    try {
        if (isLogin) {
            await StorageService.login(formData.email, formData.password);
            onLogin();
        } else {
            // Sign Up
            if (!formData.name) {
                setError("Name is required");
                setLoading(false);
                return;
            }
            try {
                await StorageService.signUp(formData.email, formData.password, formData.name);
                setMsg("Account created! You have been logged in automatically.");
                onLogin();
            } catch (signUpErr: any) {
                if (signUpErr.message && signUpErr.message.includes("already registered")) {
                    setError("⚠️ This email is already registered in Supabase Auth. Please switch to 'Log In'.");
                    // Optional: automatically switch to login view
                    // setIsLogin(true);
                } else {
                    throw signUpErr;
                }
            }
        }
    } catch (err: any) {
        console.error(err);
        if (err.message === "Invalid login credentials") {
            setError("❌ Wrong email or password. If you deleted your user in the database, you might still exist in Auth. Try resetting password or check Supabase Dashboard.");
        } else {
            setError(err.message || "Authentication failed");
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-emerald-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900 to-emerald-950">
      <div className="glass-card w-full max-w-md p-8 rounded-3xl border border-emerald-500/20 shadow-2xl animate-fade-in relative overflow-hidden">
        
        <div className="text-center mb-8 mt-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">Life Tracker</h1>
            <p className="text-emerald-400/60">Productivity OS</p>
        </div>

        <div className="flex bg-black/30 p-1 rounded-xl mb-6">
            <button 
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isLogin ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-400/50 hover:text-white'}`}
            >
                Log In
            </button>
            <button 
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isLogin ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-400/50 hover:text-white'}`}
            >
                Sign Up
            </button>
        </div>

        <h2 className="text-xl font-bold text-white mb-6 text-center">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
        {msg && <div className="mb-4 p-3 bg-green-500/20 text-green-300 rounded-lg text-sm text-center font-bold">{msg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
                <div>
                    <label className="block text-xs font-bold text-emerald-500 mb-1 uppercase tracking-wider">Name</label>
                    <input 
                        name="name" 
                        onChange={handleChange} 
                        className="w-full bg-black/30 border border-emerald-500/20 rounded-xl p-3 text-white outline-none focus:border-emerald-500 transition-all placeholder-emerald-500/20" 
                        placeholder="John Doe" 
                    />
                </div>
            )}
            <div>
                <label className="block text-xs font-bold text-emerald-500 mb-1 uppercase tracking-wider">Email</label>
                <input 
                    name="email" 
                    type="email" 
                    onChange={handleChange} 
                    className="w-full bg-black/30 border border-emerald-500/20 rounded-xl p-3 text-white outline-none focus:border-emerald-500 transition-all placeholder-emerald-500/20" 
                    placeholder="john@example.com" 
                    required 
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-emerald-500 mb-1 uppercase tracking-wider">Password</label>
                <input 
                    name="password" 
                    type="password" 
                    onChange={handleChange} 
                    className="w-full bg-black/30 border border-emerald-500/20 rounded-xl p-3 text-white outline-none focus:border-emerald-500 transition-all placeholder-emerald-500/20" 
                    placeholder="••••••••" 
                    required 
                />
            </div>

            {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20 whitespace-pre-wrap">{error}</p>}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-600/20 hover:scale-[1.02] transition-all mt-4 disabled:opacity-50"
            >
                {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
            </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-emerald-500/30">
            <p>Admin? Log in with admin credentials to access panel.</p>
        </div>

      </div>
    </div>
  );
};

export default Auth;
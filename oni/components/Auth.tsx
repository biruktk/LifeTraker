import React, { useState } from 'react';
import { StorageService } from '../services/storage';

interface AuthProps {
  onLogin: (user: { id: string; name: string; email: string }) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
        if (isLogin) {
            const user = StorageService.loginUser(formData.email, formData.password);
            if (user) {
                onLogin(user);
            } else {
                setError('Invalid email or password.');
            }
        } else {
            if (!formData.name || !formData.email || !formData.password) {
                setError('All fields are required');
                return;
            }
            
            const newUser = { 
                id: crypto.randomUUID(), 
                name: formData.name, 
                email: formData.email, 
                password: formData.password 
            };
            
            StorageService.addUser(newUser);
            StorageService.loginUser(formData.email, formData.password);
            onLogin(newUser);
        }
    } catch (err: any) {
        setError(err.message || "An error occurred");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-emerald-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900 to-emerald-950">
      <div className="glass-card w-full max-w-md p-8 rounded-3xl border border-emerald-500/20 shadow-2xl animate-fade-in relative overflow-hidden">
        
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">Life Tracker</h1>
            <p className="text-emerald-400/60">Productivity Operating System</p>
            <p className="text-[10px] text-emerald-500/30 mt-2">v2.0 • Local Database Active</p>
        </div>

        <h2 className="text-xl font-bold text-white mb-6 text-center">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
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

            {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</p>}

            <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-600/20 hover:scale-[1.02] transition-all mt-4">
                {isLogin ? 'Log In' : 'Sign Up'}
            </button>
        </form>

        <div className="mt-6 text-center">
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-sm text-emerald-400 hover:text-white transition-colors">
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
        </div>

      </div>
    </div>
  );
};

export default Auth;
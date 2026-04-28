import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Mail, Lock, User as UserIcon, ArrowRight, Chrome, Eye, EyeOff, Sun, Moon } from 'lucide-react';

interface LoginProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Login: React.FC<LoginProps> = ({ theme, toggleTheme }) => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignup) {
        await registerWithEmail(formData.email, formData.password, formData.name);
      } else {
        await loginWithEmail(formData.email, formData.password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 relative">
      <button 
        onClick={toggleTheme}
        className="fixed top-8 right-8 w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-2 border-zinc-900 dark:border-zinc-800 shadow-xl hover:scale-110 active:scale-95 transition-all z-50"
      >
        <AnimatePresence mode="wait">
          {theme === 'light' ? (
            <motion.div key="moon" initial={{ scale: 0, rotate: 90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: -90 }}>
              <Moon size={20} />
            </motion.div>
          ) : (
            <motion.div key="sun" initial={{ scale: 0, rotate: 90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: -90 }}>
              <Sun size={20} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-12 group hover:rotate-0 transition-transform duration-500">
            <Zap size={32} fill="currentColor" />
          </div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none mb-3 dark:text-white">
            Quick<span className="text-orange-600">Bite</span>
          </h1>
          <p className="text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase italic">Your gateway to instant gratification</p>
        </div>

        <motion.div 
          layout
          className="bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-zinc-800 rounded-[2.5rem] p-10 shadow-xl"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-2 dark:text-white">
              {isSignup ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-[10px] font-black tracking-[0.2em] text-zinc-400 uppercase">
              {isSignup ? 'Join the elite craving network' : 'Enter your credentials to proceed'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {isSignup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-[9px] font-black tracking-[0.2em] text-zinc-400 uppercase mb-2 block ml-4">Full Identity</label>
                  <div className="relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center transition-colors">
                      <UserIcon className="text-zinc-400 group-focus-within:text-orange-600 transition-colors" size={18} />
                    </div>
                    <input 
                      id="signup-name"
                      type="text" 
                      required
                      placeholder="John Doe"
                      className="w-full pl-14 pr-6 bg-[var(--input-bg)] border border-zinc-100 dark:border-zinc-800 font-bold text-lg py-5 rounded-2xl focus:ring-4 focus:ring-orange-500/10 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-[9px] font-black tracking-[0.2em] text-zinc-400 uppercase mb-2 block ml-4">Comm Interface</label>
              <div className="relative group">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center transition-colors">
                  <Mail className="text-zinc-400 group-focus-within:text-orange-600 transition-colors" size={18} />
                </div>
                <input 
                  id="login-email"
                  type="email" 
                  required
                  placeholder="name@nexus.com"
                  className="w-full pl-14 pr-6 bg-[var(--input-bg)] border border-zinc-100 dark:border-zinc-800 font-bold text-lg py-5 rounded-2xl focus:ring-4 focus:ring-orange-500/10 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black tracking-[0.2em] text-zinc-400 uppercase mb-2 block ml-4">Security Key</label>
              <div className="relative group">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center transition-colors">
                  <Lock className="text-zinc-400 group-focus-within:text-orange-600 transition-colors" size={18} />
                </div>
                <input 
                  id="login-password"
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="••••••••"
                  className="w-full pl-14 pr-16 bg-[var(--input-bg)] border border-zinc-100 dark:border-zinc-800 font-bold text-lg py-5 rounded-2xl focus:ring-4 focus:ring-orange-500/10 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-600 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl py-5 font-black italic text-lg tracking-tighter flex items-center justify-center gap-3 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all active:scale-[0.98] shadow-xl shadow-zinc-100 dark:shadow-none"
            >
              {loading ? 'SYNCING...' : isSignup ? 'CREATE ACCOUNT' : 'LOGIN'}
              <ArrowRight size={20} />
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsSignup(!isSignup)}
              className="group transition-transform active:scale-95"
            >
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {isSignup ? 'Already have an account? ' : "Don't have an account? "}
                <span className="text-sm font-black text-orange-600 uppercase italic tracking-wider group-hover:underline transition-all">
                  {isSignup ? 'Login here' : 'Sign up here'}
                </span>
              </p>
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 flex-1" />
            <span className="text-[9px] font-black text-zinc-300 dark:text-zinc-600 uppercase">OR</span>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 flex-1" />
          </div>

          <button 
            onClick={loginWithGoogle}
            className="w-full mt-6 bg-white dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-2xl py-4 font-black text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all active:scale-95"
          >
            <Chrome size={18} className="text-orange-600" />
            GOOGLE WITH LOGIN
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;

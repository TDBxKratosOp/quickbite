import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Zap, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ theme, toggleTheme }) => {
  const { user, profile, logout, loginWithGoogle } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-3xl border-b border-zinc-100 dark:border-zinc-800 px-6 py-2.5 transition-colors duration-300">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform shadow-md">
            <Zap size={16} fill="currentColor" />
          </div>
          <span className="text-xl font-black italic tracking-tighter uppercase leading-none dark:text-white">
            Quick<span className="text-orange-600">Bite</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center space-x-6 uppercase italic">
          <Link to="/" className={`text-[9px] font-black tracking-[0.2em] transition-all hover:text-orange-600 ${isActive('/') ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-zinc-100 pb-0.5' : 'text-zinc-400'}`}>
            Restaurants
          </Link>
          <Link to="/orders" className={`text-[9px] font-black tracking-[0.2em] transition-all hover:text-orange-600 ${isActive('/orders') ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-zinc-100 pb-0.5' : 'text-zinc-400'}`}>
            Orders
          </Link>
          {profile?.isAdmin && (
            <Link to="/admin" className={`text-[9px] font-black tracking-[0.2em] transition-all hover:text-orange-600 flex items-center gap-1 ${isActive('/admin') ? 'text-orange-600 dark:text-orange-500 border-b-2 border-orange-600 dark:border-orange-500 pb-0.5' : 'text-zinc-400'}`}>
              <span className="w-1 h-1 bg-orange-600 rounded-full animate-pulse" />
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 transition-all shadow-sm"
          >
            <AnimatePresence mode="wait">
              {theme === 'light' ? (
                <motion.div
                  key="moon"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon size={16} />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun size={16} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          <Link to="/cart" className="relative group text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-1.5 rounded-lg group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900 transition-all">
              <ShoppingCart size={16} />
            </div>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full font-black border-2 border-white dark:border-zinc-950 shadow-sm">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center space-x-3">
              <Link to="/profile" className="flex items-center space-x-2 bg-zinc-100 dark:bg-zinc-900 p-1 pr-3 rounded-xl border border-transparent hover:border-zinc-900 dark:hover:border-white transition-all">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full flex items-center justify-center font-black text-[10px]">
                    {profile?.name?.[0] || <User size={12} />}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <p className="text-[10px] font-black tracking-tighter uppercase dark:text-white">{profile?.name || 'User'}</p>
                </div>
              </Link>
              <button 
                onClick={() => { logout(); navigate('/'); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-sm"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button 
              onClick={loginWithGoogle}
              className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black text-[9px] tracking-[0.2em] italic uppercase hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow shadow-zinc-300 dark:shadow-none"
            >
              LOG IN
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

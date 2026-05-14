import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import RestaurantDetail from './pages/RestaurantDetail';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Admin from './pages/Admin';
import RestaurantDashboard from './pages/RestaurantDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AnimatePresence } from 'motion/react';
import PageTransition from './components/PageTransition';

const RoutesWithTransition = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/restaurant/:id" element={<PageTransition><RestaurantDetail /></PageTransition>} />
        <Route path="/cart" element={<PageTransition><Cart /></PageTransition>} />
        <Route path="/orders" element={<PageTransition><Orders /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
        <Route path="/restaurant-dashboard" element={<PageTransition><RestaurantDashboard /></PageTransition>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-zinc-900 dark:bg-white rounded-2xl mb-4" />
          <div className="h-4 bg-zinc-100 dark:bg-zinc-900 w-32 rounded" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login theme={theme} toggleTheme={toggleTheme} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white transition-colors duration-300">
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <main className="pt-16 pb-12">
        <RoutesWithTransition />
      </main>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}
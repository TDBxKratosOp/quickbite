import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, 
  Utensils, 
  ShoppingBag, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Power,
  Image as ImageIcon,
  Phone,
  MapPin,
  Search,
  Filter,
  MoreVertical,
  X,
  TrendingUp,
  DollarSign,
  AlertCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { restaurantService, menuService, orderService, appealService } from '../services/firebaseService';
import { Restaurant, MenuItem, Order, Appeal } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';

const RestaurantDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'restaurant' | 'menu' | 'orders'>('restaurant');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderUnsub, setOrderUnsub] = useState<(() => void) | null>(null);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [assigningDeliveryId, setAssigningDeliveryId] = useState<string | null>(null);
  const [deliveryBoyDetails, setDeliveryBoyDetails] = useState({ name: '', phone: '' });

  // Appeal states
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [existingAppeals, setExistingAppeals] = useState<Appeal[]>([]);

  const REJECTION_REASONS = ['Out of stock', 'Too busy', 'Closing soon', 'Technical issue'];

  // Stats calculation
  const totalOrders = orders.length;
  const todayRevenue = orders
    .filter(o => {
      const orderDate = new Date((o.createdAt?.seconds || 0) * 1000);
      const isToday = orderDate.toDateString() === new Date().toDateString();
      return isToday && o.status !== 'cancelled';
    })
    .reduce((sum, o) => sum + o.total, 0);
  const pendingOrdersCount = orders.filter(o => ['confirmed', 'preparing'].includes(o.status)).length;
  
  // Item-wise revenue
  const revenueByItem = orders.reduce((acc, order) => {
    if (order.status === 'cancelled') return acc;
    order.items.forEach(item => {
      acc[item.id] = (acc[item.id] || 0) + (item.price * item.quantity);
    });
    return acc;
  }, {} as Record<string, number>);

  // Form states
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemFormData, setItemFormData] = useState<Omit<MenuItem, 'id'>>({
    name: '',
    description: '',
    price: 0,
    image: '',
    isVeg: true,
    isAvailable: true
  });

  const [restaurantFormData, setRestaurantFormData] = useState<Omit<Restaurant, 'id'>>({
    name: '',
    cuisines: [],
    rating: 0,
    deliveryTime: 30,
    image: '',
    isPureVeg: false,
    ownerId: user?.uid || '',
    isActive: true,
    address: '',
    phone: ''
  });

  const [newCuisine, setNewCuisine] = useState('');

  const [menuUnsub, setMenuUnsub] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (profile && !profile.isRestaurantOwner) {
      navigate('/');
      return;
    }
    if (user) {
      loadData();
    }
    return () => {
      orderUnsub?.();
      menuUnsub?.();
    };
  }, [user, profile]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await restaurantService.getRestaurantByOwner(user.uid);
      setRestaurant(res);
      if (res) {
        setRestaurantFormData({
          name: res.name,
          cuisines: res.cuisines,
          rating: res.rating,
          deliveryTime: res.deliveryTime,
          image: res.image,
          isPureVeg: res.isPureVeg || false,
          ownerId: res.ownerId,
          isActive: res.isActive,
          address: res.address || '',
          phone: res.phone || ''
        });
        
        // Load appeals once
        const appealsData = await appealService.getAppealsByRestaurant(res.id, user.uid);
        setExistingAppeals(appealsData || []);
        
        // Real-time subscription for menu items
        if (menuUnsub) menuUnsub();
        const mUnsub = menuService.subscribeToMenuItems(res.id, (data) => {
          setMenuItems(data);
        });
        setMenuUnsub(() => mUnsub);
        
        // Real-time subscription for orders
        if (orderUnsub) orderUnsub();
        const unsub = orderService.subscribeToRestaurantOrders(res.id, (data) => {
          setOrders(data);
        });
        setOrderUnsub(() => unsub);
      }
    } catch (error) {
      console.error("Dashboard load failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const [creationSuccess, setCreationSuccess] = useState(false);

  const isRestaurantFormValid = 
    restaurantFormData.name.trim().length > 0 && 
    restaurantFormData.address.trim().length > 0 && 
    restaurantFormData.phone.length === 10 &&
    restaurantFormData.cuisines.length > 0 &&
    restaurantFormData.image !== '';

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteRestaurant = async () => {
    if (!restaurant) {
      console.warn("Delete aborted: No restaurant beacon found in operational state.");
      return;
    }
    try {
      console.log("INITIALIZING BEACON TERMINATION PROTOCOL...", restaurant.id);
      setLoading(true);
      await restaurantService.deleteRestaurant(restaurant.id);
      console.log("TERMINATION SIGNAL COMMITTED. REDIRECTING TO CORE.");
      window.location.href = '/'; 
    } catch (error) {
      console.error("CRITICAL FAILURE DURING TERMINATION:", error);
      alert(`TERMINATION FAILED: ${error instanceof Error ? error.message : 'Unknown Protocol Error'}`);
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRestaurantFormValid && !restaurant) return;
    try {
      if (restaurant) {
        await restaurantService.updateRestaurant(restaurant.id, restaurantFormData);
      } else {
        await restaurantService.createRestaurant({
          ...restaurantFormData,
          ownerId: user?.uid || '',
          isActive: true
        });
        setCreationSuccess(true);
      }
      // loadData(); // Redundant with real-time subscriptions
    } catch (error) {
      console.error("Restaurant save failed:", error);
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    try {
      if (editingItem) {
        await menuService.updateMenuItem(restaurant.id, editingItem.id, itemFormData);
      } else {
        await menuService.addMenuItem(restaurant.id, itemFormData);
      }
      setShowItemModal(false);
      setEditingItem(null);
      setItemFormData({
        name: '',
        description: '',
        price: 0,
        image: '',
        isVeg: true,
        isAvailable: true
      });
      // loadData(); // Redundant
    } catch (error) {
      console.error("Item save failed:", error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!restaurant) return;
    try {
      await menuService.deleteMenuItem(restaurant.id, itemId);
      // loadData(); // Redundant
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const toggleItemAvailability = async (itemId: string, current: boolean) => {
    if (!restaurant) return;
    try {
      await menuService.toggleItemAvailability(restaurant.id, itemId, !current);
      setMenuItems(prev => prev.map(item => item.id === itemId ? { ...item, isAvailable: !current } : item));
    } catch (error) {
      console.error("Toggle failed:", error);
    }
  };

  const toggleRestaurantActive = async () => {
    if (!restaurant) return;
    const originalState = restaurant.isActive;
    const newState = !originalState;
    
    // Optimistic Update: Immediate UI feedback
    setRestaurant({ ...restaurant, isActive: newState });

    try {
      await restaurantService.toggleRestaurantStatus(restaurant.id, newState);
    } catch (error) {
      console.error("Toggle restaurant failed:", error);
      // Revert if server fails
      setRestaurant({ ...restaurant, isActive: originalState });
    }
  };

  const handleStatusUpdate = async (orderId: string, status: Order['status'], name?: string, phone?: string) => {
    try {
      await orderService.updateOrderStatus(orderId, status, undefined, name, phone);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, deliveryBoyName: name, deliveryBoyPhone: phone } : o));
      setAssigningDeliveryId(null);
      setDeliveryBoyDetails({ name: '', phone: '' });
    } catch (error) {
      console.error("Status update failed:", error);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    if (!rejectReason) return;
    try {
      await orderService.updateOrderStatus(orderId, 'cancelled', rejectReason);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled', rejectionReason: rejectReason } : o));
      setRejectingOrderId(null);
      setRejectReason('');
    } catch (error) {
      console.error("Rejection failed:", error);
    }
  };

  const hasPendingAppeal = existingAppeals.some(a => a.status === 'pending');

  const handleSubmitAppeal = async (type: 'suspension' | 'deletion') => {
    if (!appealReason || !restaurant || !user || hasPendingAppeal) return;
    setIsSubmittingAppeal(true);
    try {
      await appealService.submitAppeal({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        ownerId: user.uid,
        ownerEmail: user.email || '',
        reason: appealReason,
        type: type,
      });
      setAppealSubmitted(true);
      setAppealReason('');
      
      // Refresh appeals
      const updatedAppeals = await appealService.getAppealsByRestaurant(restaurant.id, user.uid);
      if (updatedAppeals) setExistingAppeals(updatedAppeals);

      setTimeout(() => {
        setShowAppealModal(false);
        setAppealSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Appeal failed:", error);
      alert("SIGNAL INTERRUPTED: Unified Command rejected the appeal transmission. Please check your credentials.");
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  if (!profile?.isRestaurantOwner) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-20 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[1.25rem] flex items-center justify-center shadow-xl rotate-6">
                <Store size={24} />
              </div>
              <div>
                <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none dark:text-white">
                  Owner <span className="text-orange-600">Portal</span>
                </h1>
                <p className="text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase italic">Control Center Alpha</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {restaurant && (
              <Link 
                to={`/restaurant/${restaurant.id}`}
                className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white p-4 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 shadow-sm hover:border-orange-600 transition-all group"
              >
                <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase">
                  <span>View Public Page</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            )}
            <div className="flex bg-white dark:bg-zinc-900 p-1.5 rounded-[1.5rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-sm overflow-x-auto scrollbar-hide">
              {[
                { id: 'restaurant', label: 'My Restaurant', icon: Store },
                { id: 'menu', label: 'My Menu', icon: Utensils },
                { id: 'orders', label: 'Incoming Orders', icon: ShoppingBag, badge: orders.filter(o => ['confirmed', 'preparing'].includes(o.status)).length, live: true }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap ${
                    activeTab === tab.id 
                    ? 'bg-orange-600 text-white shadow-lg' 
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                  }`}
                >
                  <tab.icon size={16} />
                  <span className="flex items-center gap-2">
                    {tab.label}
                  </span>
                  {tab.badge ? (
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] ${activeTab === tab.id ? 'bg-white text-orange-600' : 'bg-orange-600 text-white animate-pulse'}`}>
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* RESTRICTION SCREENS */}
        {restaurant?.isDeleted && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-[3rem] p-12 text-center border-4 border-red-500 shadow-2xl mb-12"
          >
            <div className="w-24 h-24 bg-red-100 dark:bg-red-950/30 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
              <XCircle size={48} />
            </div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-4 text-red-600">RESTAURANT TERMINATED</h2>
            <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto mb-8 leading-relaxed">
              Your restaurant access has been permanently revoked for violating the QuickBite Code of Conduct. You are restricted from participating in the ecosystem.
            </p>
            <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/30 mb-10 max-w-lg mx-auto">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 italic">ADMIN NOTE:</p>
              <p className="text-xs font-bold text-red-700 dark:text-red-400 italic">"Critical violations detected. Access disabled."</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {hasPendingAppeal ? (
                <div className="bg-zinc-800/50 px-10 py-5 rounded-2xl border-2 border-orange-500/30 flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                  <span className="font-black italic uppercase tracking-tighter text-orange-500">Appeal Transmission Under Review</span>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAppealModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-2xl font-black italic tracking-tighter uppercase text-lg shadow-xl shadow-red-600/20 active:scale-95 transition-all outline-none"
                >
                  SUBMIT APPEAL MISSION
                </button>
              )}
              <Link to="/support" className="text-zinc-400 font-bold hover:text-white transition-colors">Contact Operational Command</Link>
            </div>
          </motion.div>
        )}

        {restaurant?.suspendedByAdmin && !restaurant.isDeleted && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-[3rem] p-12 text-center border-4 border-orange-500 shadow-2xl mb-12"
          >
            <div className="w-24 h-24 bg-orange-100 dark:bg-orange-950/30 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <AlertCircle size={48} />
            </div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-4 text-orange-600">SUSPENSION IN EFFECT</h2>
            <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto mb-8 leading-relaxed">
              Your restaurant beacon has been temporarily delisted. QuickBite Command is currently reviewing your operational logs. Regular functions are restricted.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {hasPendingAppeal ? (
                <div className="bg-zinc-800/50 px-10 py-5 rounded-2xl border-2 border-orange-500/30 flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                  <span className="font-black italic uppercase tracking-tighter text-orange-500">Appeal Transmission Under Review</span>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAppealModal(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-5 rounded-2xl font-black italic tracking-tighter uppercase text-lg shadow-xl shadow-orange-600/20 active:scale-95 transition-all"
                >
                  APPEAL SUSPENSION
                </button>
              )}
              <button onClick={() => navigate('/')} className="text-zinc-400 font-bold hover:text-white transition-colors uppercase tracking-widest text-[10px]">Return to Civilian Web</button>
            </div>
          </motion.div>
        )}

        {(!restaurant?.suspendedByAdmin && !restaurant?.isDeleted) ? (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              {[
                { label: 'Total Orders', value: totalOrders, icon: ShoppingBag, color: 'text-blue-500' },
                { label: "Today's Revenue", value: `₹${todayRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-500' },
                { label: 'Pending Orders', value: pendingOrdersCount, icon: Clock, color: 'text-orange-500' }
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center ${stat.color}`}>
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                    <p className="text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white leading-none">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {creationSuccess ? (
                <motion.div
                  key="creation-success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-zinc-900 rounded-[3rem] p-12 text-center border-4 border-orange-500 shadow-2xl mb-12"
                >
                  <div className="w-24 h-24 bg-orange-100 dark:bg-orange-950/30 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
                    <CheckCircle2 size={48} />
                  </div>
                  <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-4 text-orange-600">CONGRATULATIONS!</h2>
                  <p className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase mb-4">You've just joined the QuickBite Elite!</p>
                  <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
                    Your restaurant beacon is now active. Operational command has verified your transmission. You can now begin deploying your menu catalog.
                  </p>
                  <button 
                    onClick={() => setCreationSuccess(false)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-12 py-5 rounded-2xl font-black italic tracking-tighter uppercase text-xl shadow-xl shadow-orange-600/20 active:scale-95 transition-all"
                  >
                    ENTER COMMAND CENTER
                  </button>
                </motion.div>
              ) : activeTab === 'restaurant' && (
                <motion.div
                  key="tab-restaurant"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2">
                <form onSubmit={handleRestaurantSubmit} className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 border-2 border-zinc-100 dark:border-zinc-800 shadow-xl space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-4 md:col-span-2">
                       <label className="flex items-center justify-between text-[10px] font-black tracking-[0.2em] text-zinc-400 capitalize mb-2 ml-4 uppercase">
                         <span>Restaurant Identity</span>
                         {!restaurantFormData.name && <span className="text-red-500 text-[8px] animate-pulse">Required *</span>}
                       </label>
                       <div className="relative group">
                          <input 
                            id="restaurant-name-input"
                            type="text" 
                            required
                            placeholder="Burger King, Pizza Hut etc."
                            className={`w-full px-6 bg-zinc-50 dark:bg-zinc-950 border font-bold text-lg py-5 rounded-2xl focus:ring-4 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700 ${!restaurantFormData.name ? 'border-red-500/20' : 'border-zinc-100 dark:border-zinc-800 focus:ring-orange-500/10'}`}
                            value={restaurantFormData.name}
                            onChange={(e) => setRestaurantFormData({...restaurantFormData, name: e.target.value})}
                          />
                       </div>
                    </div>

                    <div className="md:col-span-2">
                       <ImageUploader 
                          value={restaurantFormData.image}
                          onChange={(b64) => setRestaurantFormData({...restaurantFormData, image: b64})}
                          label="Restaurant Cover Photo (Required)"
                       />
                       {!restaurantFormData.image && <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mt-2 ml-4">Transmitter image required *</p>}
                    </div>

                    <div className="space-y-4">
                       <label className="flex items-center justify-between text-[10px] font-black tracking-[0.2em] text-zinc-400 capitalize mb-2 ml-4 uppercase">
                         <span>Est. Delivery Time (Min)</span>
                         <span className="text-zinc-500 text-[8px]">0-120 MIN</span>
                       </label>
                       <div className="relative group">
                          <input 
                            id="restaurant-time-input"
                            type="number" 
                            required
                            min="0"
                            max="120"
                            className="w-full px-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 font-bold text-lg py-5 rounded-2xl focus:ring-4 focus:ring-orange-500/10 transition-all text-zinc-900 dark:text-white"
                            value={restaurantFormData.deliveryTime}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                const constrained = Math.min(Math.max(val, 0), 120);
                                setRestaurantFormData({...restaurantFormData, deliveryTime: constrained});
                              } else {
                                setRestaurantFormData({...restaurantFormData, deliveryTime: 0});
                              }
                            }}
                          />
                       </div>
                    </div>

                    <div className="space-y-4">
                       <label className="flex items-center justify-between text-[10px] font-black tracking-[0.2em] text-zinc-400 capitalize mb-2 ml-4 uppercase">
                         <span>Comm Phone</span>
                         {restaurantFormData.phone.length !== 10 && <span className="text-red-500 text-[8px] animate-pulse">10 Digits Required *</span>}
                       </label>
                       <div className="relative group">
                          <input 
                            id="restaurant-phone-input"
                            type="tel" 
                            required
                            maxLength={10}
                            placeholder="XXXXXXXXXX"
                            className={`w-full px-6 bg-zinc-50 dark:bg-zinc-950 border font-bold text-lg py-5 rounded-2xl focus:ring-4 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700 ${restaurantFormData.phone.length !== 10 ? 'border-red-500/20' : 'border-zinc-100 dark:border-zinc-800 focus:ring-orange-500/10'}`}
                            value={restaurantFormData.phone}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setRestaurantFormData({...restaurantFormData, phone: val});
                            }}
                          />
                       </div>
                    </div>

                    <div className="space-y-4">
                       <label className="flex items-center justify-between text-[10px] font-black tracking-[0.2em] text-zinc-400 capitalize mb-2 ml-4 uppercase">
                         <span>Full Address</span>
                         {!restaurantFormData.address && <span className="text-red-500 text-[8px] animate-pulse">Required *</span>}
                       </label>
                       <div className="relative group">
                          <input 
                            id="restaurant-address-input"
                            type="text" 
                            required
                            placeholder="Unit 1, Tech Heights, Mumbai"
                            className={`w-full px-6 bg-zinc-50 dark:bg-zinc-950 border font-bold text-xs py-5 rounded-2xl focus:ring-4 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700 ${!restaurantFormData.address ? 'border-red-500/20' : 'border-zinc-100 dark:border-zinc-800 focus:ring-orange-500/10'}`}
                            value={restaurantFormData.address}
                            onChange={(e) => setRestaurantFormData({...restaurantFormData, address: e.target.value})}
                          />
                       </div>
                    </div>

                    <div className="space-y-4 md:col-span-2">
                       <label className="flex items-center justify-between text-[10px] font-black tracking-[0.2em] text-zinc-400 capitalize mb-2 block ml-4 uppercase">
                         <span>Cuisine Specialized</span>
                         {restaurantFormData.cuisines.length === 0 && <span className="text-red-500 text-[8px] animate-pulse">Add At Least One *</span>}
                       </label>
                       <div className="flex flex-wrap gap-2 mb-3">
                         {restaurantFormData.cuisines.map((c, i) => (
                           <span key={i} className="bg-orange-50 dark:bg-orange-950 text-orange-600 px-3 py-1.5 rounded-xl border border-orange-200/50 dark:border-orange-500/20 text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
                             {c}
                             <button type="button" onClick={() => setRestaurantFormData({...restaurantFormData, cuisines: restaurantFormData.cuisines.filter((_, idx) => idx !== i)})} className="hover:text-red-500"><X size={12} /></button>
                           </span>
                         ))}
                       </div>
                       <div className="flex gap-2">
                         <div className="relative group flex-1">
                           <input 
                              id="restaurant-cuisine-input"
                              type="text" 
                              placeholder="Type cuisine (e.g. Italian)..."
                              className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 font-bold text-sm rounded-xl focus:ring-4 focus:ring-orange-500/10 transition-all text-zinc-900 dark:text-white"
                              value={newCuisine}
                              onChange={(e) => setNewCuisine(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = newCuisine.trim();
                                  if (val && !restaurantFormData.cuisines.includes(val)) {
                                    setRestaurantFormData({...restaurantFormData, cuisines: [...restaurantFormData.cuisines, val]});
                                    setNewCuisine('');
                                  }
                                }
                              }}
                            />
                         </div>
                          <button 
                            type="button"
                            onClick={() => {
                              const val = newCuisine.trim();
                              if (val && !restaurantFormData.cuisines.includes(val)) {
                                setRestaurantFormData({...restaurantFormData, cuisines: [...restaurantFormData.cuisines, val]});
                                setNewCuisine('');
                              }
                            }}
                            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-md active:scale-95 transition-all"
                          >
                            ADD
                          </button>
                       </div>
                       <div className="pt-2">
                          <p className="text-[8px] font-black tracking-widest text-zinc-400 uppercase mb-2 ml-2">Quick Add Suggestions:</p>
                          <div className="flex flex-wrap gap-1.5 ml-1">
                            {['Burgers', 'Pizza', 'Indian', 'Chinese', 'Biryani', 'Desserts', 'South Indian', 'Fast Food', 'Italian', 'Healthy'].map(c => (
                              <button 
                                key={c}
                                type="button"
                                onClick={() => {
                                  if (!restaurantFormData.cuisines.includes(c)) {
                                    setRestaurantFormData({...restaurantFormData, cuisines: [...restaurantFormData.cuisines, c]});
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-[8px] font-black tracking-widest uppercase text-zinc-500 hover:border-orange-500/50 hover:text-orange-600 transition-all"
                              >
                                + {c}
                              </button>
                            ))}
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      type="button"
                      onClick={() => setRestaurantFormData({...restaurantFormData, isPureVeg: !restaurantFormData.isPureVeg})}
                      className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all font-black text-[10px] tracking-widest uppercase ${restaurantFormData.isPureVeg ? 'bg-green-600 text-white border-green-600 shadow-lg' : 'bg-transparent text-zinc-400 border-zinc-100 dark:border-zinc-800'}`}
                    >
                      <CheckCircle2 size={16} /> Pure Veg Protocol
                    </button>
                  </div>

                  <button 
                    id="restaurant-submit-btn"
                    type="submit"
                    disabled={!isRestaurantFormValid && !restaurant}
                    className={`w-full rounded-[1.25rem] py-6 font-black italic tracking-tighter text-xl uppercase shadow-xl transition-all active:scale-[0.98] ${isRestaurantFormValid || restaurant ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed border-2 border-dashed border-zinc-300 dark:border-zinc-700'}`}
                  >
                    {restaurant ? 'UPDATE RESTAURANT INTEL' : isRestaurantFormValid ? 'CREATE RESTAURANT BEACON' : 'PROTOCOL INCOMPLETE'}
                  </button>
                </form>
              </div>

              <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black italic tracking-tighter uppercase dark:text-white">Status Control</h3>
                      <p className="text-[9px] font-black tracking-[0.2em] text-zinc-400 uppercase italic">Master Signal Switch</p>
                    </div>
                    <div 
                      onClick={toggleRestaurantActive}
                      className={`w-16 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${restaurant?.isActive ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                    >
                      <motion.div 
                        initial={false}
                        animate={{ x: restaurant?.isActive ? 32 : 0 }}
                        className="w-6 h-6 bg-white rounded-full shadow-lg"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={toggleRestaurantActive}
                    disabled={!restaurant}
                    className={`w-full group relative overflow-hidden rounded-[2rem] p-8 border-2 transition-all duration-300 active:scale-95 ${
                      restaurant?.isActive 
                      ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30 text-emerald-600' 
                      : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-6 relative z-10">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${restaurant?.isActive ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-zinc-200 dark:bg-zinc-900 text-zinc-400'}`}>
                        <Power size={32} className={restaurant?.isActive ? 'animate-pulse' : ''} />
                      </div>
                      <div className="text-left">
                        <p className="font-black italic tracking-tighter text-3xl uppercase leading-none mb-1">{restaurant?.isActive ? 'OPEN' : 'CLOSED'}</p>
                        <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">{restaurant?.isActive ? 'Incoming Signals Active' : 'Beacon Dark - Offline'}</p>
                      </div>
                    </div>
                    {restaurant?.isActive && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 -translate-x-full animate-[shimmer_2s_infinite]"
                      />
                    )}
                  </button>
                </div>

                <div className="bg-zinc-900 dark:bg-white p-8 rounded-[2rem] shadow-xl overflow-hidden relative">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                   <h3 className="text-xl font-black italic tracking-tighter uppercase mb-6 text-white dark:text-zinc-900 relative">Performance</h3>
                   <div className="grid grid-cols-2 gap-4 relative">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Rating</p>
                        <p className="text-4xl font-black italic text-orange-600 tracking-tighter">{restaurant?.rating || 0} ★</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Items</p>
                        <p className="text-4xl font-black italic text-white dark:text-zinc-900 tracking-tighter">{menuItems.length}</p>
                     </div>
                   </div>
                </div>

                <div className="bg-red-50/50 dark:bg-red-950/10 p-8 rounded-[2rem] border-2 border-red-100 dark:border-red-900/30 overflow-hidden relative group">
                   <h3 className="text-xl font-black italic tracking-tighter uppercase mb-2 text-red-600 relative">Danger Zone</h3>
                   <p className="text-[10px] font-black tracking-[0.2em] text-red-400 uppercase italic mb-6">Destructive Protocols</p>
                   
                   {!showDeleteConfirm ? (
                     <button
                       onClick={() => setShowDeleteConfirm(true)}
                       className="w-full py-4 bg-white dark:bg-zinc-900 text-red-600 rounded-2xl font-black italic tracking-tighter uppercase text-sm border-2 border-red-100 dark:border-red-900/30 hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-500/5 active:scale-95"
                     >
                       TERMINATE BEACON PERMANENTLY
                     </button>
                   ) : (
                     <div className="space-y-4">
                       <p className="text-xs font-bold text-red-500 uppercase tracking-tight text-center leading-relaxed">
                         Confirming this action will purge all restaurant data and revoke your ownership credentials. This signal cannot be restored.
                       </p>
                       <div className="flex gap-3">
                         <button
                           onClick={handleDeleteRestaurant}
                           className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black italic tracking-tighter uppercase text-sm shadow-xl shadow-red-600/20 active:scale-95"
                         >
                           EXECUTE PURGE
                         </button>
                         <button
                           onClick={() => setShowDeleteConfirm(false)}
                           className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-2xl font-black italic tracking-tighter uppercase text-sm active:scale-95"
                         >
                           ABORT
                         </button>
                       </div>
                     </div>
                   )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'menu' && (
            <motion.div
              key="tab-menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {!restaurant ? (
                <div className="bg-white dark:bg-zinc-900 p-12 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-4 dark:text-white">Restaurant Setup Required</h3>
                  <p className="text-zinc-500 mb-8 max-w-sm mx-auto font-bold">You need to setup your restaurant identity protocol before adding menu items.</p>
                  <button onClick={() => setActiveTab('restaurant')} className="btn-primary">INITIATE SETUP</button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-4 uppercase italic">
                    <div>
                      <h2 className="text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white">Menu <span className="text-orange-600">Inventory</span></h2>
                      <p className="text-[9px] font-black tracking-[0.2em] text-zinc-400 uppercase italic">{menuItems.length} ITEMS CATALOGUED</p>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingItem(null);
                        setItemFormData({
                          name: '',
                          description: '',
                          price: 0,
                          image: '',
                          isVeg: true,
                          isAvailable: true
                        });
                        setShowItemModal(true);
                      }}
                      className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-4 rounded-[1.25rem] font-black text-xs tracking-widest flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus size={20} /> ADD ITEM
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menuItems.map((item) => (
                      <div key={item.id} className={`bg-white dark:bg-zinc-900 border-2 rounded-[2rem] p-6 group transition-all shadow-sm ${!item.isAvailable ? 'opacity-60 grayscale border-zinc-100 dark:border-zinc-800' : 'border-zinc-100 dark:border-zinc-800 hover:border-orange-600/30'}`}>
                        <div className="relative mb-6">
                          <div className="w-full h-32 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 relative">
                             {item.image ? (
                               <img src={item.image || undefined} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                             ) : (
                               <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-300">
                                 <Utensils size={32} />
                               </div>
                             )}
                             {!item.isAvailable && (
                               <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                                 <span className="bg-white text-black px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase">UNAVAILABLE</span>
                               </div>
                             )}
                          </div>
                          <div className={`absolute -bottom-3 -right-2 px-3 py-1.5 rounded-xl border-2 font-black text-[8px] tracking-widest uppercase shadow-lg ${item.isVeg ? 'bg-green-600 text-white border-green-500' : 'bg-red-600 text-white border-red-500'}`}>
                            {item.isVeg ? 'VEG' : 'NON-VEG'}
                          </div>
                        </div>

                         <div className="mb-6 truncate">
                            <h4 className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white truncate uppercase mb-1">{item.name}</h4>
                            <div className="flex items-center justify-between mb-2">
                               <p className="text-2xl font-black italic tracking-tighter text-orange-600">₹{item.price.toFixed(2)}</p>
                               {revenueByItem[item.id] > 0 && (
                                  <div className="text-right">
                                     <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">REVENUE</p>
                                     <p className="text-xs font-black text-emerald-500 uppercase tracking-tight italic">₹{revenueByItem[item.id].toFixed(2)}</p>
                                  </div>
                               )}
                            </div>
                            <p className="text-[10px] text-zinc-400 font-bold line-clamp-2 min-h-[30px] leading-relaxed italic">"{item.description}"</p>
                         </div>

                        <div className="flex items-center justify-between pt-4 border-t border-zinc-50 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setEditingItem(item);
                                setItemFormData({
                                  name: item.name,
                                  description: item.description,
                                  price: item.price,
                                  image: item.image,
                                  isVeg: item.isVeg,
                                  isAvailable: item.isAvailable
                                });
                                setShowItemModal(true);
                              }}
                              className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-950 text-zinc-500 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item.id)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-950 text-zinc-500 hover:bg-red-500 hover:text-white transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                             <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{item.isAvailable ? 'AVAILABLE' : 'HIDDEN'}</span>
                             <button
                               onClick={() => toggleItemAvailability(item.id, item.isAvailable)}
                               className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex ${item.isAvailable ? 'bg-orange-600 justify-end' : 'bg-zinc-200 dark:bg-zinc-800 justify-start'}`}
                             >
                                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                             </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {menuItems.length === 0 && (
                    <div className="py-20 text-center">
                      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                        <Utensils className="text-zinc-300 dark:text-zinc-700" size={40} />
                      </div>
                      <h3 className="text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white mb-2 uppercase">Menu Empty</h3>
                      <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Start adding items to build your menu catalog</p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div
              key="tab-orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 px-4 gap-4 uppercase italic">
                <div>
                   <h2 className="text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white">Active <span className="text-orange-600">Missions</span></h2>
                   <p className="text-[9px] font-black tracking-[0.2em] text-zinc-400 uppercase italic">Real-time Fulfillment Dashboard</p>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-black uppercase tracking-widest italic bg-zinc-100 dark:bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                   Fulfillment Active
                </div>
              </div>

              <div className="space-y-6">
                {orders.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-900 p-20 rounded-[2.5rem] text-center border-2 border-zinc-100 dark:border-zinc-800">
                    <ShoppingBag className="mx-auto text-zinc-200 dark:text-zinc-800 mb-6" size={64} />
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2 dark:text-white italic">Radio Silence</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">No incoming orders at the moment</p>
                  </div>
                ) : (
                  orders.map((order) => {
                    const timeAgo = (seconds: number) => {
                      const mins = Math.floor((Date.now() / 1000 - seconds) / 60);
                      if (mins < 1) return 'JUST NOW';
                      if (mins < 60) return `${mins} MIN AGO`;
                      return `${Math.floor(mins/60)} HR AGO`;
                    };

                    const borderColors = {
                      confirmed: 'border-l-blue-500',
                      preparing: 'border-l-orange-500',
                      'out-for-delivery': 'border-l-purple-500',
                      delivered: 'border-l-green-500',
                      cancelled: 'border-l-red-500'
                    };

                    return (
                    <div key={order.id} className={`bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 border-l-4 ${borderColors[order.status as keyof typeof borderColors] || 'border-l-zinc-300'} rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all`}>
                      <div className="p-8 border-b border-zinc-50 dark:border-zinc-800">
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-400 shrink-0">
                                  <ShoppingBag size={20} />
                               </div>
                               <div>
                                  <div className="flex items-center gap-3 mb-1">
                                    <span className="text-[8px] font-black text-orange-600 bg-orange-600/5 px-2 py-0.5 rounded border border-orange-600/10 italic">{timeAgo(order.createdAt?.seconds || 0)}</span>
                                  </div>
                                  <h4 className="text-xl font-black italic tracking-tighter transition-colors dark:text-white uppercase">{order.userName}</h4>
                                  <p className="text-[9px] font-black text-zinc-400 uppercase flex items-center gap-2">
                                     <MapPin size={10} className="text-orange-600" /> {order.deliveryAddress}
                                  </p>
                               </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                               <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                 <AlertCircle size={10} className="text-zinc-400" />
                                 <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{order.paymentMethod === 'COD' ? 'CASH ON DELIVERY' : 'ONLINE PAYMENT'}</span>
                               </div>
                               <span className={`px-4 py-2 rounded-xl text-[10px] font-black italic uppercase tracking-tighter border shadow-sm ${
                                 order.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                 order.status === 'preparing' ? 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse' :
                                 order.status === 'out-for-delivery' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                 order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                                 'bg-zinc-50 text-zinc-600 border-zinc-200'
                               }`}>
                                 {order.status.replace(/-/g, ' ')}
                               </span>
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3">
                         <div className="lg:col-span-2 p-8 bg-zinc-50/50 dark:bg-zinc-950/20">
                            <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase mb-4">Payload Content</p>
                            <div className="space-y-4">
                               {order.items.map((item, idx) => (
                                 <div key={idx} className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-lg bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center font-black text-orange-600 italic">
                                        {item.quantity}x
                                      </div>
                                      <h5 className="text-sm font-black italic tracking-tighter uppercase dark:text-white">{item.name}</h5>
                                    </div>
                                    <p className="text-xs font-black italic text-zinc-900 dark:text-white">₹{(item.price * item.quantity).toFixed(2)}</p>
                                 </div>
                               ))}
                            </div>
                         </div>

                         <div className="p-8 border-l border-zinc-50 dark:border-zinc-800 space-y-6">
                            <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-6 rounded-2xl shadow-xl italic tracking-tighter">
                               <p className="text-[9px] font-black opacity-60 uppercase mb-1 tracking-widest">Grand Extraction Total</p>
                               <p className="text-3xl font-black italic leading-none">₹{order.total.toFixed(2)}</p>
                            </div>

                            <div className="space-y-2">
                               <p className="text-[9px] font-black text-zinc-400 uppercase mb-3 ml-2">EXECUTE PROTOCOL</p>
                               {['confirmed', 'preparing'].includes(order.status) && (
                                 <button 
                                   onClick={() => setRejectingOrderId(order.id!)}
                                   className="w-full bg-red-100 hover:bg-red-200 text-red-600 font-black py-4 rounded-xl text-[10px] tracking-widest uppercase transition-all mb-2 flex items-center justify-center gap-3 active:scale-95"
                                 >
                                   <X size={16} /> REJECT ORDER
                                 </button>
                               )}
                               {order.status === 'confirmed' && (
                                 <button onClick={() => handleStatusUpdate(order.id!, 'preparing')} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl text-[10px] tracking-widest uppercase transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3">
                                   <Utensils size={16} /> START PREPARING
                                 </button>
                               )}
                               {order.status === 'preparing' && (
                                 <div className="space-y-3">
                                   {assigningDeliveryId === order.id ? (
                                     <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                                       <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest italic">Delivery Personnel Intel</p>
                                       <input 
                                         type="text" 
                                         placeholder="Delivery Boy Name"
                                         className="w-full px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-lg text-xs font-bold"
                                         value={deliveryBoyDetails.name}
                                         onChange={(e) => setDeliveryBoyDetails({...deliveryBoyDetails, name: e.target.value})}
                                       />
                                       <input 
                                         type="tel" 
                                         placeholder="Phone Number"
                                         maxLength={10}
                                         className="w-full px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-lg text-xs font-bold"
                                         value={deliveryBoyDetails.phone}
                                         onChange={(e) => setDeliveryBoyDetails({...deliveryBoyDetails, phone: e.target.value.replace(/\D/g, '')})}
                                       />
                                       <div className="flex gap-2">
                                         <button 
                                           onClick={() => handleStatusUpdate(order.id!, 'out-for-delivery', deliveryBoyDetails.name, deliveryBoyDetails.phone)}
                                           className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-lg text-[10px] tracking-widest uppercase transition-all shadow-md active:scale-95"
                                         >
                                           CONFIRM DISPATCH
                                         </button>
                                         <button 
                                           onClick={() => setAssigningDeliveryId(null)}
                                           className="px-4 py-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-[10px] font-black uppercase tracking-widest"
                                         >
                                           CANCEL
                                         </button>
                                       </div>
                                     </div>
                                   ) : (
                                     <button onClick={() => setAssigningDeliveryId(order.id!)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-[10px] tracking-widest uppercase transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3">
                                       <Truck size={16} /> SEND FOR DELIVERY
                                     </button>
                                   )}
                                 </div>
                               )}
                               {order.status === 'out-for-delivery' && (
                                 <button onClick={() => handleStatusUpdate(order.id!, 'delivered')} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl text-[10px] tracking-widest uppercase transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3">
                                   <CheckCircle2 size={16} /> MARK DELIVERED
                                 </button>
                               )}
                               {order.status === 'delivered' && (
                                 <div className="flex items-center justify-center gap-2 text-green-500 font-black italic text-xs py-4 bg-green-500/5 rounded-xl border border-green-500/20 uppercase">
                                   <CheckCircle2 size={16} /> MISSION ACCOMPLISHED
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    ) : null}

        {/* Appeal Modal */}
        <AnimatePresence>
          {showAppealModal && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAppealModal(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[250]"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-zinc-950 rounded-[3rem] p-10 z-[251] shadow-2xl border-2 border-zinc-100 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-3xl font-black italic tracking-tighter uppercase dark:text-white leading-none mb-1">
                      APPEAL <span className="text-orange-600">CENTRAL</span>
                    </h3>
                    <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase italic">Decision Reversal Initiative</p>
                  </div>
                  <button onClick={() => setShowAppealModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                {!appealSubmitted ? (
                  <div className="space-y-6">
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 leading-relaxed italic mb-4">
                        State your case. Provide significant operational evidence or policy clarification to override the existing restriction protocol.
                      </p>
                      <textarea 
                        value={appealReason}
                        onChange={(e) => setAppealReason(e.target.value)}
                        placeholder="Detail your request for operational restoration..."
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 text-sm font-bold text-zinc-900 dark:text-white h-40 focus:ring-4 focus:ring-orange-500/10 transition-all resize-none"
                      />
                    </div>
                    
                    <button 
                      onClick={() => handleSubmitAppeal(restaurant?.isDeleted ? 'deletion' : 'suspension')}
                      disabled={!appealReason || isSubmittingAppeal}
                      id="transmit-appeal-btn"
                      className="w-full relative group overflow-hidden bg-orange-600 hover:bg-orange-500 disabled:opacity-30 text-white py-6 rounded-2xl font-black italic tracking-tighter text-xl uppercase shadow-2xl shadow-orange-600/30 transition-all active:scale-95 flex items-center justify-center gap-3 border-b-4 border-orange-800"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-white/10 to-orange-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      {isSubmittingAppeal ? (
                        <div className="flex items-center gap-2">
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                           PROCESSING...
                        </div>
                      ) : 'TRANSMIT APPEAL'}
                    </button>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-20 h-20 bg-emerald-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20 rotate-12">
                      <CheckCircle2 size={40} className="text-white" />
                    </div>
                    <h4 className="text-2xl font-black italic tracking-tighter uppercase text-emerald-500 mb-2">APPEAL TRANSMITTED</h4>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">Operational Command Notified</p>
                  </motion.div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Rejection Modal */}
        <AnimatePresence>
          {rejectingOrderId && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setRejectingOrderId(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white dark:bg-zinc-950 rounded-[2.5rem] p-8 z-[201] shadow-2xl border-2 border-zinc-100 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase dark:text-white">REJECT <span className="text-red-500">ORDER</span></h3>
                  <button onClick={() => setRejectingOrderId(null)} className="text-zinc-400"><X size={20} /></button>
                </div>
                
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-6 italic italic">Please specify the failure protocol:</p>
                
                <div className="space-y-2 mb-8">
                  {REJECTION_REASONS.map(reason => (
                    <button 
                      key={reason}
                      onClick={() => setRejectReason(reason)}
                      className={`w-full p-4 rounded-xl text-left text-xs font-black uppercase tracking-widest transition-all border-2 ${rejectReason === reason ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-transparent text-zinc-400 border-zinc-100 dark:border-zinc-800 hover:border-red-500/30'}`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => handleRejectOrder(rejectingOrderId)}
                  disabled={!rejectReason}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-2xl font-black tracking-widest text-[10px] uppercase shadow-lg transition-all active:scale-95 disabled:opacity-30"
                >
                  CONFIRM REJECTION
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Item Modal */}
        <AnimatePresence>
          {showItemModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowItemModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-[2.5rem] p-10 z-[101] shadow-2xl border-2 border-zinc-100 dark:border-zinc-800 overflow-y-auto max-h-[90vh]">
                <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-2 dark:text-white">{editingItem ? 'Edit' : 'New'} <span className="text-orange-600">MenuItem</span></h3>
                <p className="text-[9px] font-black tracking-[0.2em] text-zinc-400 capitalize mb-8 uppercase italic leading-none">Intelligence Injection Protocol</p>
                
                <form onSubmit={handleItemSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                       <label className="text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase mb-2 block ml-4">Item Identity</label>
                       <input 
                         type="text" 
                         required
                         placeholder="e.g., Signature Double Burger"
                         className="w-full px-6 py-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 font-bold text-lg rounded-[1.25rem] focus:ring-4 focus:ring-orange-500/10 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                         value={itemFormData.name}
                         onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})}
                       />
                    </div>
                    <div className="md:col-span-2">
                       <label className="text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase mb-2 block ml-4">Payload Description</label>
                       <textarea 
                         required
                         placeholder="Describe the specialized components..."
                         className="w-full px-6 py-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 font-bold text-sm rounded-[1.25rem] focus:ring-4 focus:ring-orange-500/10 transition-all text-zinc-900 dark:text-white h-24 placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                         value={itemFormData.description}
                         onChange={(e) => setItemFormData({...itemFormData, description: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase mb-2 block ml-4">Extraction Price (₹)</label>
                       <input 
                         type="number" 
                         required
                         placeholder="0.00"
                         step="0.01"
                         min="0"
                         className="w-full px-6 py-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 font-bold text-lg rounded-[1.25rem] focus:ring-4 focus:ring-orange-500/10 transition-all text-zinc-900 dark:text-white"
                         value={itemFormData.price || ''}
                         onChange={(e) => {
                           const val = parseFloat(e.target.value);
                           setItemFormData({...itemFormData, price: isNaN(val) ? 0 : val});
                         }}
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase mb-2 block ml-4">Item Schema</label>
                       <div className="flex bg-zinc-50 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-100 dark:border-zinc-800">
                         <button type="button" onClick={() => setItemFormData({...itemFormData, isVeg: true})} className={`flex-1 py-4 px-2 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all ${itemFormData.isVeg ? 'bg-green-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-600'}`}>VEG</button>
                         <button type="button" onClick={() => setItemFormData({...itemFormData, isVeg: false})} className={`flex-1 py-4 px-2 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all ${!itemFormData.isVeg ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-600'}`}>NON-VEG</button>
                       </div>
                    </div>
                     <div className="md:col-span-2">
                        <ImageUploader 
                           value={itemFormData.image}
                           onChange={(b64) => setItemFormData({...itemFormData, image: b64})}
                           label="Food Item Photo"
                        />
                     </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 pt-6 uppercase italic">
                    <button type="submit" className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-6 rounded-[1.25rem] font-black italic tracking-tighter text-xl uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                      {editingItem ? 'SYNC INTEL' : 'INJECT DATA'}
                    </button>
                    <button type="button" onClick={() => setShowItemModal(false)} className="px-8 py-4 rounded-[1.25rem] font-black tracking-widest text-[10px] uppercase text-zinc-400 hover:text-zinc-600 transition-colors">
                      CANCEL SCAN
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RestaurantDashboard;

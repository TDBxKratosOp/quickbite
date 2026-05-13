import React, { useEffect, useState } from 'react';
import { orderService, couponService, restaurantService, appealService } from '../services/firebaseService';
import { Order, Coupon, Restaurant, Appeal } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, ShoppingBag, Clock, CheckCircle2, Truck, Timer, Search, Ticket, Plus, Trash2, Edit3, X, AlertCircle, XCircle, Store, Power, ExternalLink, MessageSquare, ShieldAlert, RotateCcw } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Timer, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' },
  preparing: { label: 'Cooking', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800 animate-pulse' },
  'out-for-delivery': { label: 'On Way', icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800 shadow-lg shadow-purple-50 dark:shadow-none' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' },
};

const Admin: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'orders' | 'coupons' | 'restaurants' | 'appeals'>('orders');
  const [activeRestaurantTab, setActiveRestaurantTab] = useState<'active' | 'deleted'>('active');
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [confirmingDeleteCouponId, setConfirmingDeleteCouponId] = useState<string | null>(null);
  const [confirmingDeleteRestaurantId, setConfirmingDeleteRestaurantId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [showAppealActionModal, setShowAppealActionModal] = useState<{appeal: Appeal, action: 'resolved' | 'rejected'} | null>(null);
  const [appealSubView, setAppealSubView] = useState<'owner' | 'operational'>('owner');
  const [couponForm, setCouponForm] = useState({ code: '', discountPercent: 0, isActive: true });
  const { profile } = useAuth();

  useEffect(() => {
    fetchOrders();
    fetchCoupons();
    fetchRestaurants();
    
    // Subscribe to appeals for real-time updates
    const unsub = appealService.subscribeToAppeals((data) => {
      setAppeals(data);
    });
    
    return () => unsub();
  }, []);

  useEffect(() => {
    if (view === 'appeals') {
      fetchAppeals();
    }
  }, [view]);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getAllOrders();
      if (data) setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const data = await couponService.getAllCoupons();
      if (data) setCoupons(data);
    } catch (err) {
      console.error(err);
    } 
  };

  const fetchRestaurants = async () => {
    try {
      const data = await restaurantService.getAllRestaurants();
      if (data) setRestaurants(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppeals = async () => {
    try {
      const data = await appealService.getAllAppeals();
      if (data) setAppeals(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAppeal = async (id: string) => {
    try {
      await appealService.deleteAppeal(id);
      fetchAppeals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    try {
      await restaurantService.deleteRestaurant(id);
      setConfirmingDeleteRestaurantId(null);
      fetchRestaurants();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSoftDeleteRestaurant = async (id: string, isDeleted: boolean) => {
    try {
      await restaurantService.softDeleteRestaurant(id, isDeleted);
      setConfirmingDeleteRestaurantId(null);
      fetchRestaurants();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleRestaurantStatus = async (restaurant: Restaurant) => {
    try {
      await restaurantService.suspendRestaurant(restaurant.id, restaurant.suspendedByAdmin ? false : true);
      fetchRestaurants();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAppealAction = async (appeal: Appeal, status: 'resolved' | 'rejected', note?: string) => {
    if (!appeal.id) return;
    setIsActionLoading(appeal.id);
    try {
      await appealService.updateAppealStatus(appeal.id, status, note);
      
      if (status === 'resolved') {
        if (appeal.type === 'suspension' && appeal.restaurantId) {
          await restaurantService.suspendRestaurant(appeal.restaurantId, false);
        } else if (appeal.type === 'deletion' && appeal.restaurantId) {
          await restaurantService.softDeleteRestaurant(appeal.restaurantId, false);
        }
      }
      
      fetchAppeals(); 
      await fetchRestaurants();
      setShowAppealActionModal(null);
      setRejectionNote('');
    } catch (err) {
      console.error("OVERRIDE ERROR:", err);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCoupon) {
        await couponService.updateCoupon(editingCoupon.id!, couponForm);
      } else {
        await couponService.createCoupon({ ...couponForm, code: couponForm.code.toUpperCase() });
      }
      setShowCouponModal(false);
      setEditingCoupon(null);
      setCouponForm({ code: '', discountPercent: 0, isActive: true });
      fetchCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    await couponService.deleteCoupon(id);
    setConfirmingDeleteCouponId(null);
    fetchCoupons();
  };

  const toggleCouponStatus = async (coupon: Coupon) => {
    await couponService.updateCoupon(coupon.id!, { isActive: !coupon.isActive });
    fetchCoupons();
  };

  if (!profile?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-6">
           <LayoutDashboard className="text-red-600" size={32} />
        </div>
        <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2 dark:text-white">Access <span className="text-red-600">Denied</span></h2>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Administrator privileges required.</p>
      </div>
    );
  }

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter;
    const matchesSearch = o.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         o.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         o.id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black italic tracking-tight uppercase mb-2 dark:text-white">
              Control <span className="text-orange-600">Nexus</span>
            </h1>
            <p className="text-[9px] font-black tracking-[0.3em] text-zinc-400 uppercase">Admin Dashboard • {view === 'orders' ? orders.length : coupons.length} items logged</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
               <button 
                onClick={() => setView('orders')}
                className={`px-5 py-2 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all ${view === 'orders' ? 'bg-white dark:bg-zinc-100 text-zinc-900 dark:text-black shadow-sm' : 'text-zinc-400'}`}>
                 Orders
               </button>
               <button 
                onClick={() => setView('restaurants')}
                className={`px-5 py-2 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all ${view === 'restaurants' ? 'bg-white dark:bg-zinc-100 text-zinc-900 dark:text-black shadow-sm' : 'text-zinc-400'}`}>
                 Restaurants
               </button>
               <button 
                onClick={() => setView('appeals')}
                className={`px-5 py-2 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all ${view === 'appeals' ? 'bg-white dark:bg-zinc-100 text-zinc-900 dark:text-black shadow-sm' : 'text-zinc-400'}`}>
                 Appeals
               </button>
               <button 
                onClick={() => setView('coupons')}
                className={`px-5 py-2 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all ${view === 'coupons' ? 'bg-white dark:bg-zinc-100 text-zinc-900 dark:text-black shadow-sm' : 'text-zinc-400'}`}>
                 Coupons
               </button>
            </div>
            {view === 'orders' ? (
              <div className="relative group w-full sm:w-56">
                <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center">
                  <Search size={14} className="text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search signal..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-900 pl-10 pr-4 py-3 rounded-xl text-[10px] font-bold focus:ring-4 focus:ring-orange-500/10 transition-all dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            ) : (
              <button 
                onClick={() => {
                  setEditingCoupon(null);
                  setCouponForm({ code: '', discountPercent: 0, isActive: true });
                  setShowCouponModal(true);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-black text-[9px] tracking-widest uppercase flex items-center gap-2 shadow-lg shadow-orange-100 dark:shadow-none transition-all active:scale-95"
              >
                <Plus size={14} /> NEW COUPON
              </button>
            )}
          </div>
        </div>

        {view === 'orders' && (
          <div className="flex flex-wrap gap-1.5 mt-6">
            {['all', 'pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all border-2 ${
                  filter === s
                  ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-black'
                  : 'bg-white dark:bg-zinc-950 border-zinc-100 dark:border-zinc-900 text-zinc-400 dark:text-zinc-600 hover:border-zinc-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-8 h-8 border-2 border-orange-600/20 border-t-orange-600 rounded-full animate-spin" />
          <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase animate-pulse">Syncing Control Terminal...</p>
        </div>
      ) : (
        <>
          {view === 'orders' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredOrders.map((order) => {
                  const config = STATUS_CONFIG[order.status];
                  const Icon = config.icon;

                  return (
                    <motion.div
                      layout
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-[2rem] p-6 hover:shadow-xl hover:shadow-zinc-100 dark:hover:shadow-none transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2 ${config.bg}`}>
                            <Icon size={18} className={config.color} />
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">ID: {order.id?.slice(-6).toUpperCase()}</p>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${config.color}`}>{config.label}</p>
                          </div>
                        </div>

                        <div className="mb-5">
                          <h3 className="text-xl font-black italic tracking-tighter uppercase dark:text-white leading-tight group-hover:text-orange-600 transition-colors">
                            {order.userName}
                          </h3>
                          <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase">{order.restaurantName}</p>
                        </div>

                        <div className="space-y-2 mb-6">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[9px] font-black bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded dark:text-white">{item.quantity}x</span>
                                <span className="text-[10px] font-black text-zinc-900 dark:text-white truncate uppercase">{item.name}</span>
                              </div>
                              <span className="text-[10px] font-black text-zinc-400">₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {order.deliveryBoyName && (
                          <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Delivery Intel</p>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black italic uppercase dark:text-white">{order.deliveryBoyName}</span>
                              {order.deliveryBoyPhone && (
                                <span className="text-[10px] font-black text-orange-600">{order.deliveryBoyPhone}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-6 pb-5 border-b border-zinc-50 dark:border-zinc-900">
                          <div>
                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Amount</p>
                            <p className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase">₹{order.total.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Mode</p>
                            <p className="text-[10px] font-black text-zinc-900 dark:text-white uppercase">{order.paymentMethod === 'COD' ? 'Cash' : 'Razorpay'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { s: 'confirmed', c: 'text-blue-600 border-blue-100 bg-blue-50/50' },
                            { s: 'preparing', c: 'text-orange-600 border-orange-100 bg-orange-50/50' },
                            { s: 'out-for-delivery', c: 'text-purple-600 border-purple-100 bg-purple-50/50' },
                            { s: 'delivered', c: 'text-green-600 border-green-100 bg-green-50/50' }
                          ].map(({ s, c }) => (
                            <button
                              key={s}
                              disabled={order.status === s || order.status === 'cancelled' || order.status === 'delivered'}
                              onClick={() => handleStatusUpdate(order.id!, s as any)}
                              className={`py-2 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all border ${
                                order.status === s 
                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-md' 
                                : `bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 border-zinc-100 dark:border-zinc-800 hover:${c} transition-colors`
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                              {s.split('-')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : view === 'restaurants' ? (
            <div className="space-y-8">
              <div className="flex bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-2xl w-fit border border-zinc-200 dark:border-zinc-800">
                <button 
                  onClick={() => setActiveRestaurantTab('active')}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeRestaurantTab === 'active' ? 'bg-white dark:bg-zinc-200 text-black shadow-lg shadow-zinc-200/20' : 'text-zinc-400'}`}
                >
                  ACTIVE AGENTS
                </button>
                <button 
                  onClick={() => setActiveRestaurantTab('deleted')}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeRestaurantTab === 'deleted' ? 'bg-white dark:bg-zinc-200 text-black shadow-lg shadow-zinc-200/20' : 'text-zinc-400'}`}
                >
                  TERMINATED OPS
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {restaurants
                    .filter(r => activeRestaurantTab === 'active' ? !r.isDeleted : r.isDeleted)
                    .map((restaurant) => (
                      <motion.div
                        layout
                        key={restaurant.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className={`bg-white dark:bg-zinc-950 border ${!restaurant.suspendedByAdmin ? 'border-zinc-100 dark:border-zinc-800' : 'border-orange-200 dark:border-orange-800/50 bg-orange-50/5 dark:bg-orange-600/5'} rounded-[2rem] p-6 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden`}
                      >
                        {restaurant.suspendedByAdmin && (
                          <div className="absolute top-0 right-0 bg-orange-500 text-white px-4 py-1.5 rounded-bl-2xl text-[8px] font-black tracking-widest uppercase italic z-10">
                            SUSPENDED
                          </div>
                        )}
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-zinc-100 dark:border-zinc-800 shrink-0">
                            <img src={restaurant.image || undefined} alt={restaurant.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xl font-black italic tracking-tighter uppercase dark:text-white truncate">
                              {restaurant.name}
                            </h3>
                            <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase truncate">{restaurant.cuisines.join(', ')}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-1 leading-none">STATUS</p>
                            <p className={`text-[10px] font-black uppercase tracking-tight italic ${restaurant.isActive ? 'text-green-500' : 'text-zinc-500'}`}>
                               {restaurant.isActive ? 'OPERATIONAL' : 'OFFLINE'}
                            </p>
                          </div>
                          <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-1 leading-none">THREAT LEVEL</p>
                            <p className={`text-[10px] font-black uppercase tracking-tight italic ${restaurant.isDeleted ? 'text-red-500' : 'text-emerald-500'}`}>
                              {restaurant.isDeleted ? 'TERMINATED' : 'SAFE'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-5 border-t border-zinc-50 dark:border-zinc-900">
                          <div className="flex items-center gap-1.5">
                            {!restaurant.isDeleted ? (
                              <button 
                                onClick={() => toggleRestaurantStatus(restaurant)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all ${
                                  !restaurant.suspendedByAdmin 
                                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 dark:border-zinc-700' 
                                  : 'bg-orange-600 text-white shadow-lg border border-orange-500'
                                }`}
                              >
                                <ShieldAlert size={12} /> {restaurant.suspendedByAdmin ? 'UNSUSPEND' : 'SUSPEND'}
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleSoftDeleteRestaurant(restaurant.id, false)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black tracking-widest uppercase transition-all hover:bg-emerald-700 shadow-lg border border-emerald-500"
                              >
                                <RotateCcw size={12} /> RESTORE
                              </button>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                             {!restaurant.isDeleted ? (
                                confirmingDeleteRestaurantId === restaurant.id ? (
                                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-xl border border-red-100 dark:border-red-900/30">
                                    <button onClick={() => handleSoftDeleteRestaurant(restaurant.id, true)} className="text-[8px] font-black text-red-600 uppercase hover:underline">TERMINATE?</button>
                                    <button onClick={() => setConfirmingDeleteRestaurantId(null)} className="text-[8px] font-black text-zinc-400 uppercase hover:underline">NO</button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setConfirmingDeleteRestaurantId(restaurant.id)}
                                    className="w-10 h-10 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-red-500 rounded-xl transition-colors border border-zinc-100 dark:border-zinc-800"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )
                             ) : (
                                confirmingDeleteRestaurantId === restaurant.id ? (
                                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-xl border border-red-100 dark:border-red-900/30">
                                    <button onClick={() => handleDeleteRestaurant(restaurant.id)} className="text-[8px] font-black text-red-600 uppercase hover:underline">PURGE FOREVER?</button>
                                    <button onClick={() => setConfirmingDeleteRestaurantId(null)} className="text-[8px] font-black text-zinc-400 uppercase hover:underline">CALCEL</button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setConfirmingDeleteRestaurantId(restaurant.id)}
                                    className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-xl transition-colors shadow-lg shadow-red-600/20"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )
                             )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </div>
          ) : view === 'appeals' ? (
            <div className="space-y-8">
              {/* SUB-NAVIGATION TOGGLE */}
              <div className="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-2xl w-fit">
                <button 
                  onClick={() => setAppealSubView('owner')}
                  className={`px-6 py-3 rounded-xl font-black italic tracking-tighter uppercase text-[10px] transition-all duration-300 ${
                    appealSubView === 'owner' 
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 shadow-md' 
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Owner Requests ({appeals.filter(a => a.type === 'owner_request').length})
                </button>
                <button 
                  onClick={() => setAppealSubView('operational')}
                  className={`px-6 py-3 rounded-xl font-black italic tracking-tighter uppercase text-[10px] transition-all duration-300 ${
                    appealSubView === 'operational' 
                    ? 'bg-white dark:bg-zinc-800 text-orange-600 shadow-md' 
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Operational Appeals ({appeals.filter(a => a.type !== 'owner_request').length})
                </button>
              </div>

              <AnimatePresence mode="wait">
                {appealSubView === 'owner' ? (
                  <motion.div 
                    key="owner-requests"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <Store className="text-emerald-500" size={20} />
                      <h2 className="text-xl font-black italic tracking-tighter uppercase dark:text-white leading-none">Owner Activation Requests</h2>
                      <div className="h-[2px] flex-1 bg-zinc-100 dark:bg-zinc-900 ml-2" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {appeals.filter(a => a.type === 'owner_request').length === 0 ? (
                        <div className="md:col-span-2 text-center py-24 bg-zinc-50 dark:bg-zinc-950 rounded-[2rem] border-2 border-zinc-100 dark:border-zinc-900 border-dashed">
                           <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase">No new owner applications detected</p>
                        </div>
                      ) : (
                        appeals.filter(a => a.type === 'owner_request').map((appeal) => (
                          <motion.div
                            layout
                            key={appeal.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 bg-emerald-600 text-white px-5 py-2 rounded-bl-3xl text-[9px] font-black tracking-widest uppercase italic">
                               NEW PARTNER
                            </div>

                            <div className="flex items-center gap-4 mb-8">
                              <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white italic font-black shadow-lg shadow-emerald-600/20">
                                 {appeal.restaurantName.charAt(0)}
                              </div>
                              <div>
                                 <h3 className="text-2xl font-black italic tracking-tighter uppercase dark:text-white leading-none mb-1">{appeal.restaurantName}</h3>
                                 <p className="text-[9px] font-black tracking-widest text-emerald-500 uppercase">{appeal.ownerEmail}</p>
                                 {appeal.restaurantAddress && (
                                   <p className="text-[8px] font-bold text-zinc-500 uppercase mt-1">Loc: {appeal.restaurantAddress}</p>
                                 )}
                              </div>
                            </div>

                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 mb-8 italic">
                               <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 italic">VISION & REASON:</p>
                               <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 leading-relaxed italic">"{appeal.reason}"</p>
                            </div>

                            {appeal.adminNote && (
                              <div className="mb-8 p-6 bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl relative">
                                <span className="absolute -top-3 left-6 px-3 bg-white dark:bg-zinc-900 text-[8px] font-black tracking-widest text-emerald-600 uppercase">Resolution Notes</span>
                                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-500 italic leading-relaxed">"{appeal.adminNote}"</p>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-6 border-t border-zinc-50 dark:border-zinc-900">
                              <div className="flex items-center gap-3">
                                 <span className={`text-[10px] font-black tracking-widest uppercase px-4 py-2 rounded-xl ${
                                   appeal.status === 'pending' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                                   appeal.status === 'resolved' ? 'bg-green-50 text-green-600 border border-green-200' :
                                   'bg-red-50 text-red-600 border border-red-200'
                                 }`}>
                                   {appeal.status}
                                 </span>

                                 {appeal.status !== 'pending' && (
                                   <button
                                     onClick={() => handleDeleteAppeal(appeal.id!)}
                                     className="w-10 h-10 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-red-500 rounded-xl transition-all border border-zinc-100 dark:border-zinc-800"
                                     title="Purge Record"
                                   >
                                      <Trash2 size={14} />
                                   </button>
                                 )}
                              </div>
                              {appeal.status === 'pending' && (
                                <div className="flex items-center gap-3">
                                   <button 
                                     onClick={() => setShowAppealActionModal({ appeal, action: 'rejected' })}
                                     className="px-6 py-3 rounded-xl bg-red-100 text-red-600 font-black text-[9px] tracking-widest uppercase hover:bg-red-200 transition-all border border-red-200/50"
                                   >
                                     REJECT
                                   </button>
                                   <button 
                                     onClick={() => setShowAppealActionModal({ appeal, action: 'resolved' })}
                                     className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-black text-[9px] tracking-widest uppercase shadow-xl active:scale-95 transition-all"
                                   >
                                     ACTIVATE
                                   </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="operational-appeals"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <ShieldAlert className="text-orange-500" size={20} />
                      <h2 className="text-xl font-black italic tracking-tighter uppercase dark:text-white leading-none">Operational Appeals</h2>
                      <div className="h-[2px] flex-1 bg-zinc-100 dark:bg-zinc-900 ml-2" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {appeals.filter(a => a.type !== 'owner_request').length === 0 ? (
                        <div className="md:col-span-2 text-center py-24 bg-zinc-50 dark:bg-zinc-950 rounded-[2rem] border-2 border-zinc-100 dark:border-zinc-900 border-dashed">
                           <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase">Operational environment is stable</p>
                        </div>
                      ) : (
                        appeals.filter(a => a.type !== 'owner_request').map((appeal) => (
                          <motion.div
                            layout
                            key={appeal.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 bg-zinc-900 text-white px-5 py-2 rounded-bl-3xl text-[9px] font-black tracking-widest uppercase italic">
                               PROTOCOL: {appeal.type}
                            </div>

                            <div className="flex items-center gap-4 mb-8">
                              <div className="w-14 h-14 rounded-2xl bg-orange-600 flex items-center justify-center text-white italic font-black shadow-lg shadow-orange-600/20">
                                 {appeal.restaurantName.charAt(0)}
                              </div>
                              <div>
                                 <h3 className="text-2xl font-black italic tracking-tighter uppercase dark:text-white leading-none mb-1">{appeal.restaurantName}</h3>
                                 <p className="text-[9px] font-black tracking-widest text-orange-500 uppercase">{appeal.ownerEmail}</p>
                              </div>
                            </div>

                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 mb-8 italic">
                               <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 italic">TRANSMITTED MESSAGE:</p>
                               <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 leading-relaxed italic">"{appeal.reason}"</p>
                            </div>

                            {appeal.adminNote && (
                              <div className="mb-8 p-6 bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl relative">
                                <span className="absolute -top-3 left-6 px-3 bg-white dark:bg-zinc-900 text-[8px] font-black tracking-widest text-orange-600 uppercase">Command Resolution</span>
                                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-500 italic leading-relaxed">"{appeal.adminNote}"</p>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-6 border-t border-zinc-50 dark:border-zinc-900">
                              <div className="flex items-center gap-3">
                                 <span className={`text-[10px] font-black tracking-widest uppercase px-4 py-2 rounded-xl ${
                                   appeal.status === 'pending' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                                   appeal.status === 'resolved' ? 'bg-green-50 text-green-600 border border-green-200' :
                                   'bg-red-50 text-red-600 border border-red-200'
                                 }`}>
                                   {appeal.status}
                                 </span>

                                 {appeal.status !== 'pending' && (
                                   <button
                                     onClick={() => handleDeleteAppeal(appeal.id!)}
                                     className="w-10 h-10 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-red-500 rounded-xl transition-all border border-zinc-100 dark:border-zinc-800"
                                     title="Purge Record"
                                   >
                                      <Trash2 size={14} />
                                   </button>
                                 )}
                              </div>
                              {appeal.status === 'pending' && (
                                <div className="flex items-center gap-3">
                                   <button 
                                     onClick={() => setShowAppealActionModal({ appeal, action: 'rejected' })}
                                     className="px-6 py-3 rounded-xl bg-red-100 text-red-600 font-black text-[9px] tracking-widest uppercase hover:bg-red-200 transition-all border border-red-200/50"
                                   >
                                     REJECT
                                   </button>
                                   <button 
                                     onClick={() => setShowAppealActionModal({ appeal, action: 'resolved' })}
                                     className="px-6 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black text-[9px] tracking-widest uppercase shadow-xl active:scale-95 transition-all"
                                   >
                                     OVERRIDE
                                   </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {coupons.map((coupon) => (
                  <motion.div
                    key={coupon.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-white dark:bg-zinc-900 border ${coupon.isActive ? 'border-zinc-100 dark:border-zinc-800' : 'border-zinc-100 dark:border-zinc-800 opacity-60'} rounded-[1.5rem] p-6 shadow-sm group relative overflow-hidden`}
                  >
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 ${coupon.isActive ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'} rounded-xl flex items-center justify-center`}>
                          <Ticket size={20} />
                        </div>
                        <div className="flex gap-1 items-center">
                          {confirmingDeleteCouponId === coupon.id ? (
                            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded-lg border border-red-100 dark:border-red-900/30">
                              <span className="text-[7px] font-black tracking-widest text-red-600 uppercase">Sure?</span>
                              <button 
                                onClick={() => handleDeleteCoupon(coupon.id!)}
                                className="text-[7px] font-black tracking-widest text-red-600 hover:text-red-700 uppercase"
                              >
                                YES
                              </button>
                              <button 
                                onClick={() => setConfirmingDeleteCouponId(null)}
                                className="text-[7px] font-black tracking-widest text-zinc-400 hover:text-zinc-600 uppercase"
                              >
                                NO
                              </button>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => {
                                  setEditingCoupon(coupon);
                                  setCouponForm({ code: coupon.code, discountPercent: coupon.discountPercent, isActive: coupon.isActive });
                                  setShowCouponModal(true);
                                }}
                                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={() => setConfirmingDeleteCouponId(coupon.id!)}
                                className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <h3 className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase mb-0.5">
                        {coupon.code}
                      </h3>
                      <p className="text-3xl font-black text-orange-600 leading-none mb-4">
                        {coupon.discountPercent}% <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-black italic">OFF</span>
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-zinc-50 dark:border-zinc-800/50">
                        <span className={`text-[8px] font-black tracking-widest uppercase ${coupon.isActive ? 'text-green-500' : 'text-zinc-400'}`}>
                          {coupon.isActive ? 'Active' : 'Disabled'}
                        </span>
                        <button 
                          onClick={() => toggleCouponStatus(coupon)}
                          className={`px-3 py-1.5 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all ${
                            coupon.isActive 
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600' 
                            : 'bg-orange-600 text-white shadow-md shadow-orange-100 dark:shadow-none'
                          }`}
                        >
                          {coupon.isActive ? 'Off' : 'On'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {view === 'orders' && filteredOrders.length === 0 && !loading && (
        <div className="text-center py-24 bg-zinc-50 dark:bg-zinc-950 rounded-[2rem] border-2 border-zinc-100 dark:border-zinc-900 border-dashed mt-10">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-300 dark:text-zinc-800">
            <ShoppingBag size={32} />
          </div>
          <h3 className="text-2xl font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white mb-1">Silence in Control</h3>
          <p className="text-[9px] font-black tracking-[0.3em] text-zinc-400 uppercase">Awaiting incoming signals from users</p>
        </div>
      )}

      {/* Coupon Modal */}
      <AnimatePresence>
        {showCouponModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
              onClick={() => setShowCouponModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl relative z-10 overflow-hidden border border-zinc-100 dark:border-zinc-800"
            >
              <div className="p-6 pb-2 flex justify-between items-center">
                <h3 className="text-xl font-black italic tracking-tighter uppercase dark:text-white">
                  {editingCoupon ? 'Modify' : 'Spawn'} <span className="text-orange-600">Unit</span>
                </h3>
                <button onClick={() => setShowCouponModal(false)} className="w-8 h-8 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCouponSubmit} className="p-6 pt-4 space-y-5">
                <div>
                  <label className="text-[9px] font-black tracking-[0.2em] text-zinc-400 uppercase mb-2 block">Signal ID</label>
                  <input 
                    required
                    type="text" 
                    placeholder="E.G. NEXUS50"
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 py-3 px-4 rounded-xl text-lg font-black tracking-tight dark:text-white transition-all"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black tracking-[0.2em] text-zinc-400 uppercase mb-2 block">Value Reduction %</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    max="100"
                    value={couponForm.discountPercent || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCouponForm({...couponForm, discountPercent: val === '' ? 0 : parseInt(val)});
                    }}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 py-3 px-4 rounded-xl text-lg font-black tracking-tight dark:text-white transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${couponForm.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                    <AlertCircle size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black tracking-widest uppercase dark:text-white leading-none">Operational</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setCouponForm({...couponForm, isActive: !couponForm.isActive})}
                    className={`w-10 h-5 rounded-full relative transition-all ${couponForm.isActive ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${couponForm.isActive ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl text-[10px] tracking-widest uppercase transition-all shadow-lg active:scale-95"
                >
                  {editingCoupon ? 'UPDATE SIGNAL' : 'INITIALIZE COUPON'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAppealActionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-[10px] font-black tracking-[0.3em] text-orange-600 uppercase mb-2">Decision Nexus</h3>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none dark:text-white">
                  Confirm <span className={showAppealActionModal.action === 'resolved' ? 'text-green-500' : 'text-red-600'}>{showAppealActionModal.action === 'resolved' ? 'Approval' : 'Rejection'}</span>
                </h2>
              </div>

              <div className="p-8 space-y-6">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 italic">Admin Note (Optional)</p>
                   <textarea
                     placeholder="State the reason for this decision..."
                     value={rejectionNote}
                     onChange={(e) => setRejectionNote(e.target.value)}
                     className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold tracking-tight text-zinc-900 dark:text-white min-h-[120px] focus:ring-4 focus:ring-orange-500/10 transition-all outline-none resize-none"
                   />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                       setShowAppealActionModal(null);
                       setRejectionNote('');
                    }}
                    className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-2xl text-[10px] font-black tracking-widest uppercase italic transition-all hover:bg-zinc-200"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={() => handleAppealAction(showAppealActionModal.appeal, showAppealActionModal.action, rejectionNote)}
                    disabled={isActionLoading === showAppealActionModal.appeal.id}
                    className={`flex-[2] py-4 ${showAppealActionModal.action === 'resolved' ? 'bg-green-600' : 'bg-red-600'} text-white rounded-2xl text-[10px] font-black tracking-widest uppercase italic shadow-xl active:scale-95 transition-all disabled:opacity-50`}
                  >
                    {isActionLoading === showAppealActionModal.appeal.id ? 'PROCESSING...' : `COMMIT ${showAppealActionModal.action.toUpperCase()}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Admin;

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/firebaseService';
import { Order } from '../types';
import { Package, Clock, MapPin, ChevronLeft, CheckCircle2, History, XCircle, Timer, Truck, Star, MessageSquare, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { reviewService } from '../services/firebaseService';

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Timer, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' },
  preparing: { label: 'Cooking', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' },
  'out-for-delivery': { label: 'On Way', icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' },
};

const RATING_COLORS = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-yellow-500',
  4: 'text-lime-500',
  5: 'text-green-500'
};

const Orders: React.FC = () => {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
  
  // Review states
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = orderService.subscribeToUserOrders(user.uid, (userOrders) => {
      setOrders(userOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await orderService.updateOrderStatus(orderId, 'cancelled');
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' as const } : o));
      setConfirmingCancelId(null);
    } catch (error) {
      console.error("Cancel failed:", error);
    } finally {
      setCancellingId(null);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewingOrder || !user || !profile) return;
    setSubmittingReview(true);
    try {
      await reviewService.createReview({
        userId: user.uid,
        userName: profile.name || 'Anonymous',
        restaurantId: reviewingOrder.restaurantId,
        restaurantName: reviewingOrder.restaurantName,
        orderId: reviewingOrder.id!,
        rating,
        comment,
      });
      // Update local state
      setOrders(orders.map(o => o.id === reviewingOrder.id ? { ...o, hasBeenReviewed: true } : o));
      setReviewingOrder(null);
      setRating(5);
      setComment('');
    } catch (error) {
      console.error("Review failed:", error);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getEstimatedArrival = (createdAt: any) => {
    const date = new Date(createdAt?.seconds * 1000 || Date.now());
    date.setMinutes(date.getMinutes() + 45);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-32 text-center">
        <h2 className="text-8xl font-black italic tracking-tighter uppercase mb-6 opacity-5 select-none dark:text-white">Orders</h2>
        <p className="text-zinc-400 font-bold tracking-widest uppercase mb-12">Please sign in to view your orders.</p>
        <button onClick={() => navigate('/')} className="btn-primary">GO TO HOME</button>
      </div>
    );
  }
 
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-32 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <History size={64} className="text-zinc-100 dark:text-zinc-800 mb-6" />
          <div className="h-12 bg-zinc-100 dark:bg-zinc-900 w-64 rounded-2xl mb-4" />
          <div className="h-4 bg-zinc-100 dark:bg-zinc-900 w-48 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-8 transition-colors text-[9px] font-black tracking-widest uppercase"
      >
        <ChevronLeft size={16} /> Back
      </button>
 
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none dark:text-white">
            Your <span className="text-orange-600">Orders</span>
          </h1>
          <p className="text-[9px] font-black tracking-[0.3em] text-zinc-400 uppercase mt-3 italic">TRACKING PAST CRAVINGS</p>
        </div>
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button className="px-4 py-2 bg-white dark:bg-zinc-100 shadow-sm text-zinc-900 rounded-lg text-[9px] font-black tracking-widest uppercase">History</button>
        </div>
      </div>

      <div className="space-y-8">
         {orders.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
            <Package size={48} className="mx-auto text-zinc-100 dark:text-zinc-800 mb-4" />
            <p className="text-zinc-400 font-black tracking-[0.3em] text-xs uppercase mb-8">No Records</p>
            <button 
              onClick={() => navigate('/')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-lg active:scale-95"
            >
              BROWSE RESTAURANTS
            </button>
          </div>
        ) : (
          orders.map((order, idx) => (
            <motion.div 
              key={order.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-xl transition-all"
            >
              <div className="p-6 border-b border-zinc-50 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex gap-4 items-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${STATUS_CONFIG[order.status]?.bg || 'bg-zinc-900 text-white'}`}>
                    {React.createElement(STATUS_CONFIG[order.status]?.icon || Package, { size: 24, className: STATUS_CONFIG[order.status]?.color })}
                  </div>
                  <div>
                    <p className="text-[8px] font-black tracking-widest text-zinc-400 uppercase mb-0.5">
                      {new Date((order.createdAt as any)?.seconds * 1000 || Date.now()).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none dark:text-white">{order.restaurantName}</h3>
                  </div>
                </div>
                 
                <div className="flex flex-col items-end gap-2">
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black tracking-widest border transition-colors uppercase ${STATUS_CONFIG[order.status]?.bg} ${STATUS_CONFIG[order.status]?.color}`}>
                    {React.createElement(STATUS_CONFIG[order.status]?.icon || CheckCircle2, { size: 12 })} 
                    {order.status === 'cancelled' && order.rejectionReason 
                      ? 'REJECTED BY RESTAURANT' 
                      : (STATUS_CONFIG[order.status]?.label || order.status)}
                  </div>
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <div className="flex items-center gap-1 text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                      <Clock size={10} /> Arrival: {getEstimatedArrival(order.createdAt)}
                    </div>
                  )}
                </div>
              </div>
 
              <div className="p-6">
                <div className="space-y-4 mb-6">
                  {order.status === 'cancelled' && order.rejectionReason && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4 rounded-xl mb-4">
                      <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1 italic">REJECTION INTEL:</p>
                      <p className="text-xs font-bold text-red-700 dark:text-red-400 italic">"{order.rejectionReason}"</p>
                    </div>
                  )}
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-4">
                        <span className="text-zinc-900 dark:text-white border border-zinc-900 dark:border-zinc-100 rounded-md w-8 h-8 flex items-center justify-center font-black italic">{item.quantity}x</span>
                        <span className="text-zinc-500 dark:text-zinc-400 font-bold tracking-tight uppercase text-sm">{item.name}</span>
                      </div>
                      <span className="font-black text-lg tracking-tighter text-zinc-900 dark:text-white italic">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
 
                <div className="pt-6 border-t border-zinc-50 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[8px] font-black tracking-[0.2em] text-zinc-400 mb-1 uppercase">Paid</p>
                      <p className="text-3xl font-black italic tracking-tighter text-orange-600 leading-none">₹{order.total}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black tracking-[0.2em] text-zinc-400 mb-1 uppercase italic">Method</p>
                      <div className="inline-block px-3 py-1 bg-zinc-900 dark:bg-white rounded-lg text-[8px] font-black text-white dark:text-zinc-900 tracking-widest uppercase">{order.paymentMethod}</div>
                    </div>
                  </div>
                   
                  <div className="flex flex-col md:items-end gap-4 flex-1 md:flex-none">
                    {order.deliveryBoyName && (
                      <div className="text-left md:text-right bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50 w-full">
                        <p className="text-[8px] font-black tracking-widest text-blue-500 mb-1 uppercase">Delivery Partner</p>
                        <div className="flex items-center md:justify-end gap-1.5 text-zinc-900 dark:text-white font-black mb-0.5 italic text-sm">
                          <Truck size={14} className="text-blue-600" /> {order.deliveryBoyName}
                        </div>
                        {order.deliveryBoyPhone && (
                          <a href={`tel:${order.deliveryBoyPhone}`} className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                            Call: {order.deliveryBoyPhone}
                          </a>
                        )}
                      </div>
                    )}
                    <div className="text-left md:text-right bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 w-full">
                      <p className="text-[8px] font-black tracking-widest text-zinc-400 mb-1 uppercase">Destination</p>
                      <div className="flex items-center md:justify-end gap-1.5 text-zinc-900 dark:text-white font-black mb-0.5 italic text-xs">
                        {order.deliveryAddress}
                      </div>
                    </div>
                    
                    {['pending', 'confirmed', 'preparing'].includes(order.status) && (
                      <div className="flex items-center gap-3">
                        {confirmingCancelId === order.id ? (
                          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 p-2 rounded-xl border border-red-100 dark:border-red-900/30">
                            <span className="text-[8px] font-black tracking-widest text-red-600 uppercase italic">Sure?</span>
                            <button 
                              onClick={() => handleCancelOrder(order.id!)}
                              disabled={cancellingId === order.id}
                              className="text-[9px] font-black tracking-widest bg-red-600 text-white px-3 py-1 rounded-lg uppercase italic transition-all hover:bg-red-700 disabled:opacity-50"
                            >
                              {cancellingId === order.id ? '...' : 'YES CANCEL'}
                            </button>
                            <button 
                              onClick={() => setConfirmingCancelId(null)}
                              className="text-[9px] font-black tracking-widest text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 uppercase italic transition-all"
                            >
                              KEEP
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmingCancelId(order.id!)}
                            className="text-[9px] font-black tracking-widest text-red-500 hover:text-red-600 uppercase italic flex items-center gap-1.5 transition-all hover:translate-x-1"
                          >
                            CANCEL ORDER <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    )}

                    {order.status === 'delivered' && !order.hasBeenReviewed && (
                      <button 
                        onClick={() => setReviewingOrder(order)}
                        className="text-[9px] font-black tracking-widest text-orange-600 hover:text-orange-700 uppercase italic flex items-center gap-1.5 transition-all hover:translate-x-1"
                      >
                        RATE & REVIEW <Star size={14} />
                      </button>
                    )}

                    {order.hasBeenReviewed && (
                      <div className="text-[9px] font-black tracking-widest text-green-600 uppercase italic flex items-center gap-1.5 ">
                        REVIEWED <CheckCircle2 size={14} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {reviewingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-zinc-100 dark:border-zinc-800"
            >
              <div className="p-8 border-b border-zinc-50 dark:border-zinc-800 relative">
                <button 
                  onClick={() => setReviewingOrder(null)}
                  className="absolute right-8 top-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <h3 className="text-[10px] font-black tracking-[0.3em] text-orange-600 uppercase mb-2">Review</h3>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none dark:text-white">
                  Rate <span className="text-zinc-400">{reviewingOrder.restaurantName}</span>
                </h2>
              </div>

              <div className="p-8 space-y-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`transition-all hover:scale-110 active:scale-95 ${star <= rating ? (RATING_COLORS[rating as keyof typeof RATING_COLORS] || 'text-orange-500') : 'text-zinc-200 dark:text-zinc-800'}`}
                      >
                        <Star size={48} fill={star <= rating ? 'currentColor' : 'none'} strokeWidth={1} />
                      </button>
                    ))}
                  </div>
                  <p className={`text-[10px] font-black tracking-widest uppercase italic ${RATING_COLORS[rating as keyof typeof RATING_COLORS]}`}>
                    {rating === 5 ? 'Excellent' : rating === 4 ? 'Great' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
                  </p>
                </div>

                <div className="relative group">
                  <textarea
                    placeholder="Tell us what you liked (or didn't)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold tracking-tight text-zinc-900 dark:text-white min-h-[120px] focus:ring-4 focus:ring-orange-500/10 transition-all outline-none resize-none"
                  />
                </div>

                <button 
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-xs font-black tracking-[0.2em] uppercase italic flex items-center justify-center gap-3 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
                >
                  {submittingReview ? 'LOGGING...' : 'SUBMIT REVIEW'} <Send size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Orders;

import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, Minus, Plus, CreditCard, Truck, ShieldCheck, ArrowRight, Ticket, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { orderService, couponService } from '../services/firebaseService';
import { Coupon } from '../types';

const Cart: React.FC = () => {
  const { items, updateQuantity, removeFromCart, total, clearCart } = useCart();
  const { user, profile, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [isPlacing, setIsPlacing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'RAZORPAY'>('RAZORPAY');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const discount = appliedCoupon ? (total * appliedCoupon.discountPercent) / 100 : 0;
  const finalTotal = total + 15 - discount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidating(true);
    setCouponError('');
    try {
      const coupon = await couponService.validateCoupon(couponCode);
      if (coupon) {
        setAppliedCoupon(coupon);
        setCouponCode('');
      } else {
        setCouponError('Invalid or inactive coupon');
      }
    } catch (err) {
      setCouponError('Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const handleRazorpay = () => {
    const options = {
      key: 'rzp_test_Si4QbxZcH9TMoe',
      amount: Math.round(finalTotal * 100),
      currency: 'INR',
      name: 'NEXUS FOODS',
      description: 'Order Payment',
      handler: function (response: any) {
        console.log("Payment Success:", response);
        confirmOrder();
      },
      prefill: {
        name: profile?.name || user?.displayName || 'User',
        email: user?.email || '',
      },
      theme: {
        color: '#EA580C',
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const confirmOrder = async () => {
    if (!user || items.length === 0) return;
    setIsPlacing(true);
    
    // Pick restaurant info from the first item (assuming same restaurant for all items)
    const restaurantId = items[0].restaurantId || 'unknown';
    const restaurantName = items[0].restaurantName || 'RESTAURANT';

    try {
      await orderService.createOrder({
        userId: user.uid,
        userName: profile?.name || user.displayName || 'User',
        userEmail: user.email || '',
        restaurantId: restaurantId,
        restaurantName: restaurantName,
        items: items,
        total: finalTotal,
        status: 'confirmed',
        deliveryAddress: profile?.deliveryAddress || 'Vakola, Mumbai',
        pincode: profile?.pincode || '400055',
        paymentMethod: paymentMethod,
      });
      clearCart();
      navigate('/orders');
    } catch (error) {
      console.error("Order failed:", error);
    } finally {
      setIsPlacing(false);
      setShowConfirmModal(false);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      loginWithGoogle();
      return;
    }
    if (items.length === 0) return;
    setShowConfirmModal(true);
  };

  const processFinalOrder = () => {
    if (paymentMethod === 'RAZORPAY') {
      handleRazorpay();
    } else {
      confirmOrder();
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-32 text-center">
        <h2 className="text-9xl font-black italic tracking-tighter uppercase mb-6 opacity-5 select-none dark:text-white">Empty</h2>
        <p className="text-zinc-400 font-bold tracking-widest uppercase mb-12">Your cravings are waiting to be fulfilled.</p>
        <button 
          onClick={() => navigate('/')}
          className="btn-primary"
        >
          START EXPLORING
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex flex-col lg:flex-row gap-8">
        <AnimatePresence>
          {showConfirmModal && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowConfirmModal(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-zinc-950 rounded-[2rem] p-8 z-[101] shadow-2xl border-2 border-zinc-100 dark:border-zinc-800"
              >
                <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-6 dark:text-white">Review <span className="text-orange-600">Order</span></h3>
                
                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase mb-1">ADDRESS</p>
                    <p className="font-bold text-zinc-900 dark:text-white text-sm">{profile?.deliveryAddress || 'Vakola, Mumbai'}</p>
                    <p className="text-[10px] font-black text-orange-600 mt-0.5">PIN: {profile?.pincode || '400055'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-center border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase mb-0.5">To Pay</p>
                      <p className="text-xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase">₹{finalTotal}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-center border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase mb-0.5">Method</p>
                      <p className="text-[10px] font-black text-zinc-900 dark:text-white uppercase">{paymentMethod === 'RAZORPAY' ? 'Online' : 'Cash'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={processFinalOrder}
                    disabled={isPlacing}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-black tracking-widest text-[10px] uppercase shadow-lg transition-all active:scale-95"
                  >
                    {isPlacing ? 'PROCESSING...' : 'INITIALIZE ORDER'}
                  </button>
                  <button 
                    onClick={() => setShowConfirmModal(false)}
                    className="w-full text-zinc-400 py-2 rounded-xl font-black tracking-widest text-[8px] uppercase transition-all hover:text-zinc-600"
                  >
                    BACK
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex-1">
          <header className="flex items-end justify-between mb-10">
            <div>
              <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none dark:text-white">Your <span className="text-orange-600">Basket</span></h1>
              <p className="text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase mt-3 italic">{items.length} SELECTIONS READY</p>
            </div>
            <button onClick={clearCart} className="bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all flex items-center gap-2">
              <Trash2 size={14} /> Wipe
            </button>
          </header>

          <div className="space-y-4 mb-10">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="p-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[1.5rem] flex items-center gap-5 shadow-sm"
                >
                  <div className="relative group shrink-0">
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover shadow" />
                    <button 
                      onClick={() => removeFromCart(item.id)} 
                      className="absolute -top-2 -left-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
 
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                      <h3 className="text-lg font-black italic tracking-tight text-zinc-900 dark:text-white uppercase leading-none">{item.name}</h3>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden p-0.5">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-white dark:hover:bg-zinc-900 rounded transition-colors dark:text-white"><Minus size={12} /></button>
                        <span className="px-2 text-xs font-black w-8 text-center dark:text-white">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-white dark:hover:bg-zinc-900 rounded transition-colors dark:text-white"><Plus size={12} /></button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white leading-none">₹{item.price * item.quantity}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="p-6 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2rem] flex items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-600 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="text-lg font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase leading-none mb-1">Safe Protocol</h4>
              <p className="text-[8px] text-zinc-400 uppercase font-black tracking-widest">Hygiene levels strictly maintained.</p>
            </div>
          </div>
        </div>
 
        <div className="lg:w-[380px] shrink-0">
          <div className="sticky top-24 p-8 bg-white dark:bg-zinc-950 rounded-[2.5rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-xl">
            <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-8 leading-none dark:text-white">Summary</h2>
            
            <div className="space-y-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black tracking-[0.2em] text-zinc-400 block mb-2 uppercase ml-3">ADDRESS</label>
                  <input 
                    type="text" 
                    value={profile?.deliveryAddress || 'Vakola, Mumbai'} 
                    className="w-full bg-[var(--input-bg)] border border-zinc-100 dark:border-zinc-800 font-bold text-zinc-900 dark:text-white py-3 px-4 rounded-xl text-xs outline-none" 
                    readOnly 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black tracking-[0.2em] text-zinc-400 block mb-2 uppercase ml-3">PIN</label>
                  <input 
                    type="text" 
                    value={profile?.pincode || '400055'} 
                    className="w-full bg-[var(--input-bg)] border border-zinc-100 dark:border-zinc-800 font-bold text-zinc-900 dark:text-white py-3 px-4 rounded-xl text-xs outline-none" 
                    readOnly 
                  />
                </div>
              </div>
 
            <div>
                <p className="text-[9px] font-black tracking-[0.3em] text-zinc-400 uppercase mb-3 ml-3">Payment</p>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setPaymentMethod('RAZORPAY')}
                    className={`py-3 px-3 rounded-lg border-2 font-black tracking-widest text-[8px] transition-all text-center flex flex-col items-center justify-center gap-1.5 ${paymentMethod === 'RAZORPAY' ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-black' : 'bg-transparent border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}
                  >
                    <CreditCard size={14} />
                    <span>PAY ONLINE</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('COD')}
                    className={`py-3 px-3 rounded-lg border-2 font-black tracking-widest text-[8px] transition-all text-center flex flex-col items-center justify-center gap-1.5 ${paymentMethod === 'COD' ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-black' : 'bg-transparent border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}
                  >
                    <Truck size={14} />
                    <span>CASH ON DELIVERY</span>
                  </button>
                </div>
              </div>
            </div>
 
            <div className="space-y-2 mb-6 pt-6 border-t border-zinc-50 dark:border-zinc-800 text-[10px] font-black tracking-widest text-zinc-400">
              <div className="flex justify-between uppercase">
                <span>Base</span>
                <span className="text-zinc-900 dark:text-white">₹{total}</span>
              </div>
              <div className="flex justify-between uppercase">
                <span>Tax</span>
                <span className="text-zinc-900 dark:text-white">₹15</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between uppercase text-orange-600">
                  <span>Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
            </div>

            <div className="mb-8">
              <p className="text-[9px] font-black tracking-[0.2em] text-zinc-400 uppercase mb-3 ml-3 italic">Applied Coupons</p>
              {!appliedCoupon ? (
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="ENTER CODE"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 py-4 px-6 rounded-xl text-[10px] font-black tracking-widest dark:text-white outline-none focus:ring-4 focus:ring-orange-500/10 transition-all uppercase" 
                  />
                  <button 
                    onClick={handleApplyCoupon}
                    disabled={isValidating || !couponCode}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-orange-600 text-white rounded-lg text-[8px] font-black tracking-widest uppercase disabled:opacity-30"
                  >
                    {isValidating ? '...' : 'APPLY'}
                  </button>
                  {couponError && <p className="text-[8px] font-black tracking-widest text-red-500 uppercase mt-2 ml-3 italic">{couponError}</p>}
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black tracking-widest text-orange-600 uppercase">{appliedCoupon.code}</p>
                  </div>
                  <button onClick={removeCoupon} className="text-orange-600">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
 
            <div className="mb-8">
              <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase italic">Grand Total</span>
              <div className="text-4xl font-black italic tracking-tighter text-orange-600 leading-none">₹{finalTotal}</div>
            </div>
 
            <button 
              onClick={handleCheckout}
              disabled={isPlacing}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 py-4 rounded-2xl font-black tracking-widest text-xs uppercase shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {isPlacing ? 'SYNCING...' : 'FINALIZE ORDER'}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;

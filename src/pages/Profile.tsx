import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, MapPin, Hash, Shield, CheckCircle, Lock, Key, ChevronDown, ChevronUp, ArrowRight, BarChart3, ShoppingBag, CreditCard, Activity, Star, MessageSquare, Trash2, Edit3, Send, X, UtensilsCrossed } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { userService, orderService, reviewService, appealService } from '../services/firebaseService';
import { Order, Review, Appeal } from '../types';

const RATING_COLORS = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-yellow-500',
  4: 'text-lime-500',
  5: 'text-green-500'
};

const Profile: React.FC = () => {
  const { user, profile, updateProfileState } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showManageReviews, setShowManageReviews] = useState(false);
  
  // Review management states
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // OWNER APPLICATION STATES
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [userAppeals, setUserAppeals] = useState<Appeal[]>([]);
  const [ownerFormData, setOwnerFormData] = useState({
    restaurantName: '',
    restaurantAddress: '',
    reason: ''
  });

  useEffect(() => {
    if (user) {
      loadUserReviews();
      loadUserAppeals();
    }
  }, [user]);

  const loadUserAppeals = async () => {
    if (!user) return;
    try {
      const data = await appealService.getUserAppeals(user.uid);
      setUserAppeals(data || []);
    } catch (error) {
       console.error("Failed to load appeals:", error);
    }
  };

  const getPendingOwnerRequest = () => {
    return userAppeals.find(a => a.type === 'owner_request' && a.status === 'pending');
  };

  const getRejectionCooldown = () => {
    const rejectedOwnerAppeals = userAppeals.filter(a => a.type === 'owner_request' && a.status === 'rejected');
    if (rejectedOwnerAppeals.length === 0) return null;
    
    const rejectedApp = rejectedOwnerAppeals[0];
    const rejectionTime = (rejectedApp as any).updatedAt?.seconds || (rejectedApp as any).createdAt?.seconds;
    if (!rejectionTime) return null;

    const rejectionDate = new Date(rejectionTime * 1000);
    const cooldownPeriod = 7 * 24 * 60 * 60 * 1000;
    const now = new Date();
    
    if (now.getTime() - rejectionDate.getTime() < cooldownPeriod) {
      const remainingDays = Math.ceil((cooldownPeriod - (now.getTime() - rejectionDate.getTime())) / (24 * 60 * 60 * 1000));
      return { days: remainingDays, note: rejectedApp.adminNote };
    }
    return null;
  };

  const handleApplyOwner = async () => {
    if (!user || !ownerFormData.restaurantName || !ownerFormData.restaurantAddress || !ownerFormData.reason) return;
    setIsSubmittingApp(true);
    try {
      await appealService.submitAppeal({
        restaurantName: ownerFormData.restaurantName,
        restaurantAddress: ownerFormData.restaurantAddress,
        reason: ownerFormData.reason,
        ownerId: user.uid,
        ownerEmail: user.email || '',
        type: 'owner_request'
      });
      setShowOwnerForm(false);
      setOwnerFormData({ restaurantName: '', restaurantAddress: '', reason: '' });
      await loadUserAppeals();
      alert("APPLICATION SUBMITTED: Your beacon request is now under Command Center review.");
    } catch (error) {
      console.error(error);
      alert("SUBMISSION FAILED: Signal interference detected.");
    } finally {
      setIsSubmittingApp(false);
    }
  };

  const loadUserReviews = async () => {
    if (!user) return;
    try {
      const data = await reviewService.getUserReviews(user.uid);
      setUserReviews(data || []);
    } catch (error) {
      console.error("Failed to load user reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleDeleteReview = async (review: Review) => {
    setDeletingId(review.id!);
    try {
      await reviewService.deleteReview(review.id!, review.orderId);
      setUserReviews(userReviews.filter(r => r.id !== review.id));
      setConfirmingDeleteId(null);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartEdit = (review: Review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  const handleUpdateReview = async () => {
    if (!editingReview) return;
    setIsUpdatingReview(true);
    try {
      await reviewService.updateReview(editingReview.id!, {
        rating: editRating,
        comment: editComment
      });
      setUserReviews(userReviews.map(r => r.id === editingReview.id ? { ...r, rating: editRating, comment: editComment, isEdited: true } : r));
      setEditingReview(null);
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setIsUpdatingReview(false);
    }
  };

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    lastStatus: 'No orders'
  });
  
  const [formData, setFormData] = useState({
    name: profile?.name || user?.displayName || '',
    deliveryAddress: profile?.deliveryAddress || '',
    pincode: profile?.pincode || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
  });

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || user?.displayName || '',
        deliveryAddress: profile.deliveryAddress || '',
        pincode: profile.pincode || '',
      });
    }
  }, [profile, user]);

  const fetchUserStats = async () => {
    try {
      const userOrders = await orderService.getUserOrders(user!.uid);
      if (userOrders) {
        const spent = userOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);
        setStats({
          totalOrders: userOrders.length,
          totalSpent: spent,
          lastStatus: userOrders[0]?.status || 'No orders'
        });
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  };

   const [pincodeError, setPincodeError] = useState('');

  const handleSave = async () => {
    if (user) {
      setPincodeError('');
      if (!/^\d{6}$/.test(formData.pincode)) {
        setPincodeError('Pincode must be exactly 6 digits');
        return;
      }

      setIsSaving(true);
      setSaveSuccess(false);
      try {
        const updatedProfile = {
          uid: user.uid,
          email: user.email || '',
          name: formData.name,
          deliveryAddress: formData.deliveryAddress,
          pincode: formData.pincode,
          isAdmin: profile?.isAdmin || false,
          isRestaurantOwner: profile?.isRestaurantOwner || false,
          restaurantId: profile?.restaurantId || '',
          createdAt: profile?.createdAt || new Date().toISOString()
        };
        await userService.saveUserProfile(updatedProfile);
        updateProfileState(updatedProfile);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        console.error('Error saving profile:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleUpdatePassword = async () => {
    if (!user || !user.email) return;
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setPasswordError('Both fields are required');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);

    try {
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.newPassword);
      
      setPasswordSuccess(true);
      setPasswordData({ currentPassword: '', newPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (error: any) {
      console.error('Password update error:', error);
      setPasswordError(error.message || 'Failed to update password. Ensure current password is correct.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!user) return <div className="text-center py-32 font-black uppercase text- zinc-200">Session Expired</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl mb-8 w-fit border border-zinc-200 dark:border-zinc-800 transition-colors">
        <button className="px-6 py-2.5 bg-white dark:bg-zinc-100 text-zinc-900 dark:text-zinc-900 rounded-lg text-[8px] font-black tracking-[0.15em] uppercase shadow-sm">PROFILE INFO</button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm relative overflow-hidden group"
        >
          <div className="relative z-10">
            <div className="w-8 h-8 bg-orange-50 dark:bg-orange-950/20 rounded-lg flex items-center justify-center mb-3">
              <ShoppingBag className="text-orange-600" size={16} />
            </div>
            <p className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase mb-0.5">Total Orders</p>
            <h3 className="text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase leading-none">{stats.totalOrders}</h3>
          </div>
          <div className="absolute -right-2 -bottom-2 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-500">
             <ShoppingBag size={100} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm relative overflow-hidden group"
        >
          <div className="relative z-10">
            <div className="w-8 h-8 bg-green-50 dark:bg-green-950/20 rounded-lg flex items-center justify-center mb-3">
              <CreditCard className="text-green-600" size={16} />
            </div>
            <p className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase mb-0.5">Total Spent</p>
            <h3 className="text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase leading-none">₹{stats.totalSpent.toFixed(2)}</h3>
          </div>
          <div className="absolute -right-2 -bottom-2 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-500">
             <CreditCard size={100} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm relative overflow-hidden group"
        >
          <div className="relative z-10">
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/20 rounded-lg flex items-center justify-center mb-3">
              <Activity className="text-blue-600" size={16} />
            </div>
            <p className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase mb-0.5">Last Status</p>
            <h3 className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase leading-none truncate">{stats.lastStatus}</h3>
          </div>
          <div className="absolute -right-2 -bottom-2 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-500">
             <Activity size={100} />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm transition-colors duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-950 rounded-xl flex items-center justify-center text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 shadow-inner">
                <span className="font-black text-xs uppercase">ID</span>
              </div>
              <div>
                <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-1 dark:text-white">Profile <span className="text-orange-600">Info</span></h1>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="text-[9px] font-black tracking-[0.2em] text-zinc-400 block mb-2 uppercase ml-3">Username</label>
                  <div className="relative group">
                    <input 
                      id="profile-name"
                      type="text" 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 py-4 px-6 text-lg font-black tracking-tight rounded-xl focus:ring-4 focus:ring-orange-500/10 transition-all text-zinc-900 dark:text-white" 
                      placeholder="Enter your name"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[9px] font-black tracking-[0.2em] text-zinc-400 block mb-2 uppercase flex items-center gap-2 ml-3">
                    Email {user.emailVerified && <CheckCircle size={10} className="text-orange-600" />}
                  </label>
                  <div className="relative group">
                    <input 
                      id="profile-email"
                      type="email" 
                      value={user.email || ''} 
                      readOnly 
                      className="w-full px-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 py-4 text-zinc-400 dark:text-zinc-600 font-black tracking-tight text-base rounded-xl cursor-not-allowed" 
                    />
                  </div>
                </div>
                 <div>
                  <label className="text-[9px] font-black tracking-[0.2em] text-zinc-400 block mb-2 uppercase ml-3">PIN Code</label>
                  <div className="relative group">
                     <input 
                      id="profile-pincode"
                      type="text" 
                      value={formData.pincode} 
                      onChange={(e) => {
                        setFormData({...formData, pincode: e.target.value});
                        setPincodeError('');
                      }}
                      placeholder="400055"
                      className={`w-full px-6 bg-zinc-50 dark:bg-zinc-950 border ${pincodeError ? 'border-red-500' : 'border-zinc-100 dark:border-zinc-800'} py-4 text-lg font-black tracking-tighter rounded-xl focus:ring-4 focus:ring-orange-500/10 transition-all text-zinc-900 dark:text-white`} 
                    />
                  </div>
                  {pincodeError && <p className="text-[8px] font-black tracking-widest text-red-500 uppercase mt-2 ml-3 italic">{pincodeError}</p>}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black tracking-[0.2em] text-zinc-400 block mb-2 uppercase italic ml-3">delivery address</label>
                <div className="relative group">
                  <input 
                    id="profile-address"
                    type="text" 
                    value={formData.deliveryAddress} 
                    onChange={(e) => setFormData({...formData, deliveryAddress: e.target.value})}
                    placeholder="Sector 45, Downtown"
                    className="w-full px-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 py-4 text-lg font-black tracking-tight rounded-xl focus:ring-4 focus:ring-orange-500/10 transition-all text-zinc-900 dark:text-white" 
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-4 rounded-xl font-black italic tracking-[0.1em] uppercase transition-all active:scale-[0.98] text-sm shadow-md min-w-[160px]"
                >
                  {isSaving ? 'SYNCING...' : 'UPDATE'}
                </button>
                {saveSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-green-600 font-black italic uppercase text-[10px] tracking-widest"
                  >
                    <CheckCircle size={16} />
                    Protocols Updated
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Manage Reviews Toggle Button */}
          <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-[2rem] shadow-lg relative overflow-hidden group">
            <button 
              onClick={() => setShowManageReviews(true)}
              className="w-full flex items-center justify-between group relative z-10"
            >
              <div className="flex items-center gap-3 text-left">
                <Star className="text-orange-500" size={20} />
                <div>
                  <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none text-white">Manage Reviews</h2>
                  <p className="text-[8px] font-black tracking-[0.1em] uppercase text-zinc-500 italic mt-1">Edit or Delete feedback</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-white group-hover:translate-x-1 transition-all" />
            </button>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
              <Star size={120} className="text-white" />
            </div>
          </div>

          <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-black italic tracking-tighter uppercase italic leading-none dark:text-white">Auth</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black tracking-[0.1em] text-zinc-400 block mb-2 uppercase italic ml-3">current pass</label>
                <div className="relative group">
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full px-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 py-3.5 rounded-xl text-sm font-black text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700 focus:ring-4 focus:ring-orange-500/10 transition-all"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-[8px] font-black tracking-[0.1em] text-zinc-400 block mb-2 uppercase italic ml-3">new pass</label>
                <div className="relative group">
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full px-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 py-3.5 rounded-xl text-sm font-black text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700 focus:ring-4 focus:ring-orange-500/10 transition-all" 
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  />
                </div>
              </div>

              {passwordError && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest leading-none px-2">{passwordError}</p>}
              {passwordSuccess && <p className="text-[9px] font-black text-green-600 uppercase tracking-widest leading-none px-2">Updated</p>}

              <button 
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword}
                className="w-full bg-zinc-100 dark:bg-zinc-950 text-zinc-400 py-3 rounded-lg font-black tracking-[0.1em] uppercase text-[8px] hover:bg-zinc-900 dark:hover:bg-white hover:text-white dark:hover:text-zinc-900 transition-all italic"
              >
                {isUpdatingPassword ? 'UPDATING...' : 'SAVE PASSWORD'}
              </button>
            </div>
          </div>

          <div className="p-8 bg-orange-400 dark:bg-orange-500 border border-orange-300 dark:border-orange-400 rounded-[2rem] shadow-lg shadow-orange-400/20 relative overflow-hidden group">
            <button 
              onClick={() => setShowPrivacy(true)}
              className="w-full flex items-center justify-between group relative z-10"
            >
              <div className="flex items-center gap-3 text-left">
                <Shield className="text-white" size={20} />
                <div>
                  <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none text-white">Trust & Privacy</h2>
                  <p className="text-[8px] font-black tracking-[0.1em] uppercase text-orange-50 italic mt-1">Read protocols</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-white group-hover:translate-x-1 transition-all" />
            </button>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
              <Shield size={120} className="text-white" />
            </div>
          </div>

          {!profile?.isRestaurantOwner && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-8 bg-zinc-900 border border-emerald-500/30 rounded-[2rem] shadow-xl relative overflow-hidden group"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <UtensilsCrossed size={20} className="text-emerald-500" />
                  <h2 className="text-xl font-black italic tracking-tighter uppercase text-white leading-none">Partner Up</h2>
                </div>
                
                {getPendingOwnerRequest() ? (
                   <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mb-4">
                     <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Status: SIGNAL PENDING</p>
                     <p className="text-[9px] text-zinc-400 font-bold uppercase leading-relaxed">Your application is currently being analyzed by the Admin Council. Stay tuned.</p>
                   </div>
                ) : getRejectionCooldown() ? (
                   <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-4">
                     <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Status: SIGNAL REJECTED</p>
                     <p className="text-[9px] text-zinc-400 font-bold uppercase leading-relaxed mb-2">Wait {getRejectionCooldown()?.days} days to re-apply.</p>
                     {getRejectionCooldown()?.note && (
                       <p className="text-[8px] text-red-400/60 font-black uppercase tracking-tight italic">Admin Note: {getRejectionCooldown()?.note}</p>
                     )}
                   </div>
                ) : (
                  <>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-6 leading-relaxed">
                      Start your own restaurant beacon and reach thousands of local customers.
                    </p>
                    <button 
                      onClick={() => setShowOwnerForm(true)}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] tracking-widest uppercase rounded-xl transition-all shadow-lg active:scale-95"
                    >
                      ACTIVATE OWNER PROTOCOL
                    </button>
                  </>
                )}
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-[0.05] grayscale group-hover:scale-110 transition-transform duration-700">
                <UtensilsCrossed size={160} className="text-white" />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editingReview && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-50 dark:bg-zinc-950 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="p-8 border-b border-zinc-50 dark:border-zinc-800 relative">
                <button 
                  onClick={() => setEditingReview(null)}
                  className="absolute right-8 top-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <h3 className="text-[10px] font-black tracking-[0.3em] text-orange-600 uppercase mb-2">Editor</h3>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none dark:text-white">
                  Update <span className="text-zinc-400">Review</span>
                </h2>
              </div>

              <div className="p-8 space-y-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setEditRating(star)}
                        className={`transition-all hover:scale-110 active:scale-95 ${star <= editRating ? (RATING_COLORS[editRating as keyof typeof RATING_COLORS] || 'text-orange-500') : 'text-zinc-200 dark:text-zinc-800'}`}
                      >
                        <Star size={40} fill={star <= editRating ? 'currentColor' : 'none'} strokeWidth={1} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative group">
                  <textarea
                    placeholder="Update your feedback..."
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl py-4 px-6 text-sm font-bold tracking-tight text-zinc-900 dark:text-white min-h-[100px] focus:ring-4 focus:ring-orange-500/10 transition-all outline-none resize-none"
                  />
                </div>

                <button 
                  onClick={handleUpdateReview}
                  disabled={isUpdatingReview}
                  className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-xs font-black tracking-[0.2em] uppercase italic flex items-center justify-center gap-3 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
                >
                  {isUpdatingReview ? 'UPDATING...' : 'SAVE CHANGES'} <Send size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showManageReviews && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-50 dark:bg-zinc-950 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="p-8 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 relative">
                <button 
                  onClick={() => setShowManageReviews(false)}
                  className="absolute right-8 top-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <h3 className="text-[10px] font-black tracking-[0.3em] text-orange-600 uppercase mb-2">Control Panel</h3>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none dark:text-white">
                  Manage <span className="text-orange-600">Reviews</span>
                </h2>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4 scrollbar-hide">
                {reviewsLoading ? (
                   <div className="space-y-4">
                     {[1, 2, 3].map(i => (
                       <div key={i} className="h-24 bg-white dark:bg-zinc-900 rounded-2xl animate-pulse border border-zinc-100 dark:border-zinc-800" />
                     ))}
                   </div>
                ) : userReviews.length === 0 ? (
                  <div className="text-center py-20">
                    <Star size={48} className="mx-auto text-zinc-200 dark:text-zinc-800 mb-4" />
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">No reviews found in archive</p>
                  </div>
                ) : (
                  userReviews.map((review) => (
                    <div key={review.id} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl group flex justify-between items-center gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-sm font-black italic text-zinc-900 dark:text-white uppercase truncate">{review.restaurantName || 'Restaurant'}</h4>
                          <span className="text-[8px] font-black px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-400">
                             {new Date((review.createdAt?.seconds || Date.now()/1000) * 1000).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                           <div className={`flex items-center gap-0.5 text-[10px] font-black ${RATING_COLORS[review.rating as keyof typeof RATING_COLORS]}`}>
                              <Star size={12} fill="currentColor" /> {review.rating}
                           </div>
                           {review.isEdited && <span className="text-[9px] text-zinc-500 lowercase">(edited)</span>}
                        </div>
                        <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 italic line-clamp-1">"{review.comment}"</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {confirmingDeleteId === review.id ? (
                          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 px-4 py-2 rounded-xl border border-red-100 dark:border-red-900/30">
                            <span className="text-[8px] font-black tracking-widest text-red-600 uppercase italic">Delete?</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleDeleteReview(review)}
                                disabled={deletingId === review.id}
                                className="text-[9px] font-black tracking-widest text-red-600 hover:text-red-700 uppercase italic px-2 py-1 transition-all"
                              >
                                {deletingId === review.id ? '...' : 'YES'}
                              </button>
                              <button 
                                onClick={() => setConfirmingDeleteId(null)}
                                className="text-[9px] font-black tracking-widest text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 uppercase italic px-2 py-1 transition-all"
                              >
                                NO
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleStartEdit(review)}
                              className="p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-orange-600 rounded-xl transition-all hover:shadow-lg"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => setConfirmingDeleteId(review.id!)}
                              className="p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-xl transition-all hover:shadow-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOwnerForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[3rem] p-10 shadow-2xl border border-zinc-100 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center">
                    <UtensilsCrossed size={20} />
                  </div>
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase dark:text-white">Owner Application</h2>
                </div>
                <button 
                  onClick={() => setShowOwnerForm(false)}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-2 block italic">Restaurant Name</label>
                  <input 
                    type="text"
                    value={ownerFormData.restaurantName}
                    onChange={(e) => setOwnerFormData({...ownerFormData, restaurantName: e.target.value})}
                    placeholder="Enter Restaurant Name"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-4 rounded-xl text-xs font-black italic uppercase tracking-tighter dark:text-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-2 block italic">Location / Address</label>
                  <input 
                    type="text"
                    value={ownerFormData.restaurantAddress}
                    onChange={(e) => setOwnerFormData({...ownerFormData, restaurantAddress: e.target.value})}
                    placeholder="Physical HQ Address"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-4 rounded-xl text-xs font-black italic uppercase tracking-tighter dark:text-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-2 block italic">Reason to Start</label>
                  <textarea 
                    value={ownerFormData.reason}
                    onChange={(e) => setOwnerFormData({...ownerFormData, reason: e.target.value})}
                    placeholder="Briefly explain your vision..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-4 rounded-xl text-xs font-black italic uppercase tracking-tighter dark:text-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none min-h-[100px] resize-none"
                  />
                </div>

                <button 
                  onClick={handleApplyOwner}
                  disabled={isSubmittingApp || !ownerFormData.restaurantName || !ownerFormData.restaurantAddress || !ownerFormData.reason}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] tracking-[0.2em] uppercase rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3 italic"
                >
                  {isSubmittingApp ? 'TRANSMITTING...' : 'TRANSMIT APPLICATION'} <Send size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPrivacy && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrivacy(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[3rem] p-10 shadow-2xl border border-zinc-100 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center">
                    <Shield size={20} />
                  </div>
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase dark:text-white">Our Protocol</h2>
                </div>
                <button 
                  onClick={() => setShowPrivacy(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <Hash size={20} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                {[
                  { title: "Data Encryption", desc: "All personal data is encrypted using military-grade security protocols." },
                  { title: "Minimal Retention", desc: "We only store what is strictly necessary for delivery fulfillment." },
                  { title: "Zero Shared Access", desc: "Your identity data is never shared with third-party networks." },
                  { title: "Secure Sessions", desc: "Every authentication request is tokenized and short-lived." },
                  { title: "Right to Wipe", desc: "You can request immediate permanent deletion of your profile history." },
                  { title: "Transparent Tracking", desc: "Real-time logs of profile access are available upon request." },
                  { title: "Identity Shielding", desc: "We use placeholder tokens for restaurant-side communication." },
                  { title: "Zero Marketing Bloat", desc: "No unsolicited interface interruptions or communications." },
                  { title: "Local Storage", desc: "Preferences are stored locally when possible to enhance privacy." },
                  { title: "Protocol Integrity", desc: "Continuous red-team testing of our data safety architecture." },
                  { title: "Geolocation Guard", desc: "Precise location data is discarded instantly after delivery completion." },
                  { title: "Future Proof", desc: "Adaptive security patches applied automatically to your profile." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <span className="text-orange-600 font-black italic text-[10px] mt-1 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <p className="text-[10px] font-black tracking-widest uppercase italic text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      <span className="text-orange-600">{item.title}:</span> {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-zinc-50 dark:border-zinc-800">
                <button 
                  onClick={() => setShowPrivacy(false)}
                  className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black tracking-widest uppercase text-[10px] italic hover:opacity-90 transition-opacity"
                >
                  Confirm Awareness
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;


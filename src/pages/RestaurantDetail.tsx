import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RESTAURANTS, MENU_ITEMS } from '../constants';
import { Star, Clock, ChevronLeft, Minus, Plus, Utensils, Search, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { reviewService } from '../services/firebaseService';
import { Review } from '../types';

const RATING_COLORS = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-yellow-500',
  4: 'text-lime-500',
  5: 'text-green-500'
};

const RestaurantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [menuSearch, setMenuSearch] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  
  const restaurant = RESTAURANTS.find(r => r.id === id);
  const menu = MENU_ITEMS[id || ''] || [];
  const { items, addToCart, removeFromCart, updateQuantity } = useCart();

  useEffect(() => {
    if (id) {
      loadReviews();
    }
  }, [id]);

  const loadReviews = async () => {
    try {
      const data = await reviewService.getRestaurantReviews(id!);
      setReviews(data || []);
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  };

  if (!restaurant) return <div className="text-center py-24 font-black">Restaurant not found</div>;

  const filteredMenu = menu.filter(item => 
    item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
    item.description.toLowerCase().includes(menuSearch.toLowerCase())
  );

  const getItemQty = (itemId: string) => {
    return items.find(i => i.id === itemId)?.quantity || 0;
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors text-[9px] font-black tracking-widest uppercase"
      >
        <ChevronLeft size={14} /> Back
      </button>

      <div className="relative h-[180px] w-full rounded-[1.5rem] overflow-hidden mb-8 shadow-lg">
        <img 
          src={restaurant.image} 
          alt={restaurant.name} 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/10 to-transparent flex items-end p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between w-full gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-white mb-1 uppercase leading-none">
                {restaurant.name}
              </h1>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-green-400 font-black italic bg-white/10 px-2 py-1 rounded-lg backdrop-blur">
                  <Star size={14} fill="currentColor" /> {restaurant.rating}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-200 font-bold bg-white/10 px-2 py-1 rounded-lg backdrop-blur">
                  <Clock size={14} className="text-orange-400" /> {restaurant.deliveryTime} MIN
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-2 gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none dark:text-white">On the <span className="text-orange-600">Menu</span></h2>
          <span className="text-[9px] font-black tracking-[0.2em] text-zinc-400 uppercase italic">{filteredMenu.length} SELECTIONS</span>
        </div>

        <div className="relative group w-full md:w-56">
          <div className="absolute left-0 top-0 bottom-0 w-9 flex items-center justify-center transition-colors">
            <Search className="text-zinc-400 group-focus-within:text-orange-500 transition-colors" size={12} />
          </div>
          <input 
            type="text" 
            placeholder="Search signaling..." 
            className="pl-9 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 w-full text-xs font-bold tracking-tight rounded-xl focus:ring-4 focus:ring-orange-500/10 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AnimatePresence mode="popLayout">
          {filteredMenu.map((item, idx) => {
            const qty = getItemQty(item.id);
            return (
              <motion.div 
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="group p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-orange-500/30 transition-all flex gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {item.isVeg ? (
                      <div className="w-2.5 h-2.5 border-2 border-green-500 p-0.5"><div className="w-full h-full bg-green-500 rounded-full" /></div>
                    ) : (
                      <div className="w-2.5 h-2.5 border-2 border-red-500 p-0.5"><div className="w-full h-full bg-red-500 rounded-full" /></div>
                    )}
                    <h3 className="text-base font-black italic tracking-tight text-zinc-900 dark:text-white uppercase leading-none">{item.name}</h3>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-3 line-clamp-2">{item.description}</p>
                  <div className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter italic">₹{item.price}</div>
                </div>

                <div className="relative shrink-0">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-20 h-20 rounded-xl object-cover shadow-sm" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    {qty > 0 ? (
                      <div className="flex items-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg overflow-hidden shadow-lg border border-zinc-800 dark:border-zinc-200 p-0.5">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors rounded-md"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="w-6 text-center font-black text-xs">{qty}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors rounded-md"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCart({ ...item, restaurantId: restaurant.id, restaurantName: restaurant.name })}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded-lg font-black text-[8px] tracking-widest shadow-md transition-all active:scale-95 uppercase"
                      >
                        ADD +
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredMenu.length === 0 && (
        <div className="py-20 text-center">
          <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
            <Search className="text-zinc-300 dark:text-zinc-700" size={40} />
          </div>
          <h3 className="text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white mb-2 uppercase">No items found</h3>
          <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Try another search term</p>
        </div>
      )}

      {/* Reviews Section */}
      <div className="mt-20">
        <div className="flex items-center gap-3 mb-8">
          <MessageCircle className="text-orange-600" size={24} />
          <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none dark:text-white">Reviews</h2>
        </div>

        {reviewsLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
             {[1, 2, 3].map((n) => (
              <div key={n} className="min-w-[280px] h-32 bg-zinc-50 dark:bg-zinc-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-10 text-center">
            <Star size={32} className="mx-auto text-zinc-200 dark:text-zinc-800 mb-4" />
            <p className="text-xs font-black tracking-widest text-zinc-400 uppercase italic">No reviews yet. Be the first!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((review, idx) => (
              <motion.div 
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-2xl shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[8px] font-black tracking-widest text-zinc-400 uppercase mb-0.5">
                      {review.userName} {review.isEdited && <span className="text-[7px] text-zinc-500 dark:text-zinc-600 lowercase ml-1">(edited)</span>}
                    </p>
                    <p className="text-[7px] font-bold text-zinc-300 dark:text-zinc-700 uppercase">
                      {new Date((review.createdAt?.seconds || Date.now() / 1000) * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black italic border ${RATING_COLORS[review.rating as keyof typeof RATING_COLORS]} bg-current/5 border-current`}>
                    <Star size={10} fill="currentColor" /> {review.rating}
                  </div>
                </div>
                <p className="text-xs font-bold tracking-tight text-zinc-700 dark:text-zinc-300 italic">"{review.comment}"</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDetail;

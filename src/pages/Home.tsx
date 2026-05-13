import React, { useState, useEffect } from 'react';
import { MENU_ITEMS } from '../constants';
import { Search, Star, Clock, Filter, UtensilsCrossed, ArrowRight, Leaf, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { restaurantService, menuService } from '../services/firebaseService';
import { Restaurant, MenuItem } from '../types';

const ALL_CUISINES = ['All', 'Burgers', 'Italian', 'North Indian', 'South Indian', 'Mughlai', 'Mexican', 'Japanese', 'Desserts', 'Chinese'];

const Home: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchingItems, setSearchingItems] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubRestaurants = restaurantService.subscribeToActiveRestaurants((data) => {
      setRestaurants(data);
      setLoading(false);
    });

    return () => unsubRestaurants();
  }, []);

  // Handle debounced menu search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setMenuItems([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingItems(true);
      try {
        const results = await menuService.searchMenuItems(searchTerm);
        setMenuItems(results || []);
      } catch (err) {
        console.error("Global search failed:", err);
      } finally {
        setSearchingItems(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredRestaurants = restaurants.filter(r => {
    const term = searchTerm.toLowerCase();
    
    // Check if the search term matches restaurant name or cuisine
    const nameMatch = r.name.toLowerCase().includes(term);
    const cuisineMatch = r.cuisines?.some(c => c.toLowerCase().includes(term)) || false;
    
    // Check if the search term matches any menu item for this restaurant
    const menuMatch = menuItems.some(m => 
      m.restaurantId === r.id && 
      (m.name.toLowerCase().includes(term) || m.description.toLowerCase().includes(term))
    );

    const matchesSearch = searchTerm === '' || nameMatch || cuisineMatch || menuMatch;
    const matchesCuisine = selectedCuisine === 'All' || r.cuisines?.includes(selectedCuisine);
    const matchesVeg = !isVegOnly || r.isPureVeg;
    
    return matchesSearch && matchesCuisine && matchesVeg;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative h-[160px] md:h-[220px] w-full rounded-[2.5rem] overflow-hidden mb-12 group shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-black dark:via-zinc-900 dark:to-black" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=2070')] bg-cover bg-center mix-blend-overlay opacity-40 group-hover:scale-105 transition-transform duration-1000" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-black/20 via-transparent to-black/60">
           <motion.div
             initial={{ y: 20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ delay: 0.2 }}
           >
             <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white mb-2 uppercase leading-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
               ORDER. TRACK. <span className="text-orange-500 underline decoration-white/20 underline-offset-8">DEVOUR.</span>
             </h2>
             <p className="text-[9px] font-black tracking-[0.4em] text-zinc-300 uppercase mb-8 drop-shadow-md">Professional Cuisine Delivery Protocol v2.0</p>
           </motion.div>
           
             <div className="relative w-full max-w-lg group/search px-4">
               <input 
                 type="text" 
                 placeholder="Search food items (e.g. Biryani, Burger)..." 
                 className="w-full px-8 py-4.5 bg-white/10 dark:bg-black/40 backdrop-blur-xl border border-white/20 text-white font-bold text-sm rounded-[2rem] focus:ring-8 focus:ring-orange-500/20 focus:border-orange-500/50 focus:bg-white/20 outline-none transition-all placeholder:text-zinc-500 shadow-2xl relative z-0"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
               <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {searchingItems && (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"
                    />
                  )}
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="p-1 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white">
                      <X size={12} />
                    </button>
                  )}
               </div>
             </div>
        </div>
      </motion.div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
        <div className="flex items-center gap-4">
           <h2 className="text-3xl font-black italic tracking-tighter uppercase dark:text-white">Local <span className="text-orange-600">Favorites</span></h2>
           <button 
              onClick={() => setIsVegOnly(!isVegOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all border-2 shrink-0 ${
                isVegOnly 
                ? 'bg-green-600 text-white border-green-600 shadow-md' 
                : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-100 dark:border-zinc-800'
              }`}
            >
              <Leaf size={10} />
              VEG ONLY
            </button>
        </div>
        
        <div className="flex overflow-x-auto md:flex-wrap items-center gap-1.5 pb-1 scrollbar-hide">
          {ALL_CUISINES.map((cuisine) => (
            <button
              key={cuisine}
              onClick={() => setSelectedCuisine(cuisine)}
              className={`px-3 py-1.5 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all border-2 shrink-0 ${
                selectedCuisine === cuisine
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                : 'bg-white dark:bg-zinc-950 text-zinc-400 dark:text-zinc-600 border-zinc-100 dark:border-zinc-900 hover:border-zinc-300 shadow-sm'
              }`}
            >
              {cuisine}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-5 h-44 animate-pulse shadow-sm">
                <div className="flex gap-5 h-full">
                  <div className="w-32 h-32 bg-zinc-50 dark:bg-zinc-950 rounded-2xl shrink-0 border border-zinc-100/50 dark:border-zinc-800/50" />
                  <div className="flex-1 py-2 flex flex-col">
                    <div className="h-6 bg-zinc-50 dark:bg-zinc-950 w-3/4 rounded-lg mb-2" />
                    <div className="h-3 bg-zinc-50 dark:bg-zinc-950 w-1/2 rounded-lg" />
                    <div className="mt-auto space-y-2">
                       <div className="h-3 bg-zinc-50 dark:bg-zinc-950 w-1/3 rounded-lg" />
                       <div className="h-2 bg-zinc-50 dark:bg-zinc-950 w-1/4 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : filteredRestaurants.map((restaurant) => {
            const matchingItems = searchTerm ? menuItems.filter(m => 
              m.restaurantId === restaurant.id && 
              (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
               m.description.toLowerCase().includes(searchTerm.toLowerCase()))
            ) : [];

            return (
              <motion.div
                layout
                key={restaurant.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Link to={`/restaurant/${restaurant.id}`} className="block group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-5 hover:shadow-2xl hover:border-orange-500/20 transition-all h-full relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-600/0 via-orange-600/0 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="flex gap-5 h-full relative">
                    <div className="w-32 h-32 overflow-hidden rounded-2xl relative shrink-0 shadow-sm border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                      <img 
                        src={restaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070'} 
                        alt={restaurant.name} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      {restaurant.isPureVeg && (
                        <div className="absolute top-2 left-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur p-1 rounded-lg shadow-sm border border-green-500/20">
                          <Leaf size={10} className="text-green-600" fill="currentColor" />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-2 py-0.5 rounded-lg text-[9px] font-black text-orange-600 shadow-sm border border-zinc-100 dark:border-zinc-800">
                        {restaurant.rating || 0} ★
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col py-1">
                      <div className="mb-2">
                        <h3 className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white mb-0.5 uppercase group-hover:text-orange-600 transition-colors leading-tight">
                          {restaurant.name}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-1">
                          <p className="text-[8px] font-black tracking-widest text-zinc-400 uppercase">
                            {restaurant.cuisines.slice(0, 2).join(' • ')}
                          </p>
                          {restaurant.cuisines.length > 2 && (
                            <span className="text-[7px] font-black text-zinc-300 uppercase tracking-tighter">+{restaurant.cuisines.length - 2} more</span>
                          )}
                        </div>
                      </div>

                      {/* Matching Items Highlight */}
                      {searchTerm && matchingItems && matchingItems.length > 0 && (
                        <div className="mb-2 bg-orange-50 dark:bg-orange-950/20 p-2 rounded-xl border border-orange-100 dark:border-orange-900/20">
                          <p className="text-[7px] font-black text-orange-600 uppercase tracking-widest mb-1 italic">MATCHING ITEMS</p>
                          <div className="flex flex-wrap gap-1">
                            {matchingItems.slice(0, 2).map(item => (
                              <span key={item.id} className="text-[9px] font-bold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                {item.name}
                              </span>
                            ))}
                            {matchingItems.length > 2 && <span className="text-[8px] font-black text-zinc-400">+{matchingItems.length - 2}</span>}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-auto space-y-1.5">
                        <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-300 text-[9px] font-black italic">
                          <Clock size={12} className="text-orange-600" />
                          {restaurant.deliveryTime} MIN
                        </div>
                        <p className="text-[8px] font-black text-green-600 tracking-widest uppercase">FREE DELIVERY</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!loading && filteredRestaurants.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
              <UtensilsCrossed className="text-zinc-300 dark:text-zinc-700" size={40} />
            </div>
            {restaurants.length === 0 ? (
              <>
                <h3 className="text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white mb-2 uppercase">No restaurants yet</h3>
                <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Restaurant owners haven't joined yet. Check back soon!</p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white mb-2 uppercase">No matches found</h3>
                <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Try adjusting your filters or search term</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;

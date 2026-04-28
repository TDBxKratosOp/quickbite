import React, { useState } from 'react';
import { RESTAURANTS, MENU_ITEMS } from '../constants';
import { Search, Star, Clock, Filter, UtensilsCrossed, ArrowRight, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

const ALL_CUISINES = ['All', 'Burgers', 'Italian', 'North Indian', 'South Indian', 'Mughlai', 'Mexican', 'Japanese', 'Desserts', 'Chinese'];

const Home: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [isVegOnly, setIsVegOnly] = useState(false);

  const filteredRestaurants = RESTAURANTS.filter(r => {
    // Check if the search term matches restaurant name or cuisine
    const nameMatch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
    const cuisineMatch = r.cuisines.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Check if the search term matches any menu item
    const menuMatch = (MENU_ITEMS[r.id] || []).some(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesSearch = nameMatch || cuisineMatch || menuMatch;
    const matchesCuisine = selectedCuisine === 'All' || r.cuisines.includes(selectedCuisine);
    const matchesVeg = !isVegOnly || r.isPureVeg;
    
    return matchesSearch && matchesCuisine && matchesVeg;
  });

  const ALL_CUISINES = ['All', 'Burgers', 'Italian', 'North Indian', 'South Indian', 'Mughlai', 'Mexican', 'Japanese', 'Desserts', 'Chinese'];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white leading-none mb-2">
          QUICK<span className="text-orange-600">BITE</span>
        </h1>
        <p className="text-[9px] font-black tracking-[0.3em] text-zinc-400 uppercase mb-6">
          Fastest Delivery in City Center
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative group w-full md:w-72">
              <input 
                id="restaurant-search"
                type="text" 
                placeholder="Search food, restaurants..." 
                className="px-6 py-2.5 bg-[var(--input-bg)] border border-zinc-200 dark:border-zinc-800 w-full text-xs font-bold tracking-tight rounded-xl shadow-sm focus:ring-4 focus:ring-orange-500/10 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button 
              onClick={() => setIsVegOnly(!isVegOnly)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all border-2 ${
                isVegOnly 
                ? 'bg-green-600 text-white border-green-600 shadow-md' 
                : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-100 dark:border-zinc-800'
              }`}
            >
              <Leaf size={12} />
              Pure Veg
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {ALL_CUISINES.map((cuisine) => (
              <button
                key={cuisine}
                onClick={() => setSelectedCuisine(cuisine)}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all border-2 ${
                  selectedCuisine === cuisine
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white'
                  : 'bg-white dark:bg-zinc-950 text-zinc-400 dark:text-zinc-600 border-zinc-100 dark:border-zinc-900 hover:border-zinc-300'
                }`}
              >
                {cuisine}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
          {filteredRestaurants.map((restaurant, idx) => {
            const matchingItems = searchTerm && (MENU_ITEMS[restaurant.id] || []).filter(m => 
              m.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

            return (
              <motion.div
                layout
                key={restaurant.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Link to={`/restaurant/${restaurant.id}`} className="block group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[1.5rem] p-4 hover:shadow-lg transition-all h-full">
                  <div className="flex flex-col sm:flex-row gap-4 h-full">
                    <div className="w-full sm:w-32 h-32 overflow-hidden rounded-xl relative shrink-0">
                      <img 
                        src={restaurant.image} 
                        alt={restaurant.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 right-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-1.5 py-0.5 rounded-lg text-[8px] font-black text-orange-600 shadow-sm border border-zinc-100 dark:border-zinc-800">
                        {restaurant.rating} ★
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white mb-0.5 uppercase group-hover:text-orange-600 transition-colors">
                          {restaurant.name}
                        </h3>
                        
                        <p className="text-[8px] font-black tracking-[0.1em] text-zinc-400 uppercase mb-2">
                          {restaurant.cuisines.slice(0, 2).join(' • ')}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-300 text-[9px] font-black italic">
                          <Clock size={12} className="text-orange-600" />
                          {restaurant.deliveryTime} MIN
                        </div>
                        <div className="w-8 h-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-lg flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-sm">
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredRestaurants.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
              <UtensilsCrossed className="text-zinc-300 dark:text-zinc-700" size={40} />
            </div>
            <h3 className="text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white mb-2 uppercase">No matches found</h3>
            <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Try adjusting your filters or search term</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;

import { Restaurant, MenuItem } from './types';

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'r1',
    name: 'BURGER KING',
    cuisines: ['Burgers', 'American', 'Fast Food'],
    rating: 4.2,
    deliveryTime: 25,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=60',
    ownerId: 'system',
    isActive: true
  },
  {
    id: 'r2',
    name: 'PIZZA HUT',
    cuisines: ['Italian', 'Pizzas', 'Beverages'],
    rating: 4.5,
    deliveryTime: 35,
    image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=800&auto=format&fit=crop&q=60',
    ownerId: 'system',
    isActive: true
  },
  {
    id: 'r3',
    name: 'PUNJABI DHABA',
    cuisines: ['North Indian', 'Curries', 'Breads'],
    rating: 4.6,
    deliveryTime: 30,
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=60',
    ownerId: 'system',
    isActive: true
  },
  {
    id: 'r4',
    name: 'GREEN LEAF',
    cuisines: ['South Indian', 'Healthy', 'Salads'],
    rating: 4.8,
    deliveryTime: 20,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=60',
    isPureVeg: true,
    ownerId: 'system',
    isActive: true
  },
  {
    id: 'r5',
    name: 'ROYAL SPICE',
    cuisines: ['Mughlai', 'Biryani', 'Indian'],
    rating: 4.4,
    deliveryTime: 40,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=60',
    ownerId: 'system',
    isActive: true
  },
  {
    id: 'r6',
    name: 'PASTA PALACE',
    cuisines: ['Italian', 'Continental', 'Desserts'],
    rating: 4.3,
    deliveryTime: 30,
    image: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=800&auto=format&fit=crop&q=60',
    ownerId: 'system',
    isActive: true
  },
  {
    id: 'r7',
    name: 'TACO TOWN',
    cuisines: ['Mexican', 'Fast Food', 'Street Food'],
    rating: 4.1,
    deliveryTime: 25,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=60',
    ownerId: 'system',
    isActive: true
  },
  {
    id: 'r8',
    name: 'SUSHI ZEN',
    cuisines: ['Japanese', 'Sushi', 'Asian'],
    rating: 4.7,
    deliveryTime: 45,
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=60',
    ownerId: 'system',
    isActive: true
  },
  {
    id: 'r9',
    name: 'DESSERT DREAM',
    cuisines: ['Desserts', 'Cakes', 'Waffles'],
    rating: 4.9,
    deliveryTime: 15,
    image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&auto=format&fit=crop&q=60',
    ownerId: 'system',
    isActive: true
  },
  {
    id: 'r10',
    name: 'WOK & ROLL',
    cuisines: ['Chinese', 'Asian', 'Thai'],
    rating: 4.2,
    deliveryTime: 35,
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=60',
    ownerId: 'system',
    isActive: true
  }
];

export const MENU_ITEMS: Record<string, MenuItem[]> = {
  'r1': [
    {
      id: 'm1',
      name: 'WHOPPER JUNIOR',
      description: 'The classic flame-grilled beef burger with fresh onions, tomatoes, and pickles.',
      price: 159,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60',
      isVeg: false,
      isAvailable: true
    },
    {
      id: 'm2',
      name: 'VEGGIE WHOPPER',
      description: 'Plant-based patty with signature flame-grilled taste.',
      price: 139,
      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    },
    {
      id: 'm3',
      name: 'CRISPY CHICKEN BURGER',
      description: 'Tender chicken patty with a spicy herb coating.',
      price: 179,
      image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500&auto=format&fit=crop&q=60',
      isVeg: false,
      isAvailable: true
    }
  ],
  'r2': [
    {
      id: 'm4',
      name: 'MARGHERITA PIZZA',
      description: 'Classic delight with 100% real mozzarella cheese.',
      price: 249,
      image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    },
    {
      id: 'm5',
      name: 'PEPPERONI PIZZA',
      description: 'Loaded with spicy pepperoni and cheese.',
      price: 399,
      image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=60',
      isVeg: false,
      isAvailable: true
    },
    {
      id: 'm6',
      name: 'GARLIC BREADSTICKS',
      description: 'Freshly baked breadsticks with garlic butter.',
      price: 129,
      image: 'https://images.unsplash.com/photo-1619531040576-f9416740661d?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    }
  ],
  'r3': [
    {
      id: 'm7',
      name: 'BUTTER CHICKEN',
      description: 'Classic creamy chicken curry with a touch of butter.',
      price: 349,
      image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60',
      isVeg: false,
      isAvailable: true
    },
    {
      id: 'm8',
      name: 'DAL MAKHANI',
      description: 'Black lentils cooked overnight with cream and butter.',
      price: 279,
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    },
    {
      id: 'm9',
      name: 'GARLIC NAAN',
      description: 'Soft leavened bread cooked in tandoor with garlic.',
      price: 49,
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    }
  ],
  'r4': [
    {
      id: 'm10',
      name: 'MASALA DOSA',
      description: 'Crispy rice crepe filled with spiced potato mash.',
      price: 120,
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    },
    {
      id: 'm11',
      name: 'IDLI SAMBAR',
      description: 'Steamed rice cakes served with spicy lentil soup.',
      price: 80,
      image: 'https://images.unsplash.com/photo-1589302168068-d04b6b6ec4ec?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    }
  ],
  'r5': [
    {
      id: 'm12',
      name: 'CHICKEN BIRYANI',
      description: 'Fragrant basmati rice cooked with tender chicken and aromatic spices.',
      price: 299,
      image: 'https://images.unsplash.com/photo-1631515243349-3a9295ffaf05?w=500&auto=format&fit=crop&q=60',
      isVeg: false,
      isAvailable: true
    },
    {
      id: 'm13',
      name: 'PANEER TIKKA',
      description: 'Marinated cottage cheese cubes grilled to perfection.',
      price: 249,
      image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    }
  ],
  'r6': [
    {
      id: 'm14',
      name: 'ALFREDO PASTA',
      description: 'Creamy white sauce pasta with mushrooms and herbs.',
      price: 320,
      image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    },
    {
      id: 'm15',
      name: 'TIRAMISU',
      description: 'Classic Italian dessert with espresso-soaked ladyfingers.',
      price: 199,
      image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    }
  ],
  'r7': [
    {
      id: 'm16',
      name: 'CHICKEN TACOS',
      description: 'Grilled chicken in soft corn tortillas with salsa.',
      price: 180,
      image: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=500&auto=format&fit=crop&q=60',
      isVeg: false,
      isAvailable: true
    },
    {
      id: 'm17',
      name: 'NACHOS SUPREME',
      description: 'Crispy tortillas topped with melted cheese and jalapenos.',
      price: 220,
      image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    }
  ],
  'r8': [
    {
      id: 'm18',
      name: 'SALMON SUSHI ROLL',
      description: 'Fresh salmon with avocado and cucumber rolled in seaweed.',
      price: 450,
      image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=500&auto=format&fit=crop&q=60',
      isVeg: false,
      isAvailable: true
    },
    {
      id: 'm19',
      name: 'AVOCADO MAKI',
      description: 'Creamy avocado rolled with vinegared rice.',
      price: 350,
      image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    }
  ],
  'r9': [
    {
      id: 'm20',
      name: 'CHOCOLATE LAVA CAKE',
      description: 'Warm chocolate cake with a molten center served with vanilla ice cream.',
      price: 180,
      image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    },
    {
      id: 'm21',
      name: 'BELGIAN WAFFLE',
      description: 'Crispy golden waffle topped with maple syrup and berries.',
      price: 150,
      image: 'https://images.unsplash.com/photo-1562329265-95a6ec7a8c24?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    }
  ],
  'r10': [
    {
      id: 'm22',
      name: 'CHICKEN HAKKA NOODLES',
      description: 'Stir-fried noodles with chicken, vegetables and soy sauce.',
      price: 220,
      image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60',
      isVeg: false,
      isAvailable: true
    },
    {
      id: 'm23',
      name: 'SPRING ROLLS',
      description: 'Crispy fried rolls filled with mixed vegetables.',
      price: 160,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60',
      isVeg: true,
      isAvailable: true
    }
  ]
};

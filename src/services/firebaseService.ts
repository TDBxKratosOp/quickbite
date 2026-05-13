import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  setDoc,
  onSnapshot,
  collectionGroup,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Order, UserProfile, Coupon, Review, Restaurant, MenuItem, Appeal } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const orderService = {
  async createOrder(orderData: Omit<Order, 'id' | 'createdAt'>) {
    const path = 'orders';
    try {
      // Fetch restaurant ownerId to store it on the order for secure listing
      const resRef = doc(db, 'restaurants', orderData.restaurantId);
      const resSnap = await getDoc(resRef);
      const restaurantOwnerId = resSnap.exists() ? resSnap.data().ownerId : null;

      const docRef = await addDoc(collection(db, path), {
        ...orderData,
        restaurantOwnerId,
        createdAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getUserOrders(userId: string) {
    const path = 'orders';
    try {
      const q = query(
        collection(db, path), 
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Order))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getAllOrders() {
    const path = 'orders';
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getOrdersByRestaurant(restaurantId: string) {
    const path = 'orders';
    const currentUserId = auth.currentUser?.uid;
    try {
      const q = query(
        collection(db, path),
        where('restaurantId', '==', restaurantId),
        where('restaurantOwnerId', '==', currentUserId)
      );
      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      return orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  subscribeToRestaurantOrders(restaurantId: string, callback: (orders: Order[]) => void): () => void {
    // NOTE: No orderBy here — combining where() + orderBy() requires a composite
    // Firestore index that may not exist for non-admin users, causing silent failures.
    // We sort client-side instead to guarantee it works for all users.
    const currentUserId = auth.currentUser?.uid;
    const q = query(
      collection(db, 'orders'),
      where('restaurantId', '==', restaurantId),
      where('restaurantOwnerId', '==', currentUserId)
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Order))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      callback(orders);
    }, (error) => {
      console.error('Orders subscription error:', error);
      callback([]);
    });
  },

  async updateOrderStatus(orderId: string, status: Order['status'], rejectionReason?: string, deliveryBoyName?: string, deliveryBoyPhone?: string) {
    const path = `orders/${orderId}`;
    try {
      const docRef = doc(db, 'orders', orderId);
      const updates: any = { 
        status,
        updatedAt: serverTimestamp()
      };
      if (rejectionReason) {
        updates.rejectionReason = rejectionReason;
      }
      if (deliveryBoyName) {
        updates.deliveryBoyName = deliveryBoyName;
      }
      if (deliveryBoyPhone) {
        updates.deliveryBoyPhone = deliveryBoyPhone;
      }
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async markOrderAsReviewed(orderId: string) {
    const path = `orders/${orderId}`;
    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, { 
        hasBeenReviewed: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  subscribeToUserOrders(userId: string, callback: (orders: Order[]) => void): () => void {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Order))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      callback(orders);
    }, (error) => {
      console.error('User orders subscription error:', error);
      callback([]);
    });
  }
};

export const reviewService = {
  async createReview(review: Omit<Review, 'id' | 'createdAt'>) {
    const path = 'reviews';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...review,
        createdAt: serverTimestamp()
      });
      // Mark order as reviewed
      await orderService.markOrderAsReviewed(review.orderId);
      
      // Update restaurant rating
      const reviews = await this.getRestaurantReviews(review.restaurantId);
      if (reviews && reviews.length > 0) {
        const totalRating = reviews.reduce((acc, r) => acc + r.rating, 0);
        const avgRating = totalRating / reviews.length;
        await restaurantService.updateRestaurant(review.restaurantId, { 
          rating: Number(avgRating.toFixed(1)),
          numReviews: reviews.length 
        });
      }

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getRestaurantReviews(restaurantId: string) {
    const path = 'reviews';
    try {
      const q = query(
        collection(db, path),
        where('restaurantId', '==', restaurantId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getUserReviews(userId: string) {
    const path = 'reviews';
    try {
      const q = query(
        collection(db, path),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async updateReview(reviewId: string, data: { rating: number, comment: string }) {
    const path = `reviews/${reviewId}`;
    try {
      const docRef = doc(db, 'reviews', reviewId);
      await updateDoc(docRef, {
        ...data,
        isEdited: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteReview(reviewId: string, orderId: string) {
    const path = `reviews/${reviewId}`;
    try {
      const docRef = doc(db, 'reviews', reviewId);
      await deleteDoc(docRef);
      // Reset order hasBeenReviewed status
      const orderRef = doc(db, 'orders', orderId);
      try {
        await updateDoc(orderRef, { 
          hasBeenReviewed: false,
          updatedAt: serverTimestamp()
        });
      } catch (orderUpdateError) {
        // If the order document doesn't exist, we ignore the update failure
        // so the review deletion is still successful from a user perspective
        console.warn(`Could not update order ${orderId} after review deletion (it may have been deleted):`, orderUpdateError);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

export const couponService = {
  async getAllCoupons() {
    const path = 'coupons';
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createCoupon(coupon: Omit<Coupon, 'id' | 'createdAt'>) {
    const path = 'coupons';
    try {
      await addDoc(collection(db, path), {
        ...coupon,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateCoupon(couponId: string, updates: Partial<Coupon>) {
    const path = `coupons/${couponId}`;
    try {
      const docRef = doc(db, 'coupons', couponId);
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteCoupon(couponId: string) {
    const path = `coupons/${couponId}`;
    try {
      const docRef = doc(db, 'coupons', couponId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async validateCoupon(code: string) {
    const path = 'coupons';
    try {
      const q = query(collection(db, path), where('code', '==', code.toUpperCase()), where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Coupon;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }
};

export const userService = {
  async saveUserProfile(profile: UserProfile) {
    const path = `users/${profile.uid}`;
    try {
      await setDoc(doc(db, 'users', profile.uid), {
        ...profile,
        createdAt: profile.createdAt || Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getUserProfile(uid: string) {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }
};

export const restaurantService = {
  async createRestaurant(restaurant: Omit<Restaurant, 'id'>) {
    const path = 'restaurants';
    try {
      // Check if owner already has a restaurant
      const existing = await this.getRestaurantByOwner(restaurant.ownerId);
      if (existing) {
        throw new Error("RESTAURANT_EXISTS: You already have an active operational beacon.");
      }

      const docRef = await addDoc(collection(db, path), {
        ...restaurant,
        rating: 0, // Default to 0 as requested
        numReviews: 0,
        createdAt: serverTimestamp(),
      });
      // Update user profile with restaurantId
      const userRef = doc(db, 'users', restaurant.ownerId);
      await updateDoc(userRef, { 
        restaurantId: docRef.id,
        isRestaurantOwner: true
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getRestaurantByOwner(ownerId: string) {
    const path = 'restaurants';
    try {
      const q = query(collection(db, path), where('ownerId', '==', ownerId));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Restaurant;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async updateRestaurant(restaurantId: string, updates: Partial<Restaurant>) {
    const path = `restaurants/${restaurantId}`;
    try {
      const docRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getAllRestaurants() {
    const path = 'restaurants';
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async suspendRestaurant(restaurantId: string, suspended: boolean) {
    const path = `restaurants/${restaurantId}`;
    try {
      const docRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(docRef, { 
        suspendedByAdmin: suspended,
        isActive: suspended ? false : true, // Automatically close if suspended
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async softDeleteRestaurant(restaurantId: string, isDeleted: boolean) {
    const path = `restaurants/${restaurantId}`;
    try {
      const docRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(docRef, { 
        isDeleted,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteRestaurant(restaurantId: string) {
    const path = `restaurants/${restaurantId}`;
    try {
      const docRef = doc(db, 'restaurants', restaurantId);
      const resSnap = await getDoc(docRef);
      
      if (resSnap.exists()) {
        const data = resSnap.data() as Restaurant;
        const ownerId = data.ownerId;
        const batch = writeBatch(db);
        
        // Delete the restaurant
        batch.delete(docRef);
        
        // Update owner's profile to revoke status
        const userRef = doc(db, 'users', ownerId);
        batch.update(userRef, {
          isRestaurantOwner: false,
          restaurantId: null
        });
        
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getAllActiveRestaurants() {
    const path = 'restaurants';
    try {
      const q = query(collection(db, path), where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async toggleRestaurantStatus(restaurantId: string, isActive: boolean) {
    const path = `restaurants/${restaurantId}`;
    try {
      const docRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(docRef, { 
        isActive,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getRestaurantById(id: string) {
    const path = `restaurants/${id}`;
    try {
      const docRef = doc(db, 'restaurants', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Restaurant;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  subscribeToRestaurant(id: string, callback: (restaurant: Restaurant | null) => void): () => void {
    const docRef = doc(db, 'restaurants', id);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as Restaurant);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Restaurant subscription error:', error);
      callback(null);
    });
  },

  subscribeToActiveRestaurants(callback: (restaurants: Restaurant[]) => void): () => void {
    const q = query(collection(db, 'restaurants'));
    return onSnapshot(q, (snapshot) => {
      const restaurants = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Restaurant))
        .filter(r => r.isActive === true); // Filter in client to avoid index issues with compounded queries if any
      callback(restaurants);
    }, (error) => {
      console.error('Restaurant subscription error:', error);
      callback([]);
    });
  }
};

export const appealService = {
  async submitAppeal(appealData: Omit<Appeal, 'id' | 'createdAt' | 'status'>) {
    const path = 'appeals';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...appealData,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getAllAppeals() {
    const path = 'appeals';
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appeal));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async updateAppealStatus(appealId: string, status: Appeal['status'], adminNote?: string) {
    const path = `appeals/${appealId}`;
    try {
      const docRef = doc(db, 'appeals', appealId);
      const appealSnap = await getDoc(docRef);
      
      if (appealSnap.exists()) {
        const appealData = appealSnap.data() as Appeal;
        const batch = writeBatch(db);
        
        batch.update(docRef, {
          status,
          adminNote: adminNote || "",
          updatedAt: serverTimestamp()
        });

        // Special handling for approved owner requests
        if (appealData.type === 'owner_request' && status === 'resolved') {
          const userRef = doc(db, 'users', appealData.ownerId);
          batch.update(userRef, {
            isRestaurantOwner: true
          });
        }

        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getAppealsByRestaurant(restaurantId: string, ownerId: string) {
    const path = 'appeals';
    try {
      const q = query(
        collection(db, path), 
        where('restaurantId', '==', restaurantId),
        where('ownerId', '==', ownerId)
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appeal));
      return docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getUserAppeals(userId: string) {
    const path = 'appeals';
    try {
      const q = query(
        collection(db, path), 
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appeal));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async deleteAppeal(appealId: string) {
    const path = `appeals/${appealId}`;
    try {
      const docRef = doc(db, 'appeals', appealId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  subscribeToAppeals(callback: (appeals: Appeal[]) => void): () => void {
    const q = query(collection(db, 'appeals'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const appeals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appeal));
      callback(appeals);
    }, (error) => {
      console.error('Appeals subscription error:', error);
      callback([]);
    });
  }
};

export const menuService = {
  async getMenuItems(restaurantId: string) {
    const path = `restaurants/${restaurantId}/menu`;
    try {
      // NOTE: Removed orderBy('name') — subcollection ordering requires a Firestore
      // index that silently denies non-admin reads. Sort client-side instead.
      const q = query(collection(db, 'restaurants', restaurantId, 'menu'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as MenuItem))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async addMenuItem(restaurantId: string, item: Omit<MenuItem, 'id'>) {
    const path = `restaurants/${restaurantId}/menu`;
    try {
      const docRef = await addDoc(collection(db, 'restaurants', restaurantId, 'menu'), {
        ...item,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateMenuItem(restaurantId: string, itemId: string, updates: Partial<MenuItem>) {
    const path = `restaurants/${restaurantId}/menu/${itemId}`;
    try {
      const docRef = doc(db, 'restaurants', restaurantId, 'menu', itemId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteMenuItem(restaurantId: string, itemId: string) {
    const path = `restaurants/${restaurantId}/menu/${itemId}`;
    try {
      const docRef = doc(db, 'restaurants', restaurantId, 'menu', itemId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async toggleItemAvailability(restaurantId: string, itemId: string, isAvailable: boolean) {
    const path = `restaurants/${restaurantId}/menu/${itemId}`;
    try {
      const docRef = doc(db, 'restaurants', restaurantId, 'menu', itemId);
      await updateDoc(docRef, { 
        isAvailable,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  subscribeToMenuItems(restaurantId: string, callback: (items: MenuItem[]) => void): () => void {
    const q = query(collection(db, 'restaurants', restaurantId, 'menu'));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as MenuItem))
        .filter(item => item.isAvailable !== false)
        .sort((a, b) => a.name.localeCompare(b.name));
      callback(items);
    }, (error) => {
      console.error('Menu subscription error:', error);
      callback([]);
    });
  },

  async searchMenuItems(searchTerm: string) {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const path = 'menu (collectionGroup)';
    try {
      // Still need to fetch a broad set and filter client-side because Firestore lacks substring search
      // But we limit the initial fetch to avoid crashing everything if the DB is huge
      const q = query(collectionGroup(db, 'menu'), orderBy('name')); // Add order for consistent fetching
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
      
      const term = searchTerm.toLowerCase();
      return items.filter(item => 
        item.name.toLowerCase().includes(term) || 
        item.description.toLowerCase().includes(term)
      ).slice(0, 50); // Limit results to top 50 matches
    } catch (error) {
       handleFirestoreError(error, OperationType.LIST, path);
       return [];
    }
  }
};
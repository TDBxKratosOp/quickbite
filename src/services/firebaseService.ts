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
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Order, UserProfile, Coupon, Review } from '../types';

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
      const docRef = await addDoc(collection(db, path), {
        ...orderData,
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
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
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

  async updateOrderStatus(orderId: string, status: Order['status']) {
    const path = `orders/${orderId}`;
    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, { 
        status,
        updatedAt: serverTimestamp()
      });
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Restaurant {
  id: string;
  name: string;
  cuisines: string[];
  rating: number;
  deliveryTime: number;
  image: string;
  isPureVeg?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isVeg: boolean;
  restaurantId?: string;
  restaurantName?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Order {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out-for-delivery' | 'delivered' | 'cancelled';
  createdAt: any;
  deliveryAddress: string;
  pincode: string;
  paymentMethod: 'COD' | 'RAZORPAY';
  hasBeenReviewed?: boolean;
}

export interface Review {
  id?: string;
  userId: string;
  userName: string;
  restaurantId: string;
  restaurantName?: string; // Added to help display in profile
  orderId: string;
  rating: number;
  comment: string;
  isEdited?: boolean;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  pincode?: string;
  deliveryAddress?: string;
  isAdmin?: boolean;
  createdAt: any;
}

export interface Coupon {
  id?: string;
  code: string;
  discountPercent: number;
  isActive: boolean;
  createdAt: any;
}

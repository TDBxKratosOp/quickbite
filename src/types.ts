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
  ownerId: string;
  isActive: boolean;
  isDeleted?: boolean;
  suspendedByAdmin?: boolean;
  address?: string;
  phone?: string;
  numReviews?: number;
}

export interface Appeal {
  id?: string;
  restaurantId?: string;
  restaurantName: string;
  ownerId: string;
  ownerEmail: string;
  reason: string;
  type: 'suspension' | 'deletion' | 'owner_request';
  status: 'pending' | 'resolved' | 'rejected';
  adminNote?: string;
  createdAt: any;
  restaurantAddress?: string;
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
  isAvailable: boolean;
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
  restaurantOwnerId?: string; // Denormalized for secure list queries
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'out-for-delivery' | 'delivered' | 'cancelled';
  rejectionReason?: string;
  createdAt: any;
  deliveryAddress: string;
  pincode: string;
  paymentMethod: 'COD' | 'RAZORPAY';
  hasBeenReviewed?: boolean;
  deliveryBoyName?: string;
  deliveryBoyPhone?: string;
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
  isRestaurantOwner?: boolean;
  restaurantId?: string;
  createdAt: any;
}

export interface Coupon {
  id?: string;
  code: string;
  discountPercent: number;
  isActive: boolean;
  createdAt: any;
}

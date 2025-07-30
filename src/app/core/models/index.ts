// src/app/core/models/index.ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  timestamp?: Date;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: number;
  userId: number;
  photoUrl?: string;
  fullName: string;
  gender?: 'Male' | 'Female';
  email?: string;
  department?: string;
  position?: string;
  division?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: number;
  name: string;
  barcode: string;
  stock: number;
  buyPrice: number;
  sellPrice: number;
  categoryId: number;
  categoryName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  isActive: boolean;
  productCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  id: number;
  name: string;
  phone: string;
  email?: string;
  points: number;
  memberNumber: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  productName: string;
  productBarcode: string;
  quantity: number;
  sellPrice: number;
  buyPrice: number;
  discount: number;
  subtotal: number;
  totalProfit: number;
}

// POS related interfaces
export interface CartItem {
  productId: number;
  name: string;
  barcode: string;
  sellPrice: number;
  quantity: number;
  discount: number;
  total: number;
  stock: number;
}
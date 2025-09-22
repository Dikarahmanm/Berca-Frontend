// src/app/modules/category-management/models/category.models.ts

// Main Category interface
export interface Category {
  id: number;
  name: string;
  color: string;
  description?: string;
  requiresExpiryDate: boolean;
  defaultExpiryWarningDays: number;
  createdAt: Date;
  updatedAt: Date;
  productCount: number;
  expiringProductsCount?: number;
  expiredProductsCount?: number;
}

// DTO for creating new category
export interface CreateCategoryRequest {
  name: string;
  color: string;
  description?: string;
}

// DTO for updating category
export interface UpdateCategoryRequest {
  name: string;
  color: string;
  description?: string;
}

// API Response for category list with pagination
export interface CategoryListResponse {
  categories: Category[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter parameters for category search
export interface CategoryFilter {
  searchTerm?: string;
  color?: string;
  page: number;
  pageSize: number;
  sortBy: 'name' | 'color' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}
export interface CategorySuggestion {
  name: string;
  color: string;
  description: string;
}
// Check name availability response
export interface CategoryNameCheckResponse {
  exists: boolean;
}

// API Error response
export interface ApiErrorResponse {
  message: string;
  errors?: { [key: string]: string[] };
}

// Loading states for UI
export interface CategoryLoadingState {
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  checkingName: boolean;
}

// Category form data for reactive forms
export interface CategoryFormData {
  name: string;
  color: string;
  description: string;
}

// Default color palette untuk color picker
export const DEFAULT_CATEGORY_COLORS = [
  '#FF914D', // Orange primary
  '#4BBF7B', // Green accent  
  '#E15A4F', // Red error
  '#FFB84D', // Yellow warning
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#84CC16', // Lime
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#A855F7'  // Violet
] as const;

// Predefined category suggestions
export const CATEGORY_SUGGESTIONS = [
  { name: 'Makanan', color: '#FF914D', description: 'Produk makanan dan snack' },
  { name: 'Minuman', color: '#4BBF7B', description: 'Minuman segar dan berenergi' },
  { name: 'Elektronik', color: '#E15A4F', description: 'Perangkat elektronik dan aksesoris' },
  { name: 'Rumah Tangga', color: '#FFB84D', description: 'Keperluan dan peralatan rumah tangga' },
  { name: 'Kesehatan', color: '#6366F1', description: 'Produk kesehatan dan perawatan' },
  { name: 'Kosmetik', color: '#EC4899', description: 'Produk kecantikan dan perawatan' },
  { name: 'Pakaian', color: '#8B5CF6', description: 'Fashion dan aksesoris pakaian' },
  { name: 'Olahraga', color: '#06B6D4', description: 'Peralatan dan perlengkapan olahraga' },
  { name: 'Mainan', color: '#10B981', description: 'Mainan anak dan hobby' },
  { name: 'Buku', color: '#F59E0B', description: 'Buku dan alat tulis' }
] as const;

// Helper function untuk validasi hex color
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

// Helper function untuk generate random color
export function getRandomColor(): string {
  const colors = DEFAULT_CATEGORY_COLORS;
  return colors[Math.floor(Math.random() * colors.length)];
}

// Helper function untuk darken/lighten color
export function adjustColorBrightness(color: string, amount: number): string {
  const usePound = color[0] === '#';
  const col = usePound ? color.slice(1) : color;
  
  const num = parseInt(col, 16);
  let r = (num >> 16) + amount;
  let g = (num >> 8 & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;
  
  return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

// Helper function untuk contrast text color
export function getContrastTextColor(backgroundColor: string): string {
  const color = backgroundColor.replace('#', '');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
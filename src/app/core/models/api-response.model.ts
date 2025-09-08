export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  statusCode?: number;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: string[];
  statusCode: number;
}
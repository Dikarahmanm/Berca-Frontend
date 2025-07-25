// src/app/core/services/user-profile.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface UserProfileDto {
  id: number;
  userId: number;
  username: string;
  role: string;
  photoUrl?: string;
  fullName: string;
  gender: string;
  email: string;
  department?: string;
  position?: string;
  division?: string;
  phoneNumber?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserProfileDto {
  fullName: string;
  gender: string;
  email: string;
  department?: string;
  position?: string;
  division?: string;
  phoneNumber?: string;
  bio?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private readonly baseUrl = 'http://localhost:5171/api/UserProfile';
  private currentProfileSubject = new BehaviorSubject<UserProfileDto | null>(null);
  public currentProfile$ = this.currentProfileSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Get current user profile
  getCurrentProfile(): Observable<ApiResponse<UserProfileDto>> {
    return this.http.get<ApiResponse<UserProfileDto>>(this.baseUrl, { withCredentials: true })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.currentProfileSubject.next(response.data);
            // Update localStorage with fresh data
            localStorage.setItem('userFullName', response.data.fullName);
            localStorage.setItem('userEmail', response.data.email);
            if (response.data.photoUrl) {
              localStorage.setItem('userPhotoUrl', response.data.photoUrl);
            }
          }
        })
      );
  }

  // Update profile
  updateProfile(updateDto: UpdateUserProfileDto): Observable<ApiResponse<UserProfileDto>> {
    return this.http.put<ApiResponse<UserProfileDto>>(this.baseUrl, updateDto, { withCredentials: true })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.currentProfileSubject.next(response.data);
            // Update localStorage
            localStorage.setItem('userFullName', response.data.fullName);
            localStorage.setItem('userEmail', response.data.email);
          }
        })
      );
  }

  // Upload photo
  uploadPhoto(photoFile: File): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('photo', photoFile);

    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/upload-photo`, formData, { withCredentials: true })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            // Update current profile with new photo URL
            const currentProfile = this.currentProfileSubject.value;
            if (currentProfile) {
              currentProfile.photoUrl = response.data;
              this.currentProfileSubject.next(currentProfile);
              localStorage.setItem('userPhotoUrl', response.data);
            }
          }
        })
      );
  }

  // Delete photo
  deletePhoto(): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.baseUrl}/photo`, { withCredentials: true })
      .pipe(
        tap(response => {
          if (response.success) {
            // Update current profile to remove photo URL
            const currentProfile = this.currentProfileSubject.value;
            if (currentProfile) {
              currentProfile.photoUrl = undefined;
              this.currentProfileSubject.next(currentProfile);
              localStorage.removeItem('userPhotoUrl');
            }
          }
        })
      );
  }

  // Validate photo file
  validatePhoto(file: File): { valid: boolean; error?: string } {
    // Size validation (500KB max)
    const maxSize = 500 * 1024; // 500KB
    if (file.size > maxSize) {
      return { valid: false, error: 'Ukuran foto maksimal 500KB' };
    }

    // Type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return { valid: false, error: 'Format file harus JPEG, PNG, atau GIF' };
    }

    return { valid: true };
  }

  // Get gender options
  getGenderOptions() {
    return [
      { value: 'Male', label: 'Laki-laki' },
      { value: 'Female', label: 'Perempuan' },
      { value: 'Other', label: 'Lainnya' }
    ];
  }

  // Get department options (sesuai toko minimarket)
  getDepartmentOptions() {
    return [
      { value: 'Kasir', label: 'Kasir' },
      { value: 'Admin', label: 'Admin' },
      { value: 'Gudang', label: 'Gudang' },
      { value: 'Keamanan', label: 'Keamanan' },
      { value: 'Cleaning Service', label: 'Cleaning Service' },
      { value: 'Lainnya', label: 'Lainnya' }
    ];
  }

  // Get position options (sesuai hierarki toko)
  getPositionOptions() {
    return [
      { value: 'Karyawan', label: 'Karyawan' },
      { value: 'Kasir Senior', label: 'Kasir Senior' },
      { value: 'Supervisor', label: 'Supervisor' },
      { value: 'Assistant Manager', label: 'Assistant Manager' },
      { value: 'Store Manager', label: 'Store Manager' },
      { value: 'Pemilik', label: 'Pemilik Toko' }
    ];
  }

  // Get current profile value (synchronous)
  getCurrentProfileValue(): UserProfileDto | null {
    return this.currentProfileSubject.value;
  }

  // Clear profile data (for logout)
  clearProfile(): void {
    this.currentProfileSubject.next(null);
    localStorage.removeItem('userFullName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhotoUrl');
  }

  // Get full avatar URL
  getAvatarUrl(photoUrl?: string): string {
    if (photoUrl) {
      return `http://localhost:5171${photoUrl}`;
    }
    return 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/ae0514bb-6c45-45fa-a431-f0d5fbd2a2ae.png';
  }
}
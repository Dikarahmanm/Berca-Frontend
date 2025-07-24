// src/app/pages/user-profile/user-profile.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { TopbarComponent } from '../../shared/topbar/topbar';
// import { TopbarComponent } from '../../shared/topbar/topbar.component';
// FIX: Update the path below if TopbarComponent exists elsewhere
// Example: import { TopbarComponent } from 'src/app/shared/topbar/topbar.component';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  photoUrl: string;
  department: string;
  position: string;
  division: string;
  gender: 'Laki-laki' | 'Perempuan';
  birthDate: string;
  address: string;
  joinDate: string;
  role: string;
  isActive: boolean;
  lastLogin: string;
}

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    TopbarComponent
  ]
})
export class UserProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
    upperCaseRegex: RegExp = /[A-Z]/;
    lowerCaseRegex: RegExp = /[a-z]/;
    numberRegex: RegExp = /[0-9]/;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  isLoading = false;
  isEditing = false;
  selectedFile: File | null = null;
  photoPreview: string | null = null;
  recentActivities: any[] = [];

  // Data profil pengguna
  userProfile: UserProfile = {
    id: '1',
    username: 'john.doe',
    email: 'john.doe@eniwan.com',
    fullName: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+62 812-3456-7890',
    photoUrl: 'assets/images/user-avatar.jpg',
    department: 'Operasional',
    position: 'Kasir Senior',
    division: 'Penjualan',
    gender: 'Laki-laki',
    birthDate: '1990-05-15',
    address: 'Jl. Merdeka No. 123, Bekasi, Jawa Barat',
    joinDate: '2022-01-15',
    role: 'Kasir',
    isActive: true,
    lastLogin: '2025-07-21T08:30:00'
  };

  departments = [
    'Operasional',
    'Penjualan', 
    'Inventori',
    'Administrasi',
    'Manajemen'
  ];

  positions = [
    'Kasir',
    'Kasir Senior',
    'Supervisor',
    'Manajer Shift',
    'Manajer Toko',
    'Administrator'
  ];

  divisions = [
    'Penjualan',
    'Inventori',
    'Keuangan',
    'Administrasi',
    'Manajemen'
  ];
  formatCurrency(amount: number): string {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  }
  ngOnInit() {
    this.initializeForms();
    this.loadUserProfile();
  }
    getRoleColor(): string {
        if (this.userProfile && this.userProfile.role) {
            return this.userProfile.role === 'Admin' ? '#007bff' : '#28a745';
        }
        return '#6c757d';
    }
  initializeForms() {
    this.profileForm = this.fb.group({
      username: [this.userProfile.username, [Validators.required, Validators.minLength(3)]],
      email: [this.userProfile.email, [Validators.required, Validators.email]],
      firstName: [this.userProfile.firstName, [Validators.required]],
      lastName: [this.userProfile.lastName, [Validators.required]],
      phoneNumber: [this.userProfile.phoneNumber, [Validators.required]],
      department: [this.userProfile.department, [Validators.required]],
      position: [this.userProfile.position, [Validators.required]],
      division: [this.userProfile.division, [Validators.required]],
      gender: [this.userProfile.gender, [Validators.required]],
      birthDate: [this.userProfile.birthDate],
      address: [this.userProfile.address]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Disable form initially
    this.profileForm.disable();
  }

  loadUserProfile() {
    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      // Update form dengan data terbaru
      this.profileForm.patchValue(this.userProfile);
      this.isLoading = false;
    }, 1000);
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    
    if (this.isEditing) {
      this.profileForm.enable();
    } else {
      this.profileForm.disable();
      // Reset form ke nilai semula
      this.profileForm.patchValue(this.userProfile);
    }
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile() {
    if (this.profileForm.valid) {
      this.isLoading = true;
      
      const formData = this.profileForm.value;
      
      // Simulate API call
      setTimeout(() => {
        // Update userProfile dengan data baru
        this.userProfile = { ...this.userProfile, ...formData };
        this.userProfile.fullName = `${formData.firstName} ${formData.lastName}`;
        
        // Update photo jika ada
        if (this.photoPreview) {
          this.userProfile.photoUrl = this.photoPreview;
          this.photoPreview = null;
          this.selectedFile = null;
        }
        
        this.isEditing = false;
        this.profileForm.disable();
        this.isLoading = false;
        
        this.snackBar.open('Profil berhasil diperbarui!', 'Tutup', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }, 2000);
    } else {
      this.markFormGroupTouched(this.profileForm);
      this.snackBar.open('Mohon lengkapi semua field yang diperlukan', 'Tutup', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  changePassword() {
    if (this.passwordForm.valid) {
      this.isLoading = true;
      
      // Simulate API call
      setTimeout(() => {
        this.passwordForm.reset();
        this.isLoading = false;
        
        this.snackBar.open('Password berhasil diubah!', 'Tutup', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }, 2000);
    } else {
      this.markFormGroupTouched(this.passwordForm);
    }
  }

  private passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword');
    const confirmPassword = group.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  get displayPhoto(): string {
    return this.photoPreview || this.userProfile.photoUrl || 'assets/images/default-avatar.png';
  }

  get formattedJoinDate(): string {
    return new Date(this.userProfile.joinDate).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get formattedLastLogin(): string {
    return new Date(this.userProfile.lastLogin).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get yearsOfService(): number {
    const joinDate = new Date(this.userProfile.joinDate);
    const today = new Date();
    return Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
  }
  getActivityColor(type: string): string {
    switch (type) {
        case 'login':
            return '#3498db'; // blue
        case 'update':
            return '#f1c40f'; // yellow
        case 'transaction':
            return '#27ae60'; // green
        case 'error':
            return '#e74c3c'; // red
        default:
            return '#7f8c8d'; // grey
    }
}
getActivityIcon(activityType: string): string {
    switch (activityType) {
        case 'login':
            return 'login';
        case 'update':
            return 'edit';
        case 'create':
            return 'add_circle';
        case 'delete':
            return 'delete';
        case 'payment':
            return 'payment';
        default:
            return 'info';
    }
}

}

// src/app/modules/user-profile/user-profile.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserProfileService, UserProfileDto, UpdateUserProfileDto } from '../../core/services/user-profile.service';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  profileForm!: FormGroup;
  currentProfile: UserProfileDto | null = null;
  avatarPreview: string | null = null;
  selectedFile: File | null = null;
  
  // Loading states
  isLoading = false;
  isUploading = false;
  isSaving = false;
  
  // Message states
  successMessage = '';
  errorMessage = '';
  
  // Form options - sesuai toko minimarket
  genderOptions: any[] = [];
  departmentOptions: any[] = [];
  positionOptions: any[] = [];

  constructor(
    private fb: FormBuilder,
    private userProfileService: UserProfileService,
    private router: Router
  ) {
    this.initializeForm();
    this.genderOptions = this.userProfileService.getGenderOptions();
    this.departmentOptions = this.userProfileService.getDepartmentOptions();
    this.positionOptions = this.userProfileService.getPositionOptions();
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      gender: ['', Validators.required],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      department: [''],
      position: [''],
      division: ['', Validators.maxLength(50)],
      phoneNumber: ['', [Validators.pattern(/^[0-9+\-\s]+$/), Validators.maxLength(20)]],
      bio: ['', Validators.maxLength(500)]
    });
  }

  private loadProfile(): void {
    this.isLoading = true;
    this.clearMessages();

    this.userProfileService.getCurrentProfile().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentProfile = response.data;
          this.populateForm(response.data);
          this.avatarPreview = this.userProfileService.getAvatarUrl(response.data.photoUrl);
        } else {
          this.showError(response.message || 'Gagal memuat profil');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.showError('Gagal memuat profil. Silakan coba lagi.');
        this.isLoading = false;
      }
    });
  }

  private populateForm(profile: UserProfileDto): void {
    this.profileForm.patchValue({
      fullName: profile.fullName,
      gender: profile.gender,
      email: profile.email,
      department: profile.department || '',
      position: profile.position || '',
      division: profile.division || '',
      phoneNumber: profile.phoneNumber || '',
      bio: profile.bio || ''
    });
  }

  // Photo handling dengan drag & drop support
  onPhotoSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    this.processSelectedFile(file);
  }

  // Handle drag & drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processSelectedFile(files[0]);
    }
  }

  private processSelectedFile(file: File): void {
    // Validate file
    const validation = this.userProfileService.validatePhoto(file);
    if (!validation.valid) {
      this.showError(validation.error!);
      return;
    }

    this.selectedFile = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.avatarPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  uploadPhoto(): void {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.clearMessages();

    this.userProfileService.uploadPhoto(this.selectedFile).subscribe({
      next: (response) => {
        if (response.success) {
          this.showSuccess('Foto berhasil diupload!');
          this.selectedFile = null;
          // Avatar preview already updated by service
        } else {
          this.showError(response.message || 'Gagal upload foto');
        }
        this.isUploading = false;
      },
      error: (error) => {
        console.error('Error uploading photo:', error);
        this.showError('Gagal upload foto. Silakan coba lagi.');
        this.isUploading = false;
      }
    });
  }

  deletePhoto(): void {
    if (!this.currentProfile?.photoUrl) return;

    if (!confirm('Apakah Anda yakin ingin menghapus foto profil?')) return;

    this.isUploading = true;
    this.clearMessages();

    this.userProfileService.deletePhoto().subscribe({
      next: (response) => {
        if (response.success) {
          this.showSuccess('Foto berhasil dihapus!');
          this.avatarPreview = this.userProfileService.getAvatarUrl();
          this.selectedFile = null;
        } else {
          this.showError(response.message || 'Gagal hapus foto');
        }
        this.isUploading = false;
      },
      error: (error) => {
        console.error('Error deleting photo:', error);
        this.showError('Gagal hapus foto. Silakan coba lagi.');
        this.isUploading = false;
      }
    });
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  // Form submission
  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched();
      this.showError('Mohon lengkapi data yang wajib diisi dengan benar');
      return;
    }

    this.isSaving = true;
    this.clearMessages();

    const updateDto: UpdateUserProfileDto = this.profileForm.value;

    this.userProfileService.updateProfile(updateDto).subscribe({
      next: (response) => {
        if (response.success) {
          this.showSuccess('Profil berhasil diperbarui!');
          if (response.data) {
            this.currentProfile = response.data;
          }
        } else {
          this.showError(response.message || 'Gagal perbarui profil');
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.showError('Gagal perbarui profil. Silakan coba lagi.');
        this.isSaving = false;
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
    });
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) return `${this.getFieldLabel(fieldName)} wajib diisi`;
      if (field.errors['email']) return 'Format email tidak valid';
      if (field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} terlalu panjang`;
      if (field.errors['pattern']) return `Format ${this.getFieldLabel(fieldName)} tidak valid`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      fullName: 'Nama lengkap',
      gender: 'Jenis kelamin',
      email: 'Email',
      department: 'Departemen',
      position: 'Jabatan',
      division: 'Divisi',
      phoneNumber: 'Nomor telepon',
      bio: 'Bio'
    };
    return labels[fieldName] || fieldName;
  }

  // Message helpers
  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 5000);
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => this.errorMessage = '', 5000);
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // Utility getters
  get hasChanges(): boolean {
    return this.profileForm.dirty || !!this.selectedFile;
  }

  get charCount(): number {
    return this.profileForm.get('bio')?.value?.length || 0;
  }

  get currentAvatarUrl(): string {
    return this.avatarPreview || this.userProfileService.getAvatarUrl(this.currentProfile?.photoUrl);
  }

  // Role display untuk minimarket context
  getRoleDisplayName(): string {
    switch (this.currentProfile?.role?.toLowerCase()) {
      case 'admin':
        return 'Administrator Toko';
      case 'manager':
        return 'Manager Toko';
      case 'user':
        return 'Karyawan';
      default:
        return this.currentProfile?.role || 'Karyawan';
    }
  }
}
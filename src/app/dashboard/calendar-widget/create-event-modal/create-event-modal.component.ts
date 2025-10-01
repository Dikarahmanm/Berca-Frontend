import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CalendarEventType, EventPriority, CreateCalendarEventDto } from '../../../core/interfaces/calendar.interfaces';
import { CalendarService } from '../../../core/services/calendar.service';

export interface CreateEventDialogData {
  selectedDate?: Date;
  branchId?: number;
  eventType?: CalendarEventType;
}

@Component({
  selector: 'app-create-event-modal',
  templateUrl: './create-event-modal.component.html',
  styleUrls: ['./create-event-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule
  ]
})
export class CreateEventModalComponent implements OnInit {
  eventForm!: FormGroup;
  isSubmitting = false;

  // Event types for dropdown
  eventTypes = [
    { value: CalendarEventType.ProductExpiry, label: 'Product Expiry', icon: '📦' },
    { value: CalendarEventType.FactureDue, label: 'Facture Due', icon: '💰' },
    { value: CalendarEventType.MemberPayment, label: 'Member Payment', icon: '💳' },
    { value: CalendarEventType.Inventory, label: 'Inventory', icon: '📊' },
    { value: CalendarEventType.Maintenance, label: 'Maintenance', icon: '🔧' },
    { value: CalendarEventType.Meeting, label: 'Meeting', icon: '👥' },
    { value: CalendarEventType.Promotion, label: 'Promotion', icon: '🎉' },
    { value: CalendarEventType.SystemMaintenance, label: 'System Maintenance', icon: '⚙️' },
    { value: CalendarEventType.SupplierAppointment, label: 'Supplier Appointment', icon: '🚚' },
    { value: CalendarEventType.Reminder, label: 'Reminder', icon: '🔔' },
    { value: CalendarEventType.Custom, label: 'Custom', icon: '✨' }
  ];

  // Priority levels for dropdown
  priorities = [
    { value: EventPriority.Low, label: 'Low', color: '#9ca3af' },
    { value: EventPriority.Normal, label: 'Normal', color: '#10b981' },
    { value: EventPriority.High, label: 'High', color: '#f59e0b' },
    { value: EventPriority.Critical, label: 'Critical', color: '#ef4444' }
  ];

  // Reminder options (minutes before event)
  reminderOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 1440, label: '1 day' },
    { value: 2880, label: '2 days' },
    { value: 10080, label: '1 week' }
  ];

  // Color options - Match dashboard color scheme
  colorOptions = [
    '#FF914D', '#E07A3B', '#E15A4F', '#FFB84D', '#4BBF7B',
    '#3498DB', '#6C757D', '#8b5cf6', '#ec4899', '#06b6d4'
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: CreateEventDialogData,
    private dialogRef: MatDialogRef<CreateEventModalComponent>,
    private fb: FormBuilder,
    private calendarService: CalendarService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initialize form with default values
   */
  private initializeForm(): void {
    const defaultDate = this.data.selectedDate || new Date();
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);

    this.eventForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', Validators.maxLength(1000)],
      startDate: [defaultDate, Validators.required],
      startTime: [this.formatTimeForInput(defaultTime), Validators.required],
      endDate: [null],
      endTime: [''],
      isAllDay: [false],
      eventType: [this.data.eventType || CalendarEventType.Custom, Validators.required],
      priority: [EventPriority.Normal, Validators.required],
      branchId: [this.data.branchId || null],
      hasReminder: [false],
      reminderMinutes: [30],
      color: ['#FF914D'],
      notes: ['', Validators.maxLength(2000)],
      actionUrl: ['', Validators.maxLength(500)]
    });

    // Watch for isAllDay changes
    this.eventForm.get('isAllDay')?.valueChanges.subscribe(isAllDay => {
      if (isAllDay) {
        this.eventForm.get('startTime')?.disable();
        this.eventForm.get('endTime')?.disable();
      } else {
        this.eventForm.get('startTime')?.enable();
        this.eventForm.get('endTime')?.enable();
      }
    });

    // Watch for hasReminder changes
    this.eventForm.get('hasReminder')?.valueChanges.subscribe(hasReminder => {
      if (hasReminder) {
        this.eventForm.get('reminderMinutes')?.setValidators(Validators.required);
      } else {
        this.eventForm.get('reminderMinutes')?.clearValidators();
      }
      this.eventForm.get('reminderMinutes')?.updateValueAndValidity();
    });
  }

  /**
   * Format time for input
   */
  private formatTimeForInput(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Combine date and time
   */
  private combineDateAndTime(date: Date, time: string): string {
    const [hours, minutes] = time.split(':');
    const combined = new Date(date);
    combined.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return combined.toISOString();
  }

  /**
   * Submit form
   */
  onSubmit(): void {
    if (this.eventForm.invalid) {
      Object.keys(this.eventForm.controls).forEach(key => {
        this.eventForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.eventForm.getRawValue();

    // Prepare DTO
    const eventDto: CreateCalendarEventDto = {
      title: formValue.title,
      description: formValue.description || undefined,
      startDate: formValue.isAllDay
        ? new Date(formValue.startDate).toISOString()
        : this.combineDateAndTime(formValue.startDate, formValue.startTime),
      endDate: formValue.endDate
        ? (formValue.isAllDay
            ? new Date(formValue.endDate).toISOString()
            : this.combineDateAndTime(formValue.endDate, formValue.endTime || formValue.startTime))
        : undefined,
      isAllDay: formValue.isAllDay,
      eventType: formValue.eventType,
      priority: formValue.priority,
      branchId: formValue.branchId || undefined,
      hasReminder: formValue.hasReminder,
      reminderMinutes: formValue.hasReminder ? formValue.reminderMinutes : undefined,
      color: formValue.color || undefined,
      notes: formValue.notes || undefined,
      actionUrl: formValue.actionUrl || undefined
    };

    console.log('📅 Creating event:', eventDto);

    this.calendarService.createEvent(eventDto).subscribe({
      next: (response) => {
        console.log('✅ Event created successfully:', response);
        this.isSubmitting = false;
        this.dialogRef.close({ success: true, event: response.data });
      },
      error: (error) => {
        console.error('❌ Failed to create event:', error);
        this.isSubmitting = false;
        alert('Gagal membuat event. ' + (error.error?.message || error.message));
      }
    });
  }

  /**
   * Cancel and close modal
   */
  onCancel(): void {
    if (this.eventForm.dirty) {
      if (confirm('Perubahan akan hilang. Yakin ingin keluar?')) {
        this.dialogRef.close();
      }
    } else {
      this.dialogRef.close();
    }
  }

  /**
   * Get event type icon
   */
  getEventTypeIcon(type: CalendarEventType): string {
    const eventType = this.eventTypes.find(t => t.value === type);
    return eventType?.icon || '✨';
  }

  /**
   * Get form control error message
   */
  getErrorMessage(controlName: string): string {
    const control = this.eventForm.get(controlName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) return 'Field ini wajib diisi';
    if (control.errors['maxLength']) return `Maksimal ${control.errors['maxLength'].requiredLength} karakter`;
    if (control.errors['email']) return 'Format email tidak valid';
    if (control.errors['url']) return 'Format URL tidak valid';

    return 'Input tidak valid';
  }
}

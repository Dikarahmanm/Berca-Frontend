import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CalendarEvent, EventPriority, CalendarEventType } from '../../../core/interfaces/calendar.interfaces';
import { CalendarService } from '../../../core/services/calendar.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-event-detail-modal',
  templateUrl: './event-detail-modal.component.html',
  styleUrls: ['./event-detail-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule
  ]
})
export class EventDetailModalComponent implements OnInit {
  event: CalendarEvent;
  eventTypeInfo: any;
  priorityInfo: any;

  // Enums for template
  EventPriority = EventPriority;
  CalendarEventType = CalendarEventType;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { event: CalendarEvent },
    private dialogRef: MatDialogRef<EventDetailModalComponent>,
    private calendarService: CalendarService,
    private router: Router
  ) {
    this.event = data.event;
  }

  ngOnInit(): void {
    this.eventTypeInfo = this.calendarService.getEventTypeInfo(this.event.eventType);
    this.priorityInfo = this.calendarService.getEventPriorityInfo(this.event.priority);
  }

  /**
   * Close modal
   */
  close(): void {
    this.dialogRef.close();
  }

  /**
   * Edit event
   */
  editEvent(): void {
    this.dialogRef.close({ action: 'edit', event: this.event });
  }

  /**
   * Delete event
   */
  deleteEvent(): void {
    if (confirm('Apakah Anda yakin ingin menghapus event ini?')) {
      this.dialogRef.close({ action: 'delete', event: this.event });
    }
  }

  /**
   * Mark event as done
   */
  markAsDone(): void {
    this.dialogRef.close({ action: 'markDone', event: this.event });
  }

  /**
   * Navigate to related entity
   */
  navigateToEntity(): void {
    if (!this.event.relatedEntityType || !this.event.relatedEntityId) return;

    let route = '';
    switch (this.event.relatedEntityType.toLowerCase()) {
      case 'product':
      case 'productbatch':
        route = `/dashboard/inventory`;
        break;
      case 'facture':
        route = `/dashboard/supplier/factures`;
        break;
      case 'member':
        route = `/dashboard/members`;
        break;
      case 'supplier':
        route = `/dashboard/supplier`;
        break;
      default:
        console.warn('Unknown entity type:', this.event.relatedEntityType);
        return;
    }

    this.dialogRef.close();
    this.router.navigate([route]);
  }

  /**
   * Format date time
   */
  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format time only
   */
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get priority class
   */
  getPriorityClass(): string {
    switch (this.event.priority) {
      case EventPriority.Critical: return 'priority-critical';
      case EventPriority.High: return 'priority-high';
      case EventPriority.Normal: return 'priority-normal';
      case EventPriority.Low: return 'priority-low';
      default: return 'priority-normal';
    }
  }

  /**
   * Check if event is in the past
   */
  isPastEvent(): boolean {
    const eventDate = new Date(this.event.startDate);
    const now = new Date();
    return eventDate < now;
  }

  /**
   * Check if event is today
   */
  isToday(): boolean {
    const eventDate = new Date(this.event.startDate);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  }
}

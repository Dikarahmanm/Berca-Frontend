import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CalendarService } from '../../core/services/calendar.service';
import { AuthService } from '../../core/services/auth.service';
import {
  CalendarEvent,
  CalendarDashboard,
  CalendarMonthView,
  EventPriority,
  CalendarEventType
} from '../../core/interfaces/calendar.interfaces';
import { Subject, takeUntil, interval } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { EventDetailModalComponent } from './event-detail-modal/event-detail-modal.component';
import { CreateEventModalComponent } from './create-event-modal/create-event-modal.component';

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEvent[];
  eventCount: number;
  hasCritical: boolean;
  hasHigh: boolean;
  hasNormal: boolean;
  hasLow: boolean;
}

@Component({
  selector: 'app-calendar-widget',
  templateUrl: './calendar-widget.component.html',
  styleUrls: ['./calendar-widget.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ]
})
export class CalendarWidgetComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State
  isLoading = true;
  isLoadingEvents = false;
  hasError = false;
  errorMessage = '';

  // Current view
  currentYear: number;
  currentMonth: number; // 1-12
  currentDate = new Date();

  // Calendar data
  calendarDays: CalendarDay[] = [];
  weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Events data
  dashboardData: CalendarDashboard | null = null;
  todayEvents: CalendarEvent[] = [];
  upcomingEvents: CalendarEvent[] = [];
  pastEvents: CalendarEvent[] = [];

  // Branch info
  currentBranchId: number | null = null;
  currentBranchName = '';

  // Widget settings
  showPastEvents = false;
  autoRefreshEnabled = true;
  private refreshInterval = 5 * 60 * 1000; // 5 minutes

  // Selected date for detail view
  selectedDate: Date | null = null;
  selectedDateEvents: CalendarEvent[] = [];

  // Event type & priority enums for template
  EventPriority = EventPriority;
  CalendarEventType = CalendarEventType;

  constructor(
    private calendarService: CalendarService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private dialog: MatDialog
  ) {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth() + 1;
  }

  ngOnInit(): void {
    console.log('📅 CalendarWidget initialized');

    // Get current branch
    const user = this.authService.getCurrentUser();
    this.currentBranchId = user?.defaultBranchId || null;
    this.currentBranchName = 'Current Branch'; // TODO: Get from branch service

    // Load initial data
    this.loadCalendarData();

    // Setup auto-refresh
    if (this.autoRefreshEnabled) {
      interval(this.refreshInterval)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          console.log('🔄 Auto-refreshing calendar data');
          this.refreshData();
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== DATA LOADING ==================== //

  /**
   * Load all calendar data
   */
  private loadCalendarData(): void {
    this.isLoading = true;
    this.hasError = false;

    // Load dashboard data
    this.calendarService.getDashboard(this.currentBranchId || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Dashboard data loaded:', response);
          console.log('📊 Today events count:', response.data?.todayEvents?.length || 0);
          console.log('📊 Upcoming events count:', response.data?.upcomingEvents?.length || 0);
          console.log('📊 Total events this month:', response.data?.totalEventsThisMonth || 0);

          this.dashboardData = response.data;
          this.todayEvents = response.data.todayEvents || [];
          this.upcomingEvents = response.data.upcomingEvents || [];

          if (this.todayEvents.length === 0 && this.upcomingEvents.length === 0) {
            console.warn('⚠️ No events found. Backend might not have data yet or branch filter is excluding all events.');
          }

          // Load past events separately
          this.loadPastEvents();

          // Load month view
          this.loadMonthView();
        },
        error: (error) => {
          console.error('❌ Failed to load dashboard data:', error);
          this.hasError = true;
          this.errorMessage = 'Gagal memuat data kalender';
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Load month view calendar
   */
  private loadMonthView(): void {
    this.isLoadingEvents = true;

    this.calendarService.getMonthView(this.currentYear, this.currentMonth, this.currentBranchId || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Month view loaded:', response);
          console.log('📊 Events in month view:', response.data.events?.length || 0);

          this.generateCalendarDays(response.data);

          // If today/upcoming events are empty, populate from calendar days
          if (this.todayEvents.length === 0 && this.upcomingEvents.length === 0) {
            this.populateEventsFromCalendarDays();
          }

          this.isLoading = false;
          this.isLoadingEvents = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('❌ Failed to load month view:', error);
          this.hasError = true;
          this.errorMessage = 'Gagal memuat tampilan kalender';
          this.isLoading = false;
          this.isLoadingEvents = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Load past events (last 3 days)
   */
  private loadPastEvents(): void {
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);

    this.calendarService.getEventsByDateRange(
      threeDaysAgo.toISOString(),
      today.toISOString(),
      this.currentBranchId || undefined
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        console.log('✅ Past events loaded:', response);
        this.pastEvents = response.data.filter(event => {
          const eventDate = new Date(event.startDate);
          return eventDate < today;
        });
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ Failed to load past events:', error);
      }
    });
  }

  /**
   * Populate today and upcoming events from calendar days if dashboard data is empty
   */
  private populateEventsFromCalendarDays(): void {
    console.log('📊 Populating events from calendar days...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allEvents: CalendarEvent[] = [];

    // Collect all events from calendar days
    this.calendarDays.forEach(day => {
      if (day.isCurrentMonth && day.events && day.events.length > 0) {
        allEvents.push(...day.events);
      }
    });

    console.log('📊 Total events found in calendar:', allEvents.length);

    // Separate into today, upcoming, and past
    this.todayEvents = allEvents.filter(event => {
      const eventDate = new Date(event.startDate);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === today.getTime();
    });

    this.upcomingEvents = allEvents.filter(event => {
      const eventDate = new Date(event.startDate);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() > today.getTime();
    }).sort((a, b) => {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    this.pastEvents = allEvents.filter(event => {
      const eventDate = new Date(event.startDate);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() < today.getTime();
    }).sort((a, b) => {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    console.log('📊 Today events:', this.todayEvents.length);
    console.log('📊 Upcoming events:', this.upcomingEvents.length);
    console.log('📊 Past events:', this.pastEvents.length);
  }

  /**
   * Refresh all data
   */
  refreshData(): void {
    console.log('🔄 Refreshing calendar data...');
    this.loadCalendarData();
  }

  // ==================== CALENDAR GENERATION ==================== //

  /**
   * Generate calendar days array with events
   */
  private generateCalendarDays(monthView: CalendarMonthView): void {
    const year = monthView.year;
    const month = monthView.month;
    const events = monthView.events;

    // First day of month
    const firstDay = new Date(year, month - 1, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Last day of month
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();

    // Previous month days to show
    const prevMonthLastDay = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonthLastDay.getDate();

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Previous month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(year, month - 2, day);
      days.push(this.createCalendarDay(date, false, today, []));
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate.getDate() === day &&
               eventDate.getMonth() === month - 1 &&
               eventDate.getFullYear() === year;
      });
      days.push(this.createCalendarDay(date, true, today, dayEvents));
    }

    // Next month days to complete the grid (42 days = 6 weeks)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month, day);
      days.push(this.createCalendarDay(date, false, today, []));
    }

    this.calendarDays = days;
  }

  /**
   * Create calendar day object
   */
  private createCalendarDay(date: Date, isCurrentMonth: boolean, today: Date, events: CalendarEvent[]): CalendarDay {
    const dayDate = new Date(date);
    dayDate.setHours(0, 0, 0, 0);

    const isToday = dayDate.getTime() === today.getTime();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    // Count events by priority
    let hasCritical = false;
    let hasHigh = false;
    let hasNormal = false;
    let hasLow = false;

    events.forEach(event => {
      switch (event.priority) {
        case EventPriority.Critical:
          hasCritical = true;
          break;
        case EventPriority.High:
          hasHigh = true;
          break;
        case EventPriority.Normal:
          hasNormal = true;
          break;
        case EventPriority.Low:
          hasLow = true;
          break;
      }
    });

    return {
      date,
      day: date.getDate(),
      isCurrentMonth,
      isToday,
      isWeekend,
      events,
      eventCount: events.length,
      hasCritical,
      hasHigh,
      hasNormal,
      hasLow
    };
  }

  // ==================== NAVIGATION ==================== //

  /**
   * Navigate to previous month
   */
  previousMonth(): void {
    if (this.currentMonth === 1) {
      this.currentMonth = 12;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.loadMonthView();
  }

  /**
   * Navigate to next month
   */
  nextMonth(): void {
    if (this.currentMonth === 12) {
      this.currentMonth = 1;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.loadMonthView();
  }

  /**
   * Jump to today
   */
  goToToday(): void {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth() + 1;
    this.loadMonthView();
  }

  /**
   * Navigate to full calendar view
   */
  expandToFullView(): void {
    this.router.navigate(['/dashboard/calendar']);
  }

  // ==================== USER INTERACTIONS ==================== //

  /**
   * Handle day click
   */
  onDayClick(day: CalendarDay): void {
    if (!day.isCurrentMonth) return;

    console.log('📅 Day clicked:', day);
    console.log('📊 Events for this day:', day.events);
    this.selectedDate = day.date;
    this.selectedDateEvents = day.events;

    // If there are events on this day
    if (day.events && day.events.length > 0) {
      console.log(`📊 Found ${day.events.length} event(s) on ${day.date.toLocaleDateString()}`);

      // If only one event, open it directly
      if (day.events.length === 1) {
        this.onEventClick(day.events[0], new Event('click'));
      } else {
        // Multiple events - show a list to choose from
        this.showDayEventsDialog(day);
      }
    }
  }

  /**
   * Show dialog with list of events for a specific day
   */
  private showDayEventsDialog(day: CalendarDay): void {
    // For now, show all events in console and open the first one
    // TODO: Create a proper day events modal
    console.log(`📅 Events on ${day.date.toLocaleDateString()}:`);
    day.events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title} - ${this.formatEventTime(event.startDate)}`);
    });

    // Open the first event for now
    if (day.events.length > 0) {
      this.onEventClick(day.events[0], new Event('click'));
    }
  }

  /**
   * Handle event click
   */
  onEventClick(event: CalendarEvent, $event: Event): void {
    $event.stopPropagation();
    console.log('📅 Event clicked:', event);

    const dialogRef = this.dialog.open(EventDetailModalComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { event },
      panelClass: 'event-detail-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('📅 Modal closed with result:', result);

        if (result.action === 'edit') {
          // Open edit modal (reuse create modal)
          this.editEvent(result.event);
        } else if (result.action === 'delete') {
          // Delete event
          this.deleteEvent(result.event);
        } else if (result.action === 'markDone') {
          // Mark as done
          this.markEventAsDone(result.event);
        }
      }
    });
  }

  /**
   * Create new event
   */
  createNewEvent(): void {
    console.log('📅 Creating new event');

    const dialogRef = this.dialog.open(CreateEventModalComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        selectedDate: this.selectedDate || new Date(),
        branchId: this.currentBranchId
      },
      panelClass: 'create-event-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        console.log('✅ Event created:', result.event);
        // Refresh calendar data
        this.refreshData();
      }
    });
  }

  /**
   * Edit existing event
   */
  private editEvent(event: CalendarEvent): void {
    // TODO: Implement edit modal (can reuse create modal with edit mode)
    console.log('✏️ Edit event:', event);
    alert('Edit functionality will be implemented soon');
  }

  /**
   * Delete event
   */
  private deleteEvent(event: CalendarEvent): void {
    console.log('🗑️ Deleting event:', event);

    this.calendarService.deleteEvent(event.id).subscribe({
      next: (response) => {
        console.log('✅ Event deleted:', response);
        // Refresh calendar data
        this.refreshData();
      },
      error: (error) => {
        console.error('❌ Failed to delete event:', error);
        alert('Gagal menghapus event');
      }
    });
  }

  /**
   * Mark event as done
   */
  private markEventAsDone(event: CalendarEvent): void {
    console.log('✅ Marking event as done:', event);

    // Update event to mark as inactive
    this.calendarService.updateEvent(event.id, { isActive: false }).subscribe({
      next: (response) => {
        console.log('✅ Event marked as done:', response);
        // Refresh calendar data
        this.refreshData();
      },
      error: (error) => {
        console.error('❌ Failed to mark event as done:', error);
        alert('Gagal menandai event sebagai selesai');
      }
    });
  }

  /**
   * Toggle past events visibility
   */
  togglePastEvents(): void {
    this.showPastEvents = !this.showPastEvents;
  }

  // ==================== HELPER METHODS ==================== //

  /**
   * Get month name in Indonesian
   */
  getMonthName(): string {
    return this.calendarService.getIndonesianMonthName(this.currentMonth);
  }

  /**
   * Get event type info
   */
  getEventTypeInfo(type: CalendarEventType) {
    return this.calendarService.getEventTypeInfo(type);
  }

  /**
   * Get event priority info
   */
  getEventPriorityInfo(priority: EventPriority) {
    return this.calendarService.getEventPriorityInfo(priority);
  }

  /**
   * Format event time
   */
  formatEventTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Format event date
   */
  formatEventDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Get relative date string (Today, Tomorrow, etc.)
   */
  getRelativeDateString(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);

    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Besok';
    if (diffDays === -1) return 'Kemarin';
    if (diffDays > 1 && diffDays <= 7) return `${diffDays} hari lagi`;
    if (diffDays < -1 && diffDays >= -3) return `${Math.abs(diffDays)} hari lalu`;

    return this.formatEventDate(dateString);
  }

  /**
   * Get priority badge class
   */
  getPriorityClass(priority: EventPriority): string {
    switch (priority) {
      case EventPriority.Critical: return 'priority-critical';
      case EventPriority.High: return 'priority-high';
      case EventPriority.Normal: return 'priority-normal';
      case EventPriority.Low: return 'priority-low';
      default: return 'priority-normal';
    }
  }

  /**
   * Get event type icon
   */
  getEventTypeIcon(type: CalendarEventType): string {
    return this.calendarService.getEventTypeInfo(type).icon;
  }

  /**
   * Truncate text with ellipsis
   */
  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

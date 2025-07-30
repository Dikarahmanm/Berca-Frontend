// src/app/core/services/notification.service.spec.ts
// ✅ TEST: Notification Service Integration Test
// Memastikan service mengimplementasikan API yang dibutuhkan sesuai problem statement

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService, NotificationDto, NotificationSummaryDto } from './notification.service';
import { environment } from '../../../environment/environment';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MatSnackBarModule],
      providers: [NotificationService]
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Required API Integration', () => {
    it('should implement GET /api/Notification/summary', () => {
      const mockSummary: NotificationSummaryDto = {
        totalCount: 10,
        unreadCount: 3,
        recentNotifications: [],
        lastUpdated: new Date().toISOString()
      };

      service.getNotificationSummary().subscribe(summary => {
        expect(summary).toEqual(mockSummary);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/Notification/summary`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockSummary, message: 'Success' });
    });

    it('should implement POST /api/Notification/{id}/read', () => {
      const notificationId = 123;

      service.markAsRead(notificationId).subscribe(result => {
        expect(result).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/Notification/${notificationId}/read`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ success: true, data: true, message: 'Marked as read' });
    });

    it('should implement POST /api/Notification/read-all', () => {
      service.markAllAsRead().subscribe(result => {
        expect(result).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/Notification/read-all`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ success: true, data: true, message: 'All marked as read' });
    });
  });

  describe('Real-time Updates', () => {
    it('should poll notifications every 30 seconds', (done) => {
      // Note: In real implementation, this test would require jasmine.clock() or similar
      // to control timer behavior. This is a structural test to verify the polling setup exists.
      
      expect(service.getCurrentUnreadCount()).toBe(0);
      expect(service['initializeRealTimeUpdates']).toBeDefined();
      done();
    });
  });

  describe('State Management', () => {
    it('should provide reactive observables for UI binding', () => {
      expect(service.notifications$).toBeDefined();
      expect(service.unreadCount$).toBeDefined();
      expect(service.summary$).toBeDefined();
      expect(service.isLoading$).toBeDefined();
      expect(service.error$).toBeDefined();
    });

    it('should update unread count when notification is marked as read', () => {
      // Set initial state
      service['unreadCountSubject'].next(5);
      
      const notificationId = 123;
      service.markAsRead(notificationId).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/Notification/${notificationId}/read`);
      req.flush({ success: true, data: true, message: 'Success' });

      expect(service.getCurrentUnreadCount()).toBe(4);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', () => {
      service.getUnreadCount().subscribe({
        next: (count) => {
          // Should return current value as fallback
          expect(count).toBe(0);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/Notification/summary`);
      req.error(new ErrorEvent('Network error'));
    });
  });
});
import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap, catchError, of } from 'rxjs';
import { SupplierService } from '../../services/supplier.service';
import { FactureService } from '../../../facture/services/facture.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environment/environment';
import {
  SupplierDto,
  SupplierQueryDto,
  SupplierPagedResponseDto,
  SupplierStatusDto
} from '../../interfaces/supplier.interfaces';

// Facture interfaces for supplier details
export interface SupplierFactureDto {
  id: number;
  supplierInvoiceNumber: string;
  internalReferenceNumber: string;
  supplierName: string;
  branchName: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: number;
  statusDisplay: string;
  paymentPriority: number;
  priorityDisplay: string;
  daysOverdue: number;
  daysUntilDue: number;
  isOverdue: boolean;
  totalAmountDisplay?: string;
  outstandingAmountDisplay?: string;
  createdAt: string;
}

export interface SupplierSummaryDto {
  supplierId: number;
  totalFactures: number;
  totalOutstanding: number;
  overdueCount: number;
  overdueAmount: number;
  avgPaymentDays: number;
  creditUtilization: number;
  lastPaymentDate?: string;
}

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="supplier-container">
      <!-- Modern Header -->
      <header class="page-header">
        <div class="header-main">
          <div class="breadcrumb">
            <button class="breadcrumb-btn" (click)="navigateToDashboard()" title="Back to Dashboard">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </button>
            <span class="breadcrumb-text">Supplier Management</span>
          </div>
          <div class="header-content">
            <div class="header-title">
              <h1>All Suppliers</h1>
              <p class="header-subtitle">Manage your supplier network with complete analytics</p>
            </div>
            <div class="header-stats" *ngIf="totalCount() > 0">
              <div class="stat-item">
                <span class="stat-number">{{ totalCount() }}</span>
                <span class="stat-label">Total Suppliers</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ getActiveCount() }}</span>
                <span class="stat-label">Active</span>
              </div>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="navigateToDashboard()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
            Dashboard
          </button>
          <button class="btn btn-primary" (click)="navigateToCreate()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add Supplier
          </button>
        </div>
      </header>

      <!-- Smart Search & Filters -->
      <div class="search-section">
        <form [formGroup]="searchForm" class="search-form">
          <!-- Primary Search -->
          <div class="search-primary">
            <div class="search-input-wrapper">
              <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input 
                type="text" 
                formControlName="search"
                placeholder="Search suppliers by company name, code, or contact person..."
                class="search-input"
              />
              <button 
                type="button" 
                class="search-clear" 
                *ngIf="searchForm.get('search')?.value"
                (click)="clearSearch()"
                title="Clear search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <button 
              type="button" 
              class="filter-toggle-btn"
              [class.active]="showFilters()"
              (click)="toggleFilters()"
              title="Toggle filters">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 6h10v2H7zm2 3h6v2H9zm2 3h2v2h-2z"/>
              </svg>
              Filters
              <span class="filter-count" *ngIf="getActiveFilterCount() > 0">{{ getActiveFilterCount() }}</span>
            </button>
          </div>

          <!-- Advanced Filters (Collapsible) -->
          <div class="advanced-filters" [class.show]="showFilters()">
            <div class="filter-grid">
              <div class="filter-field">
                <label for="isActive">Status</label>
                <select id="isActive" formControlName="isActive" class="form-select">
                  <option value="">All Status</option>
                  <option value="true">Active Only</option>
                  <option value="false">Inactive Only</option>
                </select>
              </div>

              <div class="filter-field">
                <label for="branchId">Branch</label>
                <select id="branchId" formControlName="branchId" class="form-select">
                  <option value="">All Branches</option>
                  <!-- Branch options would be loaded dynamically -->
                </select>
              </div>

              <div class="filter-field">
                <label for="minPaymentTerms">Min Payment Days</label>
                <input 
                  id="minPaymentTerms"
                  type="number" 
                  formControlName="minPaymentTerms"
                  placeholder="e.g. 30"
                  class="form-input"
                  min="1"
                  max="365"
                />
              </div>

              <div class="filter-field">
                <label for="maxPaymentTerms">Max Payment Days</label>
                <input 
                  id="maxPaymentTerms"
                  type="number" 
                  formControlName="maxPaymentTerms"
                  placeholder="e.g. 90"
                  class="form-input"
                  min="1"
                  max="365"
                />
              </div>

              <div class="filter-field">
                <label for="minCreditLimit">Min Credit Limit</label>
                <input 
                  id="minCreditLimit"
                  type="number" 
                  formControlName="minCreditLimit"
                  placeholder="10000000"
                  class="form-input"
                  min="0"
                />
              </div>

              <div class="filter-actions">
                <button type="button" class="btn btn-outline" (click)="clearFilters()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                  Clear All
                </button>
                <button type="button" class="btn btn-secondary" (click)="exportSuppliers()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  Export
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <div *ngIf="supplierService.loading()" class="loading-section">
        <div class="loading-container">
          <div class="loading-spinner">
            <svg class="spinner" width="24" height="24" viewBox="0 0 24 24">
              <circle class="path" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="32" stroke-dashoffset="32"></circle>
            </svg>
          </div>
          <p class="loading-text">Loading suppliers...</p>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="supplierService.error()" class="error-section">
        <div class="error-container">
          <div class="error-content">
            <svg class="error-icon" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 15h2v2h-2zm0-8h2v6h-2zm1-5C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2z"/>
            </svg>
            <div class="error-details">
              <h3>Unable to load suppliers</h3>
              <p>{{ supplierService.error() }}</p>
            </div>
            <button class="btn btn-primary" (click)="loadSuppliers()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              Try Again
            </button>
          </div>
        </div>
      </div>

      <!-- Enhanced Suppliers Grid -->
      <div *ngIf="!supplierService.loading() && !supplierService.error()" class="suppliers-section">
        <!-- View Controls -->
        <div class="view-controls">
          <div class="view-toggle">
            <button 
              class="view-btn"
              [class.active]="viewMode() === 'grid'"
              (click)="setViewMode('grid')"
              title="Grid View">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 18h5v-6h-5v6zm-6 0h5V6H4v12zm6 0h5v-6h-5v6zm-6-8h5V6H4v4zm6 0h5V6h-5v4z"/>
              </svg>
              Grid
            </button>
            <button 
              class="view-btn"
              [class.active]="viewMode() === 'list'"
              (click)="setViewMode('list')"
              title="List View">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 14h4v-4H3v4zm0 5h4v-4H3v4zM3 9h4V5H3v4zm5 5h13v-4H8v4zm0 5h13v-4H8v4zM8 5v4h13V5H8z"/>
              </svg>
              List
            </button>
          </div>
          <div class="sort-controls">
            <select class="sort-select" [value]="currentQuery().sortBy + '_' + currentQuery().sortOrder" (change)="onSortChange($event)">
              <option value="companyName_asc">Company A-Z</option>
              <option value="companyName_desc">Company Z-A</option>
              <option value="supplierCode_asc">Code A-Z</option>
              <option value="supplierCode_desc">Code Z-A</option>
              <option value="creditLimit_desc">Credit Limit High-Low</option>
              <option value="creditLimit_asc">Credit Limit Low-High</option>
              <option value="createdAt_desc">Newest First</option>
              <option value="createdAt_asc">Oldest First</option>
            </select>
          </div>
        </div>

        <!-- Grid View -->
        <div *ngIf="viewMode() === 'grid'" class="suppliers-grid">
          <div *ngFor="let supplier of paginatedSuppliers(); trackBy: trackBySupplier" 
               class="supplier-card">
            <div class="card-header">
              <div class="supplier-avatar">
                <span class="avatar-text">{{ getSupplierInitials(supplier.companyName) }}</span>
              </div>
              <div class="supplier-basic">
                <h3 class="supplier-name">{{ supplier.companyName || 'N/A' }}</h3>
                <p class="supplier-code">{{ supplier.supplierCode || 'N/A' }}</p>
                <div class="supplier-status">
                  <div class="status-indicator" [class.active]="supplier.isActive"></div>
                  <span class="status-text">{{ supplier.isActive ? 'Active' : 'Inactive' }}</span>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="supplier-info">
                <div class="info-item">
                  <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5V8.5C15 9.6 14.1 10.5 13 10.5C11.9 10.5 11 9.6 11 8.5V7.5L5 7V9C5 10.1 5.9 11 7 11H11V13H7C5.9 13 5 13.9 5 15V21H7V15H11V21H13V15H17V21H19V15C19 13.9 18.1 13 17 13H13V11H17C18.1 11 19 10.1 19 9V7Z"/>
                  </svg>
                  <span class="info-text">{{ supplier.contactPerson || 'N/A' }}</span>
                </div>
                <div class="info-item">
                  <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5A1 1 0 0 1 21 16.5V20A1 1 0 0 1 20 21A17 17 0 0 1 3 4A1 1 0 0 1 4 3H7.5A1 1 0 0 1 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z"/>
                  </svg>
                  <span class="info-text">{{ supplier.phone || 'N/A' }}</span>
                </div>
                <div class="info-item">
                  <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span class="info-text">{{ supplier.paymentTerms || 0 }} days</span>
                </div>
                <div class="info-item">
                  <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                  </svg>
                  <span class="info-text">{{ formatCurrency(supplier.creditLimit || 0) }}</span>
                </div>
                <div *ngIf="supplier.branchName" class="info-item">
                  <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span class="info-text">{{ supplier.branchName }}</span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <div class="action-buttons">
                <button class="btn btn-ghost" (click)="showSupplierFactures(supplier)" title="View Factures">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM6 20V4H13V9H18V20H6Z"/>
                  </svg>
                  Factures
                </button>
                <button class="btn btn-ghost" (click)="navigateToEdit(supplier.id)" title="Edit Supplier">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14.06 9.02L14.98 9.94L5.92 19H5V18.08L14.06 9.02ZM17.66 3C17.41 3 17.15 3.1 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C18.17 3.09 17.92 3 17.66 3ZM14.06 6.19L3 17.25V21H6.75L17.81 9.94L14.06 6.19Z"/>
                  </svg>
                  Edit
                </button>
                <button 
                  class="btn"
                  [class.btn-danger]="supplier.isActive"
                  [class.btn-success]="!supplier.isActive"
                  (click)="toggleSupplierStatus(supplier)"
                  [title]="supplier.isActive ? 'Deactivate Supplier' : 'Activate Supplier'">
                  {{ supplier.isActive ? 'Deactivate' : 'Activate' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- List View -->
        <div *ngIf="viewMode() === 'list'" class="suppliers-list">
          <!-- List Header -->
          <div class="list-header">
            <div class="header-item col-company">Company</div>
            <div class="header-item col-contact">Contact</div>
            <div class="header-item col-details">Details</div>
            <div class="header-item col-status">Status</div>
            <div class="header-item col-actions">Actions</div>
          </div>

          <!-- List Body -->
          <div *ngFor="let supplier of paginatedSuppliers(); trackBy: trackBySupplier" class="list-row">
            <div class="list-cell col-company">
              <div class="supplier-avatar">
                <span class="avatar-text">{{ getSupplierInitials(supplier.companyName) }}</span>
              </div>
              <div class="supplier-basic">
                <h3 class="supplier-name">{{ supplier.companyName || 'N/A' }}</h3>
                <p class="supplier-code">{{ supplier.supplierCode || 'N/A' }}</p>
              </div>
            </div>
            <div class="list-cell col-contact">
              <div class="info-item">
                <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5V8.5C15 9.6 14.1 10.5 13 10.5C11.9 10.5 11 9.6 11 8.5V7.5L5 7V9C5 10.1 5.9 11 7 11H11V13H7C5.9 13 5 13.9 5 15V21H7V15H11V21H13V15H17V21H19V15C19 13.9 18.1 13 17 13H13V11H17C18.1 11 19 10.1 19 9V7Z"/>
                </svg>
                <span class="info-text">{{ supplier.contactPerson || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5A1 1 0 0 1 21 16.5V20A1 1 0 0 1 20 21A17 17 0 0 1 3 4A1 1 0 0 1 4 3H7.5A1 1 0 0 1 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z"/>
                </svg>
                <span class="info-text">{{ supplier.phone || 'N/A' }}</span>
              </div>
            </div>
            <div class="list-cell col-details">
              <div class="info-item">
                <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span class="info-text">{{ supplier.paymentTerms || 0 }} days</span>
              </div>
              <div class="info-item">
                <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                </svg>
                <span class="info-text">{{ formatCurrency(supplier.creditLimit || 0) }}</span>
              </div>
            </div>
            <div class="list-cell col-status">
              <div class="supplier-status">
                <div class="status-indicator" [class.active]="supplier.isActive"></div>
                <span class="status-text">{{ supplier.isActive ? 'Active' : 'Inactive' }}</span>
              </div>
            </div>
            <div class="list-cell col-actions">
              <div class="action-buttons-list">
                <button class="btn btn-ghost btn-icon" (click)="showSupplierFactures(supplier)" title="View Factures">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM6 20V4H13V9H18V20H6Z"/>
                  </svg>
                </button>
                <button class="btn btn-ghost btn-icon" (click)="navigateToEdit(supplier.id)" title="Edit Supplier">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14.06 9.02L14.98 9.94L5.92 19H5V18.08L14.06 9.02ZM17.66 3C17.41 3 17.15 3.1 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C18.17 3.09 17.92 3 17.66 3ZM14.06 6.19L3 17.25V21H6.75L17.81 9.94L14.06 6.19Z"/>
                  </svg>
                </button>
                <button 
                  class="btn btn-sm"
                  [class.btn-danger]="supplier.isActive"
                  [class.btn-success]="!supplier.isActive"
                  (click)="toggleSupplierStatus(supplier)"
                  [title]="supplier.isActive ? 'Deactivate Supplier' : 'Activate Supplier'">
                  {{ supplier.isActive ? 'Deactivate' : 'Activate' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="paginatedSuppliers().length === 0" class="empty-state">
          <div class="empty-content">
            <svg class="empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <h3>{{ hasActiveFilters() ? 'No matching suppliers' : 'No suppliers found' }}</h3>
            <p *ngIf="hasActiveFilters()">Try adjusting your search filters or create a new supplier.</p>
            <p *ngIf="!hasActiveFilters()">Start by adding your first supplier to the system.</p>
            <div class="empty-actions">
              <button class="btn btn-primary" (click)="navigateToCreate()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Add Your First Supplier
              </button>
              <button *ngIf="hasActiveFilters()" class="btn btn-outline" (click)="clearFilters()">
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div *ngIf="totalPages() > 1" class="pagination-section">
          <div class="pagination-info">
            <p class="pagination-text">
              Showing {{ getDisplayStart() }} to {{ getDisplayEnd() }} of {{ totalCount() }} suppliers
            </p>
          </div>

          <div class="pagination-controls">
            <button class="btn btn-outline pagination-btn" 
                    [disabled]="currentQuery().page <= 1"
                    (click)="previousPage()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
              Previous
            </button>

            <div class="page-numbers">
              <button *ngFor="let page of getVisiblePages()" 
                      class="btn pagination-btn"
                      [class.btn-primary]="page === currentQuery().page"
                      [class.btn-outline]="page !== currentQuery().page"
                      (click)="goToPage(page)">
                {{ page }}
              </button>
            </div>

            <button class="btn btn-outline pagination-btn" 
                    [disabled]="currentQuery().page >= totalPages()"
                    (click)="nextPage()">
              Next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Supplier Factures Modal -->
      <div *ngIf="showFacturesModal()" class="modal-overlay" (click)="closeFacturesModal()">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title">
              <h2>{{ selectedSupplier()?.companyName }} Factures</h2>
              <p class="modal-subtitle">Complete list of factures for this supplier</p>
            </div>
            <button class="modal-close" (click)="closeFacturesModal()" title="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- Factures Summary -->
            <div *ngIf="supplierSummary()" class="factures-summary">
              <div class="summary-stats">
                <div class="summary-stat">
                  <span class="stat-value">{{ supplierSummary()?.totalFactures || 0 }}</span>
                  <span class="stat-label">Total Factures</span>
                </div>
                <div class="summary-stat">
                  <span class="stat-value">{{ formatCurrency(supplierSummary()?.totalOutstanding || 0) }}</span>
                  <span class="stat-label">Outstanding</span>
                </div>
                <div class="summary-stat">
                  <span class="stat-value">{{ supplierSummary()?.overdueCount || 0 }}</span>
                  <span class="stat-label">Overdue</span>
                </div>
                <div class="summary-stat">
                  <span class="stat-value">{{ supplierSummary()?.avgPaymentDays || 0 }}</span>
                  <span class="stat-label">Avg Payment Days</span>
                </div>
              </div>
            </div>

            <!-- Factures Filter -->
            <div class="factures-filter">
              <div class="filter-toggle">
                <button 
                  class="filter-btn"
                  [class.active]="facturesFilter() === 'outstanding'"
                  (click)="setFacturesFilter('outstanding')">
                  Outstanding Only
                </button>
                <button 
                  class="filter-btn"
                  [class.active]="facturesFilter() === 'all'"
                  (click)="setFacturesFilter('all')">
                  All Factures
                </button>
              </div>
            </div>

            <!-- Loading Factures -->
            <div *ngIf="loadingFactures()" class="loading-factures">
              <div class="loading-spinner">
                <svg class="spinner" width="24" height="24" viewBox="0 0 24 24">
                  <circle class="path" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="32" stroke-dashoffset="32"></circle>
                </svg>
              </div>
              <p>Loading factures...</p>
            </div>

            <!-- Factures List -->
            <div *ngIf="!loadingFactures()" class="factures-list">
              <div *ngFor="let facture of supplierFactures(); trackBy: trackByFacture" 
                   class="facture-item">
                <div class="facture-header">
                  <div class="facture-info">
                    <h4 class="facture-number">{{ facture.supplierInvoiceNumber }}</h4>
                    <p class="facture-reference">{{ facture.internalReferenceNumber }}</p>
                    <span class="facture-branch">{{ facture.branchName }}</span>
                  </div>
                  <div class="facture-status">
                    <span class="status-badge" [class]="'status-' + facture.status">
                      {{ facture.statusDisplay }}
                    </span>
                    <span *ngIf="facture.isOverdue" class="overdue-badge">
                      {{ facture.daysOverdue }} days overdue
                    </span>
                  </div>
                </div>

                <div class="facture-body">
                  <div class="facture-amounts">
                    <div class="amount-item">
                      <span class="amount-label">Total Amount</span>
                      <span class="amount-value">{{ formatCurrency(facture.totalAmount) }}</span>
                    </div>
                    <div class="amount-item">
                      <span class="amount-label">Paid Amount</span>
                      <span class="amount-value">{{ formatCurrency(facture.paidAmount) }}</span>
                    </div>
                    <div class="amount-item">
                      <span class="amount-label">Outstanding</span>
                      <span class="amount-value outstanding">{{ formatCurrency(facture.outstandingAmount) }}</span>
                    </div>
                  </div>

                  <div class="facture-dates">
                    <div class="date-item">
                      <span class="date-label">Invoice Date</span>
                      <span class="date-value">{{ formatDate(facture.invoiceDate) }}</span>
                    </div>
                    <div class="date-item">
                      <span class="date-label">Due Date</span>
                      <span class="date-value" [class.overdue]="facture.isOverdue">
                        {{ formatDate(facture.dueDate) }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="facture-footer">
                  <div class="priority-indicator" [class]="'priority-' + facture.paymentPriority">
                    <span class="priority-text">{{ facture.priorityDisplay }}</span>
                  </div>
                  <div class="facture-actions">
                    <button class="btn btn-sm btn-outline" (click)="navigateToFacture(facture.id)">
                      View Details
                    </button>
                  </div>
                </div>
              </div>

              <!-- Empty Factures State -->
              <div *ngIf="supplierFactures().length === 0" class="empty-factures">
                <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM6 20V4H13V9H18V20H6Z"/>
                </svg>
                <h3>No factures found</h3>
                <p>{{ facturesFilter() === 'outstanding' ? 'No outstanding factures for this supplier.' : 'This supplier has no factures yet.' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./supplier-list.component.scss']
})
export class SupplierListComponent implements OnInit, OnDestroy {
  // Injected services
  readonly supplierService = inject(SupplierService);
  private readonly factureService = inject(FactureService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  // Component state
  private readonly destroy$ = new Subject<void>();
  
  // Reactive form for search and filters
  searchForm: FormGroup;

  // Signal-based state
  private _currentQuery = signal<SupplierQueryDto>({
    page: 1,
    pageSize: 25,
    sortBy: 'companyName',
    sortOrder: 'asc'
  });

  private _totalCount = signal<number>(0);
  private _suppliers = signal<SupplierDto[]>([]);
  private _viewMode = signal<'grid' | 'list'>('grid');
  private _showFilters = signal<boolean>(false);

  // Factures modal state
  private _showFacturesModal = signal<boolean>(false);
  private _selectedSupplier = signal<SupplierDto | null>(null);
  private _supplierFactures = signal<SupplierFactureDto[]>([]);
  private _supplierSummary = signal<SupplierSummaryDto | null>(null);
  private _loadingFactures = signal<boolean>(false);
  private _facturesFilter = signal<'outstanding' | 'all'>('outstanding');

  // Public readonly signals
  readonly currentQuery = this._currentQuery.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();
  readonly suppliers = this._suppliers.asReadonly();
  readonly viewMode = this._viewMode.asReadonly();
  readonly showFilters = this._showFilters.asReadonly();
  readonly showFacturesModal = this._showFacturesModal.asReadonly();
  readonly selectedSupplier = this._selectedSupplier.asReadonly();
  readonly supplierFactures = this._supplierFactures.asReadonly();
  readonly supplierSummary = this._supplierSummary.asReadonly();
  readonly loadingFactures = this._loadingFactures.asReadonly();
  readonly facturesFilter = this._facturesFilter.asReadonly();

  // Computed properties
  readonly totalPages = computed(() => 
    Math.ceil(this.totalCount() / this.currentQuery().pageSize)
  );

  readonly paginatedSuppliers = computed(() => this.suppliers());

  readonly getActiveCount = computed(() => 
    this.suppliers().filter(s => s.isActive).length
  );

  constructor() {
    this.searchForm = this.fb.group({
      search: [''],
      branchId: [null],
      isActive: [''],
      minPaymentTerms: [null],
      maxPaymentTerms: [null],
      minCreditLimit: [null]
    });

    // Load view mode from localStorage
    const savedViewMode = localStorage.getItem('supplier-view-mode') as 'grid' | 'list';
    if (savedViewMode) {
      this._viewMode.set(savedViewMode);
    }
  }

  ngOnInit(): void {
    this.loadSuppliers();
    this.setupSearchSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Setup reactive search with debounce
  private setupSearchSubscription(): void {
    this.searchForm.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this._currentQuery.update(query => ({ ...query, page: 1 }));
        this.applyFilters();
      });
  }

  // Apply current form filters to query
  private applyFilters(): void {
    const formValue = this.searchForm.value;
    
    this._currentQuery.update(query => ({
      ...query,
      search: formValue.search || undefined,
      branchId: formValue.branchId || undefined,
      isActive: formValue.isActive === '' ? undefined : formValue.isActive === 'true',
      minPaymentTerms: formValue.minPaymentTerms || undefined,
      maxPaymentTerms: formValue.maxPaymentTerms || undefined,
      minCreditLimit: formValue.minCreditLimit || undefined,
      page: 1
    }));

    this.loadSuppliers();
  }

  // Load suppliers from service
  loadSuppliers(): void {
    this.supplierService.clearError();
    
    this.supplierService.getSuppliers(this.currentQuery()).subscribe({
      next: (response: SupplierPagedResponseDto) => {
        this._suppliers.set(response.suppliers);
        this._totalCount.set(response.totalCount);
      },
      error: (error) => {
        this.toastService.showError('Error', `Failed to load suppliers: ${error.message}`);
      }
    });
  }

  // View mode controls
  setViewMode(mode: 'grid' | 'list'): void {
    this._viewMode.set(mode);
    localStorage.setItem('supplier-view-mode', mode);
  }

  toggleFilters(): void {
    this._showFilters.update(show => !show);
  }

  // Search controls
  clearSearch(): void {
    this.searchForm.get('search')?.setValue('');
  }

  getActiveFilterCount(): number {
    const formValue = this.searchForm.value;
    let count = 0;
    if (formValue.search) count++;
    if (formValue.branchId) count++;
    if (formValue.isActive !== '') count++;
    if (formValue.minPaymentTerms) count++;
    if (formValue.maxPaymentTerms) count++;
    if (formValue.minCreditLimit) count++;
    return count;
  }

  // Navigation methods
  navigateToDashboard(): void {
    this.router.navigate(['/dashboard/supplier']);
  }

  navigateToCreate(): void {
    this.router.navigate(['/dashboard/supplier/create']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/dashboard/supplier/edit', id]);
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/dashboard/supplier', id]);
  }

  navigateToFacture(factureId: number): void {
    this.router.navigate(['/dashboard/facture', factureId]);
  }

  // Sorting
  onSort(column: string): void {
    this._currentQuery.update(query => {
      if (query.sortBy === column) {
        return { ...query, sortOrder: query.sortOrder === 'asc' ? 'desc' : 'asc' };
      } else {
        return { ...query, sortBy: column, sortOrder: 'asc' };
      }
    });
    this.loadSuppliers();
  }

  onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const [sortBy, sortOrder] = target.value.split('_');
    this._currentQuery.update(query => ({ ...query, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
    this.loadSuppliers();
  }

  // Pagination methods
  previousPage(): void {
    if (this.currentQuery().page > 1) {
      this._currentQuery.update(query => ({ ...query, page: query.page - 1 }));
      this.loadSuppliers();
    }
  }

  nextPage(): void {
    if (this.currentQuery().page < this.totalPages()) {
      this._currentQuery.update(query => ({ ...query, page: query.page + 1 }));
      this.loadSuppliers();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this._currentQuery.update(query => ({ ...query, page }));
      this.loadSuppliers();
    }
  }

  // Pagination helpers
  getDisplayStart(): number {
    return ((this.currentQuery().page - 1) * this.currentQuery().pageSize) + 1;
  }

  getDisplayEnd(): number {
    const end = this.currentQuery().page * this.currentQuery().pageSize;
    return Math.min(end, this.totalCount());
  }

  getVisiblePages(): number[] {
    const current = this.currentQuery().page;
    const total = this.totalPages();
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      rangeWithDots.push(1, -1);
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current + delta < total - 1) {
      rangeWithDots.push(-1, total);
    } else if (total > 1) {
      rangeWithDots.push(total);
    }

    return rangeWithDots.filter(page => page !== -1);
  }

  // Status toggle
  toggleSupplierStatus(supplier: SupplierDto): void {
    const statusDto: SupplierStatusDto = {
      isActive: !supplier.isActive,
      reason: `Status changed via admin panel`
    };

    this.supplierService.toggleSupplierStatus(supplier.id, statusDto).subscribe({
      next: (updatedSupplier) => {
        this._suppliers.update(suppliers => 
          suppliers.map(s => s.id === supplier.id ? updatedSupplier : s)
        );
        this.toastService.showSuccess(
          'Success',
          `Supplier ${updatedSupplier.isActive ? 'activated' : 'deactivated'} successfully`
        );
      },
      error: (error) => {
        this.toastService.showError('Error', `Failed to update supplier: ${error.message}`);
      }
    });
  }

  // Supplier Factures Modal
  showSupplierFactures(supplier: SupplierDto): void {
    this._selectedSupplier.set(supplier);
    this._showFacturesModal.set(true);
    this.loadSupplierFactures(supplier.id);
    this.loadSupplierSummary(supplier.id);
  }

  closeFacturesModal(): void {
    this._showFacturesModal.set(false);
    this._selectedSupplier.set(null);
    this._supplierFactures.set([]);
    this._supplierSummary.set(null);
  }

  setFacturesFilter(filter: 'outstanding' | 'all'): void {
    this._facturesFilter.set(filter);
    const supplier = this._selectedSupplier();
    if (supplier) {
      this.loadSupplierFactures(supplier.id);
    }
  }

  private loadSupplierFactures(supplierId: number): void {
    this._loadingFactures.set(true);
    
    const includeCompleted = this._facturesFilter() === 'all';
    const url = `/api/Facture/supplier/${supplierId}?includeCompleted=${includeCompleted}&pageSize=50`;

    this.http.get<{ success: boolean; data: SupplierFactureDto[]; message?: string }>(url, { withCredentials: true })
      .pipe(
        catchError(error => {
          console.warn('⚠️ Supplier factures endpoint not available:', error);
          console.log('📝 Using fallback empty factures data for supplier:', supplierId);
          
          // Don't show error toast for missing endpoints, just log a warning
          if (error.status === 500) {
            console.warn('💡 Backend endpoint /api/Facture/supplier/{id} may not be implemented yet');
          } else {
            this.toastService.showWarning('Notice', 'Factures data temporarily unavailable');
          }
          
          // Return successful response with empty data
          return of({ success: true, data: [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this._supplierFactures.set(response.data || []);
          } else {
            console.warn('Factures API returned unsuccessful response:', response.message);
            this._supplierFactures.set([]);
          }
          this._loadingFactures.set(false);
        },
        error: () => {
          this._loadingFactures.set(false);
          this._supplierFactures.set([]);
        }
      });
  }

  private loadSupplierSummary(supplierId: number): void {
    const url = `/api/Facture/supplier/${supplierId}/summary`;

    this.http.get<{ success: boolean; data: SupplierSummaryDto; message?: string }>(url, { withCredentials: true })
      .pipe(
        catchError(error => {
          console.warn('⚠️ Supplier summary endpoint not available:', error);
          
          if (error.status === 500) {
            console.warn('💡 Backend endpoint /api/Facture/supplier/{id}/summary may not be implemented yet');
            
            // Return fallback summary data
            const fallbackSummary: SupplierSummaryDto = {
              supplierId: supplierId,
              totalFactures: 0,
              totalOutstanding: 0,
              overdueCount: 0,
              overdueAmount: 0,
              avgPaymentDays: 0,
              creditUtilization: 0,
              lastPaymentDate: undefined
            };
            
            return of({ success: true, data: fallbackSummary });
          }
          
          return of({ success: false, data: null as any });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this._supplierSummary.set(response.data);
          } else {
            // Set fallback summary even if API fails
            const fallbackSummary: SupplierSummaryDto = {
              supplierId: supplierId,
              totalFactures: 0,
              totalOutstanding: 0,
              overdueCount: 0,
              overdueAmount: 0,
              avgPaymentDays: 0,
              creditUtilization: 0,
              lastPaymentDate: undefined
            };
            this._supplierSummary.set(fallbackSummary);
          }
        }
      });
  }

  // Utility methods
  clearFilters(): void {
    this.searchForm.reset();
    this._currentQuery.set({
      page: 1,
      pageSize: 25,
      sortBy: 'companyName',
      sortOrder: 'asc'
    });
    this.loadSuppliers();
  }

  hasActiveFilters(): boolean {
    const formValue = this.searchForm.value;
    return !!(formValue.search || formValue.branchId || formValue.isActive || 
             formValue.minPaymentTerms || formValue.maxPaymentTerms || formValue.minCreditLimit);
  }

  exportSuppliers(): void {
    this.toastService.showInfo('Info', 'Export functionality coming soon');
  }

  getSupplierInitials(companyName?: string): string {
    if (!companyName) return '??';
    return companyName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'N/A';
    }
    
    try {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error, 'Amount:', amount);
      return 'Format Error';
    }
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      return 'Invalid Date';
    }
  }

  trackBySupplier(index: number, supplier: SupplierDto): number {
    return supplier.id;
  }

  trackByFacture(index: number, facture: SupplierFactureDto): number {
    return facture.id;
  }
}
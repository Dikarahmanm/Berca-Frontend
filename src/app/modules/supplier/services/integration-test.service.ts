import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { SupplierService } from './supplier.service';
import { FactureService } from '../../facture/services/facture.service';
import { SupplierFactureIntegrationService } from './supplier-facture-integration.service';

export interface IntegrationTestResult {
  testName: string;
  success: boolean;
  duration: number;
  message: string;
  details?: any;
}

export interface IntegrationTestSuite {
  overallSuccess: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: IntegrationTestResult[];
  summary: string;
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationTestService {
  private readonly supplierService = inject(SupplierService);
  private readonly factureService = inject(FactureService);
  private readonly integrationService = inject(SupplierFactureIntegrationService);

  /**
   * Run comprehensive integration tests
   */
  runIntegrationTests(): Observable<IntegrationTestSuite> {
    console.log('🧪 Starting integration tests...');
    const startTime = Date.now();
    
    const tests = [
      this.testSupplierServiceConnection(),
      this.testFactureServiceConnection(),
      this.testSupplierDataLoad(),
      this.testFactureDataLoad(),
      this.testIntegrationService(),
      this.testProxyConfiguration()
    ];

    return combineLatest(tests).pipe(
      map(results => {
        const totalDuration = Date.now() - startTime;
        const passedTests = results.filter(r => r.success).length;
        const failedTests = results.length - passedTests;
        
        const suite: IntegrationTestSuite = {
          overallSuccess: failedTests === 0,
          totalTests: results.length,
          passedTests,
          failedTests,
          totalDuration,
          results,
          summary: this.generateSummary(results, totalDuration)
        };

        console.log('🧪 Integration tests completed:', suite);
        return suite;
      })
    );
  }

  /**
   * Test 1: Supplier Service Connection
   */
  private testSupplierServiceConnection(): Observable<IntegrationTestResult> {
    const startTime = Date.now();
    
    return this.supplierService.getSuppliers({
      page: 1,
      pageSize: 5,
      sortBy: 'companyName',
      sortOrder: 'asc'
    }).pipe(
      map(response => ({
        testName: 'Supplier Service Connection',
        success: true,
        duration: Date.now() - startTime,
        message: `Successfully loaded ${response.suppliers?.length || 0} suppliers`,
        details: {
          totalSuppliers: response.totalCount,
          responseType: typeof response,
          hasSuppliers: Array.isArray(response.suppliers)
        }
      })),
      catchError(error => of({
        testName: 'Supplier Service Connection',
        success: false,
        duration: Date.now() - startTime,
        message: `Failed to connect to Supplier API: ${error.message}`,
        details: {
          status: error.status,
          url: error.url,
          errorType: typeof error
        }
      }))
    );
  }

  /**
   * Test 2: Facture Service Connection
   */
  private testFactureServiceConnection(): Observable<IntegrationTestResult> {
    const startTime = Date.now();
    
    return this.factureService.testConnection().pipe(
      map(response => ({
        testName: 'Facture Service Connection',
        success: true,
        duration: Date.now() - startTime,
        message: 'Successfully connected to Facture API',
        details: {
          responseType: typeof response,
          response: response
        }
      })),
      catchError(error => of({
        testName: 'Facture Service Connection',
        success: false,
        duration: Date.now() - startTime,
        message: `Failed to connect to Facture API: ${error.message}`,
        details: {
          status: error.status,
          url: error.url,
          proxyConfig: 'Check proxy.conf.js'
        }
      }))
    );
  }

  /**
   * Test 3: Supplier Data Load
   */
  private testSupplierDataLoad(): Observable<IntegrationTestResult> {
    const startTime = Date.now();
    
    return this.supplierService.getSuppliers({
      page: 1,
      pageSize: 10,
      sortBy: 'companyName',
      sortOrder: 'asc'
    }).pipe(
      map(response => {
        const suppliers = response.suppliers || [];
        const hasValidData = suppliers.length > 0 && suppliers[0]?.companyName;
        
        return {
          testName: 'Supplier Data Load',
          success: Boolean(hasValidData),
          duration: Date.now() - startTime,
          message: hasValidData 
            ? `Loaded ${suppliers.length} suppliers with valid data`
            : 'No valid supplier data found',
          details: {
            supplierCount: suppliers.length,
            sampleSupplier: suppliers[0] || null,
            hasCompanyNames: suppliers.filter(s => s.companyName).length
          }
        };
      }),
      catchError(error => of({
        testName: 'Supplier Data Load',
        success: false,
        duration: Date.now() - startTime,
        message: `Failed to load supplier data: ${error.message}`,
        details: error
      }))
    );
  }

  /**
   * Test 4: Facture Data Load
   */
  private testFactureDataLoad(): Observable<IntegrationTestResult> {
    const startTime = Date.now();
    
    return this.factureService.getFactures({
      page: 1,
      pageSize: 10,
      sortBy: 'CreatedAt',
      sortOrder: 'desc'
    }).pipe(
      map(response => {
        const factures = response.factures || [];
        const hasValidData = factures.length > 0 && factures[0]?.supplierName;
        
        return {
          testName: 'Facture Data Load',
          success: Boolean(hasValidData),
          duration: Date.now() - startTime,
          message: hasValidData 
            ? `Loaded ${factures.length} factures with valid data`
            : 'No valid facture data found',
          details: {
            factureCount: factures.length,
            sampleFacture: factures[0] || null,
            hasSupplierNames: factures.filter(f => f.supplierName).length,
            totalAmount: response.totalAmount || 0,
            overdueCount: response.overdueCount || 0
          }
        };
      }),
      catchError(error => of({
        testName: 'Facture Data Load',
        success: false,
        duration: Date.now() - startTime,
        message: `Failed to load facture data: ${error.message}`,
        details: error
      }))
    );
  }

  /**
   * Test 5: Integration Service
   */
  private testIntegrationService(): Observable<IntegrationTestResult> {
    const startTime = Date.now();
    
    return this.integrationService.getIntegratedSupplierAnalytics().pipe(
      map(stats => {
        const hasIntegratedData = stats.totalSuppliers > 0 || stats.totalOutstandingAmount > 0;
        
        return {
          testName: 'Integration Service',
          success: hasIntegratedData,
          duration: Date.now() - startTime,
          message: hasIntegratedData 
            ? `Successfully integrated data for ${stats.totalSuppliers} suppliers`
            : 'Integration service working but no data found',
          details: {
            totalSuppliers: stats.totalSuppliers,
            activeSuppliers: stats.activeSuppliers,
            totalOutstanding: stats.totalOutstandingAmount,
            highRiskSuppliers: stats.highRiskSuppliers.length,
            branchCount: stats.suppliersByBranch.length
          }
        };
      }),
      catchError(error => of({
        testName: 'Integration Service',
        success: false,
        duration: Date.now() - startTime,
        message: `Integration service failed: ${error.message}`,
        details: error
      }))
    );
  }

  /**
   * Test 6: Proxy Configuration
   */
  private testProxyConfiguration(): Observable<IntegrationTestResult> {
    const startTime = Date.now();
    
    // Test if the proxy is correctly forwarding requests
    return this.factureService.getFactures({
      page: 1,
      pageSize: 1,
      sortBy: 'CreatedAt',
      sortOrder: 'desc'
    }).pipe(
      map(response => ({
        testName: 'Proxy Configuration',
        success: true,
        duration: Date.now() - startTime,
        message: 'Proxy is correctly forwarding requests to backend',
        details: {
          proxyTarget: 'http://localhost:5171',
          apiPath: '/api/**',
          responseReceived: !!response
        }
      })),
      catchError(error => {
        const isProxyIssue = error.status === 0 || error.status === 502 || error.status === 503;
        
        return of({
          testName: 'Proxy Configuration',
          success: false,
          duration: Date.now() - startTime,
          message: isProxyIssue 
            ? 'Proxy configuration issue - check proxy.conf.js and backend'
            : `API error but proxy seems to work: ${error.message}`,
          details: {
            status: error.status,
            isProxyIssue,
            possibleCauses: [
              'Backend server not running on localhost:5171',
              'Proxy configuration incorrect in proxy.conf.js',
              'Angular dev server not using proxy config'
            ],
            recommendations: [
              'Check if backend is running: curl http://localhost:5171/api/Facture',
              'Verify proxy.conf.js has correct target',
              'Restart Angular dev server with --proxy-config proxy.conf.js'
            ]
          }
        });
      })
    );
  }

  /**
   * Generate test summary
   */
  private generateSummary(results: IntegrationTestResult[], duration: number): string {
    const passed = results.filter(r => r.success);
    const failed = results.filter(r => r.success === false);
    
    if (failed.length === 0) {
      return `✅ All ${results.length} integration tests passed in ${duration}ms. Supplier-Facture integration is working correctly.`;
    }
    
    const criticalFailures = failed.filter(r => 
      r.testName.includes('Connection') || r.testName.includes('Proxy')
    );
    
    if (criticalFailures.length > 0) {
      return `❌ Critical integration failures detected. ${criticalFailures.length} connection issues need to be resolved before the integration will work properly.`;
    }
    
    return `⚠️ Partial integration success: ${passed.length}/${results.length} tests passed. Some features may not work as expected.`;
  }

  /**
   * Test specific supplier-facture workflow
   */
  testSupplierFactureWorkflow(supplierId: number): Observable<IntegrationTestResult> {
    const startTime = Date.now();
    
    return this.integrationService.getSupplierWithFactures(supplierId).pipe(
      map(integration => {
        const hasData = Boolean(integration && integration.totalFactures >= 0);
        
        return {
          testName: 'Supplier-Facture Workflow',
          success: hasData,
          duration: Date.now() - startTime,
          message: hasData 
            ? `Successfully retrieved integration data for supplier ${supplierId}`
            : 'Failed to retrieve supplier-facture integration data',
          details: integration
        };
      }),
      catchError(error => of({
        testName: 'Supplier-Facture Workflow',
        success: false,
        duration: Date.now() - startTime,
        message: `Workflow test failed: ${error.message}`,
        details: error
      }))
    );
  }

  /**
   * Get backend connection status
   */
  getBackendStatus(): Observable<{ supplier: boolean; facture: boolean }> {
    return combineLatest([
      this.supplierService.getSuppliers({
        page: 1, pageSize: 1, sortBy: 'companyName', sortOrder: 'asc'
      }).pipe(
        map(() => true),
        catchError(() => of(false))
      ),
      this.factureService.testConnection().pipe(
        map(() => true),
        catchError(() => of(false))
      )
    ]).pipe(
      map(([supplier, facture]) => ({ supplier, facture }))
    );
  }
}
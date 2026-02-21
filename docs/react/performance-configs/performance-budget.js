/**
 * Performance Budget Configuration
 * 
 * Centralized performance targets for the React application.
 * Use this as the single source of truth for all performance metrics.
 * 
 * These values should be reviewed quarterly and adjusted based on:
 * - User analytics and behavior
 * - Industry benchmarks
 * - Business requirements
 * - Device/network profiles of target users
 */

module.exports = {
  // Application metadata
  meta: {
    version: '1.0.0',
    lastReviewed: '2025-01-15',
    nextReview: '2025-04-15',
    owner: 'Performance Engineering Team',
  },

  // ========================================
  // CORE WEB VITALS TARGETS
  // ========================================
  coreWebVitals: {
    // Largest Contentful Paint (milliseconds)
    // Good: < 2500ms, Needs Improvement: < 4000ms, Poor: > 4000ms
    LCP: {
      target: 2000,
      warning: 2500,
      critical: 3500,
      unit: 'ms',
      description: 'Time until largest content element is visible',
    },

    // First Input Delay (milliseconds)
    // Good: < 100ms, Needs Improvement: < 300ms, Poor: > 300ms
    FID: {
      target: 50,
      warning: 100,
      critical: 200,
      unit: 'ms',
      description: 'Time from first user interaction to browser response',
    },

    // Cumulative Layout Shift (score)
    // Good: < 0.1, Needs Improvement: < 0.25, Poor: > 0.25
    CLS: {
      target: 0.05,
      warning: 0.1,
      critical: 0.2,
      unit: 'score',
      description: 'Visual stability of the page',
    },

    // Interaction to Next Paint (milliseconds) - New metric
    INP: {
      target: 100,
      warning: 200,
      critical: 500,
      unit: 'ms',
      description: 'Responsiveness to user interactions',
    },
  },

  // ========================================
  // LOADING PERFORMANCE TARGETS
  // ========================================
  loading: {
    // First Contentful Paint
    FCP: {
      target: 1200,
      warning: 1800,
      critical: 2500,
      unit: 'ms',
    },

    // Time to Interactive
    TTI: {
      target: 3000,
      warning: 3500,
      critical: 5000,
      unit: 'ms',
    },

    // Speed Index
    speedIndex: {
      target: 2000,
      warning: 3000,
      critical: 4000,
      unit: 'ms',
    },

    // Total Blocking Time
    TBT: {
      target: 150,
      warning: 200,
      critical: 350,
      unit: 'ms',
    },
  },

  // ========================================
  // BUNDLE SIZE BUDGETS (gzipped)
  // ========================================
  bundleSizes: {
    // Initial load bundles
    initial: {
      mainBundle: {
        target: 120000, // 120KB
        warning: 150000,
        critical: 200000,
        unit: 'bytes',
      },
      vendorBundle: {
        target: 80000, // 80KB
        warning: 100000,
        critical: 150000,
        unit: 'bytes',
      },
      cssBundle: {
        target: 30000, // 30KB
        warning: 50000,
        critical: 80000,
        unit: 'bytes',
      },
      totalInitial: {
        target: 250000, // 250KB
        warning: 300000,
        critical: 400000,
        unit: 'bytes',
      },
    },

    // Route-specific chunks
    routes: {
      dashboard: {
        target: 60000,
        warning: 80000,
        critical: 120000,
        unit: 'bytes',
      },
      reports: {
        target: 80000,
        warning: 100000,
        critical: 150000,
        unit: 'bytes',
      },
      transactions: {
        target: 50000,
        warning: 70000,
        critical: 100000,
        unit: 'bytes',
      },
      settings: {
        target: 30000,
        warning: 50000,
        critical: 80000,
        unit: 'bytes',
      },
    },

    // Per-component budgets for critical components
    components: {
      dataTable: {
        target: 25000,
        warning: 35000,
        critical: 50000,
        unit: 'bytes',
      },
      chart: {
        target: 40000,
        warning: 60000,
        critical: 80000,
        unit: 'bytes',
      },
    },
  },

  // ========================================
  // RUNTIME PERFORMANCE TARGETS
  // ========================================
  runtime: {
    // React rendering
    rendering: {
      maxRerenders: {
        target: 2,
        warning: 3,
        critical: 5,
        unit: 'count',
        description: 'Maximum re-renders per user action',
      },
      longTaskDuration: {
        target: 50,
        warning: 100,
        critical: 150,
        unit: 'ms',
        description: 'Maximum duration for JavaScript tasks',
      },
      frameDrops: {
        target: 0,
        warning: 2,
        critical: 5,
        unit: 'frames',
        description: 'Dropped frames during animations',
      },
    },

    // Memory usage
    memory: {
      heapSize: {
        target: 50000000, // 50MB
        warning: 75000000,
        critical: 100000000,
        unit: 'bytes',
      },
      heapGrowth: {
        target: 0,
        warning: 5000000, // 5MB growth
        critical: 10000000,
        unit: 'bytes/minute',
        description: 'Memory growth over time (indicates leaks)',
      },
    },

    // API performance
    api: {
      responseTime: {
        target: 200,
        warning: 500,
        critical: 1000,
        unit: 'ms',
      },
      cacheHitRate: {
        target: 80,
        warning: 60,
        critical: 40,
        unit: 'percent',
      },
    },
  },

  // ========================================
  // USER EXPERIENCE TARGETS
  // ========================================
  userExperience: {
    // Perceived performance
    perceivedLoad: {
      skeletonScreenTime: {
        target: 200,
        warning: 500,
        critical: 1000,
        unit: 'ms',
        description: 'Time user sees skeleton/loading state',
      },
      interactiveDelay: {
        target: 100,
        warning: 200,
        critical: 500,
        unit: 'ms',
        description: 'Delay after interaction before feedback',
      },
    },

    // Error rates
    errorRates: {
      jsErrors: {
        target: 0,
        warning: 0.1,
        critical: 1,
        unit: 'percent',
      },
      failedRequests: {
        target: 0,
        warning: 1,
        critical: 5,
        unit: 'percent',
      },
    },
  },

  // ========================================
  // DEVICE-SPECIFIC TARGETS
  // ========================================
  deviceProfiles: {
    desktop: {
      multiplier: 1.0,
      description: 'High-end desktop (baseline)',
    },
    laptop: {
      multiplier: 1.2,
      description: 'Standard business laptop',
    },
    mobile4G: {
      multiplier: 2.0,
      description: 'Mobile device on 4G',
    },
    mobile3G: {
      multiplier: 4.0,
      description: 'Mobile device on 3G (edge case)',
    },
    lowEndDevice: {
      multiplier: 3.0,
      description: 'Budget device with limited resources',
    },
  },

  // ========================================
  // ACCESSIBILITY PERFORMANCE
  // ========================================
  accessibility: {
    focusNavigationDelay: {
      target: 0,
      warning: 50,
      critical: 100,
      unit: 'ms',
    },
    screenReaderAnnounceDelay: {
      target: 100,
      warning: 300,
      critical: 500,
      unit: 'ms',
    },
  },

  // ========================================
  // HELPER FUNCTIONS
  // ========================================
  
  /**
   * Check if a metric value meets the target
   */
  isWithinBudget(metricPath, value) {
    const metric = this.getMetric(metricPath);
    if (!metric) return null;
    return value <= metric.target;
  },

  /**
   * Get status for a metric value
   */
  getStatus(metricPath, value) {
    const metric = this.getMetric(metricPath);
    if (!metric) return 'unknown';
    
    if (value <= metric.target) return 'good';
    if (value <= metric.warning) return 'warning';
    return 'critical';
  },

  /**
   * Get a specific metric by path (e.g., 'coreWebVitals.LCP')
   */
  getMetric(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this);
  },

  /**
   * Apply device multiplier to a metric
   */
  getDeviceAdjustedTarget(metricPath, deviceProfile) {
    const metric = this.getMetric(metricPath);
    const profile = this.deviceProfiles[deviceProfile];
    if (!metric || !profile) return null;
    
    return {
      target: metric.target * profile.multiplier,
      warning: metric.warning * profile.multiplier,
      critical: metric.critical * profile.multiplier,
    };
  },
};

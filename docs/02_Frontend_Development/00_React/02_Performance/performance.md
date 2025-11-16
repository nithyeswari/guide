# React Performance Enforcement Toolkit

A comprehensive set of configurations for enforcing React application performance standards through automated tooling, CI/CD pipelines, and developer workflows.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration Files](#configuration-files)
- [Implementation Guide](#implementation-guide)
- [CI/CD Integration](#cicd-integration)
- [Monitoring & Reporting](#monitoring--reporting)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

This toolkit provides **defense in depth** for React performance:

1. **Development Time** - ESLint rules catch anti-patterns as you code
2. **Pre-commit** - Husky hooks prevent problematic code from being committed
3. **Pull Request** - Danger.js provides automated review comments
4. **CI/CD** - GitHub Actions enforce bundle size and Lighthouse scores
5. **Production** - Performance budgets track metrics over time

### Key Benefits

- 🚫 **Prevent regressions** before they reach production
- 📊 **Quantifiable metrics** with clear pass/fail criteria
- 🤖 **Automated enforcement** requiring no manual review
- 📈 **Trend tracking** to identify gradual performance degradation
- 👥 **Team alignment** through shared performance standards

---

## Quick Start

### 1. Install Dependencies

```bash
# Core tools
npm install --save-dev \
  eslint \
  eslint-plugin-react-hooks \
  eslint-plugin-react-perf \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser

# Bundle analysis
npm install --save-dev \
  size-limit \
  @size-limit/preset-app \
  source-map-explorer

# Lighthouse CI
npm install --save-dev @lhci/cli

# Git hooks
npm install --save-dev husky lint-staged

# Automated PR review
npm install --save-dev danger
```

### 2. Copy Configuration Files

```bash
# Copy all configs to your project root
cp .eslintrc.performance.js your-project/
cp .size-limit.js your-project/
cp lighthouserc.js your-project/
cp .lintstagedrc.js your-project/
cp performance.budget.js your-project/
cp dangerfile.ts your-project/

# GitHub workflows
mkdir -p your-project/.github/workflows
cp .github/workflows/performance-ci.yml your-project/.github/workflows/

# Copilot instructions (optional)
cp .github/copilot-instructions.md your-project/.github/

# Git hooks
mkdir -p your-project/.husky
cp .husky/pre-commit your-project/.husky/
chmod +x your-project/.husky/pre-commit
```

### 3. Add Package.json Scripts

```json
{
  "scripts": {
    "lint:perf": "eslint src/ --config .eslintrc.performance.js --max-warnings 0",
    "size": "size-limit",
    "size:why": "size-limit --why",
    "lhci:autorun": "lhci autorun",
    "prepare": "husky install"
  }
}
```

### 4. Initialize Husky

```bash
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

### 5. Verify Setup

```bash
# Test ESLint
npm run lint:perf

# Test bundle size
npm run build && npm run size

# Test Lighthouse (requires built app)
npm run lhci:autorun
```

---

## Configuration Files

### `.eslintrc.performance.js`

**Purpose**: Catches performance anti-patterns during development

**Key Rules**:
- `react-hooks/exhaustive-deps` - Catches missing useEffect dependencies
- `react-perf/jsx-no-new-object-as-prop` - Prevents inline objects in JSX
- `react-perf/jsx-no-new-function-as-prop` - Warns about inline functions
- `no-console` - Blocks console.log in production

**Customization**:
```javascript
// Add stricter rules for critical paths
overrides: [
  {
    files: ['**/components/critical/**/*.tsx'],
    rules: {
      'react-perf/jsx-no-new-function-as-prop': 'error'
    }
  }
]
```

### `.size-limit.js`

**Purpose**: Enforces maximum bundle sizes

**Key Budgets**:
- Main bundle: 150KB (gzipped)
- Vendor bundle: 100KB (gzipped)
- Total initial: 300KB (gzipped)
- CSS: 50KB (gzipped)

**Customization**:
```javascript
// Add route-specific budgets
{
  name: 'Dashboard Route',
  path: 'build/static/js/dashboard.*.js',
  limit: '80 KB',
  gzip: true
}
```

### `lighthouserc.js`

**Purpose**: Automated performance audits in CI

**Key Thresholds**:
- LCP: < 2500ms
- FID: < 100ms
- CLS: < 0.1
- Performance score: > 85%

**Customization**:
```javascript
// Add more URLs to test
url: [
  'http://localhost:3000/',
  'http://localhost:3000/dashboard',
  // Add your critical paths
]
```

### `performance.budget.js`

**Purpose**: Central source of truth for all performance targets

**Features**:
- Core Web Vitals targets
- Bundle size budgets per route
- Runtime performance metrics
- Device-specific multipliers
- Helper functions for validation

**Usage**:
```javascript
const budget = require('./performance.budget');

// Check if metric meets target
budget.isWithinBudget('coreWebVitals.LCP', 2400); // true

// Get status
budget.getStatus('bundleSizes.initial.mainBundle', 180000); // 'warning'

// Device-adjusted targets
budget.getDeviceAdjustedTarget('coreWebVitals.LCP', 'mobile3G');
// { target: 8000, warning: 10000, critical: 14000 }
```

### `dangerfile.ts`

**Purpose**: Automated PR review with performance warnings

**Checks**:
- New dependency warnings
- Large PR alerts
- Critical path modification notices
- React anti-pattern detection
- Console.log detection
- Import analysis

**Customization**:
```typescript
// Add custom checks
const CRITICAL_PATHS = [
  'src/components/critical/',
  'src/hooks/',
  'src/services/payments/' // Add your critical paths
];
```

### `.github/workflows/performance-ci.yml`

**Purpose**: Complete CI/CD pipeline for performance

**Jobs**:
1. **lint-performance** - ESLint with performance rules
2. **bundle-size** - Size-limit checks
3. **lighthouse** - Full Lighthouse audit
4. **dependency-check** - Analyze new dependencies
5. **performance-regression** - Compare PR vs main branch
6. **post-results** - Comment results on PR

### `.github/copilot-instructions.md`

**Purpose**: Guide GitHub Copilot to suggest optimized patterns

**Coverage**:
- Memoization patterns
- Event handler optimization
- Import best practices
- Hook patterns
- Anti-patterns to avoid

---

## Implementation Guide

### Phase 1: Foundation (Week 1-2)

1. **Add ESLint Performance Rules**
   ```bash
   npm install --save-dev eslint-plugin-react-perf eslint-plugin-react-hooks
   ```
   - Start with warnings, not errors
   - Fix low-hanging fruit first
   - Track improvement over time

2. **Set Up Bundle Size Monitoring**
   ```bash
   npm install --save-dev size-limit @size-limit/preset-app
   ```
   - Establish baseline measurements
   - Set conservative initial limits
   - Run `npm run size:why` to understand current state

3. **Implement Pre-commit Hooks**
   ```bash
   npx husky install
   ```
   - Start with fast checks only
   - Gradually add more validations
   - Monitor developer feedback

### Phase 2: CI/CD Integration (Week 3-4)

1. **Enable GitHub Actions**
   - Copy workflow file
   - Set up required secrets
   - Test on non-critical branches first

2. **Configure Lighthouse CI**
   - Set up LHCI server (optional but recommended)
   - Establish baseline scores
   - Set realistic thresholds initially

3. **Add Danger.js**
   - Configure bot permissions
   - Tune sensitivity of checks
   - Gather team feedback

### Phase 3: Enforcement (Month 2)

1. **Tighten Thresholds**
   - Convert warnings to errors
   - Reduce bundle size limits
   - Increase Lighthouse requirements

2. **Add Performance Testing**
   - Render count tests
   - Memory leak detection
   - API response time monitoring

3. **Establish Review Cadence**
   - Monthly performance audits
   - Quarterly budget reviews
   - Annual strategy sessions

---

## Monitoring & Reporting

### Real-Time Dashboards

Set up monitoring for:
- Bundle size trends over time
- Lighthouse scores per release
- Core Web Vitals from RUM (Real User Monitoring)
- Error rates and performance anomalies

### Recommended Tools

- **Datadog** - APM and RUM
- **New Relic** - Browser monitoring
- **Google Analytics** - Core Web Vitals
- **Grafana** - Custom dashboards
- **LHCI Server** - Historical Lighthouse data

### Automated Alerts

Configure alerts for:
- Bundle size increase > 5%
- Lighthouse score drop > 10 points
- LCP regression > 500ms
- Memory usage spike > 20%

---

## Best Practices

### For Developers

1. **Run performance checks locally before pushing**
   ```bash
   npm run perf:check
   ```

2. **Check bundle impact before adding dependencies**
   ```bash
   npx bundlephobia [package-name]
   ```

3. **Profile components during development**
   - Use React DevTools Profiler
   - Check for unnecessary re-renders
   - Monitor component mount/update times

4. **Write performance-aware tests**
   - Test memoization behavior
   - Verify hook dependency arrays
   - Check for memory leaks

### For Tech Leads

1. **Review performance budget quarterly**
   - Adjust based on user analytics
   - Consider new device/network profiles
   - Update based on business requirements

2. **Conduct performance retrospectives**
   - Analyze regressions that slipped through
   - Improve detection mechanisms
   - Share learnings with team

3. **Champion performance culture**
   - Include performance in definition of done
   - Celebrate performance improvements
   - Make metrics visible to stakeholders

### For Architecture

1. **Design for performance from the start**
   - Code splitting strategy
   - Data fetching patterns
   - State management approach

2. **Document performance decisions**
   - ADRs for critical choices
   - Trade-off analysis
   - Future optimization roadmap

3. **Regular architecture reviews**
   - Identify performance debt
   - Plan refactoring initiatives
   - Evaluate new tools/patterns

---

## Troubleshooting

### Common Issues

**ESLint: Too many warnings**
```bash
# Start by fixing auto-fixable issues
npm run lint:perf -- --fix

# Then address remaining issues gradually
npm run lint:perf -- --max-warnings 100  # Set temporary higher limit
```

**Bundle size exceeded**
```bash
# Analyze what's taking space
npm run size:why

# Check for duplicate dependencies
npm ls [package-name]

# Consider code splitting
const Component = React.lazy(() => import('./Component'));
```

**Lighthouse scores too low**
- Check for render-blocking resources
- Optimize images (WebP, lazy loading)
- Reduce JavaScript execution time
- Minimize main thread work

**Pre-commit hook too slow**
- Only lint staged files (lint-staged does this)
- Skip bundle builds in pre-commit
- Move heavy checks to CI

**False positives in Danger.js**
```typescript
// Adjust thresholds in dangerfile.ts
const BUNDLE_SIZE_WARN_THRESHOLD = 10000; // Increase if needed
```

### Getting Help

1. Check the tool's documentation
2. Search GitHub issues
3. Review similar implementations
4. Consult with performance engineering team

---

## Future Enhancements

- [ ] Custom ESLint rules for organization-specific patterns
- [ ] Automated performance regression bisecting
- [ ] ML-based anomaly detection
- [ ] Performance impact prediction for PRs
- [ ] Automated optimization suggestions
- [ ] Integration with APM tools
- [ ] Performance SLOs and SLAs

---

## References

- [React Performance Documentation](https://react.dev/learn/render-and-commit)
- [Web.dev Performance Guide](https://web.dev/performance/)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Size Limit](https://github.com/ai/size-limit)
- [Danger.js](https://danger.systems/js/)
- [ESLint Plugin React Perf](https://github.com/cvazac/eslint-plugin-react-perf)

---

## Contributing

When adding new checks or modifying thresholds:

1. Test locally first
2. Document the rationale
3. Gather team feedback
4. Roll out gradually
5. Monitor impact on developer productivity

---

## License

MIT License - Use freely in your organization.

---

*Last updated: January 2025*
*Maintained by: Performance Engineering Team*

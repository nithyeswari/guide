/**
 * Danger.js Configuration for Automated PR Review
 * 
 * Automatically comments on PRs with performance-related warnings and suggestions.
 * 
 * Installation:
 * npm install --save-dev danger
 * 
 * Add to CI workflow:
 * npx danger ci
 * 
 * Requires DANGER_GITHUB_API_TOKEN environment variable
 */

import { danger, warn, fail, message, markdown } from 'danger';
import * as fs from 'fs';

// ========================================
// CONFIGURATION
// ========================================

const BUNDLE_SIZE_WARN_THRESHOLD = 5000;  // 5KB increase warning
const BUNDLE_SIZE_FAIL_THRESHOLD = 20000; // 20KB increase fails
const MAX_LINES_CHANGED = 500;
const CRITICAL_PATHS = ['src/components/critical/', 'src/hooks/', 'src/utils/'];

// ========================================
// FILE CHANGE ANALYSIS
// ========================================

const modifiedFiles = danger.git.modified_files;
const createdFiles = danger.git.created_files;
const deletedFiles = danger.git.deleted_files;
const allChangedFiles = [...modifiedFiles, ...createdFiles];

// ========================================
// CHECK 1: PACKAGE.JSON CHANGES
// ========================================

if (modifiedFiles.includes('package.json')) {
  const packageDiff = danger.git.diffForFile('package.json');
  
  packageDiff.then(diff => {
    if (diff) {
      const addedLines = diff.added.split('\n');
      const newDeps = addedLines.filter(line => 
        line.includes('"') && line.includes(':') && !line.includes('version')
      );
      
      if (newDeps.length > 0) {
        warn(
          `📦 **New dependencies detected!**\n\n` +
          `Please verify bundle impact:\n` +
          `\`\`\`\n${newDeps.join('\n')}\n\`\`\`\n\n` +
          `Run \`npm run size:why\` to analyze impact.`
        );
      }
    }
  });
}

// ========================================
// CHECK 2: LARGE PR WARNING
// ========================================

const totalLinesChanged = danger.github.pr.additions + danger.github.pr.deletions;

if (totalLinesChanged > MAX_LINES_CHANGED) {
  warn(
    `🔄 **Large PR detected** (${totalLinesChanged} lines changed)\n\n` +
    `Consider breaking this into smaller PRs for easier review and ` +
    `better performance regression tracking.`
  );
}

// ========================================
// CHECK 3: CRITICAL PATH MODIFICATIONS
// ========================================

const criticalPathChanges = allChangedFiles.filter(file =>
  CRITICAL_PATHS.some(path => file.includes(path))
);

if (criticalPathChanges.length > 0) {
  warn(
    `⚠️ **Performance-critical paths modified:**\n\n` +
    criticalPathChanges.map(f => `- \`${f}\``).join('\n') +
    `\n\nPlease ensure:\n` +
    `- [ ] Memoization is properly applied\n` +
    `- [ ] No unnecessary re-renders introduced\n` +
    `- [ ] Performance testing completed`
  );
}

// ========================================
// CHECK 4: REACT PERFORMANCE PATTERNS
// ========================================

const jsxFiles = allChangedFiles.filter(f => 
  f.endsWith('.tsx') || f.endsWith('.jsx')
);

jsxFiles.forEach(async (file) => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check for inline objects in JSX
  if (content.match(/style=\{\{/g) && !content.includes('useMemo')) {
    warn(
      `🎨 **Inline style objects in ${file}**\n\n` +
      `Consider using \`useMemo\` or external style objects to prevent re-renders.`
    );
  }
  
  // Check for missing useCallback
  if (content.match(/onClick=\{[^}]+=>/) && !content.includes('useCallback')) {
    warn(
      `🔄 **Inline function handlers in ${file}**\n\n` +
      `Consider using \`useCallback\` for event handlers passed to child components.`
    );
  }
  
  // Check for array index as key
  if (content.match(/\.map\([^)]+,\s*index\)/) && content.match(/key=\{index\}/)) {
    fail(
      `❌ **Array index used as key in ${file}**\n\n` +
      `This can cause performance issues and bugs. Use a stable unique identifier instead.`
    );
  }
  
  // Check for missing React.memo on frequently rendered components
  if (content.includes('export default function') && !content.includes('memo(')) {
    if (file.includes('List') || file.includes('Item') || file.includes('Row')) {
      message(
        `💡 **Consider memoization in ${file}**\n\n` +
        `This appears to be a list/item component. \`React.memo()\` might improve performance.`
      );
    }
  }
});

// ========================================
// CHECK 5: CONSOLE.LOG DETECTION
// ========================================

allChangedFiles.forEach(file => {
  if (file.endsWith('.ts') || file.endsWith('.tsx') || 
      file.endsWith('.js') || file.endsWith('.jsx')) {
    
    if (!file.includes('test') && !file.includes('spec')) {
      const content = fs.readFileSync(file, 'utf8');
      const consoleMatches = content.match(/console\.(log|debug|info)/g);
      
      if (consoleMatches && consoleMatches.length > 0) {
        fail(
          `🚫 **console.log found in ${file}**\n\n` +
          `Remove debug statements before merging. Found ${consoleMatches.length} instance(s).`
        );
      }
    }
  }
});

// ========================================
// CHECK 6: IMPORT ANALYSIS
// ========================================

jsxFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check for wildcard imports from large libraries
  const wildcardImports = content.match(/import \* as \w+ from ['"][^'"]+['"]/g);
  if (wildcardImports) {
    wildcardImports.forEach(imp => {
      if (imp.includes('lodash') || imp.includes('moment') || imp.includes('ramda')) {
        warn(
          `📦 **Wildcard import detected in ${file}**\n\n` +
          `\`${imp}\`\n\n` +
          `This prevents tree shaking. Use named imports instead:\n` +
          `\`import { specific } from 'library'\``
        );
      }
    });
  }
});

// ========================================
// CHECK 7: TEST COVERAGE FOR PERFORMANCE CODE
// ========================================

const hookFiles = allChangedFiles.filter(f => f.includes('/hooks/'));
const utilFiles = allChangedFiles.filter(f => f.includes('/utils/'));

if (hookFiles.length > 0 || utilFiles.length > 0) {
  const hasTests = allChangedFiles.some(f => 
    f.includes('.test.') || f.includes('.spec.')
  );
  
  if (!hasTests) {
    warn(
      `🧪 **No tests for changed hooks/utils**\n\n` +
      `Please add performance tests for:\n` +
      [...hookFiles, ...utilFiles].map(f => `- \`${f}\``).join('\n') +
      `\n\nConsider testing for:\n` +
      `- Memoization behavior\n` +
      `- Re-render counts\n` +
      `- Memory leaks`
    );
  }
}

// ========================================
// SUMMARY TABLE
// ========================================

markdown(`
## 📊 PR Performance Summary

| Metric | Value | Status |
|--------|-------|--------|
| Files Changed | ${allChangedFiles.length} | ${allChangedFiles.length > 20 ? '⚠️' : '✅'} |
| Lines Changed | ${totalLinesChanged} | ${totalLinesChanged > MAX_LINES_CHANGED ? '⚠️' : '✅'} |
| Critical Paths | ${criticalPathChanges.length} | ${criticalPathChanges.length > 0 ? '⚠️' : '✅'} |
| New Dependencies | Check above | - |

---
*Automated by Danger.js*
`);

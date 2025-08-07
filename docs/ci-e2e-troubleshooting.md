# CI vs Local E2E Test Environment Analysis

## Root Cause Analysis: Why Tests Fail in GitHub Actions But Not Locally

### Key Differences Between Environments

#### 1. **Browser Engine & Display System**
- **Local**: Full browser with GPU acceleration, window manager, display server
- **GitHub Actions**: Headless browser in containerized Ubuntu without X11/Wayland
- **Impact**: Mouse events, focus handling, and DOM event propagation behave differently

#### 2. **System Resources**
- **Local**: Dedicated CPU, full RAM, fast disk I/O
- **GitHub Actions**: Shared 2-core VM, limited RAM, network-attached storage
- **Impact**: Timing-sensitive operations (like double-click detection) can be inconsistent

#### 3. **Network & Timing**
- **Local**: Localhost requests ~0ms latency
- **GitHub Actions**: Internal networking with variable latency, potential throttling
- **Impact**: WebServer startup and page loading can be slower

#### 4. **Browser Configuration**
```javascript
// Current config in playwright.config.js
use: {
  ...devices['Desktop Chrome'],
}
```
- **Missing CI-specific optimizations** for headless environment
- **No retry logic** for flaky operations
- **No viewport or timing configuration** for CI

### Specific Issues Identified

#### 1. **Double-Click Event Handling**
```javascript
// Problematic in CI
await this.page.mouse.dblclick(x, y);
```
- **Local**: Browser window has focus, proper event handling
- **CI**: Headless environment may not process click timing consistently
- **Solution**: JavaScript event dispatch (already implemented)

#### 2. **DOM Timing & Throttling**
```javascript
// 500ms throttle in application + variable CI timing
const note = await canvasPage.createNoteWithThrottleWait(x, y);
```
- **Local**: Predictable timing, fast DOM updates
- **CI**: Variable timing due to resource constraints
- **Solution**: Increased timeouts and more reliable wait conditions

#### 3. **Resource Loading**
- **CI**: `npm start` server startup can be slower
- **No warmup period** for the application
- **Server readiness detection** is basic (just URL ping)

## Preventive Measures & Improvements

### 1. **Enhanced Playwright Configuration**
```javascript
// Recommended playwright.config.js improvements
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Reduce CI load
  retries: process.env.CI ? 2 : 0, // Retry flaky tests in CI
  reporter: process.env.CI ? 'github' : 'list',
  
  webServer: {
    command: 'npm start',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI, // Always fresh in CI
    timeout: 180000, // 3 minutes in CI
  },
  
  use: {
    ...devices['Desktop Chrome'],
    // CI-specific settings
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    video: process.env.CI ? 'retain-on-failure' : 'off',
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
    
    // Increased timeouts for CI
    actionTimeout: process.env.CI ? 15000 : 5000,
    navigationTimeout: process.env.CI ? 30000 : 10000,
  },
  
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // CI browser optimizations
        launchOptions: process.env.CI ? {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-background-timer-throttling',
          ]
        } : {},
      },
    },
  ],
});
```

### 2. **CI-Specific Test Patterns**
```javascript
// Enhanced helper with CI detection
class CanvasPage {
  constructor(page) {
    this.page = page;
    this.isCI = !!process.env.CI;
  }

  async createNoteReliably(x, y) {
    if (this.isCI) {
      // Use JavaScript dispatch in CI
      return await this.createNoteViaJavaScript(x, y);
    } else {
      // Use mouse events locally for more realistic testing
      return await this.createNoteAt(x, y);
    }
  }

  async waitForApplicationReady() {
    // CI-specific warmup
    if (this.isCI) {
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000); // Extra warmup in CI
    }
  }
}
```

### 3. **GitHub Actions Optimizations**
```yaml
# Enhanced CI workflow
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium
  
- name: Run Playwright tests
  run: npx playwright test
  env:
    CI: true
    NODE_OPTIONS: "--max_old_space_size=4096"
    PLAYWRIGHT_BROWSER_PATH: "/home/runner/.cache/ms-playwright"
    
- name: Upload test results
  uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: test-results
    path: |
      test-results/
      playwright-report/
```

### 4. **Early Detection Strategies**

#### Local CI Simulation
```bash
# Run tests in "CI mode" locally
CI=true npx playwright test --headed=false --workers=1

# Docker-based testing (closer to CI environment)
docker run -it --rm \
  -v $(pwd):/app \
  -w /app \
  mcr.microsoft.com/playwright:v1.54.1-focal \
  npm run test:e2e
```

#### Test Health Monitoring
```javascript
// Add to test suite
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  if (process.env.CI) {
    console.log('Running in CI environment');
    console.log('Node version:', process.version);
    console.log('Available memory:', process.memoryUsage());
  }
});
```

## Immediate Action Items

### 1. **Quick Wins** (Already Implemented)
- ✅ JavaScript event dispatch method
- ✅ Increased timeouts (5s → 8s)
- ✅ Better error messages with debug info

### 2. **Medium-Term Improvements** (Recommended)
- 🔄 Enhanced Playwright config with CI detection
- 🔄 Retry logic for flaky operations
- 🔄 CI-specific browser launch options

### 3. **Long-Term Prevention** (Future)
- 🔄 Docker-based local testing to match CI environment
- 🔄 Performance monitoring for test execution times
- 🔄 Automated detection of flaky tests

## Monitoring & Alerting

### Test Performance Tracking
```javascript
// Add to CI workflow
- name: Analyze test performance
  run: |
    echo "Test execution time: $(date -d @$SECONDS -u +%H:%M:%S)"
    echo "Failed tests:" > test-summary.txt
    grep "failed" playwright-report/index.html >> test-summary.txt || true
```

### Success Metrics
- **Target**: >95% E2E test success rate in CI
- **Current**: ~62% (13/21 passing) → Should improve to ~100% with fixes
- **Monitoring**: Track test execution times and failure patterns

This analysis should help prevent similar issues in the future by understanding and addressing the fundamental differences between local and CI environments.
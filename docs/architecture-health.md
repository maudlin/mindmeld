# Architecture Health Monitoring

This project includes automated tools to monitor and maintain architectural quality. These tools help prevent technical debt accumulation and catch issues early.

## 🏥 Health Check Overview

### **What it Monitors:**

- ✅ **Circular Dependencies** - Critical architectural anti-pattern
- ✅ **Module Complexity** - Dependencies per module (app.js now has 2 deps vs previous 16!)
- ✅ **Bootstrap Architecture** - Proper initialization sequence and dependency chains
- ✅ **Code Duplication** - DRY principle violations
- ✅ **Test Coverage** - Run `npm run test:coverage` for current status
- ✅ **Unused Dependencies** - Package bloat
- ✅ **Outdated Dependencies** - Security and maintenance
- ✅ **Security Vulnerabilities** - npm audit results
- ✅ **Codebase Metrics** - Size and growth trends

### **When it Runs:**

- 🔄 **Pull Requests** - Automatic health assessment
- 📅 **Weekly Schedule** - Sunday mornings (UTC)
- 🎯 **Manual Trigger** - On-demand via GitHub Actions
- 💻 **Local Development** - Run anytime with `npm run health-check`

---

## 🛠️ Available Commands

### **Comprehensive Health Check:**

```bash
npm run health-check
# Runs full architecture assessment with visual report
```

### **Individual Analysis Tools:**

```bash
# Circular dependency detection (CRITICAL)
npm run analyze:circular

# Module complexity analysis
npm run analyze:complexity

# Code duplication detection
npm run analyze:duplication

# Test coverage analysis
npm run test:coverage

# Dependency health
npm run deps:check

# Available dependency updates
npm run deps:update

# Update dependencies automatically
npm run deps:upgrade
```

---

## 📊 Health Scoring System

### **Score Calculation:**

- **100 points** baseline
- **-10 points** per circular dependency (CRITICAL)
- **-5 points** per security vulnerability
- **-3 points** per overly complex module (>8 deps)
- **-1 point** per unused dependency, code duplication, outdated dependency

### **Health Grades:**

- **90-100**: 🏆 **EXCELLENT** - Architecture in great shape
- **75-89**: ✅ **GOOD** - Minor improvements recommended
- **60-74**: ⚠️ **NEEDS ATTENTION** - Consider addressing issues
- **<60**: 🚨 **CRITICAL ISSUES** - Immediate attention required

---

## 🚨 Critical Issues Guide

### **Circular Dependencies (BLOCKING)**

```bash
# Detection:
npm run analyze:circular
```

**Action Required:**

1. **Stop feature development** until resolved
2. Implement dependency injection patterns or bootstrap architecture
3. Consider using specialized bootstrap modules for complex initialization
4. Verify fix: `npm run analyze:circular` should show 0 results
5. If unsure, see the patterns in [Developer Guide](developer-guide.md) and existing bootstrap modules.

**Note**: The new bootstrap architecture pattern helps prevent circular dependencies by enforcing clear initialization sequences.

### **Security Vulnerabilities**

```bash
# Detection & Fix:
npm audit
npm audit fix
```

---

## 🔄 Development Integration

### **Weekly Workflow:**

1. Run `npm run health-check`
2. Address any critical issues (circular dependencies)
3. Update dependencies: `npm run deps:upgrade`
4. Review TODO.md for architectural improvements

### **Before Major Changes:**

- Establish health baseline
- Monitor for new architectural issues
- Run full health check before PR submission

---

_See [Developer Guide](developer-guide.md) for architecture patterns and remediation approaches._

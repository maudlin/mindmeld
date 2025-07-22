#!/bin/bash
# MindMeld Architecture Health Check
# Run this script weekly or before major releases

set -e

echo "🏥 MindMeld Architecture Health Check"
echo "===================================="
echo ""

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo -e "${BLUE}📊 $1${NC}"
    echo "----------------------------------------"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if analysis tools are available
print_section "Checking Analysis Tools"
if ! command_exists npx; then
    echo -e "${RED}❌ npx not found. Please install Node.js${NC}"
    exit 1
fi

# Install analysis dependencies if not present
if ! npm list madge >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Installing analysis tools...${NC}"
    npm install --no-save madge jscpd depcheck npm-check-updates
fi

echo -e "${GREEN}✅ Analysis tools ready${NC}"
echo ""

# 1. Circular Dependencies Check
print_section "Circular Dependencies Analysis"
echo "Command: npx madge --circular --extensions js src/"
echo ""

if npx madge --circular --extensions js src/ 2>&1 | grep -q "Found.*circular"; then
    echo -e "${RED}❌ CRITICAL: Circular dependencies detected!${NC}"
    echo "See output above for details. This blocks architectural progress."
    HEALTH_ISSUES=$((${HEALTH_ISSUES:-0} + 10))
else
    echo -e "${GREEN}✅ No circular dependencies found${NC}"
fi
echo ""

# 2. Dependency Complexity Analysis
print_section "Module Complexity Analysis"
echo "Command: npx madge --summary src/"
echo ""
npx madge --summary src/ 2>/dev/null || echo "Analysis complete"

# Check for overly complex modules (>8 dependencies)
COMPLEX_MODULES=$(npx madge --summary src/ 2>/dev/null | head -5 | awk '$1 > 8 {print $2}' | wc -l)
if [ "$COMPLEX_MODULES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: $COMPLEX_MODULES modules have >8 dependencies${NC}"
    HEALTH_ISSUES=$((${HEALTH_ISSUES:-0} + 3))
else
    echo -e "${GREEN}✅ Module complexity under control${NC}"
fi
echo ""

# 3. Code Duplication Check
print_section "Code Duplication Analysis" 
echo "Command: npx jscpd --min-lines=5 --min-tokens=50 --format=cli src/"
echo ""
DUPLICATION_OUTPUT=$(npx jscpd --min-lines=5 --min-tokens=50 --format=cli src/ 2>/dev/null)
if echo "$DUPLICATION_OUTPUT" | grep -q "duplications found"; then
    echo -e "${YELLOW}⚠️  Code duplication detected${NC}"
    echo "$DUPLICATION_OUTPUT"
    HEALTH_ISSUES=$((${HEALTH_ISSUES:-0} + 1))
else
    echo -e "${GREEN}✅ No significant code duplication found${NC}"
fi
echo ""

# 4. Unused Dependencies Check
print_section "Dependency Health Check"
echo "Command: npx depcheck"
echo ""
DEPCHECK_OUTPUT=$(npx depcheck 2>/dev/null || true)
if echo "$DEPCHECK_OUTPUT" | grep -q "Unused"; then
    echo -e "${YELLOW}⚠️  Unused dependencies found:${NC}"
    echo "$DEPCHECK_OUTPUT"
    HEALTH_ISSUES=$((${HEALTH_ISSUES:-0} + 1))
else
    echo -e "${GREEN}✅ All dependencies are in use${NC}"
fi
echo ""

# 5. Outdated Dependencies Check
print_section "Dependency Updates Available"
echo "Command: npx ncu --target minor"
echo ""
UPDATE_OUTPUT=$(npx ncu --target minor 2>/dev/null || true)
if echo "$UPDATE_OUTPUT" | grep -q "→"; then
    echo -e "${YELLOW}⚠️  Dependency updates available:${NC}"
    echo "$UPDATE_OUTPUT"
    HEALTH_ISSUES=$((${HEALTH_ISSUES:-0} + 1))
else
    echo -e "${GREEN}✅ All dependencies are up to date${NC}"
fi
echo ""

# 6. Codebase Metrics
print_section "Codebase Metrics"
TOTAL_FILES=$(find src/ -name "*.js" | wc -l)
TOTAL_LINES=$(find src/ -name "*.js" -exec wc -l {} \; | awk '{sum+=$1} END {print sum}')
AVG_FILE_SIZE=$(echo "$TOTAL_LINES / $TOTAL_FILES" | bc 2>/dev/null || echo "N/A")

echo "📁 Total JavaScript files: $TOTAL_FILES"
echo "📏 Total lines of code: $TOTAL_LINES"
echo "📊 Average file size: $AVG_FILE_SIZE lines"

if [ "$AVG_FILE_SIZE" -gt 200 ] 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Some files may be too large (>200 lines average)${NC}"
    HEALTH_ISSUES=$((${HEALTH_ISSUES:-0} + 1))
else
    echo -e "${GREEN}✅ File sizes are reasonable${NC}"
fi
echo ""

# 7. Test Coverage Check (if available)
print_section "Test Coverage Status"
if npm run test:unit -- --coverage >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Unit tests passing with coverage${NC}"
else
    echo -e "${YELLOW}⚠️  Run 'npm run test:unit -- --coverage' to check test coverage${NC}"
fi
echo ""

# 8. Security Status
print_section "Security Health"
echo "Command: npm audit"
echo ""
if npm audit --audit-level=moderate >/dev/null 2>&1; then
    echo -e "${GREEN}✅ No security vulnerabilities found${NC}"
else
    echo -e "${RED}❌ Security vulnerabilities detected. Run 'npm audit' for details${NC}"
    HEALTH_ISSUES=$((${HEALTH_ISSUES:-0} + 5))
fi
echo ""

# Overall Health Score
print_section "Overall Architecture Health"
HEALTH_SCORE=$((100 - ${HEALTH_ISSUES:-0}))

if [ "$HEALTH_SCORE" -ge 90 ]; then
    echo -e "${GREEN}🏆 EXCELLENT (Score: $HEALTH_SCORE/100)${NC}"
    echo "Your architecture is in great shape!"
elif [ "$HEALTH_SCORE" -ge 75 ]; then
    echo -e "${GREEN}✅ GOOD (Score: $HEALTH_SCORE/100)${NC}" 
    echo "Minor improvements recommended."
elif [ "$HEALTH_SCORE" -ge 60 ]; then
    echo -e "${YELLOW}⚠️  NEEDS ATTENTION (Score: $HEALTH_SCORE/100)${NC}"
    echo "Consider addressing the issues above."
else
    echo -e "${RED}🚨 CRITICAL ISSUES (Score: $HEALTH_SCORE/100)${NC}"
    echo "Immediate attention required - architecture debt is high."
fi

echo ""
echo "💡 Next Steps:"
echo "  1. Review TODO.md for detailed remediation plan"
echo "  2. Address critical issues first (circular dependencies)"  
echo "  3. Run this health check weekly or before releases"
echo "  4. Update dependencies monthly: 'npm update'"
echo ""
echo "📅 Health check completed: $(date)"
echo "🔄 Rerun with: ./scripts/health-check.sh"
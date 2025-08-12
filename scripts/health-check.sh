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

# Calculate contextual thresholds based on project size
calculate_thresholds() {
    local total_files=$(find src/ -name "*.js" | wc -l)
    if [ "$total_files" -lt 50 ]; then
        MAX_DEPS=6
        MAX_FILE_SIZE=150
        MAX_DUPLICATION=3
        echo "📏 Project size: Small ($total_files files) - using conservative thresholds"
    elif [ "$total_files" -lt 200 ]; then
        MAX_DEPS=8
        MAX_FILE_SIZE=200
        MAX_DUPLICATION=5
        echo "📏 Project size: Medium ($total_files files) - using standard thresholds"
    else
        MAX_DEPS=10
        MAX_FILE_SIZE=250
        MAX_DUPLICATION=8
        echo "📏 Project size: Large ($total_files files) - using relaxed thresholds"
    fi
    echo "   Max dependencies per module: $MAX_DEPS"
    echo "   Max file size: $MAX_FILE_SIZE lines"
    echo "   Max duplication threshold: $MAX_DUPLICATION%"
    echo ""
}

# Graduated scoring functions
calculate_circular_dep_score() {
    local circular_output=$(npx madge --circular --extensions js src/ 2>&1)
    local circular_count=0
    
    if echo "$circular_output" | grep -q "Found.*circular"; then
        circular_count=$(echo "$circular_output" | grep -o '[0-9]\+ circular' | grep -o '[0-9]\+' | head -1)
        circular_count=${circular_count:-1}
    fi
    
    # Output the analysis result to stderr so it doesn't interfere with score parsing
    echo "$circular_output" >&2
    
    if [ "$circular_count" -eq 0 ]; then
        echo 100
    elif [ "$circular_count" -le 2 ]; then
        echo 60  # Minor circular deps - significant but not critical
    elif [ "$circular_count" -le 5 ]; then
        echo 20  # Moderate issue - major concern
    else
        echo 0   # Critical issue - architectural failure
    fi
}

calculate_complexity_score() {
    local summary_output=$(npx madge --summary src/ 2>/dev/null || echo "Analysis failed")
    echo "$summary_output" >&2
    
    local complex_modules=$(echo "$summary_output" | head -10 | awk -v max="$MAX_DEPS" '$1 > max {count++} END {print count+0}')
    local very_complex=$(echo "$summary_output" | head -10 | awk -v max="$MAX_DEPS" '$1 > max*2 {count++} END {print count+0}')
    
    if [ "$complex_modules" -eq 0 ]; then
        echo 100
    elif [ "$very_complex" -gt 0 ]; then
        echo 30  # Very complex modules present
    elif [ "$complex_modules" -le 2 ]; then
        echo 70  # Few complex modules
    elif [ "$complex_modules" -le 5 ]; then
        echo 50  # Several complex modules
    else
        echo 20  # Many complex modules
    fi
}

calculate_duplication_score() {
    local dup_output=$(npx jscpd --min-lines=5 --min-tokens=50 --format=cli src/ 2>/dev/null || echo "No duplications")
    echo "$dup_output" >&2
    
    # Extract duplication percentage if available
    local dup_percentage=0
    if echo "$dup_output" | grep -q "duplications found"; then
        dup_percentage=$(echo "$dup_output" | grep -o '[0-9.]\+%' | head -1 | tr -d '%' || echo "0")
        dup_percentage=${dup_percentage%.*}  # Remove decimal part
    fi
    
    if [ "$dup_percentage" -eq 0 ]; then
        echo 100
    elif [ "$dup_percentage" -le "$MAX_DUPLICATION" ]; then
        echo 80  # Acceptable duplication
    elif [ "$dup_percentage" -le $((MAX_DUPLICATION * 2)) ]; then
        echo 60  # Moderate duplication
    elif [ "$dup_percentage" -le $((MAX_DUPLICATION * 3)) ]; then
        echo 40  # High duplication
    else
        echo 20  # Excessive duplication
    fi
}

# Set contextual thresholds
calculate_thresholds

# 1. Circular Dependencies Check (Graduated Scoring)
print_section "Circular Dependencies Analysis"
echo "Command: npx madge --circular --extensions js src/"
echo ""

CIRCULAR_SCORE=$(calculate_circular_dep_score)
if [ "$CIRCULAR_SCORE" -eq 100 ]; then
    echo -e "${GREEN}✅ No circular dependencies found (Score: $CIRCULAR_SCORE/100)${NC}"
elif [ "$CIRCULAR_SCORE" -ge 60 ]; then
    echo -e "${YELLOW}⚠️  Minor circular dependencies detected (Score: $CIRCULAR_SCORE/100)${NC}"
    echo "Consider refactoring to improve architecture."
elif [ "$CIRCULAR_SCORE" -ge 20 ]; then
    echo -e "${RED}❌ Moderate circular dependencies detected (Score: $CIRCULAR_SCORE/100)${NC}"
    echo "This is hindering architectural progress."
else
    echo -e "${RED}🚨 CRITICAL: Severe circular dependencies detected (Score: $CIRCULAR_SCORE/100)${NC}"
    echo "Immediate refactoring required - architecture is compromised."
fi
echo ""

# 2. Dependency Complexity Analysis (Graduated Scoring)
print_section "Module Complexity Analysis"
echo "Command: npx madge --summary src/"
echo ""

COMPLEXITY_SCORE=$(calculate_complexity_score)
if [ "$COMPLEXITY_SCORE" -eq 100 ]; then
    echo -e "${GREEN}✅ Module complexity under control (Score: $COMPLEXITY_SCORE/100)${NC}"
elif [ "$COMPLEXITY_SCORE" -ge 70 ]; then
    echo -e "${YELLOW}⚠️  Some modules approaching complexity threshold (Score: $COMPLEXITY_SCORE/100)${NC}"
    echo "Consider refactoring modules with >$MAX_DEPS dependencies."
elif [ "$COMPLEXITY_SCORE" -ge 50 ]; then
    echo -e "${YELLOW}⚠️  Several complex modules detected (Score: $COMPLEXITY_SCORE/100)${NC}"
    echo "Multiple modules exceed recommended dependency count."
elif [ "$COMPLEXITY_SCORE" -ge 30 ]; then
    echo -e "${RED}❌ High module complexity detected (Score: $COMPLEXITY_SCORE/100)${NC}"
    echo "Many modules are too complex - refactoring needed."
else
    echo -e "${RED}🚨 CRITICAL: Excessive module complexity (Score: $COMPLEXITY_SCORE/100)${NC}"
    echo "Architecture is overly complex - major refactoring required."
fi
echo ""

# 3. Code Duplication Check (Graduated Scoring)
print_section "Code Duplication Analysis" 
echo "Command: npx jscpd --min-lines=5 --min-tokens=50 --format=cli src/"
echo ""

DUPLICATION_SCORE=$(calculate_duplication_score)
if [ "$DUPLICATION_SCORE" -eq 100 ]; then
    echo -e "${GREEN}✅ No significant code duplication found (Score: $DUPLICATION_SCORE/100)${NC}"
elif [ "$DUPLICATION_SCORE" -ge 80 ]; then
    echo -e "${GREEN}✅ Acceptable level of code duplication (Score: $DUPLICATION_SCORE/100)${NC}"
    echo "Duplication is within acceptable limits (<=$MAX_DUPLICATION%)."
elif [ "$DUPLICATION_SCORE" -ge 60 ]; then
    echo -e "${YELLOW}⚠️  Moderate code duplication detected (Score: $DUPLICATION_SCORE/100)${NC}"
    echo "Consider refactoring to reduce duplication."
elif [ "$DUPLICATION_SCORE" -ge 40 ]; then
    echo -e "${YELLOW}⚠️  High code duplication detected (Score: $DUPLICATION_SCORE/100)${NC}"
    echo "Significant duplication is affecting maintainability."
else
    echo -e "${RED}❌ Excessive code duplication detected (Score: $DUPLICATION_SCORE/100)${NC}"
    echo "Critical duplication levels - immediate refactoring needed."
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

# 6. Bootstrap Architecture Validation
print_section "Bootstrap Architecture Health"
check_bootstrap_architecture() {
    local bootstrap_score=100
    local issues=0
    
    # Check if bootstrap files exist
    if [ ! -f "src/js/core/bootstrap/AppBootstrap.js" ]; then
        echo -e "${RED}❌ AppBootstrap.js missing${NC}"
        bootstrap_score=$((bootstrap_score - 30))
        issues=$((issues + 1))
    else
        echo -e "${GREEN}✅ AppBootstrap.js found${NC}"
    fi
    
    # Check for required bootstrap modules
    required_bootstraps=("DataBootstrap.js" "ServiceBootstrap.js" "UIBootstrap.js" "InteractionBootstrap.js")
    for bootstrap in "${required_bootstraps[@]}"; do
        if [ ! -f "src/js/core/bootstrap/$bootstrap" ]; then
            echo -e "${YELLOW}⚠️  $bootstrap missing${NC}"
            bootstrap_score=$((bootstrap_score - 15))
            issues=$((issues + 1))
        else
            echo -e "${GREEN}✅ $bootstrap found${NC}"
        fi
    done
    
    # Check app.js dependency count (bootstrap pattern should keep this low)
    if [ -f "src/js/app.js" ]; then
        app_deps=$(grep -c "^import " "src/js/app.js" 2>/dev/null || echo 0)
        if [ "$app_deps" -le 3 ]; then
            echo -e "${GREEN}✅ app.js dependency count optimal: $app_deps${NC}"
        elif [ "$app_deps" -le 8 ]; then
            echo -e "${YELLOW}⚠️  app.js dependency count: $app_deps (consider bootstrap refactoring)${NC}"
            bootstrap_score=$((bootstrap_score - 10))
        else
            echo -e "${RED}❌ app.js dependency count too high: $app_deps${NC}"
            echo "   Consider implementing bootstrap architecture pattern"
            bootstrap_score=$((bootstrap_score - 20))
        fi
    fi
    
    # Check for proper initialization sequence
    if [ -f "src/js/core/bootstrap/AppBootstrap.js" ]; then
        if grep -q "DataBootstrap\|ServiceBootstrap\|UIBootstrap\|InteractionBootstrap" "src/js/core/bootstrap/AppBootstrap.js"; then
            echo -e "${GREEN}✅ Bootstrap sequence properly configured${NC}"
        else
            echo -e "${YELLOW}⚠️  Bootstrap sequence may not be properly configured${NC}"
            bootstrap_score=$((bootstrap_score - 10))
        fi
    fi
    
    echo $bootstrap_score
}

BOOTSTRAP_SCORE=$(check_bootstrap_architecture | tail -1)
echo ""

# 7. Architecture-Specific Checks
print_section "Architecture Layer Violations"
check_layer_violations() {
    local violations=0
    
    # Check if controllers import from data/model layer directly
    if find src/ -path "*/controller*" -name "*.js" -exec grep -l "import.*model\|require.*model\|import.*data\|require.*data" {} \; 2>/dev/null | head -1 | grep -q .; then
        echo -e "${YELLOW}⚠️  Controllers directly accessing data layer${NC}"
        find src/ -path "*/controller*" -name "*.js" -exec grep -l "import.*model\|require.*model" {} \; 2>/dev/null | head -3 | sed 's/^/    /'
        violations=$((violations + 1))
    fi
    
    # Check for UI components importing business logic
    if find src/ -path "*/component*" -o -path "*/ui/*" | xargs grep -l "import.*service\|require.*service" 2>/dev/null | head -1 | grep -q .; then
        echo -e "${YELLOW}⚠️  UI components directly importing services${NC}"
        find src/ -path "*/component*" -o -path "*/ui/*" | xargs grep -l "import.*service\|require.*service" 2>/dev/null | head -3 | sed 's/^/    /'
        violations=$((violations + 1))
    fi
    
    # Check for utilities importing domain logic
    if find src/ -path "*/util*" -name "*.js" -exec grep -l "import.*domain\|require.*domain\|import.*model\|require.*model" {} \; 2>/dev/null | head -1 | grep -q .; then
        echo -e "${YELLOW}⚠️  Utilities importing domain logic${NC}"
        violations=$((violations + 1))
    fi
    
    if [ "$violations" -eq 0 ]; then
        echo -e "${GREEN}✅ No obvious layer violations detected${NC}"
        echo 100
    elif [ "$violations" -le 2 ]; then
        echo "Consider reviewing architecture boundaries."
        echo 70
    else
        echo "Multiple layer violations suggest architectural issues."
        echo 40
    fi
}

LAYER_SCORE=$(check_layer_violations | tail -1)
echo ""

# Check for domain boundary violations
print_section "Domain Boundary Analysis"
check_domain_boundaries() {
    local cross_domain=0
    
    # Look for cross-domain imports (assuming domain folders exist)
    if [ -d "src/domains" ] || [ -d "src/modules" ]; then
        domain_dirs=$(find src/ -mindepth 1 -maxdepth 2 -type d -name "*domain*" -o -name "*module*" 2>/dev/null)
        if [ -n "$domain_dirs" ]; then
            echo "Checking for cross-domain imports..."
            echo "$domain_dirs" | while read domain_dir; do
                domain_name=$(basename "$domain_dir")
                # Find files in other domains importing from this domain
                other_domains=$(echo "$domain_dirs" | grep -v "$domain_dir")
                if [ -n "$other_domains" ]; then
                    echo "$other_domains" | while read other_domain; do
                        if find "$other_domain" -name "*.js" -exec grep -l "import.*$domain_name\|require.*$domain_name" {} \; 2>/dev/null | head -1 | grep -q .; then
                            echo -e "${YELLOW}⚠️  $(basename "$other_domain") imports from $domain_name${NC}"
                            cross_domain=$((cross_domain + 1))
                        fi
                    done
                fi
            done
        fi
    else
        # Generic check for potential domain mixing
        common_domains=("user" "auth" "payment" "order" "product" "admin")
        for domain in "${common_domains[@]}"; do
            if find src/ -name "*.js" -exec grep -l "import.*$domain\|require.*$domain" {} \; 2>/dev/null | 
               xargs grep -l "import.*$(printf "%s\|" "${common_domains[@]}" | sed "s/$domain\|//" | sed 's/|$//')" 2>/dev/null | head -1 | grep -q .; then
                echo -e "${YELLOW}⚠️  Potential cross-domain coupling involving $domain${NC}"
                cross_domain=$((cross_domain + 1))
            fi
        done
    fi
    
    if [ "$cross_domain" -eq 0 ]; then
        echo -e "${GREEN}✅ Domain boundaries appear well-maintained${NC}"
        echo 100
    elif [ "$cross_domain" -le 2 ]; then
        echo "Minor cross-domain coupling detected."
        echo 80
    elif [ "$cross_domain" -le 5 ]; then
        echo "Moderate cross-domain coupling - review domain boundaries."
        echo 60
    else
        echo "Significant cross-domain coupling - domain model needs attention."
        echo 30
    fi
}

DOMAIN_SCORE=$(check_domain_boundaries | tail -1)
echo ""

# Check for API contract stability
print_section "API Contract Stability"
check_api_stability() {
    if command_exists git && git rev-parse --git-dir > /dev/null 2>&1; then
        # Check for breaking changes in API files in recent commits
        recent_api_changes=$(git log --since="1 week ago" --name-only --pretty=format: -- "**/*route*" "**/*api*" "**/*endpoint*" "**/*controller*" 2>/dev/null | sort -u | wc -l)
        
        if [ "$recent_api_changes" -eq 0 ]; then
            echo -e "${GREEN}✅ No recent API changes detected${NC}"
            echo 100
        elif [ "$recent_api_changes" -le 3 ]; then
            echo -e "${YELLOW}ℹ️  Few recent API changes ($recent_api_changes files)${NC}"
            echo "Review changes for backward compatibility."
            echo 90
        elif [ "$recent_api_changes" -le 8 ]; then
            echo -e "${YELLOW}⚠️  Moderate API churn ($recent_api_changes files changed)${NC}"
            echo "Consider API versioning strategy."
            echo 70
        else
            echo -e "${RED}⚠️  High API churn ($recent_api_changes files changed)${NC}"
            echo "Frequent API changes may indicate design instability."
            echo 50
        fi
    else
        echo "Git not available - skipping API stability check"
        echo 90
    fi
}

API_SCORE=$(check_api_stability | tail -1)
echo ""

# 7. Codebase Metrics (Updated with contextual thresholds)
print_section "Codebase Metrics"
TOTAL_FILES=$(find src/ -name "*.js" | wc -l)
TOTAL_LINES=$(find src/ -name "*.js" -exec wc -l {} \; | awk '{sum+=$1} END {print sum}')
AVG_FILE_SIZE=$(echo "$TOTAL_LINES / $TOTAL_FILES" | bc 2>/dev/null || echo "N/A")

echo "📁 Total JavaScript files: $TOTAL_FILES"
echo "📏 Total lines of code: $TOTAL_LINES"
echo "📊 Average file size: $AVG_FILE_SIZE lines"

# Use contextual threshold
if [ "$AVG_FILE_SIZE" -gt "$MAX_FILE_SIZE" ] 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Average file size exceeds threshold (>$MAX_FILE_SIZE lines)${NC}"
    FILE_SIZE_SCORE=60
else
    echo -e "${GREEN}✅ File sizes are reasonable${NC}"
    FILE_SIZE_SCORE=100
fi
echo ""

# 8. Test Coverage Check (if available)
print_section "Test Coverage Status"
if npm run test:unit -- --coverage > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Unit tests passing with coverage${NC}"
    TEST_SCORE=100
else
    echo -e "${YELLOW}⚠️  Run 'npm run test:unit -- --coverage' to check test coverage${NC}"
    TEST_SCORE=80
fi
echo ""

# 9. Security Status (Graduated Scoring)
print_section "Security Health"
echo "Command: npm audit"
echo ""

# Check different severity levels
if npm audit --audit-level=critical > /dev/null 2>&1; then
    if npm audit --audit-level=high > /dev/null 2>&1; then
        if npm audit --audit-level=moderate > /dev/null 2>&1; then
            echo -e "${GREEN}✅ No security vulnerabilities found${NC}"
            SECURITY_SCORE=100
        else
            echo -e "${YELLOW}⚠️  Low-severity vulnerabilities detected${NC}"
            echo "Run 'npm audit' for details."
            SECURITY_SCORE=85
        fi
    else
        echo -e "${YELLOW}⚠️  Moderate security vulnerabilities detected${NC}"
        echo "Run 'npm audit fix' to address issues."
        SECURITY_SCORE=60
    fi
else
    if npm audit --audit-level=critical --json 2>/dev/null | jq -r '.metadata.vulnerabilities.critical' | grep -q '^[1-9]'; then
        echo -e "${RED}🚨 CRITICAL: High-severity security vulnerabilities detected${NC}"
        echo "Immediate action required - run 'npm audit' for details."
        SECURITY_SCORE=10
    else
        echo -e "${RED}❌ High-severity security vulnerabilities detected${NC}"
        echo "Run 'npm audit fix' immediately."
        SECURITY_SCORE=30
    fi
fi
echo ""

# Overall Health Score (Weighted Average)
print_section "Overall Architecture Health"

# Calculate weighted scores (adjusted for bootstrap architecture)
ARCHITECTURE_WEIGHT=25
BOOTSTRAP_WEIGHT=15  # New: Bootstrap architecture health
COMPLEXITY_WEIGHT=20
QUALITY_WEIGHT=15
SECURITY_WEIGHT=15
MISC_WEIGHT=10  # Layer violations, API stability, etc.

# Calculate component scores
ARCH_COMPONENT=$(( (CIRCULAR_SCORE * ARCHITECTURE_WEIGHT) / 100 ))
BOOTSTRAP_COMPONENT=$(( (BOOTSTRAP_SCORE * BOOTSTRAP_WEIGHT) / 100 ))
COMPLEXITY_COMPONENT=$(( (COMPLEXITY_SCORE * COMPLEXITY_WEIGHT) / 100 ))
QUALITY_COMPONENT=$(( (DUPLICATION_SCORE * QUALITY_WEIGHT) / 100 ))
SECURITY_COMPONENT=$(( (SECURITY_SCORE * SECURITY_WEIGHT) / 100 ))
MISC_COMPONENT=$(( ((LAYER_SCORE + DOMAIN_SCORE + API_SCORE) * MISC_WEIGHT) / 300 ))

# Final weighted score
HEALTH_SCORE=$(( ARCH_COMPONENT + BOOTSTRAP_COMPONENT + COMPLEXITY_COMPONENT + QUALITY_COMPONENT + SECURITY_COMPONENT + MISC_COMPONENT ))

echo "📊 Component Scores:"
echo "   Architecture (Circular Deps): $CIRCULAR_SCORE/100 (weight: $ARCHITECTURE_WEIGHT%)"
echo "   Bootstrap Architecture: $BOOTSTRAP_SCORE/100 (weight: $BOOTSTRAP_WEIGHT%)"
echo "   Complexity: $COMPLEXITY_SCORE/100 (weight: $COMPLEXITY_WEIGHT%)"
echo "   Code Quality: $DUPLICATION_SCORE/100 (weight: $QUALITY_WEIGHT%)"
echo "   Security: $SECURITY_SCORE/100 (weight: $SECURITY_WEIGHT%)"
echo "   Layer/Domain/API: $(( (LAYER_SCORE + DOMAIN_SCORE + API_SCORE) / 3 ))/100 (weight: $MISC_WEIGHT%)"
echo ""

if [ "$HEALTH_SCORE" -ge 90 ]; then
    echo -e "${GREEN}🏆 EXCELLENT (Score: $HEALTH_SCORE/100)${NC}"
    echo "Your architecture is in great shape!"
elif [ "$HEALTH_SCORE" -ge 75 ]; then
    echo -e "${GREEN}✅ GOOD (Score: $HEALTH_SCORE/100)${NC}" 
    echo "Minor improvements recommended."
elif [ "$HEALTH_SCORE" -ge 60 ]; then
    echo -e "${YELLOW}⚠️  NEEDS ATTENTION (Score: $HEALTH_SCORE/100)${NC}"
    echo "Consider addressing the issues above."
elif [ "$HEALTH_SCORE" -ge 40 ]; then
    echo -e "${RED}❌ POOR (Score: $HEALTH_SCORE/100)${NC}"
    echo "Significant architectural issues need addressing."
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
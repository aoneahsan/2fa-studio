#!/bin/bash

# 2FA Studio - Monitoring & Analytics Setup Script
# This script sets up comprehensive monitoring, analytics, and alerting

set -e

echo "📊 2FA Studio - Monitoring & Analytics Setup"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
ENVIRONMENT="${1:-production}"

echo -e "${BLUE}📋 Monitoring Setup Configuration:${NC}"
echo "Environment: $ENVIRONMENT"
echo "Project Root: $PROJECT_ROOT"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required tools
echo -e "${BLUE}🔍 Checking required tools...${NC}"

required_tools=("curl" "jq")
for tool in "${required_tools[@]}"; do
    if ! command_exists "$tool"; then
        echo -e "${RED}❌ $tool not found. Please install it.${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required tools found${NC}"

# Change to project root
cd "$PROJECT_ROOT"

# Load environment configuration
if [[ -f ".env.$ENVIRONMENT" ]]; then
    echo -e "${BLUE}📄 Loading environment configuration...${NC}"
    set -a
    source ".env.$ENVIRONMENT"
    set +a
    echo -e "${GREEN}✅ Environment configuration loaded${NC}"
fi

# Setup Sentry Error Tracking
setup_sentry() {
    echo -e "${BLUE}🛡️ Setting up Sentry Error Tracking...${NC}"
    
    if [[ -z "$SENTRY_ORG" || -z "$SENTRY_PROJECT" ]]; then
        echo -e "${YELLOW}⚠️  Sentry configuration missing. Skipping Sentry setup.${NC}"
        return 0
    fi
    
    # Install Sentry CLI if not present
    if ! command_exists "sentry-cli"; then
        echo "Installing Sentry CLI..."
        curl -sL https://sentry.io/get-cli/ | bash
    fi
    
    # Create Sentry release
    if [[ -n "$SENTRY_AUTH_TOKEN" ]]; then
        export SENTRY_AUTH_TOKEN="$SENTRY_AUTH_TOKEN"
        
        RELEASE_VERSION="${VITE_APP_VERSION:-$(git rev-parse --short HEAD)}"
        
        echo "Creating Sentry release: $RELEASE_VERSION"
        sentry-cli releases new "$RELEASE_VERSION"
        
        # Associate commits with release
        sentry-cli releases set-commits "$RELEASE_VERSION" --auto
        
        # Upload source maps if they exist
        if [[ -d "dist" ]]; then
            echo "Uploading source maps..."
            sentry-cli releases files "$RELEASE_VERSION" upload-sourcemaps dist/ --url-prefix "~/static/"
        fi
        
        # Finalize release
        sentry-cli releases finalize "$RELEASE_VERSION"
        
        echo -e "${GREEN}✅ Sentry release created: $RELEASE_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  SENTRY_AUTH_TOKEN not provided. Skipping release creation.${NC}"
    fi
}

# Setup Google Analytics 4
setup_google_analytics() {
    echo -e "${BLUE}📈 Setting up Google Analytics 4...${NC}"
    
    if [[ -z "$VITE_GOOGLE_ANALYTICS_ID" ]]; then
        echo -e "${YELLOW}⚠️  Google Analytics ID not provided. Skipping GA setup.${NC}"
        return 0
    fi
    
    # Validate GA4 Measurement ID format
    if [[ ! "$VITE_GOOGLE_ANALYTICS_ID" =~ ^G-[A-Z0-9]{10}$ ]]; then
        echo -e "${RED}❌ Invalid Google Analytics ID format: $VITE_GOOGLE_ANALYTICS_ID${NC}"
        return 1
    fi
    
    echo "Google Analytics 4 configured with ID: $VITE_GOOGLE_ANALYTICS_ID"
    
    # Test GA4 connection (basic test)
    GA_TEST_URL="https://www.google-analytics.com/g/collect"
    
    if curl -s --head "$GA_TEST_URL" | grep -q "200 OK"; then
        echo -e "${GREEN}✅ Google Analytics endpoint reachable${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not verify Google Analytics endpoint${NC}"
    fi
}

# Setup Honeycomb (OpenTelemetry)
setup_honeycomb() {
    echo -e "${BLUE}🍯 Setting up Honeycomb for OpenTelemetry...${NC}"
    
    if [[ -z "$HONEYCOMB_API_KEY" ]]; then
        echo -e "${YELLOW}⚠️  Honeycomb API key not provided. Skipping Honeycomb setup.${NC}"
        return 0
    fi
    
    # Test Honeycomb API connection
    if curl -s -H "X-Honeycomb-Team: $HONEYCOMB_API_KEY" \
        "https://api.honeycomb.io/1/auth" | jq -e '.team.name' > /dev/null; then
        echo -e "${GREEN}✅ Honeycomb API connection successful${NC}"
    else
        echo -e "${RED}❌ Failed to connect to Honeycomb API${NC}"
        return 1
    fi
    
    # Create dataset if it doesn't exist
    DATASET_NAME="2fa-studio-$ENVIRONMENT"
    
    echo "Creating Honeycomb dataset: $DATASET_NAME"
    curl -s -X POST "https://api.honeycomb.io/1/datasets/$DATASET_NAME" \
        -H "X-Honeycomb-Team: $HONEYCOMB_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"description": "2FA Studio monitoring dataset"}' || echo "Dataset may already exist"
    
    echo -e "${GREEN}✅ Honeycomb configured for dataset: $DATASET_NAME${NC}"
}

# Setup Mixpanel Analytics
setup_mixpanel() {
    echo -e "${BLUE}🎯 Setting up Mixpanel Analytics...${NC}"
    
    if [[ -z "$VITE_MIXPANEL_TOKEN" ]]; then
        echo -e "${YELLOW}⚠️  Mixpanel token not provided. Skipping Mixpanel setup.${NC}"
        return 0
    fi
    
    # Test Mixpanel API
    TEST_EVENT='{
        "event": "monitoring_setup_test",
        "properties": {
            "time": '$(date +%s)',
            "distinct_id": "setup-script",
            "environment": "'$ENVIRONMENT'",
            "setup_time": "'$(date -u)'",
            "token": "'$VITE_MIXPANEL_TOKEN'"
        }
    }'
    
    ENCODED_EVENT=$(echo "$TEST_EVENT" | base64 -w 0)
    
    if curl -s "https://api.mixpanel.com/track?data=$ENCODED_EVENT" | grep -q "1"; then
        echo -e "${GREEN}✅ Mixpanel API connection successful${NC}"
    else
        echo -e "${RED}❌ Failed to connect to Mixpanel API${NC}"
        return 1
    fi
}

# Setup Hotjar User Experience Analytics
setup_hotjar() {
    echo -e "${BLUE}🔥 Setting up Hotjar User Experience Analytics...${NC}"
    
    if [[ -z "$VITE_HOTJAR_ID" ]]; then
        echo -e "${YELLOW}⚠️  Hotjar ID not provided. Skipping Hotjar setup.${NC}"
        return 0
    fi
    
    # Validate Hotjar ID format (should be numeric)
    if [[ ! "$VITE_HOTJAR_ID" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}❌ Invalid Hotjar ID format: $VITE_HOTJAR_ID${NC}"
        return 1
    fi
    
    echo "Hotjar configured with site ID: $VITE_HOTJAR_ID"
    echo -e "${GREEN}✅ Hotjar configuration validated${NC}"
}

# Setup Performance Monitoring
setup_performance_monitoring() {
    echo -e "${BLUE}⚡ Setting up Performance Monitoring...${NC}"
    
    # Create performance monitoring configuration
    cat > "deployment/monitoring/performance-config.json" << EOF
{
  "performanceMonitoring": {
    "enabled": true,
    "environment": "$ENVIRONMENT",
    "metrics": {
      "webVitals": {
        "enabled": true,
        "thresholds": {
          "fcp": 1800,
          "lcp": 2500,
          "fid": 100,
          "cls": 0.1,
          "ttfb": 600
        }
      },
      "customMetrics": {
        "accountCreation": true,
        "qrScanTime": true,
        "backupDuration": true,
        "syncLatency": true
      }
    },
    "reporting": {
      "interval": 30000,
      "batchSize": 50,
      "retryCount": 3
    },
    "endpoints": {
      "vitals": "/api/performance/vitals",
      "metrics": "/api/performance/metrics",
      "resources": "/api/performance/resources"
    }
  }
}
EOF
    
    echo -e "${GREEN}✅ Performance monitoring configuration created${NC}"
}

# Setup Alerting Rules
setup_alerting() {
    echo -e "${BLUE}🚨 Setting up Monitoring Alerts...${NC}"
    
    # Create alerting configuration
    cat > "deployment/monitoring/alerts-config.json" << EOF
{
  "alerting": {
    "enabled": true,
    "environment": "$ENVIRONMENT",
    "rules": [
      {
        "name": "High Error Rate",
        "condition": "error_rate > 0.05",
        "duration": "5m",
        "severity": "critical",
        "channels": ["slack", "email"]
      },
      {
        "name": "Slow Response Time",
        "condition": "avg_response_time > 2000",
        "duration": "10m",
        "severity": "warning",
        "channels": ["slack"]
      },
      {
        "name": "Firebase Connection Issues",
        "condition": "firebase_errors > 10",
        "duration": "5m",
        "severity": "critical",
        "channels": ["slack", "email", "sms"]
      },
      {
        "name": "High Memory Usage",
        "condition": "memory_usage > 0.85",
        "duration": "15m",
        "severity": "warning",
        "channels": ["slack"]
      },
      {
        "name": "Failed Backup Operations",
        "condition": "backup_failure_rate > 0.1",
        "duration": "10m",
        "severity": "warning",
        "channels": ["slack", "email"]
      }
    ],
    "channels": {
      "slack": {
        "webhook_url": "$SLACK_WEBHOOK_URL",
        "channel": "#alerts-2fa-studio",
        "enabled": $([ -n "$SLACK_WEBHOOK_URL" ] && echo "true" || echo "false")
      },
      "email": {
        "smtp_server": "$SMTP_SERVER",
        "recipients": ["$ADMIN_EMAIL"],
        "enabled": $([ -n "$ADMIN_EMAIL" ] && echo "true" || echo "false")
      },
      "sms": {
        "service": "twilio",
        "enabled": false
      }
    }
  }
}
EOF
    
    echo -e "${GREEN}✅ Alerting rules configuration created${NC}"
}

# Setup Health Check Endpoints
setup_health_checks() {
    echo -e "${BLUE}💓 Setting up Health Check Endpoints...${NC}"
    
    # Create health check configuration
    cat > "deployment/monitoring/health-checks.json" << EOF
{
  "healthChecks": {
    "enabled": true,
    "environment": "$ENVIRONMENT",
    "checks": [
      {
        "name": "Firebase Firestore",
        "type": "database",
        "endpoint": "internal://firestore/health",
        "interval": 30,
        "timeout": 5000,
        "critical": true
      },
      {
        "name": "Firebase Authentication",
        "type": "service",
        "endpoint": "internal://auth/health",
        "interval": 60,
        "timeout": 3000,
        "critical": true
      },
      {
        "name": "Firebase Storage",
        "type": "storage",
        "endpoint": "internal://storage/health",
        "interval": 120,
        "timeout": 5000,
        "critical": false
      },
      {
        "name": "Google Drive API",
        "type": "external",
        "endpoint": "https://www.googleapis.com/drive/v3/about",
        "interval": 300,
        "timeout": 10000,
        "critical": false
      },
      {
        "name": "Stripe API",
        "type": "external",
        "endpoint": "https://api.stripe.com/v1/payment_methods",
        "interval": 600,
        "timeout": 8000,
        "critical": false
      }
    ],
    "reporting": {
      "endpoint": "/api/health/report",
      "interval": 60,
      "includeMetrics": true
    }
  }
}
EOF
    
    echo -e "${GREEN}✅ Health check endpoints configuration created${NC}"
}

# Setup Logging Configuration
setup_logging() {
    echo -e "${BLUE}📝 Setting up Logging Configuration...${NC}"
    
    # Create logging configuration
    cat > "deployment/monitoring/logging-config.json" << EOF
{
  "logging": {
    "enabled": true,
    "environment": "$ENVIRONMENT",
    "level": "$([ "$ENVIRONMENT" = "production" ] && echo "info" || echo "debug")",
    "format": "json",
    "outputs": [
      {
        "type": "console",
        "enabled": true,
        "level": "$([ "$ENVIRONMENT" = "production" ] && echo "warn" || echo "debug")"
      },
      {
        "type": "file",
        "enabled": true,
        "path": "/var/log/2fa-studio/app.log",
        "level": "info",
        "rotation": {
          "maxFiles": 5,
          "maxSize": "10MB"
        }
      },
      {
        "type": "remote",
        "enabled": $([ "$ENVIRONMENT" = "production" ] && echo "true" || echo "false"),
        "endpoint": "https://logs.your-domain.com/api/ingest",
        "level": "info",
        "batchSize": 100,
        "flushInterval": 30000
      }
    ],
    "structured": {
      "enabled": true,
      "fields": {
        "timestamp": true,
        "level": true,
        "service": "2fa-studio",
        "version": "$VITE_APP_VERSION",
        "environment": "$ENVIRONMENT",
        "traceId": true,
        "userId": true,
        "sessionId": true
      }
    },
    "sampling": {
      "enabled": $([ "$ENVIRONMENT" = "production" ] && echo "true" || echo "false"),
      "rate": 0.1,
      "preserveErrors": true
    }
  }
}
EOF
    
    echo -e "${GREEN}✅ Logging configuration created${NC}"
}

# Create monitoring dashboard configuration
setup_monitoring_dashboard() {
    echo -e "${BLUE}📊 Setting up Monitoring Dashboard Configuration...${NC}"
    
    cat > "deployment/monitoring/dashboard-config.json" << EOF
{
  "dashboard": {
    "title": "2FA Studio - $ENVIRONMENT Dashboard",
    "environment": "$ENVIRONMENT",
    "refreshInterval": 30,
    "widgets": [
      {
        "type": "metric",
        "title": "Active Users",
        "query": "count(distinct(user_id))",
        "timeRange": "24h",
        "visualization": "single_stat"
      },
      {
        "type": "metric",
        "title": "Error Rate",
        "query": "rate(errors_total[5m])",
        "timeRange": "1h",
        "visualization": "line_chart",
        "threshold": 0.05
      },
      {
        "type": "metric",
        "title": "Response Time",
        "query": "avg(response_time_seconds)",
        "timeRange": "1h",
        "visualization": "line_chart"
      },
      {
        "type": "metric",
        "title": "Account Operations",
        "query": "rate(account_operations_total[1m])",
        "timeRange": "6h",
        "visualization": "area_chart"
      },
      {
        "type": "metric",
        "title": "Backup Success Rate",
        "query": "rate(backup_success_total[1m]) / rate(backup_attempts_total[1m])",
        "timeRange": "24h",
        "visualization": "gauge"
      }
    ],
    "alerts": [
      {
        "name": "High Error Rate Alert",
        "condition": "error_rate > 0.05",
        "severity": "critical"
      },
      {
        "name": "Slow Response Time Alert",
        "condition": "avg_response_time > 2000",
        "severity": "warning"
      }
    ]
  }
}
EOF
    
    echo -e "${GREEN}✅ Monitoring dashboard configuration created${NC}"
}

# Test all monitoring endpoints
test_monitoring_endpoints() {
    echo -e "${BLUE}🧪 Testing Monitoring Endpoints...${NC}"
    
    # Test endpoints if URLs are provided
    ENDPOINTS_TO_TEST=(
        "SENTRY_DSN:Sentry"
        "HONEYCOMB_API_KEY:Honeycomb"
        "SLACK_WEBHOOK_URL:Slack"
    )
    
    for endpoint_info in "${ENDPOINTS_TO_TEST[@]}"; do
        IFS=':' read -r var_name service_name <<< "$endpoint_info"
        endpoint_value="${!var_name}"
        
        if [[ -n "$endpoint_value" ]]; then
            echo "Testing $service_name connectivity..."
            
            case "$service_name" in
                "Sentry")
                    if curl -s --head "$endpoint_value" | grep -q "200\|404"; then
                        echo -e "${GREEN}✅ $service_name endpoint reachable${NC}"
                    else
                        echo -e "${YELLOW}⚠️  $service_name endpoint test inconclusive${NC}"
                    fi
                    ;;
                "Slack")
                    # Test with a minimal payload
                    if curl -s -X POST "$endpoint_value" \
                        -H "Content-Type: application/json" \
                        -d '{"text":"Monitoring setup test"}' | grep -q "ok"; then
                        echo -e "${GREEN}✅ $service_name webhook working${NC}"
                    else
                        echo -e "${RED}❌ $service_name webhook test failed${NC}"
                    fi
                    ;;
                *)
                    echo -e "${YELLOW}⚠️  No test available for $service_name${NC}"
                    ;;
            esac
        else
            echo -e "${YELLOW}⚠️  $service_name configuration not provided${NC}"
        fi
    done
}

# Generate monitoring summary report
generate_monitoring_report() {
    echo -e "${BLUE}📊 Generating Monitoring Setup Report...${NC}"
    
    REPORT_FILE="deployment/monitoring/setup-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# 2FA Studio Monitoring Setup Report

## Setup Summary
- **Environment**: $ENVIRONMENT
- **Setup Date**: $(date -u)
- **Setup Script Version**: 1.0.0

## Configured Services

### Error Tracking
- **Sentry**: $([ -n "$SENTRY_ORG" ] && echo "✅ Configured" || echo "❌ Not configured")
  - Organization: ${SENTRY_ORG:-"N/A"}
  - Project: ${SENTRY_PROJECT:-"N/A"}

### Analytics
- **Google Analytics 4**: $([ -n "$VITE_GOOGLE_ANALYTICS_ID" ] && echo "✅ Configured" || echo "❌ Not configured")
  - Measurement ID: ${VITE_GOOGLE_ANALYTICS_ID:-"N/A"}
- **Mixpanel**: $([ -n "$VITE_MIXPANEL_TOKEN" ] && echo "✅ Configured" || echo "❌ Not configured")
- **Hotjar**: $([ -n "$VITE_HOTJAR_ID" ] && echo "✅ Configured" || echo "❌ Not configured")

### Observability
- **Honeycomb**: $([ -n "$HONEYCOMB_API_KEY" ] && echo "✅ Configured" || echo "❌ Not configured")
- **OpenTelemetry**: ✅ Configured (built-in)

### Alerting
- **Slack**: $([ -n "$SLACK_WEBHOOK_URL" ] && echo "✅ Configured" || echo "❌ Not configured")
- **Email**: $([ -n "$ADMIN_EMAIL" ] && echo "✅ Configured" || echo "❌ Not configured")

## Configuration Files Created
- Performance monitoring config
- Alerting rules config
- Health checks config
- Logging config
- Dashboard config

## Next Steps
1. Verify all monitoring endpoints are working
2. Set up alert notification channels
3. Configure monitoring dashboard
4. Test alert rules with simulated incidents
5. Document monitoring procedures

## Monitoring Endpoints
- Health Check: /api/health
- Metrics: /api/metrics
- Performance: /api/performance/vitals
- Errors: /api/errors/report

---
Generated by 2FA Studio monitoring setup script
EOF
    
    echo -e "${GREEN}✅ Monitoring setup report generated: $REPORT_FILE${NC}"
}

# Main setup function
main() {
    echo -e "${BLUE}🚀 Starting comprehensive monitoring setup...${NC}"
    
    # Create monitoring directory structure
    mkdir -p "deployment/monitoring/configs"
    mkdir -p "deployment/monitoring/dashboards"
    mkdir -p "deployment/monitoring/alerts"
    
    # Run all setup functions
    setup_sentry
    setup_google_analytics
    setup_honeycomb
    setup_mixpanel
    setup_hotjar
    setup_performance_monitoring
    setup_alerting
    setup_health_checks
    setup_logging
    setup_monitoring_dashboard
    
    # Test endpoints
    test_monitoring_endpoints
    
    # Generate report
    generate_monitoring_report
    
    echo ""
    echo -e "${GREEN}🎉 Monitoring setup completed successfully!${NC}"
    echo -e "${BLUE}📊 Summary:${NC}"
    echo "  Environment: $ENVIRONMENT"
    echo "  Services configured: Multiple (see report for details)"
    echo "  Configuration files: Created in deployment/monitoring/"
    echo ""
    echo -e "${BLUE}🔗 Next Steps:${NC}"
    echo "1. Review the generated setup report"
    echo "2. Test monitoring endpoints and alerts"
    echo "3. Set up monitoring dashboard"
    echo "4. Configure alert notification preferences"
    echo "5. Document monitoring procedures for team"
    echo ""
    echo -e "${GREEN}✅ Monitoring setup process completed!${NC}"
}

# Run main function
main "$@"
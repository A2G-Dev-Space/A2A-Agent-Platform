#!/bin/bash
# Script to fix all hardcoded HTTP URLs to use dynamic protocol from config/api.ts

set -e

cd "$(dirname "$0")/src"

echo "Fixing hardcoded HTTP URLs in frontend components..."

# List of files with hardcoded HTTP URLs
files=(
  "pages/Settings/LlmManagementPage.tsx"
  "pages/Settings/PlatformKeysPage.tsx"
  "pages/Settings/AddLlmModelModal.tsx"
  "pages/Settings/StatisticsPage.tsx"
  "components/hub/HubChatAgno.tsx"
  "components/hub/HubChatLangchain.tsx"
  "components/hub/HubChatADK.tsx"
  "components/hub/A2AInfoSidebar.tsx"
  "components/workbench/TraceView.tsx"
  "components/workbench/TracePanel.tsx"
)

# Function to check if file needs import addition
add_import_if_needed() {
  local file=$1
  if ! grep -q "import.*getGatewayBaseUrl.*from.*@/config/api" "$file" 2>/dev/null; then
    # Add import after other imports
    sed -i "1a import { getGatewayBaseUrl, buildServiceUrl } from '@/config/api'" "$file"
    echo "  Added import to $file"
  fi
}

# Replace patterns
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."

    # Add import
    add_import_if_needed "$file"

    # Replace http://${HOST_IP}:${GATEWAY_PORT} with getGatewayBaseUrl()
    sed -i 's|`http://\${HOST_IP}:\${GATEWAY_PORT}|`${getGatewayBaseUrl()}|g' "$file"

    # Replace http://${HOST_IP}:8006 with buildServiceUrl
    sed -i 's|`http://\${HOST_IP}:8006|`${buildServiceUrl(import.meta.env.VITE_HOST_IP \|\| '\''localhost'\'', 8006, '\'''\')}|g' "$file"

    # Replace http://${HOST_IP}:8010 with buildServiceUrl
    sed -i 's|`http://\${HOST_IP}:8010|`${buildServiceUrl(import.meta.env.VITE_HOST_IP \|\| '\''localhost'\'', 8010, '\'''\')}|g' "$file"

    echo "  ✓ Fixed $file"
  else
    echo "  ⚠ File not found: $file"
  fi
done

echo ""
echo "All files processed!"
echo ""
echo "Next steps:"
echo "1. Review the changes"
echo "2. The frontend dev server should auto-reload"
echo "3. Test HTTPS connections"

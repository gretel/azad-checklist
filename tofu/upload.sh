#!/bin/bash
# Upload assets/ to the VM. Pass resource group and VM name from
# `tofu output` or the Azure portal.
#
# Usage:
#   ./upload.sh <resource-group> <vm-name>
#
set -euo pipefail

if [ $# -ne 2 ]; then
    echo "Usage: $0 <resource-group> <vm-name>"
    echo ""
    echo "Example (run from this directory):"
    echo '  ./upload.sh "$(tofu output -raw resource_group)" "$(tofu output -raw vm_name)"'
    exit 1
fi

RG="$1"
VM="$2"
SRC="$(cd "$(dirname "$0")/../assets" && pwd)"

echo "==> Uploading $SRC to $VM (rg: $RG)"

TARB64=$(cd "$SRC" && tar cz . | base64 | tr -d '\n')
az vm run-command invoke \
    --resource-group "$RG" --name "$VM" --command-id RunShellScript \
    --output none \
    --scripts "echo '${TARB64}' | base64 -d | sudo tar xz -C /var/www/html/ && sudo chmod 644 /var/www/html/*.html /var/www/html/*.css /var/www/html/*.js /var/www/html/*.json 2>/dev/null; echo 'Upload OK'"

echo "==> Done"
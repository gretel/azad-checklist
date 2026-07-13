#!/bin/bash
# Deploy the azad-checklist site to an Azure VM
set -euo pipefail

LOCATION="${1:-westeurope}"
DNS_OVERRIDE="${2:-}"
if [ -n "$DNS_OVERRIDE" ]; then
  RG="rg-${DNS_OVERRIDE}"
  VM="vm-${DNS_OVERRIDE}"
  DNS="$DNS_OVERRIDE"
else
  SUFFIX=$(openssl rand -hex 3)
  RG="rg-azad-checklist-${SUFFIX}"
  VM="vm-azad-checklist-${SUFFIX}"
  DNS="azad-checklist-${SUFFIX}"
fi
SRC="$(cd "$(dirname "$0")" && pwd)"

command -v az >/dev/null 2>&1 || { echo "ERROR: az CLI not found"; exit 1; }
az account show >/dev/null 2>&1 || { echo "ERROR: Not logged in. Run 'az login'."; exit 1; }

# ── Provision or update VM ──
VM_EXISTS=$(az vm show --resource-group "$RG" --name "$VM" --query "name" -o tsv 2>/dev/null || echo "")
if [ -z "$VM_EXISTS" ]; then
    echo "==> Creating VM: $VM"
    az group create --name "$RG" --location "$LOCATION" --output none
    az vm create \
        --resource-group "$RG" --name "$VM" --image Ubuntu2404 \
        --size Standard_B2ats_v2 --admin-username azureuser \
        --generate-ssh-keys --public-ip-sku Standard \
        --custom-data '@-' << 'EOF'
#cloud-config
package_upgrade: true
packages: [nginx]
runcmd:
  - systemctl enable nginx
  - systemctl start nginx
EOF
    az vm open-port --resource-group "$RG" --name "$VM" --port 80 --output none
    PIP_NAME=$(az network public-ip list --resource-group "$RG" --query "[0].name" -o tsv)
    az network public-ip update --resource-group "$RG" --name "$PIP_NAME" --dns-name "$DNS" --output none
else
    echo "==> VM exists, updating"
    PIP_NAME=\
$(az network public-ip list --resource-group "$RG" --query "[0].name" -o tsv)
    az network public-ip update --resource-group "$RG" --name "$PIP_NAME" --dns-name "$DNS" --output none 2>/dev/null || true
fi

FQDN="$DNS.$LOCATION.cloudapp.azure.com"
IP=$(az vm show --resource-group "$RG" --name "$VM" --show-details --query "publicIps" -o tsv)
echo "    IP: $IP  URL: http://$FQDN/"

# ── Upload all asset files as single tarball ──
echo "==> Uploading assets/ to /var/www/html/"
TARB64=$(cd "$SRC/assets" && tar cz . | base64 | tr -d '\n')
az vm run-command invoke \
    --resource-group "$RG" --name "$VM" --command-id RunShellScript \
    --output none \
    --scripts "sudo mkdir -p /var/www/html/ && echo '${TARB64}' | base64 -d | sudo tar xz -C /var/www/html/ && sudo chmod 644 /var/www/html/*.html /var/www/html/*.css /var/www/html/*.js /var/www/html/*.json; echo 'Upload OK'"

# ── Verify ──
echo "==> Verifying"
for _ in $(seq 1 12); do
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://$IP/" 2>/dev/null || echo "000")
    if [ "$HTTP" = "200" ]; then
        echo "    HTTP 200"
        break
    fi
    sleep 5
done

echo ""; echo "=== Done ==="
echo "Visit: http://$FQDN/"
echo "Clean up: az group delete --name $RG --yes --no-wait"
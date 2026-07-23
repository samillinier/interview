#!/usr/bin/env bash
set -euo pipefail

# ── Traccar GPS Server — Azure VM Setup ──────────────────────────────────────
#
# Run this script on a fresh Ubuntu 22.04/24.04 LTS Azure VM.
#
# Prerequisites:
# 1. Create an Azure VM (B1s or B1ms, Ubuntu 22.04 LTS)
# 2. Open these inbound ports in the VM's NSG (Network Security Group):
#    - 8082 (TCP)  — Traccar Web UI & REST API
#    - 5055 (TCP+UDP) — Queclink GV500MAP device protocol
#    - 80   (TCP)  — optional, for Let's Encrypt
#    - 443  (TCP)  — optional, for SSL
# 3. SSH into the VM and run this script:
#      chmod +x setup-traccar-azure.sh
#      sudo ./setup-traccar-azure.sh
#
# After setup:
#   - Web UI:  http://<VM_PUBLIC_IP>:8082  (login: admin / admin)
#   - REST API: http://<VM_PUBLIC_IP>:8082/api
#   - Device port: <VM_PUBLIC_IP>:5055 (Queclink protocol)

echo "═══════════════════════════════════════════════"
echo "  Traccar GPS Server — Azure VM Setup"
echo "═══════════════════════════════════════════════"
echo ""

# ── 1. Update system ─────────────────────────────────────────────────────────

echo "[1/6] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install Docker ────────────────────────────────────────────────────────

echo "[2/6] Installing Docker..."
if ! command -v docker &>/dev/null; then
  apt-get install -y -qq ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# ── 3. Install PostgreSQL (optional, but better than H2 for production) ──────

echo "[3/6] Installing PostgreSQL..."
if ! command -v psql &>/dev/null; then
  apt-get install -y -qq postgresql postgresql-client
fi

PG_USER="traccar"
PG_PASS="traccar_$(openssl rand -hex 8)"
PG_DB="traccar"

echo "    Setting up PostgreSQL database..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${PG_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE ROLE ${PG_USER} WITH LOGIN PASSWORD '${PG_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${PG_DB}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${PG_DB} OWNER ${PG_USER};"

echo "    PostgreSQL user: ${PG_USER}"
echo "    PostgreSQL database: ${PG_DB}"
echo "    PostgreSQL password saved to /root/traccar-pg-password.txt"
echo "${PG_PASS}" > /root/traccar-pg-password.txt
chmod 600 /root/traccar-pg-password.txt

# ── 4. Create Traccar config ─────────────────────────────────────────────────

echo "[4/6] Creating Traccar configuration..."
mkdir -p /opt/traccar/conf /opt/traccar/logs /opt/traccar/data

cat > /opt/traccar/conf/traccar.xml << EOF
<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE properties SYSTEM 'http://java.sun.com/dtds/properties.dtd'>
<properties>
    <!-- Use PostgreSQL instead of the default H2 database -->
    <entry key='database.driver'>org.postgresql.Driver</entry>
    <entry key='database.url'>jdbc:postgresql://localhost:5432/${PG_DB}</entry>
    <entry key='database.user'>${PG_USER}</entry>
    <entry key='database.password'>${PG_PASS}</entry>

    <!-- Web server port -->
    <entry key='web.port'>8082</entry>

    <!-- Enable the Queclink protocol on port 5055 -->
    <entry key='queclink.port'>5055</entry>

    <!-- Geocoder (optional — uses free OpenStreetMap Nominatim) -->
    <entry key='geocoder.enable'>true</entry>
    <entry key='geocoder.type'>nominatim</entry>
    <entry key='geocoder.url'>https://nominatim.openstreetmap.org</entry>

    <!-- Logging -->
    <entry key='logger.level'>INFO</entry>
    <entry key='logger.file'>/opt/traccar/logs/tracker-server.log</entry>

    <!-- Event forwarding (optional — uncomment to enable) -->
    <!-- <entry key='event.forward.enable'>true</entry> -->
    <!-- <entry key='event.forward.url'>https://your-app.vercel.app/api/gps/events</entry> -->
</properties>
EOF

# ── 5. Start Traccar container ───────────────────────────────────────────────

echo "[5/6] Starting Traccar container..."
docker rm -f traccar 2>/dev/null || true

docker run -d \
  --name traccar \
  --restart unless-stopped \
  --network host \
  -v /opt/traccar/conf/traccar.xml:/opt/traccar/conf/traccar.xml:ro \
  -v /opt/traccar/logs:/opt/traccar/logs:rw \
  -v /opt/traccar/data:/opt/traccar/data:rw \
  traccar/traccar:latest

echo "    Waiting for Traccar to start..."
sleep 10

# Verify it's running
if docker ps --format '{{.Names}}' | grep -q traccar; then
  echo "    ✓ Traccar container is running"
else
  echo "    ✗ Traccar failed to start — check logs with: docker logs traccar"
  exit 1
fi

# ── 6. Summary ───────────────────────────────────────────────────────────────

VM_IP=$(curl -s ifconfig.me 2>/dev/null || echo '<VM_IP>')

echo ""
echo "═══════════════════════════════════════════════"
echo "  Setup Complete!"
echo "═══════════════════════════════════════════════"
echo ""
echo "  Web UI:      http://${VM_IP}:8082"
echo "  REST API:    http://${VM_IP}:8082/api"
echo "  Device Port: ${VM_IP}:5055 (Queclink protocol)"
echo ""
echo "  Default login:  admin / admin"
echo ""
echo "  Change the password immediately:"
echo "    http://${VM_IP}:8082 → Settings → Account"
echo ""
echo "  PostgreSQL password: /root/traccar-pg-password.txt"
echo ""
echo "  Next steps:"
echo "  1. Open http://${VM_IP}:8082 and change the admin password"
echo "  2. Register your Queclink GV500MAP devices (uniqueId = device IMEI)"
echo "  3. Set TRACCAR_SERVER_URL in your Next.js .env:"
echo "     TRACCAR_SERVER_URL=http://${VM_IP}:8082"
echo "     TRACCAR_USERNAME=admin"
echo "     TRACCAR_PASSWORD=<your_password>"
echo "  4. Configure each Queclink device to report to ${VM_IP}:5055"
echo ""
echo "  View logs:    docker logs -f traccar"
echo "  Restart:      docker restart traccar"
echo "  Stop:         docker stop traccar"
echo ""

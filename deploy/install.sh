#!/usr/bin/env bash
# Installs WeekFlow on a Debian or Ubuntu VM as a systemd service.
# Run from the project folder:  sudo bash deploy/install.sh
set -euo pipefail

APP_DIR=/opt/weekflow
DATA_DIR=/var/lib/weekflow
ENV_FILE=/etc/weekflow.env
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ "$(id -u)" -ne 0 ]; then echo "Run this with sudo: sudo bash deploy/install.sh"; exit 1; fi

echo "==> Checking for Node.js 22.13 or newer (it has SQLite built in)"
need_node=1
if command -v node >/dev/null 2>&1; then
  if node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=13)?0:1)'; then need_node=0; fi
fi
if [ "$need_node" -eq 1 ]; then
  echo "    Installing Node.js 22 from NodeSource"
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "    Node $(node -v)"

echo "==> Creating the weekflow user and folders"
id -u weekflow >/dev/null 2>&1 || useradd --system --home "$DATA_DIR" --shell /usr/sbin/nologin weekflow
mkdir -p "$APP_DIR" "$DATA_DIR"

echo "==> Copying the app to $APP_DIR"
cp -r "$SRC_DIR/server" "$SRC_DIR/web" "$SRC_DIR/package.json" "$SRC_DIR/package-lock.json" "$APP_DIR/"
cd "$APP_DIR"
npm ci --omit=dev --no-audit --no-fund
chown -R root:root "$APP_DIR"
chown -R weekflow:weekflow "$DATA_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "==> Writing $ENV_FILE"
  cat > "$ENV_FILE" <<CONF
HOST=0.0.0.0
PORT=8080
DATA_DIR=$DATA_DIR
ALLOW_SIGNUP=true
INVITE_CODE=
TRUST_PROXY=0
COOKIE_SECURE=auto
SESSION_DAYS=30
CONF
  chmod 640 "$ENV_FILE"; chown root:weekflow "$ENV_FILE"
else
  echo "==> Keeping your existing $ENV_FILE"
fi

echo "==> Installing the service and nightly backups"
cp "$SRC_DIR/deploy/weekflow.service" "$SRC_DIR/deploy/weekflow-backup.service" "$SRC_DIR/deploy/weekflow-backup.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now weekflow.service weekflow-backup.timer
systemctl restart weekflow.service

sleep 2
port=$(grep -E '^PORT=' "$ENV_FILE" | cut -d= -f2); port=${port:-8080}
if curl -fsS "http://127.0.0.1:$port/api/health" >/dev/null; then
  ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  echo
  echo "WeekFlow is running: http://${ip:-this-vm}:$port"
  echo "Settings: $ENV_FILE   Data: $DATA_DIR   Logs: journalctl -u weekflow -f"
else
  echo "WeekFlow didn't answer yet. Check: journalctl -u weekflow -n 50"
  exit 1
fi

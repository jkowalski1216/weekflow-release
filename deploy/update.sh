#!/usr/bin/env bash
# Updates an installed WeekFlow to the code in this folder, keeping all data and settings.
# Run from the project folder after `git pull`:  sudo bash deploy/update.sh
set -euo pipefail
APP_DIR=/opt/weekflow
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ "$(id -u)" -ne 0 ]; then echo "Run this with sudo: sudo bash deploy/update.sh"; exit 1; fi
echo "==> Backing up the database first"
sudo -u weekflow env $(grep -v '^#' /etc/weekflow.env | xargs) node --disable-warning=ExperimentalWarning "$APP_DIR/server/admin.js" backup || true
echo "==> Copying new code"
rm -rf "$APP_DIR/server" "$APP_DIR/web"
cp -r "$SRC_DIR/server" "$SRC_DIR/web" "$SRC_DIR/package.json" "$SRC_DIR/package-lock.json" "$APP_DIR/"
cd "$APP_DIR" && npm ci --omit=dev --no-audit --no-fund
cp "$SRC_DIR/deploy/"weekflow*.service "$SRC_DIR/deploy/weekflow-backup.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl restart weekflow.service
echo "==> Done. Logs: journalctl -u weekflow -f"

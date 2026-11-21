#!/usr/bin/env bash
# Perbarui aplikasi di VPS: jalankan sebagai user pemilik /opt/kantor3d (bukan root).
set -euo pipefail
cd /opt/kantor3d
git pull --ff-only
npm ci --no-audit --no-fund
npm run build
sudo systemctl restart mission-control
sudo systemctl --no-pager --lines=5 status mission-control

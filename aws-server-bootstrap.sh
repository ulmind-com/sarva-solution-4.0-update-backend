#!/usr/bin/env bash
# ==============================================================================
# Sarva Solutions - Fresh AWS EC2 Server Bootstrap
# ------------------------------------------------------------------------------
# Installs Docker + Compose plugin, nginx reverse proxy and certbot (Let's Encrypt)
# for api.sarvasolutionvision.com -> http://127.0.0.1:8000 (ssvpl-mlm-api container).
#
# Run as root on a fresh instance:
#   sudo bash aws-server-bootstrap.sh
#
# Supports Amazon Linux 2023 (dnf) and Ubuntu/Debian (apt).
# ==============================================================================

set -euo pipefail

DOMAIN="${DOMAIN:-api.sarvasolutionvision.com}"
EMAIL="${EMAIL:-ulmind.in@gmail.com}"
APP_DIR="${APP_DIR:-/opt/sarvasolution}"
UPSTREAM_PORT="${UPSTREAM_PORT:-8000}"

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
step() { echo -e "\n${BLUE}==> $*${NC}"; }
ok()   { echo -e "  ${GREEN}✔${NC} $*"; }
warn() { echo -e "  ${YELLOW}!${NC} $*"; }
die()  { echo -e "  ${RED}x${NC} $*"; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run this as root:  sudo bash aws-server-bootstrap.sh"

# ------------------------------------------------------------------ OS detect
if command -v dnf >/dev/null 2>&1; then
  PKG=dnf
elif command -v apt-get >/dev/null 2>&1; then
  PKG=apt
else
  die "Unsupported OS (need dnf or apt)."
fi
ARCH="$(uname -m)"
step "Detected package manager: $PKG   arch: $ARCH"
[ "$ARCH" = "x86_64" ] || warn "Arch is $ARCH — the Docker Hub image is amd64-only. Use a t3/t3a instance, not Graviton."

# --------------------------------------------------------------- base packages
step "[1/6] Installing base packages"
if [ "$PKG" = dnf ]; then
  dnf -y update
  dnf -y install git curl tar nginx python3 augeas-libs
else
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y git curl ca-certificates nginx
fi
ok "base packages installed"

# ---------------------------------------------------------------------- Docker
step "[2/6] Installing Docker + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  if [ "$PKG" = dnf ]; then
    dnf -y install docker
  else
    curl -fsSL https://get.docker.com | sh
  fi
fi
systemctl enable --now docker
ok "docker: $(docker --version)"

if ! docker compose version >/dev/null 2>&1; then
  case "$ARCH" in
    x86_64)  CMP_ARCH=x86_64 ;;
    aarch64) CMP_ARCH=aarch64 ;;
    *) die "Unknown arch $ARCH for compose plugin" ;;
  esac
  mkdir -p /usr/libexec/docker/cli-plugins
  curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${CMP_ARCH}" \
       -o /usr/libexec/docker/cli-plugins/docker-compose
  chmod +x /usr/libexec/docker/cli-plugins/docker-compose
fi
ok "compose: $(docker compose version --short)"

# add the login user to the docker group so `docker` works without sudo
for u in ec2-user ubuntu; do id "$u" >/dev/null 2>&1 && usermod -aG docker "$u" || true; done

# --------------------------------------------------------------- app directory
step "[3/6] Preparing app directory at $APP_DIR"
mkdir -p "$APP_DIR"
if [ ! -f "$APP_DIR/docker-compose.yml" ]; then
  if [ -f "$(dirname "$0")/docker-compose.yml" ]; then
    cp "$(dirname "$0")/docker-compose.yml" "$APP_DIR/"
    ok "copied docker-compose.yml"
  else
    warn "docker-compose.yml not found — copy it into $APP_DIR before starting the app"
  fi
fi
[ -f "$APP_DIR/.env" ] || warn "No .env in $APP_DIR yet — create it (MONGO_URI, JWT_SECRET, ...) before 'docker compose up'"

# ----------------------------------------------------------------------- nginx
step "[4/6] Writing nginx reverse-proxy config for $DOMAIN"
if [ -d /etc/nginx/conf.d ]; then NGX_CONF="/etc/nginx/conf.d/${DOMAIN}.conf"; else die "nginx conf.d missing"; fi

cat > "$NGX_CONF" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # KYC / avatar uploads pass through this proxy — 1m default is too small
    client_max_body_size 25m;

    location / {
        proxy_pass         http://127.0.0.1:${UPSTREAM_PORT};
        proxy_http_version 1.1;

        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade           \$http_upgrade;
        proxy_set_header Connection        "upgrade";

        proxy_connect_timeout 60s;
        proxy_send_timeout    300s;
        proxy_read_timeout    300s;
    }
}
NGINX

# SELinux (Amazon Linux) — allow nginx to talk to the container port
command -v setsebool >/dev/null 2>&1 && setsebool -P httpd_can_network_connect 1 2>/dev/null || true

nginx -t
systemctl enable --now nginx
systemctl reload nginx
ok "nginx serving $DOMAIN on port 80"

# --------------------------------------------------------------------- certbot
step "[5/6] Installing certbot"
if ! command -v certbot >/dev/null 2>&1; then
  if [ "$PKG" = dnf ]; then
    python3 -m venv /opt/certbot
    /opt/certbot/bin/pip install --upgrade pip
    /opt/certbot/bin/pip install certbot certbot-nginx
    ln -sf /opt/certbot/bin/certbot /usr/bin/certbot
  else
    DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
  fi
fi
ok "certbot: $(certbot --version 2>&1)"

step "[6/6] Requesting Let's Encrypt certificate for $DOMAIN"
echo "  (DNS A record for $DOMAIN must already point at this server, and port 80 must be open)"
if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect; then
  ok "HTTPS is live: https://$DOMAIN"
else
  warn "certbot failed. Fix DNS / security-group port 80, then re-run:"
  warn "  sudo certbot --nginx -d $DOMAIN --agree-tos -m $EMAIL --redirect"
fi

# Auto-renew. The apt certbot package ships its own systemd timer; the pip install
# does not. Amazon Linux 2023 has no cron installed at all (no /etc/cron.d), so use
# a systemd timer rather than a cron entry.
if ! systemctl list-timers --all 2>/dev/null | grep -q certbot; then
  cat > /etc/systemd/system/certbot-renew.service <<'UNIT'
[Unit]
Description=Certbot renewal

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew -q --deploy-hook "systemctl reload nginx"
UNIT
  cat > /etc/systemd/system/certbot-renew.timer <<'UNIT'
[Unit]
Description=Run certbot renew twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
UNIT
  systemctl daemon-reload
  systemctl enable --now certbot-renew.timer
  ok "auto-renew systemd timer installed (twice daily)"
else
  ok "certbot renew timer already active"
fi

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN} Server ready.${NC}"
echo -e "  App dir : $APP_DIR   (needs docker-compose.yml + .env)"
echo -e "  Start   : cd $APP_DIR && docker compose pull && docker compose up -d"
echo -e "  Health  : curl -s http://127.0.0.1:${UPSTREAM_PORT}/health"
echo -e "  Public  : curl -s https://${DOMAIN}/health"
echo -e "${GREEN}======================================================================${NC}"

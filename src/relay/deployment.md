# Deployment Options

The relay server is a single static binary with no runtime dependencies. The target is deployment in under 60 seconds on any platform.

## Docker

The fastest way to get a relay running:

```bash
docker run -d --name enseal-relay -p 4443:4443 enseal/relay
```

The Docker image is built with `--no-default-features --features server`, so it contains only the relay -- no CLI commands. The entrypoint is `enseal serve`.

Pass configuration through the command:

```bash
docker run -d --name enseal-relay -p 4443:4443 enseal/relay \
  --port 4443 \
  --max-mailboxes 500 \
  --channel-ttl 600 \
  --rate-limit 20
```

Set the log level with the `RUST_LOG` environment variable:

```bash
docker run -d --name enseal-relay -p 4443:4443 \
  -e RUST_LOG=info \
  enseal/relay
```

## Docker Compose

For production, put TLS termination in front of the relay. The relay itself speaks plain WebSocket; a reverse proxy handles TLS.

### With Caddy (automatic TLS)

```yaml
services:
  relay:
    image: enseal/relay
    restart: unless-stopped
    environment:
      - RUST_LOG=info
    command: ["--port", "4443", "--max-mailboxes", "100", "--channel-ttl", "300"]

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - relay

volumes:
  caddy_data:
```

With a `Caddyfile`:

```
relay.example.com {
    reverse_proxy relay:4443
}
```

Caddy automatically obtains and renews Let's Encrypt certificates for the domain. Clients connect with:

```bash
enseal share .env --relay wss://relay.example.com
```

### With nginx

```yaml
services:
  relay:
    image: enseal/relay
    restart: unless-stopped
    environment:
      - RUST_LOG=info
    command: ["--port", "4443", "--max-mailboxes", "100", "--channel-ttl", "300"]

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - relay
```

With an `nginx.conf`:

```nginx
server {
    listen 443 ssl;
    server_name relay.example.com;

    ssl_certificate     /etc/letsencrypt/live/relay.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/relay.example.com/privkey.pem;

    location / {
        proxy_pass http://relay:4443;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }
}
```

The `proxy_read_timeout` must be at least as long as the channel TTL to prevent nginx from closing idle WebSocket connections before the relay does.

## Static binary

Run the relay directly without containers:

```bash
enseal serve --port 4443
```

This works anywhere the enseal binary runs. Download a release binary or build from source:

```bash
cargo build --release --no-default-features --features server
```

The resulting binary is in `target/release/enseal`.

## systemd

For Linux servers, a systemd unit file is provided at `deploy/enseal-relay.service`:

```ini
[Unit]
Description=enseal relay server
After=network.target

[Service]
Type=simple
User=enseal
Group=enseal
ExecStart=/usr/local/bin/enseal serve --port 4443 --bind 0.0.0.0
Restart=on-failure
RestartSec=5
LimitNOFILE=65535

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
```

Install and start:

```bash
# Create a dedicated user
sudo useradd --system --no-create-home enseal

# Copy the binary
sudo cp target/release/enseal /usr/local/bin/enseal

# Install the unit file
sudo cp deploy/enseal-relay.service /etc/systemd/system/

# Start the service
sudo systemctl daemon-reload
sudo systemctl enable --now enseal-relay

# Check status
sudo systemctl status enseal-relay
```

## Kubernetes

A Helm chart is provided at `deploy/helm/`. Install with:

```bash
helm install enseal-relay ./deploy/helm/
```

Override values as needed:

```bash
helm install enseal-relay ./deploy/helm/ \
  --set relay.port=4443 \
  --set relay.maxMailboxes=500 \
  --set relay.channelTtl=600 \
  --set replicaCount=2
```

The default resource limits are conservative (100m CPU request, 200m limit, 64Mi memory request, 128Mi limit). The relay is lightweight -- a single replica handles many concurrent channels. Scale horizontally only if you expect very high connection counts.

Expose the service through an Ingress with TLS termination, or use a LoadBalancer service type with your cloud provider's TLS integration.

## Production checklist

Before exposing the relay to your team:

**TLS termination** -- The relay speaks plain WebSocket. Place a reverse proxy (Caddy, nginx, cloud load balancer) in front to terminate TLS. Clients connect with `wss://` URLs.

**Firewall rules** -- Open only the relay port (default 4443 or 443 behind a proxy). The relay does not need outbound internet access.

**Monitoring** -- Poll the `/health` endpoint from your monitoring system. A `200` response with `"status": "ok"` confirms the relay is running. Example with curl:

```bash
curl -s https://relay.example.com/health | jq .
```

```json
{
  "status": "ok",
  "service": "enseal-relay",
  "version": "0.10.0"
}
```

**Logging** -- Set `RUST_LOG` to control verbosity. Recommended levels:

| Level | Use case |
|-------|----------|
| `error` | Production, minimal output |
| `info` | Production, connection events visible |
| `debug` | Troubleshooting, includes channel lifecycle details |

```bash
# systemd: add to the unit file
Environment=RUST_LOG=info

# Docker: pass as environment variable
docker run -e RUST_LOG=info enseal/relay
```

**Rate limiting** -- The built-in rate limiter (default 10 connections/min per IP) provides basic protection. For internet-facing deployments, consider adding rate limiting at the reverse proxy layer as well.

**Resource limits** -- The relay holds channel state in memory only. Each active channel uses a small amount of memory for two message buffers. The default max of 100 concurrent channels is suitable for most teams. Increase `--max-mailboxes` if you have a large team with many simultaneous transfers.

**Backups** -- Not needed. The relay is stateless. All in-memory state is ephemeral and disposable. Restarting the relay clears all active channels -- clients will need to retry their transfers.

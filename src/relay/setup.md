# Running a Relay

`enseal serve` starts a self-hosted relay server that sender and receiver connect through. The relay is a stateless matchmaker -- it pairs two clients on a shared channel and pipes encrypted bytes between them. It never sees plaintext.

The server feature is included in the default build. If you compiled with `--no-default-features`, re-enable it with `--features server`.

## Architecture

The relay has two components:

**Mailbox** -- a WebSocket endpoint at `/channel/<code>`. The first client connects and waits. When a second client connects to the same code, the relay pairs them and begins forwarding messages in both directions. Messages are held only in memory while a client waits for its pair.

**Transit relay** -- once paired, the relay is a dumb byte pipe. It forwards WebSocket frames between the two clients without inspecting or storing content. When either side disconnects, the channel is torn down.

Because enseal uses end-to-end encryption, the relay sees only ciphertext. A compromised relay cannot expose secrets.

## Starting the server

```bash
enseal serve
```

By default this listens on `0.0.0.0:4443`. The server prints its configuration on startup:

```
ok: enseal relay listening on 0.0.0.0:4443
  max channels:  100
  channel TTL:   300s
  max payload:   1048576 bytes
  rate limit:    10/min per IP
```

## Configuration flags

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `4443` | Listen port |
| `--bind` | `0.0.0.0` | Bind address |
| `--max-mailboxes` | `100` | Maximum concurrent channels |
| `--channel-ttl` | `300` | Seconds before an idle channel expires |
| `--max-payload` | `1048576` | Maximum WebSocket message size in bytes (1 MB) |
| `--rate-limit` | `10` | Maximum new connections per minute per IP address |

Example with custom settings:

```bash
enseal serve --port 8443 --max-mailboxes 500 --channel-ttl 600
```

## Health endpoint

The server exposes `GET /health` which returns JSON:

```json
{
  "status": "ok",
  "service": "enseal-relay",
  "version": "0.10.0"
}
```

Use this for load balancer health checks and monitoring. From the command line, you can also check reachability with:

```bash
enseal serve --health
```

This attempts a TCP connection to the configured address and port and reports whether the relay is reachable.

## Connecting clients to the relay

Clients point to the relay with the `--relay` flag or the `ENSEAL_RELAY` environment variable.

### Per-command flag

```bash
# sender
enseal share .env --relay wss://relay.internal:4443

# receiver
enseal receive 7-guitarist-revenge --relay wss://relay.internal:4443
```

Both sides must use the same relay URL.

### Environment variable

```bash
export ENSEAL_RELAY=wss://relay.internal:4443

enseal share .env
enseal receive 7-guitarist-revenge
```

### Project configuration

Set the relay in `.enseal.toml` so every team member uses the same server without remembering the URL:

```toml
[defaults]
relay = "wss://relay.internal:4443"
```

When a relay is configured in `.enseal.toml`, all `share` and `receive` commands in that project directory use it automatically. The `--relay` flag and `ENSEAL_RELAY` variable override the config file.

## Precedence order

If multiple relay sources are set, enseal resolves them in this order (highest priority first):

1. `--relay` command-line flag
2. `ENSEAL_RELAY` environment variable
3. `relay` field in `.enseal.toml`
4. Public relay (default, when nothing else is configured)

## Security considerations

The relay is designed to be safe to expose on a network:

- **End-to-end encryption** -- the relay forwards ciphertext. Even if the relay host is compromised, no secrets are exposed.
- **Rate limiting** -- per-IP connection throttling prevents abuse. The default is 10 new connections per minute per IP.
- **Channel expiry** -- idle channels are cleaned up after the configured TTL (default 5 minutes), preventing resource exhaustion.
- **Payload size limits** -- oversized messages are rejected to prevent memory abuse.
- **No persistence** -- the relay stores nothing to disk. All state is in-memory and lost on restart.

For production deployments, place TLS termination in front of the relay. See [Deployment Options](deployment.md) for details.

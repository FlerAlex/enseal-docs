# Async Upload (burnurl.dev)

The `--upload` flag gives you an asynchronous delivery path: encrypt locally, post to
[burnurl.dev](https://burnurl.dev), and share the resulting self-destruct URL. The
recipient opens it in any browser — no enseal install required.

This is useful for:

- Onboarding a new teammate who hasn't installed enseal yet
- Async handoffs when you don't know when the recipient will be available
- Sharing with anyone outside your team

## Requirements

API access requires a **Pro or Team plan** on burnurl.dev. Set your API key via the
`BURNURL_API_KEY` environment variable:

```bash
export BURNURL_API_KEY=your_key
enseal share .env --upload
```

Or inline for one-off use:

```bash
BURNURL_API_KEY=your_key enseal share .env --upload
```

## Basic usage

```bash
$ enseal share .env --upload
  Secrets:        14 variables
  Uploading to burnurl.dev...
  Secret URL:     https://burnurl.dev/s/a3f9c2e1d4b7f0e3
  Expires:        2026-03-08 19:42:00 UTC (24h)
  Reads:          1 (self-destructs on first open)

  Send this URL to your recipient. It cannot be read twice.
```

Send the URL through any channel. When the recipient opens it, burnurl.dev displays the
content and permanently destroys it. Opening the URL a second time returns a 404.

## TTL

Use `--ttl` to set the expiry in hours (default: 24):

```bash
enseal share .env --upload --ttl 4        # expires in 4 hours
enseal share .env --upload --ttl 1        # expires in 1 hour
```

## Client-side passphrase encryption

By default, the payload is sent to burnurl.dev as the enseal envelope JSON (burnurl
encrypts it at rest server-side with AES-256-GCM). If you want the server to see only
opaque ciphertext, add `--passphrase`:

```bash
$ enseal share .env --upload --passphrase
  Passphrase: ████████
  Confirm passphrase: ████████
  Encrypting with passphrase (client-side)...
  Uploading to burnurl.dev...
  Secret URL:     https://burnurl.dev/s/7e2a1f9c...
  Expires:        2026-03-08 19:42:00 UTC (24h)
  Reads:          1 (self-destructs on first open)
  Passphrase:     share separately (server never sees it)

  Send this URL to your recipient. It cannot be read twice.
```

The payload is encrypted with age (scrypt key derivation) before upload. The passphrase
is never transmitted. Share it with the recipient through a separate channel — they will
need it to read the content on burnurl.dev.

## How it works

1. enseal serializes the payload to an `Envelope` (JSON with SHA-256 integrity check)
2. If `--passphrase` is set, the envelope is age-encrypted client-side with a scrypt
   passphrase recipient — the passphrase is never transmitted
3. The payload is POSTed to `burnurl.dev/api/secret` over HTTPS (base64-encoded when
   passphrase-encrypted, plain JSON otherwise)
4. burnurl.dev adds server-side AES-256-GCM encryption at rest and returns a single-use URL
5. The URL is valid for the configured TTL; first open destroys the content

## Comparison with other modes

| Mode | Both online | Recipient needs CLI | TTL |
|------|-------------|---------------------|-----|
| Wormhole (default) | Yes | Yes | Session |
| Relay (`--relay`) | Yes | Yes | Session |
| Upload (`--upload`) | Sender only | No | Up to 24h |
| File drop (`--output`) | No | Yes | Until deleted |

## Plan limits

| Limit | Standard | Pro / Team |
|-------|----------|------------|
| API access | No | Yes |
| Payload max | — | 10 KB (standard) / 100 KB (Pro/Team) |
| Max TTL | — | 24h (standard) / 30 days (Pro/Team) |

## Size limit

enseal checks the payload size before uploading and returns an error if it exceeds the
plan limit:

```
error: payload too large (10KB max on standard plans)
```

If your `.env` file is large, use `--include` or `--exclude` to filter variables before
sharing.

## Error handling

| Condition | Message |
|-----------|---------|
| No API key / invalid key (401) | `authentication failed — check BURNURL_API_KEY` |
| Rate limited (429) | `rate limited by burnurl.dev — try again in a few minutes` |
| Payload too large (413) | `payload too large (10KB max on standard plans)` |
| Server unavailable (5xx) | `burnurl.dev unavailable — fall back to: enseal share` |
| Timeout | `upload timed out — check connection or use relay instead` |

## Self-hosted burnurl

Override the base URL with `BURNURL_URL`:

```bash
BURNURL_URL=https://burnurl.internal enseal share .env --upload
```

## Scripting

In `--quiet` mode, only the URL is printed to stdout:

```bash
URL=$(BURNURL_API_KEY=your_key enseal share .env --upload --quiet)
echo "Share this: $URL"
```

## Incompatible flags

`--upload` cannot be combined with:

- `--to` (identity mode is not supported for upload)
- `--output` (file drop is a separate mode)
- `--relay` (relay and upload are mutually exclusive transports)

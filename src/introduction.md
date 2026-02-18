# enseal

Secure, ephemeral secret sharing for developers.

Stop pasting secrets into Slack. `enseal` makes the secure path faster than the insecure one -- share `.env` files and secrets through encrypted, single-use channels with one command and zero setup.

```bash
# sender
$ enseal share .env
  Share code:  7-guitarist-revenge
  Secrets:     14 variables (staging)
  Expires:     5 minutes or first receive

# recipient
$ enseal receive 7-guitarist-revenge
ok: 14 secrets written to .env
```

<div id="search"></div>

## Why enseal?

The most common way developers share secrets today is pasting them into Slack, email, or a text message. This is fast but leaves secrets permanently in chat history, email archives, and notification logs.

enseal eliminates that anti-pattern by making the secure path *faster* than the insecure one:

- **One command to send, one command to receive** -- no accounts, no setup, no browser
- **Ephemeral by design** -- channels are single-use and time-limited
- **End-to-end encrypted** -- the relay never sees plaintext
- **`.env` aware** -- parses, validates, filters, diffs, redacts, and encrypts `.env` files natively

## The relay never sees your secrets

enseal is end-to-end encrypted. The public relay server at `relay.enseal.dev` -- and any self-hosted relay -- is a stateless matchmaker that pairs sender and receiver over WebSocket. It never caches, stores, or logs the content of transfers.

Here is why this is true by design, not by policy:

1. **Encryption happens before the relay is contacted.** The sender encrypts the payload locally using `age` before any network connection is made. The relay receives only ciphertext -- an opaque blob it cannot decrypt because it never has the key.
2. **No persistence layer.** The relay has no database, no filesystem writes, no message queue. It holds paired WebSocket connections in memory and pipes bytes between them. When either side disconnects, the in-memory channel is dropped. There is nothing to retain.
3. **Channels are single-use and time-limited.** Each channel accepts exactly one transfer and expires after 5 minutes of inactivity. After the transfer completes or the timeout fires, the channel is removed from memory. There is no replay, no retrieval, no history.
4. **The relay is open source.** The server implementation is in `src/server/` -- a single Rust module with no external state. Anyone can audit it or run their own with `enseal serve`.

A compromised or malicious relay operator cannot read your secrets. They could refuse to relay traffic, but they cannot decrypt it.

## Two Sharing Modes

**Anonymous mode** (default) -- wormhole-based, zero setup. A human-readable code is all you need.

```bash
enseal share .env                         # generates code
enseal receive 7-guitarist-revenge        # uses code
```

**Identity mode** -- public-key encryption for known teammates. Encrypt to a name, no codes needed.

```bash
enseal keys init                          # one-time setup
enseal share .env --to sarah              # encrypt to sarah's public key
```

## Complete .env Toolkit

Beyond sharing, enseal is a complete `.env` security toolkit:

```bash
enseal check                    # verify .env has all vars from .env.example
enseal diff .env .env.staging   # compare two .env files (keys only)
enseal redact .env              # strip values for safe sharing
enseal validate .env            # check against schema rules
enseal template .env            # generate .env.example with type hints
enseal encrypt .env             # encrypt for safe git storage
```

## What's Next

- [Installation](./getting-started/installation.md) -- get enseal running in under a minute
- [Quick Start](./getting-started/quick-start.md) -- share your first secret

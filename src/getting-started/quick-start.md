# Quick Start

This guide walks through the most common enseal workflows. All examples assume enseal is installed and available on your `PATH` (see [Installation](installation.md)).

## Sharing a .env file (anonymous mode)

Anonymous mode is the fastest way to share secrets. No keys, no accounts, no setup. The sender generates a wormhole code that the recipient enters to receive the file.

**Both terminals must be open at the same time.** The transfer is live -- the sender waits until the recipient connects.

On the sender's machine:

```bash
enseal share .env
```

Output:

```
ok: wormhole code: 7-guitarist-revenge
ok: waiting for receiver...
```

On the recipient's machine:

```bash
enseal receive 7-guitarist-revenge
```

Output:

```
ok: 14 secrets written to .env
```

The sender and recipient authenticate each other through the wormhole code using SPAKE2. No one else can intercept the transfer, even on a public network.

## Sharing a single secret

You do not need a `.env` file to use enseal. Pipe any value through stdin:

```bash
echo "my-api-token" | enseal share --label "API key"
```

The `--label` flag attaches a human-readable description so the recipient knows what they are receiving. On the other end:

```bash
enseal receive 4-orbital-hammock
```

Output:

```
my-api-token
```

Raw string payloads print directly to stdout, so they work naturally with pipes and redirection:

```bash
enseal receive 4-orbital-hammock | pbcopy
```

## Wrapping a secret as a KEY=VALUE pair

Use `--as` to wrap a raw value into `.env`-compatible `KEY=VALUE` format:

```bash
echo "sk_live_abc123" | enseal share --as STRIPE_KEY
```

The recipient gets:

```bash
enseal receive 9-pluto-carnival
```

Output:

```
STRIPE_KEY=sk_live_abc123
```

This output can be appended directly to an existing `.env` file:

```bash
enseal receive 9-pluto-carnival >> .env
```

## Identity mode

Identity mode encrypts to a specific recipient's public key and signs with the sender's key. No wormhole code is needed -- the recipient's identity replaces the code. This is best for teams where members share public keys once and then transfer secrets without any per-transfer coordination.

### One-time setup

Each team member generates a keypair:

```bash
enseal keys init
```

Export your public key and share it with your teammates:

```bash
enseal keys export > my-key.pub
```

Import a teammate's public key:

```bash
enseal keys import teammate-key.pub
```

You will be prompted to verify the key fingerprint before trusting it:

```
  Identity:     sarah@company.com
  Fingerprint:  SHA256:a1b2c3d4e5f6...
  Trust this key? (y/N): y
ok: imported sarah@company.com
```

Optionally, set up an alias for convenience:

```bash
enseal keys alias sarah sarah@company.com
```

### Sending with identity mode

Once keys are exchanged, share directly to a recipient by name or alias:

```bash
enseal share .env --to sarah
```

The payload is encrypted to Sarah's public key and signed with your key. Sarah receives it without needing a wormhole code:

```bash
enseal receive
```

The sender's identity and signature are verified automatically before the payload is decrypted.

## Next steps

- [Anonymous Mode](../sharing/anonymous.md) -- wormhole-based sharing in detail
- [Identity Mode](../sharing/identity.md) -- public-key encryption, relay push, and file drop
- [Inject into Process](../sharing/inject.md) -- receive secrets directly into a child process without writing to disk
- [Check](../toolkit/check.md) -- verify your .env has all required variables
- [Self-Hosted Relay](../relay/setup.md) -- deploy your own relay server

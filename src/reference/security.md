# Security Model

This document describes what enseal protects against, what it does not, and how its cryptographic primitives work together.

---

## What enseal Protects Against

### Secrets in Transit

All transfers are encrypted end-to-end. In anonymous mode, the sender and recipient establish a shared key via the SPAKE2 protocol (part of magic-wormhole). In identity mode, the payload is encrypted with the recipient's age public key. In both modes, the relay server or any network intermediary sees only ciphertext.

### Secrets in Chat History

Unlike pasting secrets into Slack, email, or other messaging tools, enseal transfers are ephemeral. Wormhole codes are single-use and time-limited. There is no persistent record of the transfer on any server. Once the transfer completes, the channel is destroyed. No secret values remain in any chat log, search index, or message archive.

### Man-in-the-Middle Attacks

In anonymous mode, the SPAKE2 password-authenticated key exchange provides mutual authentication. Both parties derive the same session key from the wormhole code. An attacker who does not know the code cannot derive the key, even if they control the relay.

In identity mode, the sender encrypts to the recipient's known public key and signs the ciphertext with their own ed25519 key. The recipient verifies the signature against the sender's trusted public key before decrypting. An attacker cannot forge a valid signature without the sender's private key.

### Malicious Relay Server

The relay server (whether public or self-hosted) is designed to be untrusted. It functions as a dumb byte pipe that matches channels and forwards ciphertext. It never has access to plaintext, session keys, or the wormhole code. A compromised relay cannot read, modify, or selectively drop parts of a transfer without detection.

### Sender Impersonation (Identity Mode)

In identity mode, every transfer includes an ed25519 signature over the ciphertext. The recipient verifies this signature against the sender's public key from their trusted key store. If the signature does not verify, the transfer is rejected. This prevents an attacker from sending payloads that appear to come from a trusted teammate.

### Secrets on Disk

The `enseal inject` command receives secrets and passes them directly as environment variables to a child process. No temporary file is written. When the child process exits, the secrets exist only in the process environment block, which is cleaned up by the operating system. This eliminates the risk of `.env` files lingering on disk, in backups, or in filesystem snapshots.

### Secrets in Git

The `enseal encrypt` command provides age-based encryption for `.env` files intended for version control. Whole-file encryption produces an opaque blob. Per-variable encryption (`--per-var`) keeps key names visible for diffing while encrypting each value individually. In either mode, plaintext secret values are never committed to the repository.

---

## What enseal Does NOT Protect Against

### Compromised Endpoints

If a developer's machine is compromised (malware, remote access, root-level attacker), no application-level encryption can help. The attacker can read secrets from process memory, intercept keystrokes, or access decrypted files. enseal's threat model assumes both endpoints are trusted.

### Key Distribution

enseal uses a trust-on-first-use model for identity mode. There is no certificate authority, no keyserver, and no web of trust. When you run `enseal keys import`, you are trusting that the public key file came from the person you think it came from. enseal displays the fingerprint during import to encourage out-of-band verification (e.g., comparing fingerprints over a phone call or in person), but it cannot enforce this.

If an attacker substitutes their own public key during the initial key exchange, they can intercept future identity mode transfers. Protect the key distribution channel.

### Relay Channel Front-Running (Identity Mode)

In identity mode, relay push channels are deterministic: the channel ID is derived from `SHA256(sender_pubkey || recipient_pubkey)`. Anyone who has imported the same public keys can compute the channel ID and attempt to connect.

This does not expose secret content -- E2E encryption ensures only the intended recipient can decrypt the payload, and ed25519 signatures ensure only the real sender can produce a valid transfer. However, a third party who knows both public keys could observe that a channel exists or attempt to deliver a payload to the channel (which the recipient would reject due to signature verification failure).

For situations where channel unpredictability is important, use anonymous wormhole mode. Wormhole codes are randomly generated and single-use, making channel IDs unpredictable.

---

## Cryptographic Primitives

| Primitive | Library | Purpose |
|-----------|---------|---------|
| age | `age` crate | Payload encryption (both modes), at-rest encryption (`encrypt`/`decrypt`). X25519 key agreement with ChaCha20-Poly1305 for authenticated encryption. |
| ed25519 | `ed25519-dalek` crate | Digital signatures for identity mode. The sender signs the ciphertext, the recipient verifies before decrypting. |
| SPAKE2 | `magic-wormhole` crate | Password-authenticated key exchange for anonymous mode. Derives a shared session key from the wormhole code without revealing it to the relay. |

age does not natively support signing. enseal uses ed25519-dalek as a separate signing layer. Each identity has two keypairs stored together: an age keypair for encryption and an ed25519 keypair for signing.

---

## Wormhole Code Entropy

Wormhole codes follow the format `NNNN-word-word`, where `NNNN` is a numeric channel ID and the words are drawn from the PGP wordlist.

With the default of 2 words:

- Numeric prefix: approximately 9000 possible values
- Each word: 48 possible values (from the PGP even/odd wordlists)
- Total entropy: approximately `log2(9000 * 48 * 48)` = ~24 bits

This is combined with three additional mitigations:

- **Single-use**: Each code can only be used once. After a successful transfer, the channel is destroyed.
- **Time-limited**: Channels expire after 5 minutes (configurable with `--timeout`).
- **Rate limiting**: The relay server limits connection attempts to prevent brute-force guessing.

Together, 24 bits of entropy with single-use, time-limited channels and rate limiting provides adequate protection for the intended threat model. For higher-security contexts, increase the word count with `--words 4` (approximately 46 bits) or `--words 5` (approximately 52 bits).

---

## Envelope Integrity

Every transfer envelope includes a `sha256` field containing the SHA-256 hash of the plaintext payload, computed before encryption. After decryption, the recipient recomputes the hash and compares it to the value in the envelope. If the hashes do not match, the transfer is rejected.

This provides integrity verification independent of the encryption layer, catching any corruption that might occur during transit or storage.

---

## Replay Protection

Transfer envelopes include a `created_at` timestamp set by the sender. On receive, enseal checks this timestamp and rejects envelopes older than 5 minutes. This prevents an attacker from capturing and replaying a valid encrypted transfer at a later time.

The combination of timestamp checking and single-use wormhole channels (in anonymous mode) or signature verification (in identity mode) provides defense-in-depth against replay attacks.

---

## Private Key Storage

Private keys are stored at `~/.config/enseal/keys/` with restrictive file permissions:

| File | Permissions | Contents |
|------|-------------|----------|
| `self.age.key` | `0600` | age private key (encryption) |
| `self.sign.key` | `0600` | ed25519 private key (signing) |
| `self.age.pub` | `0644` | age public key |
| `self.sign.pub` | `0644` | ed25519 public key |

`enseal keys init` sets `0600` permissions on private key files at creation time. enseal checks permissions on startup and warns if private key files are more permissive than `0600`.

---

## Shell History Warning

The `--secret` flag passes a secret value as a command-line argument, which means it appears in shell history (`~/.bash_history`, `~/.zsh_history`), process listings (`ps`), and potentially system audit logs.

Every use of `--secret` emits a warning to stderr:

```
warning: --secret puts the value in shell history. Consider piping instead: echo "..." | enseal share
```

This warning is suppressed by `--quiet`. For sensitive values, piping is the recommended approach:

```bash
# Secret does not appear in shell history
pass show stripe/key | enseal share --label "Stripe"
echo -n "token" | enseal share

# Secret IS visible in shell history and ps output
enseal share --secret "sk_live_abc123"
```

---

## Summary Table

| Threat | Protected | Mechanism |
|--------|-----------|-----------|
| Network eavesdropping | Yes | E2E encryption (age / SPAKE2) |
| Secrets in chat history | Yes | Ephemeral single-use channels |
| Man-in-the-middle | Yes | SPAKE2 (anonymous), public key auth (identity) |
| Malicious relay | Yes | Relay sees only ciphertext |
| Sender impersonation | Yes | ed25519 signatures (identity mode) |
| Secrets on disk | Yes | `inject` mode (no file written) |
| Secrets in git | Yes | `encrypt` command (age encryption) |
| Compromised endpoint | No | Out of scope -- application-level encryption cannot help |
| Key distribution attack | No | Trust-on-first-use, no PKI |
| Channel front-running | Partial | E2E encryption protects content; use wormhole mode for unpredictable channels |

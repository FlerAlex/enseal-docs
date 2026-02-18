# Identity Mode (Public Key)

Identity mode encrypts secrets to a specific recipient's public key and signs
them with the sender's key. No wormhole code is needed once keys are exchanged.
This mode is best for teams with established key trust and repeated sharing
between known parties.

Identity mode is triggered by the `--to` flag.

## Setup

Each user generates a keypair once:

```bash
$ enseal keys init
ok: keypair generated
  age public key:     age1qyqszqgpqyqszqgpqyqszqgp...
  ed25519 public key: ed25519:b64encodedpubkey...
  fingerprint:        SHA256:a1b2c3d4e5f6...
  stored in:          ~/.config/enseal/keys/
```

This creates two keypairs stored in `~/.config/enseal/keys/`:

- An **age keypair** for encryption and decryption.
- An **ed25519 keypair** for signing and signature verification.

Export your public key to share with teammates:

```bash
$ enseal keys export > myname.pub
```

Import a teammate's public key:

```bash
$ enseal keys import alex.pub
  Identity:     alex@company.com
  Fingerprint:  SHA256:a1b2c3d4e5f6...
  Trust this key? (y/N): y
ok: imported alex@company.com
```

Verify fingerprints out of band (over a call, in person) before trusting a key.
Skip the prompt with `--yes` for scripted workflows.

## Crypto Flow

When you share with `--to`, enseal performs the following steps:

1. Loads the recipient's age public key from the local trust store.
2. Loads the sender's ed25519 signing key.
3. Encrypts the payload with age to the recipient's public key.
4. Signs the ciphertext with the sender's ed25519 key.
5. Bundles the ciphertext, signature, and sender public key into an envelope.

On the receiving side:

1. The recipient verifies the sender's public key is in their trust store.
2. The signature over the ciphertext is verified.
3. The ciphertext is decrypted with the recipient's age private key.

This provides both confidentiality (only the recipient can decrypt) and
authenticity (the recipient can verify who sent it).

## Transport Options

Identity mode supports three transport mechanisms. The choice depends on your
flags.

### Wormhole (Default)

With just `--to` and no other transport flags, enseal uses a wormhole channel
like anonymous mode, but the payload is additionally signed by the sender:

```bash
# Sender
$ enseal share .env --to alex@company.com
ok: encrypted to alex@company.com, signed by you
code: 3-anvil-bookshelf
waiting for recipient...

# Recipient
$ enseal receive 3-anvil-bookshelf
ok: sender verified (alex@company.com, SHA256:a1b2c3d4...)
ok: 14 secrets written to .env
```

The wormhole code provides the rendezvous mechanism. The signature provides
sender authentication on top of the SPAKE2 channel.

### Relay Push

When combined with `--relay`, enseal pushes the encrypted payload to a
deterministic channel on the relay server. No code exchange is needed -- the
recipient pulls from the same channel:

```bash
# Sender
$ enseal share .env --to alex@company.com --relay wss://relay.internal:4443
ok: encrypted to alex@company.com, signed by you
ok: pushed to relay

# Recipient
$ enseal receive --relay wss://relay.internal:4443
ok: sender verified (alex@company.com, SHA256:a1b2c3d4...)
ok: 14 secrets written to .env
```

This is useful for automated workflows and CI/CD pipelines where exchanging a
code is impractical.

### File Drop

With `--output`, enseal writes an encrypted file instead of using the network.
See [File Drop](filedrop.md) for full details.

```bash
$ enseal share .env --to alex@company.com --output ./drop/
ok: encrypted to alex@company.com, signed by you
ok: written to ./drop/alex@company.com.env.age
```

## Aliases

Typing full identities is tedious. Aliases map short names to identities:

```bash
$ enseal keys alias sarah sarah@company.com
ok: alias sarah -> sarah@company.com

$ enseal share .env --to sarah
ok: encrypted to sarah@company.com, signed by you
code: 5-hammer-dolphin
waiting for recipient...
```

List aliases:

```bash
$ enseal keys list
  sarah  -> sarah@company.com
  alex   -> alex@company.com
  mike   -> mike.chen@company.com
```

## Groups

Groups let you share secrets with multiple recipients at once. Each group member
receives their own encrypted copy (age multi-recipient encryption):

```bash
# Create a group
$ enseal keys group create backend-team

# Add members
$ enseal keys group add backend-team sarah@company.com
$ enseal keys group add backend-team alex@company.com
$ enseal keys group add backend-team mike.chen@company.com

# Share to the entire group
$ enseal share .env --to backend-team
ok: encrypted to 3 recipients (backend-team), signed by you
code: 1-orbit-cascade
waiting for recipient...
```

Any member of the group can receive the payload. List group members:

```bash
$ enseal keys group list backend-team
  backend-team:
    sarah@company.com
    alex@company.com
    mike.chen@company.com
```

## Recipient Resolution

When you use `--to <name>`, enseal resolves the recipient in this order:

1. **Alias** -- checks `~/.config/enseal/aliases.toml` for a matching nickname.
2. **Group** -- checks `~/.config/enseal/groups.toml` for a matching group name.
3. **Identity** -- uses the value directly as an identity string.

If none match, enseal exits with an error suggesting how to import the key or
create an alias.

## Security Properties

- **Sender authentication.** The recipient verifies the sender's ed25519
  signature. Impersonation requires the sender's private signing key.
- **Recipient confidentiality.** Only the intended recipient (or group members)
  can decrypt the payload.
- **Relay sees only ciphertext.** The relay server cannot read the payload
  regardless of transport.
- **No code required (relay push and file drop).** Key-based authentication
  replaces the wormhole code, removing the need for out-of-band code exchange
  after initial key setup.
- **Trust-on-first-use model.** enseal trusts keys you explicitly import. There
  is no certificate authority or key server. Verify fingerprints out of band.

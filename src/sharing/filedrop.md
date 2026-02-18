# File Drop

File drop produces an encrypted `.env.age` file instead of transferring secrets
over the network. This is identity mode only -- it requires both `--to` and
`--output`. The resulting file can be transferred by any means you choose: scp,
USB drive, email attachment, shared network drive, or any other method.

File drop is ideal for air-gapped environments, offline transfers, or situations
where both parties cannot be online simultaneously.

## Creating a File Drop

Specify a recipient with `--to` and an output directory with `--output`:

```bash
$ enseal share .env --to alex@company.com --output ./drop/
ok: encrypted to alex@company.com, signed by you
ok: written to ./drop/alex@company.com.env.age
```

The output filename is derived from the recipient identity. The file contains a
signed envelope: the `.env` content encrypted with the recipient's age public
key and signed with the sender's ed25519 key.

You can also use aliases:

```bash
$ enseal share .env --to alex --output ./drop/
ok: encrypted to alex@company.com, signed by you
ok: written to ./drop/alex@company.com.env.age
```

And groups, which produce one file per member:

```bash
$ enseal share .env --to backend-team --output ./drop/
ok: encrypted to 3 recipients (backend-team), signed by you
ok: written to ./drop/sarah@company.com.env.age
ok: written to ./drop/alex@company.com.env.age
ok: written to ./drop/mike.chen@company.com.env.age
```

Each file is individually encrypted to that recipient's key. Only the intended
recipient can decrypt their file.

## Receiving a File Drop

The recipient uses `enseal receive` with the file path instead of a wormhole
code:

```bash
$ enseal receive ./drop/alex@company.com.env.age
ok: sender verified (sarah@company.com, SHA256:a1b2c3d4...)
ok: 14 secrets written to .env
```

enseal detects that the argument is a file path (not a wormhole code), decrypts
it with the recipient's age private key, verifies the sender's ed25519
signature, and writes the `.env` file.

Write to a specific output file:

```bash
$ enseal receive ./drop/alex@company.com.env.age --output staging.env
ok: sender verified (sarah@company.com, SHA256:a1b2c3d4...)
ok: 14 secrets written to staging.env
```

## Injecting from a File Drop

Use `enseal inject` to load secrets from an encrypted file directly into a
process without writing a plaintext `.env` to disk:

```bash
$ enseal inject ./staging.env.age -- python manage.py runserver
ok: sender verified (sarah@company.com)
ok: 14 secrets injected into process
[django output follows...]
```

This combines the offline transfer benefits of file drop with the zero-disk
security of inject mode.

## Envelope Contents

The `.env.age` file contains a structured envelope:

- **Ciphertext**: the `.env` payload encrypted with age to the recipient's
  public key.
- **Sender public key**: the sender's ed25519 public key, so the recipient can
  verify the signature.
- **Signature**: an ed25519 signature over the ciphertext, proving the sender
  created this file.
- **Metadata**: payload format, variable count, project name, timestamp, and
  content hash. No secret values appear in metadata.

On receive, enseal:

1. Extracts the sender's public key from the envelope.
2. Checks that the sender's key is in the local trust store. If the key is
   unknown, enseal displays the fingerprint and asks whether to proceed.
3. Verifies the ed25519 signature over the ciphertext. If the signature is
   invalid (file was tampered with), enseal rejects the file with a clear error.
4. Decrypts the ciphertext with the recipient's age private key.
5. Writes the plaintext `.env` content to the output file (or injects into a
   process).

## Filtering Before Encryption

All standard filtering flags work with file drop:

```bash
# Exclude public variables
$ enseal share .env --to alex --output ./drop/ --exclude "^NEXT_PUBLIC_"

# Send only database secrets
$ enseal share .env --to alex --output ./drop/ --include "^DB_|^DATABASE_"
```

## Use Cases

### Air-Gapped Environments

Transfer secrets to a machine with no network access:

```bash
# On the connected machine
$ enseal share .env --to deploy@secure.internal --output /mnt/usb/

# Physically move the USB drive

# On the air-gapped machine
$ enseal receive /mnt/usb/deploy@secure.internal.env.age
ok: 14 secrets written to .env
```

### Asynchronous Transfer

Sender and recipient do not need to be online at the same time. The sender
creates the file and leaves it in a shared location:

```bash
# Sender creates the drop
$ enseal share .env --to alex --output /shared/secrets/

# Hours later, recipient picks it up
$ enseal receive /shared/secrets/alex@company.com.env.age
```

### Archiving Encrypted Secrets

File drops can serve as encrypted backups. Encrypt to yourself for safe storage:

```bash
$ enseal share .env --to self --output ./backups/
ok: encrypted to you
ok: written to ./backups/self.env.age
```

Restore later:

```bash
$ enseal receive ./backups/self.env.age --output .env
```

## Security Properties

- **End-to-end encryption.** The file is encrypted with age. Only the intended
  recipient's private key can decrypt it.
- **Sender authentication.** The ed25519 signature proves who created the file.
  Tampering with the ciphertext invalidates the signature.
- **No network required.** The file can be transferred through any channel. The
  encryption and signature protect the contents regardless of the transport
  mechanism.
- **No relay involvement.** Unlike wormhole and relay push modes, file drop does
  not depend on any server infrastructure.
- **Tamper detection.** If the file is modified in transit (bit flip, truncation,
  intentional modification), signature verification fails and enseal rejects the
  file.

# Key Management

enseal's identity mode uses two keypairs per user: an age keypair for encryption and an ed25519 keypair for signing. This page covers key generation, storage, import/export, aliases, groups, and the trust model.

---

## Key Storage Location

All keys and configuration live under `~/.config/enseal/keys/`. This follows the XDG Base Directory specification on Linux and the equivalent standard path on macOS.

```
~/.config/enseal/
  keys/
    self.age.key            # age private key (encryption) -- permissions 0600
    self.age.pub            # age public key
    self.sign.key           # ed25519 private key (signing) -- permissions 0600
    self.sign.pub           # ed25519 public key
    trusted/
      alex@company.com.pub    # imported public key bundle
      sarah@company.com.pub   # imported public key bundle
  aliases.toml              # nickname -> identity mapping
  groups.toml               # named groups of identities
  config.toml               # optional global defaults
```

Private key files (`self.age.key`, `self.sign.key`) are created with `0600` permissions. enseal warns on startup if these files have more permissive access.

---

## Commands

### `enseal keys init`

Generate your keypair. This creates four files: an age keypair (for encryption/decryption) and an ed25519 keypair (for signing/verification).

```bash
$ enseal keys init
ok: keypair generated
  fingerprint: SHA256:a1b2c3d4e5f6...
  keys stored in: ~/.config/enseal/keys/
```

If keys already exist, the command exits with an error to prevent accidental overwriting. To regenerate, remove the existing keys first with `rm ~/.config/enseal/keys/self.*`.

---

### `enseal keys export`

Print your public key bundle to stdout. This is the file you share with teammates so they can encrypt secrets to you and verify your signatures.

```bash
$ enseal keys export
# enseal public key for this machine
# fingerprint: SHA256:a1b2c3d4e5f6...
age: age1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqs...
sign: ed25519:b64encodedpubkey...
```

Redirect to a file to share:

```bash
enseal keys export > alex.pub
```

The `--armor` flag produces base64-armored output suitable for pasting into messages.

---

### `enseal keys import <file>`

Import a colleague's public key. enseal reads the public key bundle, displays the identity and fingerprint, and prompts for confirmation before adding it to the trusted store.

```bash
$ enseal keys import alex.pub
  Identity:     alex@company.com
  Fingerprint:  SHA256:a1b2c3d4e5f6...
  Trust this key? (y/N): y
ok: imported alex@company.com
```

The confirmation prompt encourages you to verify the fingerprint out-of-band (e.g., comparing over a phone call, in person, or through a trusted channel) before trusting the key.

| Flag | Description |
|------|-------------|
| `--yes` | Skip the confirmation prompt. Useful for scripted or automated workflows. |

```bash
enseal keys import alex.pub --yes
```

The imported key is stored as `~/.config/enseal/keys/trusted/<identity>.pub`.

---

### `enseal keys list`

Display all trusted keys, their fingerprints, and any associated aliases.

```bash
$ enseal keys list
  Your key:
    Fingerprint: SHA256:a1b2c3d4e5f6...

  Trusted keys:
    alex@company.com    SHA256:f6e5d4c3b2a1...  (alias: alex)
    sarah@company.com   SHA256:1a2b3c4d5e6f...  (alias: sarah)
    mike@company.com    SHA256:6f5e4d3c2b1a...
```

---

### `enseal keys remove <identity>`

Remove a trusted key from the local store by identity name.

```bash
$ enseal keys remove alex@company.com
ok: removed alex@company.com
```

This deletes the public key file from `~/.config/enseal/keys/trusted/` and removes any associated aliases from `aliases.toml`. It does not affect groups -- remove the identity from groups separately if needed.

---

### `enseal keys fingerprint`

Display your own key fingerprint. Use this for out-of-band verification: read the fingerprint to a colleague over a phone call, or compare it in person after they import your public key.

```bash
$ enseal keys fingerprint
SHA256:a1b2c3d4e5f6...
```

---

### `enseal keys alias <name> <identity>`

Map a short nickname to a full identity string. Aliases can be used anywhere enseal expects an identity: `--to`, group membership, and so on.

```bash
$ enseal keys alias sarah sarah@company.com
ok: alias 'sarah' -> sarah@company.com

$ enseal share .env --to sarah
# equivalent to: enseal share .env --to sarah@company.com
```

Aliases are stored in `~/.config/enseal/aliases.toml`:

```toml
sarah = "sarah@company.com"
alex = "alex@company.com"
mike = "mike.chen@company.com"
```

---

### Groups

Groups let you encrypt a payload to multiple recipients at once. Any member of the group can decrypt the payload independently.

#### `enseal keys group create <name>`

Create a new named group.

```bash
$ enseal keys group create backend-team
ok: created group 'backend-team'
```

#### `enseal keys group add <group> <identity>`

Add an identity to an existing group.

```bash
$ enseal keys group add backend-team sarah@company.com
ok: added sarah@company.com to 'backend-team'

$ enseal keys group add backend-team alex@company.com
ok: added alex@company.com to 'backend-team'
```

#### `enseal keys group remove <group> <identity>`

Remove an identity from a group.

```bash
$ enseal keys group remove backend-team alex@company.com
ok: removed alex@company.com from 'backend-team'
```

#### `enseal keys group list [name]`

Without arguments, list all groups. With a group name, list its members.

```bash
$ enseal keys group list
  backend-team  (3 members)
  devops        (2 members)

$ enseal keys group list backend-team
  backend-team:
    sarah@company.com   (alias: sarah)
    alex@company.com    (alias: alex)
    mike@company.com
```

#### `enseal keys group delete <name>`

Delete a group entirely. Does not remove the member keys from the trusted store.

```bash
$ enseal keys group delete backend-team
ok: deleted group 'backend-team'
```

Groups are stored in `~/.config/enseal/groups.toml`:

```toml
[backend-team]
members = ["sarah@company.com", "alex@company.com", "mike@company.com"]

[devops]
members = ["alex@company.com", "deploy@company.com"]
```

Use a group name with `--to` to encrypt to all members:

```bash
enseal share .env --to backend-team
```

This creates a multi-recipient age encryption. Any member of the group can decrypt independently with their own private key.

---

## Public Key File Format

Public key files are plain text, human-readable, and suitable for pasting into a Slack message, committing to a shared repository, or attaching to an email.

```
# enseal public key for alex@company.com
# fingerprint: SHA256:a1b2c3d4e5f6...
age: age1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqs...
sign: ed25519:b64encodedpubkey...
```

The file contains:

- **Comment lines** (starting with `#`): identity name and fingerprint for human reference.
- **`age:` line**: the age X25519 public key used for encryption.
- **`sign:` line**: the ed25519 public key used for signature verification, base64-encoded.

The identity (email or name) appears in the filename and comment, but is not cryptographically bound to the key. Trust is based on how you obtained the file, not on any certificate chain.

---

## Trust Model

enseal uses a straightforward trust-on-first-use model with no central authority:

- There is no certificate authority, keyserver, or web of trust.
- You trust a key by explicitly importing it with `enseal keys import`.
- The import process shows the fingerprint to encourage out-of-band verification.
- Once imported, the key is trusted for all future identity mode operations.
- There is no automatic key discovery or key update mechanism.

**Recommended practices:**

- Verify fingerprints out-of-band before trusting a key. Compare the fingerprint shown during import with the one the key owner reads to you over a phone call, video call, or in person.
- For teams, consider committing public keys to a shared repository. Team members can import keys from the repo, and the git history provides an audit trail of key additions and removals.
- Periodically run `enseal keys list` to review which keys you trust.
- Remove keys for people who leave the team with `enseal keys remove`.

**What trust means in practice:**

When you run `enseal share .env --to alex`, enseal:

1. Looks up `alex` in aliases (resolves to `alex@company.com`).
2. Loads `alex@company.com.pub` from the trusted key store.
3. Encrypts the payload with the age public key from that file.
4. Signs the ciphertext with your ed25519 private key.

When Alex runs `enseal receive`:

1. The envelope includes your ed25519 public key.
2. Alex's enseal checks whether your public key is in their trusted store.
3. If trusted, it verifies your signature over the ciphertext.
4. If the signature is valid, it decrypts with Alex's age private key.
5. If your key is not trusted, enseal warns Alex and prompts before proceeding.

The security of this system depends entirely on the integrity of the initial key exchange. If an attacker substitutes their own public key during import, they can intercept future transfers. This is why out-of-band fingerprint verification matters.

# At-Rest Encryption

enseal can encrypt `.env` files for safe storage on disk or in version control. This uses the same `age` encryption library and keys used by identity mode, so there is no additional setup if you already have keys.

## Quick Start

Encrypt a file:

```bash
enseal encrypt .env
# ok: encrypted to .env.encrypted
```

Decrypt it back:

```bash
enseal decrypt .env.encrypted
# ok: decrypted to .env
```

The encrypted output is a standard `age`-formatted file. Any tool that understands the age format can decrypt it, given the correct key.

## Prerequisites

You need an enseal keypair. If you have not created one yet:

```bash
enseal keys init
# ok: keypair written to ~/.config/enseal/keys/
```

By default, `enseal encrypt` encrypts to your own key, meaning only you can decrypt. To encrypt for others, use the `--to` flag.

## Encrypting

### Basic usage

```bash
enseal encrypt .env
```

This reads `.env`, encrypts the entire file using your age public key, and writes the result to `.env.encrypted`. The original `.env` file is not modified.

### Custom output path

```bash
enseal encrypt .env --output secrets/production.env.age
```

### Multi-recipient encryption

Encrypt so that multiple people can decrypt, each using their own private key:

```bash
enseal encrypt .env --to sarah --to alex
# ok: encrypted to .env.encrypted (recipients: sarah, alex, self)
```

Each recipient listed with `--to` must have a public key imported in your keystore. Your own key is included automatically. Any single recipient can decrypt the file independently.

This is useful when a team shares a repository and multiple developers need access to the secrets.

## Decrypting

```bash
enseal decrypt .env.encrypted
# ok: decrypted to .env
```

enseal uses your private key from `~/.config/enseal/keys/` to decrypt. If the file was not encrypted to your key, decryption fails with a clear error.

### Custom output path

```bash
enseal decrypt .env.encrypted --output .env.local
```

## Git Workflow

The primary use case for at-rest encryption is committing secrets to version control without exposing plaintext values.

### Encrypt before committing

```bash
# Edit your .env as usual
vim .env

# Encrypt before commit
enseal encrypt .env

# Commit only the encrypted file
git add .env.encrypted
git commit -m "update staging secrets"

# Keep .env in .gitignore
echo ".env" >> .gitignore
```

### Decrypt after cloning

```bash
git clone git@github.com:team/project.git
cd project

enseal decrypt .env.encrypted
# ok: decrypted to .env
```

This only works if the file was encrypted to your key (or you were listed as a `--to` recipient).

### Recommended .gitignore

```gitignore
# Plaintext secrets -- never commit
.env
.env.local
.env.*.local

# Encrypted secrets -- safe to commit
!.env.encrypted
```

## File Format

The output of `enseal encrypt` is a standard age-encrypted file. It begins with the age header:

```
age-encryption.org/v1
-> X25519 <recipient-stanza>
---
<encrypted payload>
```

This means you can also decrypt with the `age` CLI directly if needed:

```bash
age --decrypt -i ~/.config/enseal/keys/self.age.key .env.encrypted > .env
```

However, using `enseal decrypt` is recommended because it handles output paths and validation automatically.

## Comparison With Per-Variable Encryption

At-rest whole-file encryption produces an opaque binary blob. You cannot see which variables are inside without decrypting. For a mode that keeps key names visible while encrypting only the values, see [Per-Variable Encryption](per-variable.md).

| Aspect | Whole-file | Per-variable |
|---|---|---|
| Output format | Opaque age blob | Valid `.env` with `ENC[...]` values |
| Git diff | Shows binary changed | Shows which keys changed |
| File size | Smaller | Larger (per-value overhead) |
| Code review | Not possible without decrypting | Key names visible |
| Tooling compatibility | Requires decryption first | Key-name parsing still works |

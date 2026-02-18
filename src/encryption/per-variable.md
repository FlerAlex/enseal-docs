# Per-Variable Encryption

Per-variable encryption keeps `.env` key names in plaintext while encrypting each value individually. The result is still valid `.env` syntax, which means key-name-based tooling continues to work and `git diff` shows exactly which variables changed.

## Quick Start

```bash
enseal encrypt .env --per-var
# ok: encrypted 12 variables in .env
```

This transforms:

```env
DATABASE_URL=postgres://admin:s3cret@db.internal:5432/myapp
API_KEY=sk_live_4eC39HqLyjWDarjtT1zdp7dc
STRIPE_WEBHOOK_SECRET=whsec_abc123def456
PORT=8080
DEBUG=false
```

Into:

```env
DATABASE_URL=ENC[age:YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSB...]
API_KEY=ENC[age:YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSBh...]
STRIPE_WEBHOOK_SECRET=ENC[age:b3JnL3YxCi0+IFgyNTUxOSBhYmNkZWYxMjM0NTY...]
PORT=ENC[age:cHRpb24ub3JnL3YxCi0+IFgyNTUxOSBmb29iYXI...]
DEBUG=ENC[age:ZW5jcnlwdGlvbi5vcmcvdjEKLT4gWDI1NTE5IGJheg...]
```

Key names are visible. Values are individually encrypted using age. Each `ENC[age:...]` token is a base64-encoded age ciphertext for that single value.

## Decrypting

```bash
enseal decrypt .env
# ok: decrypted 12 variables in .env
```

enseal auto-detects whether a file uses per-variable encryption (by the presence of `ENC[age:...]` tokens) or whole-file encryption (by the age file header). You do not need to specify a flag -- `enseal decrypt` handles both formats.

## Benefits Over Whole-File Encryption

### Meaningful git diffs

When a whole-file encrypted `.env` changes, `git diff` shows an opaque binary blob changed. With per-variable encryption, diffs show exactly which keys were modified:

```diff
 DATABASE_URL=ENC[age:YWdlLWVuY3J5cHRpb24ub3JnL3Yx...]
-API_KEY=ENC[age:YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+...]
+API_KEY=ENC[age:bmV3a2V5dmFsdWVoZXJlMTIzNDU2Nzg5...]
 STRIPE_WEBHOOK_SECRET=ENC[age:b3JnL3YxCi0+IFgyNTUx...]
 PORT=ENC[age:cHRpb24ub3JnL3YxCi0+IFgyNTUx...]
 DEBUG=ENC[age:ZW5jcnlwdGlvbi5vcmcvdjEKLT4g...]
```

A reviewer can see that `API_KEY` was rotated without needing to decrypt anything.

### Code review

Pull requests that change encrypted secrets become reviewable. Reviewers can verify that the correct variables were added, removed, or changed -- even without access to the decryption key.

### Key-name tooling still works

Tools that parse `.env` files for key names (linters, documentation generators, `enseal check`, CI validation scripts) continue to work. They see the key names and treat the `ENC[age:...]` tokens as opaque string values.

```bash
# Still works -- checks that all keys in .env.example exist
enseal check .env
# ok: all 12 variables present
```

### Safe to commit

An application that loads this file without decrypting will see `ENC[age:...]` as literal string values. It will fail to connect to the database or authenticate with an API, but no plaintext secrets are exposed. The failure mode is safe.

## Multi-Recipient Encryption

Per-variable encryption supports multiple recipients, just like whole-file encryption:

```bash
enseal encrypt .env --per-var --to sarah --to alex
# ok: encrypted 12 variables (recipients: sarah, alex, self)
```

Each `ENC[age:...]` token is encrypted to all listed recipients. Any single recipient can decrypt the file with `enseal decrypt .env`.

## Workflow Example

### Initial setup

```bash
# Generate keys if you have not already
enseal keys init

# Encrypt your .env with per-variable encryption
enseal encrypt .env --per-var --to sarah --to alex

# Commit the encrypted file
git add .env
git commit -m "add encrypted environment config"
```

### Updating a secret

```bash
# Decrypt to edit
enseal decrypt .env

# Make your changes
vim .env

# Re-encrypt
enseal encrypt .env --per-var --to sarah --to alex

# Commit
git add .env
git commit -m "rotate API_KEY"
```

### New team member

When a new developer joins, re-encrypt with them added as a recipient:

```bash
enseal keys import mike.pub
enseal decrypt .env
enseal encrypt .env --per-var --to sarah --to alex --to mike
git add .env
git commit -m "add mike as secret recipient"
```

## Comparison: Whole-File vs Per-Variable

| Aspect | Whole-file (`enseal encrypt`) | Per-variable (`enseal encrypt --per-var`) |
|---|---|---|
| Command | `enseal encrypt .env` | `enseal encrypt .env --per-var` |
| Output | `.env.encrypted` (opaque age blob) | `.env` with `ENC[age:...]` values |
| Key names visible | No | Yes |
| Git diff | Binary changed | Shows which keys changed |
| Code review | Requires decryption | Key-level review without decryption |
| File size | Smaller (single encryption overhead) | Larger (per-value encryption overhead) |
| Tooling compatibility | Must decrypt first | Key-name parsing works as-is |
| Decryption | `enseal decrypt .env.encrypted` | `enseal decrypt .env` |
| Safe if loaded without decrypting | App cannot read the file at all | App reads `ENC[...]` as literal strings (fails safely) |

Choose whole-file encryption when simplicity and file size matter. Choose per-variable encryption when you need visibility into which secrets changed, reviewable pull requests, or compatibility with key-name-based tooling.

# Redact

`enseal redact` replaces all values in a `.env` file with `<REDACTED>`, preserving the file structure. This produces a safe version of your configuration that shows which variables exist without exposing any secret values.

## Usage

```bash
enseal redact <file>
```

### Redact to stdout

```bash
enseal redact .env
```

Output is printed to stdout by default.

### Redact to a file

```bash
enseal redact .env --output .env.redacted
```

## Example

Given this `.env` file:

```env
# Database configuration
DATABASE_URL=postgres://admin:s3cret@db.internal:5432/myapp
DB_POOL_SIZE=10

# External services
STRIPE_API_KEY=sk_live_abc123def456ghi789
STRIPE_WEBHOOK_SECRET=whsec_xyz987

# Application settings
PORT=3000
LOG_LEVEL=info
DEBUG=false
```

Running `enseal redact .env` produces:

```env
# Database configuration
DATABASE_URL=<REDACTED>
DB_POOL_SIZE=<REDACTED>

# External services
STRIPE_API_KEY=<REDACTED>
STRIPE_WEBHOOK_SECRET=<REDACTED>

# Application settings
PORT=<REDACTED>
LOG_LEVEL=<REDACTED>
DEBUG=<REDACTED>
```

Comments, blank lines, and key ordering are preserved exactly as they appear in the original file. Only the values are replaced.

## Use cases

### Sharing .env structure

When onboarding a new teammate or filing a bug report, you may need to show which variables your project uses without revealing their values:

```bash
enseal redact .env | pbcopy
```

Paste the result into a ticket, wiki page, or chat message.

### Documentation

Generate a redacted snapshot of your configuration for internal documentation:

```bash
enseal redact .env --output docs/env-reference.txt
```

### Debugging

When asking for help with a configuration issue, share the redacted output so others can see the structure without the secrets:

```bash
$ enseal redact .env
# The person helping you can see which vars are set
# without seeing actual credentials
```

## Redact vs Template

Both `redact` and [`template`](./template.md) produce safe versions of a `.env` file, but they serve different purposes:

- **redact** replaces every value with `<REDACTED>`. It is a direct, mechanical transformation of the original file. Best for showing the exact structure of an existing `.env`.
- **template** generates descriptive placeholders like `<postgres connection string>` or `<integer, 1024-65535>`. It produces a `.env.example` that helps developers understand what each variable expects. Best for onboarding documentation.

If you want a file that tells developers what to put in each variable, use `template`. If you just need to strip the secrets out, use `redact`.

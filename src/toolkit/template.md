# Template

`enseal template` generates a `.env.example` file from a real `.env` file. Instead of exposing actual values, it produces descriptive placeholders that tell developers what each variable expects. This is safer and more informative than a plain [redact](./redact.md).

## Usage

```bash
enseal template <file>
```

### Generate to stdout

```bash
enseal template .env
```

### Generate to a file

```bash
enseal template .env --output .env.example
```

## Example

Given this `.env` file:

```env
# Database
DATABASE_URL=postgres://admin:s3cret@db.internal:5432/myapp
DB_POOL_SIZE=10

# External services
STRIPE_API_KEY=sk_live_4eC39HqLyjWDarjtT1zdp7dc
SENDGRID_API_KEY=SG.abc123def456.xyz789

# Application
PORT=3000
DEBUG=false
LOG_LEVEL=info
ADMIN_EMAIL=admin@example.com
APP_URL=https://myapp.example.com
SESSION_SECRET=a7f3b9c1d4e8f2a6
```

Running `enseal template .env` produces:

```env
# Database
DATABASE_URL=<postgres connection string>
DB_POOL_SIZE=<integer>

# External services
STRIPE_API_KEY=<32+ character string>
SENDGRID_API_KEY=<32+ character string>

# Application
PORT=<integer>
DEBUG=<boolean>
LOG_LEVEL=<string>
ADMIN_EMAIL=<email address>
APP_URL=<url>
SESSION_SECRET=<16+ character string>
```

Comments and blank lines from the original file are preserved in the output.

## Type inference

When no `.enseal.toml` schema is present, `enseal template` infers types from the actual values:

| Detected pattern | Placeholder |
|-----------------|-------------|
| `true`, `false`, `0`, `1`, `yes`, `no` | `<boolean>` |
| Numeric digits only | `<integer>` |
| Starts with `http://` or `https://` | `<url>` |
| Contains `@` and `.` (email-like) | `<email address>` |
| Starts with `postgres://`, `mysql://`, etc. | `<postgres connection string>`, `<mysql connection string>`, etc. |
| 32+ characters | `<32+ character string>` |
| 16+ characters | `<16+ character string>` |
| Everything else | `<string>` |

## Schema-aware descriptions

If an `.enseal.toml` schema exists with `description` fields, those descriptions are used instead of inferred types:

```toml
# .enseal.toml
[schema.rules.DATABASE_URL]
pattern = "^postgres://"
description = "PostgreSQL connection string"

[schema.rules.PORT]
type = "integer"
range = [1024, 65535]

[schema.rules.LOG_LEVEL]
enum = ["debug", "info", "warn", "error"]
```

With this schema, `enseal template .env` produces more specific placeholders:

```env
DATABASE_URL=<PostgreSQL connection string>
PORT=<integer, 1024-65535>
LOG_LEVEL=<one of: debug, info, warn, error>
```

Schema descriptions always take precedence over inferred types.

## Template vs Redact

Both commands produce safe versions of `.env` files. The key difference:

- **template** generates helpful placeholders that describe what each variable expects. Best for `.env.example` files committed to version control.
- **redact** replaces every value with a uniform `<REDACTED>`. Best for quick sharing of `.env` structure without any interpretation.

Use `template` when the goal is to help someone fill in a new `.env` from scratch. Use `redact` when you just need to strip secrets from an existing file.

## Typical workflow

1. Write your `.env` with real values during development.
2. Run `enseal template .env --output .env.example` to generate the example file.
3. Commit `.env.example` to version control.
4. When variables change, regenerate the template.

```bash
# After adding new variables to .env
enseal template .env --output .env.example
git add .env.example
git commit -m "update .env.example with new variables"
```

New developers clone the repo, copy `.env.example` to `.env`, and fill in the values guided by the descriptive placeholders.

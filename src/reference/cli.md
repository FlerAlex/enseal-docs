# CLI Reference

Complete reference for all enseal commands, subcommands, and flags.

## Global Flags

These flags are available on all commands.

| Flag | Description |
|------|-------------|
| `--verbose`, `-v` | Show debug output. Shows variable names but never secret values. |
| `--quiet`, `-q` | Minimal output, suitable for scripting. Suppresses warnings. |
| `--config <path>` | Path to `.enseal.toml` manifest file. Defaults to `.enseal.toml` in the current directory. |

---

## Core Commands

### `enseal share [<file>]`

Send a `.env` file, piped input, or inline secret. In anonymous mode (default), generates a wormhole code for the recipient. In identity mode (`--to`), encrypts to a specific recipient's public key.

Input is selected by priority:

1. `--secret <value>` -- inline string (raw or KEY=VALUE)
2. stdin pipe -- automatically detected when stdin is not a TTY
3. `<file>` -- path to a `.env` file (defaults to `.env` in the current directory)

**Flags:**

| Flag | Description |
|------|-------------|
| `--to <identity>` | Identity mode: encrypt to a named recipient, alias, or group. Without this flag, anonymous wormhole mode is used. |
| `--output <dir>` | File drop (identity mode only): write an encrypted file to the specified directory instead of transferring over the network. |
| `--secret <value>` | Inline secret. Can be a raw string or `KEY=VALUE` pair. Puts the value in shell history -- prefer piping for sensitive values. |
| `--label <name>` | Human-readable label for raw or piped secrets (e.g., `"Stripe API key"`). Shown to the recipient on receive. |
| `--as <KEY>` | Wrap a raw string as `KEY=<value>` so the recipient gets a `.env`-compatible line. |
| `--relay <url>` | Use a specific relay server instead of the public relay. Also configurable via `ENSEAL_RELAY` env var. |
| `--env <profile>` | Environment profile. Resolves to `.env.<profile>` in the current directory (e.g., `--env staging` reads `.env.staging`). |
| `--exclude <pattern>` | Regex pattern to exclude matching variable names before sending (e.g., `"^PUBLIC_"`). Only applies to `.env` file input. |
| `--include <pattern>` | Regex pattern to include only matching variable names. Only applies to `.env` file input. |
| `--no-filter` | Send the raw file contents without `.env` parsing or filtering. |
| `--no-interpolate` | Do not resolve `${VAR}` references before sending. Sends raw interpolation syntax as-is. |
| `--words <n>` | Number of words in the wormhole code (default: 2, range: 2-5). More words increase entropy. Anonymous mode only. |
| `--timeout <seconds>` | Channel expiry time in seconds (default: 300). |
| `--quiet`, `-q` | Suppress warnings (including the `--secret` shell history warning). |

**Examples:**

```bash
# Share .env file (anonymous mode, default)
enseal share .env

# Share with more wormhole code words for higher security
enseal share .env --words 4

# Share to a specific recipient (identity mode)
enseal share .env --to sarah

# Share a staging environment
enseal share --env staging --to backend-team

# File drop for air-gapped transfer
enseal share .env --to alex@company.com --output ./drop/

# Inline secret
enseal share --secret "sk_live_abc123" --label "Stripe key"

# Pipe a secret (preferred over --secret for sensitive values)
pass show stripe/key | enseal share --label "Stripe"

# Pipe and wrap as KEY=VALUE
echo -n "sk_live_abc123" | enseal share --as STRIPE_KEY

# Exclude public variables before sending
enseal share .env --exclude "^NEXT_PUBLIC_"

# Use a self-hosted relay
enseal share .env --relay wss://relay.internal:4443
```

---

### `enseal receive [<code|file>]`

Receive secrets. Accepts a wormhole code (anonymous mode) or an encrypted file path (identity mode file drop).

Output adapts to the payload format:

- `.env` payload: writes to a file (default: `.env`)
- Raw string payload: prints to stdout
- KEY=VALUE payload: prints to stdout in `.env`-compatible format

**Flags:**

| Flag | Description |
|------|-------------|
| `--output <path>` | Write to a specific file path, overriding the default output behavior. |
| `--clipboard` | Copy the received value to the system clipboard instead of writing to stdout or a file. |
| `--no-write` | Print to stdout even for `.env` payloads. Does not write any file. |
| `--force` | Overwrite the output file if it already exists without prompting. |
| `--relay <url>` | Use a specific relay server. Also configurable via `ENSEAL_RELAY` env var. |
| `--quiet`, `-q` | Minimal output. |

**Examples:**

```bash
# Receive using a wormhole code
enseal receive 7-guitarist-revenge

# Write to a specific file
enseal receive 7-guitarist-revenge --output staging.env

# Copy a raw secret to clipboard
enseal receive 4-orbital-hammock --clipboard

# Pipe to another command
enseal receive 4-orbital-hammock | pbcopy

# Print .env payload to stdout instead of writing a file
enseal receive 7-guitarist-revenge --no-write

# Receive from an encrypted file drop
enseal receive ./drop/alex@company.com.env.age

# Overwrite existing .env without prompting
enseal receive 7-guitarist-revenge --force
```

---

### `enseal inject <code> -- <command>`

Receive secrets and inject them as environment variables into a child process. Secrets never touch the filesystem. When the child process exits, the secrets are gone.

**Positional arguments:**

| Argument | Description |
|----------|-------------|
| `<code>` | Wormhole code (anonymous mode) or encrypted file path (identity mode). |
| `-- <command>` | The command to run with injected secrets. Everything after `--` is treated as the child command and its arguments. |

**Flags:**

| Flag | Description |
|------|-------------|
| `--listen` | Identity mode: listen for an incoming transfer instead of providing a code. |
| `--relay <url>` | Use a specific relay server. Also configurable via `ENSEAL_RELAY` env var. |
| `--quiet`, `-q` | Minimal output. |

**Examples:**

```bash
# Inject via wormhole code into npm start
enseal inject 7-guitarist-revenge -- npm start

# Identity mode: listen for incoming secrets, inject into docker compose
enseal inject --listen -- docker compose up

# Inject from an encrypted file drop
enseal inject ./staging.env.age -- python manage.py runserver

# Use a self-hosted relay
enseal inject --relay wss://relay.internal:4443 7-guitarist-revenge -- cargo run
```

---

### `enseal keys <subcommand>`

Manage identity keys, aliases, and groups. Keys are stored in `~/.config/enseal/keys/`.

#### `enseal keys init`

Generate your keypair. Creates an age keypair (for encryption) and an ed25519 keypair (for signing).

```bash
enseal keys init
```

#### `enseal keys export [--armor]`

Print your public key bundle to stdout. Share this with teammates so they can send you encrypted secrets.

```bash
# Print public key
enseal keys export

# Armor-encoded output
enseal keys export --armor
```

#### `enseal keys import <file>`

Import a colleague's public key. Displays the identity and fingerprint, then prompts for confirmation before trusting.

| Flag | Description |
|------|-------------|
| `--yes` | Skip the confirmation prompt. Useful for scripted workflows. |

```bash
# Import with confirmation prompt
enseal keys import alex.pub

# Import without prompting
enseal keys import alex.pub --yes
```

#### `enseal keys list`

Show all trusted keys and their aliases.

```bash
enseal keys list
```

#### `enseal keys remove <identity>`

Remove a trusted key by identity name.

```bash
enseal keys remove alex@company.com
```

#### `enseal keys fingerprint`

Display your key fingerprint for out-of-band verification with teammates.

```bash
enseal keys fingerprint
```

#### `enseal keys alias <name> <identity>`

Map a short nickname to a full identity string. Aliases can be used anywhere an identity is expected.

```bash
enseal keys alias sarah sarah@company.com

# Now you can use:
enseal share .env --to sarah
```

#### `enseal keys group create <name>`

Create a named recipient group.

```bash
enseal keys group create backend-team
```

#### `enseal keys group add <group> <identity>`

Add an identity to a group.

```bash
enseal keys group add backend-team sarah@company.com
enseal keys group add backend-team alex@company.com
```

#### `enseal keys group remove <group> <identity>`

Remove an identity from a group.

```bash
enseal keys group remove backend-team alex@company.com
```

#### `enseal keys group list [name]`

List all groups, or list members of a specific group.

```bash
# List all groups
enseal keys group list

# List members of a specific group
enseal keys group list backend-team
```

#### `enseal keys group delete <name>`

Delete a group entirely.

```bash
enseal keys group delete backend-team
```

---

### `enseal serve`

Run a self-hosted relay server. The server is a stateless matchmaker and transit relay. It sees only ciphertext and holds nothing in persistent storage.

**Flags:**

| Flag | Description |
|------|-------------|
| `--port <port>` | Listen port (default: 4443). |
| `--bind <addr>` | Bind address (default: `0.0.0.0`). |
| `--max-mailboxes <n>` | Maximum concurrent channels (default: 100). |
| `--channel-ttl <seconds>` | How long idle channels survive before cleanup (default: 300). |
| `--max-payload <bytes>` | Maximum payload size per transfer (default: 1048576). |
| `--rate-limit <n>` | Maximum new connections per second per IP. |
| `--health` | Print a server health check and exit. |

**Examples:**

```bash
# Start relay on default port
enseal serve

# Bind to a specific port and address
enseal serve --port 8443 --bind 127.0.0.1

# Configure limits
enseal serve --max-mailboxes 500 --channel-ttl 600

# Check if a running relay is healthy
enseal serve --health
```

---

## Toolkit Commands

### `enseal check [file]`

Validate that a `.env` file contains all variables listed in `.env.example`. If a `.enseal.toml` with schema rules is present, also runs schema validation.

```bash
# Check .env against .env.example
enseal check

# Check a specific file
enseal check .env.staging
```

---

### `enseal diff <file1> <file2>`

Compare two `.env` files and show missing or extra variable names. Shows keys only -- never displays values.

```bash
# Compare .env against .env.example
enseal diff .env .env.example

# Compare two environment files
enseal diff .env.staging .env.production
```

---

### `enseal redact <file>`

Output a copy of a `.env` file with all values replaced by `<REDACTED>`. Useful for sharing structure without exposing secrets.

| Flag | Description |
|------|-------------|
| `--output <path>` | Write redacted output to a file instead of stdout. |

```bash
# Print redacted .env to stdout
enseal redact .env

# Write redacted output to a file
enseal redact .env --output .env.redacted
```

---

### `enseal validate <file>`

Validate a `.env` file against schema rules defined in `.enseal.toml`. Reports missing required variables, type mismatches, pattern violations, and constraint failures.

```bash
enseal validate .env
```

Example output:

```
error: missing required: JWT_SECRET
error: DATABASE_URL doesn't match pattern ^postgres://
error: PORT value "abc" is not an integer
ok: 11/14 variables passed validation
```

---

### `enseal template <file>`

Generate a `.env.example` from a real `.env` file. Uses schema rules from `.enseal.toml` if available, otherwise infers types from values. Produces descriptions rather than `<REDACTED>` placeholders.

| Flag | Description |
|------|-------------|
| `--output <path>` | Write template to a file instead of stdout. |

```bash
# Print template to stdout
enseal template .env

# Write template to .env.example
enseal template .env --output .env.example
```

Example output:

```
# DATABASE_URL=<postgres connection string>
# API_KEY=<32+ character string>
# PORT=<integer, 1024-65535>
# DEBUG=<boolean>
```

---

## Encryption Commands

### `enseal encrypt <file>`

Encrypt a `.env` file for safe storage in git, using age encryption.

| Flag | Description |
|------|-------------|
| `--per-var` | Encrypt each variable value individually. Keys remain visible for diffing, values are wrapped in `ENC[age:...]`. |
| `--to <identity>` | Encrypt to specific recipients. Can be specified multiple times for multi-recipient encryption. Any recipient can decrypt. |

**Examples:**

```bash
# Whole-file encryption (produces .env.encrypted)
enseal encrypt .env

# Per-variable encryption (keys visible, values encrypted)
enseal encrypt .env --per-var

# Encrypt to specific recipients
enseal encrypt .env --to sarah --to alex
```

Per-variable output format:

```
DB_HOST=ENC[age:YWdlLWVuY3J5cHRpb24...]
DB_PORT=ENC[age:b3RoZXItZW5jcnlwdGVk...]
```

---

### `enseal decrypt <file>`

Decrypt an encrypted `.env` file. Works with both whole-file and per-variable encrypted formats.

```bash
# Decrypt whole-file encryption
enseal decrypt .env.encrypted

# Decrypt per-variable encryption
enseal decrypt .env.per-var
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ENSEAL_RELAY` | Default relay server URL. Equivalent to `--relay`. |

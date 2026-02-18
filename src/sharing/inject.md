# Inject into Process

The `enseal inject` command receives secrets and passes them directly as
environment variables to a child process. Secrets never touch the filesystem --
they exist only in the process environment block in memory. When the child
process exits, the secrets are gone.

## Basic Usage

The syntax is `enseal inject <source> -- <command>`. Everything after `--` is
the command to run with the injected secrets.

### From a Wormhole Code

The most common usage: receive secrets via a wormhole code and inject them into
a process:

```bash
$ enseal inject 7-guitarist-revenge -- npm start
ok: 14 secrets injected into process
[npm start output follows...]
```

The sender runs `enseal share .env` as usual. The recipient uses `inject`
instead of `receive` to avoid writing secrets to disk.

### From a Relay (Listen Mode)

In listen mode, enseal waits for an incoming identity-mode transfer on the
relay. This is useful for automated workflows where the recipient starts first:

```bash
$ enseal inject --listen --relay wss://relay.internal:4443 -- docker compose up
waiting for secrets...
ok: sender verified (alex@company.com)
ok: 14 secrets injected into process
[docker compose output follows...]
```

The sender pushes to the same relay:

```bash
$ enseal share .env --to deploy@company.com --relay wss://relay.internal:4443
ok: encrypted and pushed to relay
```

### From an Encrypted File

Inject secrets from a file drop (an `.env.age` file produced by identity mode
with `--output`):

```bash
$ enseal inject ./staging.env.age -- python manage.py runserver
ok: sender verified (alex@company.com)
ok: 14 secrets injected into process
[django output follows...]
```

This is useful when the encrypted file was transferred by other means (scp, USB,
shared drive) and you want to use the secrets without decrypting to disk.

## How It Works

When `enseal inject` receives secrets, it:

1. Receives and decrypts the payload (via wormhole, relay, or file).
2. Parses the `.env` content into key-value pairs.
3. Spawns the child process with the secrets merged into the current
   environment. Existing environment variables are preserved; secrets from the
   payload are added (or override existing values if keys conflict).
4. Inherits stdin, stdout, and stderr so the child process behaves normally.
5. Forwards signals (SIGINT, SIGTERM) to the child process for graceful
   shutdown.
6. Waits for the child to exit and propagates the exit code.

```
enseal inject
  |
  +-- receive & decrypt payload
  |
  +-- parse KEY=VALUE pairs
  |
  +-- spawn child process with secrets in env
  |     |
  |     +-- child runs with secrets in memory
  |     |
  |     +-- [SIGINT/SIGTERM forwarded]
  |     |
  |     +-- child exits
  |
  +-- exit with child's exit code
```

After the child process exits, the secrets exist nowhere on the system. They
were never written to a file, a temp directory, or any persistent storage.

## Signal Forwarding

enseal forwards the following signals to the child process:

- **SIGINT** (Ctrl+C) -- the child receives the interrupt and can shut down
  gracefully.
- **SIGTERM** -- the child receives the termination signal.

This means pressing Ctrl+C in a terminal running `enseal inject ... -- npm
start` will correctly signal the Node.js process to shut down, not just kill
enseal.

## Use Cases

### Local Development

Start your development server with secrets from a teammate without writing a
`.env` file:

```bash
$ enseal inject 7-guitarist-revenge -- cargo run
```

### CI/CD Pipelines

Inject secrets into a build or deployment step. Secrets are never written to
the CI runner's filesystem:

```bash
# In a CI script
$ enseal inject --listen --relay wss://relay.internal:4443 -- ./deploy.sh
```

A team member or automation system pushes the secrets to the relay before the
CI job reaches this step.

### Containers

Run a container with injected secrets:

```bash
$ enseal inject 7-guitarist-revenge -- docker run --rm -e-stdin myapp
```

Or use inject inside a container entrypoint to receive secrets at startup.

### One-Off Commands

Run a single command that needs a secret, without persisting anything:

```bash
$ enseal inject 4-orbital-hammock -- psql "$DATABASE_URL"
```

## Combining with Other Flags

Inject respects the same relay and timeout flags as other commands:

```bash
# Use a self-hosted relay with a longer timeout
$ enseal inject --relay wss://relay.internal:4443 --timeout 600 \
    7-guitarist-revenge -- npm start

# Verbose mode shows variable names (never values)
$ enseal inject -v 7-guitarist-revenge -- npm start
ok: injecting 14 variables: DATABASE_URL, API_KEY, JWT_SECRET, ...
```

## Security Properties

- **No filesystem persistence.** Secrets exist only in the child process
  environment block. No temp files, no intermediate storage.
- **Clean exit.** When the child process exits, the secrets are gone from the
  system.
- **Signal forwarding.** The child can shut down gracefully, avoiding orphaned
  processes.
- **Same encryption guarantees.** The payload is protected by the same
  wormhole/age/ed25519 encryption as `enseal receive`.
- **Process isolation.** Only the child process (and its descendants) have
  access to the injected secrets. Other processes on the system cannot read
  them unless they have privileges to inspect the child's environment (e.g.,
  root access via /proc).

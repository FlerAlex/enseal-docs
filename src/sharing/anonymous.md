# Anonymous Mode (Wormhole)

Anonymous mode is the default sharing mode in enseal. It requires no setup, no
accounts, and no prior relationship between sender and recipient. A
human-readable code is the only thing exchanged out of band.

## How It Works

1. The sender runs `enseal share` and a wormhole code is generated (format:
   `NNNN-word-word`, e.g. `7-guitarist-revenge`).
2. The sender communicates this code to the recipient through any channel (chat,
   voice, in person).
3. The recipient runs `enseal receive <code>`.
4. Both sides perform a SPAKE2 key exchange through the relay server. This
   mutually authenticates both parties using the shared code as the password.
5. The payload is encrypted with age and transferred through the relay.
6. The relay sees only ciphertext and cannot decrypt the payload.
7. The channel is destroyed after use. The code cannot be reused.

The entire transfer is single-use and time-limited. By default, the channel
expires after 5 minutes if the recipient does not connect.

## Sharing a .env File

The most common use case is sharing a `.env` file with a teammate:

```bash
$ enseal share .env
ok: 14 secrets loaded from .env
code: 7-guitarist-revenge
waiting for recipient...
```

The sender sees the code and waits. The recipient enters the code:

```bash
$ enseal receive 7-guitarist-revenge
ok: 14 secrets written to .env
```

If no file argument is given, enseal looks for `.env` in the current directory:

```bash
$ enseal share
ok: 14 secrets loaded from .env
code: 4-orbital-hammock
waiting for recipient...
```

## Sharing Piped Input

You can pipe content into enseal. This is useful for sending a single secret
without exposing it in shell history:

```bash
$ pass show stripe/live-key | enseal share
code: 9-pluto-carnival
waiting for recipient...
```

The recipient gets the raw value printed to stdout, which can be piped further:

```bash
$ enseal receive 9-pluto-carnival
sk_live_abc123def456

$ enseal receive 9-pluto-carnival | pbcopy
```

You can also pipe multi-line `.env` content. enseal auto-detects the format:

```bash
$ cat staging-secrets.env | enseal share
code: 3-anvil-bookshelf
waiting for recipient...
```

## Sharing an Inline Secret

The `--secret` flag sends a value directly from the command line:

```bash
$ enseal share --secret "sk_live_abc123def456"
warning: --secret puts the value in shell history. Consider piping instead: echo "..." | enseal share
code: 2-falcon-midnight
waiting for recipient...
```

enseal warns about shell history exposure every time `--secret` is used. Prefer
piping for sensitive values. Suppress the warning with `--quiet`.

If the value contains `=`, enseal treats it as a KEY=VALUE pair:

```bash
$ enseal share --secret "STRIPE_KEY=sk_live_abc123"
code: 5-hammer-dolphin
waiting for recipient...
```

The recipient receives it in KEY=VALUE format, suitable for appending to a
`.env` file:

```bash
$ enseal receive 5-hammer-dolphin
STRIPE_KEY=sk_live_abc123

$ enseal receive 5-hammer-dolphin >> .env
```

## Labels and Key Wrapping

Add a human-readable label to give the recipient context:

```bash
$ pass show stripe/live-key | enseal share --label "Stripe production key"
code: 8-castle-violin
waiting for recipient...
```

The recipient sees the label:

```bash
$ enseal receive 8-castle-violin
ok: received secret (label: "Stripe production key")
sk_live_abc123def456
```

Wrap a raw value as a KEY=VALUE pair with `--as`:

```bash
$ echo -n "sk_live_abc123" | enseal share --as STRIPE_KEY
code: 6-robot-lantern
waiting for recipient...
```

The recipient gets `STRIPE_KEY=sk_live_abc123` instead of the bare value.

## Increasing Code Length

The default code uses 2 words (~22 bits of entropy). Combined with single-use
channels and a 5-minute timeout, this is sufficient for most scenarios.

For higher-security contexts, increase the word count with `--words`:

```bash
$ enseal share .env --words 4
code: 7-guitarist-revenge-castle-violin
waiting for recipient...
```

Valid range is 2 to 5 words.

## Filtering Variables

When sharing a `.env` file, you can filter which variables are sent:

```bash
# Exclude public variables that don't need to be secret
$ enseal share .env --exclude "^PUBLIC_|^NEXT_PUBLIC_"

# Send only database-related variables
$ enseal share .env --include "^DB_|^DATABASE_"

# Skip .env parsing entirely and send the raw file
$ enseal share .env --no-filter
```

## Security Properties

- **No accounts or keys required.** The wormhole code is the only credential.
- **Mutual authentication.** SPAKE2 ensures both parties derived the same key
  from the code. A wrong code produces a clean failure, not a partial transfer.
- **End-to-end encryption.** The relay server sees only ciphertext.
- **Single-use channels.** A code cannot be reused after a successful transfer.
- **Time-limited.** Channels expire after the configured timeout (default: 5
  minutes). Adjust with `--timeout`.
- **No persistent state.** Nothing is stored on the relay after the transfer
  completes or the channel expires.

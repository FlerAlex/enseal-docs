# Configuration (.enseal.toml)

enseal supports an optional configuration file named `.enseal.toml` placed at the root of your project. When present, it applies default settings, filtering rules, schema validation, and project metadata to all enseal commands run in that directory.

If no `.enseal.toml` is found, enseal operates with built-in defaults. No configuration file is required for basic usage.

---

## Sections

### `[defaults]`

Override default values for common flags. These are applied when the corresponding flag is not provided on the command line.

| Key | Type | Description |
|-----|------|-------------|
| `relay` | string | Default relay URL. Equivalent to `--relay` or `ENSEAL_RELAY`. |
| `timeout` | integer | Channel expiry in seconds (default: 300). |
| `words` | integer | Number of wormhole code words (default: 2, range: 2-5). |

```toml
[defaults]
relay = "wss://relay.internal.company.com:4443"
timeout = 600
words = 3
```

---

### `[filter]`

Define patterns to automatically strip variables before sending. Useful for excluding public or non-secret variables from transfers. Filters apply only to `.env` file input -- they do not affect inline secrets or piped input.

| Key | Type | Description |
|-----|------|-------------|
| `exclude` | array of strings | Regex patterns. Variables whose names match any pattern are removed before sending. |

```toml
[filter]
exclude = ["^PUBLIC_", "^NEXT_PUBLIC_", "^REACT_APP_"]
```

With this configuration, running `enseal share .env` will automatically strip any variable whose name starts with `PUBLIC_`, `NEXT_PUBLIC_`, or `REACT_APP_` before transferring.

Patterns are matched against variable names only (not values). Each pattern is a standard regex.

---

### `[identity]`

Configure defaults for identity mode operations.

| Key | Type | Description |
|-----|------|-------------|
| `default_recipient` | string | Default `--to` value when identity mode is used. Can be an identity, alias, or group name. |

```toml
[identity]
default_recipient = "devops-team"
```

---

### `[metadata]`

Set project metadata included in transfer envelopes. This metadata is shown to the recipient for context.

| Key | Type | Description |
|-----|------|-------------|
| `project` | string | Project name. If omitted, auto-detected from `Cargo.toml` (`[package].name`) or `package.json` (`name` field) in the current directory. |

```toml
[metadata]
project = "acme-api"
```

---

### `[schema]`

Define required variables and validation rules. Used by `enseal validate`, `enseal check` (when schema exists), and automatically on `enseal receive` (as a non-blocking warning).

| Key | Type | Description |
|-----|------|-------------|
| `required` | array of strings | Variable names that must be present in the `.env` file. |

```toml
[schema]
required = ["DATABASE_URL", "API_KEY", "JWT_SECRET", "PORT"]
```

---

### `[schema.rules.<VARNAME>]`

Per-variable validation rules. Each rule is a table keyed by the variable name.

| Key | Type | Description |
|-----|------|-------------|
| `type` | string | Expected value type. See supported types below. Default: `"string"`. |
| `pattern` | string | Regex the value must match. |
| `min_length` | integer | Minimum character length of the value. |
| `max_length` | integer | Maximum character length of the value. |
| `range` | array of two integers | Allowed `[min, max]` range for integer-typed values. |
| `enum` | array of strings | Exhaustive list of allowed values. |
| `description` | string | Human-readable description. Used by `enseal template` to generate `.env.example` entries. |

**Supported types:**

| Type | Description |
|------|-------------|
| `string` | Any string value (default). |
| `integer` | Decimal integer. Validated with optional `range` constraint. |
| `boolean` | Must be one of: `true`, `false`, `1`, `0`, `yes`, `no`. |
| `url` | Must be a syntactically valid URL. |
| `email` | Must be a syntactically valid email address. |

```toml
[schema.rules.DATABASE_URL]
pattern = "^postgres://"
description = "PostgreSQL connection string"

[schema.rules.API_KEY]
min_length = 32
description = "API key from dashboard"

[schema.rules.PORT]
type = "integer"
range = [1024, 65535]

[schema.rules.DEBUG]
type = "boolean"

[schema.rules.LOG_LEVEL]
enum = ["debug", "info", "warn", "error"]
```

---

## Full Example

A complete `.enseal.toml` demonstrating all sections:

```toml
[defaults]
relay = "wss://relay.internal.company.com:4443"
timeout = 600
words = 3

[filter]
exclude = ["^PUBLIC_", "^NEXT_PUBLIC_", "^REACT_APP_"]

[identity]
default_recipient = "devops-team"

[metadata]
project = "acme-api"

[schema]
required = ["DATABASE_URL", "API_KEY", "JWT_SECRET", "PORT", "LOG_LEVEL"]

[schema.rules.DATABASE_URL]
pattern = "^postgres://"
description = "PostgreSQL connection string"

[schema.rules.API_KEY]
min_length = 32
description = "API key from the admin dashboard"

[schema.rules.JWT_SECRET]
min_length = 64
description = "JWT signing secret"

[schema.rules.PORT]
type = "integer"
range = [1024, 65535]
description = "Application listen port"

[schema.rules.DEBUG]
type = "boolean"
description = "Enable debug mode"

[schema.rules.LOG_LEVEL]
enum = ["debug", "info", "warn", "error"]
description = "Application log level"

[schema.rules.SMTP_HOST]
type = "url"
description = "SMTP server URL"

[schema.rules.ADMIN_EMAIL]
type = "email"
description = "Admin notification email address"
```

---

## Validation Behavior

Schema validation runs in these contexts:

| Context | Behavior |
|---------|----------|
| `enseal validate` | Explicit validation. Reports all errors. Non-zero exit code on failure. |
| `enseal check` | Runs schema validation in addition to checking against `.env.example` when `.enseal.toml` is present. |
| `enseal receive` | Automatic validation after receiving a `.env` payload. Emits warnings but does not block the receive. |
| `enseal inject` | Automatic validation before injecting secrets into the child process. Emits warnings but does not block injection. |

Validation errors are specific and actionable:

```
error: missing required: JWT_SECRET
error: DATABASE_URL doesn't match pattern ^postgres://
error: PORT value "abc" is not an integer (expected range 1024-65535)
error: LOG_LEVEL value "verbose" is not one of: debug, info, warn, error
ok: 11/15 variables passed validation
```

---

## File Discovery

enseal searches for `.enseal.toml` in the current working directory. You can override this with the `--config` global flag:

```bash
enseal validate .env --config /path/to/.enseal.toml
```

The configuration file is never required. All enseal commands work without one.

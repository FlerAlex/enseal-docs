# Validate

`enseal validate` checks a `.env` file against schema rules defined in `.enseal.toml`. This catches type errors, missing required variables, invalid formats, and out-of-range values before they cause runtime failures.

## Usage

```bash
enseal validate <file>
```

### Validate the default .env

```bash
enseal validate .env
```

### Validate an environment profile

```bash
enseal validate --env production
```

This resolves to `.env.production` in the current directory.

## Defining a schema

Schema rules are defined in `.enseal.toml` at the root of your project:

```toml
[schema]
required = ["DATABASE_URL", "API_KEY", "JWT_SECRET", "PORT"]

[schema.rules.DATABASE_URL]
pattern = "^postgres://"
description = "PostgreSQL connection string"

[schema.rules.API_KEY]
min_length = 32
description = "API key from the admin dashboard"

[schema.rules.JWT_SECRET]
min_length = 16
description = "Secret for signing JSON Web Tokens"

[schema.rules.PORT]
type = "integer"
range = [1024, 65535]

[schema.rules.DEBUG]
type = "boolean"

[schema.rules.LOG_LEVEL]
enum = ["debug", "info", "warn", "error"]

[schema.rules.ADMIN_EMAIL]
type = "email"

[schema.rules.CALLBACK_URL]
type = "url"
pattern = "^https://"
description = "OAuth callback URL (must be HTTPS)"
```

## Supported rule types

| Field | Description | Example |
|-------|-------------|---------|
| `type` | Value type. One of: `string` (default), `integer`, `boolean`, `url`, `email` | `type = "integer"` |
| `pattern` | Regex the value must match | `pattern = "^postgres://"` |
| `min_length` | Minimum character length | `min_length = 32` |
| `max_length` | Maximum character length | `max_length = 256` |
| `range` | Allowed range for integer types, as `[min, max]` | `range = [1024, 65535]` |
| `enum` | List of allowed values | `enum = ["debug", "info", "warn", "error"]` |
| `description` | Human-readable description (used by `enseal template`) | `description = "PostgreSQL connection string"` |

The `required` array at the top level lists variables that must be present. Any variable not in the `required` list is optional -- it will only be validated if it exists in the `.env` file.

## Example output

```
$ enseal validate .env
error: missing required: JWT_SECRET
error: DATABASE_URL doesn't match pattern ^postgres://
error: PORT value "abc" is not an integer
error: LOG_LEVEL value "verbose" is not one of: debug, info, warn, error
error: API_KEY length 12 is below minimum 32
ok: 9/14 variables passed validation
```

When all rules pass:

```
$ enseal validate .env
ok: 14/14 variables passed validation
```

## Automatic validation on receive

When you receive a `.env` file with `enseal receive` or `enseal inject`, validation runs automatically if an `.enseal.toml` schema is present in the current directory. Validation failures are reported as warnings but do not block the transfer:

```
$ enseal receive 7-guitarist-revenge
warning: received .env has validation issues:
  missing required: JWT_SECRET
  PORT value "abc" is not an integer
ok: 14 secrets written to .env
```

This helps catch configuration problems immediately rather than discovering them at runtime.

## Exit codes

| Exit code | Meaning |
|-----------|---------|
| 0 | All validation rules passed |
| 1 | One or more validation errors |

Use in CI to enforce schema compliance:

```bash
enseal validate .env --env production || exit 1
```

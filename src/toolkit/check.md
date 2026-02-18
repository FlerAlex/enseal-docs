# Check

`enseal check` verifies that your `.env` file contains all the variables defined in `.env.example`. This catches missing configuration before it causes runtime errors.

## Usage

```bash
enseal check
```

By default, `enseal check` compares `.env` against `.env.example` in the current directory.

### Check a specific file

```bash
enseal check staging.env
```

This compares `staging.env` against `.env.example`.

### Check an environment profile

```bash
enseal check --env production
```

This resolves to `.env.production` and checks it against `.env.example`.

## Example output

When variables are missing from your `.env`:

```
$ enseal check
error: missing variable: DATABASE_URL
error: missing variable: JWT_SECRET
error: missing variable: REDIS_URL
ok: 11/14 variables present
```

When all variables are present:

```
$ enseal check
ok: 14/14 variables present
```

## Schema-aware checking

If an `.enseal.toml` file with a `[schema]` section is present in the project, `enseal check` also runs schema validation in addition to the `.env.example` comparison. This includes checking required variables, type constraints, and pattern rules. See [Validate](./validate.md) for details on schema configuration.

## Exit codes

`enseal check` returns a non-zero exit code when variables are missing. This makes it suitable for use in CI pipelines and pre-deploy scripts:

```bash
# In a CI pipeline
enseal check || exit 1

# As a pre-deploy gate
enseal check --env production && deploy.sh
```

| Exit code | Meaning |
|-----------|---------|
| 0 | All variables present |
| 1 | One or more variables missing |

## Typical workflow

1. Maintain a `.env.example` in version control with all required variable names.
2. Run `enseal check` locally or in CI to catch missing configuration early.
3. When a teammate adds a new variable, `enseal check` immediately flags it for everyone else.

```bash
# Developer pulls latest changes
git pull

# Check catches the new variable added by a teammate
$ enseal check
error: missing variable: STRIPE_WEBHOOK_SECRET
ok: 13/14 variables present

# Developer adds the missing variable and re-checks
$ enseal check
ok: 14/14 variables present
```

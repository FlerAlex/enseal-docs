# Diff

`enseal diff` compares two `.env` files and reports which variables are missing or extra between them. It shows only key names, never values, so the output is safe to share, paste in a pull request, or log in CI.

## Usage

```bash
enseal diff <file1> <file2>
```

### Compare two environment files

```bash
enseal diff .env.development .env.staging
```

### Compare environment profiles

```bash
enseal diff --env development staging
```

This resolves to `.env.development` and `.env.staging` in the current directory.

## Example output

```
$ enseal diff .env.development .env.staging
- DEBUG                   (in .env.development only)
- MOCK_PAYMENTS           (in .env.development only)
+ REDIS_CLUSTER_URL       (in .env.staging only)
+ SENTRY_DSN              (in .env.staging only)
+ CDN_BASE_URL            (in .env.staging only)

3 extra in .env.staging, 2 missing from .env.staging
```

Variables prefixed with `-` exist in the first file but not the second. Variables prefixed with `+` exist in the second file but not the first. Variables present in both files are not shown.

When the files have identical keys:

```
$ enseal diff .env.development .env.staging
ok: both files have the same 14 variables
```

## Safety

`enseal diff` never displays variable values. Only key names appear in the output. This means you can safely:

- Paste diff output into a Slack channel or pull request comment.
- Include it in CI logs.
- Share it with teammates who should not see production secrets.

If you need to see the actual values, open the files directly. enseal will not do it for you.

## Use cases

### Comparing environments

Before deploying to staging, verify it has the same configuration shape as production:

```bash
enseal diff .env.staging .env.production
```

### Reviewing changes

After updating a `.env` file, compare it against the previous version or the example:

```bash
enseal diff .env .env.example
```

### CI drift detection

Add a diff check to your pipeline to catch environment configuration drift between environments:

```bash
enseal diff .env.staging .env.production
if [ $? -ne 0 ]; then
  echo "warning: staging and production environments have diverged"
fi
```

# VaultCore.dev CLI

CLI to securely CRUD objects over HTTP using a Bearer token.

## Open source notice

This project is part of the [Open Collective](https://opencollective.com/simplyhexagonal) project [Simply Hexagonal](https://simplyhexagonal.org)
and is open to updates by its users, we ensure that PRs are relevant to the community.
In other words, if you find a bug or want a new feature, please help us by becoming one of the
[contributors](#contributors-) ✌️ ! See the [contributing section](#contributing).

## Like this module? ❤

Please consider:

- [Buying me a coffee](https://www.buymeacoffee.com/jeanlescure) ☕
- Supporting me on [Patreon](https://www.patreon.com/jeanlescure) 🏆
- Starring this repo on [Github](https://github.com/simplyhexagonal/vaultcore) 🌟

## Requirements

- Node.js 22+

## Configuration

vaultcore reads configuration from flags or environment variables:

- Flags (take priority):
  - `--base-url`: Base URL (your CloudFront FQDN), e.g. `https://vaultcore.example.com`
  - `--token`: Bearer token
- Environment variables:
  - `VAULTCORE_BASE_URL`
  - `VAULTCORE_TOKEN`
  - Also supported (for compatibility with envrepo flows): `ENV_REPO_BASE_URL`, `ENV_REPO_TOKEN`
- Env files (auto-loaded if present in current working directory):
  - `vaultcore.env`
  - `envrepo.env`

Example `vaultcore.env`:

```env
VAULTCORE_BASE_URL=https://vaultcore.example.com
VAULTCORE_TOKEN=your-super-secret-token
```

Notes:
- The base URL scheme is optional; if omitted, `https://` is assumed. Trailing slashes are removed.

## Usage

```bash
npx vaultcore --help
```

General form:

```bash
npx vaultcore <command> [options]
```

### Create (POST)

Upload a new object from a local file.

```bash
npx vaultcore create <s3Key> <filePath> [--content-type <mime>] [--base-url ...] [--token ...]
```

Example:

```bash
npx vaultcore create folder/file.txt ./file.txt --content-type text/plain
```

### Update (PUT)

Replace an existing object with a local file.

```bash
npx vaultcore update <s3Key> <filePath> [--content-type <mime>] [--base-url ...] [--token ...]
```

Example:

```bash
npx vaultcore update folder/file.txt ./file.txt --content-type text/plain
```

### Read (GET)

Download an object to a local path. If `outPath` is omitted, the basename of the key is used in the current working directory.

```bash
npx vaultcore read <s3Key> [outPath] [--base-url ...] [--token ...]
```

Example:

```bash
npx vaultcore read folder/file.txt ./downloaded.txt
# or defaults to ./file.txt
npx vaultcore read folder/file.txt
```

### Delete (DELETE)

Delete an object by key.

```bash
npx vaultcore delete <s3Key> [--base-url ...] [--token ...]
```

Example:

```bash
npx vaultcore delete folder/file.txt
```

## Exit Codes

- `0`: Success
- Non-zero: An error occurred (details printed to stderr)

## License

Apache-2.0

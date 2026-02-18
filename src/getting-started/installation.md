# Installation

There are several ways to install enseal depending on your platform and preferences.

## From crates.io

If you have a Rust toolchain installed, the simplest method is to install directly from crates.io:

```bash
cargo install enseal
```

This downloads, compiles, and installs the latest published release. The binary is placed in `~/.cargo/bin/`, which should already be in your `PATH` if Rust is set up correctly.

## From source

To build from the latest source code:

```bash
git clone https://github.com/FlerAlex/enseal.git
cd enseal
cargo build --release
```

The compiled binary will be at `target/release/enseal`. You can copy it to a directory on your `PATH`:

```bash
cp target/release/enseal /usr/local/bin/
```

Building from source requires Rust 1.70 or later. Install Rust via [rustup](https://rustup.rs/) if you do not have it.

## Prebuilt binaries

Prebuilt binaries are available on the [GitHub Releases](https://github.com/FlerAlex/enseal/releases) page for the following platforms:

| Platform               | Architecture | Archive                              |
|------------------------|-------------|--------------------------------------|
| Linux                  | x86_64      | `enseal-x86_64-unknown-linux-musl.tar.gz`   |
| Linux                  | aarch64     | `enseal-aarch64-unknown-linux-musl.tar.gz`  |
| macOS (Intel)          | x86_64      | `enseal-x86_64-apple-darwin.tar.gz`         |
| macOS (Apple Silicon)  | aarch64     | `enseal-aarch64-apple-darwin.tar.gz`        |
| Windows                | x86_64      | `enseal-x86_64-pc-windows-msvc.zip`         |

Download the archive for your platform, extract it, and place the binary in a directory on your `PATH`.

**Linux / macOS example:**

```bash
# Download (replace URL with the latest release)
curl -LO https://github.com/FlerAlex/enseal/releases/latest/download/enseal-x86_64-unknown-linux-musl.tar.gz

# Extract
tar xzf enseal-x86_64-unknown-linux-musl.tar.gz

# Move to PATH
sudo mv enseal /usr/local/bin/
```

**Windows:**

Extract the `.zip` archive and add the directory containing `enseal.exe` to your system `PATH`, or move the executable to a directory that is already on your `PATH`.

## Verifying the installation

After installing, confirm that enseal is available:

```bash
enseal --version
```

You should see output like:

```
enseal 0.6.0
```

If the command is not found, verify that the installation directory is on your `PATH`.

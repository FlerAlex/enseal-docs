#!/bin/bash
# Build script for Cloudflare Pages
# Build command: bash build.sh
# Build output directory: book
set -euo pipefail

# Install mdbook
curl -sSL https://github.com/rust-lang/mdBook/releases/latest/download/mdbook-v0.5.2-x86_64-unknown-linux-gnu.tar.gz | tar -xz
chmod +x mdbook

# Build the book
./mdbook build

# Install and run pagefind
npx -y pagefind --site book

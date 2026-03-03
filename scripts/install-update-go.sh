#!/usr/bin/env sh
set -e

INSTALL_DIR="$HOME/local"
GO_DIR="$INSTALL_DIR/go"
TMP_DIR="$(mktemp -d)"

LATEST_VERSION=$(curl -s https://go.dev/VERSION?m=text | head -n 1)
LATEST_VERSION_NUMBER=${LATEST_VERSION#go}

echo "Latest go version available: $LATEST_VERSION"

if command -v go >/dev/null 2>&1; then
    CURRENT_VERSION=$(go version | awk '{print $3}')
    CURRENT_VERSION_NUMBER=${CURRENT_VERSION#go}
    echo "Current version installed: $CURRENT_VERSION"
else
    CURRENT_VERSION=""
    CURRENT_VERSION_NUMBER="none"
    echo "No Go installation found"
fi

if [ "$CURRENT_VERSION_NUMBER" = "$LATEST_VERSION_NUMBER" ]; then
    exit 0
fi

OS=$(uname | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
    x86_64) ARCH="amd64" ;;
    aarch64 | arm64) ARCH="arm64" ;;
esac

ARCHIVE="go${LATEST_VERSION_NUMBER}.${OS}-${ARCH}.tar.gz"
DOWNLOAD_URL="https://go.dev/dl/${ARCHIVE}"

echo "Downloading $DOWNLOAD_URL"
curl -L "$DOWNLOAD_URL" -o "$TMP_DIR/go.tar.gz"

echo "Installing to $GO_DIR"
rm -rf "$GO_DIR"
mkdir -p "$INSTALL_DIR"
tar -C "$INSTALL_DIR" -xzf "$TMP_DIR/go.tar.gz"

rm -rf "$TMP_DIR"

echo "Go $LATEST_VERSION_NUMBER installed in $GO_DIR"

ZSHRC="$HOME/.zshrc"
EXPORT_LINE='export PATH=$HOME/local/go/bin:$PATH'

if ! grep -Fxq "$EXPORT_LINE" "$ZSHRC" 2>/dev/null; then
    echo "$EXPORT_LINE" >> "$ZSHRC"
    echo "Added Go to PATH in $ZSHRC"
else
    echo "PATH already configured in $ZSHRC"
fi

echo ""
echo "run: source ~/.zshrc"

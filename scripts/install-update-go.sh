#!/usr/bin/env sh
set -e

INSTALL_DIR="$HOME/local"
GO_DIR="$INSTALL_DIR/go"
GOLANGCI_BIN_DIR="$INSTALL_DIR/bin"
TMP_DIR="$(mktemp -d)"

LATEST_VERSION=$(curl -s https://go.dev/VERSION?m=text | head -n 1)
LATEST_VERSION_NUMBER=${LATEST_VERSION#go}

echo "Latest go version available: $LATEST_VERSION"

if command -v go >/dev/null 2>&1; then
    CURRENT_VERSION=$(go version | awk '{print $3}')
    CURRENT_VERSION_NUMBER=${CURRENT_VERSION#go}
    echo "Current Go version installed: $CURRENT_VERSION"
else
    CURRENT_VERSION_NUMBER="none"
    echo "No Go found"
fi

if [ "$CURRENT_VERSION_NUMBER" != "$LATEST_VERSION_NUMBER" ]; then
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

    echo "Installing Go to $GO_DIR"
    rm -rf "$GO_DIR"
    mkdir -p "$INSTALL_DIR"
    tar -C "$INSTALL_DIR" -xzf "$TMP_DIR/go.tar.gz"

    echo "Go $LATEST_VERSION_NUMBER installed in $GO_DIR"
else
    echo "Go already up to date"
fi

GOLANGCI_BIN="$GOLANGCI_BIN_DIR/golangci-lint"

if [ -x "$GOLANGCI_BIN" ]; then
    CURRENT_GOLANGCI_VERSION=$( "$GOLANGCI_BIN" version | head -n1 | sed -n 's/.*version \([0-9.]*\).*/\1/p' )
    if [ -z "$CURRENT_GOLANGCI_VERSION" ]; then
        CURRENT_GOLANGCI_VERSION="unknown"
    fi
    echo "Current golangci-lint: v$CURRENT_GOLANGCI_VERSION"
else
    CURRENT_GOLANGCI_VERSION="none"
    echo "No golangci-lint found"
fi

LATEST_GOLANGCI_VERSION=$(curl -sSfL https://api.github.com/repos/golangci/golangci-lint/releases/latest | grep -o '"tag_name": "[^"]*"' | sed 's/.*tag_name": "v//;s/"$//' || echo "v2.10.1")
echo "Latest golangci-lint: $LATEST_GOLANGCI_VERSION"

if [ "$CURRENT_GOLANGCI_VERSION" != "${LATEST_GOLANGCI_VERSION#v}" ]; then
    echo "Installing golangci-lint to $GOLANGCI_BIN_DIR"
    rm -f "$GOLANGCI_BIN"
    mkdir -p "$GOLANGCI_BIN_DIR"
    curl -sSfL https://golangci-lint.run/install.sh | sh -s -- -b "$GOLANGCI_BIN_DIR" "$LATEST_GOLANGCI_VERSION"
    echo "golangci-lint $LATEST_GOLANGCI_VERSION installed"
else
    echo "golangci-lint up to date"
fi

ZSHRC="$HOME/.zshrc"
EXPORT_LINE='export PATH=$HOME/local/bin:$HOME/local/go/bin:$PATH'

if ! grep -Fxq "$EXPORT_LINE" "$ZSHRC" 2>/dev/null; then
    echo "$EXPORT_LINE" >> "$ZSHRC"
    echo "Added Go to PATH in $ZSHRC"
else
    echo "PATH already configured in $ZSHRC"
fi

rm -rf "$TMP_DIR"

echo ""
echo "run: source ~/.zshrc"

# install-update-go.sh

Installs/updates `go` and `golangci-lint` binaries to latest versions in `$HOME/local`

It is aimed for school computers, where sysadmins won't update the outdated system Go for dependencies reasons

### Usage

Every collaborators for this project work wih zsh so the script is focused for zsh users
```sh
chmod +x install-update-go.sh
./install-update-go.sh
source ~/.zshrc
```

### Verify

```sh
# as of the day of writing
go version    # go1.26.0
golangci-cli  # v2.10.1
```

# next script details if any (to delete)

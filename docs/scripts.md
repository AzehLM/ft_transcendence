# install-update-go.sh

Installs/updates `go` and `golangci-lint` binaries to latest versions in `$HOME/local`

It is aimed for school computers, where sysadmins won't update the outdated system Go for dependencies reasons

The sole purpose of this is for our dev environment. Our Go binaries will run inside Docker containers as microservices, but we need an up‑to‑date version of Go to test our progress locally while developing.

### Usage

Every collaborators for this project work with zsh so the script is focused for zsh users
```sh
chmod +x install-update-go.sh
./install-update-go.sh
source ~/.zshrc
```

### Verify

```sh
# as of the day of writing
go version    # go1.26.0
golangci-cli --version # v2.10.1
```

# npm install for frontend

## What is npm?

**npm** = Node Package Manager. It's a repository of reusable code libraries that the JavaScript community creates and shares. 
`npm install` reads your `package.json` and downloads all the libraries your React project needs (React, TypeScript, Vite, Zustand, Axios, etc).

## install npm once :

```sh
# Using fnm (Fast Node Manager) - no sudo needed
curl -fsSL https://fnm.io/install | bash
source ~/.zshrc

# Install Node.js
fnm install --latest
fnm use latest
```

Verify installation:
```sh
node --version
npm --version
```

Navigate to the frontend folder and run:

```sh
cd frontend
npm install
```

This will:
1. Read `package.json` 
2. Download all required libraries
3. Create `node_modules/` folder (is not being pushed to Git btw)

**You only run `npm install` ONCE per machine.** After that, all your npm scripts work:
- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run lint` - Check code quality 



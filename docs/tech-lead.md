# Technical Lead / Architect:

Oversees technical decisions and architecture.
- Defines technical architecture.
- Makes technology stack decisions.
- Ensures code quality and best practices.
- Reviews critical code changes.

---

### Tech lead / architect personal readme to track done work related to the role

---

#### Architecture choices:

- technologies choisies
- descriptif + comparatif entre techno vues/choisies/eliminées
- ci/cd intégré
- outils 'quality check' vu/utilisé/intégré

## Technical architecture choice

### Builder

- Building the project via a **Makefile** as it fits quite well our needs:
  - **Universally available** on Linux without any installation
    - No need external dependency compared to `just` or `task`
  - **Single entry point** for contributors
    - `make dev`, `make up` are enough to launch fully fonctionnal builds
  - **Microservices by design**
    - the `SERVICES` is auto-declared via `docker compose config --services`, so adding new services to the compose file also exposes them to the Makefile with no changes required
  - **Launching scripts** and/or shell commands to set up the environment
    - Technology version updating, downloading and installing dependencies, etc...
  - **Modularity** with differents sets of variable and rules
    - Development mode is straight forward to be used as dependencies can be declared in variables which makes isolation easy to read
  - **CI/CD integration**
    - GitHub Actions workflows stays minimal and readable by delegating to Makefile targets. The logic is defined once and is versioned with the code.


### Edge Gateway

> Not 100% defined but I'm committing a first choice

- Choosed **Caddy** as main edge gateway or reverse proxy/load balancer for its features and as reference of our backend Go choice. Caddy has also a large amount of community built **plugins** that we might want to use. Here are some features we'll use Caddy for:
  - **Traffic routing** - takes requests and forwards them to our dockerized services
  - **Load balancing** - distributes traffic across multiple service instances
  - **Automatic TLS termination** - automatic HTTPS certificates (via Let's Encrypt) with HTTP to HTTPS redirects and no manual certificates renewals
  - **Security Headers** - CSP (Content Security Policy), HSTS (HTTP Strict Transport Security) and external plugins for XSS mitigation
  - **Single Entrypoint** - is the solely entrypoint of communication with our webapp, everything goes throught Caddy first, it acts as the public front door
  - **Monitoring Integration** - Native Prometheus metrics endpoint (via the `/metrics` route)

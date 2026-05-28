*This project has been created as part of the 42 curriculum by lbuisson, vicperri, pnaessen, gueberso.*

# Description

### Ostrom

**Ostrom** is a zero-knowledge, end-to-end encrypted cloud storage platform. Users can store files in a personal space or collaborate within shared organizational spaces, with role-based access control.

The project is named after economist Elinor Ostrom, the first woman to receive the Nobel Memorial Prize in Economic Sciences, awarded for her analysis of economic governance - particularly the governance of shared common resources. The name reflects the platform's core: enabling individuals and groups to manage shared resources securely and collaboratively.

Its defining principle is that the server never sees plaintext. All files are encrypted client-side before upload, so neither the infrastructure nor its operators can read user data. This zero-knowledge design is the project's primary differentiator.

# Instructions

## Prerequisites

- **Docker engine** >= 24.0
- **Docker compose** v2
- **GNU Make**

The entire stack runs in Docker containers — no local Go, Node, or database toolchain is required.

## Configuration

The project relies on a `.env` file and a set of Docker secrets for credentials stored under `secrets/`. You can generate these secrets randomly with:

```bash
make setup
```

This will:
- Create a `.env` from `.env.example` (if it doesn't already exist)
- Generate the auto-generatable secrets (DB credentials, MinIO credentials, etc.) with random values

> ⚠️ **All secrets must exists** even if empty. Docker compose references ever secret at startup, so a missing file will cause the stack to fail - in **both dev and prod mode**.

A few secrets cannot be generated, as they depend on external services. `make setup` creates them as empty files; fill them manually if you need the following features:
- `cloudflare_tunnel_token` - Cloudflare tunnel if you want the application deployed on your own domain name.
- `discord_webhook_url` - for Alertmanager alerting features.

**Expected folder structure**

```bash
tree
```
 ⚠️ a modifier plus tard pour mettre le vrai tree partant du root et ne montrant que le .env et .env.example + secrets/ et les sous-dossiers


## Running the project
Two available modes:

| Mode | Command | Notes |
|:----:|:----:|:----|
| Development | `make dev`| Includes Adminer (DB UI), relaxed infrastructure constraints, served at http://localhost:{PORT} |
| Production | `make prod`| Hardened setup, adminer, minio, prometheus services not accessible unless locally |

To stop and/or cleanup
```sh
make down			# down every containers
make db-reset		# reset postgres database
make minio-reset	# delete every minio objects
make fclean			# deletes every container/images/volumes
```

Usage of Makefile that calls docker-compose, 2 differents mode, prod/dev. dev mode has few more things such as adminer and less constraints in the infrastructure setup/rules, its more lax
prerequisites are make/docker/ a .env (can be created via Makefile for random credentials), secrets as well except for few secrets (cloudflare/discord_webhook for example cannot be randomly generated)

- Contain relevant information about compilation, installation, and/or execution
- Should include prerequisites (software, tools, versions, configuration like .env/secrets) + step-by-step instructions to run the project
  - Include secrets handling + schema of what the folder structure should look like
# Resources

- Listing classic references related to the topic (documentation, articles, tutorials, etc), as well as a descripion of AI usage (specifying which tasks and which parts of the project)

# Additional sections

# Team information

- For each member we need:
  - Assigned roles + brief description of their responsibilities

# Project Management

- How the team organized the work (task distribution, meetings, etc)
- Tools used for the project management (Github Issues, Github Project, Notion, Discord bots)
- Communication channels (Discord)

# Technical Stack

- Frontend techno and frameworks used
- Backend techno and frameworks used
- Database system and why it was chosen
- Any other significan technologies or libraries
- Justitication for major technical choices

# Database Schema

- Visual representation or description of the DB structure
- Tables/collections and their relationships
- Key fields and data types

# Features List

- Complet list of implemented features
- Which team member(s) worked on each features
- Brief descritioon of each feature's functionality

# Modules

- list of all chosen modules (major and minor)
- Point calculation
- **Justification for each module choice**
- How each module was implemented
- Which tesm member worked on each module

# Individual contribution

- Detailed breakdown of what each team member contributed
- Specific features, modules, or componenets implemented by each person
- Any challenges faced and how they were overcome

## Other informations such as:

- Known limitations, credits

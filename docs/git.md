# Git Workflow
## Git Branch Nomenclature
### Branches (main and supporting)

This project follows a structured Git branch naming convention to keep the workflow clean, readable, and scalable.

- `main` : Production-ready code, always stable, protected branch (no direct commits)
- `dev`: Intagration branch (base for feature development)
- `feat/<short-description>` : New features
- `bugfix/<short-description>`
    * Non-critical bug fixes
    * Created from `develop`and merge back to `develop`via PR
- `hotfix/<short-description>`
    * Critical fixes applied directly to production
    * Created from `main`
- `refactor/<short-description>` : Code improvements without changing functionality
- `docs/<short-description>` : Documentation updates only

---

### Optional Branch Types

- `chore/<short-description>` : Maintenance tasks (dependencies, configs, tooling)
- `test/<short-description>` : Adding or improving tests
- `style/<short-description>` : Formatting, linting, non-functional style changes
- `perf/<short-description>` : Performance improvements

---

### Naming Rules

- Use lowercase
- Use hyphens (`-`) to separate words
- Keep descriptions short but meaningful
- Use format: ```<type>/<short-description>```

---

## Git Commit Nomenclature
### Format
- `<type>(optional-scope): short description`
- Exemple: 
```
feat(auth): add JWT token validation

Implement access and refresh token verification.
Adds middleware to protect private routes.

```

---

### Commit Types

- `feat` : A new feature
- `fix` : A bug fix
- `docs` : Documentation only changes
- `style` : Formatting, missing semicolons, lint fixes (no logic changes)
- `refactor` : Code changes that neither fix a bug nor add a feature
- `perf` : Performance improvements
- `test` : Adding or updating tests
- `ci` : Changes to CI/CD configuration
- `chore` : Maintenance tasks (dependencies, configs, tooling)
- `build` : Changes affecting build system or dependencies
- `revert` : Reverts a previous commit

---

### Writing Good Commit Messages

- Kepp the Subject line:

    * Short (50 characters or less)
    * In present tense
    * Lowercase
    * No trailing period

- Use the body when:

    * Explaining *why* the change was made
    * Describing important implementation details
    * Noting breaking changes

- Footer (Optional):

    * Reference issues: `Closes #123`


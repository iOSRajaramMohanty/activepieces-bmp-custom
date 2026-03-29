# Project Organization

This document describes the organization of project files and directories.

## Directory Structure

### `/docs/project/`
Contains all project-specific documentation, implementation guides, and summaries for custom features and changes.

**Key Documents:**
- Super Admin features documentation
- Multi-tenancy guides
- Pieces build guides
- Service management documentation
- Implementation summaries

See `docs/project/README.md` for a complete list.

### `/scripts/`
Contains helpful shell scripts for managing and developing the project.

**Available Scripts:**
- Service management: `restart-all.sh`, `stop-all.sh`, `check-status.sh`, `run-dev.sh`
- Development tools: `build-pieces.sh`, `show-build-commands.sh`, `quick-start.sh`
- Configuration: `toggle-multi-tenant.sh`, `validate-super-admin.sh`, `view-all-admins.sh`

See `scripts/README.md` for detailed usage instructions.

#### Role of `run-dev.sh`

The `run-dev.sh` script is the **primary development environment setup script**. It plays a crucial role in:

1. **Environment Configuration**
   - Loads all environment variables from `.env` file
   - Configures database connection (PostgreSQL)
   - Configures Redis connection
   - Sets encryption keys and JWT secrets
   - Configures multi-tenancy mode
   - Sets up custom pieces (e.g., ADA BMP)

2. **Development Server Startup**
   - Kills any existing development servers
   - Loads Node.js version manager (nvm) and uses Node v22
   - Optionally builds community pieces before starting
   - Starts the development server using `npm run dev`

3. **Key Features**
   - **Environment File Based**: All configuration is now managed through `.env` file (see below)
   - **Multi-Tenancy Control**: Configures `AP_MULTI_TENANT_MODE` to enable/disable multi-tenant functionality
   - **Custom Pieces**: Supports development of custom pieces via `AP_DEV_PIECES`
   - **Piece Building**: Can automatically build pieces on startup (configurable)
   - **Webhook Configuration**: Sets up webhook secrets for integrations like Slack

**Usage:**
```bash
# Start development server with all environment variables from .env file
./scripts/run-dev.sh
```

**Note:** Environment variables are now managed in the `.env` file. Edit `.env` to modify development environment settings. The script will automatically load all variables from this file.

### Environment Configuration (`.env` file)

All environment variables for local development are now managed through a `.env` file in the project root.

**Setup:**
```bash
# Copy the example file to create your .env file
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

**Key Configuration Sections:**
- **Core Configuration**: Edition, environment type
- **Multi-Tenancy**: Enable/disable multi-tenant mode
- **Database**: PostgreSQL connection settings
- **Redis**: Redis connection settings
- **Security**: Encryption keys and JWT secrets
- **Custom Pieces**: ADA BMP and other custom piece configurations
- **Webhooks**: Frontend URL and webhook secrets

**Files:**
- `.env` - Your local environment configuration (not committed to git)
- `.env.example` - Template file with all available variables (committed to git)

**Important:**
- The `.env` file is in `.gitignore` and will not be committed
- Never commit sensitive values (passwords, secrets) to version control
- Use `.env.example` as a template for team members
- The `run-dev.sh` script automatically loads variables from `.env`

### `/tools/`
Contains build tools and deployment scripts (existing structure).

### `/docs/`
Contains official project documentation (MDX files for the documentation site).

## Usage

All scripts should be run from the project root:

```bash
# Example: Restart all services
./scripts/restart-all.sh

# Example: Check service status
./scripts/check-status.sh

# Example: Build a piece
./scripts/build-pieces.sh slack
```

## Migration Notes

- Scripts previously in the root directory have been moved to `/scripts/`
- Project documentation has been moved to `/docs/project/`
- All script references in documentation have been updated to use `./scripts/` prefix
- Standard files (README.md, CONTRIBUTING.md, SECURITY.md, LICENSE) remain in root

## Last Updated

This organization was completed to keep the project root clean and well-organized.

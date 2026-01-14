# Scripts Directory

This directory contains helpful shell scripts for managing and developing the Activepieces project.

## Available Scripts

### Service Management
- **`restart-all.sh`** - Restart both backend and frontend services
- **`stop-all.sh`** - Stop all running services
- **`check-status.sh`** - Check the status of all services
- **`run-dev.sh`** - Start the development server with proper environment configuration

### Development Tools
- **`build-pieces.sh`** - Build community pieces (all, common, or specific piece)
- **`show-build-commands.sh`** - Display available build commands
- **`quick-start.sh`** - Quick start script for development setup
- **`start-ada-bmp.sh`** - Start ADA BMP piece development
- **`run-dev.sh`** - Start development server (loads environment from `.env` file)

### Configuration & Management
- **`toggle-multi-tenant.sh`** - Toggle multi-tenant mode on/off
- **`validate-super-admin.sh`** - Validate super admin configuration
- **`view-all-admins.sh`** - View all admin users

## Usage

All scripts should be run from the project root directory:

```bash
# Example: Restart all services
./scripts/restart-all.sh

# Example: Check service status
./scripts/check-status.sh

# Example: Build a specific piece
./scripts/build-pieces.sh slack
```

## Environment Configuration

The `run-dev.sh` script loads environment variables from a `.env` file in the project root.

**Setup:**
```bash
# Copy the example file to create your .env file
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

**Important:**
- The `.env` file is in `.gitignore` and will not be committed
- Never commit sensitive values (passwords, secrets) to version control
- Use `.env.example` as a template for team members
- The `run-dev.sh` script automatically loads variables from `.env`

## Notes

- Scripts are designed to be run from the project root
- Most scripts include helpful output and error messages
- Check individual script files for detailed usage instructions
- Environment variables are managed in `.env` file (not in scripts)
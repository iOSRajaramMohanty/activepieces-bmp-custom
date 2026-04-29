---
name: BMP Validation Status
overview: Summary of validated features, pending validations, and core file modifications for the BMP code separation project.
todos: []
isProject: false
---

# BMP Validation and File Change Summary

## Validated Features (Completed)

### Backend API Validation


| Feature                                                  | Status    | Notes                                                          |
| -------------------------------------------------------- | --------- | -------------------------------------------------------------- |
| Server startup with `AP_BMP_ENABLED=true`                | Validated | BMP modules registered correctly                               |
| Server startup with `AP_BMP_ENABLED=false`               | Validated | Core runs without BMP                                          |
| Organization API (`/v1/organizations`)                   | Validated | CRUD operations working                                        |
| Organization Environments API                            | Validated | Environment metadata (ADA_BMP_API_URL) working                 |
| Super Admin API (`/v1/super-admin`)                      | Validated | Tenant management working                                      |
| Account Switching API                                    | Validated | SUPER_ADMIN to OWNER, OWNER to ADMIN switching                 |
| Auto-provision API (`/v1/authentication/auto-provision`) | Validated | SDK authentication working                                     |
| App Connections API                                      | Validated | BMP connections with environment metadata                      |
| Piece Options API (`/v1/pieces/options`)                 | Validated | Fixed `organizationEnvironmentMetadata` propagation to sandbox |


### Frontend Validation


| Feature                   | Status | Notes |
| ------------------------- | ------ | ----- |
| SUPER_ADMIN default route |        |       |



# Activepieces License Compliance Documentation

> **Reference**: [Official License Documentation](https://www.activepieces.com/docs/about/license)  
> **Repository**: [activepieces/activepieces](https://github.com/activepieces/activepieces)

This document maps the Activepieces dual-licensing model to this codebase and provides guidance for compliance when using, modifying, or distributing the software.

---

## 1. License Summary

| Component | License | Usage Terms |
|-----------|---------|-------------|
| **Core / Community Edition** | MIT (Expat) | Free to use, modify, and distribute. Include license notice when distributing. |
| **Enterprise / Cloud** | Commercial (packages/ee/LICENSE) | Requires valid Activepieces license for self-hosted production use. |
| **Third-party components** | Original licenses | Each component retains its original license. |

---

## 2. License Boundaries in the Codebase

### 2.1 MIT License (Community Edition)

Content **outside** the following directories is under the MIT license:

- Root `LICENSE` file defines MIT for all content except:
  - `packages/ee/` (if exists)
  - `packages/server/api/src/app/ee/` (if exists)

**MIT-licensed areas include:**
- `packages/shared/` – shared types, utilities
- `packages/pieces/` – community pieces, piece framework
- `packages/engine/` – workflow execution engine
- `packages/react-ui/` – frontend (with MIT dependencies)
- `packages/server/api/src/app/` – except `ee/` subfolder
- `packages/tests-e2e/`, `tools/`, `scripts/`, etc.

### 2.2 Commercial License (Enterprise Edition)

Content under these paths is under the Commercial License defined in `packages/ee/LICENSE`:

#### `packages/ee/`

| Path | Purpose |
|------|---------|
| `packages/ee/shared/` | EE shared types, billing, auth, templates, signing keys, OTP |
| `packages/ee/ui/embed-sdk/` | Embed SDK for product embedding |

#### `packages/server/api/src/app/ee/`

| Path | Purpose |
|------|---------|
| `ee/alerts/` | Alerts service |
| `ee/api-keys/` | API key management |
| `ee/authentication/` | Enterprise auth (SSO/SAML, federated auth, local auth) |
| `ee/license-keys/` | License key validation and enforcement |
| `ee/signing-key/` | Signing key management |
| `ee/platform/` | Platform plans, admin, templates |
| `ee/projects/` | Project roles, releases, members, Git sync |
| `ee/template/` | Platform template service |
| `ee/users/` | User module (EE) |
| `ee/oauth-apps/` | OAuth app management |
| `ee/custom-domains/` | Custom domains |
| `ee/global-connections/` | Global connection module |
| `ee/connection-keys/`, `ee/app-credentials/` | Connection/app credentials |
| `ee/audit-logs/` | Audit event service |
| `ee/platform-webhooks/` | Platform webhooks |
| `ee/managed-authn/` | Managed authentication |

---

## 3. Edition Selection and Behavior

The edition is controlled by the `AP_EDITION` environment variable (default: `ce`).

| Value | Edition | EE Modules Loaded | License Requirement |
|-------|---------|-------------------|---------------------|
| `ce` | Community | No | None (MIT only) |
| `ee` | Enterprise | Yes | Valid Activepieces license required for production |
| `cloud` | Cloud | Yes (full set) | Cloud-hosted; license managed by Activepieces |

**Relevant code:**
- `packages/shared/src/lib/flag/flag.ts`: `ApEdition` enum (`ce`, `ee`, `cloud`)
- `packages/server/api/src/app/helper/system/system.ts`: `AP_EDITION` default `ce`
- `packages/server/api/src/app/app.ts`: EE modules registered only for `ee` and `cloud`

---

## 4. Enterprise License Enforcement

### 4.1 License Key Flow

1. **Verification**: `packages/server/api/src/app/ee/license-keys/license-keys-controller.ts` exposes `/verify` endpoint.
2. **Validation**: `license-keys-service.ts` checks keys and applies limits.
3. **Trial tracking**: `license-keys-module.ts` runs periodic jobs to validate keys and downgrade expired trials.

### 4.2 Production Use of Enterprise Features

From the official documentation:

> Using the enterprise features (under the packages/ee and packages/server/api/src/app/ee folder) with a self-hosted instance **requires an Activepieces license**.

**Contact for licensing:** [sales@activepieces.com](mailto:sales@activepieces.com)

### 4.3 Development and Testing

From `packages/ee/LICENSE`:

> Notwithstanding the foregoing, you may copy and modify the Software for **development and testing purposes**, without requiring a subscription.

---

## 5. Project-Specific Notes (This Fork)

This project appears to be a fork (e.g. `feature/bmp-integration`) with customizations including:

- **ADA BMP Piece**: Custom piece at `packages/pieces/custom/ada-bmp/` – remains MIT (community pieces).
- **Custom integrations**: Organization, authentication, and connection-related changes – review if they touch EE modules.

### 5.1 License Checklist for This Fork

- [ ] **Community Edition (CE)**: Using `AP_EDITION=ce` (default) – only MIT code is used; no license needed.
- [ ] **Enterprise Edition (EE)**: If `AP_EDITION=ee` or `cloud` in production – obtain a valid license from Activepieces.
- [ ] **Distribution**: When redistributing, include:
  - Root `LICENSE` file
  - `packages/ee/LICENSE` if EE code is included
  - Third-party license notices as required

---

## 6. License Compliance Validation

To validate your code changes against MIT/EE license terms, run:

```bash
./scripts/validate-license-compliance.sh
```

See [SECURITY_AND_COMPLIANCE_VALIDATION.md §1.6](./SECURITY_AND_COMPLIANCE_VALIDATION.md#16-validating-your-code-changes-license-compliance) for details.

---

## 7. Compliance Checklist

| Action | Requirement |
|--------|-------------|
| Use Community Edition only | Use `AP_EDITION=ce`; no license required |
| Use Enterprise features self-hosted | Obtain license from sales@activepieces.com |
| Modify and redistribute core (MIT) | Include MIT license notice |
| Modify and redistribute EE code | Subject to `packages/ee/LICENSE`; contact Activepieces |
| Contribute back | Follow [CONTRIBUTING.md](../CONTRIBUTING.md) and project guidelines |

---

## 8. References

- [Security & Compliance Validation](./SECURITY_AND_COMPLIANCE_VALIDATION.md) – Pre-adoption security and compliance validation
- [Official License Page](https://www.activepieces.com/docs/about/license)
- [Editions Comparison](https://www.activepieces.com/docs/about/editions) (or [pricing](https://www.activepieces.com/pricing))
- Root [LICENSE](../LICENSE)
- [packages/ee/LICENSE](../packages/ee/LICENSE)
- [Run EE (Handbook)](./handbook/engineering/playbooks/run-ee.mdx)

---

*Last updated: February 2025*
test

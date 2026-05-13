---
name: Salesforce piece documentation
overview: Create a comprehensive Mintlify MDX documentation page for the Salesforce piece, covering all 27 actions, 9 triggers, authentication setup, and use cases.
todos:
  - id: create-salesforce-mdx
    content: Create `docs/pieces/salesforce.mdx` with full Mintlify MDX content covering auth, all 27 actions, 9 triggers, and use cases
    status: completed
  - id: update-docs-nav
    content: Add the new Salesforce page to `docs/docs.json` navigation config
    status: completed
isProject: false
---

# Salesforce Piece Documentation

## Context

The Salesforce piece (`packages/pieces/community/salesforce/`) provides **27 actions** and **9 triggers** via OAuth2 authentication. Currently there is **no per-connector documentation page** in the docs site -- piece docs link out to `https://www.activepieces.com/pieces`. The existing docs use Mintlify MDX format with YAML frontmatter, configured via [docs/docs.json](docs/docs.json).

## What to create

A new file at `**docs/pieces/salesforce.mdx`** in Mintlify MDX format. This page will serve as a comprehensive reference for what users can achieve with the Salesforce piece.

## Page structure

The doc will be organized into these sections:

### 1. Frontmatter + Introduction

- Title, description, icon
- Brief overview of the Salesforce integration and its purpose (CRM automation)

### 2. Authentication

- OAuth2 connection setup
- Supported Salesforce domains (`login.salesforce.com`, `test.salesforce.com`, My Domain)
- Required scopes (`refresh_token`, `full`, `api`)

### 3. Actions (grouped by domain)

**Contact Management**

- Create Contact -- create a new contact with name, email, phone, account, and custom fields
- Update Contact -- update an existing contact's fields
- Find Record -- search for records by a specific field value
- Find Records by Query -- advanced SOQL WHERE clause search

**Lead Management**

- Create Lead -- create a new lead with company, name, email, source
- Update Lead -- update an existing lead's fields
- Add Lead to Campaign -- associate a lead with a campaign and set member status

**Opportunity Management**

- Create Opportunity -- create with name, close date, stage, account, amount
- Delete Opportunity -- remove an opportunity by ID

**Case Management**

- Create Case -- create with subject, description, status, priority, origin, account, contact

**Campaign Management**

- Add Contact to Campaign -- associate a contact with a campaign
- Add Lead to Campaign -- (listed above in Leads)

**Task Management**

- Create Task -- create tasks with subject, owner, status, priority, related records

**Communication**

- Send Email -- send an email through Salesforce to a contact or lead

**File and Attachment Management**

- Add File to Record -- attach a file to any record (ContentVersion)
- Create Attachment -- create a legacy attachment on a record
- Create Note -- add a note to a record
- Get Record Attachments -- retrieve both classic attachments and files for a record

**Reporting**

- Run Report -- execute a Salesforce report with optional filters, get structured row data
- Export Report -- export a report as an Excel file

**Generic Record Operations**

- Create Record -- create any Salesforce object with JSON data
- Update Record -- update any object by ID with JSON data
- Delete Record -- delete any object by ID
- Find Record -- search any object by field
- Find Records by Query -- advanced WHERE clause search on any object
- Find Child Records -- retrieve child relationship records for a parent

**Advanced / Bulk Operations**

- Upsert by External ID -- batch upsert up to 200 records via composite API
- Bulk Upsert -- upsert large datasets via Bulk API v58 with CSV input
- Run Query -- execute arbitrary SOQL queries
- Custom API Call -- make any HTTP request to the Salesforce REST API

### 4. Triggers

- **New Contact** -- fires when a new contact is created
- **New Lead** -- fires when a new lead is created
- **New Record** -- fires when a new record of a chosen object is created (supports conditions)
- **New or Updated Record** -- fires when a record is created or modified (supports conditions)
- **New Case in Queue** -- fires when a case is assigned to a specific queue
- **New Case Attachment** -- fires when a new attachment or file is added to a case
- **New or Updated File** -- fires when a ContentDocument is created or updated
- **New Field History** -- fires when a tracked field changes on a chosen object
- **New Outbound Message** -- webhook trigger for Salesforce Outbound Messaging (SOAP/XML)

### 5. Common Use Cases

- Practical automation scenarios users can build (e.g., "sync new leads to a spreadsheet", "auto-create tasks when a case is opened", "export weekly reports")

## Navigation update

Add the new page to [docs/docs.json](docs/docs.json) navigation, likely under a new "Pieces" group or as a standalone reference.
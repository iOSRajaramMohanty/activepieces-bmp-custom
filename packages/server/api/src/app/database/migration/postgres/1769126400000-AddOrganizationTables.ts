import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrganizationTables1769126400000 implements MigrationInterface {
    name = 'AddOrganizationTables1769126400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create organization table
        await queryRunner.query(`
            CREATE TABLE "organization" (
                "id" character varying(21) NOT NULL,
                "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "name" character varying NOT NULL,
                "platformId" character varying(21) NOT NULL,
                "metadata" jsonb,
                CONSTRAINT "pk_organization" PRIMARY KEY ("id")
            )
        `)

        // Create organization_environment table
        await queryRunner.query(`
            CREATE TABLE "organization_environment" (
                "id" character varying(21) NOT NULL,
                "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "organizationId" character varying(21) NOT NULL,
                "environment" character varying NOT NULL,
                "adminUserId" character varying(21),
                "projectId" character varying(21),
                "platformId" character varying(21) NOT NULL,
                CONSTRAINT "pk_organization_environment" PRIMARY KEY ("id")
            )
        `)

        // Add indexes for organization
        await queryRunner.query(`
            CREATE INDEX "idx_organization_platform_id" ON "organization" ("platformId")
        `)

        await queryRunner.query(`
            CREATE UNIQUE INDEX "idx_organization_platform_id_name" 
            ON "organization" ("platformId", "name")
        `)

        // Add indexes for organization_environment
        await queryRunner.query(`
            CREATE INDEX "idx_org_env_organization_id" 
            ON "organization_environment" ("organizationId")
        `)

        await queryRunner.query(`
            CREATE UNIQUE INDEX "idx_org_env_unique" 
            ON "organization_environment" ("organizationId", "environment")
        `)

        await queryRunner.query(`
            CREATE INDEX "idx_org_env_admin_user_id" 
            ON "organization_environment" ("adminUserId")
        `)

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "organization" 
            ADD CONSTRAINT "fk_organization_platform_id" 
            FOREIGN KEY ("platformId") REFERENCES "platform"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE
        `)

        await queryRunner.query(`
            ALTER TABLE "organization_environment" 
            ADD CONSTRAINT "fk_org_env_organization_id" 
            FOREIGN KEY ("organizationId") REFERENCES "organization"("id") 
            ON DELETE CASCADE ON UPDATE CASCADE
        `)

        await queryRunner.query(`
            ALTER TABLE "organization_environment" 
            ADD CONSTRAINT "fk_org_env_admin_user_id" 
            FOREIGN KEY ("adminUserId") REFERENCES "user"("id") 
            ON DELETE SET NULL ON UPDATE CASCADE
        `)

        await queryRunner.query(`
            ALTER TABLE "organization_environment" 
            ADD CONSTRAINT "fk_org_env_project_id" 
            FOREIGN KEY ("projectId") REFERENCES "project"("id") 
            ON DELETE SET NULL ON UPDATE CASCADE
        `)

        // Add organizationId to user table
        await queryRunner.query(`
            ALTER TABLE "user" 
            ADD "organizationId" character varying(21)
        `)

        await queryRunner.query(`
            CREATE INDEX "idx_user_organization_id" ON "user" ("organizationId")
        `)

        await queryRunner.query(`
            ALTER TABLE "user" 
            ADD CONSTRAINT "fk_user_organization_id" 
            FOREIGN KEY ("organizationId") REFERENCES "organization"("id") 
            ON DELETE SET NULL ON UPDATE CASCADE
        `)

        // Add organizationId to project table
        await queryRunner.query(`
            ALTER TABLE "project" 
            ADD "organizationId" character varying(21)
        `)

        await queryRunner.query(`
            CREATE INDEX "idx_project_organization_id" ON "project" ("organizationId")
        `)

        await queryRunner.query(`
            ALTER TABLE "project" 
            ADD CONSTRAINT "fk_project_organization_id" 
            FOREIGN KEY ("organizationId") REFERENCES "organization"("id") 
            ON DELETE SET NULL ON UPDATE CASCADE
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys and columns from project
        await queryRunner.query(`
            ALTER TABLE "project" DROP CONSTRAINT "fk_project_organization_id"
        `)
        await queryRunner.query(`
            DROP INDEX "idx_project_organization_id"
        `)
        await queryRunner.query(`
            ALTER TABLE "project" DROP COLUMN "organizationId"
        `)

        // Drop foreign keys and columns from user
        await queryRunner.query(`
            ALTER TABLE "user" DROP CONSTRAINT "fk_user_organization_id"
        `)
        await queryRunner.query(`
            DROP INDEX "idx_user_organization_id"
        `)
        await queryRunner.query(`
            ALTER TABLE "user" DROP COLUMN "organizationId"
        `)

        // Drop foreign keys from organization_environment
        await queryRunner.query(`
            ALTER TABLE "organization_environment" 
            DROP CONSTRAINT "fk_org_env_project_id"
        `)
        await queryRunner.query(`
            ALTER TABLE "organization_environment" 
            DROP CONSTRAINT "fk_org_env_admin_user_id"
        `)
        await queryRunner.query(`
            ALTER TABLE "organization_environment" 
            DROP CONSTRAINT "fk_org_env_organization_id"
        `)

        // Drop organization_environment table
        await queryRunner.query(`
            DROP INDEX "idx_org_env_admin_user_id"
        `)
        await queryRunner.query(`
            DROP INDEX "idx_org_env_unique"
        `)
        await queryRunner.query(`
            DROP INDEX "idx_org_env_organization_id"
        `)
        await queryRunner.query(`
            DROP TABLE "organization_environment"
        `)

        // Drop foreign keys from organization
        await queryRunner.query(`
            ALTER TABLE "organization" DROP CONSTRAINT "fk_organization_platform_id"
        `)

        // Drop organization table
        await queryRunner.query(`
            DROP INDEX "idx_organization_platform_id_name"
        `)
        await queryRunner.query(`
            DROP INDEX "idx_organization_platform_id"
        `)
        await queryRunner.query(`
            DROP TABLE "organization"
        `)
    }
}

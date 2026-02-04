import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Add Dev, Staging, Production organization_environment records for organizations
 * that don't have them yet. This backfills old organizations (e.g. DEMO) so admins
 * can configure environment metadata without manually clicking "Setup Dev, Staging, Prod".
 */
export class AddMissingOrganizationEnvironments1769127700000 implements MigrationInterface {
    name = 'AddMissingOrganizationEnvironments1769127700000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO "organization_environment" (id, created, updated, "organizationId", environment, "platformId", metadata)
            SELECT
                substring(replace(gen_random_uuid()::text, '-', ''), 1, 21),
                now(),
                now(),
                o.id,
                env.env,
                o."platformId",
                '{}'::jsonb
            FROM "organization" o
            CROSS JOIN (VALUES ('Dev'), ('Staging'), ('Production')) AS env(env)
            WHERE NOT EXISTS (
                SELECT 1 FROM "organization_environment" oe
                WHERE oe."organizationId" = o.id AND oe.environment = env.env
            )
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Data backfill: cannot reliably identify inserted rows for reversal.
        // Admins may have configured metadata on these records. No-op for safety.
    }
}

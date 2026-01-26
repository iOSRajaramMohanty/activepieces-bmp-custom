import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMetadataToOrganizationEnvironment1769127500000 implements MigrationInterface {
    name = 'AddMetadataToOrganizationEnvironment1769127500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add metadata column to organization_environment table
        await queryRunner.query(`
            ALTER TABLE "organization_environment"
            ADD COLUMN "metadata" jsonb
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove metadata column from organization_environment table
        await queryRunner.query(`
            ALTER TABLE "organization_environment"
            DROP COLUMN "metadata"
        `)
    }
}

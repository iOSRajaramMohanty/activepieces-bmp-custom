import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddProjectIdToOrganization1769127600000 implements MigrationInterface {
    name = 'AddProjectIdToOrganization1769127600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "organization"
            ADD COLUMN "projectId" character varying(21)
        `)

        await queryRunner.query(`
            CREATE INDEX "idx_organization_project_id" ON "organization" ("projectId")
        `)

        await queryRunner.query(`
            ALTER TABLE "organization"
            ADD CONSTRAINT "fk_organization_project_id"
            FOREIGN KEY ("projectId") REFERENCES "project"("id")
            ON DELETE SET NULL ON UPDATE CASCADE
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "organization" DROP CONSTRAINT "fk_organization_project_id"
        `)
        await queryRunner.query(`
            DROP INDEX "idx_organization_project_id"
        `)
        await queryRunner.query(`
            ALTER TABLE "organization" DROP COLUMN "projectId"
        `)
    }
}

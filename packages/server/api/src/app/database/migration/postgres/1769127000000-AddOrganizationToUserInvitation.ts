import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOrganizationToUserInvitation1769127000000 implements MigrationInterface {
    name = 'AddOrganizationToUserInvitation1769127000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_invitation" 
            ADD "organizationId" character varying(21)
        `)

        await queryRunner.query(`
            ALTER TABLE "user_invitation" 
            ADD "environment" character varying
        `)

        await queryRunner.query(`
            CREATE INDEX "idx_user_invitation_organization_id" 
            ON "user_invitation" ("organizationId")
        `)

        await queryRunner.query(`
            ALTER TABLE "user_invitation" 
            ADD CONSTRAINT "fk_user_invitation_organization_id" 
            FOREIGN KEY ("organizationId") REFERENCES "organization"("id") 
            ON DELETE SET NULL ON UPDATE CASCADE
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_invitation" 
            DROP CONSTRAINT "fk_user_invitation_organization_id"
        `)

        await queryRunner.query(`
            DROP INDEX "idx_user_invitation_organization_id"
        `)

        await queryRunner.query(`
            ALTER TABLE "user_invitation" DROP COLUMN "environment"
        `)

        await queryRunner.query(`
            ALTER TABLE "user_invitation" DROP COLUMN "organizationId"
        `)
    }
}

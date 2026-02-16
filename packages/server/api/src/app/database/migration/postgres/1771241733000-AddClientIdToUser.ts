import { MigrationInterface, QueryRunner } from 'typeorm'
import { system } from '../../../helper/system/system'

const log = system.globalLogger()

export class AddClientIdToUser1771241733000 implements MigrationInterface {
    name = 'AddClientIdToUser1771241733000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user"
            ADD "clientId" character varying
        `)
        await queryRunner.query(`
            CREATE INDEX "idx_user_client_id" ON "user" ("clientId")
        `)

        log.info('AddClientIdToUser1771241733000 up')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "idx_user_client_id"
        `)
        await queryRunner.query(`
            ALTER TABLE "user" DROP COLUMN "clientId"
        `)

        log.info('AddClientIdToUser1771241733000 down')
    }
}

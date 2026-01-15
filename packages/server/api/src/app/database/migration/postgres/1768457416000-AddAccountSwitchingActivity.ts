import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAccountSwitchingActivity1768457416000 implements MigrationInterface {
    name = 'AddAccountSwitchingActivity1768457416000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "account_switching_activity" (
                "id" character varying(21) NOT NULL,
                "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "originalUserId" character varying(21) NOT NULL,
                "switchedToUserId" character varying(21) NOT NULL,
                "switchType" character varying NOT NULL,
                "originalUserEmail" character varying NOT NULL,
                "switchedToUserEmail" character varying NOT NULL,
                "originalPlatformId" character varying,
                "switchedToPlatformId" character varying NOT NULL,
                CONSTRAINT "PK_account_switching_activity" PRIMARY KEY ("id")
            )
        `)
        await queryRunner.query(`
            CREATE INDEX "idx_account_switching_activity_original_user_id" ON "account_switching_activity" ("originalUserId")
        `)
        await queryRunner.query(`
            CREATE INDEX "idx_account_switching_activity_switched_to_user_id" ON "account_switching_activity" ("switchedToUserId")
        `)
        await queryRunner.query(`
            CREATE INDEX "idx_account_switching_activity_created" ON "account_switching_activity" ("created")
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "idx_account_switching_activity_created"
        `)
        await queryRunner.query(`
            DROP INDEX "idx_account_switching_activity_switched_to_user_id"
        `)
        await queryRunner.query(`
            DROP INDEX "idx_account_switching_activity_original_user_id"
        `)
        await queryRunner.query(`
            DROP TABLE "account_switching_activity"
        `)
    }
}

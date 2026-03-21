import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCloudOAuthAppTable1773944336467 implements MigrationInterface {
    name = 'AddCloudOAuthAppTable1773944336467'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "cloud_oauth_app" (
                "id" character varying(21) NOT NULL,
                "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "pieceName" character varying NOT NULL,
                "clientId" character varying NOT NULL,
                "clientSecret" jsonb NOT NULL,
                CONSTRAINT "pk_cloud_oauth_app" PRIMARY KEY ("id")
            )
        `)

        await queryRunner.query(`
            CREATE UNIQUE INDEX "uq_cloud_oauth_app_piece_name"
            ON "cloud_oauth_app" ("pieceName")
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "uq_cloud_oauth_app_piece_name"
        `)

        await queryRunner.query(`
            DROP TABLE "cloud_oauth_app"
        `)
    }
}


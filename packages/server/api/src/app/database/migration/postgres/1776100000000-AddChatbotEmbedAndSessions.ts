import { QueryRunner } from 'typeorm'
import { Migration } from '../../migration'

export class AddChatbotEmbedAndSessions1776100000000 implements Migration {
    name = 'AddChatbotEmbedAndSessions1776100000000'
    breaking = false
    release = '0.81.3'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "chatbot_embed" (
                "id" character varying(21) NOT NULL,
                "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "projectId" character varying NOT NULL,
                "enabled" boolean NOT NULL DEFAULT false,
                "publishableKey" character varying NOT NULL,
                "allowedDomains" character varying[] NOT NULL DEFAULT '{}',
                "builderEnabled" boolean NOT NULL DEFAULT true,
                "agentEnabled" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_chatbot_embed_id" PRIMARY KEY ("id")
            )
        `)
        await queryRunner.query(`
            CREATE UNIQUE INDEX "chatbot_embed_project_id" ON "chatbot_embed" ("projectId")
        `)
        await queryRunner.query(`
            ALTER TABLE "chatbot_embed"
            ADD CONSTRAINT "FK_chatbot_embed_project" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `)

        await queryRunner.query(`
            CREATE TABLE "chatbot_session" (
                "id" character varying(21) NOT NULL,
                "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "projectId" character varying NOT NULL,
                "mode" character varying NOT NULL,
                "flowId" character varying,
                "messages" jsonb NOT NULL DEFAULT '[]',
                "expiresAt" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_chatbot_session_id" PRIMARY KEY ("id")
            )
        `)
        await queryRunner.query(`
            CREATE INDEX "chatbot_session_project_id" ON "chatbot_session" ("projectId")
        `)
        await queryRunner.query(`
            CREATE INDEX "chatbot_session_expires_at" ON "chatbot_session" ("expiresAt")
        `)
        await queryRunner.query(`
            ALTER TABLE "chatbot_session"
            ADD CONSTRAINT "FK_chatbot_session_project" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "chatbot_session" DROP CONSTRAINT "FK_chatbot_session_project"')
        await queryRunner.query('DROP INDEX "chatbot_session_expires_at"')
        await queryRunner.query('DROP INDEX "chatbot_session_project_id"')
        await queryRunner.query('DROP TABLE "chatbot_session"')

        await queryRunner.query('ALTER TABLE "chatbot_embed" DROP CONSTRAINT "FK_chatbot_embed_project"')
        await queryRunner.query('DROP INDEX "chatbot_embed_project_id"')
        await queryRunner.query('DROP TABLE "chatbot_embed"')
    }
}


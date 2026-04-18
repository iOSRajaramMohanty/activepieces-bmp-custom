import { Project } from '@activepieces/shared'
import { EntitySchema } from 'typeorm'
import { ApIdSchema, BaseColumnSchemaPart } from '../database/database-common'

type ChatbotSessionWithSchema = ChatbotSession & { project: Project }

export const ChatbotSessionEntity = new EntitySchema<ChatbotSessionWithSchema>({
    name: 'chatbot_session',
    columns: {
        ...BaseColumnSchemaPart,
        projectId: ApIdSchema,
        mode: {
            type: String,
            nullable: false,
        },
        flowId: {
            type: String,
            nullable: true,
        },
        messages: {
            type: 'jsonb',
            nullable: false,
        },
        expiresAt: {
            type: Date,
            nullable: true,
        },
    },
    indices: [
        {
            name: 'chatbot_session_project_id',
            columns: ['projectId'],
        },
        {
            name: 'chatbot_session_expires_at',
            columns: ['expiresAt'],
        },
    ],
    relations: {
        project: {
            type: 'many-to-one',
            target: 'project',
            cascade: true,
            onDelete: 'CASCADE',
            joinColumn: {
                name: 'projectId',
                referencedColumnName: 'id',
            },
        },
    },
})

type ChatbotSession = {
    id: string
    created: string
    updated: string
    projectId: string
    mode: string
    flowId: string | null
    messages: unknown[]
    expiresAt: string | null
}


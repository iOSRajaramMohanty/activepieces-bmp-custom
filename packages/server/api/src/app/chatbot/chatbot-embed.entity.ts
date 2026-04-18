import { Project } from '@activepieces/shared'
import { EntitySchema } from 'typeorm'
import { ApIdSchema, BaseColumnSchemaPart } from '../database/database-common'

type ChatbotEmbedWithSchema = ChatbotEmbed & { project: Project }

export const ChatbotEmbedEntity = new EntitySchema<ChatbotEmbedWithSchema>({
    name: 'chatbot_embed',
    columns: {
        ...BaseColumnSchemaPart,
        projectId: ApIdSchema,
        enabled: {
            type: Boolean,
            nullable: false,
            default: false,
        },
        publishableKey: {
            type: String,
            nullable: false,
        },
        allowedDomains: {
            type: String,
            array: true,
            nullable: false,
        },
        builderEnabled: {
            type: Boolean,
            nullable: false,
            default: true,
        },
        agentEnabled: {
            type: Boolean,
            nullable: false,
            default: true,
        },
    },
    indices: [
        {
            name: 'chatbot_embed_project_id',
            columns: ['projectId'],
            unique: true,
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

type ChatbotEmbed = {
    id: string
    created?: string
    updated?: string
    projectId: string
    enabled: boolean
    publishableKey: string
    allowedDomains: string[]
    builderEnabled: boolean
    agentEnabled: boolean
}

export type { ChatbotEmbed }


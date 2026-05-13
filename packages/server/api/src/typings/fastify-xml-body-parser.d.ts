declare module 'fastify-xml-body-parser' {
    import { FastifyPluginCallback } from 'fastify'
  
    type FastifyXmlBodyParserOptions = {
        validate?: boolean
        ignoreAttributes?: boolean
        attributeNamePrefix?: string
        textNodeName?: string
        parseAttributeValue?: boolean
        removeNSPrefix?: boolean
        ignoreNameSpace?: boolean
        allowBooleanAttributes?: boolean
        contentType?: string[]
    }
  
    const fastifyXmlBodyParser: FastifyPluginCallback<FastifyXmlBodyParserOptions>
    export default fastifyXmlBodyParser
}

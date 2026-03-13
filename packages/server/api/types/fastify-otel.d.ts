declare module '@fastify/otel' {
    import { InstrumentationBase, InstrumentationConfig, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation'
    import type { FastifyPluginCallback } from 'fastify'
  
    interface FastifyOtelInstrumentationOpts extends InstrumentationConfig {
      servername?: string
      registerOnInitialization?: boolean
      pluginOptions?: FastifyOtelOptions
    }
  
    interface FastifyOtelOptions {
      wrapRoutes?: boolean
      exposeApi?: boolean
      formatSpanName?: (request: unknown) => string
      formatSpanAttributes?: Record<string, unknown>
    }
  
    export class FastifyOtelInstrumentation extends InstrumentationBase<FastifyOtelInstrumentationOpts> {
      servername: string
      constructor(config?: FastifyOtelInstrumentationOpts)
      init(): InstrumentationNodeModuleDefinition[]
      plugin(): FastifyPluginCallback<FastifyOtelOptions>
    }
  
    export default FastifyOtelInstrumentation
}

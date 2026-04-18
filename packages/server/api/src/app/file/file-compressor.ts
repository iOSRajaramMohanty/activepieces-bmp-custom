import { promisify } from 'node:util'
import * as zlib from 'node:zlib'
import { FileCompression, isNil, isZstdCompressed } from '@activepieces/shared'

const zstdCompressFn: ZstdFn | undefined = typeof zlib.zstdCompress === 'function' ? zlib.zstdCompress : undefined
const zstdDecompressFn: ZstdFn | undefined = typeof zlib.zstdDecompress === 'function' ? zlib.zstdDecompress : undefined

const zstdCompress = zstdCompressFn ? promisify(zstdCompressFn) : undefined
const zstdDecompress = zstdDecompressFn ? promisify(zstdDecompressFn) : undefined

export const fileCompressor = {
    async compress({ data, compression }: Params): Promise<Buffer> {
        switch (compression) {
            case FileCompression.NONE:
                return data
            case FileCompression.ZSTD:
                return requireZstd().compress(data)
        }
    },

    async decompress({ data, compression }: Params): Promise<Buffer> {
        switch (compression) {
            case FileCompression.NONE:
                if (isZstdCompressed(data)) {
                    return requireZstd().decompress(data)
                }
                return data
            case FileCompression.ZSTD:
                return requireZstd().decompress(data)
        }
    },
}

function requireZstd(): ZstdPromises {
    if (isNil(zstdCompress) || isNil(zstdDecompress)) {
        throw new Error('Zstandard compression is not available in this Node.js build')
    }
    return { compress: zstdCompress, decompress: zstdDecompress }
}

type Params = {
    data: Buffer
    compression: FileCompression
}

type ZstdFn = (buffer: Buffer, callback: (error: Error | null, result: Buffer) => void) => void

type ZstdPromises = {
    compress: (data: Buffer) => Promise<Buffer>
    decompress: (data: Buffer) => Promise<Buffer>
}

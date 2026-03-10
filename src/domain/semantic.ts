import { pipeline, env } from '@xenova/transformers'

env.allowRemoteModels = false
env.allowLocalModels = true
env.useBrowserCache = true
env.localModelPath = '/models/'

env.backends.onnx.wasm.numThreads = 1
env.backends.onnx.wasm.wasmPaths = '/onnx/'

type Embedder = (text: string) => Promise<number[]>

let embedderPromise: Promise<Embedder> | null = null

const normalize = (vector: number[]): number[] => {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => value / norm)
}

export const getEmbedder = (): Promise<Embedder> => {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const extractor = await pipeline('feature-extraction', 'all-MiniLM-L6-v2', {
        quantized: true,
      })
      return async (text: string) => {
        const output = await extractor(text, { pooling: 'mean', normalize: true })
        const vector = Array.from(output.data as Float32Array).map((value) => Number(value))
        return normalize(vector)
      }
    })()
  }
  return embedderPromise
}

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return 0
  let sum = 0
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i]! * b[i]!
  }
  return sum
}

const headOrRange = async (url: string): Promise<Response> => {
  const head = await fetch(url, { method: 'HEAD' })
  if (head.ok || head.status === 304) return head
  const range = await fetch(url, { headers: { Range: 'bytes=0-0' } })
  return range
}

export const preflightSemanticAssets = async (): Promise<{ ok: boolean; message?: string }> => {
  try {
    const config = await headOrRange('/models/all-MiniLM-L6-v2/config.json')
    if (!config.ok) {
      return { ok: false, message: `config.json missing (${config.status})` }
    }
    const tokenizer = await headOrRange('/models/all-MiniLM-L6-v2/tokenizer.json')
    if (!tokenizer.ok) {
      return { ok: false, message: `tokenizer.json missing (${tokenizer.status})` }
    }
    const onnx = await headOrRange('/onnx/ort-wasm-simd.wasm')
    if (!onnx.ok) {
      return { ok: false, message: `ONNX runtime missing (${onnx.status})` }
    }
    const model = await headOrRange('/models/all-MiniLM-L6-v2/onnx/model_quantized.onnx')
    if (!model.ok) {
      return { ok: false, message: `Model file missing (${model.status})` }
    }
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { ok: false, message }
  }
}

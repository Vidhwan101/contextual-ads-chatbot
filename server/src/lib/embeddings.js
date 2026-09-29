import { pipeline } from '@huggingface/transformers'

let extractor = null

/**
 * Converts text into a 384-dimensional vector using a local MiniLM model.
 * First call downloads the model (~90MB), subsequent calls use the cache.
 */
export async function embed(text) {
  if (!extractor) {
    console.log('[embeddings] loading model (first time only)…')
    extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    )
    console.log('[embeddings] model ready')
  }

  const output = await extractor(text.slice(0, 2000), {
    pooling: 'mean',
    normalize: true,
  })

  return Array.from(output.data)
}
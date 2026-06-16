import { describe, expect, it, vi } from 'vitest'
import {
  parseDeepSeekReferenceJson,
  recognizeReferencesWithDeepSeek,
} from '../../src/main/deepseek-client'

describe('deepseek client', () => {
  it('parses valid reference json', () => {
    const result = parseDeepSeekReferenceJson(
      JSON.stringify({
        references: [
          { title: 'A', authors: 'B', year: '2020' },
          { title: '', authors: 'C', year: '2021' },
        ],
      })
    )

    expect(result).toEqual([{ title: 'A', authors: 'B', year: '2020' }])
  })

  it('throws on invalid json shape', () => {
    expect(() => parseDeepSeekReferenceJson('{"items":[]}')).toThrow('DeepSeek 返回格式不正确')
  })

  it('calls DeepSeek chat completions with json response format', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ references: [{ title: 'A', authors: 'B', year: '2020' }] }),
            },
          },
        ],
      }),
    })

    const result = await recognizeReferencesWithDeepSeek({
      apiKey: 'sk-test',
      text: 'References A B 2020',
      fetchImpl: fetchMock as any,
    })

    expect(result).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('prompts DeepSeek to identify the uploaded document itself', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ references: [{ title: 'A', authors: 'B', year: '2020' }] }),
            },
          },
        ],
      }),
    })

    await recognizeReferencesWithDeepSeek({
      apiKey: 'sk-test',
      text: 'Paper title Author References cited item',
      fetchImpl: fetchMock as any,
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const promptText = body.messages.map((message: any) => message.content).join('\n')

    expect(promptText).toContain('上传文件本身')
    expect(promptText).toContain('只返回一条')
    expect(promptText).toContain('忽略')
    expect(promptText).toContain('References')
  })
})

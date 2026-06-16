export interface RecognizedReferenceInput {
  title: string
  authors: string
  year: string
}

interface RecognizeParams {
  apiKey: string
  text: string
  fetchImpl?: typeof fetch
}

export function parseDeepSeekReferenceJson(raw: string): RecognizedReferenceInput[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('DeepSeek 返回格式不正确')
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as any).references)) {
    throw new Error('DeepSeek 返回格式不正确')
  }

  return (parsed as any).references
    .map((item: any) => ({
      title: typeof item.title === 'string' ? item.title.trim() : '',
      authors: typeof item.authors === 'string' ? item.authors.trim() : '',
      year: typeof item.year === 'string' ? item.year.trim() : '',
    }))
    .filter((item: RecognizedReferenceInput) => item.title && item.authors && item.year)
}

export async function recognizeReferencesWithDeepSeek(
  params: RecognizeParams
): Promise<RecognizedReferenceInput[]> {
  const fetchImpl = params.fetchImpl || fetch
  const response = await fetchImpl('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            '你是参考文献识别助手。',
            '请只返回 JSON 对象，格式为 {"references":[{"title":"...","authors":"...","year":"..."}]}。',
            '不要返回 Markdown，不要解释。',
            '如果无法确定某一条的标题、作者或年份，请不要返回该条。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: `从下面文本中识别参考文献，只提取标题、作者、年份：\n\n${params.text}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`DeepSeek 请求失败: ${response.status}`)
  }

  const data = await response.json() as any
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('DeepSeek 返回格式不正确')
  }

  return parseDeepSeekReferenceJson(content)
}

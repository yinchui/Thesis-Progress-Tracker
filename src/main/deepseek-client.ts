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
            '你是学术文献元数据识别助手。',
            '你的任务是识别上传文件本身是哪一篇论文或文献，不是识别这篇文件末尾列出的参考文献。',
            '请只返回 JSON 对象，格式为 {"references":[{"title":"...","authors":"...","year":"..."}]}。',
            'references 数组只返回一条，也就是上传文件本身。',
            '忽略正文中的 References、Bibliography、参考文献、参考资料章节，以及这些章节里的所有被引用文献。',
            '不要返回 Markdown，不要解释。',
            '如果无法确定上传文件本身的标题、作者或年份，请返回 {"references":[]}。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: `从下面文本中识别上传文件本身的标题、作者、年份。只返回上传文件本身这一条，不要返回它引用的参考文献：\n\n${params.text}`,
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

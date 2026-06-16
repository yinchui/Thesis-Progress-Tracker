declare module 'word-extractor' {
  class WordExtractor {
    extract(filePath: string): Promise<{ getBody(): string }>
  }

  export = WordExtractor
}

declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  const pdfjs: {
    getDocument(input: { data: Uint8Array; useWorkerFetch?: boolean }): {
      promise: Promise<{
        numPages: number
        getPage(pageNumber: number): Promise<{
          getTextContent(): Promise<{
            items: Array<{ str?: string }>
          }>
        }>
      }>
    }
  }

  export = pdfjs
}

declare module 'mammoth' {
  export function extractRawText(input: { path: string }): Promise<{ value?: string }>
}

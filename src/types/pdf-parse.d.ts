declare module 'pdf-parse' {
  function pdfParse(data: Buffer): Promise<{ text?: string; numpages?: number; info?: object }>
  export = pdfParse
}

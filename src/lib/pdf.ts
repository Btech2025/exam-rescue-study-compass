export async function readPdf(file: File): Promise<string> {
  if (!file.size) throw new Error("The PDF is empty. Choose another file or paste text.");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("This PDF exceeds 20 MB. Split it into smaller files or paste text.");
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      pages.push(
        content.items
          .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
          .join(""),
      );
    }
    const text = pages.join("\n");
    if (text.trim().length < 20)
      throw new Error("No readable text found. This may be a scanned PDF; paste its text instead.");
    return text;
  } finally {
    await doc.destroy();
  }
}

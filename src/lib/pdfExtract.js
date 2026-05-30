/**
 * Extract plain text from a PDF File object using pdfjs-dist.
 * pdfjs-dist is imported dynamically so module load doesn't fail in Node/test environments.
 * Returns { text: string, numPages: number }.
 */
export async function extractTextFromPdf(file) {
    const pdfjsLib = await import('pdfjs-dist');
    const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pageTexts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const lineMap = new Map();

        for (const item of content.items) {
            if (!item.str) continue;
            const y = Math.round(item.transform[5]);
            const existing = lineMap.get(y) ?? '';
            lineMap.set(y, existing + (existing ? ' ' : '') + item.str);
        }

        const lines = [...lineMap.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([, text]) => text);
        pageTexts.push(lines.join('\n'));
    }

    return {
        text: pageTexts.join('\n\n'),
        numPages: pdf.numPages,
    };
}

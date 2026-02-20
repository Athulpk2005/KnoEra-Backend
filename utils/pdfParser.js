import fs from 'fs/promises';
import { PDFParse } from 'pdf-parse';

/**
 * Extracts text from a PDF file.
 * @param {string} filePath - The path to the PDF file.
 * @returns {Promise<{text: string, numPages: number, info: any}>} A promise that resolves to the extracted text.
 */
export const extractTextFromPDF = async (filePath) => {
    try {
        const dataBuffer = await fs.readFile(filePath);

        // Use the new PDFParse API
        const parser = new PDFParse({ data: dataBuffer });

        // Get text and info (this version separates them)
        const textResult = await parser.getText();
        const infoResult = await parser.getInfo();

        // Clean up
        await parser.destroy();

        return {
            text: textResult.text,
            numPages: textResult.total,
            info: infoResult.info,
        };

    } catch (error) {
        console.error("PDF parsing error detail:", error);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
};

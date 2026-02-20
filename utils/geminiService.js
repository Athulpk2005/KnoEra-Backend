import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

if (!process.env.GEMINI_API_KEY) {
    console.error('FATAL ERROR: GEMINI_API_KEY is not set in the environment variables')
    process.exit(1);
} else {
    console.log(`GEMINI_API_KEY found: ${process.env.GEMINI_API_KEY.substring(0, 4)}...`);
}

/**
 * Helper to call Gemini with exponential backoff retry
 * @param {string} prompt - The prompt to send
 * @param {string} modelName - Model identifier
 * @param {number} maxRetries - Max number of retries
 */
const generateWithRetry = async (prompt, modelName = "gemini-flash-latest", maxRetries = 3) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            if (text) return text;
            throw new Error('AI returned an empty response.');
        } catch (error) {
            lastError = error;
            const status = error?.status;

            // 503 = Service Unavailable, 429 = Rate Limit
            if (status === 503 || status === 429) {
                const delay = Math.pow(2, i) * 2000 + Math.random() * 1000;
                console.warn(`Gemini API ${status} - Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
};

/**
 * Generate flashcards from text
 * @param {string} text -Document text
 * @param {number} count -Number of flashcards to generate
 * @returns {Promise<Array<{question:string,answer:string, difficulty:string}>>}
 */

export const generateFlashcards = async (text, count = 10) => {
    if (!text || text.trim().length === 0) {
        throw new Error('Document content is empty. Cannot generate flashcards.');
    }

    const prompt = `Generate exactly ${count} educational flashcards from the following text.
    Format each flashcard as:
    Q: [Clear, specific question]
    A: [Concise, accurate answer]
    D:[Difficulty level: Easy, Medium, or Hard]
    
    Separate each flashcard with "---"
    
    Text:
    ${text.substring(0, 15000)}`;

    try {
        const generatedText = await generateWithRetry(prompt);

        //Parse the response
        const flashcard = [];
        const cards = generatedText.split("---").filter(c => c.trim());

        for (const card of cards) {
            const lines = card.trim().split('\n');
            let question = '', answer = '', difficulty = 'medium';

            for (const line of lines) {
                if (line.startsWith('Q:')) {
                    question = line.substring(2).trim();
                } else if (line.startsWith('A:')) {
                    answer = line.substring(2).trim();
                } else if (line.startsWith('D:')) {
                    const diff = line.substring(2).trim().toLowerCase();
                    if (['easy', 'medium', 'hard'].includes(diff)) {
                        difficulty = diff;
                    }
                }
            }

            if (question && answer) {
                flashcard.push({ question, answer, difficulty });
            }
        }

        return flashcard.slice(0, count);

    } catch (error) {
        console.error('Gemini API Error (Flashcards):', error);
        if (error?.status === 429) {
            throw new Error('AI usage limit reached for today. Please try again later or upgrade your plan.');
        }
        throw new Error(error.message || 'Failed to generate flashcards');
    }
};

/**
 * Generate quiz questions
 * @param {string} text -Document text
 * @param {number} numQuestions -Number of questions 
 * @returns {Promise<Array<{question:string, options: Array, correctAnswer: string, explanation: string. difficulty: string}>>}
 */

export const generateQuiz = async (text, numQuestions = 5) => {
    if (!text || text.trim().length === 0) {
        throw new Error('Document content is empty. Cannot generate quiz.');
    }

    const prompt = `Generate exactly ${numQuestions} multiple choice questions from the following text.
    Format each question as:
    Q: [Question]
    O1: [Option 1]
    O2: [Option 2]
    O3: [Option 3]
    O4: [Option 4]
    C: [Correct Option - exactly as written above]
    E: [Brief Explanation]
    D: [Difficulty: Easy, Medium, or Hard]
    Separate each question with "---"
    
    Text:
    ${text.substring(0, 15000)}`;

    try {
        const generatedText = await generateWithRetry(prompt);

        //Parse the response
        const questions = [];
        const questionBlocks = generatedText.split("---").filter(q => q.trim());

        for (const block of questionBlocks) {
            const lines = block.trim().split('\n');
            let question = '', options = [], correctAnswer = '', explanation = '', difficulty = 'medium';

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('Q:')) {
                    question = trimmed.substring(2).trim();
                } else if (trimmed.match(/^O\d:/)) {
                    options.push(trimmed.substring(3).trim());
                } else if (trimmed.startsWith('C:')) {
                    correctAnswer = trimmed.substring(2).trim();
                } else if (trimmed.startsWith('E:')) {
                    explanation = trimmed.substring(2).trim();
                } else if (trimmed.startsWith('D:')) {
                    const diff = trimmed.substring(2).trim().toLowerCase();
                    if (['easy', 'medium', 'hard'].includes(diff)) {
                        difficulty = diff;
                    }
                }
            }

            if (question && options.length >= 2 && correctAnswer) {
                questions.push({ question, options, correctAnswer, explanation, difficulty });
            }
        }

        return questions.slice(0, numQuestions);
    } catch (error) {
        console.error('Gemini API Error (Quiz):', error);
        if (error?.status === 429) {
            throw new Error('AI usage limit reached for today. Please try again later or upgrade your plan.');
        }
        throw new Error(error.message || 'Failed to generate Quiz');
    }
}

/**
 * Generate document summary
 * @param {string} text -Document text
 * @returns {Promise<string>}
 */

export const generateSummary = async (text) => {
    if (!text || text.trim().length === 0) {
        throw new Error('Document content is empty. Cannot generate summary.');
    }

    const prompt = `Provide a concise summary of the following text, highlighting the key concepts, main ideas and important points. 
    
    IMPORTANT:
    1. Structure the summary in a clear, point-by-point format using Markdown bullet points (*).
    2. Use bold text (**) for key terms and headings.
    3. Ensure there is a newline between each point.
    4. Keep the summary clear and structured.
    
    Text:
    ${text.substring(0, 30000)}`;

    try {
        const generatedText = await generateWithRetry(prompt);
        return generatedText;
    } catch (error) {
        console.error('Gemini API Error (Summary):', error);
        if (error?.status === 429) {
            throw new Error('AI usage limit reached for today. Please try again later or upgrade your plan.');
        }
        throw new Error(error.message || 'Failed to generate Summary');
    }
};

/**
 * Chat with document context
 * @param {string} question -User question
 * @param {Array<Object>} chunks -Relevant document chunks
 * @returns {Promise<string>}
*/

export const generateResponse = async (question, chunks) => {
    const context = chunks.map((c, i) => `[Chunk ${i + 1}]\n${c.content}`).join('\n\n');
    const prompt = `Based on the following context from a document, analyze the context and answer the user's question. 
    
    IMPORTANT INSTRUCTIONS:
    1. Structure your answer in a clear, point-by-point format using Markdown bullet points (*).
    2. Use bold text (**) for key terms and headings within each point.
    3. Ensure there is a newline between each point for readability.
    4. If the answer is not in the context, say so clearly.

    Context:
    ${context}
    
    Question:
    ${question}
    
    Answer: `;

    try {
        const generatedText = await generateWithRetry(prompt);
        return generatedText;
    } catch (error) {
        console.error('Gemini API Error (Chat):', error.message);
        if (error?.status === 429) {
            throw new Error('AI usage limit reached for today. Please try again later or upgrade your plan.');
        }
        throw new Error('Failed to process Chat request');
    }
};

/**
 * Explain a specific concept
 * @param {string} concept -Concept to explain
 * @param {string} context -Relevant context
 * @returns {Promise<string>}
 */
export const explainConcept = async (concept, context) => {

    const prompt = `Explain the concept of "${concept}" based on the following context.
    
    IMPORTANT:
    1. Structure your explanation in a clear, point-by-point format using Markdown bullet points (*).
    2. Use bold text (**) for key terms and headings.
    3. Ensure there is a newline between each point.
    4. Provide a clear, educational explanation that's easy to understand.
    5. Include examples if relevant.
    
    Context:
    ${context.substring(0, 10000)}`;

    try {
        const generatedText = await generateWithRetry(prompt);
        return generatedText;
    } catch (error) {
        console.error('Gemini API Error (Explain):', error);
        if (error?.status === 429) {
            throw new Error('AI usage limit reached for today. Please try again later or upgrade your plan.');
        }
        throw new Error('Failed to explain concept');
    }
};

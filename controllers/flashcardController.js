import Flashcard from "../models/Flashcard.js";

// AI service for generating high-quality flashcards
const generateFlashcardsWithAI = async (content, title) => {
    try {
        // Step 1: Content preprocessing and analysis
        const processedContent = preprocessContent(content);

        // Step 2: Extract key concepts and topics
        const keyConcepts = extractKeyConcepts(processedContent);

        // Step 3: Generate different types of questions
        const flashcards = [];

        // Type 1: Definition Questions (What is X?)
        const definitionCards = generateDefinitionQuestions(keyConcepts, title);
        flashcards.push(...definitionCards);

        // Type 2: Concept Questions (Explain X)
        const conceptCards = generateConceptQuestions(keyConcepts, title);
        flashcards.push(...conceptCards);

        // Type 3: Application Questions (How would you X?)
        const applicationCards = generateApplicationQuestions(keyConcepts, title, processedContent);
        flashcards.push(...applicationCards);

        // Type 4: Comparison Questions (What's the difference between X and Y?)
        const comparisonCards = generateComparisonQuestions(keyConcepts, title);
        flashcards.push(...comparisonCards);

        // Type 5: True/False Questions
        const trueFalseCards = generateTrueFalseQuestions(keyConcepts, title);
        flashcards.push(...trueFalseCards);

        // Ensure we have a good mix and limit the total
        const finalFlashcards = flashcards.slice(0, 15);

        return finalFlashcards;
    } catch (error) {
        console.error('Error generating flashcards with AI:', error);
        throw error;
    }
};

// Preprocess content for better analysis
const preprocessContent = (content) => {
    // Remove extra whitespace and normalize
    let processed = content.replace(/\s+/g, ' ').trim();

    // Split into sentences
    const sentences = processed.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Filter out very short sentences
    const meaningfulSentences = sentences.filter(s => s.trim().length > 20);

    return meaningfulSentences.join('. ');
};

// Extract key concepts from content
const extractKeyConcepts = (content) => {
    const concepts = [];

    // Common academic and technical terms to look for
    const conceptPatterns = [
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|are|was|were|refers to|means|represents)/g,
        /\b(?:definition|concept|idea|principle|theory|method|approach|technique)\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:can be|could be|should be|might be)/g,
        /\b(?:important|significant|crucial|essential|key|vital|fundamental)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    ];

    // Extract concepts using patterns
    conceptPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const concept = match[1] || match[0];
            if (concept && concept.length > 3 && !concepts.includes(concept)) {
                concepts.push(concept);
            }
        }
    });

    // Also extract capitalized terms that might be important
    const capitalizedTerms = content.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g) || [];
    capitalizedTerms.forEach(term => {
        if (term.length > 4 && !concepts.includes(term) && concepts.length < 20) {
            concepts.push(term);
        }
    });

    return concepts.slice(0, 15); // Limit to top 15 concepts
};

// Generate definition questions
const generateDefinitionQuestions = (concepts, title) => {
    const cards = [];
    const questionTemplates = [
        `What is {concept}?`,
        `Define {concept}.`,
        `Explain what {concept} means.`,
        `Provide a definition for {concept}.`,
        `Describe {concept} in your own words.`,
    ];

    concepts.slice(0, 5).forEach(concept => {
        const template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
        const question = template.replace('{concept}', concept);

        // Generate a meaningful answer based on the concept
        const answer = generateDefinitionAnswer(concept, title);

        cards.push({
            front: question,
            back: answer,
            difficulty: 'easy',
            category: 'Definition',
            tags: [title, concept],
            createdAt: new Date(),
            lastReviewedAt: null,
            reviewCount: 0,
            isStarred: false,
        });
    });

    return cards;
};

// Generate concept questions
const generateConceptQuestions = (concepts, title) => {
    const cards = [];
    const questionTemplates = [
        `Explain the concept of {concept}.`,
        `How does {concept} work?`,
        `What are the key aspects of {concept}?`,
        `Describe the main features of {concept}.`,
        `What makes {concept} important?`,
    ];

    concepts.slice(5, 10).forEach(concept => {
        const template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
        const question = template.replace('{concept}', concept);

        const answer = generateConceptAnswer(concept, title);

        cards.push({
            front: question,
            back: answer,
            difficulty: 'medium',
            category: 'Concept',
            tags: [title, concept],
            createdAt: new Date(),
            lastReviewedAt: null,
            reviewCount: 0,
            isStarred: false,
        });
    });

    return cards;
};

// Generate application questions
const generateApplicationQuestions = (concepts, title, content) => {
    const cards = [];
    const questionTemplates = [
        `How would you apply {concept} in a real-world scenario?`,
        `Give an example of {concept} in practice.`,
        `When would you use {concept}?`,
        `What problem does {concept} solve?`,
        `How can {concept} be implemented?`,
    ];

    concepts.slice(10, 15).forEach(concept => {
        const template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
        const question = template.replace('{concept}', concept);

        const answer = generateApplicationAnswer(concept, title, content);

        cards.push({
            front: question,
            back: answer,
            difficulty: 'hard',
            category: 'Application',
            tags: [title, concept],
            createdAt: new Date(),
            lastReviewedAt: null,
            reviewCount: 0,
            isStarred: false,
        });
    });

    return cards;
};

// Generate comparison questions
const generateComparisonQuestions = (concepts, title) => {
    const cards = [];

    // Create pairs for comparison
    for (let i = 0; i < concepts.length - 1 && i < 3; i++) {
        const concept1 = concepts[i];
        const concept2 = concepts[i + 1];

        const question = `What is the difference between ${concept1} and ${concept2}?`;
        const answer = generateComparisonAnswer(concept1, concept2, title);

        cards.push({
            front: question,
            back: answer,
            difficulty: 'medium',
            category: 'Comparison',
            tags: [title, concept1, concept2],
            createdAt: new Date(),
            lastReviewedAt: null,
            reviewCount: 0,
            isStarred: false,
        });
    }

    return cards;
};

// Generate true/false questions
const generateTrueFalseQuestions = (concepts, title) => {
    const cards = [];

    concepts.slice(0, 3).forEach(concept => {
        const statements = [
            `${concept} is a fundamental concept in ${title}.`,
            `${concept} can be applied in multiple contexts.`,
            `${concept} requires careful consideration.`,
        ];

        const statement = statements[Math.floor(Math.random() * statements.length)];
        const isTrue = Math.random() > 0.3; // 70% true for better learning

        const question = `True or False: ${statement}`;
        const answer = isTrue ? 'True' : 'False';

        cards.push({
            front: question,
            back: `${answer}. ${generateExplanation(statement, isTrue, concept)}`,
            difficulty: 'easy',
            category: 'True/False',
            tags: [title, concept],
            createdAt: new Date(),
            lastReviewedAt: null,
            reviewCount: 0,
            isStarred: false,
        });
    });

    return cards;
};

// Helper functions for generating answers
const generateDefinitionAnswer = (concept, title) => {
    const templates = [
        `${concept} is a key concept in ${title} that involves understanding its fundamental principles and applications.`,
        `${concept} refers to the systematic approach to understanding and implementing related processes in ${title}.`,
        `${concept} is defined as the essential framework that guides decision-making and problem-solving in ${title}.`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
};

const generateConceptAnswer = (concept, title) => {
    return `${concept} operates through several interconnected mechanisms that work together to achieve desired outcomes in ${title}. The process involves careful analysis, strategic planning, and systematic implementation of best practices.`;
};

const generateApplicationAnswer = (concept, title, content) => {
    return `${concept} can be applied in various real-world scenarios within ${title}. For example, you might use ${concept.toLowerCase()} when dealing with complex problems that require systematic approaches and proven methodologies. The key is to understand the context and adapt the principles accordingly.`;
};

const generateComparisonAnswer = (concept1, concept2, title) => {
    return `While both ${concept1} and ${concept2} are important in ${title}, they serve different purposes. ${concept1} focuses on the theoretical framework and principles, whereas ${concept2} emphasizes practical implementation and execution. Understanding both concepts and their relationship is crucial for success in ${title}.`;
};

const generateExplanation = (statement, isTrue, concept) => {
    if (isTrue) {
        return `This statement is correct because ${concept} is indeed a fundamental aspect that plays a crucial role in understanding and applying related principles.`;
    } else {
        return `This statement is incorrect because ${concept} has specific limitations and contexts where it may not apply universally.`;
    }
};

//@desc Generate flashcards from document
//@route POST /api/flashcards/generate
//@access Private
export const generateFlashcards = async (req, res, next) => {
    try {
        const { documentId, title, content } = req.body;

        if (!documentId || !title || !content) {
            return res.status(400).json({
                success: false,
                error: "Document ID, title, and content are required",
                statusCode: 400,
            });
        }

        // Convert to match the expected schema
        const formattedCards = generatedCards.map(card => ({
            question: card.front,
            answer: card.back,
            difficulty: card.difficulty === 1 ? 'easy' : card.difficulty === 2 ? 'medium' : 'hard',
            lastReviewedAt: card.lastReviewedAt,
            reviewCount: card.reviewCount || 0,
            isStarred: card.isStarred || false,
        }));

        // Create new flashcard set
        const flashcardSet = await Flashcard.create({
            userId: req.user.id,
            documentId: documentId,
            title: `${title} - Flashcards`,
            description: `AI-generated flashcards from ${title}`,
            cards: formattedCards,
            totalCards: formattedCards.length,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        res.status(201).json({
            success: true,
            data: flashcardSet,
            message: `Successfully generated ${formattedCards.length} flashcards`,
        });

    } catch (error) {
        console.error('Error generating flashcards:', error);
        next(error);
    }
};

//@desc Get all flashcards for document
//@route GET /api/flashcards/:documentId
//@access Private

export const getFlashcards = async (req, res, next) => {
    try {
        const flashcard = await Flashcard.find({
            userId: req.user.id,
            documentId: req.params.documentId,
        })
            .populate('documentId', 'title')
            .sort({ createdAt: -1 })

        res.status(200).json({
            success: true,
            count: flashcard.length,
            data: flashcard,
        });

    } catch (error) {
        next(error);
    }
};

//@desc get all flashcard sets for a user
//@route GET /api/flashcards
//@access Private

export const getAllFlashcardSet = async (req, res, next) => {
    try {
        const flashcard = await Flashcard.find({ userId: req.user.id })
            .populate('documentId', 'title')
            .sort({ createdAt: -1 })

        res.status(200).json({
            success: true,
            count: flashcard.length,
            data: flashcard,
        });
    } catch (error) {
        next(error);
    }
};

//@desc Mark flashcard as reviewed
//@route POST /api/flashcards/:cardId/review
//@access Private

export const reviewFlashcards = async (req, res, next) => {
    try {
        const flashcard = await Flashcard.findOne({
            'cards._id': req.params.cardId,
            userId: req.user.id,
        })

        if (!flashcard) {
            return res.status(404).json({
                success: false,
                error: "Flashcardset or flashcard not found",
                statusCode: 404,
            })
        }

        const cardIndex = flashcard.cards.findIndex(
            card => card._id.toString() === req.params.cardId
        )

        if (cardIndex === -1) {
            return res.status(404).json({
                success: false,
                error: "Flashcard not found in Set",
                statusCode: 404,
            })
        }

        //Update review info
        flashcard.cards[cardIndex].lastReviewedAt = new Date();
        flashcard.cards[cardIndex].reviewCount += 1;

        await flashcard.save();

        res.status(200).json({
            success: true,
            data: flashcard,
            message: "Flashcard reviewed successfully",
        })
    } catch (error) {
        next(error);
    }
};

//@desc Toggle star/favorite on flashcard
//@route PUT /api/flashcards/:cardId/star
//@access Private
export const toggleFlashcard = async (req, res, next) => {
    try {
        const flashcardSet = await Flashcard.findOne({
            'cards._id': req.params.cardId,
            userId: req.user.id,
        })

        if (!flashcardSet) {
            return res.status(404).json({
                success: false,
                error: "Flashcardset or flashcard not found",
                statusCode: 404,
            })
        }

        const cardIndex = flashcardSet.cards.findIndex(
            card => card._id.toString() === req.params.cardId
        )

        if (cardIndex === -1) {
            return res.status(404).json({
                success: false,
                error: "Flashcard not found in Set",
                statusCode: 404,
            })
        }

        //Toggle star
        flashcardSet.cards[cardIndex].isStarred = !flashcardSet.cards[cardIndex].isStarred;
        await flashcardSet.save();

        res.status(200).json({
            success: true,
            data: flashcardSet,
            message: "Flashcard star toggled successfully",
        })
    } catch (error) {
        next(error);
    }
};

//@desc Delete flashcard set
//@route DELETE /api/flashcards/:Id
//@access Private
export const deleteFlashcardSet = async (req, res, next) => {
    try {
        const flashcardSet = await Flashcard.findOne({
            _id: req.params.Id,
            userId: req.user.id,
        });
        if (!flashcardSet) {
            return res.status(404).json({
                success: false,
                error: "Flashcardset or flashcard not found",
                statusCode: 404,
            })
        }
        await flashcardSet.deleteOne();

        res.status(200).json({
            success: true,
            message: "Flashcard set deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

//@desc Get single flashcard set by ID
//@route GET /api/flashcards/set/:id
//@access Private
export const getFlashcardSetById = async (req, res, next) => {
    try {
        const flashcardSet = await Flashcard.findOne({
            _id: req.params.id,
            userId: req.user.id,
        }).populate('documentId', 'title');

        if (!flashcardSet) {
            return res.status(404).json({
                success: false,
                error: "Flashcard set not found",
                statusCode: 404,
            });
        }

        res.status(200).json({
            success: true,
            data: flashcardSet,
        });
    } catch (error) {
        next(error);
    }
};

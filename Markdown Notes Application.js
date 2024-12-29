// Required dependencies
const express = require('express');
const multer = require('multer');
const marked = require('marked');
const fs = require('fs').promises;
const path = require('path');
const GrammarBot = require('grammarbot-api');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const connectDB = require('./config/database');
const auth = require('./middleware/auth');
const Note = require('./models/Note');
const User = require('./models/User');

const app = express();
const upload = multer({ dest: 'uploads/' });
const port = 3000;

// Connect to MongoDB
connectDB();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiter to all routes
app.use(limiter);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Middleware
app.use(express.json());

// Store notes in memory (in production, use a database)
let notes = [];

// Helper function to generate unique IDs
const generateId = () => Date.now().toString();

// Validation middleware
const validateNote = [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// Initialize GrammarBot
const grammarBot = new GrammarBot({
    api_key: 'YOUR_API_KEY', // Optional: Get a key from https://www.grammarbot.io/
    language: 'en-US'
});

// Routes
// 1. Upload markdown file
app.post('/upload', upload.single('markdown'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileContent = await fs.readFile(req.file.path, 'utf8');
        const note = {
            id: generateId(),
            title: req.file.originalname,
            content: fileContent,
            createdAt: new Date()
        };

        notes.push(note);
        
        // Clean up uploaded file
        await fs.unlink(req.file.path);

        res.json({ 
            message: 'File uploaded successfully',
            noteId: note.id 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Check grammar
app.post('/check-grammar', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'No content provided' });
        }
        if (content.length > 10000) {
            return res.status(400).json({ error: 'Content too long. Maximum 10000 characters.' });
        }

        // Remove markdown syntax for grammar checking
        const plainText = content.replace(/[#*_`~]/g, '');
        
        const result = await grammarBot.check(plainText);
        
        res.json({
            issues: result.matches.map(match => ({
                message: match.message,
                offset: match.offset,
                length: match.length,
                replacements: match.replacements
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Grammar check failed: ' + error.message });
    }
});

// 3. Save note
app.post('/notes', auth, validateNote, async (req, res) => {
    try {
        const note = new Note({
            ...req.body,
            user: req.user._id
        });
        await note.save();
        res.status(201).json(note);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add update note endpoint
app.put('/notes/:id', validateNote, async (req, res) => {
    try {
        const noteIndex = notes.findIndex(n => n.id === req.params.id);
        if (noteIndex === -1) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const { title, content } = req.body;
        notes[noteIndex] = {
            ...notes[noteIndex],
            title,
            content,
            updatedAt: new Date()
        };

        res.json(notes[noteIndex]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. List all notes
app.get('/notes', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const notes = await Note.find({ user: req.user._id })
            .skip(skip)
            .limit(limit)
            .select('title createdAt')
            .sort({ createdAt: -1 });

        const total = await Note.countDocuments({ user: req.user._id });

        res.json({
            notes,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalNotes: total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Get rendered HTML version of a note
app.get('/notes/:id/html', (req, res) => {
    const note = notes.find(n => n.id === req.params.id);
    if (!note) {
        return res.status(404).json({ error: 'Note not found' });
    }

    const htmlContent = marked.parse(note.content);
    res.send(htmlContent);
});

// Auth routes
app.post('/register', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        const token = jwt.sign({ userId: user._id }, 'your_jwt_secret');
        res.status(201).json({ user, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add delete note endpoint
app.delete('/notes/:id', auth, async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
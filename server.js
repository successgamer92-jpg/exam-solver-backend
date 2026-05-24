const express = require('express');
const cors = require('cors');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ⚡ Local static files serving ka setting
app.use(express.static(__dirname));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir });
const ai = new GoogleGenAI({ apiKey: 'AIzaSyAtNA_AEcnIZZegyHXot3b3bWeidowcEjg' });

function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType: mimeType
        },
    };
}

// 🎯 FIXED ROUTE: Yeh bina kisi if-else ke direct wahi index.html uthaega
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/solve-paper', upload.single('paper'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No file" });
        const filePart = fileToGenerativePart(req.file.path, req.file.mimetype);
        
        const prompt = "Extract all questions from this exam paper image or PDF and solve them step-by-step with clear explanations.";
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [prompt, filePart],
        });

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.json({ success: true, solution: response.text });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "AI Error" });
    }
});

app.post('/api/download-pdf', (req, res) => {
    try {
        const { solution } = req.body;
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Solutions.pdf');
        doc.pipe(res);
        doc.fontSize(20).text('SmartSolve AI Solutions', { align: 'center' }).moveDown(1);
        doc.fontSize(12).text(solution, { align: 'left', lineGap: 5 });
        doc.end();
    } catch (e) {
        res.status(500).send("PDF Error");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Perfect System Active on http://localhost:5000`);
});
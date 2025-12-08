const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const PDFExtract = require("pdf.js-extract").PDFExtract;
const tesseract = require("node-tesseract-ocr");

// ---------------------------------------------------------
// הגדרות
// ---------------------------------------------------------

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// הגדרות OCR של Tesseract
const ocrConfig = {
  lang: "heb+eng",
  oem: 1,
  psm: 3,
};

// ---------------------------------------------------------
// קריאת טקסט מתוך PDF רגיל (טקסט חי)
// ---------------------------------------------------------
async function extractPdfText(buffer) {
  try {
    const pdfExtract = new PDFExtract();
    const data = await pdfExtract.extractBuffer(buffer);
    let text = "";

    data.pages.forEach((page) => {
      page.content.forEach((item) => {
        if (item.str) text += item.str + " ";
      });
    });

    return text.trim();
  } catch (err) {
    
    return "";
  }
}

// ---------------------------------------------------------
// OCR – המרת תמונה/סריקה לטקסט
// ---------------------------------------------------------
async function extractWithOCR(buffer) {
  const tempFile = "temp_ocr_file.png";
  const fs = require("fs");

  fs.writeFileSync(tempFile, buffer);

  try {
    const text = await tesseract.recognize(tempFile, ocrConfig);
    fs.unlinkSync(tempFile);
    return text.trim();
  } catch (err) {
    fs.unlinkSync(tempFile);
    console.error("❌ OCR נכשל:", err);
    return "";
  }
}

// ---------------------------------------------------------
// סיכום עם Gemini
// ---------------------------------------------------------
async function summarizeText(text) {
  const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

  const prompt = `
סכם את הטקסט הבא ל־2–3 שורות בלבד, בעברית ברורה, בלי פירוט ארוך:

"${text}"
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("❌ שגיאה מ-Gemini:", err);
    throw new Error("Gemini API error");
  }
}

// ---------------------------------------------------------
// הנקודה הראשית — סיכום מסמך
// ---------------------------------------------------------
exports.summarizeDocument = async (req, res) => {
  try {
    const { fileId, filename } = req.body;

    if (!fileId) return res.status(400).json({ message: "חסר fileId" });

    

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "fs",
    });

    let buffer = Buffer.alloc(0);
    const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));

    stream.on("data", (chunk) => (buffer = Buffer.concat([buffer, chunk])));
    stream.on("error", () => res.status(404).json({ message: "קובץ לא נמצא" }));

    stream.on("end", async () => {
      let text = "";

      // שלב 1 — ניסיון לקרוא PDF רגיל
      text = await extractPdfText(buffer);

      // אם PDF ריק → ננסה OCR
      if (!text || text.length < 10) {
        
        text = await extractWithOCR(buffer);
      }

      // אם עדיין ריק → לא ניתן לסכם
      if (!text || text.length < 5) {
        return res.json({
          summary:
            "המסמך שהועלה אינו מכיל טקסט שניתן לקרוא או שמדובר בקובץ תמונה באיכות נמוכה.",
        });
      }

      

      const summary = await summarizeText(text);

      res.json({ summary });
    });
  } catch (err) {
    console.error("❌ שגיאה בזמן סיכום:", err);
    res.status(500).json({ message: "שגיאה בזמן סיכום מסמך" });
  }
};

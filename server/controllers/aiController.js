const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const PDFExtract = require("pdf.js-extract").PDFExtract;
const tesseract = require("node-tesseract-ocr");
const fs = require("fs");

const AISummary = require("../models/AISummary");

// ---------------------------------------------------------
// הגדרות
// ---------------------------------------------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ocrConfig = {
  lang: "heb+eng",
  oem: 1,
  psm: 3,
};

// ---------------------------------------------------------
// קריאת טקסט מתוך PDF רגיל
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
  } catch {
    return "";
  }
}

// ---------------------------------------------------------
// OCR
// ---------------------------------------------------------
async function extractWithOCR(buffer) {
  const tempFile = "temp_ocr_file.png";
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
  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.5-flash",
  });

  const prompt = `
סכם את הטקסט הבא ל־2–3 שורות בלבד, בעברית ברורה וקצרה:

"${text}"
`;

  try {
    const result = await model.generateContent(prompt);
    return { success: true, summary: result.response.text() };
  } catch (err) {
    console.error(" שגיאה מ-Gemini:", err.message);
    return {
      success: false,
      reason: err.status === 503 ? "OVERLOADED" : "AI_ERROR",
    };
  }
}

// ---------------------------------------------------------
//  פונקציה ראשית — סיכום מסמך (עם Cache)
// ---------------------------------------------------------
exports.summarizeDocument = async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) {
      return res.status(400).json({ message: "חסר fileId" });
    }

    //  שלב 1 — בדיקה אם כבר קיים תקציר
    const cachedSummary = await AISummary.findOne({ fileId });
    if (cachedSummary) {
      return res.json({
        summary: cachedSummary.summary,
        cached: true,
      });
    }

    //  שלב 2 — קריאת הקובץ מ־GridFS
    const bucket = new mongoose.mongo.GridFSBucket(
      mongoose.connection.db,
      { bucketName: "fs" }
    );

    let buffer = Buffer.alloc(0);
    const stream = bucket.openDownloadStream(
      new mongoose.Types.ObjectId(fileId)
    );

    stream.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
    });

    stream.on("error", () => {
      return res.status(404).json({ message: "קובץ לא נמצא" });
    });

    stream.on("end", async () => {
      let text = await extractPdfText(buffer);

      if (!text || text.length < 10) {
        text = await extractWithOCR(buffer);
      }

      if (!text || text.length < 5) {
        return res.json({
          summary:
            "המסמך אינו מכיל טקסט קריא או שמדובר בקובץ סרוק באיכות נמוכה.",
        });
      }

      //  שלב 3 — Gemini
      const aiResult = await summarizeText(text);

      if (!aiResult.success) {
        return res.status(503).json({
          summary:
            "⚠️ מנוע הסיכום עמוס כרגע. נסה שוב בעוד מספר דקות.",
        });
      }

      //  שלב 4 — שמירת התקציר
      await AISummary.create({
        fileId,
        summary: aiResult.summary,
      });


      return res.json({
        summary: aiResult.summary,
        cached: false,
      });
    });
  } catch (err) {
    console.error(" שגיאה כללית:", err);
    return res.status(500).json({
      message: "שגיאה בזמן סיכום מסמך",
    });
  }
};

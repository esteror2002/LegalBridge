const Case = require('../models/Case');
const User = require('../models/User');

// קבלת כל התיקים
exports.getAllCases = async (req, res) => {
  try {
    const cases = await Case.find();
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת תיקים' });
  }
};

// הוספת תיק חדש עם פרטי לקוחה
exports.addCase = async (req, res) => {
  try {
    const { clientName, description } = req.body;

    // שליפת פרטי הלקוחה ממסד המשתמשים לפי username
    const user = await User.findOne({ username: clientName });
    if (!user) {
      return res.status(404).json({ error: 'הלקוחה לא נמצאה במסד המשתמשים' });
    }

    const newCase = new Case({
      clientName,
      description,
      clientEmail: user.email,
      clientPhone: user.phone,
      clientAddress: user.address
    });

    await newCase.save();
    res.status(201).json(newCase);
  } catch (err) {
    res.status(400).json({ error: 'שגיאה ביצירת תיק חדש' });
  }
};

// עדכון סטטוס
exports.updateStatus = async (req, res) => {
  try {
    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'שגיאה בעדכון סטטוס' });
  }
};

// הוספת קבצים (רשימת שמות)
exports.uploadDocuments = async (req, res) => {
  try {
    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      { $push: { documents: { $each: req.body.documents } } },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'שגיאה בהעלאת קבצים' });
  }
};

// מחיקת תיק
exports.deleteCase = async (req, res) => {
  try {
    await Case.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(400).json({ error: 'שגיאה במחיקת תיק' });
  }
};

// שליפת תיק לפי מזהה
exports.getCaseById = async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) return res.status(404).json({ error: 'תיק לא נמצא' });
    res.json(caseItem);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת תיק' });
  }
};

// הוספת תת-תיק
exports.addSubcase = async (req, res) => {
  try {
    const { title } = req.body;
    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      { $push: { subCases: { title, documents: [] } } },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'שגיאה בהוספת תת-תיק' });
  }
};

// הוספת מסמך לתת-תיק לפי אינדקס
exports.addDocumentToSubcase = async (req, res) => {
  try {
    const { fileName } = req.body;
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem || !caseItem.subCases[req.params.index]) {
      return res.status(404).json({ error: 'תיק או תת-תיק לא נמצאו' });
    }

    caseItem.subCases[req.params.index].documents.push(fileName);
    await caseItem.save();
    res.json(caseItem);
  } catch (err) {
    res.status(400).json({ error: 'שגיאה בהוספת מסמך לתת-תיק' });
  }
};

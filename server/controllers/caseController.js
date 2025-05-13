const Case = require('../models/Case');

// קבלת כל התיקים
exports.getAllCases = async (req, res) => {
  try {
    const cases = await Case.find();
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת תיקים' });
  }
};

// הוספת תיק חדש
exports.addCase = async (req, res) => {
  try {
    const newCase = new Case(req.body);
    await newCase.save();
    res.status(201).json(newCase);
  } catch (err) {
    res.status(400).json({ error: 'שגיאה ביצירת תיק חדש' });
  }
};

// עדכון סטטוס
exports.updateStatus = async (req, res) => {
  try {
    const updated = await Case.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'שגיאה בעדכון סטטוס' });
  }
};

// הוספת קבצים (פשוט רשימת שמות)
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

exports.deleteCase = async (req, res) => {
  try {
    await require('../models/Case').findByIdAndDelete(req.params.id);
    res.sendStatus(204); // אין תוכן – הצלחה
  } catch (err) {
    res.status(400).json({ error: 'שגיאה במחיקת תיק' });
  }
};

const Case = require('../models/Case');
const User = require('../models/User');
const { createAutoNotification } = require('./notificationController');

// קבלת כל התיקים
exports.getAllCases = async (req, res) => {
  try {
    const cases = await Case.find();
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת תיקים' });
  }
};

// הוספת תיק חדש עם פרטי לקוחה - מעודכן!
exports.addCase = async (req, res) => {
  try {
    const { clientName, description } = req.body;

    // שליפת פרטי הלקוחה ממסד המשתמשים לפי username
    const user = await User.findOne({ username: clientName });
    if (!user) {
      return res.status(404).json({ error: 'הלקוחה לא נמצאה במסד המשתמשים' });
    }

    const newCase = new Case({
      clientId: user._id, // ✅ הוספנו את ה-ID של הלקוח!
      clientName,
      description,
      clientEmail: user.email,
      clientPhone: user.phone,
      clientAddress: user.address,
      // הוספת עדכון התקדמות ראשוני
      progress: [{
        title: 'תיק נפתח',
        description: 'התיק נוצר במערכת והועבר לטיפול',
        addedBy: 'המערכת'
      }]
    });

    await newCase.save();
    res.status(201).json(newCase);
  } catch (err) {
    console.error('שגיאה ביצירת תיק:', err);
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

    // 🆕 שליחת התראה אוטומטית ללקוח
    if (updated && updated.clientId) {
      try {
        const lawyer = await User.findOne({ role: 'lawyer' });
        await createAutoNotification(
          'status_changed',
          updated.clientId,
          lawyer._id,
          {
            newStatus: req.body.status,
            caseId: updated._id
          }
        );
        console.log('✅ התראה נשלחה ללקוח על שינוי סטטוס');
      } catch (notifError) {
        console.error('❌ שגיאה בשליחת התראה:', notifError);
      }
    }

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

    // 🆕 שליחת התראה אוטומטית ללקוח
    if (updated && updated.clientId) {
      try {
        const lawyer = await User.findOne({ role: 'lawyer' });
        await createAutoNotification(
          'case_update',
          updated.clientId,
          lawyer._id,
          {
            updateTitle: `נוסף תת-תיק חדש: ${title}`,
            caseId: updated._id
          }
        );
        console.log('✅ התראה נשלחה ללקוח על תת-תיק חדש');
      } catch (notifError) {
        console.error('❌ שגיאה בשליחת התראה:', notifError);
      }
    }

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

    // 🆕 שליחת התראה אוטומטית ללקוח
    if (caseItem.clientId) {
      try {
        const lawyer = await User.findOne({ role: 'lawyer' });
        await createAutoNotification(
          'document_added',
          caseItem.clientId,
          lawyer._id,
          {
            documentName: fileName,
            caseId: caseItem._id
          }
        );
        console.log('✅ התראה נשלחה ללקוח על מסמך חדש');
      } catch (notifError) {
        console.error('❌ שגיאה בשליחת התראה:', notifError);
      }
    }

    res.json(caseItem);
  } catch (err) {
    res.status(400).json({ error: 'שגיאה בהוספת מסמך לתת-תיק' });
  }
};

// שליפת תיקים לפי לקוח
exports.getCasesByClientId = async (req, res) => {
  try {
    const { clientId } = req.params;
    const cases = await Case.find({ clientId });
    res.json(cases);
  } catch (err) {
    console.error('שגיאה בשליפת תיקי לקוח:', err);
    res.status(500).json({ error: 'שגיאה בשליפת תיקי לקוח' });
  }
};

// הוספת עדכון התקדמות
exports.addProgress = async (req, res) => {
  try {
    const { title, description, addedBy } = req.body;
    
    // עדכון התיק
    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      { 
        $push: { 
          progress: { 
            title, 
            description, 
            addedBy,
            date: new Date()
          } 
        } 
      },
      { new: true }
    );

    // 🆕 שליחת התראה אוטומטית ללקוח
    if (updated && updated.clientId) {
      try {
        const lawyer = await User.findOne({ role: 'lawyer' }); // או לפי מי שמוסיף
        await createAutoNotification(
          'case_update',
          updated.clientId,
          lawyer._id,
          {
            updateTitle: title,
            caseId: updated._id
          }
        );
        console.log('✅ התראה נשלחה ללקוח על עדכון התקדמות');
      } catch (notifError) {
        console.error('❌ שגיאה בשליחת התראה:', notifError);
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('שגיאה בהוספת עדכון התקדמות:', err);
    res.status(400).json({ error: 'שגיאה בהוספת עדכון התקדמות' });
  }
};

// 🆕 עריכת תת-תיק
exports.editSubcase = async (req, res) => {
  try {
    const { id, index } = req.params;
    const { title } = req.body;
    
    const caseItem = await Case.findById(id);
    if (!caseItem || !caseItem.subCases[index]) {
      return res.status(404).json({ error: 'תיק או תת-תיק לא נמצאו' });
    }

    caseItem.subCases[index].title = title;
    await caseItem.save();
    
    res.json({ message: 'תת-תיק עודכן בהצלחה', case: caseItem });
  } catch (err) {
    console.error('שגיאה בעריכת תת-תיק:', err);
    res.status(400).json({ error: 'שגיאה בעריכת תת-תיק' });
  }
};

// 🆕 מחיקת תת-תיק
exports.deleteSubcase = async (req, res) => {
  try {
    const { id, index } = req.params;
    
    const caseItem = await Case.findById(id);
    if (!caseItem || !caseItem.subCases[index]) {
      return res.status(404).json({ error: 'תיק או תת-תיק לא נמצאו' });
    }

    caseItem.subCases.splice(index, 1); // מחיקת תת-תיק
    await caseItem.save();
    
    res.json({ message: 'תת-תיק נמחק בהצלחה', case: caseItem });
  } catch (err) {
    console.error('שגיאה במחיקת תת-תיק:', err);
    res.status(400).json({ error: 'שגיאה במחיקת תת-תיק' });
  }
};

// 🆕 עריכת מסמך
exports.editDocument = async (req, res) => {
  try {
    const { id, subcaseIndex, docIndex } = req.params;
    const { fileName } = req.body;
    
    const caseItem = await Case.findById(id);
    if (!caseItem || !caseItem.subCases[subcaseIndex] || !caseItem.subCases[subcaseIndex].documents[docIndex]) {
      return res.status(404).json({ error: 'תיק, תת-תיק או מסמך לא נמצאו' });
    }

    caseItem.subCases[subcaseIndex].documents[docIndex] = fileName;
    await caseItem.save();
    
    res.json({ message: 'מסמך עודכן בהצלחה', case: caseItem });
  } catch (err) {
    console.error('שגיאה בעריכת מסמך:', err);
    res.status(400).json({ error: 'שגיאה בעריכת מסמך' });
  }
};

// 🆕 מחיקת מסמך
exports.deleteDocument = async (req, res) => {
  try {
    const { id, subcaseIndex, docIndex } = req.params;
    
    const caseItem = await Case.findById(id);
    if (!caseItem || !caseItem.subCases[subcaseIndex] || !caseItem.subCases[subcaseIndex].documents[docIndex]) {
      return res.status(404).json({ error: 'תיק, תת-תיק או מסמך לא נמצאו' });
    }

    caseItem.subCases[subcaseIndex].documents.splice(docIndex, 1); // מחיקת מסמך
    await caseItem.save();
    
    res.json({ message: 'מסמך נמחק בהצלחה', case: caseItem });
  } catch (err) {
    console.error('שגיאה במחיקת מסמך:', err);
    res.status(400).json({ error: 'שגיאה במחיקת מסמך' });
  }
};
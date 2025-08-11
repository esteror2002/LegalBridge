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

// עריכת תת-תיק
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

// מחיקת תת-תיק
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

// עריכת מסמך
exports.editDocument = async (req, res) => {
  try {
    const { id, subcaseIndex, docIndex } = req.params;
    const { name } = req.body; // שם לתצוגה

    const caseItem = await Case.findById(id);
    if (!caseItem || !caseItem.subCases[subcaseIndex] || !caseItem.subCases[subcaseIndex].documents[docIndex]) {
      return res.status(404).json({ error: 'תיק, תת-תיק או מסמך לא נמצאו' });
    }

    if (name) caseItem.subCases[subcaseIndex].documents[docIndex].name = name.trim();

    await caseItem.save();
    res.json({ message: 'מסמך עודכן בהצלחה', case: caseItem });
  } catch (err) {
    console.error('שגיאה בעריכת מסמך:', err);
    res.status(400).json({ error: 'שגיאה בעריכת מסמך' });
  }
};


//  מחיקת מסמך
exports.deleteDocument = async (req, res) => {
  try {
    const { id, subcaseIndex, docIndex } = req.params;

    const caseItem = await Case.findById(id);
    if (!caseItem || !caseItem.subCases[subcaseIndex] || !caseItem.subCases[subcaseIndex].documents[docIndex]) {
      return res.status(404).json({ error: 'תיק, תת-תיק או מסמך לא נמצאו' });
    }

    // אם תרצי למחוק גם את הקובץ מהדיסק – נוסיף שלב בהמשך.
    caseItem.subCases[subcaseIndex].documents.splice(docIndex, 1);
    await caseItem.save();

    res.json({ message: 'מסמך נמחק בהצלחה', case: caseItem });
  } catch (err) {
    console.error('שגיאה במחיקת מסמך:', err);
    res.status(400).json({ error: 'שגיאה במחיקת מסמך' });
  }
};


// העלאת קובץ אמיתי ושיוכו לתת-תיק + נרמול מסמכים ישנים
exports.uploadDocumentToSubcase = async (req, res) => {
  try {
    const { id, index } = req.params;

    if (!req.file) return res.status(400).json({ error: 'לא הועלה קובץ' });

    const caseItem = await Case.findById(id);
    if (!caseItem || !caseItem.subCases[index]) {
      return res.status(404).json({ error: 'תיק או תת-תיק לא נמצאו' });
    }

    // ⭐ נרמול מסמכים ישנים בכל התתי-תיקים (מחרוזות -> אובייקטים עם name+url)
    caseItem.subCases.forEach(sc => {
      sc.documents = (sc.documents || []).map(d => {
        if (typeof d === 'string') {
          const fname = d.trim();
          const url = fname.startsWith('/uploads/') ? fname : `/uploads/${fname}`;
          return {
            name: fname,
            originalName: fname,
            mimeType: '',
            size: 0,
            url,
            uploadedAt: new Date()
          };
        }
        // גם אם זה אובייקט חלקי – נשלים שדות החובה
        if (d && typeof d === 'object') {
          return {
            name: d.name || d.originalName || 'קובץ',
            originalName: d.originalName || d.name || 'file',
            mimeType: d.mimeType || '',
            size: d.size || 0,
            url: d.url || (d.filename ? `/uploads/${d.filename}` : `/uploads/${(d.name || 'file')}`),
            uploadedAt: d.uploadedAt || new Date()
          };
        }
        return d;
      });
    });
    caseItem.markModified('subCases');

    // הוספת המסמך החדש לתת-תיק שביקשנו
    const sub = caseItem.subCases[index];
    const displayName = (req.body.displayName || req.file.originalname || 'מסמך').trim();
    const doc = {
      name: displayName,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date()
    };
    sub.documents.push(doc);

    await caseItem.save();

    // התראה ללקוח (אופציונלי – יש לך כבר לוגיקה דומה)
    if (caseItem.clientId) {
      try {
        const lawyer = await User.findOne({ role: 'lawyer' });
        await createAutoNotification('document_added', caseItem.clientId, lawyer._id, {
          documentName: doc.name,
          caseId: caseItem._id
        });
      } catch (e) {
        console.error('שגיאה בשליחת התראה:', e);
      }
    }

    res.json({ message: 'המסמך הועלה ונשמר בהצלחה', case: caseItem });
  } catch (err) {
    console.error('שגיאה בהעלאת מסמך:', err);
    res.status(500).json({ error: 'שגיאה בהעלאת מסמך' });
  }
};



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

// הוספת תיק חדש עם פרטי לקוחה + בלם כפילויות
exports.addCase = async (req, res) => {
  try {
    const { clientName, description } = req.body;

    // שליפת פרטי הלקוחה ממסד המשתמשים לפי username
    const user = await User.findOne({ username: clientName });
    if (!user) {
      return res.status(404).json({ error: 'הלקוחה לא נמצאה במסד המשתמשים' });
    }

    // ❗ בלם: אם כבר יש תיק (פתוח או בארכיון) לאותה לקוחה – לא מאפשרים ליצור חדש
    const existingCase = await Case.findOne({
      $or: [
        { clientId: user._id },        // חדש ויציב
        { clientName: clientName }     // תאימות לאחור
      ]
    });

    if (existingCase) {
      return res.status(409).json({
        error: 'כבר קיים תיק ללקוחה זו (פתוח או בארכיון). אם תרצי לעבוד עליו – שחזרי אותו מהארכיון.'
      });
    }

    const newCase = new Case({
      clientId: user._id,
      clientName,
      description,
      clientEmail: user.email,
      clientPhone: user.phone,
      clientAddress: user.address,
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
    // אם יש אינדקס ייחודי ונתקלים בשגיאת כפילות ממונגו
    if (err && err.code === 11000) {
      return res.status(409).json({
        error: 'כבר קיים תיק ללקוחה זו. יש לשחזר מהארכיון במקום לפתוח תיק חדש.'
      });
    }
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
      } catch (notifError) {
        console.error(' שגיאה בשליחת התראה:', notifError);
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
      } catch (notifError) {
        console.error(' שגיאה בשליחת התראה:', notifError);
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
      } catch (notifError) {
        console.error(' שגיאה בשליחת התראה:', notifError);
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
      } catch (notifError) {
        console.error(' שגיאה בשליחת התראה:', notifError);
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

// סגירת תיק (ארכיון) + התראה + עדכון התקדמות
exports.closeCase = async (req, res) => {
  try {
    const { closingNote } = req.body;

    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'סגור',
          closeDate: new Date(),
          closingNote: closingNote || ''
        },
        $push: {
          progress: {
            title: 'התיק נסגר',
            description: closingNote || 'התיק הועבר לארכיון',
            addedBy: 'המערכת',
            date: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'תיק לא נמצא' });

    // התראה ללקוח על שינוי סטטוס -> "סגור"
    if (updated.clientId) {
      try {
        const lawyer = await User.findOne({ role: 'lawyer' });
        if (lawyer) {
          await createAutoNotification('status_changed', updated.clientId, lawyer._id, {
            newStatus: 'סגור',
            caseId: updated._id
          });
        }
      } catch (e) {
        console.error('❌ שגיאה בשליחת התראה על סגירת תיק:', e);
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('closeCase error:', err);
    res.status(500).json({ message: 'שגיאה בסגירת התיק' });
  }
};

// שחזור תיק סגור + התראה + עדכון התקדמות
exports.reopenCase = async (req, res) => {
  try {
    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'פתוח',
          closeDate: null,
          closingNote: null
        },
        $push: {
          progress: {
            title: 'התיק נפתח מחדש',
            description: 'התיק הוחזר לפעילות',
            addedBy: 'המערכת',
            date: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'תיק לא נמצא' });

    // התראה ללקוח על שינוי סטטוס -> "פתוח"
    if (updated.clientId) {
      try {
        const lawyer = await User.findOne({ role: 'lawyer' });
        if (lawyer) {
          await createAutoNotification('status_changed', updated.clientId, lawyer._id, {
            newStatus: 'פתוח',
            caseId: updated._id
          });
        }
      } catch (e) {
        console.error('❌ שגיאה בשליחת התראה על פתיחת תיק מחדש:', e);
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('reopenCase error:', err);
    res.status(500).json({ message: 'שגיאה בשחזור התיק' });
  }
};


exports.editProgress = async (req, res) => {
  try {
    const { title, description } = req.body;
    const { id, progressId } = req.params;
    const setObj = {};
    if (title !== undefined) setObj['progress.$.title'] = title;
    if (description !== undefined) setObj['progress.$.description'] = description;

    const updated = await Case.findOneAndUpdate(
      { _id: id, 'progress._id': progressId },
      { $set: setObj },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'עדכון לא נמצא' });
    res.json(updated);
  } catch (err) {
    console.error('editProgress error:', err);
    res.status(500).json({ message: 'שגיאה בעריכת עדכון' });
  }
};

exports.deleteProgress = async (req, res) => {
  try {
    const { id, progressId } = req.params;
    const updated = await Case.findByIdAndUpdate(
      id,
      { $pull: { progress: { _id: progressId } } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'עדכון לא נמצא/תיק לא נמצא' });
    res.json(updated);
  } catch (err) {
    console.error('deleteProgress error:', err);
    res.status(500).json({ message: 'שגיאה במחיקת עדכון' });
  }
};


const path = require('path');
const fs = require('fs');

function ensureDirSync(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writeTextFileSync(filePath, content) {
  ensureDirSync(path.dirname(filePath));
  fs.writeFileSync(filePath, content ?? '', 'utf8');
}
function safeUploadsPath(...parts) {
  // נשמור טקסטים תחת /uploads/cases/<caseId>/<subIdx>/<name>
  return path.join(__dirname, '..', 'uploads', 'cases', ...parts.map(String));
}

// GET תוכן TXT קיים
exports.getTextDocument = async (req, res) => {
  try {
    const { id, subIdx, docIdx } = req.params;
    const c = await Case.findById(id);
    if (!c || !c.subCases?.[subIdx] || !c.subCases[subIdx].documents?.[docIdx]) {
      return res.status(404).json({ error: 'תיק/תת-תיק/מסמך לא נמצא' });
    }
    const doc = c.subCases[subIdx].documents[docIdx];
    const name = doc.name || doc.originalName || 'notes.txt';
    if (!name.toLowerCase().endsWith('.txt')) return res.status(400).json({ error: 'לא קובץ TXT' });

    // אם נשמר כקובץ יחסי ב־uploads
    let absFile;
    if (doc.url && doc.url.startsWith('/uploads/')) {
      absFile = path.join(__dirname, '..', doc.url.replace(/^\//, ''));
    } else {
      absFile = safeUploadsPath(id, subIdx, name);
    }
    const content = fs.existsSync(absFile) ? fs.readFileSync(absFile, 'utf8') : '';

    return res.json({ id: String(doc._id || ''), name, content });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
};

// POST יצירת TXT חדש
exports.createTextDocument = async (req, res) => {
  try {
    const { id, subIdx } = req.params;
    const { name, content } = req.body || {};
    if (!name || !name.toLowerCase().endsWith('.txt')) {
      return res.status(400).json({ error: 'שם קובץ לא תקין (חייב .txt)' });
    }

    const c = await Case.findById(id);
    if (!c || !c.subCases?.[subIdx]) {
      return res.status(404).json({ error: 'תיק/תת-תיק לא נמצא' });
    }

    const absFile = safeUploadsPath(id, subIdx, name);
    writeTextFileSync(absFile, content || '');
    const stats = fs.statSync(absFile);

    const relUrl = `/uploads/cases/${id}/${subIdx}/${name}`.replace(/\\/g, '/');
    const docObj = {
      name,
      originalName: name,
      mimeType: 'text/plain',
      size: stats.size,
      url: relUrl,
      uploadedAt: new Date()
    };

    c.subCases[subIdx].documents = c.subCases[subIdx].documents || [];
    c.subCases[subIdx].documents.push(docObj);
    await c.save();

    return res.status(201).json({ message: 'נוצר', document: docObj });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
};

// PUT עדכון TXT קיים (שם ותוכן)
exports.updateTextDocument = async (req, res) => {
  try {
    const { id, subIdx, docIdx } = req.params;
    const { name, content } = req.body || {};
    if (!name || !name.toLowerCase().endsWith('.txt')) {
      return res.status(400).json({ error: 'שם קובץ לא תקין (חייב .txt)' });
    }

    const c = await Case.findById(id);
    if (!c || !c.subCases?.[subIdx] || !c.subCases[subIdx].documents?.[docIdx]) {
      return res.status(404).json({ error: 'תיק/תת-תיק/מסמך לא נמצא' });
    }

    const doc = c.subCases[subIdx].documents[docIdx];
    const oldName = doc.name || doc.originalName || 'notes.txt';
    const dirAbs = safeUploadsPath(id, subIdx);

    const oldFile = path.join(dirAbs, oldName);
    const newFile = path.join(dirAbs, name);

    ensureDirSync(dirAbs);
    if (oldName !== name && fs.existsSync(oldFile)) {
      fs.renameSync(oldFile, newFile);
    }
    writeTextFileSync(newFile, content || '');

    const stats = fs.statSync(newFile);
    const relUrl = `/uploads/cases/${id}/${subIdx}/${name}`.replace(/\\/g, '/');

    doc.name = name;
    doc.originalName = name;
    doc.mimeType = 'text/plain';
    doc.size = stats.size;
    doc.url = relUrl;
    doc.uploadedAt = new Date();

    await c.save();
    return res.json({ message: 'עודכן', document: doc });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
};




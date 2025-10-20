// controllers/caseController.js
const mongoose = require('mongoose');
const { Readable } = require('stream');
const { ObjectId } = mongoose.Types;

const Case = require('../models/Case');
const User = require('../models/User');
const { createAutoNotification } = require('./notificationController');

/* ------------- עזרי GridFS ------------- */
function bucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'fs' });
}

async function saveBufferToGridFS({ buffer, filename, contentType }) {
  const uploadStream = bucket().openUploadStream(filename || 'file', {
    contentType: contentType || 'application/octet-stream',
    metadata: {}
  });
  const readable = Readable.from(buffer);
  await new Promise((resolve, reject) => {
    readable.pipe(uploadStream).on('error', reject).on('finish', resolve);
  });
  return uploadStream.id;
}

async function renameGridFile(fileId, newName) {
  await mongoose.connection.db
    .collection('fs.files')
    .updateOne({ _id: new ObjectId(fileId) }, { $set: { filename: newName } });
}

async function deleteGridFile(fileId) {
  await bucket().delete(new ObjectId(fileId));
}

/* ------------- תיקים ------------- */
exports.getAllCases = async (req, res) => {
  try {
    const cases = await Case.find();
    res.json(cases);
  } catch {
    res.status(500).json({ error: 'שגיאה בשליפת תיקים' });
  }
};

exports.addCase = async (req, res) => {
  try {
    const { clientName, description } = req.body;

    const user = await User.findOne({ username: clientName });
    if (!user) return res.status(404).json({ error: 'הלקוחה לא נמצאה במסד המשתמשים' });

    const existingCase = await Case.findOne({ $or: [{ clientId: user._id }, { clientName }] });
    if (existingCase) {
      return res.status(409).json({
        error:
          'כבר קיים תיק ללקוחה זו (פתוח או בארכיון). אם תרצי לעבוד עליו – שחזרי אותו מהארכיון.'
      });
    }

    const newCase = new Case({
      clientId: user._id,
      clientName,
      description,
      clientEmail: user.email,
      clientPhone: user.phone,
      clientAddress: user.address,
      progress: [
        {
          title: 'תיק נפתח',
          description: 'התיק נוצר במערכת והועבר לטיפול',
          addedBy: 'המערכת'
        }
      ]
    });

    await newCase.save();
    res.status(201).json(newCase);
  } catch (err) {
    console.error('שגיאה ביצירת תיק:', err);
    if (err && err.code === 11000) {
      return res
        .status(409)
        .json({ error: 'כבר קיים תיק ללקוחה זו. יש לשחזר מהארכיון במקום לפתוח תיק חדש.' });
    }
    res.status(400).json({ error: 'שגיאה ביצירת תיק חדש' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (updated && updated.clientId) {
      try {
        const lawyer = await User.findOne({ role: 'lawyer' });
        await createAutoNotification('status_changed', updated.clientId, lawyer._id, {
          newStatus: req.body.status,
          caseId: updated._id
        });
      } catch (notifError) {
        console.error('שגיאה בשליחת התראה:', notifError);
      }
    }

    res.json(updated);
  } catch {
    res.status(400).json({ error: 'שגיאה בעדכון סטטוס' });
  }
};

exports.deleteCase = async (req, res) => {
  try {
    await Case.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch {
    res.status(400).json({ error: 'שגיאה במחיקת תיק' });
  }
};

exports.getCaseById = async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) return res.status(404).json({ error: 'תיק לא נמצא' });
    res.json(caseItem);
  } catch {
    res.status(500).json({ error: 'שגיאה בשליפת תיק' });
  }
};

/* ------------- תתי-תיקים ------------- */
exports.addSubcase = async (req, res) => {
  try {
    const { title } = req.body;
    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      { $push: { subCases: { title, documents: [] } } },
      { new: true }
    );

    if (updated && updated.clientId) {
      try {
        const lawyer = await User.findOne({ role: 'lawyer' });
        await createAutoNotification('case_update', updated.clientId, lawyer._id, {
          updateTitle: `נוסף תת-תיק חדש: ${title}`,
          caseId: updated._id
        });
      } catch (notifError) {
        console.error('שגיאה בשליחת התראה:', notifError);
      }
    }

    res.json(updated);
  } catch {
    res.status(400).json({ error: 'שגיאה בהוספת תת-תיק' });
  }
};

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

exports.deleteSubcase = async (req, res) => {
  try {
    const { id, index } = req.params;
    const caseItem = await Case.findById(id);
    if (!caseItem || !caseItem.subCases[index]) {
      return res.status(404).json({ error: 'תיק או תת-תיק לא נמצאו' });
    }

    const docs = caseItem.subCases[index].documents || [];
    for (const d of docs) {
      if (d?.gridId) {
        try {
          await deleteGridFile(d.gridId);
        } catch {}
      }
    }

    caseItem.subCases.splice(index, 1);
    await caseItem.save();
    res.json({ message: 'תת-תיק נמחק בהצלחה', case: caseItem });
  } catch (err) {
    console.error('שגיאה במחיקת תת-תיק:', err);
    res.status(400).json({ error: 'שגיאה במחיקת תת-תיק' });
  }
};

/* ------------- קבצים לתת-תיק (GridFS) ------------- */
exports.uploadDocumentToSubcase = async (req, res) => {
  try {
    const { id, index } = req.params;
    if (!req.file) return res.status(400).json({ error: 'לא הועלה קובץ' });

    const caseItem = await Case.findById(id);
    if (!caseItem || !caseItem.subCases[index]) {
      return res.status(404).json({ error: 'תיק או תת-תיק לא נמצאו' });
    }

    const displayName = (req.body.displayName || req.file.originalname || 'file').trim();
    const fileId = await saveBufferToGridFS({
      buffer: req.file.buffer,
      filename: displayName,
      contentType: req.file.mimetype
    });

    const filesCol = mongoose.connection.db.collection('fs.files');
    const fileDoc = await filesCol.findOne({ _id: fileId });

    const doc = {
      gridId: fileId,
      name: fileDoc.filename,
      mimeType: fileDoc.contentType || req.file.mimetype,
      size: fileDoc.length,
      uploadDate: fileDoc.uploadDate,
      kind: 'file',
      uploadedBy: 'lawyer'
    };

    caseItem.subCases[index].documents.push(doc);
    await caseItem.save();

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

exports.editDocumentName = async (req, res) => {
  try {
    const { id, subcaseIndex, docIndex } = req.params;
    const { name } = req.body;

    const caseItem = await Case.findById(id);
    const doc = caseItem?.subCases?.[subcaseIndex]?.documents?.[docIndex];
    if (!doc) return res.status(404).json({ error: 'תיק/תת-תיק/מסמך לא נמצא' });

    if (name) {
      await renameGridFile(doc.gridId, name.trim());
      doc.name = name.trim();
      await caseItem.save();
    }

    res.json({ message: 'מסמך עודכן בהצלחה', case: caseItem });
  } catch (err) {
    console.error('שגיאה בעריכת מסמך:', err);
    res.status(400).json({ error: 'שגיאה בעריכת מסמך' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { id, subcaseIndex, docIndex } = req.params;

    const caseItem = await Case.findById(id);
    const doc = caseItem?.subCases?.[subcaseIndex]?.documents?.[docIndex];
    if (!doc) return res.status(404).json({ error: 'תיק/תת-תיק/מסמך לא נמצא' });

    try {
      await deleteGridFile(doc.gridId);
    } catch {}

    caseItem.subCases[subcaseIndex].documents.splice(docIndex, 1);
    await caseItem.save();

    res.json({ message: 'מסמך נמחק בהצלחה', case: caseItem });
  } catch (err) {
    console.error('שגיאה במחיקת מסמך:', err);
    res.status(400).json({ error: 'שגיאה במחיקת מסמך' });
  }
};

/* ------------- TXT ב-GridFS ------------- */
exports.createTextDocument = async (req, res) => {
  try {
    const { id, subIdx } = req.params;
    const { name, content } = req.body || {};
    if (!name || !name.toLowerCase().endsWith('.txt')) {
      return res.status(400).json({ error: 'שם קובץ לא תקין (חייב .txt)' });
    }

    const c = await Case.findById(id);
    if (!c || !c.subCases?.[subIdx]) return res.status(404).json({ error: 'תיק/תת-תיק לא נמצא' });

    const fileId = await saveBufferToGridFS({
      buffer: Buffer.from(content || '', 'utf8'),
      filename: name.trim(),
      contentType: 'text/plain; charset=utf-8'
    });

    const filesCol = mongoose.connection.db.collection('fs.files');
    const fileDoc = await filesCol.findOne({ _id: fileId });

    c.subCases[subIdx].documents = c.subCases[subIdx].documents || [];
    c.subCases[subIdx].documents.push({
      gridId: fileId,
      name: fileDoc.filename,
      mimeType: 'text/plain',
      size: fileDoc.length,
      uploadDate: fileDoc.uploadDate,
      kind: 'text',
      uploadedBy: 'lawyer'
    });
    await c.save();

    return res.status(201).json({ message: 'נוצר', id: fileId.toString() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'שגיאה ביצירת TXT' });
  }
};

exports.updateTextDocument = async (req, res) => {
  try {
    const { id, subIdx, docIdx } = req.params;
    const { name, content } = req.body || {};
    if (!name || !name.toLowerCase().endsWith('.txt')) {
      return res.status(400).json({ error: 'שם קובץ לא תקין (חייב .txt)' });
    }

    const c = await Case.findById(id);
    const doc = c?.subCases?.[subIdx]?.documents?.[docIdx];
    if (!doc) return res.status(404).json({ error: 'תיק/תת-תיק/מסמך לא נמצא' });

    try {
      await deleteGridFile(doc.gridId);
    } catch {}

    const newId = await saveBufferToGridFS({
      buffer: Buffer.from(content || '', 'utf8'),
      filename: name.trim(),
      contentType: 'text/plain; charset=utf-8'
    });

    const filesCol = mongoose.connection.db.collection('fs.files');
    const fileDoc = await filesCol.findOne({ _id: newId });

    doc.gridId = newId;
    doc.name = fileDoc.filename;
    doc.mimeType = 'text/plain';
    doc.size = fileDoc.length;
    doc.uploadDate = fileDoc.uploadDate;
    doc.kind = 'text';

    await c.save();
    return res.json({ message: 'עודכן', id: newId.toString() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'שגיאה בעדכון TXT' });
  }
};

exports.getTextDocumentContent = async (req, res) => {
  try {
    const { id, subIdx, docIdx } = req.params;
    const c = await Case.findById(id);
    const doc = c?.subCases?.[subIdx]?.documents?.[docIdx];
    if (!doc) return res.status(404).json({ error: 'תיק/תת-תיק/מסמך לא נמצא' });
    if (doc.kind !== 'text') return res.status(400).json({ error: 'לא TXT' });

    const dl = bucket().openDownloadStream(new ObjectId(doc.gridId));
    const chunks = [];
    dl.on('data', (ch) => chunks.push(ch));
    dl.on('error', () => res.status(500).json({ error: 'stream error' }));
    dl.on('end', () => {
      const buf = Buffer.concat(chunks);
      const text = buf.toString('utf8');
      res.json({ id: doc.gridId.toString(), name: doc.name, content: text });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'שגיאה בשליפת TXT' });
  }
};

/* ------------- העלאות מצד הלקוח ------------- */
exports.clientUploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'לא הועלה קובץ' });

    const caseItem = await Case.findById(id);
    if (!caseItem) return res.status(404).json({ error: 'תיק לא נמצא' });

    const fileId = await saveBufferToGridFS({
      buffer: req.file.buffer,
      filename: req.file.originalname || 'client-file',
      contentType: req.file.mimetype
    });

    const filesCol = mongoose.connection.db.collection('fs.files');
    const fileDoc = await filesCol.findOne({ _id: fileId });

    const uploadedBy = req.body.uploadedBy || 'client';
    const clientName = req.body.clientName || 'לקוח';

    const doc = {
      gridId: fileId,
      name: fileDoc.filename,
      mimeType: fileDoc.contentType || req.file.mimetype,
      size: fileDoc.length,
      uploadDate: fileDoc.uploadDate,
      kind: 'file',
      uploadedBy
    };

    caseItem.clientDocuments = caseItem.clientDocuments || [];
    caseItem.clientDocuments.push(doc);

    caseItem.progress.push({
      title: 'מסמך חדש הועלה על ידי הלקוח',
      description: `${clientName} העלה את המסמך: ${doc.name}`,
      addedBy: clientName,
      date: new Date()
    });

    await caseItem.save();

    if (caseItem.clientId) {
      try {
        const lawyer = await User.findOne({ role: 'lawyer' });
        if (lawyer) {
          await createAutoNotification('document_added', lawyer._id, caseItem.clientId, {
            documentName: doc.name,
            clientName,
            caseId: caseItem._id
          });
        }
      } catch (notifError) {
        console.error('שגיאה בשליחת התראה:', notifError);
      }
    }

    res.status(201).json({ message: 'המסמך הועלה בהצלחה', document: doc });
  } catch (error) {
    console.error('שגיאה בהעלאת מסמך מלקוח:', error);
    res.status(500).json({ error: 'שגיאה בהעלאת המסמך' });
  }
};

exports.getClientDocuments = async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) return res.status(404).json({ error: 'תיק לא נמצא' });
    res.json(caseItem.clientDocuments || []);
  } catch (error) {
    console.error('שגיאה בשליפת מסמכי לקוח:', error);
    res.status(500).json({ error: 'שגיאה בשליפת מסמכים' });
  }
};

exports.deleteClientDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;
    const caseItem = await Case.findById(id);
    if (!caseItem) return res.status(404).json({ error: 'תיק לא נמצא' });

    const idx = (caseItem.clientDocuments || []).findIndex(
      (d) => String(d._id) === String(docId)
    );
    if (idx === -1) return res.status(404).json({ error: 'מסמך לא נמצא' });

    const doc = caseItem.clientDocuments[idx];
    try {
      await deleteGridFile(doc.gridId);
    } catch {}

    caseItem.clientDocuments.splice(idx, 1);

    caseItem.progress.push({
      title: 'מסמך נמחק',
      description: `הלקוח מחק את המסמך: ${doc.name}`,
      addedBy: 'לקוח',
      date: new Date()
    });

    await caseItem.save();
    res.json({ message: 'המסמך נמחק בהצלחה' });
  } catch (error) {
    console.error('שגיאה במחיקת מסמך לקוח:', error);
    res.status(500).json({ error: 'שגיאה במחיקת המסמך' });
  }
};

exports.assignClientDocumentToSubcase = async (req, res) => {
  try {
    const { id, docId } = req.params;
    const { subcaseIndex } = req.body;

    const caseItem = await Case.findById(id);
    if (!caseItem) return res.status(404).json({ error: 'תיק לא נמצא' });

    const scIdx = Number(subcaseIndex);
    if (!caseItem.subCases?.[scIdx]) return res.status(400).json({ error: 'תת-תיק לא תקין' });

    const docs = caseItem.clientDocuments || [];
    const pos = docs.findIndex((d) => String(d._id) === String(docId));
    if (pos === -1) return res.status(404).json({ error: 'מסמך לא נמצא' });

    const entry = docs[pos];

    caseItem.subCases[scIdx].documents.push(entry);
    docs.splice(pos, 1);

    caseItem.progress.push({
      title: 'מסמך שובץ לתיק-משנה',
      description: `המסמך "${entry.name}" שויך לתת-תיק "${caseItem.subCases[scIdx].title || '#' + (scIdx + 1)}"`,
      addedBy: 'עורך דין',
      date: new Date()
    });

    await caseItem.save();

    return res.json({
      ok: true,
      message: 'המסמך שובץ בהצלחה',
      subcases: caseItem.subCases,
      remainingClientDocuments: caseItem.clientDocuments
    });
  } catch (e) {
    console.error('assignClientDocumentToSubcase error:', e);
    res.status(500).json({ error: 'שגיאה בשיוך המסמך' });
  }
};

/* ------------- התקדמות ------------- */
exports.addProgress = async (req, res) => {
  try {
    const { title, description, addedBy } = req.body;
    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          progress: { title, description, addedBy, date: new Date() }
        }
      },
      { new: true }
    );

    if (updated && updated.clientId) {
      try {
        const lawyer = await User.findOne({ role: 'lawyer' });
        await createAutoNotification('case_update', updated.clientId, lawyer._id, {
          updateTitle: title,
          caseId: updated._id
        });
      } catch (notifError) {
        console.error('שגיאה בשליחת התראה:', notifError);
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('שגיאה בהוספת עדכון התקדמות:', err);
    res.status(400).json({ error: 'שגיאה בהוספת עדכון התקדמות' });
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

/* ------------- סגירה/שחזור תיק ------------- */
exports.closeCase = async (req, res) => {
  try {
    const { closingNote } = req.body;
    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status: 'סגור', closeDate: new Date(), closingNote: closingNote || '' },
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
        console.error('שגיאה בשליחת התראה על סגירת תיק:', e);
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('closeCase error:', err);
    res.status(500).json({ message: 'שגיאה בסגירת התיק' });
  }
};

exports.reopenCase = async (req, res) => {
  try {
    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status: 'פתוח', closeDate: null, closingNote: null },
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
        console.error('שגיאה בשליחת התראה על פתיחת תיק מחדש:', e);
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('reopenCase error:', err);
    res.status(500).json({ message: 'שגיאה בשחזור התיק' });
  }
};

/* ------------- הורדת קובץ (GridFS) ------------- */
exports.streamFileById = async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.fileId);
    const filesCol = mongoose.connection.db.collection('fs.files');
    const fileDoc = await filesCol.findOne({ _id: fileId });
    if (!fileDoc) return res.status(404).json({ error: 'File not found' });

    res.setHeader('Content-Type', fileDoc.contentType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileDoc.filename || 'file')}"`
    );

    const dl = bucket().openDownloadStream(fileId);
    dl.on('error', () => res.status(500).end());
    dl.pipe(res);
  } catch {
    res.status(400).json({ error: 'Invalid file id' });
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

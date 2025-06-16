const Request = require('../models/Request');
const User = require('../models/User');

// שליחת פנייה חדשה (מלקוח לעורך דין)
exports.sendRequest = async (req, res) => {
  try {
    const { username, subject, message } = req.body;

    if (!username || !subject || !message) {
      return res.status(400).json({ message: 'נא למלא את כל השדות' });
    }

    const newRequest = new Request({ 
      username,
      recipientUsername: 'lawyer', // כל הפניות מגיעות לעורך הדין
      subject, 
      message, 
      sentByLawyer: false,
      direction: 'incoming'
    });
    
    await newRequest.save();
    res.status(200).json({ message: 'הפנייה נשלחה בהצלחה' });
  } catch (error) {
    console.error('שגיאה בשליחת פנייה:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// שליחת הודעה מעורך דין ללקוח
exports.sendToClient = async (req, res) => {
  try {
    const { clientUsername, subject, message, lawyerUsername } = req.body;

    if (!clientUsername || !subject || !message || !lawyerUsername) {
      return res.status(400).json({ message: 'נא למלא את כל השדות' });
    }

    // בדיקה שהלקוח קיים ומאושר
    const client = await User.findOne({ 
      username: clientUsername, 
      role: 'client', 
      approved: true 
    });

    if (!client) {
      return res.status(400).json({ message: 'לקוח לא נמצא או לא מאושר' });
    }

    const newRequest = new Request({ 
      username: lawyerUsername,
      recipientUsername: clientUsername,
      subject, 
      message, 
      sentByLawyer: true,
      direction: 'outgoing'
    });
    
    await newRequest.save();
    res.status(200).json({ message: 'ההודעה נשלחה בהצלחה ללקוח' });
  } catch (error) {
    console.error('שגיאה בשליחת הודעה ללקוח:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// קבלת כל הפניות (לעורך דין)
exports.getAllRequests = async (req, res) => {
  try {
    // עורך דין רואה הודעות שלא נמחקו על ידו
    const requests = await Request.find({
      $or: [
        { deleted: false }, // הודעות שלא נמחקו
        { deleted: true, deletedBy: { $ne: 'עורך דין' } } // הודעות שנמחקו על ידי לקוח
      ]
    }).sort({ createdAt: -1 });
    
    res.status(200).json(requests);
  } catch (error) {
    console.error('שגיאה בקבלת הפניות:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// קבלת פניות לפי משתמש (ללקוח)
exports.getRequestsByUser = async (req, res) => {
  try {
    const { username } = req.params;
    
    // פשוט יותר - רק הודעות שלא נמחקו על ידי המשתמש הנוכחי
    const requests = await Request.find({
      $and: [
        {
          $or: [
            { username: username }, // הודעות שהוא שלח
            { recipientUsername: username } // הודעות שנשלחו אליו
          ]
        },
        {
          $or: [
            { deleted: { $exists: false } }, // הודעות ישנות בלי שדה deleted
            { deleted: false }, // הודעות חדשות שלא נמחקו
            { $and: [{ deleted: true }, { deletedBy: { $ne: username } }] } // נמחקו על ידי אחרים
          ]
        }
      ]
    }).sort({ createdAt: -1 });
    
    res.status(200).json(requests);
  } catch (error) {
    console.error('שגיאה בקבלת פניות המשתמש:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// מענה לפנייה
exports.replyToRequest = async (req, res) => {
  try {
    const originalRequest = await Request.findById(req.params.id);
    if (!originalRequest) {
      return res.status(404).json({ message: 'פנייה לא נמצאה' });
    }

    // יצירת הודעת תגובה חדשה
    const replyMessage = new Request({
      username: 'עורך דין',
      recipientUsername: originalRequest.username,
      subject: `תגובה: ${originalRequest.subject}`,
      message: req.body.response,
      sentByLawyer: true,
      direction: 'outgoing',
      read: false // הודעה חדשה לא נקראה
    });
    
    await replyMessage.save();

    // סימון ההודעה המקורית כנענתה
    originalRequest.response = req.body.response;
    await originalRequest.save();

    res.status(200).json({ message: 'תגובה נשלחה בהצלחה' });
  } catch (error) {
    console.error('שגיאה בשליחת תגובה:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// סגירת פנייה
exports.closeRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'פנייה לא נמצאה' });
    }

    request.status = 'closed';
    await request.save();

    res.status(200).json({ message: 'פנייה נסגרה בהצלחה' });
  } catch (error) {
    console.error('שגיאה בסגירת פנייה:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// העברה לארכיון
exports.archiveRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'פנייה לא נמצאה' });
    }

    request.archived = true;
    await request.save();

    res.status(200).json({ message: 'פנייה הועברה לארכיון' });
  } catch (error) {
    console.error('שגיאה בהעברה לארכיון:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// שחזור מארכיון
exports.unarchiveRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'פנייה לא נמצאה' });
    }

    request.archived = false;
    request.status = 'open';
    await request.save();

    res.status(200).json({ message: 'פנייה שוחזרה מהארכיון' });
  } catch (error) {
    console.error('שגיאה בשחזור מארכיון:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// קבלת רשימת לקוחות מאושרים
exports.getClients = async (req, res) => {
  try {
    const clients = await User.find({ 
      role: 'client', 
      approved: true 
    }).select('username email phone');
    
    res.status(200).json(clients);
  } catch (error) {
    console.error('שגיאה בקבלת לקוחות:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// סימון הודעה כנקראה
exports.markAsRead = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'הודעה לא נמצאה' });
    }

    request.read = true;
    await request.save();

    res.status(200).json({ message: 'הודעה סומנה כנקראה' });
  } catch (error) {
    console.error('שגיאה בסימון הודעה כנקראה:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

// קבלת מספר הודעות לא נקראות
exports.getUnreadCount = async (req, res) => {
  try {
    const { username } = req.params;
    
    const unreadCount = await Request.countDocuments({
      recipientUsername: username,
      read: false,
      archived: false
    });
    
    res.status(200).json({ count: unreadCount });
  } catch (error) {
    console.error('שגיאה בספירת הודעות לא נקראות:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const message = await Request.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'הודעה לא נמצאה' });
    }

    message.deleted = true;
    message.deletedBy = req.body.username; // מי מחק
    await message.save();

    res.status(200).json({ message: 'ההודעה נמחקה בהצלחה' });
  } catch (error) {
    console.error('שגיאה במחיקת הודעה:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};
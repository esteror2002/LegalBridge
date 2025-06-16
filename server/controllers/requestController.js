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
    const requests = await Request.find().sort({ createdAt: -1 });
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
    
    // לקוח רואה הודעות שהוא שלח או שנשלחו אליו
    const requests = await Request.find({
      $or: [
        { username: username }, // הודעות שהוא שלח
        { recipientUsername: username } // הודעות שנשלחו אליו
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
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'פנייה לא נמצאה' });
    }

    request.response = req.body.response;
    await request.save();

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
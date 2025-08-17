const Notification = require('../models/Notification');
const User = require('../models/User');

// קבלת כל ההתראות של משתמש
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const query = { 
      recipientId: userId, 
      isDeleted: false 
    };
    
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .populate('senderId', 'username role')
      .populate('relatedCaseId', 'clientName description')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const totalCount = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
      isDeleted: false
    });
    
    res.json({
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalNotifications: totalCount,
        unreadCount
      }
    });
    
  } catch (error) {
    console.error('שגיאה בקבלת התראות:', error);
    res.status(500).json({ error: 'שגיאה בקבלת התראות' });
  }
};

// יצירת התראה חדשה
exports.createNotification = async (req, res) => {
  try {
    const { 
      recipientId, 
      senderId, 
      type, 
      title, 
      message, 
      link, 
      relatedCaseId,
      scheduledFor 
    } = req.body;
    
    // בדיקה שהמקבל קיים
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'משתמש מקבל לא נמצא' });
    }
    
    const notification = await Notification.createNotification({
      recipientId,
      senderId,
      type,
      title,
      message,
      link,
      relatedCaseId,
      scheduledFor
    });
    
    // populate לתגובה
    await notification.populate([
      { path: 'senderId', select: 'username role' },
      { path: 'relatedCaseId', select: 'clientName description' }
    ]);
    
    res.status(201).json(notification);
    
  } catch (error) {
    console.error('שגיאה ביצירת התראה:', error);
    res.status(400).json({ error: 'שגיאה ביצירת התראה' });
  }
};

// סימון התראה כנקראה
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'התראה לא נמצאה' });
    }
    
    await notification.markAsRead();
    res.json({ message: 'התראה סומנה כנקראה' });
    
  } catch (error) {
    console.error('שגיאה בעדכון התראה:', error);
    res.status(400).json({ error: 'שגיאה בעדכון התראה' });
  }
};

// סימון כל ההתראות כנקראות
exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    
    await Notification.updateMany(
      { 
        recipientId: userId, 
        isRead: false, 
        isDeleted: false 
      },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );
    
    res.json({ message: 'כל ההתראות סומנו כנקראות' });
    
  } catch (error) {
    console.error('שגיאה בעדכון התראות:', error);
    res.status(400).json({ error: 'שגיאה בעדכון התראות' });
  }
};

// מחיקת התראה
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'התראה לא נמצאה' });
    }
    
    await notification.softDelete();
    res.json({ message: 'התראה נמחקה' });
    
  } catch (error) {
    console.error('שגיאה במחיקת התראה:', error);
    res.status(400).json({ error: 'שגיאה במחיקת התראה' });
  }
};

// פונקציית עזר ליצירת התראות אוטומטיות
exports.createAutoNotification = async (type, recipientId, senderId, data) => {
  try {
    let title, message, link;
    
    switch (type) {
      case 'case_update':
        title = 'עדכון חדש בתיק שלך';
        message = `נוסף עדכון התקדמות חדש: ${data.updateTitle}`;
        link = 'client-case.html';
        break;
        
      case 'document_added':
        title = 'מסמך חדש נוסף לתיק';
        message = `נוסף מסמך חדש: ${data.documentName}`;
        link = 'client-case.html';
        break;
        
      case 'status_changed':
        title = 'שינוי סטטוס תיק';
        message = `סטטוס התיק שונה ל: ${data.newStatus}`;
        link = 'client-case.html';
        break;
        
      case 'new_message':
        title = 'הודעה חדשה';
        message = `קיבלת הודעה חדשה מעורך הדין`;
        link = 'client-case.html';
        break;
        
      default:
        title = 'התראה חדשה';
        message = data.message || 'יש לך התראה חדשה';
        link = data.link || null;
    }
    
    return await Notification.createNotification({
      recipientId,
      senderId,
      type,
      title,
      message,
      link,
      relatedCaseId: data.caseId || null
    });
    
  } catch (error) {
    console.error('שגיאה ביצירת התראה אוטומטית:', error);
    throw error;
  }
};

// קבלת סטטיסטיקות התראות
exports.getNotificationStats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const stats = await Notification.aggregate([
      { $match: { recipientId: mongoose.Types.ObjectId(userId), isDeleted: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
          byType: {
            $push: {
              type: '$type',
              isRead: '$isRead'
            }
          }
        }
      }
    ]);
    
    const typeStats = {};
    if (stats[0]) {
      stats[0].byType.forEach(item => {
        if (!typeStats[item.type]) {
          typeStats[item.type] = { total: 0, unread: 0 };
        }
        typeStats[item.type].total++;
        if (!item.isRead) {
          typeStats[item.type].unread++;
        }
      });
    }
    
    res.json({
      total: stats[0]?.total || 0,
      unread: stats[0]?.unread || 0,
      byType: typeStats
    });
    
  } catch (error) {
    console.error('שגיאה בקבלת סטטיסטיקות:', error);
    res.status(500).json({ error: 'שגיאה בקבלת סטטיסטיקות' });
  }
};

exports.getForUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const unreadOnly = req.query.unreadOnly === 'true';

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'משתמש לא נמצא' });

    const filter = { recipientId: user._id, isDeleted: false };
    if (unreadOnly) filter.isRead = false;

    const items = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json(items);
  } catch (err) {
    console.error('getForUsername error:', err);
    res.status(500).json({ message: 'שגיאה בשליפת התראות' });
  }
};

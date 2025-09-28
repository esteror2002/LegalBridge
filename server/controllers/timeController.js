// server/controllers/timeController.js
const mongoose = require('mongoose');
const TimeLog  = require('../models/TimeLog');
const Request  = require('../models/Request');
let Task; try { Task = require('../models/Task'); } catch { Task = null; }

// ===== Helpers =====
const oid = (x) => new mongoose.Types.ObjectId(x);

function getLawyerId(req) {
  if (req.user?.id) return oid(req.user.id);                     // אם יש auth middleware
  if (req.headers['x-user-id']) return oid(req.headers['x-user-id']); // מצב פיתוח
  if (req.body.lawyerId) return oid(req.body.lawyerId);
  throw new Error('lawyerId is required');
}

function dayBounds(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return { start, end };
}

// ===== Controllers =====
exports.start = async (req, res) => {
  try {
    const lawyerId = getLawyerId(req);
    const { caseId = null, activity = 'case', notes = '' } = req.body;

    // סוגר טיימרים פתוחים קודמים
    await TimeLog.updateMany({ lawyerId, endedAt: null }, { endedAt: new Date() });

    const doc = await TimeLog.create({
      lawyerId,
      caseId: caseId ? oid(caseId) : null,
      activity,
      notes,
      startedAt: new Date(),
      endedAt: null,
      durationMin: 0
    });

    res.json(doc);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.stop = async (req, res) => {
  try {
    const _id = oid(req.params.id);
    const doc = await TimeLog.findById(_id);
    if (!doc) throw new Error('TimeLog not found');

    if (!doc.endedAt) {
      doc.endedAt = new Date();
      const ms = doc.endedAt - doc.startedAt;
      doc.durationMin = Math.max(0, Math.round(ms / 60000));
    }
    await doc.save();
    res.json(doc);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.manual = async (req, res) => {
  try {
    const lawyerId = getLawyerId(req);
    const { caseId = null, activity = 'other', date, minutes = 0, notes = '' } = req.body;
    const start = date ? new Date(date) : new Date();
    const end   = new Date(start.getTime() + minutes * 60000);

    const doc = await TimeLog.create({
      lawyerId,
      caseId: caseId ? oid(caseId) : null,
      activity,
      notes,
      startedAt: start,
      endedAt: end,
      durationMin: minutes
    });

    res.json(doc);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.caseTotal = async (req, res) => {
    try {
      const userId = req.headers['x-user-id'];
      const { caseId } = req.params;
  
      if (!userId || !mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'missing/invalid x-user-id' });
      }
      if (!caseId || !mongoose.isValidObjectId(caseId)) {
        return res.status(400).json({ message: 'invalid caseId' });
      }
  
      const logs = await TimeLog.find({ lawyerId: userId, caseId })
        .select('startedAt endedAt');
  
      const now = new Date();
      let minutes = 0;
  
      for (const l of logs) {
        if (!l.startedAt) continue;
        const start = new Date(l.startedAt);
        const end = l.endedAt ? new Date(l.endedAt) : now; // ⭐ מחשב גם לוג פתוח
        const diff = end - start;
        if (diff > 0) minutes += Math.floor(diff / 60000);
      }
  
      res.json({ caseId, minutes });
    } catch (e) {
      console.error('caseTotal error:', e);
      res.status(500).json({ message: 'server error' });
    }
  };

exports.daily = async (req, res) => {
  try {
    const lawyerId = getLawyerId(req);
    const { start, end } = dayBounds(req.query.date);

    const byActivity = await TimeLog.aggregate([
      { $match: { lawyerId, endedAt: { $ne: null }, startedAt: { $gte: start, $lt: end } } },
      { $group: { _id: '$activity', minutes: { $sum: '$durationMin' } } }
    ]);

    const map = Object.fromEntries(byActivity.map(x => [x._id, x.minutes]));
    const totalMinutes = Object.values(map).reduce((a, b) => a + (b || 0), 0);

    const rqFilter = { updatedAt: { $gte: start, $lt: end } };
    if (lawyerId) rqFilter.handledBy = lawyerId; // אם אין שדה כזה – תורידי

    const closedRequests = await Request.countDocuments({ ...rqFilter, status: 'closed' }).catch(() => 0);
    const doneTasks = Task?.countDocuments
      ? await Task.countDocuments({ ...rqFilter, status: 'done' }).catch(() => 0)
      : 0;

    res.json({
      date: start,
      minutesByActivity: {
        case:    map.case    || 0,
        request: map.request || 0,
        task:    map.task    || 0,
        meeting: map.meeting || 0,
        other:   map.other   || 0
      },
      totalMinutes,
      closedRequests,
      doneTasks
    });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

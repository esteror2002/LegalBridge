// client/js/time-tracker.js
(function(){
    const API_BASE = 'http://localhost:5000/api/time';
    const UID = localStorage.getItem('userId') || localStorage.getItem('lawyerId') || ''; // תעדיפי לשמור userId בלוגין
    if (!UID) console.warn('time-tracker: missing user id (x-user-id)');
  
    // מזהה טיימר נשמר כדי לשרוד רענון/קריסה
    function key(scope){ return `lb_timeLogId_${scope}`; }
  
    async function apiStart({activity, caseId=null, notes=''}) {
      const res = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': UID },
        body: JSON.stringify({ activity, caseId, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message||'start failed');
      return data; // { _id, ... }
    }
  
    async function apiStop(id) {
      if (!id) return null;
      const res = await fetch(`${API_BASE}/stop/${id}`, {
        method: 'PUT',
        headers: { 'x-user-id': UID },
        keepalive: true // חשוב ל-beforeunload
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message||'stop failed');
      return data;
    }
  
    // יוזר־איידל: אם אין תנועה X דקות – עוצרים
    function makeIdleDetector({minutes=5, onIdle}) {
      let t;
      const reset = () => {
        clearTimeout(t);
        t = setTimeout(onIdle, minutes*60*1000);
      };
      ['mousemove','keydown','scroll','click','touchstart'].forEach(ev=>{
        window.addEventListener(ev, reset, {passive:true});
      });
      reset();
      return () => clearTimeout(t);
    }
  
    // API חיצוני לשימוש בדפים
    window.TimeTracker = {
      /**
       * init({scope, activity, caseId, notes, idleMinutes})
       * scope = מחרוזת ייחודית לדף/יישות (למשל: `case_<id>`)
       */
      async init({scope, activity='case', caseId=null, notes='', idleMinutes=5}) {
        if (!UID) return console.warn('TimeTracker: no UID, skipping');
        const k = key(scope);
        let current = localStorage.getItem(k);
  
        // אם אין טיימר רץ – נתחיל אחד
        if (!current) {
          try {
            const started = await apiStart({activity, caseId, notes});
            current = started._id;
            localStorage.setItem(k, current);
            // console.log('timer started', started);
          } catch (e) {
            console.error('TimeTracker start error:', e);
          }
        }
  
        // עצירה כשעוברים טאב/ממזערים
        const onHidden = async () => {
          if (document.visibilityState === 'hidden') {
            try {
              await apiStop(localStorage.getItem(k));
              localStorage.removeItem(k);
            } catch (e) { /* no-op */ }
          }
        };
        document.addEventListener('visibilitychange', onHidden);
  
        // עצירה בסגירת דף
        window.addEventListener('beforeunload', (e) => {
          const id = localStorage.getItem(k);
          if (id) {
            // keepalive=true מאפשר לבקשה להישלח גם בסגירה
            navigator.sendBeacon; // רק כדי לוודא שהדפדפן טוען את היכולות
            fetch(`${API_BASE}/stop/${id}`, { method:'PUT', headers:{'x-user-id': UID}, keepalive:true });
            localStorage.removeItem(k);
          }
        });
  
        // עצירה באי־פעילות
        const cancelIdle = makeIdleDetector({
          minutes: idleMinutes,
          onIdle: async () => {
            try {
              await apiStop(localStorage.getItem(k));
              localStorage.removeItem(k);
              // אפשר להציג טוסט "הטיימר נעצר עקב חוסר פעילות"
            } catch (e) { /* ignore */ }
          }
        });
  
        // מחזיר פונקציה לעצור ידנית
        return async function stop() {
          cancelIdle();
          try {
            await apiStop(localStorage.getItem(k));
          } finally {
            localStorage.removeItem(k);
          }
        };
      }
    };
  })();
  
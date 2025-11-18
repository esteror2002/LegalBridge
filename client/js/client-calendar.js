// client-calendar.js
// יומן פגישות + משימות ללקוח בלבד

let currentMonth;
let currentYear;
let events = [];
let tasks = [];
let eventModal = null;
let taskModal = null;
let username = null;

// עליית הדף
document.addEventListener("DOMContentLoaded", async () => {
  username = localStorage.getItem("username");
  const role = localStorage.getItem("role");

  // רק לקוח
  if (!username || role !== "client") {
    alert("רק לקוחות רשאים לגשת ליומן האישי.");
    window.location.href = "../index.html";
    return;
  }

  // ברכת שלום
  const greeting = document.getElementById("greeting");
  if (greeting) greeting.textContent = `שלום, ${username}`;

  // הגדרת חודש נוכחי
  const now = new Date();
  currentMonth = now.getMonth();
  currentYear = now.getFullYear();

  // מודאל פגישות
  const eventModalEl = document.getElementById("eventModal");
  if (eventModalEl) eventModal = new bootstrap.Modal(eventModalEl);

  // מודאל משימה
  const taskModalEl = document.getElementById("taskModal");
  if (taskModalEl) taskModal = new bootstrap.Modal(taskModalEl);

  // מאזינים
  attachEventHandlers();

  // טען נתונים מהשרת
  await loadEvents();
  await loadTasks();

  // בנה את היומן + משימות
  buildCalendar();
  renderTasks();
});

/* ==============================
   מאזינים
================================= */

function attachEventHandlers() {
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");
  const openEventModalBtn = document.getElementById("openEventModal");
  const saveEventBtn = document.getElementById("saveEventBtn");

  const openTaskModalBtn = document.getElementById("openTaskModal");
  const saveTaskBtn = document.getElementById("saveTaskBtn");

  if (prevBtn) prevBtn.addEventListener("click", () => changeMonth(-1));

  if (nextBtn) nextBtn.addEventListener("click", () => changeMonth(1));

  if (openEventModalBtn)
    openEventModalBtn.addEventListener("click", () => openEventModal());

  if (saveEventBtn) saveEventBtn.addEventListener("click", onSaveEvent);

  // פתיחת מודאל משימה
  if (openTaskModalBtn && taskModal) {
    openTaskModalBtn.addEventListener("click", () => {
      const today = new Date().toISOString().split("T")[0];
      document.getElementById("taskForm").reset();
      document.getElementById("taskDueDate").value = today;
      taskModal.show();
    });
  }

  // שמירת משימה
  if (saveTaskBtn) saveTaskBtn.addEventListener("click", onAddTask);
}

/* =============================
      יומן – בניית חודש
=============================== */

function buildCalendar() {
  const monthNames = [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
  ];

  const currentMonthLabel = document.getElementById("currentMonth");
  const calendarBody = document.getElementById("calendarBody");

  if (!currentMonthLabel || !calendarBody) return;

  currentMonthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  calendarBody.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1);
  let startingDay = firstDay.getDay(); // ראשון = 0
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  let date = 1;

  for (let row = 0; row < 6; row++) {
    const tr = document.createElement("tr");

    for (let col = 0; col < 7; col++) {
      const td = document.createElement("td");

      if (row === 0 && col < startingDay) {
        td.classList.add("disabled");
      } else if (date > daysInMonth) {
        td.classList.add("disabled");
      } else {
        const dayDate = new Date(currentYear, currentMonth, date);
        const dateStr = dayDate.toISOString().split("T")[0];

        // מספר יום
        const daySpan = document.createElement("div");
        daySpan.className = "calendar-day-number";
        daySpan.textContent = date;
        td.appendChild(daySpan);

        // אירועים ליום
        const dayEvents = events.filter((ev) => ev.date === dateStr);
        dayEvents.forEach((ev) => {
          const evDiv = document.createElement("div");
          evDiv.className = "calendar-event";
          const time = ev.startTime ? `${ev.startTime} ` : "";
          evDiv.textContent = `${time}${ev.title}`;

          evDiv.addEventListener("click", (e) => {
            e.stopPropagation();
            openEventModal(ev);
          });

          td.appendChild(evDiv);
        });

        td.addEventListener("click", () =>
          openEventModal({ date: dateStr })
        );

        date++;
      }

      tr.appendChild(td);
    }

    calendarBody.appendChild(tr);
  }
}

function changeMonth(diff) {
  currentMonth += diff;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  buildCalendar();
}

/* =============================
        פגישות – Events
=============================== */

async function loadEvents() {
  try {
    const res = await fetch(
      `/api/calendar/${encodeURIComponent(username)}/events`
    );
    if (!res.ok) return;
    events = await res.json();
  } catch (err) {
    console.error("שגיאה בטעינת אירועים", err);
  }
}

function openEventModal(eventObj) {
  const form = document.getElementById("eventForm");
  if (!form || !eventModal) return;

  const id = document.getElementById("eventId");
  const title = document.getElementById("eventTitle");
  const date = document.getElementById("eventDate");
  const time = document.getElementById("eventTime");
  const location = document.getElementById("eventLocation");
  const type = document.getElementById("eventType");
  const desc = document.getElementById("eventDescription");

  if (eventObj && eventObj._id) {
    id.value = eventObj._id;
    title.value = eventObj.title;
    date.value = eventObj.date;
    time.value = eventObj.startTime;
    location.value = eventObj.location || "";
    type.value = eventObj.type;
    desc.value = eventObj.description || "";
  } else {
    id.value = "";
    title.value = "";
    date.value =
      (eventObj && eventObj.date) ||
      new Date().toISOString().split("T")[0];
    time.value = "";
    location.value = "";
    type.value = "meeting";
    desc.value = "";
  }

  eventModal.show();
}

async function onSaveEvent() {
  const id = document.getElementById("eventId").value;
  const payload = {
    title: document.getElementById("eventTitle").value.trim(),
    date: document.getElementById("eventDate").value,
    startTime: document.getElementById("eventTime").value,
    location: document.getElementById("eventLocation").value.trim(),
    type: document.getElementById("eventType").value,
    description: document.getElementById("eventDescription").value.trim(),
    priority: "medium",
    status: "scheduled",
    isRecurring: false,
    reminderEnabled: false,
  };

  if (!payload.title || !payload.date || !payload.startTime) {
    alert("יש למלא כותרת, תאריך ושעה");
    return;
  }

  try {
    let res;

    if (id) {
      res = await fetch(
        `/api/calendar/${encodeURIComponent(username)}/events/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
    } else {
      res = await fetch(
        `/api/calendar/${encodeURIComponent(username)}/events`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
    }

    if (!res.ok) {
      alert("שגיאה בשמירת הפגישה");
      return;
    }

    await loadEvents();
    buildCalendar();
    eventModal.hide();
  } catch (err) {
    console.error("שגיאה בשמירת אירוע", err);
    alert("שגיאה בשמירת הפגישה");
  }
}

/* =============================
         משימות – Tasks
=============================== */

async function loadTasks() {
  try {
    const res = await fetch(
      `/api/calendar/${encodeURIComponent(username)}/tasks`
    );
    if (!res.ok) return;
    tasks = await res.json();
  } catch (err) {
    console.error("שגיאה בטעינת משימות", err);
  }
}

function renderTasks() {
  const list = document.getElementById("taskList");
  if (!list) return;

  list.innerHTML = "";

  if (!tasks.length) {
    const empty = document.createElement("li");
    empty.className = "list-group-item text-center text-muted";
    empty.textContent = "אין משימות כרגע. אפשר להוסיף משימה חדשה למעלה.";
    list.appendChild(empty);
    return;
  }

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "list-group-item task-item";

    if (task.status === "completed") li.classList.add("done");

    const textSpan = document.createElement("span");
    textSpan.textContent = task.title;
    li.appendChild(textSpan);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.innerHTML =
      task.status === "completed"
        ? '<i class="bi bi-check-square-fill text-success"></i>'
        : '<i class="bi bi-square"></i>';

    toggleBtn.addEventListener("click", () => toggleTask(task));
    actions.appendChild(toggleBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = '<i class="bi bi-trash text-danger"></i>';
    deleteBtn.addEventListener("click", () => deleteTask(task));
    actions.appendChild(deleteBtn);

    li.appendChild(actions);
    list.appendChild(li);
  });
}

/* =============================
        הוספת משימה
=============================== */

async function onAddTask() {
  const title = document.getElementById("taskTitle").value.trim();
  const description = document.getElementById("taskDescription").value.trim();
  const dueDate = document.getElementById("taskDueDate").value;
  const priority = document.getElementById("taskPriority").value;

  if (!title || !dueDate) {
    alert("יש למלא כותרת ותאריך יעד");
    return;
  }

  const payload = {
    title,
    description,
    dueDate,
    priority,
    status: "pending",
  };

  try {
    const res = await fetch(
      `/api/calendar/${encodeURIComponent(username)}/tasks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("שגיאה בהוספת משימה:", errText);
      alert("שגיאה בהוספת משימה");
      return;
    }

    const created = await res.json();
    tasks.unshift(created);
    renderTasks();
    taskModal.hide();
  } catch (err) {
    console.error("שגיאה ביצירת משימה", err);
    alert("שגיאה בהוספת משימה");
  }
}

/* =============================
       עדכון / מחיקה
=============================== */

async function toggleTask(task) {
  const newStatus = task.status === "completed" ? "pending" : "completed";

  try {
    const res = await fetch(
      `/api/calendar/${encodeURIComponent(username)}/tasks/${task._id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      }
    );

    if (!res.ok) {
      alert("שגיאה בעדכון משימה");
      return;
    }

    const updated = await res.json();
    const index = tasks.findIndex((t) => t._id === task._id);
    if (index !== -1) tasks[index] = updated;

    renderTasks();
  } catch (err) {
    alert("שגיאה בעדכון משימה");
  }
}

async function deleteTask(task) {
  if (!confirm("למחוק משימה זו?")) return;

  try {
    const res = await fetch(
      `/api/calendar/${encodeURIComponent(username)}/tasks/${task._id}`,
      {
        method: "DELETE",
      }
    );

    if (!res.ok) {
      alert("שגיאה במחיקת משימה");
      return;
    }

    tasks = tasks.filter((t) => t._id !== task._id);
    renderTasks();
  } catch (err) {
    alert("שגיאה במחיקת משימה");
  }
}

/* =============================
      פונקציות עזר
=============================== */

function logout() {
  localStorage.clear();
  window.location.href = "../index.html";
}

function toggleNotifications() {
  console.log("notifications not implemented on this page");
}

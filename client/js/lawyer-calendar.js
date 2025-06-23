class LawyerCalendar {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'month';
        this.events = [];
        this.tasks = [];
        this.username = this.getCurrentUsername();
        this.init();
    }

    async init() {
        this.updateGreeting();
        await this.loadEvents();
        await this.loadTasks();
        this.renderCalendar();
        this.renderTasks();
        this.updateCurrentPeriod();
        this.setupEventListeners();
        this.setupNotifications();
    }

    // ===== USER MANAGEMENT =====
    getCurrentUsername() {
        // Try to get username from localStorage (saved in login)
        const username = localStorage.getItem('username');
        
        if (!username) {
            // אם אין שם משתמש, הפנה לעמוד הבית
            alert('אנא התחבר למערכת');
            window.location.href = '../index.html';
            return null;
        }
        
        return username;
    }

    // ===== API CALLS =====
    async apiCall(endpoint, method = 'GET', data = null) {
        try {
            const config = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            if (data && method !== 'GET') {
                config.body = JSON.stringify(data);
            }

            const response = await fetch(`/api/calendar/${this.username}${endpoint}`, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            this.showAlert('שגיאה בתקשורת עם השרת', 'error');
            throw error;
        }
    }

    // ===== DATE & TIME UTILITIES =====
    formatDate(date) {
        return date.toLocaleDateString('he-IL');
    }

    formatTime(time) {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getHebrewMonth(month) {
        const months = [
            'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
            'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
        ];
        return months[month];
    }

    getHebrewDay(day) {
        const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        return days[day];
    }

    // ===== GREETING SYSTEM =====
    updateGreeting() {
        const hour = new Date().getHours();
        let greeting = 'שלום';
        
        if (hour < 12) greeting = 'בוקר טוב';
        else if (hour < 17) greeting = 'צהריים טובים';
        else if (hour < 21) greeting = 'ערב טוב';
        else greeting = 'לילה טוב';

        document.getElementById('greeting').textContent = `${greeting}, עורכת דין`;
    }

    // ===== DATA LOADING =====
    async loadEvents() {
        try {
            this.events = await this.apiCall('/events');
        } catch (error) {
            console.error('שגיאה בטעינת אירועים:', error);
            this.events = [];
        }
    }

    async loadTasks() {
        try {
            this.tasks = await this.apiCall('/tasks');
        } catch (error) {
            console.error('שגיאה בטעינת משימות:', error);
            this.tasks = [];
        }
    }

    // ===== CALENDAR RENDERING =====
    renderCalendar() {
        const calendarView = document.getElementById('calendar-view');
        
        switch(this.currentView) {
            case 'month':
                this.renderMonthView(calendarView);
                break;
            case 'week':
                this.renderWeekView(calendarView);
                break;
            case 'day':
                this.renderDayView(calendarView);
                break;
        }
    }

    renderMonthView(container) {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
    
        let html = `
            <div class="calendar-header">
                <div class="day-header">ראשון</div>
                <div class="day-header">שני</div>
                <div class="day-header">שלישי</div>
                <div class="day-header">רביעי</div>
                <div class="day-header">חמישי</div>
                <div class="day-header">שישי</div>
                <div class="day-header">שבת</div>
            </div>
            <div class="calendar-body">
        `;
    
        for (let i = 0; i < firstDayOfWeek; i++) {
            html += '<div class="calendar-day empty"></div>';
        }
    
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayEvents = this.getEventsForDate(dateStr);
            const isToday = this.isToday(date);
            const isWeekend = date.getDay() === 5 || date.getDay() === 6;
    
            html += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}" 
                     onclick="calendar.selectDate('${dateStr}')">
                    <div class="day-number">${day}</div>
                    <div class="day-events">
                        ${dayEvents.map(event => `
                            <div class="event-dot ${event.type}" 
                                 title="${event.title} - ${event.startTime}"
                                 onclick="event.stopPropagation(); calendar.showEventDetails('${event._id}')">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    
        html += '</div>';
        container.innerHTML = html;
    }

    renderWeekView(container) {
        const startOfWeek = this.getStartOfWeek(this.currentDate);
        const hours = Array.from({length: 13}, (_, i) => i + 8); // 8:00-20:00
        
        let html = `
            <div class="week-header">
                ${Array.from({length: 7}, (_, i) => {
                    const date = new Date(startOfWeek);
                    date.setDate(date.getDate() + i);
                    const isToday = this.isToday(date);
                    return `
                        <div class="week-day-header ${isToday ? 'today' : ''}">
                            <div class="day-name">${this.getHebrewDay(date.getDay())}</div>
                            <div class="day-date">${date.getDate()}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="week-body">
                <div class="time-column">
                    ${hours.map(hour => `
                        <div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>
                    `).join('')}
                </div>
                <div class="week-days">
                    ${Array.from({length: 7}, (_, i) => {
                        const date = new Date(startOfWeek);
                        date.setDate(date.getDate() + i);
                        const dateStr = date.toISOString().split('T')[0];
                        const dayEvents = this.getEventsForDate(dateStr);
                        
                        return `
                            <div class="week-day-column">
                                ${hours.map(hour => `
                                    <div class="hour-slot" data-date="${dateStr}" data-hour="${hour}">
                                        ${this.renderHourEvents(dayEvents, hour)}
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    renderDayView(container) {
        // תיקון: חישוב התאריך המדויק
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const day = this.currentDate.getDate();
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        console.log('Day view date calculation:');
        console.log('currentDate object:', this.currentDate);
        console.log('Calculated dateStr:', dateStr);
        
        const dayEvents = this.getEventsForDate(dateStr);
        const hours = Array.from({length: 13}, (_, i) => i + 8); // 8:00-20:00
    
        let html = `
            <div class="day-header">
                <h2>${this.getHebrewDay(this.currentDate.getDay())}, ${this.currentDate.getDate()} ${this.getHebrewMonth(this.currentDate.getMonth())}</h2>
            </div>
            <div class="day-body">
                <div class="time-column">
                    ${hours.map(hour => `
                        <div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>
                    `).join('')}
                </div>
                <div class="day-events-column">
                    ${hours.map(hour => `
                        <div class="hour-slot" data-date="${dateStr}" data-hour="${hour}">
                            ${this.renderHourEvents(dayEvents, hour)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    
        container.innerHTML = html;
    }

    renderHourEvents(events, hour) {
        const hourEvents = events.filter(event => {
            if (!event.startTime) return false;
            const eventHour = parseInt(event.startTime.split(':')[0]);
            return eventHour === hour;
        });
    
        return hourEvents.map(event => `
            <div class="calendar-event ${event.type}" onclick="calendar.showEventDetails('${event._id}')">
                <div class="event-time">${this.formatTime(event.startTime)}</div>
                <div class="event-title">${event.title}</div>
                <div class="event-actions" onclick="event.stopPropagation();">
                    <button class="edit-event-btn" onclick="calendar.editEvent('${event._id}')" title="ערוך אירוע">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="delete-event-btn" onclick="calendar.deleteEvent('${event._id}')" title="מחק אירוע">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    

    // ===== EVENT MANAGEMENT =====
    getEventsForDate(dateStr) {
        console.log('=== DEBUG ===');
        console.log('Looking for events on:', dateStr);
        console.log('All events:', this.events);
        console.log('Event dates:', this.events.map(e => e.date));
        
        const filtered = this.events.filter(event => event.date === dateStr);
        console.log('Found events:', filtered);
        console.log('=============');
        
        return filtered;
    }

    async addEvent() {
        const title = document.getElementById('event-title').value;
        const date = document.getElementById('event-date').value;
        const startTime = document.getElementById('event-time').value;
        const endTime = document.getElementById('event-end-time').value;
        const location = document.getElementById('event-location').value;
        const description = document.getElementById('event-description').value;
        const type = document.getElementById('event-type').value;
        const priority = document.getElementById('event-priority').value;
        const reminderEnabled = document.getElementById('event-reminder').checked;
        const notes = document.getElementById('event-notes').value;
    
        if (!title || !date || !startTime) {
            this.showAlert('אנא מלא את כל השדות הנדרשים', 'error');
            return;
        }
    
        // DEBUG: הדפסת מידע על התאריך
        console.log('=== ADD EVENT DEBUG ===');
        console.log('Original date from form:', date);
        console.log('Current calendar date:', this.currentDate.toISOString().split('T')[0]);
    
        const eventData = {
            title,
            date, // לא משנים את התאריך כאן
            startTime,
            endTime: endTime || null,
            location: location || null,
            description: description || null,
            type,
            priority,
            reminderEnabled,
            notes: notes || null
        };
    
        console.log('Sending event data:', eventData);
    
        try {
            const newEvent = await this.apiCall('/events', 'POST', eventData);
            console.log('Received back from server:', newEvent);
            
            this.events.push(newEvent);
            this.renderCalendar();
            this.hideAddEventModal();
            this.showAlert('האירוע נוסף בהצלחה!', 'success');
            console.log('===================');
        } catch (error) {
            this.showAlert('שגיאה בהוספת האירוע', 'error');
            console.log('Error:', error);
        }
    }

    async editEvent(eventId) {
        const event = this.events.find(e => e._id === eventId);
        if (!event) return;

        // Fill modal with event data
        document.getElementById('event-title').value = event.title;
        const eventDate = event.date.includes('T') ? event.date.split('T')[0] : event.date;
        document.getElementById('event-date').value = eventDate;
        console.log('Setting edit date to:', eventDate, 'from original:', event.date);
        document.getElementById('event-time').value = event.startTime || '';
        document.getElementById('event-end-time').value = event.endTime || '';
        document.getElementById('event-location').value = event.location || '';
        document.getElementById('event-description').value = event.description || '';
        document.getElementById('event-type').value = event.type;
        document.getElementById('event-priority').value = event.priority || 'medium';
        document.getElementById('event-reminder').checked = event.reminderEnabled || false;
        document.getElementById('event-notes').value = event.notes || '';

        this.showAddEventModal();
        
        // Change button to update mode
        const submitBtn = document.querySelector('#add-event-modal .submit-btn');
        submitBtn.innerHTML = '<i class="bi bi-check-circle"></i><span>עדכן אירוע</span>';
        submitBtn.onclick = () => this.updateEvent(eventId);
    }

    async updateEvent(eventId) {
        const title = document.getElementById('event-title').value;
        const date = document.getElementById('event-date').value;
        const startTime = document.getElementById('event-time').value;
        const endTime = document.getElementById('event-end-time').value;
        const location = document.getElementById('event-location').value;
        const description = document.getElementById('event-description').value;
        const type = document.getElementById('event-type').value;
        const priority = document.getElementById('event-priority').value;
        const reminderEnabled = document.getElementById('event-reminder').checked;
        const notes = document.getElementById('event-notes').value;

        const updateData = {
            title,
            date,
            startTime,
            endTime: endTime || null,
            location: location || null,
            description: description || null,
            type,
            priority,
            reminderEnabled,
            notes: notes || null
        };

        try {
            const updatedEvent = await this.apiCall(`/events/${eventId}`, 'PUT', updateData);
            const eventIndex = this.events.findIndex(e => e._id === eventId);
            if (eventIndex !== -1) {
                this.events[eventIndex] = updatedEvent;
            }
            this.renderCalendar();
            this.hideAddEventModal();
            this.showAlert('האירוע עודכן בהצלחה!', 'success');
        } catch (error) {
            this.showAlert('שגיאה בעדכון האירוע', 'error');
        }
    }

    async deleteEvent(eventId) {
        const event = this.events.find(e => e._id === eventId);
        if (!event) return;
    
        const confirmMessage = `האם אתה בטוח שברצונך למחוק את האירוע הזה?\n\n` +
                              `כותרת: ${event.title}\n` +
                              `תאריך: ${event.date}\n` +
                              `שעה: ${event.startTime}\n\n` +
                              `פעולה זו לא ניתנת לביטול.`;
        
        if (!confirm(confirmMessage)) return;
        
        try {
            await this.apiCall(`/events/${eventId}`, 'DELETE');
            this.events = this.events.filter(e => e._id !== eventId);
            this.renderCalendar();
            this.hideEventDetailsModal();
            this.showAlert('האירוע נמחק בהצלחה!', 'success');
        } catch (error) {
            this.showAlert('שגיאה במחיקת האירוע', 'error');
        }
    }
    // ===== TASK MANAGEMENT =====
    renderTasks() {
        const tasksList = document.getElementById('tasks-list');
        const todayTasks = this.getTodayTasks();

        if (todayTasks.length === 0) {
            tasksList.innerHTML = `
                <div class="no-tasks">
                    <i class="bi bi-check-circle"></i>
                    <p>אין משימות להיום - יום מעולה!</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = todayTasks.map(task => `
            <div class="task-item ${task.status === 'completed' ? 'completed' : ''} priority-${task.priority}">
                <div class="task-checkbox">
                    <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} 
                           onchange="calendar.toggleTask('${task._id}')">
                </div>
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    <div class="task-priority">עדיפות: ${this.getPriorityText(task.priority)}</div>
                    ${task.category ? `<div class="task-category">קטגוריה: ${this.getCategoryText(task.category)}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button class="edit-task-btn" onclick="calendar.editTask('${task._id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="delete-task-btn" onclick="calendar.deleteTask('${task._id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    getTodayTasks() {
        const today = new Date().toISOString().split('T')[0];
        return this.tasks.filter(task => task.dueDate === today);
    }

    async addTask() {
        const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-description').value;
        const dueDate = document.getElementById('task-due-date').value;
        const priority = document.getElementById('task-priority').value;
        const category = document.getElementById('task-category').value;
        const estimatedDuration = document.getElementById('task-duration').value;

        if (!title || !dueDate) {
            this.showAlert('אנא הכנס כותרת ותאריך יעד', 'error');
            return;
        }

        const taskData = {
            title,
            description: description || null,
            dueDate,
            priority,
            category,
            estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : 60
        };

        try {
            const newTask = await this.apiCall('/tasks', 'POST', taskData);
            this.tasks.push(newTask);
            this.renderTasks();
            this.hideAddTaskModal();
            this.showAlert('המשימה נוספה בהצלחה!', 'success');
        } catch (error) {
            this.showAlert('שגיאה בהוספת המשימה', 'error');
        }
    }

    async toggleTask(taskId) {
        const task = this.tasks.find(t => t._id === taskId);
        if (!task) return;

        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        
        try {
            if (newStatus === 'completed') {
                await this.apiCall(`/tasks/${taskId}/complete`, 'PUT');
            } else {
                await this.apiCall(`/tasks/${taskId}`, 'PUT', { status: newStatus });
            }
            
            task.status = newStatus;
            this.renderTasks();
        } catch (error) {
            this.showAlert('שגיאה בעדכון המשימה', 'error');
        }
    }

    async deleteTask(taskId) {
        if (!confirm('האם אתה בטוח שברצונך למחוק את המשימה?')) return;
        
        try {
            await this.apiCall(`/tasks/${taskId}`, 'DELETE');
            this.tasks = this.tasks.filter(t => t._id !== taskId);
            this.renderTasks();
            this.showAlert('המשימה נמחקה בהצלחה!', 'success');
        } catch (error) {
            this.showAlert('שגיאה במחיקת המשימה', 'error');
        }
    }

    getPriorityText(priority) {
        const priorities = {
            low: 'נמוכה',
            medium: 'בינונית',
            high: 'גבוהה',
            urgent: 'דחוף'
        };
        return priorities[priority] || priority;
    }

    getCategoryText(category) {
        const categories = {
            legal: 'עבודה משפטית',
            admin: 'ניהול',
            client: 'לקוחות',
            court: 'בית משפט',
            research: 'מחקר',
            personal: 'אישי'
        };
        return categories[category] || category;
    }

    // ===== NAVIGATION =====
    changeView(view) {
        this.currentView = view;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        this.renderCalendar();
        this.updateCurrentPeriod();
    }

    previousPeriod() {
        switch(this.currentView) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() - 7);
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() - 1);
                break;
        }
        this.renderCalendar();
        this.updateCurrentPeriod();
    }

    nextPeriod() {
        switch(this.currentView) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + 7);
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + 1);
                break;
        }
        this.renderCalendar();
        this.updateCurrentPeriod();
    }

    goToToday() {
        this.currentDate = new Date();
        this.renderCalendar();
        this.updateCurrentPeriod();
        this.renderTasks();
    }

    updateCurrentPeriod() {
        const periodElement = document.getElementById('current-period');
        
        switch(this.currentView) {
            case 'month':
                periodElement.textContent = `${this.getHebrewMonth(this.currentDate.getMonth())} ${this.currentDate.getFullYear()}`;
                break;
            case 'week':
                const startOfWeek = this.getStartOfWeek(this.currentDate);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(endOfWeek.getDate() + 6);
                periodElement.textContent = `${startOfWeek.getDate()}-${endOfWeek.getDate()} ${this.getHebrewMonth(startOfWeek.getMonth())} ${startOfWeek.getFullYear()}`;
                break;
            case 'day':
                periodElement.textContent = `${this.getHebrewDay(this.currentDate.getDay())}, ${this.currentDate.getDate()} ${this.getHebrewMonth(this.currentDate.getMonth())} ${this.currentDate.getFullYear()}`;
                break;
        }
    }

    selectDate(dateStr) {
        console.log('=== SELECT DATE DEBUG ===');
        console.log('Input dateStr:', dateStr);
        
        const [year, month, day] = dateStr.split('-').map(Number);
        
        // יצירת תאריך ללא השפעת אזור זמן
        this.currentDate = new Date(year, month - 1, day);
        
        const resultDateStr = this.currentDate.toISOString().split('T')[0];
        console.log('Created date object:', this.currentDate);
        console.log('Result dateStr:', resultDateStr);
        console.log('Match:', dateStr === resultDateStr ? 'YES' : 'NO');
        console.log('=======================');
        
        this.changeView('day');
    }

    // ===== UTILITY FUNCTIONS =====
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    getStartOfWeek(date) {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        startOfWeek.setDate(date.getDate() - day);
        return startOfWeek;
    }

    // ===== MODAL MANAGEMENT =====
    showAddEventModal() {
        document.getElementById('add-event-modal').style.display = 'flex';
        
        // תיקון: וידוא שהתאריך מוגדר נכון
        const dateStr = this.currentDate.toISOString().split('T')[0];
        console.log('Setting modal date to:', dateStr);
        
        document.getElementById('event-date').value = dateStr;
        document.getElementById('event-title').focus();
        
        // Reset button to add mode
        const submitBtn = document.querySelector('#add-event-modal .submit-btn');
        submitBtn.innerHTML = '<i class="bi bi-check-circle"></i><span>שמור אירוע</span>';
        submitBtn.onclick = () => this.addEvent();
    }
    hideAddEventModal() {
        document.getElementById('add-event-modal').style.display = 'none';
        this.clearEventForm();
    }

    showAddTaskModal() {
        document.getElementById('add-task-modal').style.display = 'flex';
        document.getElementById('task-due-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('task-title').focus();
    }

    hideAddTaskModal() {
        document.getElementById('add-task-modal').style.display = 'none';
        this.clearTaskForm();
    }

    clearEventForm() {
        document.getElementById('event-title').value = '';
        document.getElementById('event-time').value = '';
        document.getElementById('event-end-time').value = '';
        document.getElementById('event-location').value = '';
        document.getElementById('event-description').value = '';
        document.getElementById('event-type').value = 'meeting';
        document.getElementById('event-priority').value = 'medium';
        document.getElementById('event-reminder').checked = false;
        document.getElementById('event-notes').value = '';
    }

    clearTaskForm() {
        document.getElementById('task-title').value = '';
        document.getElementById('task-description').value = '';
        document.getElementById('task-priority').value = 'medium';
        document.getElementById('task-category').value = 'legal';
        document.getElementById('task-duration').value = '';
    }

    // ===== NOTIFICATIONS & ALERTS =====
    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        }, 3000);
    }

    setupNotifications() {
        // Check for upcoming events every minute
        setInterval(() => this.checkUpcomingEvents(), 60000);
        this.checkUpcomingEvents(); // Check immediately
    }

    checkUpcomingEvents() {
        const now = new Date();
        const in30Minutes = new Date(now.getTime() + 30 * 60000);
        
        this.events.forEach(event => {
            if (!event.startTime || !event.date) return;
            
            const eventDateTime = new Date(`${event.date}T${event.startTime}`);
            
            if (eventDateTime > now && eventDateTime <= in30Minutes) {
                this.showNotification(event);
            }
        });
    }

    showNotification(event) {
        if (Notification.permission === 'granted') {
            new Notification('תזכורת: אירוע מתקרב', {
                body: `${event.title} בעוד 30 דקות`,
                icon: '/favicon.ico'
            });
        }
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'n':
                        e.preventDefault();
                        this.showAddEventModal();
                        break;
                    case 't':
                        e.preventDefault();
                        this.goToToday();
                        break;
                }
            }
            
            // Escape key to close modals
            if (e.key === 'Escape') {
                this.hideAddEventModal();
                this.hideAddTaskModal();
            }
        });

        // Modal click outside to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
                this.clearEventForm();
                this.clearTaskForm();
            }
        });
    }
    showEventDetails(eventId) {
        const event = this.events.find(e => e._id === eventId);
        if (!event) return;
    
        const modalHtml = `
            <div class="modal fade show" id="event-details-modal" style="display: flex;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>פרטי האירוע</h3>
                        <button class="close-modal" onclick="calendar.hideEventDetailsModal()">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="event-detail-item">
                            <strong>כותרת:</strong> ${event.title}
                        </div>
                        <div class="event-detail-item">
                            <strong>תאריך:</strong> ${event.date}
                        </div>
                        <div class="event-detail-item">
                            <strong>שעה:</strong> ${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}
                        </div>
                        ${event.location ? `<div class="event-detail-item"><strong>מיקום:</strong> ${event.location}</div>` : ''}
                        ${event.description ? `<div class="event-detail-item"><strong>תיאור:</strong> ${event.description}</div>` : ''}
                        <div class="event-detail-item">
                            <strong>סוג:</strong> ${this.getEventTypeText(event.type)}
                        </div>
                        <div class="event-detail-item">
                            <strong>עדיפות:</strong> ${this.getPriorityText(event.priority)}
                        </div>
                        ${event.notes ? `<div class="event-detail-item"><strong>הערות:</strong> ${event.notes}</div>` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="submit-btn" onclick="calendar.editEvent('${event._id}')">
                            <i class="bi bi-pencil"></i>
                            <span>ערוך</span>
                        </button>
                        <button class="cancel-btn" onclick="calendar.deleteEvent('${event._id}')" style="background: #dc3545;">
                            <i class="bi bi-trash"></i>
                            <span>מחק</span>
                        </button>
                        <button class="cancel-btn" onclick="calendar.hideEventDetailsModal()">
                            <i class="bi bi-x-circle"></i>
                            <span>סגור</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    
        const existingModal = document.getElementById('event-details-modal');
        if (existingModal) existingModal.remove();
    
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    hideEventDetailsModal() {
        const modal = document.getElementById('event-details-modal');
        if (modal) {
            modal.style.display = 'none';
            setTimeout(() => modal.remove(), 300);
        }
    }
    
    getEventTypeText(type) {
        const types = {
            meeting: 'פגישה',
            court: 'דיון בבית משפט',
            deadline: 'דדליין',
            reminder: 'תזכורת',
            consultation: 'ייעוץ',
            research: 'מחקר'
        };
        return types[type] || type;
    }

}

// ===== GLOBAL FUNCTIONS =====
function changeView(view) {
    calendar.changeView(view);
}

function previousPeriod() {
    calendar.previousPeriod();
}

function nextPeriod() {
    calendar.nextPeriod();
}

function goToToday() {
    calendar.goToToday();
}

function showAddEventModal() {
    calendar.showAddEventModal();
}

function hideAddEventModal() {
    calendar.hideAddEventModal();
}

function showAddTaskModal() {
    calendar.showAddTaskModal();
}

function hideAddTaskModal() {
    calendar.hideAddTaskModal();
}

function addEvent() {
    calendar.addEvent();
}

function addTask() {
    calendar.addTask();
}

function goBack() {
    window.history.back();
}

function logout() {
    if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
        localStorage.clear();
        window.location.href = '../index.html';
    }
}

// ===== QUICK ACTIONS =====
function quickAddMeeting() {
    calendar.showAddEventModal();
    document.getElementById('event-type').value = 'meeting';
    document.getElementById('event-title').placeholder = 'פגישה עם לקוח...';
}

function quickAddCourtDate() {
    calendar.showAddEventModal();
    document.getElementById('event-type').value = 'court';
    document.getElementById('event-title').placeholder = 'דיון בבית משפט...';
}

function quickAddDeadline() {
    calendar.showAddEventModal();
    document.getElementById('event-type').value = 'deadline';
    document.getElementById('event-priority').value = 'high';
    document.getElementById('event-title').placeholder = 'דדליין חשוב...';
}

async function showAnalytics() {
    const modal = document.getElementById('analytics-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    try {
        // Get analytics data for the last month
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        const startDateStr = startDate.toISOString().split('T')[0];
        
        const analytics = await calendar.apiCall(`/analytics?startDate=${startDateStr}&endDate=${endDate}`);
        
        // Update analytics display
        document.getElementById('weekly-events').textContent = analytics.totalEvents || 0;
        document.getElementById('completed-tasks').textContent = analytics.completedTasks || 0;
        document.getElementById('avg-meetings').textContent = analytics.averageMeetingsPerDay || 0;
        
        calendar.showAlert('נתוני ניתוח נטענו בהצלחה', 'success');
    } catch (error) {
        calendar.showAlert('שגיאה בטעינת נתוני ניתוח', 'error');
    }
}

function hideAnalyticsModal() {
    document.getElementById('analytics-modal').style.display = 'none';
}

function showQuickActions() {
    const quickActions = document.getElementById('quick-actions');
    if (quickActions.style.display === 'none') {
        quickActions.style.display = 'grid';
    } else {
        quickActions.style.display = 'none';
    }
}

function exportCalendar() {
    const events = calendar.events;
    const tasks = calendar.tasks;
    
    const exportData = {
        events,
        tasks,
        exportDate: new Date().toISOString(),
        username: calendar.username
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `calendar-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    calendar.showAlert('היומן יוצא בהצלחה', 'success');
}

function importCalendar() {
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            displayImportPreview(data);
        } catch (error) {
            calendar.showAlert('שגיאה בקריאת הקובץ', 'error');
        }
    };
    reader.readAsText(file);
}

function displayImportPreview(data) {
    const preview = document.getElementById('import-preview');
    const content = document.getElementById('preview-content');
    
    let html = '<h5>תצוגה מקדימה:</h5>';
    
    if (data.events && data.events.length > 0) {
        html += `<p><strong>אירועים:</strong> ${data.events.length}</p>`;
        html += '<ul>';
        data.events.slice(0, 3).forEach(event => {
            html += `<li>${event.title} - ${event.date}</li>`;
        });
        if (data.events.length > 3) {
            html += `<li>ועוד ${data.events.length - 3} אירועים...</li>`;
        }
        html += '</ul>';
    }
    
    if (data.tasks && data.tasks.length > 0) {
        html += `<p><strong>משימות:</strong> ${data.tasks.length}</p>`;
        html += '<ul>';
        data.tasks.slice(0, 3).forEach(task => {
            html += `<li>${task.title} - ${task.dueDate}</li>`;
        });
        if (data.tasks.length > 3) {
            html += `<li>ועוד ${data.tasks.length - 3} משימות...</li>`;
        }
        html += '</ul>';
    }
    
    content.innerHTML = html;
    preview.style.display = 'block';
}

async function processImport() {
    const fileInput = document.getElementById('import-file');
    const pasteData = document.getElementById('paste-calendar-data').value;
    
    let importData = null;
    
    if (fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                importData = JSON.parse(e.target.result);
                await executeImport(importData);
            } catch (error) {
                calendar.showAlert('שגיאה בייבוא נתונים', 'error');
            }
        };
        reader.readAsText(file);
    } else if (pasteData) {
        try {
            importData = JSON.parse(pasteData);
            await executeImport(importData);
        } catch (error) {
            calendar.showAlert('שגיאה בייבוא נתונים', 'error');
        }
    } else {
        calendar.showAlert('אנא בחר קובץ או הדבק נתונים', 'error');
    }
}

async function executeImport(data) {
    try {
        let importedEvents = 0;
        let importedTasks = 0;
        
        // Import events
        if (data.events && data.events.length > 0) {
            for (const eventData of data.events) {
                try {
                    const newEvent = await calendar.apiCall('/events', 'POST', {
                        title: eventData.title,
                        date: eventData.date,
                        startTime: eventData.startTime || eventData.time,
                        endTime: eventData.endTime,
                        location: eventData.location,
                        description: eventData.description,
                        type: eventData.type || 'meeting',
                        priority: eventData.priority || 'medium'
                    });
                    calendar.events.push(newEvent);
                    importedEvents++;
                } catch (error) {
                    console.error('שגיאה בייבוא אירוע:', error);
                }
            }
        }
        
        // Import tasks
        if (data.tasks && data.tasks.length > 0) {
            for (const taskData of data.tasks) {
                try {
                    const newTask = await calendar.apiCall('/tasks', 'POST', {
                        title: taskData.title,
                        description: taskData.description,
                        dueDate: taskData.dueDate || taskData.date,
                        priority: taskData.priority || 'medium',
                        category: taskData.category || 'legal',
                        status: taskData.status || taskData.completed ? 'completed' : 'pending'
                    });
                    calendar.tasks.push(newTask);
                    importedTasks++;
                } catch (error) {
                    console.error('שגיאה בייבוא משימה:', error);
                }
            }
        }
        
        // Update display
        calendar.renderCalendar();
        calendar.renderTasks();
        hideImportModal();
        
        calendar.showAlert(`ייבוא הושלם: ${importedEvents} אירועים, ${importedTasks} משימות`, 'success');
        
    } catch (error) {
        calendar.showAlert('שגיאה בתהליך הייבוא', 'error');
    }
}

// Event details modal functions
function hideEventDetailsModal() {
    const modal = document.getElementById('event-details-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function editCurrentEvent() {
    // This will be implemented when event details modal is properly set up
    hideEventDetailsModal();
}

function deleteCurrentEvent() {
    // This will be implemented when event details modal is properly set up
    hideEventDetailsModal();
}

// ===== INITIALIZATION =====
let calendar;

document.addEventListener('DOMContentLoaded', function() {
    calendar = new LawyerCalendar();
});
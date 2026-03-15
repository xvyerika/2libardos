/* ==========================================================================
   2 Libardos Event Management Logic
   ========================================================================== */

   const STORAGE_KEY = '2libardos_events_db';

   // App State
   let eventsList = [];
   let currentEditId = null;
   
   // DOM Elements
   const grid = document.getElementById('events-grid');
   const modalOverlay = document.getElementById('event-modal');
   const btnAddEvent = document.getElementById('btn-add-event');
   const btnCloseModal = document.getElementById('btn-close-modal');
   const form = document.getElementById('event-form');
   const modalTitle = document.getElementById('modal-title');
   
   const filterSelect = document.getElementById('event-type-filter');
   const searchInput = document.getElementById('search-input');
   
   // View Modes
   const btnViewList = document.getElementById('btn-view-list');
   const btnViewCalendar = document.getElementById('btn-view-calendar');
   const viewList = document.getElementById('events-grid');
   const viewCalendar = document.getElementById('calendar-view');
   
   // Calendar Elements
   const btnPrevMonth = document.getElementById('btn-prev-month');
   const btnNextMonth = document.getElementById('btn-next-month');
   const calendarMonthYear = document.getElementById('calendar-month-year');
   const calendarGrid = document.getElementById('calendar-grid');
   const alertsContainer = document.getElementById('admin-alerts-container');
   
   let currentCalendarDate = new Date();

   // Backup & Restore
   const btnExport = document.getElementById('btn-export-db');
   const btnImport = document.getElementById('btn-import-db');
   const fileImport = document.getElementById('file-import-db');
   
   // Initialize App
   document.addEventListener('DOMContentLoaded', () => {
       loadEvents();
       setupEventListeners();
   });
   
   // Load Events from LocalStorage
   function loadEvents() {
       const stored = localStorage.getItem(STORAGE_KEY);
       if(stored) {
           eventsList = JSON.parse(stored);
       } else {
           eventsList = [];
       }
       renderEvents();
       checkUpcomingEvents();
   }
   
   // Save Events to LocalStorage
   function saveEvents() {
       localStorage.setItem(STORAGE_KEY, JSON.stringify(eventsList));
   }
   
   // Setup Event Listeners
   function setupEventListeners() {
       // Modal Controls
       btnAddEvent.addEventListener('click', () => openModal());
       btnCloseModal.addEventListener('click', closeModal);
       modalOverlay.addEventListener('click', (e) => {
           if(e.target === modalOverlay) closeModal();
       });
   
       // Form Submit (Create/Update)
       form.addEventListener('submit', handleFormSubmit);
   
       // Filters
       filterSelect.addEventListener('change', renderEvents);
       searchInput.addEventListener('input', renderEvents);
   
       // View Toggles
       btnViewList.addEventListener('click', () => switchView('list'));
       btnViewCalendar.addEventListener('click', () => switchView('calendar'));
   
       // Calendar Navigation
       btnPrevMonth.addEventListener('click', () => {
           currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
           renderCalendar();
       });
       btnNextMonth.addEventListener('click', () => {
           currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
           renderCalendar();
       });

       // Export Database
       btnExport.addEventListener('click', exportDatabase);
       
       // Import Database
       btnImport.addEventListener('click', () => fileImport.click());
       fileImport.addEventListener('change', importDatabase);
   }
   
   // Handle Form Submissions
   function handleFormSubmit(e) {
       e.preventDefault();
       
       const newEvent = {
           id: currentEditId ? currentEditId : Date.now().toString(),
           client: document.getElementById('event-client').value,
           phone: document.getElementById('event-phone').value,
           type: document.getElementById('event-type').value,
           date: document.getElementById('event-date').value,
           time: document.getElementById('event-time').value,
           package: document.getElementById('event-package').value,
           location: document.getElementById('event-location').value,
           notes: document.getElementById('event-notes').value,
           createdAt: currentEditId ? eventsList.find(x => x.id === currentEditId).createdAt : new Date().toISOString()
       };
   
       if(currentEditId) {
           const index = eventsList.findIndex(ev => ev.id === currentEditId);
           eventsList[index] = newEvent;
           showToast('Evento actualizado correctamente.');
       } else {
           eventsList.push(newEvent);
           showToast('¡Nuevo evento agendado!');
       }
   
       saveEvents();
       renderEvents();
       checkUpcomingEvents();
       closeModal();
   }
   
   // Edit Event
   function editEvent(id) {
       const ev = eventsList.find(x => x.id === id);
       if(!ev) return;
   
       currentEditId = id;
       modalTitle.innerText = "Editar Evento";
       
       document.getElementById('event-client').value = ev.client;
       document.getElementById('event-phone').value = ev.phone || '';
       document.getElementById('event-type').value = ev.type;
       document.getElementById('event-date').value = ev.date;
       document.getElementById('event-time').value = ev.time;
       document.getElementById('event-package').value = ev.package;
       document.getElementById('event-location').value = ev.location;
       document.getElementById('event-notes').value = ev.notes;
   
       openModal();
   }
   
   // Delete Event
   function deleteEvent(id) {
       if(confirm('¿Estás seguro de que deseas eliminar este evento? Esta acción no se puede deshacer.')) {
           eventsList = eventsList.filter(ev => ev.id !== id);
           saveEvents();
           renderEvents();
           checkUpcomingEvents();
           showToast('Evento eliminado.', 'error');
       }
   }
   
   // Render Events Grid
   function renderEvents() {
       grid.innerHTML = '';
       
       // Filter & Search Logic
       const filterValue = filterSelect.value;
       const searchTerm = searchInput.value.toLowerCase().trim();
       let filteredList = eventsList;
       
       if(filterValue !== 'all') {
           filteredList = filteredList.filter(ev => ev.type === filterValue);
       }
       
       if(searchTerm !== '') {
           filteredList = filteredList.filter(ev => {
               const clientMatch = ev.client.toLowerCase().includes(searchTerm);
               const phoneMatch = typeof ev.phone === 'string' && ev.phone.toLowerCase().includes(searchTerm);
               return clientMatch || phoneMatch;
           });
       }
   
       // Sort by date upcoming
       filteredList.sort((a, b) => new Date(a.date) - new Date(b.date));
   
       if(filteredList.length === 0) {
           grid.innerHTML = `
               <div class="empty-state">
                   <i class="fa-solid fa-face-smile spinner" style="animation: floating 3s ease-in-out infinite;"></i>
                   <p>No hay eventos registrados${(filterValue !== 'all' || searchTerm !== '') ? ' para esta búsqueda' : ''}.</p>
               </div>
           `;
           return;
       }
   
       filteredList.forEach((ev, index) => {
           const card = document.createElement('div');
           card.className = 'event-card';
           card.style.animationDelay = `${index * 0.1}s`;
           card.classList.add('animate-fade-in-up');
   
           const dateObj = new Date(ev.date + 'T' + ev.time);
           const formatter = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
           const dateStr = formatter.format(dateObj).toUpperCase();
   
           let typeLabel = ev.type.charAt(0).toUpperCase() + ev.type.slice(1);
           if(ev.type === 'xv') typeLabel = 'XV Años';
           if(ev.type === 'revelacion') typeLabel = 'Revelación Sexo';
           if(ev.type === 'infantil') typeLabel = 'Infantil';
              card.innerHTML = `
                <div class="event-card-header">
                    <span class="event-type-badge badge-${ev.type}">${typeLabel}</span>
                    <div class="event-actions">
                        <button class="action-btn" title="Recordatorio WhatsApp" onclick="sendReminder('${ev.id}')" style="color: #25D366;"><i class="fa-brands fa-whatsapp"></i></button>
                        <button class="action-btn edit-btn" onclick="editEvent('${ev.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="action-btn del-btn" onclick="deleteEvent('${ev.id}')"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
                <h3 class="event-title">${ev.client}</h3>
                <div class="event-details">
                    <span><i class="fa-brands fa-whatsapp" style="color:#25D366;"></i> ${ev.phone || 'S/N'}</span>
                    <span><i class="fa-solid fa-calendar"></i> ${dateStr} - ${ev.time}Hrs</span>
                    <span><i class="fa-solid fa-location-dot"></i> ${ev.location}</span>
                    <span><i class="fa-solid fa-cube"></i> ${ev.package}</span>
                </div>
            `;
            grid.appendChild(card);
        });
        
        // Also refresh calendar if active
        renderCalendar();
    }
    
    // Switch View Modes
    function switchView(mode) {
        if(mode === 'list') {
            btnViewList.classList.add('active');
            btnViewCalendar.classList.remove('active');
            viewList.classList.remove('hidden');
            viewCalendar.classList.add('hidden');
        } else {
            btnViewCalendar.classList.add('active');
            btnViewList.classList.remove('active');
            viewCalendar.classList.remove('hidden');
            viewList.classList.add('hidden');
            renderCalendar();
        }
    }

    // Render Monthly Calendar
    function renderCalendar() {
        calendarGrid.innerHTML = '';
        
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        
        // Display Month/Year
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        calendarMonthYear.innerText = `${monthNames[month]} ${year}`;
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const today = new Date();
        const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

        // Populate empty days before first day
        for(let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyCell);
        }

        // Populate actual days
        for(let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day animate-fade-in-up';
            cell.style.animationDelay = `${(day % 7) * 0.05}s`;
            
            if(isCurrentMonth && day === today.getDate()) {
                cell.classList.add('today');
            }

            const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            cell.innerHTML = `<div class="day-number">${day}</div>`;

            // Find events for this day
            const dayEvents = eventsList.filter(ev => ev.date === dayString);
            
            dayEvents.forEach(ev => {
                const evBubble = document.createElement('div');
                evBubble.className = `cal-event-card border-${ev.type}`;
                
                let typeLabel = ev.type.charAt(0).toUpperCase() + ev.type.slice(1);
                let icon = 'fa-masks-theater';
                
                if(ev.type === 'xv') { typeLabel = 'XV Años'; icon = 'fa-crown'; }
                else if(ev.type === 'revelacion') { typeLabel = 'Revelación'; icon = 'fa-baby'; }
                else if(ev.type === 'infantil') { typeLabel = 'Infantil'; icon = 'fa-child-reaching'; }
                else if(ev.type === 'matrimonio') { typeLabel = 'Matrimonio'; icon = 'fa-ring'; }
                else if(ev.type === 'babyshower') { typeLabel = 'Baby Shower'; icon = 'fa-baby-carriage'; }
                
                evBubble.innerHTML = `
                    <div class="cal-ev-header">
                        <span class="cal-ev-time"><i class="fa-regular fa-clock"></i> ${ev.time}</span>
                        <span class="cal-ev-icon text-${ev.type}"><i class="fa-solid ${icon}"></i></span>
                    </div>
                    <div class="cal-ev-title">${ev.client}</div>
                    <div class="cal-ev-type text-${ev.type}">${typeLabel}</div>
                `;
                
                evBubble.title = `${ev.type.toUpperCase()}: ${ev.client}`;
                evBubble.onclick = () => editEvent(ev.id);
                cell.appendChild(evBubble);
            });

            calendarGrid.appendChild(cell);
        }
    }
    
    // Admin Upcoming Events Alerts
    function checkUpcomingEvents() {
        alertsContainer.innerHTML = '';
        const todayStr = new Date().toISOString().split('T')[0];
        const todayDate = new Date(todayStr);
        let hasAlerts = false;

        const sortedEvents = [...eventsList].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedEvents.forEach(ev => {
            const evDate = new Date(ev.date);
            const diffTime = evDate - todayDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Alert for Today or Tomorrow
            if(diffDays === 0 || diffDays === 1) {
                hasAlerts = true;
                const isToday = diffDays === 0;
                
                const alertDiv = document.createElement('div');
                alertDiv.className = `alert-item ${isToday ? 'alert-today' : ''} animate-fade-in-up`;
                
                alertDiv.innerHTML = `
                    <div class="alert-content">
                        <div class="alert-icon">
                            <i class="fa-solid ${isToday ? 'fa-bell fa-shake' : 'fa-calendar-day'}"></i>
                        </div>
                        <div class="alert-text">
                            <h4>${isToday ? '¡Tienes un evento HOY!' : 'Evento MAÑANA'}</h4>
                            <p><strong>${ev.time}Hrs</strong> - ${ev.client} (${ev.type.toUpperCase()}) en ${ev.location}</p>
                        </div>
                    </div>
                    <button class="alert-close" onclick="this.parentElement.remove()" title="Ocultar Notificación">
                        <i class="fa-solid fa-times"></i>
                    </button>
                `;
                alertsContainer.appendChild(alertDiv);
            }
        });

        if(hasAlerts) {
            alertsContainer.classList.remove('hidden');
        } else {
            alertsContainer.classList.add('hidden');
        }
    }
   
   // Send Reminder
   window.sendReminder = function(id) {
       const ev = eventsList.find(x => x.id === id);
       if(!ev || !ev.phone) {
           showToast('El evento no tiene número de celular registrado.', 'error');
           return;
       }

       const dateObj = new Date(ev.date + 'T' + ev.time);
       const formatter = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
       const dateStr = formatter.format(dateObj);

       let phoneStr = ev.phone.replace(/[\s\-]/g, '');
       let message = `¡Hola *${ev.client}*! 🎉\n\nTe escribe *2 Libardos Animación*. Queremos recordarte tener todo listo para tu evento (*${ev.type.toUpperCase()}*):\n\n📅 *Fecha:* ${dateStr}\n⏰ *Hora:* ${ev.time}\n📍 *Lugar:* ${ev.location}\n🎁 *Paquete:* ${ev.package}\n\n¡Estamos listos para llevar la mejor diversión! 🎈✨`;

       const encodedMsg = encodeURIComponent(message);
       const waUrl = `https://wa.me/${phoneStr}?text=${encodedMsg}`;
       
       window.open(waUrl, '_blank');
       showToast('Abriendo WhatsApp...');
   };

   // Modal State Operations
   function openModal() {
       modalOverlay.classList.remove('hidden');
       setTimeout(()=> modalOverlay.classList.add('active'), 10);
   }
   
   function closeModal() {
       modalOverlay.classList.remove('active');
       setTimeout(()=> {
           modalOverlay.classList.add('hidden');
           form.reset();
           currentEditId = null;
           modalTitle.innerText = "Agendar Nuevo Evento";
       }, 400); // Matches transition duration
   }
   
   // Export Data JSON
   function exportDatabase() {
       const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(eventsList));
       const downloadAnchorNode = document.createElement('a');
       downloadAnchorNode.setAttribute("href", dataStr);
       const dateStr = new Date().toISOString().split('T')[0];
       downloadAnchorNode.setAttribute("download", `2Libardos_Respaldo_${dateStr}.json`);
       document.body.appendChild(downloadAnchorNode); // required for firefox
       downloadAnchorNode.click();
       downloadAnchorNode.remove();
       showToast('Respaldo de Base de Datos Encotrado/Descargado');
   }
   
   // Import Data JSON
   function importDatabase(event) {
       const file = event.target.files[0];
       if (!file) return;
       
       const reader = new FileReader();
       reader.onload = function(e) {
           try {
               const contents = e.target.result;
               const importedData = JSON.parse(contents);
               
               if(Array.isArray(importedData)) {
                   // Merge or overwrite ? Let's overwrite for simplicity of "restore"
                   eventsList = importedData;
                   saveEvents();
                   renderEvents();
                   showToast('Base de Datos Restaurada Correctamente');
               } else {
                   showToast('El archivo no tiene el formato correcto', 'error');
               }
           } catch (error) {
               showToast('Error al leer el archivo JSON', 'error');
           }
       };
       reader.readAsText(file);
       // Reset input so it can be triggered again with the same file
       event.target.value = '';
   }
   
   // Toast Notification System
   function showToast(message, type = 'success') {
       const container = document.getElementById('toast-container');
       const toast = document.createElement('div');
       toast.className = `toast ${type}`;
       toast.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'check-circle' : 'circle-exclamation'}"></i> ${message}`;
       
       container.appendChild(toast);
       
       setTimeout(() => {
           toast.style.animation = 'slideInRight 0.4s reverse forwards';
           setTimeout(() => toast.remove(), 400);
       }, 3000);
   }

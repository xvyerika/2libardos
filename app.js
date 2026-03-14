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
   
       // Filter
       filterSelect.addEventListener('change', renderEvents);
   
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
           showToast('Evento eliminado.', 'error');
       }
   }
   
   // Render Events Grid
   function renderEvents() {
       grid.innerHTML = '';
       
       // Filter Logic
       const filterValue = filterSelect.value;
       let filteredList = eventsList;
       
       if(filterValue !== 'all') {
           filteredList = eventsList.filter(ev => ev.type === filterValue);
       }
   
       // Sort by date upcoming
       filteredList.sort((a, b) => new Date(a.date) - new Date(b.date));
   
       if(filteredList.length === 0) {
           grid.innerHTML = `
               <div class="empty-state">
                   <i class="fa-solid fa-face-smile spinner" style="animation: floating 3s ease-in-out infinite;"></i>
                   <p>No hay eventos registrados${filterValue === 'all' ? '' : ' para esta categoría'}.</p>
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

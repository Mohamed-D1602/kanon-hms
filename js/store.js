(function (global) {
  'use strict';
  var STORAGE_KEY = 'kanon_hms_v2';
  var SESSION_KEY = 'kanon_admin_session_v2';
  var ADMIN_PASSWORD = 'kanon2026';

  var PROPERTY_SEED = [
    { id:'kpalace', name:'Kanon Palace', city:'Khartoum', country:'Sudan', address:'Nile Avenue, Khartoum', tagline:'5-star suites with panoramic river view', rating:5, basePrice:340, currency:'USD', amenities:['River view','Infinity pool','Spa','Fine dining','Free Wi-Fi'], gradient:'linear-gradient(135deg,#1e1e2a,#3a3247)' },
    { id:'kgrand', name:'Kanon Grand', city:'Mekka', country:'Saudi Arabia', address:'Near Haram, Mekka', tagline:'Elegant comfort a step from the Haram', rating:5, basePrice:520, currency:'USD', amenities:['Haram view','Prayer hall','Halal dining','Shuttle service','Free Wi-Fi'], gradient:'linear-gradient(135deg,#0f3d33,#1f6b56)' },
    { id:'knile', name:'Kanon Nile View', city:'Khartoum', country:'Sudan', address:'Blue Nile Bridge Road, Khartoum', tagline:'Boutique hotel with rooftop infinity pool', rating:4.5, basePrice:280, currency:'USD', amenities:['Rooftop pool','Cocktail bar','Gym','Airport transfer','Free Wi-Fi'], gradient:'linear-gradient(135deg,#0e2b48,#1b4f7c)' }
  ];
  var ROOM_TYPES = [
    { type:'Standard', multiplier:0.8, capacity:2, beds:'1 Queen bed' },
    { type:'Deluxe', multiplier:1.0, capacity:2, beds:'1 King bed' },
    { type:'Suite', multiplier:1.6, capacity:3, beds:'1 King + Sofa' },
    { type:'Executive Suite', multiplier:2.4, capacity:4, beds:'2 King beds' }
  ];

  var DEPARTMENTS = ['Management','Front Desk','Housekeeping','F&B','Maintenance','Security'];
  var INCOME_CATEGORIES = ['Room booking','Restaurant','Spa','Laundry','Events','Other'];
  var EXPENSE_CATEGORIES = ['Salaries','Utilities','Supplies','Maintenance','Marketing','Rent','Other'];

  var EMPLOYEE_SEED = [
    { id:'emp-01', name:'Yasir Elamin',     role:'General Manager',   department:'Management',  phone:'+249911001001', email:'yasir@kanon.com',  hireDate:'2020-03-15', salary:3500, currency:'USD', status:'active' },
    { id:'emp-02', name:'Mona Abdalla',     role:'Front Desk Lead',   department:'Front Desk',  phone:'+249911001002', email:'mona@kanon.com',   hireDate:'2021-07-01', salary:1400, currency:'USD', status:'active' },
    { id:'emp-03', name:'Ahmed Kassim',     role:'Senior Housekeeper',department:'Housekeeping',phone:'+249911001003', email:'ahmed.k@kanon.com',hireDate:'2022-01-10', salary:900,  currency:'USD', status:'active' },
    { id:'emp-04', name:'Fatima Idriss',    role:'Housekeeper',       department:'Housekeeping',phone:'+249911001004', email:'fatima@kanon.com', hireDate:'2023-04-20', salary:800,  currency:'USD', status:'active' },
    { id:'emp-05', name:'Omar Suliman',     role:'Chef de Partie',    department:'F&B',         phone:'+249911001005', email:'omar@kanon.com',   hireDate:'2022-09-05', salary:1200, currency:'USD', status:'active' },
    { id:'emp-06', name:'Layla Hassan',     role:'Maintenance Tech',  department:'Maintenance', phone:'+249911001006', email:'layla@kanon.com',  hireDate:'2023-06-12', salary:1000, currency:'USD', status:'active' }
  ];

  var SUPPLIES_SEED = [
    { id:'sup-01', name:'Toilet paper',      unit:'roll',  quantity:180, reorderLevel:50, cost:0.6 },
    { id:'sup-02', name:'Shampoo (30ml)',    unit:'bottle',quantity:240, reorderLevel:80, cost:0.9 },
    { id:'sup-03', name:'Soap bar',          unit:'bar',   quantity:150, reorderLevel:60, cost:0.4 },
    { id:'sup-04', name:'Bath towels',       unit:'piece', quantity:90,  reorderLevel:40, cost:6.5 },
    { id:'sup-05', name:'Bed sheets',        unit:'set',   quantity:70,  reorderLevel:30, cost:18 },
    { id:'sup-06', name:'Floor cleaner',     unit:'bottle',quantity:22,  reorderLevel:15, cost:4.5 },
    { id:'sup-07', name:'Glass cleaner',     unit:'bottle',quantity:9,   reorderLevel:12, cost:3.8 },
    { id:'sup-08', name:'Slippers',          unit:'pair',  quantity:130, reorderLevel:50, cost:1.2 }
  ];

  function buildRooms() {
    var rooms = [];
    PROPERTY_SEED.forEach(function (p) {
      var c = 100;
      ROOM_TYPES.forEach(function (t) {
        for (var i = 0; i < 3; i++) {
          c++;
          rooms.push({
            id:p.id+'-'+c, propertyId:p.id, number:String(c), type:t.type,
            capacity:t.capacity, beds:t.beds, price:Math.round(p.basePrice*t.multiplier),
            status:'available', housekeeping:'clean'
          });
        }
      });
    });
    return rooms;
  }

  function uid(p){ return (p||'id')+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

  function defaultState() {
    return {
      properties: PROPERTY_SEED,
      roomTypes: ROOM_TYPES,
      rooms: buildRooms(),
      bookings: [],
      notifications: [],
      settings: { whatsappNumber:'+249123456789', autoConfirm:true, taxRate:0.12, currency:'USD' },

      /* Accounts */
      accounts: {
        transactions: [],
        invoices: [],
        payments: [],
        categories: { income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES }
      },

      /* Housekeeping */
      housekeeping: {
        tasks: [],
        supplies: SUPPLIES_SEED.slice()
      },

      /* HR */
      hr: {
        employees: EMPLOYEE_SEED.slice(),
        departments: DEPARTMENTS.slice(),
        shifts: [],
        attendance: [],
        leaveRequests: [],
        payroll: []
      },

      seedVersion: 2
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { return defaultState(); }
  }

  var state = load();
  var listeners = [];

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    listeners.forEach(function (fn) { try { fn(state); } catch (e) {} });
  }
  function subscribe(fn) {
    listeners.push(fn); fn(state);
    return function () { var i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }
  function dateOnly(d){ var x = new Date(d); return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); }
  function overlaps(aS,aE,bS,bE){ var as=dateOnly(aS),ae=dateOnly(aE),bs=dateOnly(bS),be=dateOnly(bE); return as<be && bs<ae; }
  function nightsBetween(a,b){ return Math.max(1, Math.round((dateOnly(b)-dateOnly(a))/86400000)); }
  function money(n){ return '$' + Number(n||0).toLocaleString(undefined, { maximumFractionDigits:0 }); }
  function todayKey(){ return new Date().toISOString().slice(0,10); }
  function monthKey(d){ var x = d ? new Date(d) : new Date(); return x.toISOString().slice(0,7); }

  var Store = {
    uid: uid, money: money, nightsBetween: nightsBetween, ROOM_TYPES: ROOM_TYPES,
    subscribe: subscribe, todayKey: todayKey, monthKey: monthKey,

    /* ---------- core ---------- */
    getState: function(){ return state; },
    getProperties: function(){ return state.properties.slice(); },
    getProperty: function(id){ return state.properties.find(function(p){ return p.id===id; }); },
    getRooms: function(){ return state.rooms.slice(); },
    getRoomTypes: function(){ return state.roomTypes.slice(); },
    getBookings: function(){ return state.bookings.slice().sort(function(a,b){ return b.createdAt-a.createdAt; }); },
    getBooking: function(id){ return state.bookings.find(function(b){ return b.id===id; }); },
    getNotifications: function(){ return state.notifications.slice().sort(function(a,b){ return b.createdAt-a.createdAt; }); },
    getSettings: function(){ return Object.assign({}, state.settings); },
    updateSettings: function(patch){ state.settings = Object.assign({}, state.settings, patch); persist(); },

    /* ---------- availability ---------- */
    isRoomAvailable: function(roomId, ci, co){
      return !state.bookings.some(function(b){
        if (b.roomId !== roomId) return false;
        if (b.status === 'cancelled' || b.status === 'checked-out') return false;
        return overlaps(b.checkin, b.checkout, ci, co);
      });
    },
    findAvailableRoom: function(pid, type, ci, co){
      return state.rooms.find(function(r){ return r.propertyId===pid && r.type===type && Store.isRoomAvailable(r.id, ci, co); });
    },
    availabilitySummary: function(pid, ci, co){
      var out = [];
      state.roomTypes.forEach(function(t){
        var total = state.rooms.filter(function(r){ return r.propertyId===pid && r.type===t.type; }).length;
        var avail = state.rooms.filter(function(r){ return r.propertyId===pid && r.type===t.type && Store.isRoomAvailable(r.id, ci, co); }).length;
        out.push({ type:t.type, total:total, available:avail });
      });
      return out;
    },
    quote: function(pid, type, ci, co, guests){
      var prop = Store.getProperty(pid); if (!prop) return null;
      var rt = ROOM_TYPES.find(function(t){ return t.type===type; }) || ROOM_TYPES[1];
      var nights = nightsBetween(ci, co);
      var perNight = Math.round(prop.basePrice * rt.multiplier);
      var subtotal = perNight * nights;
      var tax = Math.round(subtotal * state.settings.taxRate);
      return { perNight:perNight, nights:nights, subtotal:subtotal, tax:tax, total:subtotal+tax, currency:state.settings.currency };
    },

    /* ---------- booking ---------- */
    createBooking: function(payload){
      var q = Store.quote(payload.propertyId, payload.roomType, payload.checkin, payload.checkout, payload.guests);
      if (!q) throw new Error('Invalid property.');
      var room = Store.findAvailableRoom(payload.propertyId, payload.roomType, payload.checkin, payload.checkout);
      if (!room) throw new Error('No rooms of this type available for the selected dates.');
      var prop = Store.getProperty(payload.propertyId);
      var booking = {
        id:'KAN-'+Date.now().toString().slice(-6)+Math.floor(Math.random()*90+10),
        guestName:payload.guestName, email:payload.email||'', phone:payload.phone||'',
        propertyId:payload.propertyId, propertyName:prop.name+' · '+prop.city,
        roomId:room.id, roomNumber:room.number, roomType:payload.roomType,
        checkin:payload.checkin, checkout:payload.checkout, guests:payload.guests,
        nights:q.nights, perNight:q.perNight, tax:q.tax, subtotal:q.subtotal,
        total:q.total, currency:q.currency,
        status: state.settings.autoConfirm ? 'confirmed' : 'pending',
        createdAt: Date.now(), notes: payload.notes||''
      };
      state.bookings.push(booking);

      /* Auto-create invoice + income transaction */
      Store.createInvoice({
        bookingId: booking.id,
        guestName: booking.guestName,
        propertyId: booking.propertyId,
        items: [{ description: booking.roomType + ' Room · '+booking.nights+' night(s)', quantity: booking.nights, unitPrice: booking.perNight }],
        tax: booking.tax,
        total: booking.total,
        currency: booking.currency
      });

      Store.addTransaction({
        type:'income', category:'Room booking', method:'card',
        description:'Booking '+booking.id+' · '+booking.guestName,
        amount: booking.total, currency: booking.currency,
        propertyId: booking.propertyId, ref: booking.id
      });

      Store.pushNotification({ channel:'system', title:'New booking received', body:booking.guestName+' booked '+booking.roomType+' at '+booking.propertyName });
      Store.pushNotification({ channel:'whatsapp', title:'WhatsApp alert sent to management', body:'Booking '+booking.id+' · '+booking.guestName+' · '+booking.propertyName });

      persist();
      return booking;
    },

    updateBookingStatus: function(id, status){
      var b = state.bookings.find(function(x){ return x.id===id; });
      if (!b) return null;
      var prev = b.status;
      b.status = status;
      var room = state.rooms.find(function(r){ return r.id===b.roomId; });
      if (room) {
        if (status==='checked-in') { room.status='occupied'; room.housekeeping='occupied'; }
        if (status==='checked-out') { room.status='cleaning'; room.housekeeping='dirty'; }
        if (status==='cancelled') { room.status='available'; room.housekeeping='clean'; }
      }
      /* Auto-create housekeeping task on checkout */
      if (status === 'checked-out' && prev !== 'checked-out' && room) {
        Store.createHousekeepingTask({
          roomId: room.id, roomNumber: room.number, propertyId: room.propertyId,
          type:'checkout', priority:'high',
          notes: 'Post-checkout cleaning for '+b.guestName+' ('+b.id+')'
        });
      }
      Store.pushNotification({ channel:'system', title:'Booking '+status, body: b.guestName+' · '+b.id+' · '+b.propertyName });
      persist();
      return b;
    },

    setRoomStatus: function(roomId, status){
      var r = state.rooms.find(function(x){ return x.id===roomId; });
      if (!r) return null;
      r.status = status; persist(); return r;
    },

    /* ============================================================
       ACCOUNTS
       ============================================================ */
    getTransactions: function(){
      return state.accounts.transactions.slice().sort(function(a,b){ return b.date-a.date; });
    },
    addTransaction: function(tx){
      var t = {
        id: uid('tx'),
        type: tx.type || 'income',
        category: tx.category || 'Other',
        method: tx.method || 'cash',
        description: tx.description || '',
        amount: Number(tx.amount) || 0,
        currency: tx.currency || state.settings.currency,
        propertyId: tx.propertyId || null,
        ref: tx.ref || null,
        date: tx.date || Date.now(),
        createdBy: 'Admin'
      };
      state.accounts.transactions.push(t);
      persist();
      return t;
    },
    deleteTransaction: function(id){
      var i = state.accounts.transactions.findIndex(function(t){ return t.id===id; });
      if (i > -1) { state.accounts.transactions.splice(i,1); persist(); }
    },
    getInvoices: function(){ return state.accounts.invoices.slice().sort(function(a,b){ return b.issuedAt-a.issuedAt; }); },
    createInvoice: function(payload){
      var items = payload.items || [];
      var subtotal = items.reduce(function(s,i){ return s + (i.quantity*i.unitPrice); }, 0);
      var inv = {
        id: 'INV-'+Date.now().toString().slice(-6)+Math.floor(Math.random()*90+10),
        bookingId: payload.bookingId || null,
        guestName: payload.guestName || 'Walk-in',
        propertyId: payload.propertyId || null,
        items: items,
        subtotal: subtotal,
        tax: payload.tax || 0,
        total: payload.total || (subtotal + (payload.tax||0)),
        currency: payload.currency || state.settings.currency,
        status: 'unpaid',
        issuedAt: Date.now(),
        paidAt: null
      };
      state.accounts.invoices.push(inv);
      persist();
      return inv;
    },
    markInvoicePaid: function(id, method){
      var inv = state.accounts.invoices.find(function(i){ return i.id===id; });
      if (!inv) return null;
      inv.status = 'paid';
      inv.paidAt = Date.now();
      state.accounts.payments.push({
        id: uid('pay'), invoiceId: id, amount: inv.total,
        method: method || 'cash', receivedAt: Date.now(), reference: inv.id
      });
      persist();
      return inv;
    },
    getPayments: function(){ return state.accounts.payments.slice().sort(function(a,b){ return b.receivedAt-a.receivedAt; }); },
    financialSummary: function(){
      var tx = state.accounts.transactions;
      var today = todayKey();
      var thisMonth = monthKey();
      var income = tx.filter(function(t){ return t.type==='income'; }).reduce(function(s,t){ return s+t.amount; }, 0);
      var expense = tx.filter(function(t){ return t.type==='expense'; }).reduce(function(s,t){ return s+t.amount; }, 0);
      var todayIncome = tx.filter(function(t){ return t.type==='income' && new Date(t.date).toISOString().slice(0,10)===today; })
                          .reduce(function(s,t){ return s+t.amount; }, 0);
      var todayExpense = tx.filter(function(t){ return t.type==='expense' && new Date(t.date).toISOString().slice(0,10)===today; })
                           .reduce(function(s,t){ return s+t.amount; }, 0);
      var monthIncome = tx.filter(function(t){ return t.type==='income' && new Date(t.date).toISOString().slice(0,7)===thisMonth; })
                          .reduce(function(s,t){ return s+t.amount; }, 0);
      var monthExpense = tx.filter(function(t){ return t.type==='expense' && new Date(t.date).toISOString().slice(0,7)===thisMonth; })
                           .reduce(function(s,t){ return s+t.amount; }, 0);
      var unpaidInvoices = state.accounts.invoices.filter(function(i){ return i.status==='unpaid'; });
      return {
        income: income, expense: expense, net: income-expense,
        todayIncome: todayIncome, todayExpense: todayExpense,
        monthIncome: monthIncome, monthExpense: monthExpense,
        monthNet: monthIncome - monthExpense,
        unpaidCount: unpaidInvoices.length,
        unpaidTotal: unpaidInvoices.reduce(function(s,i){ return s+i.total; }, 0)
      };
    },
    expenseByCategory: function(){
      var map = {};
      state.accounts.transactions.forEach(function(t){
        if (t.type !== 'expense') return;
        map[t.category] = (map[t.category]||0) + t.amount;
      });
      return Object.keys(map).map(function(k){ return { category:k, total:map[k] }; })
             .sort(function(a,b){ return b.total-a.total; });
    },
    incomeByCategory: function(){
      var map = {};
      state.accounts.transactions.forEach(function(t){
        if (t.type !== 'income') return;
        map[t.category] = (map[t.category]||0) + t.amount;
      });
      return Object.keys(map).map(function(k){ return { category:k, total:map[k] }; })
             .sort(function(a,b){ return b.total-a.total; });
    },

    /* ============================================================
       HOUSEKEEPING
       ============================================================ */
    getTasks: function(){
      return state.housekeeping.tasks.slice().sort(function(a,b){ return b.createdAt-a.createdAt; });
    },
    createHousekeepingTask: function(payload){
      var t = {
        id: uid('hkt'),
        roomId: payload.roomId || null,
        roomNumber: payload.roomNumber || '—',
        propertyId: payload.propertyId || null,
        type: payload.type || 'daily',
        priority: payload.priority || 'medium',
        status: 'pending',
        assignedTo: payload.assignedTo || null,
        notes: payload.notes || '',
        checklist: payload.checklist || { bed:false, bath:false, floor:false, towels:false, amenities:false },
        suppliesUsed: [],
        createdAt: Date.now(),
        startedAt: null,
        completedAt: null
      };
      state.housekeeping.tasks.push(t);
      Store.pushNotification({
        channel:'system',
        title:'Housekeeping task created',
        body: 'Room '+t.roomNumber+' · '+t.type+' ('+t.priority+' priority)'
      });
      persist();
      return t;
    },
    updateTask: function(id, patch){
      var t = state.housekeeping.tasks.find(function(x){ return x.id===id; });
      if (!t) return null;
      Object.assign(t, patch);
      if (patch.status === 'in-progress' && !t.startedAt) t.startedAt = Date.now();
      if (patch.status === 'done' && !t.completedAt) {
        t.completedAt = Date.now();
        var r = state.rooms.find(function(x){ return x.id===t.roomId; });
        if (r) r.housekeeping = 'inspected';
      }
      if (patch.status === 'inspected') {
        var rr = state.rooms.find(function(x){ return x.id===t.roomId; });
        if (rr) { rr.housekeeping = 'clean'; rr.status = 'available'; }
      }
      persist();
      return t;
    },
    toggleChecklistItem: function(id, key){
      var t = state.housekeeping.tasks.find(function(x){ return x.id===id; });
      if (!t) return;
      t.checklist[key] = !t.checklist[key];
      persist();
    },
    getSupplies: function(){ return state.housekeeping.supplies.slice(); },
    useSupply: function(supplyId, qty){
      var s = state.housekeeping.supplies.find(function(x){ return x.id===supplyId; });
      if (!s) return null;
      s.quantity = Math.max(0, s.quantity - (Number(qty)||0));
      persist();
      return s;
    },
    restockSupply: function(supplyId, qty){
      var s = state.housekeeping.supplies.find(function(x){ return x.id===supplyId; });
      if (!s) return null;
      s.quantity += Number(qty) || 0;
      persist();
      return s;
    },
    lowStockSupplies: function(){
      return state.housekeeping.supplies.filter(function(s){ return s.quantity <= s.reorderLevel; });
    },

    /* ============================================================
       HR
       ============================================================ */
    getEmployees: function(){ return state.hr.employees.slice(); },
    getEmployee: function(id){ return state.hr.employees.find(function(e){ return e.id===id; }); },
    addEmployee: function(payload){
      var e = {
        id: uid('emp'),
        name: payload.name,
        role: payload.role || 'Staff',
        department: payload.department || 'Front Desk',
        phone: payload.phone || '',
        email: payload.email || '',
        hireDate: payload.hireDate || todayKey(),
        salary: Number(payload.salary) || 0,
        currency: payload.currency || state.settings.currency,
        status: payload.status || 'active'
      };
      state.hr.employees.push(e);
      persist();
      return e;
    },
    updateEmployee: function(id, patch){
      var e = state.hr.employees.find(function(x){ return x.id===id; });
      if (!e) return null;
      Object.assign(e, patch);
      persist();
      return e;
    },
    getDepartments: function(){ return state.hr.departments.slice(); },

    getShifts: function(){
      return state.hr.shifts.slice().sort(function(a,b){ return new Date(a.date) - new Date(b.date); });
    },
    scheduleShift: function(payload){
      var s = {
        id: uid('shf'),
        employeeId: payload.employeeId,
        date: payload.date || todayKey(),
        start: payload.start || '09:00',
        end: payload.end || '17:00',
        type: payload.type || 'morning',
        status: 'scheduled',
        createdAt: Date.now()
      };
      state.hr.shifts.push(s);
      persist();
      return s;
    },
    getAttendance: function(){
      return state.hr.attendance.slice().sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
    },
    clockIn: function(employeeId){
      var today = todayKey();
      var rec = state.hr.attendance.find(function(a){ return a.employeeId===employeeId && a.date===today; });
      if (rec && rec.clockIn) return rec;
      if (!rec) {
        rec = { id: uid('att'), employeeId: employeeId, date: today, clockIn: null, clockOut: null, status: 'present', notes: '' };
        state.hr.attendance.push(rec);
      }
      rec.clockIn = Date.now();
      persist();
      return rec;
    },
    clockOut: function(employeeId){
      var today = todayKey();
      var rec = state.hr.attendance.find(function(a){ return a.employeeId===employeeId && a.date===today; });
      if (!rec) return null;
      rec.clockOut = Date.now();
      persist();
      return rec;
    },
    getLeaveRequests: function(){
      return state.hr.leaveRequests.slice().sort(function(a,b){ return b.requestedAt - a.requestedAt; });
    },
    requestLeave: function(payload){
      var l = {
        id: uid('lv'),
        employeeId: payload.employeeId,
        from: payload.from, to: payload.to,
        type: payload.type || 'annual',
        reason: payload.reason || '',
        status: 'pending',
        requestedAt: Date.now()
      };
      state.hr.leaveRequests.push(l);
      persist();
      return l;
    },
    updateLeave: function(id, status){
      var l = state.hr.leaveRequests.find(function(x){ return x.id===id; });
      if (!l) return null;
      l.status = status;
      persist();
      return l;
    },

    getPayroll: function(){
      return state.hr.payroll.slice().sort(function(a,b){ return b.createdAt-a.createdAt; });
    },
    runPayroll: function(month){
      var m = month || monthKey();
      var results = [];
      state.hr.employees.forEach(function(e){
        if (e.status !== 'active') return;
        var existing = state.hr.payroll.find(function(p){ return p.employeeId===e.id && p.month===m; });
        if (existing) return;
        var allowances = Math.round(e.salary * 0.1);
        var deductions = Math.round(e.salary * 0.05);
        var net = e.salary + allowances - deductions;
        var rec = {
          id: uid('pr'),
          employeeId: e.id,
          month: m,
          baseSalary: e.salary,
          allowances: allowances,
          deductions: deductions,
          net: net,
          currency: e.currency,
          status: 'unpaid',
          createdAt: Date.now(),
          paidAt: null
        };
        state.hr.payroll.push(rec);
        results.push(rec);
      });
      persist();
      return results;
    },
    markPayrollPaid: function(id){
      var p = state.hr.payroll.find(function(x){ return x.id===id; });
      if (!p) return null;
      p.status = 'paid';
      p.paidAt = Date.now();
      /* Record as expense */
      Store.addTransaction({
        type:'expense', category:'Salaries', method:'bank',
        description:'Payroll '+p.month+' · '+(Store.getEmployee(p.employeeId)||{}).name,
        amount: p.net, currency: p.currency
      });
      persist();
      return p;
    },

    /* ============================================================
       NOTIFICATIONS & STATS
       ============================================================ */
    pushNotification: function(n){
      state.notifications.push({ id:uid('ntf'), channel:n.channel||'system', title:n.title, body:n.body, read:false, createdAt:Date.now() });
      if (state.notifications.length > 200) state.notifications = state.notifications.slice(-200);
    },
    markNotificationsRead: function(){ state.notifications.forEach(function(n){ n.read=true; }); persist(); },
    unreadCount: function(){ return state.notifications.filter(function(n){ return !n.read; }).length; },

    stats: function(){
      var all = state.bookings;
      var active = all.filter(function(b){ return b.status==='confirmed' || b.status==='checked-in'; });
      var pending = all.filter(function(b){ return b.status==='pending'; });
      var cancelled = all.filter(function(b){ return b.status==='cancelled'; });
      var revenue = all.filter(function(b){ return b.status!=='cancelled'; }).reduce(function(s,b){ return s+b.total; }, 0);
      var roomCount = state.rooms.length;
      var occupied = state.rooms.filter(function(r){ return r.status==='occupied'; }).length;
      var occupancy = roomCount ? Math.round((occupied/roomCount)*100) : 0;
      var pendingTasks = state.housekeeping.tasks.filter(function(t){ return t.status!=='inspected'; }).length;
      var employees = state.hr.employees.filter(function(e){ return e.status==='active'; }).length;
      return {
        totalBookings: all.length, active: active.length, pending: pending.length, cancelled: cancelled.length,
        revenue: revenue, rooms: roomCount, occupied: occupied, occupancy: occupancy,
        pendingTasks: pendingTasks, employees: employees
      };
    },

    login: function(password){ if (password===ADMIN_PASSWORD) { sessionStorage.setItem(SESSION_KEY,'1'); return true; } return false; },
    isLoggedIn: function(){ return sessionStorage.getItem(SESSION_KEY)==='1'; },
    logout: function(){ sessionStorage.removeItem(SESSION_KEY); },
    reset: function(){ state = defaultState(); persist(); }
  };

  global.KanonStore = Store;
})(window);

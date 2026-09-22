(function (global) {
  'use strict';
  var STORAGE_KEY = 'kanon_hms_v1';
  var SESSION_KEY = 'kanon_admin_session_v1';
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
  function buildRooms() {
    var rooms = [];
    PROPERTY_SEED.forEach(function (p) {
      var c = 100;
      ROOM_TYPES.forEach(function (t) {
        for (var i = 0; i < 3; i++) {
          c++;
          rooms.push({ id:p.id+'-'+c, propertyId:p.id, number:String(c), type:t.type, capacity:t.capacity, beds:t.beds, price:Math.round(p.basePrice*t.multiplier), status:'available' });
        }
      });
    });
    return rooms;
  }
  function uid(p){ return (p||'id')+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  function defaultState() {
    return { properties:PROPERTY_SEED, roomTypes:ROOM_TYPES, rooms:buildRooms(), bookings:[], notifications:[], settings:{ whatsappNumber:'+249123456789', autoConfirm:true, taxRate:0.12, currency:'USD' }, seedVersion:1 };
  }
  function load() {
    try { var raw = localStorage.getItem(STORAGE_KEY); if (!raw) return defaultState(); return Object.assign(defaultState(), JSON.parse(raw)); } catch(e){ return defaultState(); }
  }
  var state = load();
  var listeners = [];
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e){}
    listeners.forEach(function(fn){ try { fn(state); } catch(e){} });
  }
  function subscribe(fn) { listeners.push(fn); fn(state); return function(){ var i = listeners.indexOf(fn); if (i>-1) listeners.splice(i,1); }; }
  function dateOnly(d){ var x = new Date(d); return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); }
  function overlaps(aS,aE,bS,bE){ var as=dateOnly(aS),ae=dateOnly(aE),bs=dateOnly(bS),be=dateOnly(bE); return as<be && bs<ae; }
  function nightsBetween(a,b){ return Math.max(1, Math.round((dateOnly(b)-dateOnly(a))/86400000)); }
  function money(n){ return '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits:0 }); }
  var Store = {
    uid:uid, money:money, nightsBetween:nightsBetween, ROOM_TYPES:ROOM_TYPES, subscribe:subscribe,
    getState:function(){ return state; },
    getProperties:function(){ return state.properties.slice(); },
    getProperty:function(id){ return state.properties.find(function(p){ return p.id===id; }); },
    getRooms:function(){ return state.rooms.slice(); },
    getRoomTypes:function(){ return state.roomTypes.slice(); },
    getBookings:function(){ return state.bookings.slice().sort(function(a,b){ return b.createdAt-a.createdAt; }); },
    getBooking:function(id){ return state.bookings.find(function(b){ return b.id===id; }); },
    getNotifications:function(){ return state.notifications.slice().sort(function(a,b){ return b.createdAt-a.createdAt; }); },
    getSettings:function(){ return Object.assign({}, state.settings); },
    updateSettings:function(patch){ state.settings = Object.assign({}, state.settings, patch); persist(); },
    isRoomAvailable:function(roomId, ci, co){
      return !state.bookings.some(function(b){
        if (b.roomId !== roomId) return false;
        if (b.status === 'cancelled' || b.status === 'checked-out') return false;
        return overlaps(b.checkin, b.checkout, ci, co);
      });
    },
    findAvailableRoom:function(pid, type, ci, co){
      return state.rooms.find(function(r){ return r.propertyId===pid && r.type===type && Store.isRoomAvailable(r.id, ci, co); });
    },
    availabilitySummary:function(pid, ci, co){
      var out = [];
      state.roomTypes.forEach(function(t){
        var total = state.rooms.filter(function(r){ return r.propertyId===pid && r.type===t.type; }).length;
        var avail = state.rooms.filter(function(r){ return r.propertyId===pid && r.type===t.type && Store.isRoomAvailable(r.id, ci, co); }).length;
        out.push({ type:t.type, total:total, available:avail });
      });
      return out;
    },
    quote:function(pid, type, ci, co, guests){
      var prop = Store.getProperty(pid); if (!prop) return null;
      var rt = ROOM_TYPES.find(function(t){ return t.type===type; }) || ROOM_TYPES[1];
      var nights = nightsBetween(ci, co);
      var perNight = Math.round(prop.basePrice * rt.multiplier);
      var subtotal = perNight * nights;
      var tax = Math.round(subtotal * state.settings.taxRate);
      return { perNight:perNight, nights:nights, subtotal:subtotal, tax:tax, total:subtotal+tax, currency:state.settings.currency };
    },
    createBooking:function(payload){
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
        nights:q.nights, total:q.total, currency:q.currency,
        status: state.settings.autoConfirm ? 'confirmed' : 'pending',
        createdAt:Date.now(), notes:payload.notes||''
      };
      state.bookings.push(booking);
      Store.pushNotification({ channel:'system', title:'New booking received', body:booking.guestName+' booked '+booking.roomType+' at '+booking.propertyName+' ('+booking.checkin+' to '+booking.checkout+')' });
      Store.pushNotification({ channel:'whatsapp', title:'WhatsApp alert sent to management', body:'Booking '+booking.id+' · '+booking.guestName+' · '+booking.propertyName });
      persist();
      return booking;
    },
    updateBookingStatus:function(id, status){
      var b = state.bookings.find(function(x){ return x.id===id; });
      if (!b) return null;
      b.status = status;
      var room = state.rooms.find(function(r){ return r.id===b.roomId; });
      if (room) {
        if (status==='checked-in') room.status='occupied';
        if (status==='checked-out') room.status='cleaning';
        if (status==='cancelled') room.status='available';
      }
      Store.pushNotification({ channel:'system', title:'Booking '+status, body:b.guestName+' · '+b.id+' · '+b.propertyName });
      persist();
      return b;
    },
    setRoomStatus:function(roomId, status){
      var r = state.rooms.find(function(x){ return x.id===roomId; });
      if (!r) return null;
      r.status = status; persist(); return r;
    },
    pushNotification:function(n){
      state.notifications.push({ id:uid('ntf'), channel:n.channel||'system', title:n.title, body:n.body, read:false, createdAt:Date.now() });
      if (state.notifications.length > 200) state.notifications = state.notifications.slice(-200);
    },
    markNotificationsRead:function(){ state.notifications.forEach(function(n){ n.read=true; }); persist(); },
    unreadCount:function(){ return state.notifications.filter(function(n){ return !n.read; }).length; },
    stats:function(){
      var all = state.bookings;
      var active = all.filter(function(b){ return b.status==='confirmed' || b.status==='checked-in'; });
      var pending = all.filter(function(b){ return b.status==='pending'; });
      var cancelled = all.filter(function(b){ return b.status==='cancelled'; });
      var revenue = all.filter(function(b){ return b.status!=='cancelled'; }).reduce(function(s,b){ return s+b.total; }, 0);
      var roomCount = state.rooms.length;
      var occupied = state.rooms.filter(function(r){ return r.status==='occupied'; }).length;
      var occupancy = roomCount ? Math.round((occupied/roomCount)*100) : 0;
      return { totalBookings:all.length, active:active.length, pending:pending.length, cancelled:cancelled.length, revenue:revenue, rooms:roomCount, occupied:occupied, occupancy:occupancy };
    },
    login:function(password){ if (password===ADMIN_PASSWORD) { sessionStorage.setItem(SESSION_KEY,'1'); return true; } return false; },
    isLoggedIn:function(){ return sessionStorage.getItem(SESSION_KEY)==='1'; },
    logout:function(){ sessionStorage.removeItem(SESSION_KEY); },
    reset:function(){ state = defaultState(); persist(); }
  };
  global.KanonStore = Store;
})(window);
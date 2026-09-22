(function () {
  'use strict';
  var Store = window.KanonStore;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function fmtDate(d){ if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
  function todayISO(o){ var d = new Date(); d.setDate(d.getDate() + (o||0)); return d.toISOString().slice(0,10); }
  var toastHost = $('#toastHost');
  function toast(opts){
    if (!toastHost) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (opts.variant || '');
    el.innerHTML = '<i class="fas ' + (opts.icon || 'fa-bell') + ' lead-icon"></i>' +
                   '<div><span>' + opts.title + '</span>' + (opts.sub ? '<small>' + opts.sub + '</small>' : '') + '</div>';
    toastHost.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add('show'); });
    setTimeout(function(){ el.classList.remove('show'); setTimeout(function(){ el.remove(); }, 500); }, 4800);
  }
  window.KanonToast = toast;
  var propGrid = $('#propertyGrid');
  function renderProperties(){
    if (!propGrid) return;
    propGrid.innerHTML = Store.getProperties().map(function(p){
      var stars = '';
      for (var i = 0; i < 5; i++) {
        if (i < Math.floor(p.rating)) stars += '<i class="fas fa-star"></i>';
        else if (p.rating % 1 && i === Math.floor(p.rating)) stars += '<i class="fas fa-star-half-alt"></i>';
        else stars += '<i class="fas fa-star"></i>';
      }
      return '<div class="property-card fade-up"><div class="property-banner" style="background:' + p.gradient + '"><span class="city"><i class="fas fa-map-marker-alt"></i>' + p.city + ', ' + p.country + '</span></div><div class="property-body"><div class="stars">' + stars + '</div><h3>' + p.name + '</h3><p class="tagline">' + p.tagline + '</p><div class="amenities">' + p.amenities.slice(0,3).map(function(a){ return '<span class="chip">'+a+'</span>'; }).join('') + '</div><div class="property-foot"><div><div class="price">' + Store.money(p.basePrice) + '<small> /night</small></div></div><button class="btn btn-gold btn-sm" data-book="' + p.id + '"><i class="fas fa-calendar-check"></i> Book</button></div></div></div>';
    }).join('');
    $$('[data-book]', propGrid).forEach(function(btn){
      btn.addEventListener('click', function(){
        var pid = btn.getAttribute('data-book');
        $('#propertySelect').value = pid;
        updateAvailability(); updateQuote();
        document.getElementById('book').scrollIntoView({ behavior:'smooth', block:'start' });
        setTimeout(function(){ $('#guestName').focus(); }, 500);
      });
    });
  }
  var roomTypeGrid = $('#roomTypeGrid');
  var roomTypeIcons = { 'Standard':'fa-bed', 'Deluxe':'fa-bed', 'Suite':'fa-crown', 'Executive Suite':'fa-gem' };
  function renderRoomTypes(){
    if (!roomTypeGrid) return;
    roomTypeGrid.innerHTML = Store.getRoomTypes().map(function(t){
      return '<div class="room-card fade-up"><div class="ico"><i class="fas ' + (roomTypeIcons[t.type]||'fa-bed') + '"></i></div><h4>' + t.type + '</h4><div class="meta"><i class="fas fa-user-friends"></i> Up to ' + t.capacity + ' · <i class="fas fa-bed"></i> ' + t.beds + '</div><div class="rate">from ' + Store.money(Math.round(280*t.multiplier)) + ' / night</div></div>';
    }).join('');
  }
  var form = $('#bookingForm'), propSelect = $('#propertySelect'), roomTypeSelect = $('#roomTypeSelect');
  var checkinInput = $('#checkin'), checkoutInput = $('#checkout'), guestsInput = $('#guests');
  var quoteBox = $('#quoteBox'), availBox = $('#availBox');
  function populatePropertySelect(){
    if (!propSelect) return;
    propSelect.innerHTML = Store.getProperties().map(function(p){ return '<option value="'+p.id+'">'+p.name+' · '+p.city+'</option>'; }).join('');
  }
  function populateRoomTypeSelect(){
    if (!roomTypeSelect) return;
    roomTypeSelect.innerHTML = Store.getRoomTypes().map(function(t){ return '<option value="'+t.type+'">'+t.type+' (up to '+t.capacity+')</option>'; }).join('');
    roomTypeSelect.value = 'Deluxe';
  }
  function updateQuote(){
    if (!quoteBox) return;
    var pid = propSelect.value, type = roomTypeSelect.value, ci = checkinInput.value, co = checkoutInput.value;
    if (!pid || !type || !ci || !co) { quoteBox.innerHTML = ''; return; }
    if (new Date(co) <= new Date(ci)) {
      quoteBox.innerHTML = '<div style="color:var(--danger);font-size:.85rem;"><i class="fas fa-exclamation-triangle"></i> Check-out must be after check-in.</div>';
      return;
    }
    var q = Store.quote(pid, type, ci, co, 1);
    if (!q) { quoteBox.innerHTML = ''; return; }
    quoteBox.innerHTML = '<div class="price-preview"><div><div style="font-size:.78rem;color:var(--muted);">' + q.nights + ' night' + (q.nights>1?'s':'') + ' · ' + Store.money(q.perNight) + ' / night</div><div style="font-size:.78rem;color:var(--muted);">Taxes (' + (Store.getSettings().taxRate*100).toFixed(0) + '%) ' + Store.money(q.tax) + '</div></div><strong>' + Store.money(q.total) + '</strong></div>';
  }
  function updateAvailability(){
    if (!availBox) return;
    var pid = propSelect.value, ci = checkinInput.value, co = checkoutInput.value;
    if (!pid || !ci || !co || new Date(co) <= new Date(ci)) { availBox.innerHTML = ''; return; }
    availBox.innerHTML = Store.availabilitySummary(pid, ci, co).map(function(s){
      var color = s.available === 0 ? 'var(--danger)' : (s.available < 2 ? 'var(--warning)' : 'var(--success)');
      return '<span class="chip" style="border-color:' + color + '33;color:' + color + ';background:' + color + '12;"><i class="fas fa-circle" style="font-size:.5rem;margin-right:.3rem;"></i>' + s.type + ': ' + s.available + '/' + s.total + '</span>';
    }).join('');
  }
  if (propSelect) propSelect.addEventListener('change', function(){ updateAvailability(); updateQuote(); });
  if (roomTypeSelect) roomTypeSelect.addEventListener('change', updateQuote);
  if (checkinInput) checkinInput.addEventListener('change', function(){
    if (checkoutInput.value && new Date(checkoutInput.value) <= new Date(checkinInput.value)) {
      var d = new Date(checkinInput.value); d.setDate(d.getDate() + 2); checkoutInput.value = d.toISOString().slice(0,10);
    }
    updateAvailability(); updateQuote();
  });
  if (checkoutInput) checkoutInput.addEventListener('change', function(){ updateAvailability(); updateQuote(); });
  if (form) {
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var guestName = $('#guestName').value.trim();
      var phone = $('#guestPhone').value.trim();
      var email = $('#guestEmail').value.trim();
      if (!guestName) { toast({ icon:'fa-exclamation-circle', title:'Please enter your name' }); return; }
      var payload = { guestName:guestName, phone:phone, email:email, propertyId:propSelect.value, roomType:roomTypeSelect.value, checkin:checkinInput.value, checkout:checkoutInput.value, guests:parseInt(guestsInput.value||'1',10) };
      try {
        var booking = Store.createBooking(payload);
        showConfirmation(booking);
        toast({ icon:'fa-check-circle', title:'Booking ' + booking.id + ' confirmed!', sub:'WhatsApp notification sent to hotel', variant:'success' });
        setTimeout(function(){ toast({ icon:'fa-whatsapp', title:'WhatsApp sent', sub:'Management notified of ' + booking.guestName + "'s booking", variant:'wa' }); }, 1400);
        form.reset();
        checkinInput.value = todayISO(1); checkoutInput.value = todayISO(3); guestsInput.value = 2;
        updateAvailability(); updateQuote();
      } catch(err) {
        toast({ icon:'fa-exclamation-triangle', title:'Booking failed', sub:err.message });
      }
    });
  }
  var modal = $('#confirmModal'), modalBody = $('#confirmBody');
  function showConfirmation(b){
    if (!modal || !modalBody) return;
    modalBody.innerHTML = '<div class="receipt"><div class="row"><span>Booking ID</span><span>' + b.id + '</span></div><div class="row"><span>Guest</span><span>' + b.guestName + '</span></div><div class="row"><span>Property</span><span>' + b.propertyName + '</span></div><div class="row"><span>Room</span><span>' + b.roomType + ' · #' + b.roomNumber + '</span></div><div class="row"><span>Check-in</span><span>' + fmtDate(b.checkin) + '</span></div><div class="row"><span>Check-out</span><span>' + fmtDate(b.checkout) + '</span></div><div class="row"><span>Guests</span><span>' + b.guests + '</span></div><div class="row total"><span>Total</span><span>' + Store.money(b.total) + '</span></div></div><button class="btn btn-gold btn-block" data-close-modal><i class="fas fa-check"></i> Done</button>';
    modal.classList.add('show');
    modalBody.querySelector('[data-close-modal]').addEventListener('click', function(){ modal.classList.remove('show'); });
  }
  if (modal) modal.addEventListener('click', function(e){ if (e.target === modal) modal.classList.remove('show'); });
  var navToggle = $('#navToggle'), navLinks = $('#navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function(){
      navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
      navLinks.style.position = 'absolute'; navLinks.style.top = '64px'; navLinks.style.right = '1rem';
      navLinks.style.flexDirection = 'column'; navLinks.style.background = 'var(--ink)';
      navLinks.style.padding = '1rem'; navLinks.style.borderRadius = '14px';
      navLinks.style.border = '1px solid rgba(201,168,108,.3)';
    });
  }
  function init(){
    populatePropertySelect(); populateRoomTypeSelect(); renderProperties(); renderRoomTypes();
    if (checkinInput && !checkinInput.value) checkinInput.value = todayISO(1);
    if (checkoutInput && !checkoutInput.value) checkoutInput.value = todayISO(3);
    updateAvailability(); updateQuote();
    if (!sessionStorage.getItem('kanon_welcomed')) {
      sessionStorage.setItem('kanon_welcomed','1');
      setTimeout(function(){ toast({ icon:'fa-crown', title:'Welcome to Kanon Group', sub:'Book your dream stay in Khartoum or Mekka' }); }, 900);
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
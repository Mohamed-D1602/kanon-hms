(function () {
  'use strict';
  var Store = window.KanonStore;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function fmtDate(d){ if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
  function timeAgo(ts){ var diff = Date.now()-ts; var m = Math.floor(diff/60000); if (m<1) return 'just now'; if (m<60) return m+'m ago'; var h = Math.floor(m/60); if (h<24) return h+'h ago'; return Math.floor(h/24)+'d ago'; }
  var loginShell = $('#loginShell'), adminShell = $('#adminShell');
  var loginForm = $('#loginForm'), loginError = $('#loginError');
  function checkAuth(){
    if (Store.isLoggedIn()) { loginShell.style.display = 'none'; adminShell.style.display = 'grid'; initDashboard(); }
    else { loginShell.style.display = 'grid'; adminShell.style.display = 'none'; }
  }
  if (loginForm) loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    var pass = $('#password').value;
    if (Store.login(pass)) { loginError.classList.remove('show'); checkAuth(); }
    else { loginError.textContent = 'Incorrect password. Try again.'; loginError.classList.add('show'); }
  });
  var logoutBtn = $('#logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', function(){ Store.logout(); location.reload(); });
  var currentPanel = 'dashboard';
  function switchPanel(name){
    currentPanel = name;
    $$('.side-nav a').forEach(function(a){ a.classList.toggle('active', a.getAttribute('data-panel') === name); });
    $$('.panel').forEach(function(p){ p.classList.toggle('active', p.id === 'panel-' + name); });
    var titles = { dashboard:'Dashboard', bookings:'Bookings', rooms:'Rooms', notifications:'Notifications', settings:'Settings' };
    var t = $('#pageTitle'); if (t) t.textContent = titles[name] || 'Dashboard';
    render();
  }
  $$('.side-nav a').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      switchPanel(a.getAttribute('data-panel'));
      var sb = $('.sidebar'); if (sb) sb.classList.remove('open');
    });
  });
  var sidebarToggle = $('#sidebarToggle');
  if (sidebarToggle) sidebarToggle.addEventListener('click', function(){ $('.sidebar').classList.toggle('open'); });
  var revenueChart, occupancyChart;
  function buildCharts(){
    var cR = $('#revenueChart'), cO = $('#occupancyChart');
    if (!cR || !cO || typeof Chart === 'undefined') return;
    var bookings = Store.getBookings();
    var labels = [], data = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var dayKey = d.toISOString().slice(0,10);
      labels.push(d.toLocaleDateString('en-GB', { weekday:'short' }));
      var sum = bookings.filter(function(b){ return new Date(b.createdAt).toISOString().slice(0,10) === dayKey && b.status !== 'cancelled'; }).reduce(function(s,b){ return s+b.total; }, 0);
      data.push(sum);
    }
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(cR, {
      type:'line',
      data:{ labels:labels, datasets:[{ label:'Revenue (USD)', data:data, borderColor:'#c9a86c', backgroundColor:'rgba(201,168,108,0.15)', borderWidth:3, fill:true, tension:0.4, pointBackgroundColor:'#c9a86c', pointRadius:5 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, ticks:{ color:'#8b8794' }, grid:{ color:'#f0ece4' } }, x:{ ticks:{ color:'#8b8794' }, grid:{ display:false } } } }
    });
    var stats = Store.stats();
    if (occupancyChart) occupancyChart.destroy();
    occupancyChart = new Chart(cO, {
      type:'doughnut',
      data:{ labels:['Occupied','Available'], datasets:[{ data:[stats.occupied, stats.rooms-stats.occupied], backgroundColor:['#c9a86c','#ece7dd'], borderWidth:0 }] },
      options:{ responsive:true, maintainAspectRatio:false, cutout:'70%', plugins:{ legend:{ position:'bottom', labels:{ color:'#1e1e2a', padding:14, font:{ size:12 } } } } }
    });
  }
  function renderStats(){
    var s = Store.stats();
    var el = $('#statGrid'); if (!el) return;
    el.innerHTML = statCard('gold','fa-calendar-check','Total Bookings',s.totalBookings,'up','All time') +
                   statCard('green','fa-bed','Occupancy',s.occupancy+'%','up',s.occupied+' of '+s.rooms+' rooms') +
                   statCard('blue','fa-dollar-sign','Revenue',Store.money(s.revenue),'up','Confirmed bookings') +
                   statCard('orange','fa-clock','Pending',s.pending,'down','Awaiting confirmation');
  }
  function statCard(color, icon, label, value, trendDir, trendText){
    return '<div class="stat-card fade-up"><div class="ico ' + color + '"><i class="fas ' + icon + '"></i></div><div class="label">' + label + '</div><div class="value">' + value + '</div><div class="trend ' + trendDir + '">' + trendText + '</div></div>';
  }
  var bookingFilter = { q:'', status:'all', property:'all' };
  function renderBookings(){
    var tbody = $('#bookingsTbody'); if (!tbody) return;
    var list = Store.getBookings();
    if (bookingFilter.status !== 'all') list = list.filter(function(b){ return b.status === bookingFilter.status; });
    if (bookingFilter.property !== 'all') list = list.filter(function(b){ return b.propertyId === bookingFilter.property; });
    if (bookingFilter.q) {
      var q = bookingFilter.q.toLowerCase();
      list = list.filter(function(b){ return (b.guestName + ' ' + b.id + ' ' + b.propertyName + ' ' + (b.email||'')).toLowerCase().indexOf(q) > -1; });
    }
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty"><i class="fas fa-inbox"></i>No bookings match your filter.</div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function(b){
      return '<tr><td><strong>' + b.id + '</strong></td><td>' + b.guestName + '<div style="font-size:.72rem;color:var(--muted);">' + (b.phone||b.email||'') + '</div></td><td>' + b.propertyName + '</td><td>' + b.roomType + '<div style="font-size:.72rem;color:var(--muted);">#' + b.roomNumber + '</div></td><td>' + fmtDate(b.checkin) + '<div style="font-size:.72rem;color:var(--muted);">to ' + fmtDate(b.checkout) + '</div></td><td>' + Store.money(b.total) + '</td><td><span class="badge ' + b.status + '">' + b.status.replace('-',' ') + '</span></td><td>' + actionButtons(b) + '</td></tr>';
    }).join('');
    $$('[data-action]', tbody).forEach(function(btn){
      btn.addEventListener('click', function(){ handleBookingAction(btn.getAttribute('data-id'), btn.getAttribute('data-action')); });
    });
  }
  function actionButtons(b){
    var parts = [];
    if (b.status === 'pending') parts.push('<button class="btn btn-gold btn-sm" data-action="confirm" data-id="' + b.id + '">Confirm</button>');
    if (b.status === 'confirmed') parts.push('<button class="btn btn-dark btn-sm" data-action="checkin" data-id="' + b.id + '">Check-in</button>');
    if (b.status === 'checked-in') parts.push('<button class="btn btn-dark btn-sm" data-action="checkout" data-id="' + b.id + '">Check-out</button>');
    if (b.status !== 'cancelled' && b.status !== 'checked-out') parts.push('<button class="btn btn-ghost btn-sm" data-action="cancel" data-id="' + b.id + '" style="border-color:var(--danger);color:var(--danger);">Cancel</button>');
    return parts.join(' ') || '<span style="color:var(--muted);font-size:.78rem;">No action</span>';
  }
  function handleBookingAction(id, action){
    var map = { confirm:'confirmed', checkin:'checked-in', checkout:'checked-out', cancel:'cancelled' };
    var status = map[action]; if (!status) return;
    if (action === 'cancel' && !confirm('Cancel this booking?')) return;
    Store.updateBookingStatus(id, status);
    if (window.KanonToast) window.KanonToast({ icon:'fa-check-circle', title:'Booking ' + status, sub:id, variant:'success' });
  }
  var bSearch = $('#bookingSearch'), bStatus = $('#bookingStatus'), bProperty = $('#bookingProperty');
  if (bSearch) bSearch.addEventListener('input', function(){ bookingFilter.q = bSearch.value.trim(); renderBookings(); });
  if (bStatus) bStatus.addEventListener('change', function(){ bookingFilter.status = bStatus.value; renderBookings(); });
  if (bProperty) bProperty.addEventListener('change', function(){ bookingFilter.property = bProperty.value; renderBookings(); });
  function renderRooms(){
    var grid = $('#roomsGrid'); if (!grid) return;
    grid.innerHTML = Store.getRooms().map(function(r){
      var prop = Store.getProperty(r.propertyId);
      var badgeClass = r.status === 'available' ? 'confirmed' : r.status === 'occupied' ? 'cancelled' : 'pending';
      return '<div class="card" style="padding:1rem;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem;"><strong style="font-size:1.05rem;">Room #' + r.number + '</strong><span class="badge ' + badgeClass + '">' + r.status + '</span></div><div style="font-size:.8rem;color:var(--muted);">' + r.type + ' · ' + r.beds + '</div><div style="font-size:.78rem;color:var(--muted);margin-bottom:.7rem;">' + (prop?prop.name:'-') + '</div><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:700;color:var(--gold-dark);">' + Store.money(r.price) + '</span><select class="form-select" style="max-width:130px;font-size:.75rem;padding:.3rem .6rem;" data-room-status data-id="' + r.id + '">' + ['available','occupied','cleaning','maintenance'].map(function(s){ return '<option value="' + s + '"' + (s === r.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div></div>';
    }).join('');
    $$('[data-room-status]').forEach(function(sel){
      sel.addEventListener('change', function(){ Store.setRoomStatus(sel.getAttribute('data-id'), sel.value); });
    });
  }
  function renderNotifications(){
    var feed = $('#notifFeed'); if (!feed) return;
    var list = Store.getNotifications().slice(0, 40);
    if (!list.length) { feed.innerHTML = '<div class="empty"><i class="fas fa-bell-slash"></i>No notifications yet.</div>'; return; }
    feed.innerHTML = list.map(function(n){
      var iconMap = { whatsapp:'fa-whatsapp', system:'fa-bell' };
      var clsMap = { whatsapp:'wa', system:'system' };
      return '<div class="feed-item ' + (clsMap[n.channel]||'system') + '"><div class="ico-circle"><i class="' + (n.channel === 'whatsapp' ? 'fab' : 'fas') + ' ' + (iconMap[n.channel]||'fa-bell') + '"></i></div><div class="body"><strong>' + n.title + '</strong><p>' + n.body + '</p></div><div class="time">' + timeAgo(n.createdAt) + '</div></div>';
    }).join('');
  }
  function renderBell(){
    var dot = $('#bellDot'); if (!dot) return;
    dot.style.display = Store.unreadCount() > 0 ? 'block' : 'none';
  }
  var bell = $('#bellBtn');
  if (bell) bell.addEventListener('click', function(){ Store.markNotificationsRead(); renderBell(); switchPanel('notifications'); });
  function renderSettings(){
    var s = Store.getSettings();
    var waInput = $('#setWhatsapp'), autoInput = $('#setAutoConfirm'), taxInput = $('#setTax');
    if (waInput) waInput.value = s.whatsappNumber;
    if (autoInput) autoInput.checked = s.autoConfirm;
    if (taxInput) taxInput.value = (s.taxRate * 100).toFixed(0);
  }
  var settingsForm = $('#settingsForm');
  if (settingsForm) settingsForm.addEventListener('submit', function(e){
    e.preventDefault();
    Store.updateSettings({ whatsappNumber:$('#setWhatsapp').value.trim(), autoConfirm:$('#setAutoConfirm').checked, taxRate:parseFloat($('#setTax').value)/100 });
    if (window.KanonToast) window.KanonToast({ icon:'fa-check-circle', title:'Settings saved', variant:'success' });
  });
  var resetBtn = $('#resetDemo');
  if (resetBtn) resetBtn.addEventListener('click', function(){
    if (confirm('Reset all demo data? This will delete every booking.')) { Store.reset(); location.reload(); }
  });
  function fillPropertyFilter(){
    var sel = $('#bookingProperty'); if (!sel) return;
    sel.innerHTML = '<option value="all">All properties</option>' + Store.getProperties().map(function(p){ return '<option value="' + p.id + '">' + p.name + '</option>'; }).join('');
  }
  function render(){
    renderStats(); renderBookings(); renderRooms(); renderNotifications(); renderBell();
    if (currentPanel === 'dashboard') buildCharts();
  }
  function initDashboard(){
    fillPropertyFilter(); renderSettings(); switchPanel('dashboard');
    Store.subscribe(function(){ render(); });
  }
  document.addEventListener('DOMContentLoaded', checkAuth);
})();
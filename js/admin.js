(function () {
  'use strict';
  var Store = window.KanonStore;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function fmtDate(d){ if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
  function fmtTime(ts){ if (!ts) return '—'; return new Date(ts).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }); }
  function timeAgo(ts){ var d = Date.now()-ts; var m = Math.floor(d/60000); if (m<1) return 'just now'; if (m<60) return m+'m ago'; var h = Math.floor(m/60); if (h<24) return h+'h ago'; return Math.floor(h/24)+'d ago'; }
  function initials(n){ return (n||'?').split(' ').map(function(x){ return x[0]; }).slice(0,2).join('').toUpperCase(); }

  var loginShell = $('#loginShell'), adminShell = $('#adminShell');
  var loginForm = $('#loginForm'), loginError = $('#loginError');

  function checkAuth(){
    if (Store.isLoggedIn()) { loginShell.style.display='none'; adminShell.style.display='grid'; initDashboard(); }
    else { loginShell.style.display='grid'; adminShell.style.display='none'; }
  }
  if (loginForm) loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    if (Store.login($('#password').value)) { loginError.classList.remove('show'); checkAuth(); }
    else { loginError.textContent = 'Incorrect password. Try again.'; loginError.classList.add('show'); }
  });
  var logoutBtn = $('#logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', function(){ Store.logout(); location.reload(); });

  var currentPanel = 'dashboard';
  var panelTitles = {
    dashboard:'Dashboard', bookings:'Bookings', rooms:'Rooms',
    housekeeping:'Housekeeping', accounts:'Accounts', hr:'Human Resources',
    notifications:'Notifications', settings:'Settings'
  };

  function switchPanel(name){
    currentPanel = name;
    $$('.side-nav a').forEach(function(a){ a.classList.toggle('active', a.getAttribute('data-panel') === name); });
    $$('.panel').forEach(function(p){ p.classList.toggle('active', p.id === 'panel-' + name); });
    var t = $('#pageTitle'); if (t) t.textContent = panelTitles[name] || 'Dashboard';
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

  /* ---------- CHARTS ---------- */
  var revenueChart, occupancyChart, expenseChart;
  function buildCharts(){
    /* revenue line */
    var cR = $('#revenueChart');
    if (cR && typeof Chart !== 'undefined') {
      var bookings = Store.getBookings();
      var labels = [], data = [];
      for (var i = 6; i >= 0; i--) {
        var d = new Date(); d.setDate(d.getDate() - i);
        var key = d.toISOString().slice(0,10);
        labels.push(d.toLocaleDateString('en-GB', { weekday:'short' }));
        data.push(bookings.filter(function(b){
          return new Date(b.createdAt).toISOString().slice(0,10)===key && b.status!=='cancelled';
        }).reduce(function(s,b){ return s+b.total; }, 0));
      }
      if (revenueChart) revenueChart.destroy();
      revenueChart = new Chart(cR, {
        type:'line',
        data:{ labels:labels, datasets:[{ label:'Revenue', data:data, borderColor:'#c9a86c', backgroundColor:'rgba(201,168,108,0.15)', borderWidth:3, fill:true, tension:0.4, pointBackgroundColor:'#c9a86c', pointRadius:5 }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, ticks:{ color:'#8b8794' }, grid:{ color:'#f0ece4' } }, x:{ ticks:{ color:'#8b8794' }, grid:{ display:false } } } }
      });
    }
    /* occupancy doughnut */
    var cO = $('#occupancyChart');
    if (cO && typeof Chart !== 'undefined') {
      var stats = Store.stats();
      if (occupancyChart) occupancyChart.destroy();
      occupancyChart = new Chart(cO, {
        type:'doughnut',
        data:{ labels:['Occupied','Available'], datasets:[{ data:[stats.occupied, stats.rooms-stats.occupied], backgroundColor:['#c9a86c','#ece7dd'], borderWidth:0 }] },
        options:{ responsive:true, maintainAspectRatio:false, cutout:'70%', plugins:{ legend:{ position:'bottom', labels:{ color:'#1e1e2a', padding:14, font:{ size:12 } } } } }
      });
    }
    /* expense breakdown */
    var cE = $('#expenseChart');
    if (cE && typeof Chart !== 'undefined') {
      var cats = Store.expenseByCategory();
      if (expenseChart) expenseChart.destroy();
      expenseChart = new Chart(cE, {
        type:'doughnut',
        data:{
          labels: cats.map(function(c){ return c.category; }),
          datasets:[{ data: cats.map(function(c){ return c.total; }), backgroundColor:['#c9a86c','#3498db','#e74c3c','#f39c12','#9b59b6','#2ecc71','#7f8c8d'], borderWidth:0 }]
        },
        options:{ responsive:true, maintainAspectRatio:false, cutout:'60%', plugins:{ legend:{ position:'bottom', labels:{ color:'#1e1e2a', padding:10, font:{ size:11 } } } } }
      });
    }
  }

  /* ---------- DASHBOARD ---------- */
  function renderStats(){
    var s = Store.stats();
    var el = $('#statGrid'); if (!el) return;
    el.innerHTML =
      statCard('gold','fa-calendar-check','Bookings', s.totalBookings, 'up', 'All time') +
      statCard('green','fa-bed','Occupancy', s.occupancy+'%', 'up', s.occupied+' / '+s.rooms+' rooms') +
      statCard('blue','fa-dollar-sign','Revenue', Store.money(s.revenue), 'up', 'Confirmed') +
      statCard('orange','fa-broom','Pending Tasks', s.pendingTasks, 'down', 'Housekeeping') +
      statCard('gold','fa-users','Employees', s.employees, 'up', 'Active staff');
  }
  function statCard(color, icon, label, value, trendDir, trendText){
    return '<div class="stat-card fade-up"><div class="ico '+color+'"><i class="fas '+icon+'"></i></div><div class="label">'+label+'</div><div class="value">'+value+'</div><div class="trend '+trendDir+'">'+trendText+'</div></div>';
  }

  /* ---------- BOOKINGS ---------- */
  var bookingFilter = { q:'', status:'all', property:'all' };
  function renderBookings(){
    var tbody = $('#bookingsTbody'); if (!tbody) return;
    var list = Store.getBookings();
    if (bookingFilter.status !== 'all') list = list.filter(function(b){ return b.status === bookingFilter.status; });
    if (bookingFilter.property !== 'all') list = list.filter(function(b){ return b.propertyId === bookingFilter.property; });
    if (bookingFilter.q) {
      var q = bookingFilter.q.toLowerCase();
      list = list.filter(function(b){ return (b.guestName+' '+b.id+' '+b.propertyName).toLowerCase().indexOf(q) > -1; });
    }
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty"><i class="fas fa-inbox"></i>No bookings match.</div></td></tr>'; return; }
    tbody.innerHTML = list.map(function(b){
      return '<tr><td><strong>'+b.id+'</strong></td><td>'+b.guestName+'<div style="font-size:.72rem;color:var(--muted);">'+(b.phone||b.email||'')+'</div></td><td>'+b.propertyName+'</td><td>'+b.roomType+' #'+b.roomNumber+'</td><td>'+fmtDate(b.checkin)+'<div style="font-size:.72rem;color:var(--muted);">to '+fmtDate(b.checkout)+'</div></td><td>'+Store.money(b.total)+'</td><td><span class="badge '+b.status+'">'+b.status.replace('-',' ')+'</span></td><td>'+actionButtons(b)+'</td></tr>';
    }).join('');
    $$('[data-action]', tbody).forEach(function(btn){
      btn.addEventListener('click', function(){ handleBookingAction(btn.getAttribute('data-id'), btn.getAttribute('data-action')); });
    });
  }
  function actionButtons(b){
    var parts = [];
    if (b.status === 'pending') parts.push('<button class="btn btn-gold btn-sm" data-action="confirm" data-id="'+b.id+'">Confirm</button>');
    if (b.status === 'confirmed') parts.push('<button class="btn btn-dark btn-sm" data-action="checkin" data-id="'+b.id+'">Check-in</button>');
    if (b.status === 'checked-in') parts.push('<button class="btn btn-dark btn-sm" data-action="checkout" data-id="'+b.id+'">Check-out</button>');
    if (b.status !== 'cancelled' && b.status !== 'checked-out') parts.push('<button class="btn btn-ghost btn-sm" data-action="cancel" data-id="'+b.id+'" style="border-color:var(--danger);color:var(--danger);">Cancel</button>');
    return parts.join(' ') || '<span style="color:var(--muted);font-size:.78rem;">—</span>';
  }
  function handleBookingAction(id, action){
    var map = { confirm:'confirmed', checkin:'checked-in', checkout:'checked-out', cancel:'cancelled' };
    var status = map[action]; if (!status) return;
    if (action === 'cancel' && !confirm('Cancel this booking?')) return;
    Store.updateBookingStatus(id, status);
    if (window.KanonToast) window.KanonToast({ icon:'fa-check-circle', title:'Booking '+status, sub:id, variant:'success' });
  }
  var bSearch = $('#bookingSearch'), bStatus = $('#bookingStatus'), bProperty = $('#bookingProperty');
  if (bSearch) bSearch.addEventListener('input', function(){ bookingFilter.q = bSearch.value.trim(); renderBookings(); });
  if (bStatus) bStatus.addEventListener('change', function(){ bookingFilter.status = bStatus.value; renderBookings(); });
  if (bProperty) bProperty.addEventListener('change', function(){ bookingFilter.property = bProperty.value; renderBookings(); });

  /* ---------- ROOMS ---------- */
  function renderRooms(){
    var grid = $('#roomsGrid'); if (!grid) return;
    grid.innerHTML = Store.getRooms().map(function(r){
      var prop = Store.getProperty(r.propertyId);
      var badgeClass = r.status==='available' ? 'confirmed' : r.status==='occupied' ? 'cancelled' : 'pending';
      return '<div class="card" style="padding:1rem;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem;"><strong style="font-size:1.05rem;">Room #'+r.number+'</strong><span class="badge '+badgeClass+'">'+r.status+'</span></div><div style="font-size:.8rem;color:var(--muted);">'+r.type+' · '+r.beds+'</div><div style="font-size:.78rem;color:var(--muted);margin-bottom:.4rem;">'+(prop?prop.name:'-')+'</div><div style="font-size:.72rem;color:var(--muted);margin-bottom:.7rem;">HK: <span class="badge '+(r.housekeeping==='clean'?'done':r.housekeeping==='dirty'?'cancelled':r.housekeeping==='inspected'?'inspected':'pending')+'">'+r.housekeeping+'</span></div><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:700;color:var(--gold-dark);">'+Store.money(r.price)+'</span><select class="form-select" style="max-width:130px;font-size:.75rem;padding:.3rem .6rem;" data-room-status data-id="'+r.id+'">'+['available','occupied','cleaning','maintenance'].map(function(s){ return '<option value="'+s+'"'+(s===r.status?' selected':'')+'>'+s+'</option>'; }).join('')+'</select></div></div>';
    }).join('');
    $$('[data-room-status]').forEach(function(sel){
      sel.addEventListener('change', function(){ Store.setRoomStatus(sel.getAttribute('data-id'), sel.value); });
    });
  }

  /* ---------- HOUSEKEEPING ---------- */
  function renderHousekeeping(){
    var board = $('#hkBoard'); if (!board) return;
    var tasks = Store.getTasks();
    var columns = [
      { key:'pending',    label:'Pending' },
      { key:'in-progress',label:'In Progress' },
      { key:'done',       label:'Done' },
      { key:'inspected',  label:'Inspected' }
    ];
    board.innerHTML = columns.map(function(col){
      var list = tasks.filter(function(t){ return t.status === col.key; });
      return '<div class="kanban-col"><h5>'+col.label+' <span class="count">'+list.length+'</span></h5>'+
        (list.length ? list.map(taskCard).join('') : '<div style="font-size:.78rem;color:var(--muted);padding:.5rem;">Empty</div>')+
        '</div>';
    }).join('');
    $$('[data-task-action]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-task-id');
        var act = btn.getAttribute('data-task-action');
        if (act === 'start') Store.updateTask(id, { status:'in-progress' });
        else if (act === 'done') Store.updateTask(id, { status:'done' });
        else if (act === 'inspect') Store.updateTask(id, { status:'inspected' });
        else if (act === 'assign') {
          var empId = prompt('Assign to employee ID (emp-01 etc):');
          if (empId) Store.updateTask(id, { assignedTo: empId });
        } else if (act === 'delete') {
          if (confirm('Delete this task?')) {
            var s = Store.getState();
            s.housekeeping.tasks = s.housekeeping.tasks.filter(function(t){ return t.id!==id; });
          }
        }
        render();
      });
    });
    renderSupplies();
  }
  function taskCard(t){
    var emp = t.assignedTo ? Store.getEmployee(t.assignedTo) : null;
    return '<div class="task-card priority-'+t.priority+'">'+
      '<div class="head"><strong>Room '+t.roomNumber+'</strong><span class="badge '+t.priority+'">'+t.priority+'</span></div>'+
      '<div class="meta">'+t.type+' · created '+timeAgo(t.createdAt)+'</div>'+
      (emp ? '<div class="meta"><i class="fas fa-user"></i> '+emp.name+'</div>' : '<div class="meta" style="color:var(--danger);"><i class="fas fa-user-slash"></i> Unassigned</div>')+
      (t.notes ? '<div class="meta" style="font-style:italic;">"'+t.notes+'"</div>' : '')+
      '<div class="actions">'+
        (t.status==='pending' ? '<button class="primary" data-task-action="start" data-task-id="'+t.id+'">Start</button>' : '')+
        (t.status==='in-progress' ? '<button class="primary" data-task-action="done" data-task-id="'+t.id+'">Done</button>' : '')+
        (t.status==='done' ? '<button class="primary" data-task-action="inspect" data-task-id="'+t.id+'">Inspect</button>' : '')+
        '<button data-task-action="assign" data-task-id="'+t.id+'">Assign</button>'+
      '</div>'+
    '</div>';
  }
  function renderSupplies(){
    var tb = $('#suppliesBody'); if (!tb) return;
    tb.innerHTML = Store.getSupplies().map(function(s){
      var low = s.quantity <= s.reorderLevel;
      return '<tr><td><strong>'+s.name+'</strong></td><td>'+s.quantity+' '+s.unit+'</td><td>'+s.reorderLevel+' '+s.unit+'</td><td>'+Store.money(s.cost)+'</td><td>'+(low ? '<span class="badge cancelled">low</span>' : '<span class="badge confirmed">ok</span>')+'</td><td><button class="btn btn-ghost btn-sm" data-restock="'+s.id+'">+ Restock</button></td></tr>';
    }).join('');
    $$('[data-restock]').forEach(function(b){
      b.addEventListener('click', function(){
        var q = parseInt(prompt('How many units to add?','50'),10);
        if (q > 0) { Store.restockSupply(b.getAttribute('data-restock'), q); render(); }
      });
    });
  }
  /* add task form */
  var hkForm = $('#hkForm');
  if (hkForm) hkForm.addEventListener('submit', function(e){
    e.preventDefault();
    var roomSel = $('#hkRoom');
    var roomId = roomSel.value;
    var room = Store.getRooms().find(function(r){ return r.id===roomId; });
    if (!room) return;
    Store.createHousekeepingTask({
      roomId: room.id, roomNumber: room.number, propertyId: room.propertyId,
      type: $('#hkType').value, priority: $('#hkPriority').value,
      notes: $('#hkNotes').value,
      assignedTo: $('#hkAssign').value || null
    });
    hkForm.reset();
    if (window.KanonToast) window.KanonToast({ icon:'fa-broom', title:'Task created', variant:'success' });
  });

  /* ---------- ACCOUNTS ---------- */
  function renderAccounts(){
    var f = Store.financialSummary();
    var kpi = $('#accountsKpi');
    if (kpi) {
      kpi.innerHTML =
        kpiCard('Total Income',   Store.money(f.income),  'All time',    'num-pos') +
        kpiCard('Total Expense',  Store.money(f.expense), 'All time',    'num-neg') +
        kpiCard('Net Profit',     Store.money(f.net),     'Income − Expense', f.net>=0?'num-pos':'num-neg') +
        kpiCard('Today Income',   Store.money(f.todayIncome),  'Today', 'num-pos') +
        kpiCard('Today Expense',  Store.money(f.todayExpense), 'Today', 'num-neg') +
        kpiCard('Unpaid Invoices', f.unpaidCount + ' · ' + Store.money(f.unpaidTotal), 'Outstanding', '');
    }
    /* transactions */
    var tb = $('#txBody');
    if (tb) {
      var list = Store.getTransactions().slice(0, 50);
      tb.innerHTML = list.length ? list.map(function(t){
        return '<tr>'+
          '<td>'+fmtDate(t.date)+'</td>'+
          '<td><span class="badge '+t.type+'">'+t.type+'</span></td>'+
          '<td>'+t.category+'</td>'+
          '<td>'+t.description+'</td>'+
          '<td>'+t.method+'</td>'+
          '<td class="'+(t.type==='income'?'num-pos':'num-neg')+'">'+(t.type==='income'?'+':'−')+Store.money(t.amount)+'</td>'+
        '</tr>';
      }).join('') : '<tr><td colspan="6"><div class="empty"><i class="fas fa-receipt"></i>No transactions yet.</div></td></tr>';
    }
    /* invoices */
    var ib = $('#invBody');
    if (ib) {
      var inv = Store.getInvoices().slice(0, 40);
      ib.innerHTML = inv.length ? inv.map(function(i){
        return '<tr>'+
          '<td><strong>'+i.id+'</strong></td>'+
          '<td>'+i.guestName+'</td>'+
          '<td>'+fmtDate(i.issuedAt)+'</td>'+
          '<td>'+Store.money(i.total)+'</td>'+
          '<td><span class="badge '+(i.status==='paid'?'paid':'unpaid')+'">'+i.status+'</span></td>'+
          '<td>'+(i.status==='unpaid' ? '<button class="btn btn-gold btn-sm" data-pay-inv="'+i.id+'">Mark Paid</button>' : fmtDate(i.paidAt))+'</td>'+
        '</tr>';
      }).join('') : '<tr><td colspan="6"><div class="empty"><i class="fas fa-file-invoice"></i>No invoices yet.</div></td></tr>';
      $$('[data-pay-inv]').forEach(function(b){
        b.addEventListener('click', function(){
          var m = prompt('Payment method (cash / card / bank):','cash') || 'cash';
          Store.markInvoicePaid(b.getAttribute('data-pay-inv'), m);
          render();
          if (window.KanonToast) window.KanonToast({ icon:'fa-check-circle', title:'Invoice paid', variant:'success' });
        });
      });
    }
    /* expense chart */
    buildCharts();
  }
  function kpiCard(label, val, sub, cls){
    return '<div class="kpi"><div class="k-label">'+label+'</div><div class="k-val '+cls+'">'+val+'</div><div class="k-sub">'+sub+'</div></div>';
  }
  var txForm = $('#txForm');
  if (txForm) txForm.addEventListener('submit', function(e){
    e.preventDefault();
    Store.addTransaction({
      type: $('#txType').value,
      category: $('#txCategory').value,
      method: $('#txMethod').value,
      description: $('#txDesc').value,
      amount: parseFloat($('#txAmount').value) || 0
    });
    txForm.reset();
    render();
    if (window.KanonToast) window.KanonToast({ icon:'fa-check-circle', title:'Transaction saved', variant:'success' });
  });

  /* ---------- HR ---------- */
  function renderHR(){
    /* employees */
    var tb = $('#empBody');
    if (tb) {
      tb.innerHTML = Store.getEmployees().map(function(e){
        var badge = e.status==='active'?'active-emp':(e.status==='on-leave'?'on-leave':'terminated');
        return '<tr>'+
          '<td><div class="emp-cell"><div class="avatar-sm">'+initials(e.name)+'</div><div><strong>'+e.name+'</strong><div style="font-size:.72rem;color:var(--muted);">'+e.email+'</div></div></div></td>'+
          '<td>'+e.role+'</td>'+
          '<td>'+e.department+'</td>'+
          '<td>'+e.phone+'</td>'+
          '<td>'+fmtDate(e.hireDate)+'</td>'+
          '<td>'+Store.money(e.salary)+'</td>'+
          '<td><span class="badge '+badge+'">'+e.status+'</span></td>'+
          '<td><button class="btn btn-ghost btn-sm" data-toggle-emp="'+e.id+'">Toggle Status</button></td>'+
        '</tr>';
      }).join('');
      $$('[data-toggle-emp]').forEach(function(b){
        b.addEventListener('click', function(){
          var e = Store.getEmployee(b.getAttribute('data-toggle-emp'));
          var next = e.status==='active' ? 'on-leave' : 'active';
          Store.updateEmployee(e.id, { status: next });
          render();
        });
      });
    }
    /* today's attendance */
    var atb = $('#attBody');
    if (atb) {
      var today = Store.todayKey();
      var recs = Store.getAttendance().filter(function(a){ return a.date===today; });
      atb.innerHTML = Store.getEmployees().map(function(e){
        var rec = recs.find(function(a){ return a.employeeId===e.id; });
        var status = rec && rec.clockIn && rec.clockOut ? 'done' : rec && rec.clockIn ? 'in-progress' : 'pending';
        return '<tr>'+
          '<td><div class="emp-cell"><div class="avatar-sm">'+initials(e.name)+'</div><div><strong>'+e.name+'</strong></div></div></td>'+
          '<td>'+e.department+'</td>'+
          '<td>'+(rec && rec.clockIn ? fmtTime(rec.clockIn) : '—')+'</td>'+
          '<td>'+(rec && rec.clockOut ? fmtTime(rec.clockOut) : '—')+'</td>'+
          '<td><span class="badge '+status+'">'+(status==='done'?'complete':status==='in-progress'?'working':'not clocked in')+'</span></td>'+
          '<td>'+
            (!rec || !rec.clockIn ? '<button class="btn btn-gold btn-sm" data-clock="in" data-emp="'+e.id+'">Clock In</button>' : '')+
            (rec && rec.clockIn && !rec.clockOut ? '<button class="btn btn-dark btn-sm" data-clock="out" data-emp="'+e.id+'">Clock Out</button>' : '')+
            (rec && rec.clockIn && rec.clockOut ? '<span style="color:var(--muted);font-size:.78rem;">Done</span>' : '')+
          '</td>'+
        '</tr>';
      }).join('');
      $$('[data-clock]').forEach(function(b){
        b.addEventListener('click', function(){
          var emp = b.getAttribute('data-emp');
          if (b.getAttribute('data-clock')==='in') Store.clockIn(emp);
          else Store.clockOut(emp);
          render();
        });
      });
    }
    /* payroll */
    var ptb = $('#payBody');
    if (ptb) {
      var list = Store.getPayroll().slice(0,30);
      ptb.innerHTML = list.length ? list.map(function(p){
        var e = Store.getEmployee(p.employeeId) || { name:'Unknown' };
        return '<tr>'+
          '<td>'+p.month+'</td>'+
          '<td><div class="emp-cell"><div class="avatar-sm">'+initials(e.name)+'</div><div><strong>'+e.name+'</strong></div></div></td>'+
          '<td>'+Store.money(p.baseSalary)+'</td>'+
          '<td>'+Store.money(p.allowances)+'</td>'+
          '<td>'+Store.money(p.deductions)+'</td>'+
          '<td><strong>'+Store.money(p.net)+'</strong></td>'+
          '<td><span class="badge '+(p.status==='paid'?'paid':'unpaid')+'">'+p.status+'</span></td>'+
          '<td>'+(p.status==='unpaid' ? '<button class="btn btn-gold btn-sm" data-pay-pr="'+p.id+'">Pay</button>' : fmtDate(p.paidAt))+'</td>'+
        '</tr>';
      }).join('') : '<tr><td colspan="8"><div class="empty"><i class="fas fa-money-check"></i>No payroll records yet. Click "Run Payroll".</div></td></tr>';
      $$('[data-pay-pr]').forEach(function(b){
        b.addEventListener('click', function(){
          if (confirm('Mark this payroll as paid? It will be recorded as an expense.')) {
            Store.markPayrollPaid(b.getAttribute('data-pay-pr'));
            render();
            if (window.KanonToast) window.KanonToast({ icon:'fa-check-circle', title:'Payroll paid', variant:'success' });
          }
        });
      });
    }
  }
  var empForm = $('#empForm');
  if (empForm) empForm.addEventListener('submit', function(e){
    e.preventDefault();
    Store.addEmployee({
      name: $('#empName').value,
      role: $('#empRole').value,
      department: $('#empDept').value,
      phone: $('#empPhone').value,
      email: $('#empEmail').value,
      salary: parseFloat($('#empSalary').value) || 0
    });
    empForm.reset();
    render();
    if (window.KanonToast) window.KanonToast({ icon:'fa-check-circle', title:'Employee added', variant:'success' });
  });
  var runPayrollBtn = $('#runPayroll');
  if (runPayrollBtn) runPayrollBtn.addEventListener('click', function(){
    var r = Store.runPayroll();
    render();
    alert('Payroll processed for ' + r.length + ' employees.');
  });

  /* ---------- NOTIFICATIONS ---------- */
  function renderNotifications(){
    var feed = $('#notifFeed'); if (!feed) return;
    var list = Store.getNotifications().slice(0, 40);
    if (!list.length) { feed.innerHTML = '<div class="empty"><i class="fas fa-bell-slash"></i>No notifications.</div>'; return; }
    feed.innerHTML = list.map(function(n){
      var iconMap = { whatsapp:'fa-whatsapp', system:'fa-bell' };
      var clsMap = { whatsapp:'wa', system:'system' };
      return '<div class="feed-item '+(clsMap[n.channel]||'system')+'"><div class="ico-circle"><i class="'+(n.channel==='whatsapp'?'fab':'fas')+' '+(iconMap[n.channel]||'fa-bell')+'"></i></div><div class="body"><strong>'+n.title+'</strong><p>'+n.body+'</p></div><div class="time">'+timeAgo(n.createdAt)+'</div></div>';
    }).join('');
  }
  function renderBell(){ var dot = $('#bellDot'); if (dot) dot.style.display = Store.unreadCount() > 0 ? 'block' : 'none'; }
  var bell = $('#bellBtn');
  if (bell) bell.addEventListener('click', function(){ Store.markNotificationsRead(); renderBell(); switchPanel('notifications'); });

  /* ---------- SETTINGS ---------- */
  function renderSettings(){
    var s = Store.getSettings();
    if ($('#setWhatsapp')) $('#setWhatsapp').value = s.whatsappNumber;
    if ($('#setAutoConfirm')) $('#setAutoConfirm').checked = s.autoConfirm;
    if ($('#setTax')) $('#setTax').value = (s.taxRate*100).toFixed(0);
  }
  var settingsForm = $('#settingsForm');
  if (settingsForm) settingsForm.addEventListener('submit', function(e){
    e.preventDefault();
    Store.updateSettings({
      whatsappNumber: $('#setWhatsapp').value.trim(),
      autoConfirm: $('#setAutoConfirm').checked,
      taxRate: parseFloat($('#setTax').value)/100
    });
    if (window.KanonToast) window.KanonToast({ icon:'fa-check-circle', title:'Settings saved', variant:'success' });
  });
  var resetBtn = $('#resetDemo');
  if (resetBtn) resetBtn.addEventListener('click', function(){
    if (confirm('Reset ALL demo data? This deletes every booking, employee, transaction, and task.')) { Store.reset(); location.reload(); }
  });

  /* ---------- Helpers ---------- */
  function fillPropertyFilter(){
    var sel = $('#bookingProperty'); if (!sel) return;
    sel.innerHTML = '<option value="all">All properties</option>' + Store.getProperties().map(function(p){ return '<option value="'+p.id+'">'+p.name+'</option>'; }).join('');
  }
  function fillHkRooms(){
    var sel = $('#hkRoom'); if (!sel) return;
    sel.innerHTML = Store.getRooms().map(function(r){
      var p = Store.getProperty(r.propertyId);
      return '<option value="'+r.id+'">Room '+r.number+' · '+(p?p.name:'')+' · '+r.type+'</option>';
    }).join('');
  }
  function fillHkAssign(){
    var sel = $('#hkAssign'); if (!sel) return;
    sel.innerHTML = '<option value="">Unassigned</option>' + Store.getEmployees()
      .filter(function(e){ return e.department==='Housekeeping' || e.department==='Maintenance'; })
      .map(function(e){ return '<option value="'+e.id+'">'+e.name+'</option>'; }).join('');
  }
  function fillTxCategory(){
    var sel = $('#txCategory'); if (!sel) return;
    var type = $('#txType').value;
    var cats = Store.getState().accounts.categories[type];
    sel.innerHTML = cats.map(function(c){ return '<option>'+c+'</option>'; }).join('');
  }
  var txType = $('#txType');
  if (txType) txType.addEventListener('change', fillTxCategory);

  /* ---------- MAIN RENDER ---------- */
  function render(){
    renderStats();
    renderBookings();
    renderRooms();
    renderHousekeeping();
    renderAccounts();
    renderHR();
    renderNotifications();
    renderBell();
    if (currentPanel === 'dashboard') buildCharts();
  }

  function initDashboard(){
    fillPropertyFilter();
    fillHkRooms();
    fillHkAssign();
    fillTxCategory();
    renderSettings();
    switchPanel('dashboard');
    Store.subscribe(function(){ render(); });
  }

  document.addEventListener('DOMContentLoaded', checkAuth);
})();

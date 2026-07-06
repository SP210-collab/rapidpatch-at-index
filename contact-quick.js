/* Rapidpatch — /contact quick photo-quote form → Wix Forms submission.
 * Served from https://sp210-collab.github.io/rapidpatch-at-index/contact-quick.js
 * Loaded by Custom Embed ce6185bf (contact-page hero v2 BODY_END).
 * Replaces the old mailto: handler: submissions now POST into the same Wix Forms
 * inquiry pipeline as /form (form 3c57c17a), so they hit the CRM + notification
 * automation instead of opening the visitor's email app.
 * Auth: anonymous visitor instance token from /_api/v1/access-tokens (Forms app 225dd912…).
 */
(function () {
  'use strict';
  if (window.__rpQuickBooted) return;
  window.__rpQuickBooted = true;
  if ((location.pathname || '').replace(/\/+$/, '').toLowerCase() !== '/contact') return;

  var FORM_ID = '3c57c17a-40b1-424d-9aff-97fd01840e1f';
  var FORMS_APP = '225dd912-7dea-4738-8688-4b8c6955ffc2';
  var DISP = '027 737 2858';

  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? e.value.trim() : ''; }

  /* Upgrade the injected quick form: split "Phone or email" into Phone + Email
     (the Wix form requires both; the auto-quote pipeline needs a reply email). */
  function upgrade() {
    var f = el('rp-c2-quick');
    if (!f || f.getAttribute('data-rpq')) return;
    f.setAttribute('data-rpq', '1');
    var qc = el('qc');
    if (qc) {
      var row = qc.parentElement; // .rp-c2-form-row
      row.innerHTML = '<label for="qp">Phone</label><input id="qp" type="tel" placeholder="027…" autocomplete="tel" required>';
      var emailRow = document.createElement('div');
      emailRow.className = 'rp-c2-form-row';
      emailRow.innerHTML = '<label for="qe">Email</label><input id="qe" type="email" placeholder="you@example.co.nz" autocomplete="email" required>';
      var grid = f.querySelector('.rp-c2-form-grid');
      if (grid && grid.parentNode) grid.parentNode.insertBefore(emailRow, grid.nextSibling);
    }
    // Copy: no more "opens your email app"
    var sec = f.closest('.rp-c2-sec');
    var meta = sec && sec.querySelector('.rp-c2-h2-meta');
    if (meta) meta.textContent = 'Five quick fields. Lands straight in our quote queue.';
    var help = f.querySelector('.rp-c2-form-help');
    if (help) help.innerHTML = 'Goes straight to Rapidpatch — same queue as the full form. We reply within 24 working hours with a fixed quote (we’ll ask for photos by reply). Prefer to attach photos now? <a href="/form">Use the full form</a>.';
  }

  function setBusy(f, busy) {
    var b = f.querySelector('.rp-c2-form-submit');
    if (b) { b.disabled = busy; b.style.opacity = busy ? '.6' : ''; if (busy) b.__rpTxt = b.textContent; b.textContent = busy ? 'Sending…' : (b.__rpTxt || b.textContent); }
  }
  function note(f, msg, isErr) {
    var n = f.querySelector('.rp-c2-form-note');
    if (!n) { n = document.createElement('p'); n.className = 'rp-c2-form-note'; f.appendChild(n); }
    n.style.cssText = 'margin:10px 0 0;font-size:14px;font-weight:600;color:' + (isErr ? '#a82820' : '#1c5d2f');
    n.textContent = msg;
  }
  function normPhone(p) {
    var d = p.replace(/[^\d+]/g, '');
    if (/^0\d{7,10}$/.test(d)) return '+64' + d.slice(1);
    return d;
  }

  function submit(f) {
    var name = val('qn'), phone = val('qp'), email = val('qe'), addr = val('qa'), desc = val('qd');
    if (!name || !phone || !email || !addr) {
      var bad = f.querySelector('input:invalid') || f.querySelector('input');
      if (bad) bad.focus();
      note(f, 'Name, phone, email and site address are all needed for a quote.', true);
      return;
    }
    setBusy(f, true);
    var payload = { submission: { formId: FORM_ID, status: 'CONFIRMED', submissions: {
      full_name: name,
      phone_c33d: normPhone(phone),
      email_address: email,
      wheres_the_job: addr,
      what_kind_of_property: ['Other'],
      anything_the_crew_should_know: '[Quick photo-quote form on /contact] ' + (desc || '(no description given)')
    } } };
    fetch('/_api/v1/access-tokens')
      .then(function (r) { return r.json(); })
      .then(function (t) {
        var inst = t && t.apps && t.apps[FORMS_APP] && t.apps[FORMS_APP].instance;
        if (!inst) throw new Error('no forms instance');
        return fetch('/_api/form-submission-service/v4/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': inst },
          body: JSON.stringify(payload)
        });
      })
      .then(function (r) {
        if (!r.ok) return r.text().then(function (tx) { throw new Error('HTTP ' + r.status + ' ' + tx.slice(0, 120)); });
        return r.json();
      })
      .then(function () {
        if (window.gtag) gtag('event', 'contact_quick_form_submit', { event_category: 'contact', event_label: 'wix_forms_api' });
        if (window.posthog) posthog.capture('quote_form_submitted', { page: 'contact_v2', channel: 'quick_form_api' });
        f.innerHTML = '<div style="padding:26px 22px;background:#e6f4ea;border-radius:10px;color:#1c5d2f">' +
          '<p style="margin:0 0 8px;font-weight:800;font-size:17px">Got it, ' + name.split(' ')[0].replace(/[<>&]/g, '') + ' ✓</p>' +
          '<p style="margin:0;font-size:14px;line-height:1.6">Your request is in our quote queue — we’ll reply to <strong>' + email.replace(/[<>&]/g, '') + '</strong> within 24 working hours and ask for a couple of photos. Urgent? Call <a href="tel:+64277372858" style="color:inherit;font-weight:700">' + DISP + '</a>.</p></div>';
      })
      .catch(function (err) {
        setBusy(f, false);
        if (window.posthog) posthog.capture('contact_quick_form_error', { page: 'contact_v2', error: String(err).slice(0, 160) });
        note(f, 'That didn’t send — sorry. Call or text ' + DISP + ', or use the full form at /form (nothing you typed is lost).', true);
      });
  }

  /* Document-level capture beats the legacy mailto listener bound on the form
     (capture on document runs before any target-phase listener). */
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || f.id !== 'rp-c2-quick') return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    upgrade(); // belt & braces if a hydration wipe re-injected the un-upgraded form
    submit(f);
  }, true);

  /* Hero embed re-injects the section after Wix hydration wipes — keep the upgrade applied. */
  setInterval(upgrade, 2000);
  upgrade();
})();

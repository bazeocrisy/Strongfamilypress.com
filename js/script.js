/* ==========================================================================
   Strong Family Press — script.js
   Vanilla JavaScript only. No libraries, no build step.

   Three jobs:
     1. Mobile navigation toggle
     2. Explain, rather than fake, the actions that aren't connected yet
     3. Stop the placeholder forms from submitting anywhere

   When a real service is connected, see the notes marked CONNECT: below.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. Mobile navigation
     ------------------------------------------------------------------ */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close after choosing a destination
    nav.addEventListener('click', function (event) {
      if (event.target.tagName === 'A') {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Escape closes the menu and returns focus to the button
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------------
     2. Buttons whose destination does not exist yet

     These are marked aria-disabled rather than disabled so they stay
     reachable by keyboard and screen reader, and explain themselves
     instead of silently doing nothing.

     The book buttons are now LIVE (Gumroad). This handler remains only
     for any future action that is announced before it is connected.
     ------------------------------------------------------------------ */
  var pendingButtons = document.querySelectorAll('[data-pending]');

  Array.prototype.forEach.call(pendingButtons, function (button) {
    button.setAttribute('aria-disabled', 'true');

    var key = button.getAttribute('data-pending');
    var note = document.querySelector('[data-pending-note="' + key + '"]');

    button.addEventListener('click', function () {
      if (note) {
        note.hidden = false;
        note.setAttribute('role', 'status');
      }
    });
  });

  /* ------------------------------------------------------------------
     3. Placeholder forms

     Nothing is sent, stored, or validated. The forms exist so the
     fields can be reviewed and approved before a service is chosen.

     CONNECT (speaking inquiry): add action and method to the <form>,
     e.g. action="https://formspree.io/f/XXXX" method="POST", remove
     the data-guard attribute, remove aria-disabled from the submit
     button, and delete the .form-status banner.

     CONNECT (assessment): replace the whole <form> with the embed
     supplied by the chosen email platform, or point it at that
     platform's hosted endpoint.
     ------------------------------------------------------------------ */
  var guardedForms = document.querySelectorAll('[data-guard]');

  Array.prototype.forEach.call(guardedForms, function (form) {
    var message = form.querySelector('.form-message');

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (!message) { return; }

      if (form.getAttribute('data-guard') === 'speaking') {
        message.textContent =
          'This form is not connected to a form service yet, so nothing was ' +
          'sent. Please email contact@strongfamilypress.net with your event ' +
          'details and we will reply directly.';
      } else {
        message.textContent =
          'This sign-up is not connected to an email service yet, so nothing ' +
          'was sent or saved. The assessment will be available once it is set up.';
      }
    });
  });

  /* ------------------------------------------------------------------
     4. Analytics

     CONNECT: no analytics is installed. Nothing on this site is being
     measured today. Once a provider is chosen, add its snippet to
     index.html and wire the events listed in the README.
     ------------------------------------------------------------------ */

}());

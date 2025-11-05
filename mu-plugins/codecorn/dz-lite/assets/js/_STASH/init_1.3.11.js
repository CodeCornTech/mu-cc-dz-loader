// @ts-nocheck
// init.js
(function($, w){
  'use strict';
  w.CC_DZ = (w.CC_DZ && typeof w.CC_DZ === 'object') ? w.CC_DZ : {};
  CC_DZ.readyDelay = (window.CC_DZ.readyDelay ?? 50); // default 50
  var dbg = (w.CC_DZ.dbg && typeof w.CC_DZ.dbg === 'function') ? w.CC_DZ.dbg : function(){};

  var _readyFired = false;
  function doneOnceAll(delay){
    if (_readyFired) return;
    _readyFired = true;

    var ms = (typeof delay === 'number') ? delay : 50; // 👈 default 50ms
    setTimeout(function(){
      // un frame dopo per evitare flicker in reflow/paint
      requestAnimationFrame(function(){
        document.documentElement.classList.remove('ccdz-booting');
        document.documentElement.classList.add('ccdz-ready');
        dbg('boot complete → ccdz-ready (delay %sms)', ms);
      });
    }, ms);
  }

  function safeApply($inp, tries){
    tries = (typeof tries==='number') ? tries : 40;
    if (w.CC_DZ && typeof w.CC_DZ.applyDropzone === 'function') return w.CC_DZ.applyDropzone($inp);
    if (tries <= 0) return console.error('[CC-DZ] applyDropzone assente', w.CC_DZ);
    setTimeout(function(){ safeApply($inp, tries-1); }, 60);
  }

  function bootScope($scope){
    $scope.find('.elementor-field-type-upload input[type="file"]').each(function(){
      var $inp = $(this);
      var h = Math.max(44, $inp.outerHeight(true) || 0);
      safeApply($inp);
      var $wrap = $inp.next('.cc-dz'); if ($wrap.length && h) $wrap.css('min-height', h+'px');
    });
  }

  $(w).on('elementor/frontend/init', function(){
    elementorFrontend.hooks.addAction('frontend/element_ready/form.default', function($scope){
      bootScope($scope);
      doneOnceAll(CC_DZ.readyDelay); // 👈 usa il delay qui
    });
  });

  // Fallback se gli hook non scattano
  $(function(){
    var $forms = $('.elementor-form');
    if ($forms.length){ $forms.each(function(){ bootScope($(this)); }); doneOnceAll(50); }
  });
})(jQuery, window);
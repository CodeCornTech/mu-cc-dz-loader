// @ts-nocheck
// init.js
(function ($, window) {
    'use strict';

    // guard minima
    if (!window.CC_DZ || typeof window.CC_DZ !== 'object') window.CC_DZ = {};
    var DEBUG = !!(window.CC_DZ_OPTS && window.CC_DZ_OPTS.debug);

    var dbg = window.CC_DZ.dbg && typeof window.CC_DZ.dbg === 'function' ? window.CC_DZ.dbg : function () {};
    function safeApply($inp, tries) {
        tries = typeof tries === 'number' ? tries : 40; // ~2.4s @60ms
        if (window.CC_DZ && typeof window.CC_DZ.applyDropzone === 'function') {
            return window.CC_DZ.applyDropzone($inp);
        }
        if (tries <= 0) {
            console.error('[CC-DZ] applyDropzone ancora assente — abort', window.CC_DZ);
            return;
        }
        setTimeout(function () {
            safeApply($inp, tries - 1);
        }, 60);
    }

    function bootScope($scope) {
        $scope.find('.elementor-field-type-upload input[type="file"]').each(function () {
            var $inp = $(this);
            var h = Math.max(44, $inp.outerHeight(true) || 0);
            safeApply($inp); // 👈 chiama la safe
            var $wrap = $inp.next('.cc-dz');
            if ($wrap.length && h) $wrap.css('min-height', h + 'px');
        });
    }

    function doneOnceAll() {
        requestAnimationFrame(function () {
            document.documentElement.classList.remove('ccdz-booting');
            document.documentElement.classList.add('ccdz-ready');
            dbg('boot complete → ccdz-ready');
        });
    }

    $(window).on('elementor/frontend/init', function () {
        elementorFrontend.hooks.addAction('frontend/element_ready/form.default', function ($scope) {
            bootScope($scope);
            setTimeout(doneOnceAll, 0);
        });
    });

    // Fallback se Elementor non emette hook (raro)
    $(function () {
        var $forms = $('.elementor-form');
        if ($forms.length) {
            $forms.each(function () {
                bootScope($(this));
            });
            doneOnceAll();
        }
    });
})(jQuery, window);

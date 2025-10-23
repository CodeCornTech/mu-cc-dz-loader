// @ts-nocheck
// first.js
(function ($, window) {
    'use strict';
    window.CC_DZ = window.CC_DZ && typeof window.CC_DZ === 'object' ? window.CC_DZ : {};
    var DEBUG = !!(window.CC_DZ_OPTS && window.CC_DZ_OPTS.debug);

    function dbg() {
        if (!DEBUG) return;
        var a = [].slice.call(arguments);
        a.unshift('[CC-DZ]');
        try {
            console.log.apply(console, a);
        } catch (e) {}
    }
    window.CC_DZ.dbg = dbg;

    // helper pubblichi utili
    window.CC_DZ.bytes = function (n) {
        if (!n && n !== 0) return '';
        var u = ['B', 'KB', 'MB', 'GB'];
        var i = 0;
        while (n >= 1024 && i < u.length - 1) {
            n /= 1024;
            i++;
        }
        return n.toFixed(i ? 1 : 0) + ' ' + u[i];
    };

    dbg('first.js ready');
})(jQuery, window);

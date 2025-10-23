// @ts-nocheck
// core.js
(function ($, window) {
    'use strict';

    // SEMPRE crea l’oggetto globale in modo sicuro
    window.CC_DZ = window.CC_DZ && typeof window.CC_DZ === 'object' ? window.CC_DZ : {};
    var DEBUG = !!(window.CC_DZ_OPTS && window.CC_DZ_OPTS.debug);
    var dbg = window.CC_DZ.dbg && typeof window.CC_DZ.dbg === 'function' ? window.CC_DZ.dbg : function () {};
    dbg('core.js loaded');

    // ………………………………………  QUI la tua logica/utility (iconFor, makeThumb, sameFile, ecc)  ………………………………………

    function iconFor(name, type) {
        type = type || '';
        name = (name || '').toLowerCase();
        if (type.startsWith('image/')) return null;
        if (/\.pdf$/.test(name)) return '📄';
        if (/\.(zip|rar|7z|gz|bz2|xz)$/.test(name)) return '🗜️';
        if (/\.(xlsx?|csv)$/.test(name)) return '📊';
        if (/\.(pptx?)$/.test(name)) return '📽️';
        if (/\.(docx?|rtf|txt|md)$/.test(name)) return '📝';
        return '📎';
    }
    function makeThumb(file, cb) {
        if (!file || !file.type || !file.type.startsWith('image/')) return cb(null);
        var r = new FileReader();
        r.onload = function (e) {
            cb(e.target.result);
        };
        r.onerror = function () {
            cb(null);
        };
        r.readAsDataURL(file);
    }
    function sameFile(a, b) {
        return a && b && a.name === b.name && a.size === b.size && (a.lastModified === undefined || b.lastModified === undefined || a.lastModified === b.lastModified);
    }

    // API pubblica
    window.CC_DZ.applyDropzone = function ($input) {
        if ($input.data('cc-dz')) {
            dbg('skip init');
            return;
        }
        $input.data('cc-dz', true);

        var NS = '.ccdz';
        var accept = ($input.attr('accept') || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        var multiple = !!$input.prop('multiple');
        var cfgMax = parseInt($input.data('maxfiles'), 10);
        var maxFiles = isNaN(cfgMax) ? (multiple ? 5 : 1) : Math.max(1, cfgMax);
        var maxSize = Math.max(1, parseFloat($input.data('maxsize'), 10) || 25) * 1024 * 1024;

        // forza name[] quando multiple
        if (multiple) {
            var nm = $input.attr('name') || '';
            if (!/\[\]$/.test(nm)) $input.attr('name', nm + '[]');
        }

        // UI
        var $wrap = $('<div class="cc-dz" tabindex="0" role="button" aria-label="Carica file"></div>');
        var $hint = $('<div class="cc-dz-hint">Trascina qui i file o clicca per selezionare</div>');
        var $list = $('<div class="cc-dz-list" aria-live="polite"></div>');
        var $err = $('<div class="cc-dz-err" style="display:none"></div>');
        var $badge = $('<div class="cc-dz-debug"' + (DEBUG ? '' : ' style="display:none"') + '></div>');

        $input.addClass('cc-hidden').after($wrap);
        $wrap.css({ visibility: 'hidden' });
        requestAnimationFrame(function () {
            $wrap.css({ visibility: '' });
        });

        $wrap.append('<div class="cc-dz-title"><strong>Upload</strong></div>', $hint, $list, $err, $badge);

        // MODEL
        var queue = []; // Array<File>

        function updateBadge(extra) {
            if (!DEBUG) return;
            var nf = ($input[0].files || []).length;
            $badge.html('<strong>Q:</strong> ' + queue.length + ' <strong>F:</strong> ' + nf + (extra ? ' ' + extra : ''));
        }
        function dump(tag) {
            if (!DEBUG) return;
            var nf = $input[0].files || [];
            dbg(tag, { queue: queue.map((f) => f.name), native: Array.from(nf).map((f) => f.name) });
        }

        function clearNative() {
            try {
                var dt0 = new DataTransfer();
                $input[0].files = dt0.files;
            } catch (_) {
                $input.val('');
            }
            updateBadge('[clearNative]');
        }
        function syncNative() {
            var dt = new DataTransfer();
            queue.forEach((f) => dt.items.add(f));
            $input[0].files = dt.files;
            updateBadge('[syncNative]');
        }
        function acceptOk(file) {
            if (!accept.length) return true;
            return accept.some(function (rule) {
                if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule.toLowerCase());
                if (rule.endsWith('/*')) return file.type && file.type.startsWith(rule.slice(0, -1));
                return file.type === rule;
            });
        }
        function setError(msg) {
            $err.text(msg).show();
            clearTimeout($err.data('t'));
            $err.data(
                't',
                setTimeout(function () {
                    $err.fadeOut(200);
                }, 2000),
            );
        }

        function addFiles(files) {
            var added = 0;
            Array.from(files || []).forEach(function (file) {
                if (!multiple && queue.length >= 1) {
                    setError('Consenti un solo file');
                    return;
                }
                if (queue.length >= maxFiles) {
                    setError('Limite massimo: ' + maxFiles + ' file');
                    return;
                }
                if (file.size > maxSize) {
                    setError('"' + file.name + '" supera il limite');
                    return;
                }
                if (!acceptOk(file)) {
                    setError('Formato non consentito: ' + file.name);
                    return;
                }
                if (queue.some((f) => sameFile(f, file))) {
                    return;
                }
                queue.push(file);
                added++;
            });
            if (added > 0) {
                syncNative();
                renderList();
                $input.trigger('change');
            }
            dump('addFiles()');
        }

        function removeIndex(idx) {
            if (isNaN(idx) || idx < 0 || idx >= queue.length) return;
            queue.splice(idx, 1);
            if (queue.length === 0) clearNative();
            else syncNative();
            renderList();
            $input.trigger('input').trigger('change');
            dump('removeIndex()');
        }

        function renderList() {
            $list.empty();
            queue.forEach(function (file, idx) {
                var $it = $('<div class="cc-dz-item" />').attr('data-index', idx);
                var $rm = $('<button type="button" class="cc-dz-remove" aria-label="Rimuovi">✕</button>');
                var $nm = $('<div class="cc-dz-name"></div>').text(file.name);
                var $mt = $('<div class="cc-dz-meta"></div>').text(CC_DZ.bytes(file.size) + (file.type ? ' • ' + file.type : ''));
                var $thumb = $('<img class="cc-dz-thumb" alt="">');

                var emoji = iconFor(file.name, file.type);
                if (emoji) {
                    $thumb = $('<div class="cc-dz-thumb" aria-hidden="true" style="display:flex;align-items:center;justify-content:center;font-size:16px;">' + emoji + '</div>');
                } else {
                    makeThumb(file, function (url) {
                        if (url) $thumb.attr('src', url);
                    });
                }

                $it.append($thumb, $rm, $nm, $mt);
                $list.append($it);
            });
            updateBadge();
        }

        function resetSingle() {
            dump('resetSingle: BEFORE');
            $list.empty();
            $err.hide().text('');
            $badge.html('');
            clearNative();
            queue.length = 0;
            dump('resetSingle: AFTER');
        }

        // Picker open policy
        function isEmpty() {
            return queue.length === 0;
        }
        $wrap.off('click' + NS + ' keypress' + NS).on('click' + NS + ' keypress' + NS, function (e) {
            var isActivation = e.type === 'click' || (e.type === 'keypress' && (e.key === 'Enter' || e.key === ' '));
            if (!isActivation) return;

            if ($(e.target).closest('.cc-dz-remove').length) {
                updateBadge('[blocked rm]');
                return;
            }

            if (isEmpty() || !$(e.target).closest('.cc-dz-list, .cc-dz-item').length) {
                e.preventDefault();
                e.stopImmediatePropagation();
                $input.val(''); // per riselezionare stessi file
                $input.trigger('click');
            }
        });

        // remove button
        $list.on('mousedown' + NS, '.cc-dz-remove', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
        });
        $list.on('click' + NS, '.cc-dz-remove', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            var idx = parseInt($(this).closest('.cc-dz-item').attr('data-index'), 10);
            removeIndex(idx);
        });

        // change nativo
        $input.off('change' + NS).on('change' + NS, function () {
            if (!multiple) queue = [];
            var fl = this.files;
            if (fl && fl.length) addFiles(fl);
            updateBadge('[onChange]');
        });

        // DnD
        $wrap
            .on('drag dragstart dragend dragover dragenter dragleave drop', function (e) {
                e.preventDefault();
                e.stopPropagation();
            })
            .on('dragover dragenter', function () {
                $wrap.addClass('is-dragover');
            })
            .on('dragleave dragend drop', function () {
                $wrap.removeClass('is-dragover');
            })
            .on('drop', function (e) {
                var files = e.originalEvent && e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.files;
                if (files && files.length) {
                    if (!multiple) {
                        queue = [];
                    }
                    addFiles(files);
                }
            });

        // Reset post-submit (tutti i canali noti di Elementor)
        var formEl = $input.closest('form').get(0);
        if (formEl) {
            $(document).on('elementor-pro/forms/new', function (_, inst) {
                if (inst && inst.$form && inst.$form.get(0) === formEl) {
                    inst.$form.on('form:submit:success', function () {
                        resetSingle();
                    });
                }
            });
            $(document).on('submit_success', function (e, response, $form) {
                if ($form && $form.get && $form.get(0) === formEl) resetSingle();
            });
            // fallback: dopo XHR elementor
            $(document).ajaxComplete(function (_e, _xhr, settings) {
                var url = (settings && settings.url) || '';
                var data = (settings && settings.data) || '';
                if (/admin-ajax\.php/.test(url) && /elementor_pro_forms_send_form/.test(data || '')) {
                    setTimeout(resetSingle, 150);
                    setTimeout(resetSingle, 800);
                }
            });
            formEl.addEventListener(
                'submit',
                function () {
                    setTimeout(resetSingle, 600);
                },
                true,
            );
        }

        // primo render e badge
        renderList();
        syncNative();
        dbg('core.js: applyDropzone exported =', typeof window.CC_DZ.applyDropzone);
    };
})(jQuery, window);

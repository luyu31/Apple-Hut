/* 首启隐私同意 + 隐私政策/用户协议入口 */
(function () {
    'use strict';

    var CONSENT_KEY = 'applehut_consent_v1';
    var agreed = false;
    try { agreed = localStorage.getItem(CONSENT_KEY) === 'yes'; } catch (e) {}

    var CSS = [
        '.ph-gate{position:fixed;inset:0;z-index:2147483647;background:rgba(40,32,28,.55);',
        'display:flex;align-items:center;justify-content:center;padding:20px;',
        'font-family:-apple-system,"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;}',
        '.ph-card{width:100%;max-width:420px;max-height:86vh;overflow:auto;background:#faf7f2;',
        'border-radius:20px;padding:22px 20px;color:#2e2a26;box-shadow:0 18px 48px rgba(0,0,0,.28);}',
        '.ph-title{font-size:18px;font-weight:700;margin:0 0 4px;display:flex;align-items:center;gap:8px;}',
        '.ph-title img{width:28px;height:28px;border-radius:8px;}',
        '.ph-sub{font-size:12px;color:#8a8178;margin-bottom:14px;}',
        '.ph-text{font-size:14px;line-height:1.7;color:#4a423c;}',
        '.ph-text b{color:#b5523f;}',
        '.ph-links{display:flex;gap:16px;margin:12px 0 18px;font-size:14px;}',
        '.ph-links a{color:#b5523f;text-decoration:underline;cursor:pointer;}',
        '.ph-btns{display:flex;gap:10px;}',
        '.ph-btn{flex:1;border:0;border-radius:12px;padding:12px 10px;font-size:15px;font-weight:600;cursor:pointer;}',
        '.ph-btn-ok{background:#e1554d;color:#fff;}',
        '.ph-btn-no{background:#efe5d6;color:#6b5f55;}',
        '.ph-block{font-size:13px;color:#8a8178;margin-top:14px;line-height:1.6;}',
        '.ph-viewer{position:fixed;inset:0;z-index:2147483647;background:#faf7f2;display:flex;flex-direction:column;}',
        '.ph-viewer-bar{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;',
        'border-bottom:1px solid #eadfce;background:#faf7f2;font-size:14px;color:#2e2a26;}',
        '.ph-viewer-bar button{border:0;background:#efe5d6;color:#5b5049;border-radius:10px;padding:8px 14px;font-size:14px;}',
        '.ph-viewer iframe{flex:1;border:0;width:100%;background:#faf7f2;}'
    ].join('');

    function injectCss() {
        if (document.getElementById('ph-gate-css')) return;
        var s = document.createElement('style');
        s.id = 'ph-gate-css';
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }

    function openDoc(url) {
        injectCss();
        var old = document.getElementById('ph-viewer');
        if (old) old.remove();
        var viewer = document.createElement('div');
        viewer.className = 'ph-viewer';
        viewer.id = 'ph-viewer';
        viewer.innerHTML =
            '<div class="ph-viewer-bar"><span>' + (url === 'privacy.html' ? '隐私政策' : '用户协议') +
            '</span><button type="button">关闭</button></div>' +
            '<iframe src="' + url + '" referrerpolicy="no-referrer"></iframe>';
        viewer.querySelector('button').addEventListener('click', function () { viewer.remove(); });
        document.body.appendChild(viewer);
    }

    function showGate() {
        injectCss();
        if (document.getElementById('ph-gate')) return;
        var gate = document.createElement('div');
        gate.className = 'ph-gate';
        gate.id = 'ph-gate';
        gate.innerHTML =
            '<div class="ph-card">' +
            '  <div class="ph-title"><img src="icon-192.png" alt=""><span>欢迎使用 Apple Hut</span></div>' +
            '  <div class="ph-sub">使用前请阅读并同意以下条款</div>' +
            '  <div class="ph-text">' +
            '    本应用为<b>本地运行</b>的虚构角色聊天工具：聊天记录、设置与素材默认仅保存在你的设备中，' +
            '我们不会主动上传或收集。使用到的权限仅为<b>网络、网络状态、通知与震动</b>。' +
            '若你主动配置云存储或语音合成服务，相关数据才会发送到你选择的服务方。' +
            '  </div>' +
            '  <div class="ph-links">' +
            '    <a data-doc="privacy.html">《隐私政策》</a>' +
            '    <a data-doc="terms.html">《用户协议》</a>' +
            '  </div>' +
            '  <div class="ph-btns">' +
            '    <button type="button" class="ph-btn ph-btn-no">不同意</button>' +
            '    <button type="button" class="ph-btn ph-btn-ok">同意并继续</button>' +
            '  </div>' +
            '  <div class="ph-block" id="ph-block" style="display:none">' +
            '    未同意将无法使用本应用。你可以重新查看条款并选择同意。' +
            '  </div>' +
            '</div>';
        document.body.appendChild(gate);

        gate.querySelectorAll('[data-doc]').forEach(function (a) {
            a.addEventListener('click', function () { openDoc(a.getAttribute('data-doc')); });
        });
        gate.querySelector('.ph-btn-ok').addEventListener('click', function () {
            try { localStorage.setItem(CONSENT_KEY, 'yes'); } catch (e) {}
            gate.remove();
        });
        gate.querySelector('.ph-btn-no').addEventListener('click', function () {
            document.getElementById('ph-block').style.display = 'block';
        });
    }

    function addSettingsEntry() {
        var grid = document.querySelector('#settings-modal .settings-grid');
        if (!grid || grid.querySelector('#privacy-settings')) return;
        var card = document.createElement('div');
        card.className = 'settings-card';
        card.id = 'privacy-settings';
        card.innerHTML = '<i class="fas fa-shield-alt"></i><span>隐私与协议</span>';
        card.addEventListener('click', function () { openDoc('privacy.html'); });
        grid.appendChild(card);
    }

    function init() {
        if (!agreed) showGate();
        addSettingsEntry();
        // 设置弹窗是动态打开的，补一次入口
        document.addEventListener('click', function (e) {
            if (e.target && e.target.closest && e.target.closest('#settings-btn')) {
                setTimeout(addSettingsEntry, 60);
            }
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

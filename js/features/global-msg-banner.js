/**
 * global-msg-banner.js — 全局新消息推送横条（微信风格）
 *
 * 需求：梦角在主聊天发新消息时，只要用户不在下面这几种情况里，就在当前页面顶部弹一条横条：
 *   1）用户当前就在主聊天本身（消息本来就实时显示在眼前，不需要再弹）
 * 反过来，下面这些"盖在主聊天上面的弹窗"要弹（弹窗盖住了聊天，用户看不到新消息）：
 *   设置弹窗、信箱弹窗……等等，走的是"当前有没有弹窗盖在上面"这个通用判断。
 * 点一下横条：把当前挡着的弹窗都关掉，跳回主聊天并滚动到最新消息。
 *
 * 挂载方式：走 core.js 里已有的 window._registerPartnerMessageListener 钩子——
 * 这个钩子只对"梦角发的普通文字消息"触发（message.type === 'normal'），
 * 图片/语音等类型的梦角消息目前不会经过这个钩子，横条也就不会为那些类型弹出，
 * 这是钩子本身的既有范围，不在这个文件里改动。
 */
(function () {
    'use strict';

    var _banner = null;
    var _hideTimer = null;

    function _ensureBanner() {
        if (_banner) return _banner;
        _banner = document.createElement('div');
        _banner.className = 'gmb-banner';
        _banner.id = 'gmb-banner';
        _banner.innerHTML =
            '<div class="gmb-avatar" id="gmb-avatar"></div>' +
            '<div class="gmb-body">' +
                '<div class="gmb-name" id="gmb-name"></div>' +
                '<div class="gmb-text" id="gmb-text"></div>' +
            '</div>';
        document.body.appendChild(_banner);
        _banner.addEventListener('click', _onTap);
        return _banner;
    }

    // 弹窗大多用 .modal 这个通用类（设置、信箱……），显示时 display 不是 none。
    function _isAnyModalOpen() {
        var modals = document.querySelectorAll('.modal');
        for (var i = 0; i < modals.length; i++) {
            if (getComputedStyle(modals[i]).display !== 'none') return true;
        }
        return false;
    }

    // 判断要不要弹：有弹窗盖在上面就弹（盖住了聊天，用户看不到新消息）；
    // 主聊天本身可见、什么弹窗都没开时不弹。
    function _shouldShow() {
        return _isAnyModalOpen();
    }

    // 用户现在是不是"不在主聊天页"：页面在后台、或有弹窗盖着。
    // 搞怪动画靠它判断要不要跳过（动画是飞到聊天头像上的，不在聊天页根本看不到）
    function _isAwayFromChat() {
        if (document.hidden) return true;
        return _shouldShow();
    }

    function _previewText(msg) {
        var t = (msg && msg.text) ? String(msg.text).replace(/\n/g, ' ').trim() : '';
        if (!t) return (msg && msg.image) ? '[图片]' : '';
        return t.length > 24 ? t.slice(0, 24) + '…' : t;
    }

    function _hide() {
        if (_banner) _banner.classList.remove('gmb-show');
    }

    // 点一下横条：不管当前是弹窗、还是两者都有，一律强制关掉，跳回主聊天。
    // 弹窗直接关，不走各自的取消/保存逻辑——用户点的是"跳转"，
    // 等于主动放弃当前正在填的东西，跟点了弹窗外面把它关掉是一个意思。
    function _closeAllOverlays() {
        document.querySelectorAll('.modal').forEach(function (m) {
            if (getComputedStyle(m).display !== 'none') {
                if (typeof window.hideModal === 'function') window.hideModal(m);
                else m.style.display = 'none';
            }
        });
    }

    // 当前这条横条要跳转到的消息 id（搞怪/表情反应/拍一拍会带，普通消息不带，回到底部）
    var _targetMsgId = null;

    function _onTap() {
        clearTimeout(_hideTimer);
        _hide();
        var targetId = _targetMsgId;
        _closeAllOverlays();
        // 关闭弹窗后稍等片刻再跳转，避免动画进行中跳转看起来很突兀
        setTimeout(function () {
            if (targetId != null && typeof window._jumpToMessage === 'function') {
                if (window._jumpToMessage(targetId)) return;
            }
            if (typeof window._backToLatestMessages === 'function') window._backToLatestMessages();
        }, 400);
    }

    function _show(msg, targetId) {
        _targetMsgId = (targetId === undefined) ? null : targetId;
        var banner = _ensureBanner();
        var partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';
        banner.querySelector('#gmb-name').textContent = partnerName;
        banner.querySelector('#gmb-text').textContent = _previewText(msg);

        var avatarEl = banner.querySelector('#gmb-avatar');
        var srcImg = document.querySelector('#partner-avatar img');
        avatarEl.innerHTML = (srcImg && srcImg.src)
            ? '<img src="' + srcImg.src + '">'
            : '<i class="fas fa-user"></i>';

        clearTimeout(_hideTimer);
        // 先摘掉再加回去，保证连续收到好几条消息时，每次都能重新触发一次入场动画，不会因为已经是
        // active 状态而"静默换内容"，用户很容易漏看
        banner.classList.remove('gmb-show');
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                banner.classList.add('gmb-show');
            });
        });
        _hideTimer = setTimeout(_hide, 4000);
    }

    // 梦角做了不是"普通文字消息"的事（搞怪、加表情、拍一拍）时统一走这里：
    //   页面在后台/锁屏 → 系统通知（跟梦角发消息、视频通话同一套开关）
    //   页面在前台但有弹窗 → 应用内横条，点一下跳到对应的那条消息
    //   就在主聊天页 → 不弹
    window._notifyPartnerEvent = function (text, msgId) {
        try {
            if (document.hidden) {
                if (typeof window._sendPartnerNotification === 'function') {
                    window._sendPartnerNotification((typeof settings !== 'undefined' && settings.partnerName) || '对方', text);
                }
                return;
            }
            if (!_shouldShow()) return;
            _show({ text: text }, msgId);
        } catch (e) { console.warn('[global-msg-banner] _notifyPartnerEvent 出错', e); }
    };
    window._isAwayFromChat = _isAwayFromChat;

    if (typeof window._registerPartnerMessageListener === 'function') {
        window._registerPartnerMessageListener(function (msg) {
            if (!msg || msg.sender === 'user') return;
            if (!_shouldShow()) return;
            _show(msg);
        });
    } else {
        console.warn('[global-msg-banner] window._registerPartnerMessageListener 不存在，新消息横条功能不会生效（core.js 是否正常加载？）');
    }
})();

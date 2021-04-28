// 单对象模式，防止污染全局变量

// 建立长链接
let port = chrome.runtime.connect({
    name: "popup-name"
});
// 使用postMsg向background发送信息
port.postMessage('');

var popup = {
    // 地理位置文本
    location: "",
    // 存放dom的对象
    dom: {
        // 输入框，用来输入地名
        input: document.getElementsByClassName("location")[0],
        // 渲染区域，主要的展示区域
        content: document.getElementsByClassName("content")[0]
    },

    // 初始化函数，便于一些函数的执行
    init() {
        this.bindEvent();
    },

    // 绑定事件的函数
    bindEvent() {
        this.dom.input.onkeydown = (e) => {
            let locationText = this.location = e.target.value;
            let locationReg = /\D/g;
            if (e.key === "Enter") {
                if (locationText.match(locationReg)) {
                    // 先获取，看看有没有缓存
                    chrome.storage.sync.get("locationText", function(item) {
                        if (item.locationText !== locationText) {
                            // 改变地址时，先清除一遍缓存
                            chrome.storage.sync.clear();
                            // 将输入的城市文本缓存起来
                            chrome.storage.sync.set({ locationText }, function() {
                                port.postMessage("");
                            });
                            e.target.value = "";
                        }
                    })
                } else {
                    e.target.value = "";
                }
            }
        }
    }
}
popup.init();
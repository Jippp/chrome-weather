// 后台常驻的js

// 获取到的天气数据
var response = {
    icon: "999", //图标信息
    weatherText: "", //天气文本描述
    temp: "-", // 温度
    hourly: [],//记录实时预报的数据
    daily: [] //未来三天天气预报的数据
};

// 存储DOM的对象，从popup获取到的DOM
var domList = {};

// 标志变量，用来标记是否需要渲染now-day区域、即是否运行renderNowDay函数
var idFlag = false;

// 使用长连接 - 监听 popup 传递来的消息
chrome.extension.onConnect.addListener(port => {
    // 点击icon时触发一次，更改地点时再触发一次
    port.onMessage.addListener(msg => {
        init();
    })
})

// 对图标的设置
chrome.browserAction.setTitle({ title: "j-weather" });
chrome.browserAction.setBadgeBackgroundColor({ color: 'rgb(80,170,254)' });

// 打开浏览器就会执行
// 第一次调用，为了更改icon的，不渲染now-day区、即不执行renderNowDay函数
chrome.storage.sync.get("locationId", function(item) {
    // 不执行renderNowDay函数
    idFlag = true;
    ajax("GET", 'https://devapi.heweather.net/v7/weather/now?key=49cf50a25c864f39b1d5e15e44dfc161&location=' + item.locationId, handleNowResponse);
});



/**
 * background的初始化函数
 */
function init() {
    getAll();
    getStorage();
}

/**
 * 获取所有 tab，接收popup的数据。获取popup页面的dom元素
 */
function getAll() {
    const views = chrome.extension.getViews({
        type: 'popup'
    })
    for (let o of views) {
        domList.nowDay = o.document.getElementById("now-day");
        domList.city = o.document.getElementsByClassName("city")[0];
        domList.weather = o.document.getElementsByClassName("weather")[0];
        domList.tem = o.document.getElementsByClassName("tem")[0];
        // 每小时的天气wrap
        domList.hourlyForecast = o.document.getElementsByClassName("now-day-forecast")[0]
        // 未来三天的天气wrap
        domList.daysWrap = o.document.getElementsByClassName("days-wrap")[0];
        domList.wrapDom = o.document.getElementsByClassName("wrap")[0];
    }
}

/**
 * 获取storage的函数，获取到popup输入的城市文本信息缓存，并发送ajax请求获取城市id
 */
function getStorage() {
    // 说明已经更改了城市，需要重新设置城市id
    idFlag = false;
    chrome.storage.sync.get("locationText", function(item) {
        response.locationText = item.locationText;
        ajax("GET", "https://geoapi.heweather.net/v2/city/lookup?key=49cf50a25c864f39b1d5e15e44dfc161&location=" + item.locationText, getLocation);
    })
}


/**
 * ajax函数
 * @param {*} method 
 * @param {*} url 
 * @param {*} callback 
 * @param {*} dom 
 */
function ajax(method, url, callback, dom) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.send();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                callback(JSON.parse(xhr.responseText), dom);
            } else {
                console.error(xhr.status + ":" + xhr.statusText);
            }
        }
    }
}


/**
 * 渲染icon样式的函数
 * @param {*} data 
 */
function renderIcon(data) {
    // 设置颜色
    chrome.browserAction.setBadgeBackgroundColor({
        color: `${data.temp > 40 ? 'red' : data.temp > 37 ? 'orange' : data.temp > 35 ? 'yellow' : data.temp > 0 ? 'skyblue' : 'blue' }`
    })
    chrome.browserAction.setBadgeText({ text: `${data.temp}°C` });
    chrome.browserAction.setIcon({ path: `image/${data.icon}.png` });
    chrome.browserAction.setTitle({ title: data.weatherText });
}

function renderBg(data, dom) {
    dom.style.backgroundImage = `url("../../image/bgImage/${data.icon}.png")`;
    dom.className = dom.className + " active-render";
}

/**
 * 渲染now-day区域的函数，即当前的渲染
 * @param {*} data 渲染数据
 * @param {*} dom 渲染区域
 */
function renderNowDay(data, dom) {
    dom.city.innerHTML = data.locationText;
    dom.weather.innerHTML = data.date + "" + data.weatherText;
    dom.tem.innerHTML = data.temp + "°C";
}

/**
 * 渲染now-day-forecast区域的函数，即未来几个小时的渲染
 * @param {*} data 
 * @param {*} dom 
 */
function renderHourlyForecast(data, dom) {
    let htmlStr = ''
    data.forEach(item => {
        htmlStr += `
            <div class='hourly-item'>
                <div class="hourly-time">${item.time}时</div>
                <img class="hourly-icon" src='./../../image/color/${item.icon}.png'></img>
                <div class="hourly-temp">${item.temp}°</div>
            </div>
        `
    })
    dom.innerHTML = htmlStr
}

/**
 * 渲染days-forecast区域的函数，即未来三天的渲染
 * @param {*} data 
 * @param {*} dom 
 */
function renderForecast(data, dom) {
    let forecastStr = ''
    data.forEach(function(item) {
        forecastStr += `
                <li class="forecast-item clearfix">
                    <span class="title left">${item.date}</span>
                    <div class='right clearfix'>
                        <div class="forecast-tem left">${item.minTemp} ~ ${item.maxTemp}°C</div>
                        <img src="../../image/${item.weatherText}.png" class="forecast-weather left"></img>
                    </div>
                </li>
        `
    })
    dom.innerHTML = forecastStr
}


/**
 * 处理实时的天气预报获取到的数据
 * @param {*} data 
 */
function handleNowResponse(data) {
    let dateReg = /\d{2}\-\d{2}(?=\T)/g;
    if (data.now) {
        response.icon = data.now.icon;
        response.date = data.now.obsTime.match(dateReg);
        response.weatherText = data.now.text;
        response.temp = data.now.temp;
        renderIcon(response);
        // 可以判断一下
        if (!idFlag) {
            renderNowDay(response, domList);
            renderBg(response, domList.wrapDom);
        }
    } else {
        response.errorText = "请求失败";
    }
}

/**
 * 处理逐时的天气预报得到的数据
 * @param {*} data 
 */
function handleHoursResponse(data) {
    response.hourly = []
    if (data.hourly) {
        var timeReg = /(\d{2})(?=:)/g;
        var timeArr = data.hourly.splice(0, 5);
        timeArr.forEach(function(item, index) {
            response.hourly[index] = {
                time: item.fxTime.match(timeReg)[0],
                temp: item.temp,
                icon: item.icon,
            }
        })
        renderHourlyForecast(response.hourly, domList.hourlyForecast)
    } else {
        response.hourly.errorText = "请求失败";
    }
}

/**
 * 处理未来三天天气数据的函数
 * @param {*} data 
 */
function handleForecastResponse(data) {
    response.daily = []
    let dateReg = /\d{2}\-\d{2}$/g;
    data.daily.forEach(function(item, index) {
        response.daily[index] = {
            date: item.fxDate.match(dateReg),
            maxTemp: item.tempMax,
            minTemp: item.tempMin,
            weatherText: item.iconDay
        }
    })
    renderForecast(response.daily, domList.daysWrap);
}

/**
 * 获取城市id的函数，并发送ajax请求获取天气数据
 * @param {*} data 
 */
function getLocation(data) {
    let locId = data.location[0].id;
    // 可以避免多次发送请求城市id的ajax请求
    chrome.storage.sync.set({ locationId: locId });

    if (!locId) {
        response.errorText = "未搜索到该城市信息";
    } else {
        // 返回实时的天气情况
        ajax("GET", 'https://devapi.heweather.net/v7/weather/now?key=49cf50a25c864f39b1d5e15e44dfc161&location=' + locId, handleNowResponse);
        // 返回逐时的天气情况
        ajax("GET", "https://devapi.heweather.net/v7/weather/24h?key=49cf50a25c864f39b1d5e15e44dfc161&location=" + locId, handleHoursResponse);
        // 返回未来三天的天气情况
        ajax("GET", "https://devapi.heweather.net/v7/weather/3d?key=49cf50a25c864f39b1d5e15e44dfc161&location=" + locId, handleForecastResponse);
    }
}
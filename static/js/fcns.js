
// Thanks to https://www.w3schools.com/js/js_cookies.asp :)
function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/;samesite=Strict";
}
function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}
function resetCookie(cname) {
  document.cookie = cname + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}
function makeid(length) {
   var result           = '';
   // removed o, O and 0 to avoid any potential confusion
   var characters       = 'ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijklmnpqrstuvwxyz123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

function levelup(redirect_to = 'play.htm') {
  let current_level = parseInt(getCookie("heaplevel"));
  setCookie("heaplevel", current_level+1, 365);
  window.location.href=redirect_to;
}
function initCookies() {
  let hl = getCookie('heaplevel');
  if (hl=="" || parseInt(hl) < 0 || parseInt(hl) > 7)
    setCookie('heaplevel', 0, 365);
  let id = getCookie('uid');
  if (id.length!=10) {
    setCookie('uid', makeid(10), 365);
  } else {
  }
}

function logIt(message) {
    var stack = new Error().stack,
        caller = stack.split('\n')[1].trim();
    console.log(caller + ":" + message);
}

function checkScreenSize() {
  let overlay = document.getElementById('screensize-overlay');
  let width = window.innerWidth;
  let height = window.innerHeight;
  if (!overlay && height*1.3 > width && width < 900) {
    overlay = document.createElement("div");
    overlay.id = 'screensize-overlay';
    overlay.innerHTML = "Please turn your screen to landscape mode. ";
    document.body.appendChild(overlay);
  } else
  if (!!overlay && height*1.3 < width) {
    overlay.remove();
  }
  return;
}

function addWindowResizeListener(game) {
  window.addEventListener('resize', function(event) {
    checkScreenSize();
    game.changed(true);
  })

}

// thx https://stackoverflow.com/questions/5448545/how-to-retrieve-get-parameters-from-javascript
function findGetParameter(parameterName) {
    var result = null,
        tmp = [];
    location.search
        .substr(1)
        .split("&")
        .forEach(function (item) {
          tmp = item.split("=");
          if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    return result;
}

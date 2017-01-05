(function() {
  'use strict';

  // DOM
  var display = document.querySelector('.user-display');
  // var displayHeight = display.clientHeight - 150;
  // var displayWidth = display.clientWidth - 150;


  // socket.io
  var socket = io();
  socket.on('connect', function() {
    console.log('Socket connected');
  });
  socket.on('user', function(data) {
    console.log(data);
    if(!data) return;
    if(data.error){
      console.log('Error: ' + data.error);
    } else {
      displayUser(data);
    }
  });


  function displayUser(data) {
    var name = (data.user_name) ? data.user_name : '...'+data.msisdn.slice(-4);
    var avatar = document.createElement('div');
    avatar.style.backgroundImage = (data.user_img) ? 'url('+data.user_img+')': 'url(images/sms-icon.png)';
    avatar.className = (data.user_img) ? 'avatar' : '';
    avatar.dataset.username = name;
    avatar.dataset.text = (data.text.length > 141) ? data.text.substring(0, 140) + '...' : data.text;
    //avatar.style.left = ~~(Math.random() * displayWidth/20)*20 + 'px';
    //avatar.style.top = ~~(Math.random() * displayHeight/20)*20 + 'px';
    display.appendChild(avatar);
    display.scrollTop = display.scrollHeight;

    avatar.classList.add('poof');
    avatar.addEventListener('animationend', function(){
      display.removeChild(avatar);
    }, false);
  }

})();

(function() {
  'use strict';

  // DOM
  var display = document.querySelector('.user-display');
  var displayHeight = display.clientHeight - 150;
  var displayWidth = display.clientWidth - 150;

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
    var name = (data.username) ? data.username : '...'+data.msisdn.slice(-4);
    var avatar = document.createElement('div');
    avatar.style.backgroundImage = (data.avatar) ? 'url('+data.avatar+')': 'url(images/sms-icon.png)';
    avatar.className = (data.avatar) ? 'avatar' : '';
    avatar.title = name;
    avatar.style.left = ~~(Math.random() * displayWidth/20)*20 + 'px';
    avatar.style.top = ~~(Math.random() * displayHeight/20)*20 + 'px';
    display.appendChild(avatar);

    avatar.classList.add('poof');
    avatar.addEventListener('animationend', function(){
      display.removeChild(avatar);
    }, false);
  }

})();

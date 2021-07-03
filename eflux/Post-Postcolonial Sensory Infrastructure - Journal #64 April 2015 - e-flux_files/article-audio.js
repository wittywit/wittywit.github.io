/*
  e-flux
  Copyright (C) 2015 by Systemantics, Bureau for Informatics

  Systemantics GmbH
  Bleichstr. 11
  41747 Viersen
  GERMANY

  Web:    www.systemantics.net
  Email:  hello@systemantics.net

  Permission granted to use the files associated with this
  website only on your webserver.

  Changes to these files are PROHIBITED due to license restrictions.
*/

$(function () {
  // Article audio player

  function articleAudioTogglePlayPause(aud) {
    if (aud.paused) {
      aud.play();
    } else {
      aud.pause();
    }
  }

  function articleAudioSeek(aud) {
    var player = $(aud).closest(".article-player");

    var seekto =
      aud.duration *
      (player.find(".article-player__seekslider")[0].value / 100);
    aud.currentTime = seekto;
  }

  function formatTime(time, el) {
    var time = time,
      timeNegative = false,
      timeArray = [];

    if (!$.isNumeric(Math.ceil(time))) {
      return false;
    }

    if (typeof el === "undefined") {
      el = false;
    }

    h = Math.floor(Math.abs(time) / 3600);
    if (h != 0 || el.data("timeformat") == "hh:mm:ss") {
      h = h >= 10 ? h : "0" + h;

      timeArray.push(h.toString());
      // setTimeformat(el, 'hh:mm:ss');
    }

    m = Math.floor(Math.abs(time) / 60) % 60;
    m = m >= 10 ? m : "0" + m;

    timeArray.push(m.toString());
    // setTimeformat(el, 'mm:ss');

    s = Math.floor(Math.abs(time) % 60);
    s = s >= 10 ? s : "0" + s;
    timeArray.push(s.toString());

    var t = timeArray.join(":");

    if (time < 0) {
      //negative time
      time = Math.abs(time);
      timeNegative = true;

      t = "-" + t;
    }

    return t;
  }

  function articleAudioSeekTimeUpdate(aud) {
    var player = $(aud).closest(".article-player");

    var nt = aud.currentTime * (100 / aud.duration);
    player.find(".article-player__seekslider")[0].value = nt;
    var curmins = Math.floor(aud.currentTime / 60);
    var cursecs = Math.floor(aud.currentTime - curmins * 60);
    if (cursecs < 10) {
      cursecs = "0" + cursecs;
    }
    if (curmins < 10) {
      curmins = "0" + curmins;
    }
    player.find(".article-player__timecode").text(curmins + ":" + cursecs);
  }

	$(document).on('click', '.js-article-audio-playpause', function () {
		var item = $(this).closest('.article-player'),
			player = item.find('.article-player__audio');

		if (item.hasClass('article-player--initialized')) {
				if (player[0].paused) {
					setTimeout(() => {
						player[0].play();
					}, 0);
				} else {
					setTimeout(() => {
						player[0].pause();
					}, 0);
				}
		} else if (item.hasClass('article-player--initializing')) {
			// Ignore if initializing
			return;
		} else {
			// Initialize player
			item.find('input,button').prop('disabled', true);
			if (item.find('.article-player__seekslider').length) {
				item.find('.article-player__seekslider')[0].addEventListener('input', function() {
					articleAudioSeek(player[0]);
				}, false);
				player[0].addEventListener('timeupdate', function () {
					articleAudioSeekTimeUpdate(player[0]);
				}, false);
			}
			const tu = function () {
				if (player[0].currentTime > 30) {
					if (typeof ga !== 'undefined') {
						ga('send', 'event', 'Announcement audio', 'duration', document.title.split(' - ').shift(), 30);
					}
					player[0].removeEventListener('timeupdate', tu);
				}
			};
			player[0].addEventListener('timeupdate', tu, false);
			player[0].addEventListener('play', function () {
				item.addClass('article-player--is-playing');
				if (typeof ga !== 'undefined') {
					ga('send', 'event', 'Announcement audio', 'play', document.title.split(' - ').shift());
				}
			}, false);
			player[0].addEventListener('pause', function () {
				item.removeClass('article-player--is-playing');
			}, false);
			player[0].addEventListener('canplay', function () {
				if (item.hasClass('article-player--initializing')) {
					item
						.removeClass('article-player--initializing')
						.addClass('article-player--initialized');
					item.find('input,button').prop('disabled', false);
					player[0].play();
				}
			}, false);
			player[0].addEventListener('loadedmetadata', function () {
				var duration = player[0].duration;

				item.find('.article-player__duration').text(formatTime(duration, item));
			});

			player.attr('src' , player.find('source').data('src'));
			player[0].load();

			item.addClass('article-player--initializing');
		}
	});

});

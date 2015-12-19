/* global annyang */
(function () {

  var strip = function (str) {
    return (str || '').replace(/\s+/g, ' ').trim();
  };

  /**
   * Wraps `querySelector` à la jQuery's `$`.
   *
   * @param {String|Element} sel CSS selector to match an element.
   * @param {Element=} parent Parent from which to query.
   * @returns {Element} Element matched by selector.
   */
  var $ = function (sel, parent) {
    var el = sel;
    if (sel && typeof sel === 'string') {
      el = (parent || document).querySelector(sel);
    }
    return el;
  };

  /**
   * Wraps `querySelectorAll` à la jQuery's `$`.
   *
   * @param {String|Element} sel CSS selector to match elements.
   * @param {Element=} parent Parent from which to query.
   * @returns {Array} Array of elements matched by selector.
   */
  var $$ = function (sel, parent) {
    if (Array.isArray(sel)) { return sel; }
    var els = sel;
    if (sel && typeof sel === 'string') {
      els = (parent || document).querySelectorAll(sel);
    }
    return toArray(els);
  };

  /**
   * Turns an array-like object into an array.
   *
   * @param {String|Element} obj CSS selector to match elements.
   * @param {Array|NamedNodeMap|NodeList|HTMLCollection} arr An array-like object.
   * @returns {Array} Array of elements matched by selector.
   */
  var toArray = function (obj) {
    if (Array.isArray(obj)) { return obj; }
    if (typeof obj === 'object' && typeof obj.length === 'number') {
      return Array.prototype.slice.call(obj);
    }
    return [obj];
  };

  var body = document.body;

  // EXAMPLES.

  // To customise the base URL for the <iframe>'d examples, do this in the Console:
  //
  //   localStorage.examples_base_url = 'http://localhost:9000/examples/'
  //
  // To revert back to normal:
  //
  //   delete localStorage.examples_base_url
  //
  // And be sure to refresh the page :)
  var customExamplesBaseUrl;
  try {
    customExamplesBaseUrl = window.localStorage.examples_base_url;
  } catch (e) {
  }
  var isOnline = navigator.onLine;
  if (!isOnline) {
    console.warn('You appear to be offline. ' +
      'You can point the examples at your local server though:\n' +
      "localStorage.examples_base_url = 'http://localhost:9000/examples/'");
  }
  if (customExamplesBaseUrl) {
    // When you're on the airplane and Gogo Inflight Internet or Bongo Wireless
    // have got you down, you can load the examples from your local `aframe`
    // dev server, for example.
    $$('iframe.example__iframe').forEach(function (iframe) {
      var iframePath = iframe.getAttribute('data-path');
      if (iframePath.indexOf('//') !== -1) { return; }  // Ignore external URLs.
      iframe.setAttribute('src', customExamplesBaseUrl + iframePath);
    });
  }

  // Trigger `:active` styles when we "click" on examples, previous/next links.
  var SHOW_ACTIVE_STYLES_ON_CLICK = true;

  function clickEl (el) {
    if (!el) { return; }
    if (SHOW_ACTIVE_STYLES_ON_CLICK && el.classList) { el.classList.add('click'); }
    el.click();
  }

  function getCurrentNavLink () {
    return document.querySelector('.examples-subnav .subnav-link.current');
  }

  function getNavLinks () {
    return document.querySelectorAll('.examples-subnav .subnav-link');
  }

  var navLinks = getNavLinks();
  if (body.getAttribute('data-page-layout') === 'docs') {
    var guideLinkLeft = $('.guide-link-left');
    var guideLinkRight = $('.guide-link-right');

    body.addEventListener('keyup', function (e) {
      if (document.activeElement !== body) { return; }

      var left = e.keyCode === 37;
      if (left) {
        if (guideLinkLeft) { clickEl(guideLinkLeft); }
        return;
      }

      var right = e.keyCode === 39;
      if (right) {
        if (guideLinkRight) { clickEl(guideLinkRight); }
        return;
      }
    });
  }


  var navLinks = getNavLinks();
  if (navLinks.length) {
    body.addEventListener('keyup', function (e) {
      if (document.activeElement !== body) { return; }

      var left = e.keyCode === 37;
      var right = e.keyCode === 39;
      // var up = e.keyCode === 38;
      // var down = e.keyCode === 40;

      if (left) { navToExample('back'); }
      if (right) { navToExample('forward'); }
    });
  }

  function navToExample (dir) {
    navLinks = getNavLinks();
    if (!navLinks) { return; }

    var currentLink = getCurrentNavLink();
    if (!currentLink) {
      window.location.href = 'examples/';
      return;
    }

    var destIdx;
    var clicked = false;

    if (dir === 'back') {
      destIdx = currentLink.closest('[data-idx]').getAttribute('data-previous-idx');
      if ('examplePrev' in window) {
        clickEl(examplePrev);
        clicked = true;
      }
    }

    if (dir === 'forward') {
      destIdx = currentLink.closest('[data-idx]').getAttribute('data-next-idx');
      if ('exampleNext' in window) {
        clickEl(exampleNext);
        clicked = true;
      }
    }

    if (destIdx) {
      currentLink.classList.remove('current');
    }

    var destLink = navLinks[destIdx];
    if (destLink) {
      clickEl(destLink);
      if (!clicked) {
        destLink.click();
      }
    }
  }

  function fetchJSON (url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
      try {
        cb(JSON.parse(xhr.responseText));
      } catch (e) {
        cb({});
      }
    };
    xhr.open('get', url);
    xhr.send();
  }

  var speechCmds = null;

  if ('annyang' in window) {
    var back = function () {
      console.error('back');
      console.log('\n');
      navToExample('back');
    };
    var forward = function () {
      console.error('forward');
      console.log('\n');
      navToExample('forward');
    };

    // Disclaimer: `back` and `forward` mean with respect to the order of the
    // Examples list, not the actual history state of the order in which the
    // user has viewed the examples.
    speechCmds = {
      'back': back,
      'forward': forward
    };
  }

  fetchJSON('/examples/index.json', function (data) {
    if (!data) { return; }

    initSpeech(data.examples);
  });

  function initSpeech (data) {
    if (!annyang) { return; }

    choices = (data || []).map(function (item) {
      item.title = (item.title || item.slug || '').replace(/&/g, 'and');
      return item;
    });

    addSpeechCmd(choices[0], 'first');
    addSpeechCmd(choices[0], 'start');
    addSpeechCmd(choices[0], 'beginning');
    // addSpeechCmd(choices[choices.length - 1], 'last');
    addSpeechCmd(choices[choices.length - 1], 'end');

    addSpeechCmd(choices[0], 'the first');
    addSpeechCmd(choices[0], 'the start');
    addSpeechCmd(choices[0], 'the beginning');
    // addSpeechCmd(choices[choices.length - 1], 'the last');
    addSpeechCmd(choices[choices.length - 1], 'the end');

    function addSpeechCmd (example, title) {
      if (!title) { title = example.title; }

      var cmdFunc = function () { loadExample(example); };

      // TODO: Use `regexp` format.
      speechCmds[title] = cmdFunc;
      speechCmds['go ' + title] = cmdFunc;
      speechCmds['go *x ' + title] = cmdFunc;
      speechCmds['go *x ' + title + ' one'] = cmdFunc;

      speechCmds['skip to ' + title] = cmdFunc;
      speechCmds['skip to ' + title + ' one'] = cmdFunc;
      speechCmds['skip to *x ' + title + ' one'] = cmdFunc;

      speechCmds['play ' + title] = cmdFunc;
      speechCmds['play ' + title + ' one'] = cmdFunc;
      speechCmds['play *x ' + title + ' one'] = cmdFunc;

      speechCmds['open ' + title] = cmdFunc;
      speechCmds['open ' + title + ' one'] = cmdFunc;
      speechCmds['open *x ' + title + ' one'] = cmdFunc;

      speechCmds['load ' + title] = cmdFunc;
      speechCmds['load ' + title + ' one'] = cmdFunc;
      speechCmds['load *x ' + title + ' one'] = cmdFunc;

      speechCmds['start ' + title] = cmdFunc;
      speechCmds['start ' + title + ' one'] = cmdFunc;
      speechCmds['start *x ' + title + ' one'] = cmdFunc;
    }

    choices.forEach(function (example) { addSpeechCmd(example); });

    function loadExample (example) {
      if (!example) { return; }
      console.log('loading example: %s', example.title);
      window.location.href = '/' + ['examples', example.section, example.slug, ''].join('/');
    }

    annyang.addCommands(speechCmds);

    annyang.addCallback('resultNoMatch', function (userSaid, commandText, phrases) {
      if (!userSaid) { return; }

      userSaid = userSaid.map(strip);

      if (userSaid.indexOf('back') !== -1 ||
          userSaid.indexOf('previous') !== -1 ||
          userSaid.indexOf('backward') !== -1 ||
          userSaid.indexOf('backwards') !== -1 ||
          userSaid.indexOf('reverse') !== -1) {
        speechCmds.back();
        return;
      }

      if (userSaid.indexOf('next') !== -1 ||
          userSaid.indexOf('forward') !== -1 ||
          userSaid.indexOf('forwards') !== -1 ||
          userSaid.indexOf('skip') !== -1 ||
          userSaid.indexOf('pass') !== -1) {
        speechCmds.forward();
        return;
      }

      var i = 0;
      var j = 0;
      var phrase = '';
      var words = [];
      var word = '';

      for (i = 0; i < userSaid.length; i++) {
        phrase = userSaid[i];

        words = phrase.split(' ');

        if (words.indexOf('backward') !== -1 ||
            words.indexOf('backwards') !== -1) {
          speechCmds.back();
          return;
        }
        if (words.indexOf('forward') !== -1 ||
            words.indexOf('forwards') !== -1) {
          speechCmds.forward();
          return;
        }

        if (words.indexOf('back') !== -1 ||
            words.indexOf('previous') !== -1 ||
            words.indexOf('last') !== -1) {
          // Disclaimer: last could be confused with last item.
          speechCmds.back();
          return;
        }
        if (words.indexOf('next') !== -1) {
          speechCmds.forward();
          return;
        }
      }
    });

    if (window.MOBILE) {
      annyang.start();
    } else {
      var examplesSidebar = $('[data-page-type="examples"] .sidebar');
      if (examplesSidebar) {
        examplesSidebar.addEventListener('click', function (e) {
          if (e.detail >= 3) {
            annyang.start();
          }
        });
      }
    }
  }

  // DOCS.
  var anchorHeadingsSelector = 'h2[id], h3[id], h4[id], h5[id], h6[id]';

  var content = $('.content');
  if (content) {
    content.addEventListener('click', function (e) {
      var el = e.target;
      if (el.matches && el.matches(anchorHeadingsSelector)) {
        window.location.hash = '#' + el.id;
      }
    });
  }

})();

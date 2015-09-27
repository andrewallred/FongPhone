/**
 * Latest thoughts on controls:
 *  Distance from center of each dot will control the offset, but sliders on the edge of the screen will
 *  let you move both dots up and down, or left and right as a group with fixed relative positions
 *    (Doesn't really work though, moving one pitch up would pitch shift the other one)
 *
 * Pinching/zoom will let you make dots bigger/smaller to control the volume
 *   double tab dot will turn it off/on
 * @type {{}|*|Window.PhonePhong}
 */
(function () {
	window.PhonePhong.UI.Pad = function (board) {
		var self = this;
		this.board = board;

		// make changes to dom to create ui
		self.createComponents();
		// set up dom events
		self.listen();

		// setup state
		this.lastPinchDist = 0;

		this.longTouchChangesWave = false;
		this.longTouchSelectsFong = true;
	};

	_.extend(PhonePhong.UI.Pad.prototype, {
		waves: ['sine', 'square', 'triangle', 'sawtooth'],
		createComponents: function () {
			$('#phongUIGrid').height(window.innerHeight);
			window.PhonePhong.UI.Helper.registerSwipeNavigation('uiPadSwipeBottom', '#/note-map', Hammer.DIRECTION_UP);
			window.PhonePhong.UI.Helper.registerSwipeNavigation('uiPadSwipeTop', '#/help', Hammer.DIRECTION_DOWN);
			this.oscTouchFade1 = document.getElementById('oscTouchFade1');
			this.oscTouchFade2 = document.getElementById('oscTouchFade2');
			this.oscTouch1 = document.getElementById('oscTouch1');
			this.oscTouch2 = document.getElementById('oscTouch2');
			this.backgroundPad = document.getElementById('phongUIGrid');

			document.getElementById('uiPadSwipeBottom').setAttribute('y', window.innerHeight - uiPadSwipeBottom.getAttribute('height'));
		},
		listen: function () {
			// Changes wave form
			$(this.oscTouch1).on('taphold', _.bind(this._handleLongTouch, this));
			$(this.oscTouch2).on('taphold', _.bind(this._handleLongTouch, this));
			// Toggles solid tone
			$(this.oscTouch1).on('doubletap', _.bind(this._handleDoubleTap, this));
			$(this.oscTouch2).on('doubletap', _.bind(this._handleDoubleTap, this));
			// Moves circles controlling pitch and speed
			this.oscTouch1.addEventListener('touchmove', _.bind(this._handleOSCTouchMove, this));
			this.oscTouch2.addEventListener('touchmove', _.bind(this._handleOSCTouchMove, this));
			this.oscTouch1.addEventListener('touchend', _.bind(this._handleOSCTouchEnd, this));
			this.oscTouch2.addEventListener('touchend', _.bind(this._handleOSCTouchEnd, this));
			// handles fade left/right
			this.oscTouchFade1.addEventListener('touchmove', _.bind(this._handleFadeMove, this));
			this.oscTouchFade2.addEventListener('touchmove', _.bind(this._handleFadeMove, this));
			this.backgroundPad.addEventListener('touchstart', _.bind(this._handleBackGroundTouchStart, this));
			this.backgroundPad.addEventListener('touchend', _.bind(this._handleBackGroundTouchEnd, this));
		},
		updateOsc: function (target, x, y) {
			var self = this;

			// TODO (CAW) -- Seems setup for one fong but confused (target.getAttribute('cx') vs
			//  self.oscTouch1.getAttribute('cy')
			// )
			//turning this off should be an advanced feature
			if (this.offsetX == null && x != target.getAttribute('cx')) {
				this.offsetX = x - target.getAttribute('cx');
			}
			if (this.offsetY == null && y != self.oscTouch1.getAttribute('cy')) {
				this.offsetY = y - target.getAttribute('cy');
			}

			// Place element where the finger is
			target.setAttribute('cx', x - this.offsetX);
			target.setAttribute('cy', y - this.offsetY);
			$(target).attr('class', 'selectedFong');

			// get attributes from ui
			var r = parseInt(target.getAttribute('r'));
			var touch1x = parseFloat(self.oscTouch1.getAttribute('cx'))
			var touch1r = parseFloat(self.oscTouch1.getAttribute('r'));
			var touch2x = parseFloat(self.oscTouch2.getAttribute('cx'))
			var touch2r = parseFloat(self.oscTouch2.getAttribute('r'));
			// calculate frequency
			var freq, ffreq;
			if (!window.PhonePhong.NoteMapOn) {
				freq = map(y / 2, (r / 2), window.innerHeight - r, 0, self.board.osc1MaxFreq);

			} else {
				// ?? freq2 map(y, (r/2), window.innerHeight - target.getAttribute('height'), 0, self.board.osc1MaxFreq)
				var noteNumber = parseInt(y * PhonePhong.NoteMap.length / window.innerHeight);
				var note = PhonePhong.NoteMap[noteNumber];
				if (!note) note = PhonePhong.NoteMap[PhonePhong.NoteMap.length - 1];
				freq = note.freq;


			}

			if (!window.PhonePhong.FilterNoteMapOn) {
				ffreq = map(x / 2, (r / 2), window.innerWidth - r, 0, self.board.osc1MaxFreq);
			} else {
				var fnoteNumber = parseInt(x * PhonePhong.NoteMap.length / window.innerWidth);
				var fnote = PhonePhong.NoteMap[fnoteNumber];
				if (!fnote) fnote = PhonePhong.NoteMap[PhonePhong.NoteMap.length - 1];
				ffreq = fnote.freq;
			}

			log(freq + " " + ffreq);

			if (freq < 0) freq = 0;
			if (ffreq < 100) ffreq = 100;

			var fadeUIElement, fadeUIOffset;
			if (target.id === self.oscTouch1.id) {
				fadeUIElement = self.oscTouchFade1;
				fadeUIOffset = self.board.fong1.oscTouchFadeVal;
			} else if (target.id === self.oscTouch2.id) {
				fadeUIOffset = self.board.fong2.oscTouchFadeVal;
				fadeUIElement = self.oscTouchFade2;
			}

			// update frequencies
			self.board.fongs[event.target.getAttribute('data-index')].setOscFreq(freq);
			self.board.fongs[event.target.getAttribute('data-index')].setOscFilterFreq(ffreq);

			// update position of fade elements reletive to main touch element
			fadeUIElement.setAttribute('cx', target.getAttribute('cx') - fadeUIOffset);
			fadeUIElement.setAttribute('cy', target.getAttribute('cy'));
			// update offsets
			var primaryOffset = map(touch1x, (touch1r / 2), window.innerWidth - touch1r, 0, self.board.primaryOffsetMax);
			if (primaryOffset < 0) primaryOffset = 0;
			self.board.setPrimaryOffset(primaryOffset);
			self.board.setSecondaryOffset(map(touch2x, (touch2r / 2), window.innerWidth - touch2r, 0, self.board.secondaryOffsetMax) * self.board.mainTimeOffset);
		},
		_handleBackGroundTouchEnd: function (event) {
			// TODO (CAW) Shift background touch to here, so it comes after swipe detection
		},
		_handleBackGroundTouchStart: function (event) {
			if (event.target !== this.backgroundPad) return;
			if (this.lastSelectedFong) {
				var touch = event.targetTouches[0];
				this.offsetX = 0;
				this.offsetY = 0;
				this.updateOsc(this.lastSelectedFong, touch.pageX, touch.pageY);
				this.offsetX = null;
				this.offsetY = null;
			}
		},
		_handleDoubleTap: function (event) {
			var self = this;
			self.board.fongs[event.target.getAttribute('data-index')].toggleOscPulse();
		},
		_handleFadeMove: function (event) {
			var self = this;

			if (event.targetTouches.length == 1) {
				var self = this;
				
				var touch = event.targetTouches[0];
				event.target.setAttribute('cx', touch.pageX);
				
				var i = event.target.getAttribute('data-index');				
				var fong = self.board.fongs[i];				
				var iPlusOne = parseInt(i)+1;				
				fong.oscTouchFadeVal = document.getElementById('oscTouch' + iPlusOne).getAttribute('cx') - touch.pageX;
				
				// TODO (CAW) -- range should reflect size of outer sphere
				fong.setFade(map(-1 * fong.oscTouchFadeVal, -35, 35, -2, 2));
			}
		},
		_handleLongTouch: function (event) {
			//alert("_handleLongTouch " + event.target.id);
			var self = this;

			self.board.fongs[event.target.getAttribute('data-index')].incrementOscillator();

			event.preventDefault();
		},
		_handleOSCTouchEnd: function (event) {
			this.lastPinchDist = 0;

			// reset touch offset
			this.offsetX = null;
			this.offsetY = null;

			$(event.target).attr('class', 'fong');
			this.lastSelectedFong = event.target;
		},
		_handleOSCTouchMove: function (event) {
			var self = this;

			// If there's exactly one finger inside this element
			if (event.targetTouches.length == 1) {
				var touch = event.targetTouches[0];

				self.updateOsc(event.target, touch.pageX, touch.pageY, null, null);

				event.preventDefault();
			} else if (event.targetTouches.length == 2) {
				if (self.lastPinchDist === undefined) self.lastPinchDist = 0;

				var x1 = event.targetTouches[0].pageX;
				var y1 = event.targetTouches[0].pageY;
				var x2 = event.targetTouches[1].pageX;
				var y2 = event.targetTouches[1].pageY;

				var dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
				var change = dist - self.lastPinchDist;

				var r = parseFloat(event.target.getAttribute('r'));
				if (change > 0 && r <= 98) r += 2;
				else if (r >= 62) r -= 2;

				event.target.setAttribute('r', r);

				self.board.fongs[event.target.getAttribute('data-index')].setOscVol(map(r, 60, 100, 0.9949676394462585, 5));

				self.lastPinchDist = dist;
			}

			event.preventDefault();
		}
	});

	// --- private helper functions ---
	function map(val, x1, x2, y1, y2) {
		return (val - x1) / (Math.abs(x2 - x1)) * Math.abs(y2 - y1) + y1;
	}
})();
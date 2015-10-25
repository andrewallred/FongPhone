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
	window.PhonePhong.UI.Pad = function (board, state) {
		var self = this;
		this.svgElementID = 'phongUIGrid';

		this.board = board;

		this.roleHandlers = {
			primary: {
				positionChanged: _.bind(this.handlePositionChangedPrimary, this),
				fadeChangedHandler: _.bind(this.handleFadeChanged, this),
				handleFongSelected: _.bind(this.handleFongSelected, this),
				classTypeChangeHandler: _.bind(this.classTypeChangeHandler, this),
				stateChangedHandler: _.bind(this.stateChangedHandler, this),
				radiusChangeHandler: _.bind(this.radiusChangeHandler, this)
			},
			secondary: {
				positionChanged: _.bind(this.handlePositionChangedSecondary, this),
				fadeChangedHandler: _.bind(this.handleFadeChanged, this),
				handleFongSelected: _.bind(this.handleFongSelected, this),
				classTypeChangeHandler: _.bind(this.classTypeChangeHandler, this),
				stateChangedHandler: _.bind(this.stateChangedHandler, this),
				radiusChangeHandler: _.bind(this.radiusChangeHandler, this)
			}
		};

		this.set(state);
	};

	_.extend(PhonePhong.UI.Pad.prototype, {
		attachToDom: function(attachChildren) {
			// make changes to dom to create ui
			this.createComponents();
			// set up dom events
			this.listen();

			// make sure each fong gets re-attached
			_.each(this.fongDots, function(fong) { fong.attachToDom(); });

		},
		createComponents: function () {
			$('#' + this.svgElementID).height(window.innerHeight);
			window.PhonePhong.UI.Helper.registerSwipeNavigation(this, 'uiPadSwipeBottom', '#/note-map', Hammer.DIRECTION_RIGHT, 'swiperight');
			window.PhonePhong.UI.Helper.registerSwipeNavigation(this, 'uiPadSwipeBottom', '#/sound', Hammer.DIRECTION_LEFT, 'swipeleft');

			this.backgroundPad = document.getElementById(this.svgElementID);

			document.getElementById('uiPadSwipeBottom').setAttribute('y', window.innerHeight - uiPadSwipeBottom.getAttribute('height'));
		},
		listen: function () {
			var svgElem = document.getElementById(this.svgElementID);

			// store the function wrapper returned from bind so we can clean up after dom is refreshed
			this._handleBackGroundTouchStart = _.bind(this.handleBackGroundTouchStart, this);
			this._handleTouchEnd = _.bind(this.handleBackGroundTouchEnd, this);

			// remove any listeners attached to dead dom nodes
			svgElem.removeEventListener('touchmove', _stopDefault);
			if (this._handleBackGroundTouchStart)
				this.backgroundPad.removeEventListener('touchstart', this._handleBackGroundTouchStart);
			if (this._handleTouchEnd)
				this.backgroundPad.removeEventListener('touchend', this._handleTouchEnd);

			svgElem.addEventListener('touchmove', _stopDefault, false);
			this.backgroundPad.addEventListener('touchstart', this._handleBackGroundTouchStart);
			this.backgroundPad.addEventListener('touchend', this._handleTouchEnd);

			function _stopDefault(e) {
				// Cancel the event
				e.preventDefault();
			}
		},
		handleFadeChanged: function (fong) {
			// TODO (CAW) -- range should reflect size of outer sphere
			fong.boardInput.setFade(map(fong.fadeOffset, -35, 35, -2, 2));
		},
		handlePositionChangedPrimary: function (fong, oldX, oldY) {
			var freq = this.getFreq(fong.x, fong.y, fong.radius, fong);
			var ffreq = this.getFilterFrequency(fong.x, fong.y, fong.radius, fong);

			fong.boardInput.setOscFreq(freq);
			fong.boardInput.setOscFilterFreq(ffreq);

			// update offsets
			try {
				this.board.setPrimaryOffsetFromFong(fong);
			} catch (err) {
				alert(err.message);
			}
		},
		handlePositionChangedSecondary: function (fong, oldX, oldY) {			
			var freq = this.getFreq(fong.x, fong.y, fong.radius, fong);
			var ffreq = this.getFilterFrequency(fong.x, fong.y, fong.radius, fong);

			fong.boardInput.setOscFreq(freq);
			fong.boardInput.setOscFilterFreq(ffreq);

			// update offsets
			this.board.setSecondaryOffsetFromFong(fong);
		},
		getFreq: function (x, y, r, fong) {
			var f = fong.boardInput;
			if (!f.NoteMapOn) {
				return map(y / 2, (r / 2), window.innerHeight - r, 0, this.board.osc1MaxFreq);
			} else {
				// ?? freq2 map(y, (r/2), window.innerHeight - target.getAttribute('height'), 0, self.board.osc1MaxFreq)
				var noteNumber = Math.floor(y * f.NoteMap.length / window.innerHeight);
				var note = f.NoteMap[noteNumber];
				if (!note) note = f.NoteMap[f.NoteMap.length - 1];
				return note.freq;
			}

		},
		getFilterFrequency: function (x, y, r, fong) {
			var f = fong.boardInput;
			if (!f.FilterNoteMapOn) {
				return map(x / 2, (r / 2), window.innerWidth - r, 0, this.board.osc1MaxFreq);
			} else {
				var fnoteNumber = Math.floor(x * f.NoteMap.length / window.innerWidth);
				var fnote = f.NoteMap[fnoteNumber];
				if (!fnote) fnote = f.NoteMap[f.NoteMap.length - 1];
				return fnote.freq;
			}
		},
		handleBackGroundTouchEnd: function (event) {
			// TODO (CAW) Shift background touch to here, so it comes after swipe detection
		},
		handleFongSelected: function (fong) {
			this.lastSelectedFong = fong;
		},
		handleBackGroundTouchStart: function (event) {
			if (event.target !== this.backgroundPad) return;
			if (this.lastSelectedFong) {
				var touch = event.targetTouches[0];

				this.lastSelectedFong.x = touch.pageX;
				this.lastSelectedFong.y = touch.pageY;
			}
		},
		classTypeChangeHandler: function (fong, index, pulse) {
			if (pulse) fong.boardInput.startOscPulse();
			else fong.boardInput.stopOscPulse();
		},
		stateChangedHandler: function (fong, index, state) {
			fong.boardInput.setOscType(state);
		},
		radiusChangeHandler: function(fong) {
			fong.boardInput.setOscVol(map(fong.radius, 60, 100, 0.9949676394462585, 5));
		},
		set: function(json) {
			this.fongDots = [];
			_.each(json.fongDots || [], function(fongJSON) {
				fongJSON.positionChangedHandler = this.roleHandlers[fongJSON.fongRole].positionChanged;
				fongJSON.fadeChangedHandler = this.roleHandlers[fongJSON.fongRole].fadeChangedHandler;
				fongJSON.handleFongSelected = this.roleHandlers[fongJSON.fongRole].handleFongSelected;
				fongJSON.selectedClassChangedHandler = this.roleHandlers[fongJSON.fongRole].classTypeChangeHandler;
				fongJSON.stateChangedHandler = this.roleHandlers[fongJSON.fongRole].stateChangedHandler;
				this.fongDots.push(new  window.FongPhone.UI.Fong(this.board, fongJSON));
			}, this);
		},
		toJSON: function() {
			var state = { fongDots: [] };
			_.each(this.fongDots, function(fong) {
				state.fongDots.push(fong.toJSON());
			});

			return state;
		}
	});

	// --- private helper functions ---
	function map(val, x1, x2, y1, y2) {
		return (val - x1) / (Math.abs(x2 - x1)) * Math.abs(y2 - y1) + y1;
	}
})();
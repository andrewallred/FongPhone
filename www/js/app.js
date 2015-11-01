// TODO (CAW) Namespace these
var logicBoard;
var GLOBAL_NOTE_MAP;
(function () {
	console.log('starting...');
	var isCordova = (document.URL.indexOf('http://') === -1 &&
		document.URL.indexOf('https://') === -1);

	if (isCordova) {
		document.addEventListener('deviceready', _deviceReady, false);
		document.addEventListener("pause", _onPause, false);
	} else {
		$(_deviceReady);
	}

	// sound and sound logic layer
	var context;
	if (typeof AudioContext !== "undefined") {
		context = new AudioContext();
	} else if (typeof webkitAudioContext !== "undefined") {
		context = new webkitAudioContext();
	} else {
		return console.error(new Error('AudioContext not supported.'));
	}

	logicBoard = new PhonePhong.BoardLogic(context, FongPhone.Logic.Defaults.logicBoardDefaults);

	var padUI = new PhonePhong.UI.Pad(logicBoard, _getStoredState('ui.pad.state', FongPhone.UI.Defaults));

	var soundUI = new PhonePhong.Sound(
		logicBoard,
		padUI,
		_getStoredState('ui.sound.state', FongPhone.UI.Defaults.soundBoardSettings));

	var noteMap = GLOBAL_NOTE_MAP = new PhonePhong.UI.NoteMap(
		logicBoard,
		_getStoredState('ui.map.state', FongPhone.UI.Defaults.noteMapSettings)
	);

	// start the oscillators after all other settings have been initialized to avoid hiccup
	setTimeout(function() {
		logicBoard.start();
	}, 1000);

	var fongPhone = angular.module('fongPhone', ['ngRoute', 'ngAnimate', 'ngDraggable']).directive('ngY', function () {
		return function (scope, element, attrs) {
			scope.$watch(attrs.ngY, function (value) {
				element.attr('y', value);
			});
		};
	}).directive('ngX', function () {
		return function (scope, element, attrs) {
			scope.$watch(attrs.ngX, function (value) {
				element.attr('x', value);
			});
		};
	});

	fongPhone.config(function ($routeProvider) {
		$routeProvider.when('/', {
			templateUrl: 'views/view-pad.html',
			controller: 'padController'
		}).when('/note-map', {
			templateUrl: 'views/view-map.html',
			controller: 'noteMapController'
		}).when('/help', {
			templateUrl: 'views/view-help.html',
			controller: 'helpController'
		}).when('/sound', {
			templateUrl: 'views/view-sound.html',
			controller: 'soundController'
		});
	});

	// initialize angular route controllers
	fongPhone.controller('padController', ['$scope', function ($scope) {
		padUI.attachToDom();
		 $scope.pageClass = 'view-pad';
	}]);

	fongPhone.controller('soundController', ['$scope', function ($scope) {
		soundUI.attachToDom($scope);
		$scope.pageClass = 'view-sound';
	}]);

	fongPhone.controller('noteMapController', function($scope) {
		noteMap.attachToDom($scope);
		$scope.pageClass = 'view-map';
	});

	fongPhone.controller('helpController', window.PhonePhong.UI.HelpView);

	function _deviceReady(id) {
		console.log('device ready');
		var domElement = document.querySelector('body');
		angular.bootstrap(domElement, ['fongPhone']);
	}

	function _onPause() {
		try {
			localStorage.setItem('ui.pad.state', JSON.stringify(padUI.toJSON()));
			localStorage.setItem('ui.sound.state', JSON.stringify(soundUI));
			localStorage.setItem('ui.map.state', JSON.stringify(noteMap));
		} catch (ex) {
			console.error('error saving ui pad state: ' + ex);
		}
	}

	function _getStoredState(key, defaults) {
		var storedState = null;
		try {
			storedState = localStorage.getItem(key);
		} catch (ex) {
			console.error('error retrieving ui pad state: ' + ex);
		}

		if (storedState) storedState = JSON.parse(storedState);
		if (storedState) return _.extend(defaults, storedState);
		return defaults;
	}
})();

// TODO -- Stick inside closure and give name space like Fong.log (prevents library conflicts)
function log(message) {
	$('#log').html(message);
}
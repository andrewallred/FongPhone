var logicBoard;
(function () {
	console.log('starting...');
	var defaults = {
		mainVol: 0.5,
		osc1Vol: 0.9949676394462585,
		osc2Vol: 0.9949676394462585,
		osc1Freq: 440,
		osc2Freq: 1000,
		primaryOffset: 0.5,
		osc1MaxFreq: 3000,
		osc2MaxFreq: 10,
		primaryOffsetMax: 10,
		secondaryOffsetMax: 8,
		secondaryOffset: 1.0
	};
	var isCordova = (document.URL.indexOf('http://') === -1 &&
		document.URL.indexOf('https://') === -1);

	if (isCordova)
		document.addEventListener('deviceready', _deviceReady, false);
	else
		$(_deviceReady);

	var context;
	if (typeof AudioContext !== "undefined") {
		context = new AudioContext();
	} else if (typeof webkitAudioContext !== "undefined") {
		context = new webkitAudioContext();
	} else {
		conole.error(new Error('AudioContext not supported.'));
	}

	logicBoard = new PhonePhong.BoardLogic(context, defaults);

	var fongPhone = angular.module('fongPhone', ['ngRoute', 'ngAnimate']).directive('ngY', function () {
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

	fongPhone.controller('padController', ['$scope', function ($scope) {
		var padUI = new PhonePhong.UI.Pad(logicBoard);
		$scope.pageClass = 'view-pad';
	}]);

	fongPhone.controller('soundController', ['$scope', function ($scope) {
		try {
			var padUI = new PhonePhong.Sound($scope, logicBoard);
			$scope.pageClass = 'view-sound';
		} catch (err) {
			alert(err.message);
		}
	}]);

	fongPhone.controller('noteMapController', window.PhonePhong.UI.NoteMap);
	fongPhone.controller('helpController', window.PhonePhong.UI.HelpView);

	function _deviceReady(id) {
		console.log('device ready');
		var parentElement = document.getElementById(id);
		var domElement = document.querySelector('body');
		angular.bootstrap(domElement, ['fongPhone']);
	}
	console.log('ending...');
})();

// TODO -- Stick inside closure and give name space like Fong.log (prevents library conflicts)
function log(message) {
	$('#log').html(message);
}
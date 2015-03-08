'use strict';

// Writer controller
angular.module('writer').controller('WriterController', [
	'$rootScope', '$scope', '$state', '$stateParams', '$location', '$timeout', '$document',
	'Authentication', 'Menus', 'Story', 'Chapter',
	function(
		$rootScope, $scope, $state, $stateParams, $location, $timeout, $document,
		Authentication, Menus, Story, Chapter
		) {
		$scope.authentication = Authentication;
		$rootScope.story = null;
		$rootScope.stories = null;
		$rootScope.chapter = null;
		$rootScope.chapters = null;
		$scope.scroll = 0;
		$scope.wc = 0;

		// Initialize Module
		function initWriter() {
			// Initialize pages
			if($stateParams.storyId) {
				$timeout(function(){ $scope.wordCount(); },2000);
			}
		};

		// Create new story
		$scope.createStory = function() {
			// Create new Writer object
			var story = new Story ({
				title: 'A New Story',
				author: $scope.authentication.user.displayName
			});

			// Save
			story.$save(function(response) {
				// Add new story to menu
				Menus.addSubMenuItem('topbar', 'writer', response.title, 'writer/story/' + response._id);
				// Redirect after save
				$location.path('writer/story/' + response._id);
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};
		// Resets
		$scope.resetWriter = function() {
			$rootScope.story = null;
			$rootScope.chapter = null;
			$rootScope.chapters = null;
		};
		$scope.resetStory = function() {
			$rootScope.chapter = null;
		};

		// Autosave
		var timeout;
  	var debounceSaveChapterUpdates = function(newVal, oldVal) {
    	if (newVal != oldVal) {
					$scope.wordCount();
					if (timeout) {
        		$timeout.cancel(timeout);
      		}
      		timeout = $timeout(function(){
						$scope.updateChapter(newVal);
					}, 1000);
			}
  	};
		var debounceSaveStoryUpdates = function(newVal, oldVal) {
    	if (newVal != oldVal) {

					if (timeout) {
        		$timeout.cancel(timeout);
      		}
      		timeout = $timeout(function(){
						$scope.updateStory();
					}, 1000);
			}
  	};
		$scope.$watch('story.title', debounceSaveStoryUpdates, true);
		$scope.$watch('story.author', debounceSaveStoryUpdates, true);

		// Word Count
		$scope.wordCount = function() {
			$scope.wc = 0;
			var value = null;
			var tmp = document.createElement("DIV");
	    //var wordCount = value.trim().replace(regex, ' ').split(' ').length;
	    //var totalChars = value.length;
	    //var charCount = value.trim().length;
	    //var charCountNoSpace = value.replace(regex, '').length;

			angular.forEach($rootScope.chapters, function(chapter){
				value = chapter.text;
   			tmp.innerHTML = value;
   			value = tmp.textContent || tmp.innerText || "";
				value = value.replace(/(^\s*)|(\s*$)/gi,"");//exclude  start and end white-space
				value = value.replace(/[^\S\r\n]{2,}/gi," ");//2 or more space to 1
				value = value.replace(/\n /,"\n"); // exclude newline with a start spacing

				$scope.wc = $scope.wc + value.split(' ').length;
			});
		};

		// Random first line
		$scope.firstLine = function() {
			var l = [
				"Call me Ishmael...",
				"It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife...",
				"Happy families are all alike; every unhappy family is unhappy in its own way...",
				"It was a bright cold day in April, and the clocks were striking thirteen...",
				"It was the best of times, it was the worst of times...",
				"If you really want to hear about it, the first thing you'll probably want to know is where I was born...",
				"To be, or not to be...",
				"It was a queer, sultry summer...",
				"In my younger and more vulnerable years my father gave me some advice that I’ve been turning over in my mind ever since...",
				"It was love at first sight. The first time Yossarian saw the chaplain he fell madly in love with him...",
				"All children, except one, grow up...",
				"He was an old man who fished alone...",
				"All this happened, more or less..."
			];
			var n = Math.floor((Math.random()*l.length)+1);
			var rtn = l[n];
			if (!rtn) { rtn = l[0]; }
			return rtn;
		};
		// Remove existing Story
		$scope.removeStory = function(story) {
			var r = confirm("Are you sure you want to delete this story?");
			if (r == true) {
				var story = new Story($rootScope.story);
				if ( $rootScope.story ) {
					story.$remove({ storyId: $stateParams.storyId });
					Menus.removeSubMenuItem('topbar', 'writer/story/' + story._id);
					$location.path('');
				}
			}
		};

		// Update story and chapter
		$scope.updateAll = function() {
			$scope.updateStory();
			$scope.updateChapter('all');
		}

		// Update existing Story
		$scope.updateStory = function() {
			// Create new Story object with current story data
			var story = new Story($rootScope.story);

			// Update menus
			var menus = Menus.getMenu('topbar');
			angular.forEach(menus.items, function(menu){
				if(menu.link === 'writer'){
					angular.forEach(menu.items, function(subMenu){
						if(subMenu.link === 'writer/story/' + story._id){
							subMenu.title = story.title;
						}
					});
				}
			});

			// Update data
			story.$update({ storyId: $stateParams.storyId },
				function(response) {
				}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

		// Find existing Story
		$scope.findOneStory = function() {
			if($state.is('writer.createStory')){
				$scope.createStory();
			}
			// Reset vars
			$rootScope.story = null;
			$rootScope.chapter = null;
			$rootScope.chapters = null;

			$rootScope.story = Story.get({storyId: $stateParams.storyId}, function(response){
				$rootScope.chapters = response.chapters;
				if($rootScope.chapters.length >= 1){
					angular.forEach(response.chapters, function(chapter, ci){
						$scope.$watch('story.chapters[' + ci + ']', debounceSaveChapterUpdates, true);
					});
				} else {
					$scope.createChapter();
				}
			});
		};

		// Create new Chapter
		$scope.createChapter = function() {
			var newChapterTitle = 'New Chapter';
			var newChapterText = $scope.firstLine();

			// Create new Chapter object
			var chapter = new Chapter ({
				story: $stateParams.storyId,
				title: newChapterTitle,
				text: newChapterText
			});

			// Save
			chapter.$save({storyId: $stateParams.storyId}, function(response) {
				// Add new chapter to list after save
				$rootScope.story.chapters.push(response);

				// Go to the new chapter
				$timeout(function(){
					var offset = 124;
					var duration = 1000;
    			var elem = angular.element(document.getElementById(response._id));
    			$document.scrollToElement(elem, offset, duration);
					//ScrollTo.scrollTo(response._id, -60);
				},0);
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

		// Remove existing Chapter
		$scope.removeChapter = function(chapterId) {
			var r = confirm("Are you sure you want to remove this chapter?");
			if (r == true) {
				angular.forEach($rootScope.story.chapters, function(chapter, i){
					if(chapter._id === chapterId) {
						var chapter = new Chapter(chapter);
						$rootScope.story.chapters.splice(i, 1);
						chapter.$remove({
							storyId: $stateParams.storyId,
							chapterId: chapterId
						});
					}
				});
			}
		};

		// Update existing Chapter
		$scope.updateChapter = function(chapterUpdate) {
			if(chapterUpdate === 'all') {
				angular.forEach($rootScope.chapters, function(chapter){
					var c = new Chapter(chapter);
					c.$update({
						storyId: chapter._story,
						chapterId: chapter._id
					}, function() {}, function(errorResponse) {
						$scope.error = errorResponse.data.message;
					});
				});
			} else {
				var chapter = new Chapter(chapterUpdate);
				chapter.$update({
					storyId: chapter._story,
					chapterId: chapter._id
				}, function() {}, function(errorResponse) {
					$scope.error = errorResponse.data.message;
				});
			}
		};

		// Find existing Chapter
		$scope.findOneChapter = function() {
			$rootScope.chapter = null;
			angular.forEach($rootScope.chapters, function(chapter){
				if (chapter._id === $stateParams.chapterId) {
					$rootScope.chapter = chapter;
				}
			});
		};

		// Get selected text
		$scope.getSelectedText = function() {
			var text = "", containerElement = null;
	    if (typeof window.getSelection != "undefined") {
        var sel = window.getSelection();
        if (sel.rangeCount) {
            var node = sel.getRangeAt(0).commonAncestorContainer;
            containerElement = node.nodeType == 1 ? node : node.parentNode;
            text = sel.toString();
        }
	    } else if (typeof document.selection != "undefined" && document.selection.type != "Control") {
        var textRange = document.selection.createRange();
        containerElement = textRange.parentElement().parentElement().parentElement();
        text = textRange.text;
	    }
	    return {
        text: text,
        containerElement: containerElement
	    };
		}
		$scope.decorate = function(decoration) {
			document.execCommand(decoration, false, null);
		};

		initWriter();
	}
]).value('duScrollOffset', 124).run(function($rootScope, $location, $stateParams){
  $rootScope.$on('duScrollspy:becameActive', function($event, $element){
    //Automaticly update location
    var hash = $element.prop('hash');
		//console.log(JSON.stringify(hash));
		hash = hash.replace('#','/writer/story/' + $stateParams.storyId + '/chapter/');
		//console.log(JSON.stringify(hash));
    if(hash) {
      //$location.hash(hash.substr(1)).replace();
			//$location.path(hash);
      //$rootScope.$apply();
    }
  });
});

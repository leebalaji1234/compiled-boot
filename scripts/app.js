
DemoCtrl.$inject = ["$mdDialog"];
DialogController.$inject = ["$scope", "$mdDialog"];(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    run.$inject = ["editableThemes"];
    angular
        .module('app.scrumboard', [])
        .config(config)
        .run(run);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        $stateProvider
            .state('app.scrumboard', {
                abstract : true,
                url      : '/scrumboard',
                resolve  : {
                    BoardList: ["msApi", function (msApi)
                    {
                        return msApi.resolve('scrumboard.boardList@get');
                    }]
                },
                bodyClass: 'scrumboard'
            })

            // Home
            .state('app.scrumboard.boards', {
                url  : '/boards',
                views: {
                    'content@app': {
                        templateUrl: 'app/main/apps/scrumboard/views/boards/boards-view.html',
                        controller : 'BoardsViewController as vm'
                    }
                }
            })

            // Board
            .state('app.scrumboard.boards.board', {
                    url    : '/:id/:uri',
                    views  : {
                        'content@app'                                  : {
                            templateUrl: 'app/main/apps/scrumboard/scrumboard.html',
                            controller : 'ScrumboardController as vm'
                        },
                        'scrumboardContent@app.scrumboard.boards.board': {
                            templateUrl: 'app/main/apps/scrumboard/views/board/board-view.html',
                            controller : 'BoardViewController as vm'
                        }
                    },
                    resolve: {
                        BoardData: ["$stateParams", "BoardService", function ($stateParams, BoardService)
                        {
                            return BoardService.getBoardData($stateParams.id);
                        }]
                    }
                }
            )

            // Add board
            .state('app.scrumboard.boards.addBoard', {
                    url    : '/add',
                    views  : {
                        'content@app'                                     : {
                            templateUrl: 'app/main/apps/scrumboard/scrumboard.html',
                            controller : 'ScrumboardController as vm'
                        },
                        'scrumboardContent@app.scrumboard.boards.addBoard': {
                            templateUrl: 'app/main/apps/scrumboard/views/board/board-view.html',
                            controller : 'BoardViewController as vm'
                        }
                    },
                    resolve: {
                        BoardData: ["$stateParams", "BoardService", function ($stateParams, BoardService)
                        {
                            return BoardService.addNewBoard();
                        }]
                    }
                }
            )

            // Calendar
            .state('app.scrumboard.boards.board.calendar', {
                url  : '/calendar',
                views: {
                    'scrumboardContent@app.scrumboard.boards.board': {
                        templateUrl: 'app/main/apps/scrumboard/views/calendar/calendar-view.html',
                        controller : 'CalendarViewController as vm'
                    }
                }
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/scrumboard');

        // Api
        msApiProvider.register('scrumboard.boardList', ['app/data/scrumboard/board-list.json']);
        msApiProvider.register('scrumboard.board', ['app/data/scrumboard/boards/:id.json']);

        // Navigation
        msNavigationServiceProvider.saveItem('apps.scrumboard', {
            title : 'Scrumboard',
            icon  : 'icon-trello',
            state : 'app.scrumboard.boards',
            weight: 6
        });
    }

    /** @ngInject */
    function run(editableThemes)
    {
        /**
         * Inline Edit Configuration
         * @type {string}
         */
        editableThemes.default.submitTpl = '<md-button class="md-icon-button" type="submit" aria-label="save"><md-icon md-font-icon="icon-checkbox-marked-circle" class="md-accent-fg md-hue-1"></md-icon></md-button>';
        editableThemes.default.cancelTpl = '<md-button class="md-icon-button" ng-click="$form.$cancel()" aria-label="cancel"><md-icon md-font-icon="icon-close-circle" class="icon-cancel"></md-icon></md-button>';
    }

})();
(function ()
{
    'use strict';

    ScrumboardCalendarEventDialogController.$inject = ["$mdDialog", "dueDate", "BoardService", "msUtils"];
    angular
        .module('app.scrumboard')
        .controller('ScrumboardCalendarEventDialogController', ScrumboardCalendarEventDialogController);

    /** @ngInject */
    function ScrumboardCalendarEventDialogController($mdDialog, dueDate, BoardService, msUtils)
    {
        var vm = this;

        // Data
        vm.board = BoardService.data;
        vm.dueDate = dueDate;
        vm.newCard = {
            name  : '',
            listId: ''
        };
        vm.selectedCards = [];

        // Methods
        vm.exists = msUtils.exists;
        vm.toggleInArray = msUtils.toggleInArray;
        vm.closeDialog = closeDialog;
        vm.addNewCard = addNewCard;
        vm.assignDueDate = assignDueDate;

        //////////

        /**
         * Close Dialog
         */
        function closeDialog()
        {
            $mdDialog.hide();
        }

        /**
         * Add New Card
         */
        function addNewCard()
        {
            var newCardId = msUtils.guidGenerator();

            vm.board.cards.push({
                'id'               : newCardId,
                'name'             : vm.newCard.name,
                'description'      : '',
                'idAttachmentCover': '',
                'idMembers'        : [],
                'idLabels'         : [],
                'attachments'      : [],
                'subscribed'       : false,
                'checklists'       : [],
                'checkItems'       : 0,
                'checkItemsChecked': 0,
                'comments'         : [],
                'activities'       : [],
                'due'              : vm.dueDate
            });

            vm.board.lists.getById(vm.newCard.listId).idCards.push(newCardId);

            // Reset the newCard object
            vm.newCard = {
                name: '',
                listId: ''
            };

            closeDialog();
        }

        /**
         * Assign Due Date
         */
        function assignDueDate()
        {
            angular.forEach(vm.selectedCards, function (cardId)
            {
                vm.board.cards.getById(cardId).due = vm.dueDate;
            });

            vm.selectedCards = [];

            closeDialog();
        }
    }
})();
(function ()
{
    'use strict';

    MembersMenuController.$inject = ["$document", "$mdDialog", "BoardService"];
    angular
        .module('app.scrumboard')
        .controller('MembersMenuController', MembersMenuController);

    /** @ngInject */
    function MembersMenuController($document, $mdDialog, BoardService)
    {
        var vm = this;

        // Data
        vm.board = BoardService.data;
        vm.newMemberSearchInput = '';

        // Methods
        vm.addNewMember = addNewMember;
        vm.removeMember = removeMember;

        ////////

        /**
         * Add New Member
         */
        function addNewMember()
        {
            // Add new member
        }

        /**
         * Remove member
         *
         * @param ev
         * @param memberId
         */
        function removeMember(ev, memberId)
        {
            var confirm = $mdDialog.confirm({
                title              : 'Remove Member',
                parent             : $document.find('#scrumboard'),
                textContent        : 'Are you sure want to remove member?',
                ariaLabel          : 'remove member',
                targetEvent        : ev,
                clickOutsideToClose: true,
                escapeToClose      : true,
                ok                 : 'Remove',
                cancel             : 'Cancel'
            });

            $mdDialog.show(confirm).then(function ()
            {
                var arr = vm.board.members;
                arr.splice(arr.indexOf(arr.getById(memberId)), 1);

                angular.forEach(vm.board.cards, function (card)
                {
                    if ( card.idMembers && card.idMembers.indexOf(memberId) > -1 )
                    {
                        card.idMembers.splice(card.idMembers.indexOf(memberId), 1);
                    }
                });
            }, function ()
            {
                // Canceled
            });
        }

    }
})();
(function ()
{
    'use strict';

    LabelsMenuController.$inject = ["$document", "$mdColorPalette", "$mdDialog", "fuseGenerator", "msUtils", "BoardService"];
    angular
        .module('app.scrumboard')
        .controller('LabelsMenuController', LabelsMenuController);

    /** @ngInject */
    function LabelsMenuController($document, $mdColorPalette, $mdDialog, fuseGenerator, msUtils, BoardService)
    {
        var vm = this;

        // Data
        vm.board = BoardService.data;
        vm.palettes = $mdColorPalette;
        vm.rgba = fuseGenerator.rgba;
        vm.hue = 500;
        vm.newLabelColor = 'red';
        vm.newLabelName = '';

        // Methods
        vm.addNewLabel = addNewLabel;
        vm.removeLabel = removeLabel;

        ////////

        /**
         * Add New Label
         */
        function addNewLabel()
        {
            vm.board.labels.push({
                id   : msUtils.guidGenerator(),
                name : vm.newLabelName,
                color: vm.newLabelColor
            });
            vm.newLabelName = '';
        }

        /**
         * Remove label
         *
         * @param ev
         * @param labelId
         */
        function removeLabel(ev, labelId)
        {
            var confirm = $mdDialog.confirm({
                title              : 'Remove Label',
                parent             : $document.find('#scrumboard'),
                textContent        : 'Are you sure want to remove label?',
                ariaLabel          : 'remove label',
                targetEvent        : ev,
                clickOutsideToClose: true,
                escapeToClose      : true,
                ok                 : 'Remove',
                cancel             : 'Cancel'
            });

            $mdDialog.show(confirm).then(function ()
            {
                var arr = vm.board.labels;
                arr.splice(arr.indexOf(arr.getById(labelId)), 1);

                angular.forEach(vm.board.cards, function (card)
                {
                    if ( card.idLabels && card.idLabels.indexOf(labelId) > -1 )
                    {
                        card.idLabels.splice(card.idLabels.indexOf(labelId), 1);
                    }
                });
            }, function ()
            {
                // Canceled
            });
        }

    }
})();
(function ()
{
    'use strict';

    ColorMenuController.$inject = ["$mdColorPalette", "BoardService"];
    angular
        .module('app.scrumboard')
        .controller('ColorMenuController', ColorMenuController);

    /** @ngInject */
    function ColorMenuController($mdColorPalette, BoardService)
    {
        var vm = this;

        // Data
        vm.board = BoardService.data;
        vm.palettes = $mdColorPalette;

        // Methods

        ////////

    }
})();
angular.module('whiteframeDirectiveUsage', ['ngMaterial']);

angular.module('whiteframeBasicUsage', ['ngMaterial']);

(function () {
  'use strict';

    angular
      .module('virtualRepeatVerticalDemo', ['ngMaterial'])
      .controller('AppCtrl', function() {
        this.items = [];
        for (var i = 0; i < 1000; i++) {
          this.items.push(i);
        }
      });

})();

(function () {
  'use strict';

    angular
      .module('virtualRepeatScrollToDemo', ['ngMaterial'])
      .controller('AppCtrl', ["$scope", function($scope) {
        this.selectedYear = 0;
        this.years = [];
        this.items = [];
        var currentYear = new Date().getFullYear();
        var monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        // Build a list of months over 20 years
        for (var y = currentYear; y >= (currentYear-20); y--) {
          this.years.push(y);
          this.items.push({year: y, text: y, header: true});
          for (var m = 11; m >= 0; m--) {
            this.items.push({year: y, month: m, text: monthNames[m]});
          }
        }
        // Whenever a different year is selected, scroll to that year
        $scope.$watch('ctrl.selectedYear', angular.bind(this, function(yearIndex) {
          var scrollYear = Math.floor(this.topIndex / 13);
          if(scrollYear !== yearIndex) {
            this.topIndex = yearIndex * 13;
          }
        }));
        // The selected year should follow the year that is at the top of the scroll container
        $scope.$watch('ctrl.topIndex', angular.bind(this, function(topIndex) {
          var scrollYear = Math.floor(topIndex / 13);
          this.selectedYear = scrollYear;
        }));
      }]);

})();

(function () {
  'use strict';

    angular
      .module('virtualRepeatInfiniteScrollDemo', ['ngMaterial'])
      .controller('AppCtrl', ["$timeout", function($timeout) {

        // In this example, we set up our model using a plain object.
        // Using a class works too. All that matters is that we implement
        // getItemAtIndex and getLength.
        this.infiniteItems = {
          numLoaded_: 0,
          toLoad_: 0,

          // Required.
          getItemAtIndex: function(index) {
            if (index > this.numLoaded_) {
              this.fetchMoreItems_(index);
              return null;
            }

            return index;
          },

          // Required.
          // For infinite scroll behavior, we always return a slightly higher
          // number than the previously loaded items.
          getLength: function() {
            return this.numLoaded_ + 5;
          },

          fetchMoreItems_: function(index) {
            // For demo purposes, we simulate loading more items with a timed
            // promise. In real code, this function would likely contain an
            // $http request.

            if (this.toLoad_ < index) {
              this.toLoad_ += 20;
              $timeout(angular.noop, 300).then(angular.bind(this, function() {
                this.numLoaded_ = this.toLoad_;
              }));
            }
          }
        };
      }]);

})();

(function () {
  'use strict';

    angular
      .module('virtualRepeatHorizontalDemo', ['ngMaterial'])
      .controller('AppCtrl', function() {
        this.items = [];
        for (var i = 0; i < 1000; i++) {
          this.items.push(i);
        }
      });

})();

(function () {
  'use strict';

    angular
      .module('virtualRepeatDeferredLoadingDemo', ['ngMaterial'])
      .controller('AppCtrl', ["$timeout", function($timeout) {

        // In this example, we set up our model using a class.
        // Using a plain object works too. All that matters
        // is that we implement getItemAtIndex and getLength.
        var DynamicItems = function() {
          /**
           * @type {!Object<?Array>} Data pages, keyed by page number (0-index).
           */
          this.loadedPages = {};

          /** @type {number} Total number of items. */
          this.numItems = 0;

          /** @const {number} Number of items to fetch per request. */
          this.PAGE_SIZE = 50;

          this.fetchNumItems_();
        };

        // Required.
        DynamicItems.prototype.getItemAtIndex = function(index) {
          var pageNumber = Math.floor(index / this.PAGE_SIZE);
          var page = this.loadedPages[pageNumber];

          if (page) {
            return page[index % this.PAGE_SIZE];
          } else if (page !== null) {
            this.fetchPage_(pageNumber);
          }
        };

        // Required.
        DynamicItems.prototype.getLength = function() {
          return this.numItems;
        };

        DynamicItems.prototype.fetchPage_ = function(pageNumber) {
          // Set the page to null so we know it is already being fetched.
          this.loadedPages[pageNumber] = null;

          // For demo purposes, we simulate loading more items with a timed
          // promise. In real code, this function would likely contain an
          // $http request.
          $timeout(angular.noop, 300).then(angular.bind(this, function() {
            this.loadedPages[pageNumber] = [];
            var pageOffset = pageNumber * this.PAGE_SIZE;
            for (var i = pageOffset; i < pageOffset + this.PAGE_SIZE; i++) {
              this.loadedPages[pageNumber].push(i);
            }
          }));
        };

        DynamicItems.prototype.fetchNumItems_ = function() {
          // For demo purposes, we simulate loading the item count with a timed
          // promise. In real code, this function would likely contain an
          // $http request.
          $timeout(angular.noop, 300).then(angular.bind(this, function() {
            this.numItems = 50000;
          }));
        };
        
        this.dynamicItems = new DynamicItems();
      }]);
})();

angular.module('tooltipDemo1', ['ngMaterial'])
.controller('AppCtrl', ["$scope", function($scope) {
  $scope.demo = {
    showTooltip : false,
    tipDirection : ''
  };

  $scope.$watch('demo.tipDirection',function(val) {
    if (val && val.length ) {
      $scope.demo.showTooltip = true;
    }
  })
}]);

var app = angular.module('toolbarDemo2', ['ngMaterial']);

app.controller('TitleController', ["$scope", function($scope) {
  $scope.title = 'My App Title';
}]);

app.controller('AppCtrl', ["$scope", function($scope) {
  var imagePath = 'assets/angular-material-assets/img/list/60.jpeg';

  $scope.todos = [];
  for (var i = 0; i < 15; i++) {
    $scope.todos.push({
      face: imagePath,
      what: "Brunch this weekend?",
      who: "Min Li Chan",
      notes: "I'll be in your neighborhood doing errands."
    });
  }
}]);


angular.module('toolbarDemo1', ['ngMaterial'])

.controller('AppCtrl', ["$scope", function($scope) {

}]);


angular.module('toastDemo1', ['ngMaterial'])

.controller('AppCtrl', ["$scope", "$mdToast", "$document", function($scope, $mdToast, $document) {
  var last = {
      bottom: false,
      top: true,
      left: false,
      right: true
    };

  $scope.toastPosition = angular.extend({},last);

  $scope.getToastPosition = function() {
    sanitizePosition();

    return Object.keys($scope.toastPosition)
      .filter(function(pos) { return $scope.toastPosition[pos]; })
      .join(' ');
  };

  function sanitizePosition() {
    var current = $scope.toastPosition;

    if ( current.bottom && last.top ) current.top = false;
    if ( current.top && last.bottom ) current.bottom = false;
    if ( current.right && last.left ) current.left = false;
    if ( current.left && last.right ) current.right = false;

    last = angular.extend({},current);
  }

  $scope.showCustomToast = function() {
    $mdToast.show({
      controller: 'ToastCtrl',
      templateUrl: 'toast-template.html',
      parent : $document[0].querySelector('#toastBounds'),
      hideDelay: 6000,
      position: $scope.getToastPosition()
    });
  };

  $scope.showSimpleToast = function() {
    $mdToast.show(
      $mdToast.simple()
        .textContent('Simple Toast!')
        .position($scope.getToastPosition())
        .hideDelay(3000)
    );
  };

  $scope.showActionToast = function() {
    var toast = $mdToast.simple()
          .textContent('Action Toast!')
          .action('OK')
          .highlightAction(false)
          .position($scope.getToastPosition());

    $mdToast.show(toast).then(function(response) {
      if ( response == 'ok' ) {
        alert('You clicked \'OK\'.');
      }
    });
  };

}])

.controller('ToastCtrl', ["$scope", "$mdToast", function($scope, $mdToast) {
  $scope.closeToast = function() {
    $mdToast.hide();
  };
}]);

(function () {
  'use strict';

  AppCtrl.$inject = ["$scope"];
  angular
      .module('tabsDemoStaticTabs', ['ngMaterial'] )
      .controller('AppCtrl', AppCtrl);

  function AppCtrl ( $scope ) {
    $scope.data = {
      selectedIndex: 0,
      secondLocked:  true,
      secondLabel:   "Item Two",
      bottom:        false
    };
    $scope.next = function() {
      $scope.data.selectedIndex = Math.min($scope.data.selectedIndex + 1, 2) ;
    };
    $scope.previous = function() {
      $scope.data.selectedIndex = Math.max($scope.data.selectedIndex - 1, 0);
    };
  }
})();

(function () {
  'use strict';
  AppCtrl.$inject = ["$scope", "$log"];
  angular
      .module('tabsDemoDynamicTabs', ['ngMaterial'])
      .controller('AppCtrl', AppCtrl);

  function AppCtrl ($scope, $log) {
    var tabs = [
          { title: 'One', content: "Tabs will become paginated if there isn't enough room for them."},
          { title: 'Two', content: "You can swipe left and right on a mobile device to change tabs."},
          { title: 'Three', content: "You can bind the selected tab via the selected attribute on the md-tabs element."},
          { title: 'Four', content: "If you set the selected tab binding to -1, it will leave no tab selected."},
          { title: 'Five', content: "If you remove a tab, it will try to select a new one."},
          { title: 'Six', content: "There's an ink bar that follows the selected tab, you can turn it off if you want."},
          { title: 'Seven', content: "If you set ng-disabled on a tab, it becomes unselectable. If the currently selected tab becomes disabled, it will try to select the next tab."},
          { title: 'Eight', content: "If you look at the source, you're using tabs to look at a demo for tabs. Recursion!"},
          { title: 'Nine', content: "If you set md-theme=\"green\" on the md-tabs element, you'll get green tabs."},
          { title: 'Ten', content: "If you're still reading this, you should just go check out the API docs for tabs!"}
        ],
        selected = null,
        previous = null;
    $scope.tabs = tabs;
    $scope.selectedIndex = 2;
    $scope.$watch('selectedIndex', function(current, old){
      previous = selected;
      selected = tabs[current];
      if ( old + 1 && (old != current)) $log.debug('Goodbye ' + previous.title + '!');
      if ( current + 1 )                $log.debug('Hello ' + selected.title + '!');
    });
    $scope.addTab = function (title, view) {
      view = view || title + " Content View";
      tabs.push({ title: title, content: view, disabled: false});
    };
    $scope.removeTab = function (tab) {
      var index = tabs.indexOf(tab);
      tabs.splice(index, 1);
    };
  }
})();


angular.module('tabsDemoDynamicHeight', ['ngMaterial']);
angular.module('switchDemo1', ['ngMaterial'])
.controller('SwitchDemoCtrl', ["$scope", function($scope) {
  $scope.data = {
    cb1: true,
    cb4: true,
    cb5: false
  };

  $scope.message = 'false';

  $scope.onChange = function(cbState) {
  	$scope.message = cbState;
  };
}]);

angular.module('demoSwipe', ['ngMaterial'])
  .controller('demoSwipeCtrl', ["$scope", function($scope) {
    $scope.onSwipeLeft = function(ev) {
      alert('You swiped left!!');
    };

    $scope.onSwipeRight = function(ev) {
      alert('You swiped right!!');
    };
    $scope.onSwipeUp = function(ev) {
      alert('You swiped up!!');
    };

    $scope.onSwipeDown = function(ev) {
      alert('You swiped down!!');
    };
  }]);


angular.module('subheaderBasicDemo', ['ngMaterial'])
.config(["$mdThemingProvider", function($mdThemingProvider) {
  $mdThemingProvider.theme('altTheme')
    .primaryPalette('purple');
}])
.controller('SubheaderAppCtrl', ["$scope", function($scope) {
    var imagePath = 'assets/angular-material-assets/img/list/60.jpeg';
    $scope.messages = [
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
    ];
}]);


angular.module('sliderDemo1', ['ngMaterial'])

.controller('AppCtrl', ["$scope", function($scope) {

  $scope.color = {
    red: Math.floor(Math.random() * 255),
    green: Math.floor(Math.random() * 255),
    blue: Math.floor(Math.random() * 255)
  };

  $scope.rating1 = 3;
  $scope.rating2 = 2;
  $scope.rating3 = 4;

  $scope.disabled1 = 0;
  $scope.disabled2 = 70;

}]);

angular
  .module('sidenavDemo1', ['ngMaterial'])
  .controller('AppCtrl', ["$scope", "$timeout", "$mdSidenav", "$log", function ($scope, $timeout, $mdSidenav, $log) {
    $scope.toggleLeft = buildDelayedToggler('left');
    $scope.toggleRight = buildToggler('right');
    $scope.isOpenRight = function(){
      return $mdSidenav('right').isOpen();
    };

    /**
     * Supplies a function that will continue to operate until the
     * time is up.
     */
    function debounce(func, wait, context) {
      var timer;

      return function debounced() {
        var context = $scope,
            args = Array.prototype.slice.call(arguments);
        $timeout.cancel(timer);
        timer = $timeout(function() {
          timer = undefined;
          func.apply(context, args);
        }, wait || 10);
      };
    }

    /**
     * Build handler to open/close a SideNav; when animation finishes
     * report completion in console
     */
    function buildDelayedToggler(navID) {
      return debounce(function() {
        $mdSidenav(navID)
          .toggle()
          .then(function () {
            $log.debug("toggle " + navID + " is done");
          });
      }, 200);
    }

    function buildToggler(navID) {
      return function() {
        $mdSidenav(navID)
          .toggle()
          .then(function () {
            $log.debug("toggle " + navID + " is done");
          });
      }
    }
  }])
  .controller('LeftCtrl', ["$scope", "$timeout", "$mdSidenav", "$log", function ($scope, $timeout, $mdSidenav, $log) {
    $scope.close = function () {
      $mdSidenav('left').close()
        .then(function () {
          $log.debug("close LEFT is done");
        });

    };
  }])
  .controller('RightCtrl', ["$scope", "$timeout", "$mdSidenav", "$log", function ($scope, $timeout, $mdSidenav, $log) {
    $scope.close = function () {
      $mdSidenav('right').close()
        .then(function () {
          $log.debug("close RIGHT is done");
        });
    };
  }]);

angular.module('selectDemoValidation', ['ngMaterial', 'ngMessages'])
.controller('AppCtrl', ["$scope", function($scope) {
  $scope.clearValue = function() {
    $scope.myModel = undefined;
  };
  $scope.save = function() {
    alert('Form was valid!');
  };
}]);

angular.module('selectDemoOptionsAsync', ['ngMaterial'])
.controller('SelectAsyncController', ["$timeout", "$scope", function($timeout, $scope) {
  $scope.user = null;
  $scope.users = null;

  $scope.loadUsers = function() {

    // Use timeout to simulate a 650ms request.
    return $timeout(function() {

      $scope.users =  $scope.users  || [
        { id: 1, name: 'Scooby Doo' },
        { id: 2, name: 'Shaggy Rodgers' },
        { id: 3, name: 'Fred Jones' },
        { id: 4, name: 'Daphne Blake' },
        { id: 5, name: 'Velma Dinkley' }
      ];

    }, 650);
  };
}]);

angular
    .module('selectDemoOptGroups', ['ngMaterial'])
    .controller('SelectOptGroupController', ["$scope", function($scope) {
      $scope.sizes = [
          "small (12-inch)",
          "medium (14-inch)",
          "large (16-inch)",
          "insane (42-inch)"
      ];
      $scope.toppings = [
        { category: 'meat', name: 'Pepperoni' },
        { category: 'meat', name: 'Sausage' },
        { category: 'meat', name: 'Ground Beef' },
        { category: 'meat', name: 'Bacon' },
        { category: 'veg', name: 'Mushrooms' },
        { category: 'veg', name: 'Onion' },
        { category: 'veg', name: 'Green Pepper' },
        { category: 'veg', name: 'Green Olives' }
      ];
    }]);

(function () {
  'use strict';
  angular
      .module('selectDemoBasic', ['ngMaterial'])
      .controller('AppCtrl', function() {
        this.userState = '';
        this.states = ('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS ' +
            'MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI ' +
            'WY').split(' ').map(function (state) { return { abbrev: state }; });
      });
})();

angular
  .module('radioDemo2', ['ngMaterial'])
  .controller('ContactController', ["$scope", function($scope) {
    var self = this;

    self.contacts = [{
      'id': 1,
      'fullName': 'Maria Guadalupe',
      'lastName': 'Guadalupe',
      'title': "CEO, Found"
    }, {
      'id': 2,
      'fullName': 'Gabriel García Marquéz',
      'lastName': 'Marquéz',
      'title': "VP Sales & Marketing"
    }, {
      'id': 3,
      'fullName': 'Miguel de Cervantes',
      'lastName': 'Cervantes',
      'title': "Manager, Operations"
    }, {
      'id': 4,
      'fullName': 'Pacorro de Castel',
      'lastName': 'Castel',
      'title': "Security"
    }];
    self.selectedIndex = 2;
    self.selectedUser = function() {
      return self.contacts[self.selectedIndex].lastName;
    }
  }]);


angular
  .module('radioDemo1', ['ngMaterial'])
  .controller('AppCtrl', ["$scope", function($scope) {

    $scope.data = {
      group1 : 'Banana',
      group2 : '2',
      group3 : 'avatar-1'
    };

    $scope.avatarData = [{
        id: "avatars:svg-1",
        title: 'avatar 1',
        value: 'avatar-1'
      },{
        id: "avatars:svg-2",
        title: 'avatar 2',
        value: 'avatar-2'
      },{
        id: "avatars:svg-3",
        title: 'avatar 3',
        value: 'avatar-3'
    }];

    $scope.radioData = [
      { label: '1', value: 1 },
      { label: '2', value: 2 },
      { label: '3', value: '3', isDisabled: true },
      { label: '4', value: '4' }
    ];


    $scope.submit = function() {
      alert('submit');
    };

    $scope.addItem = function() {
      var r = Math.ceil(Math.random() * 1000);
      $scope.radioData.push({ label: r, value: r });
    };

    $scope.removeItem = function() {
      $scope.radioData.pop();
    };

  }])
  .config(["$mdIconProvider", function($mdIconProvider) {
    $mdIconProvider.iconSet("avatars", 'assets/angular-material-assets/icons//avatar-icons.svg',128);
  }]);

angular.module('progressLinearDemo1', ['ngMaterial'])
  .config(["$mdThemingProvider", function($mdThemingProvider) {
  }])
  .controller('AppCtrl', ['$scope', '$interval', function($scope, $interval) {
    var self = this, j= 0, counter = 0;

    self.mode = 'query';
    self.activated = true;
    self.determinateValue = 30;
    self.determinateValue2 = 30;

    self.modes = [ ];

    /**
     * Turn off or on the 5 themed loaders
     */
    self.toggleActivation = function() {
        if ( !self.activated ) self.modes = [ ];
        if (  self.activated ) {
          j = counter = 0;
          self.determinateValue = 30;
          self.determinateValue2 = 30;
        }
    };

    $interval(function() {
      self.determinateValue += 1;
      self.determinateValue2 += 1.5;

      if (self.determinateValue > 100) self.determinateValue = 30;
      if (self.determinateValue2 > 100) self.determinateValue2 = 30;

        // Incrementally start animation the five (5) Indeterminate,
        // themed progress circular bars

        if ( (j < 2) && !self.modes[j] && self.activated ) {
          self.modes[j] = (j==0) ? 'buffer' : 'query';
        }
        if ( counter++ % 4 == 0 ) j++;

        // Show the indicator in the "Used within Containers" after 200ms delay
        if ( j == 2 ) self.contained = "indeterminate";

    }, 100, 0, true);

    $interval(function() {
      self.mode = (self.mode == 'query' ? 'determinate' : 'query');
    }, 7200, 0, true);
  }]);

angular
  .module('progressCircularDemo1', ['ngMaterial'])
  .controller('AppCtrl', ['$scope', '$interval',
    function($scope, $interval) {
      var self = this,  j= 0, counter = 0;

      self.modes = [ ];
      self.activated = true;
      self.determinateValue = 30;

      /**
       * Turn off or on the 5 themed loaders
       */
      self.toggleActivation = function() {
          if ( !self.activated ) self.modes = [ ];
          if (  self.activated ) j = counter = 0;
      };

      // Iterate every 100ms, non-stop
      $interval(function() {

        // Increment the Determinate loader

        self.determinateValue += 1;
        if (self.determinateValue > 100) {
          self.determinateValue = 30;
        }

        // Incrementally start animation the five (5) Indeterminate,
        // themed progress circular bars

        if ( (j < 5) && !self.modes[j] && self.activated ) {
          self.modes[j] = 'indeterminate';
        }
        if ( counter++ % 4 == 0 ) j++;

      }, 100, 0, true);
    }
  ]);

angular
  .module('menuBarDemoBasic', ['ngMaterial'])
  .config(["$mdIconProvider", function($mdIconProvider) {
    $mdIconProvider
      .defaultIconSet('assets/angular-material-assets/img/icons/sets/core-icons.svg', 24);
  }])
  .filter('keyboardShortcut', ["$window", function($window) {
    return function(str) {
      if (!str) return;
      var keys = str.split('-');
      var isOSX = /Mac OS X/.test($window.navigator.userAgent);

      var seperator = (!isOSX || keys.length > 2) ? '+' : '';

      var abbreviations = {
        M: isOSX ? '⌘' : 'Ctrl',
        A: isOSX ? 'Option' : 'Alt',
        S: 'Shift'
      };

      return keys.map(function(key, index) {
        var last = index == keys.length - 1;
        return last ? key : abbreviations[key];
      }).join(seperator);
    };
  }])
  .controller('DemoBasicCtrl', ["$mdDialog", function DemoCtrl($mdDialog) {
    this.settings = {
      printLayout: true,
      showRuler: true,
      showSpellingSuggestions: true,
      presentationMode: 'edit'
    };

    this.sampleAction = function(name, ev) {
      $mdDialog.show($mdDialog.alert()
        .title(name)
        .textContent('You triggered the "' + name + '" action')
        .ok('Great')
        .targetEvent(ev)
      );
    };
  }]);


angular.module('menuDemoWidth', ['ngMaterial'])
.config(["$mdIconProvider", function($mdIconProvider) {
  $mdIconProvider
    .iconSet("call", 'assets/angular-material-assets/img/icons/sets/communication-icons.svg', 24)
    .iconSet("social", 'assets/angular-material-assets/img/icons/sets/social-icons.svg', 24);
}])
.controller('WidthDemoCtrl', DemoCtrl);

function DemoCtrl($mdDialog) {
  var vm = this;

  this.announceClick = function(index) {
    $mdDialog.show(
      $mdDialog.alert()
        .title('You clicked!')
        .textContent('You clicked the menu item at index ' + index)
        .ok('Nice')
    );
  };
}


angular
  .module('menuDemoPosition', ['ngMaterial'])
  .config(["$mdIconProvider", function($mdIconProvider) {
    $mdIconProvider
      .iconSet("call", 'assets/angular-material-assets/img/icons/sets/communication-icons.svg', 24)
      .iconSet("social", 'assets/angular-material-assets/img/icons/sets/social-icons.svg', 24);
  }])
  .controller('PositionDemoCtrl', ["$mdDialog", function DemoCtrl($mdDialog) {
    var originatorEv;

    this.openMenu = function($mdOpenMenu, ev) {
      originatorEv = ev;
      $mdOpenMenu(ev);
    };

    this.announceClick = function(index) {
      $mdDialog.show(
        $mdDialog.alert()
          .title('You clicked!')
          .textContent('You clicked the menu item at index ' + index)
          .ok('Nice')
          .targetEvent(originatorEv)
      );
      originatorEv = null;
    };
  }]);



angular
  .module('menuDemoBasic', ['ngMaterial'])
  .config(["$mdIconProvider", function($mdIconProvider) {
    $mdIconProvider
      .iconSet("call", 'assets/angular-material-assets/img/icons/sets/communication-icons.svg', 24)
      .iconSet("social", 'assets/angular-material-assets/img/icons/sets/social-icons.svg', 24);
  }])
  .controller('BasicDemoCtrl', ["$mdDialog", function DemoCtrl($mdDialog) {
    var originatorEv;

    this.openMenu = function($mdOpenMenu, ev) {
      originatorEv = ev;
      $mdOpenMenu(ev);
    };

    this.notificationsEnabled = true;
    this.toggleNotifications = function() {
      this.notificationsEnabled = !this.notificationsEnabled;
    };

    this.redial = function() {
      $mdDialog.show(
        $mdDialog.alert()
          .targetEvent(originatorEv)
          .clickOutsideToClose(true)
          .parent('body')
          .title('Suddenly, a redial')
          .textContent('You just called a friend; who told you the most amazing story. Have a cookie!')
          .ok('That was easy')
      );

      originatorEv = null;
    };

    this.checkVoicemail = function() {
      // This never happens.
    };
  }]);

angular.module('listDemo2', ['ngMaterial'])
.config(["$mdIconProvider", function($mdIconProvider) {
  $mdIconProvider
    .iconSet('social', 'assets/angular-material-assets/img/icons/sets/social-icons.svg', 24)
    .iconSet('device', 'assets/angular-material-assets/img/icons/sets/device-icons.svg', 24)
    .iconSet('communication', 'assets/angular-material-assets/img/icons/sets/communication-icons.svg', 24)
    .defaultIconSet('assets/angular-material-assets/img/icons/sets/core-icons.svg', 24);
}])
.controller('ListCtrl', ["$scope", "$mdDialog", function($scope, $mdDialog) {
  $scope.toppings = [
    { name: 'Pepperoni', wanted: true },
    { name: 'Sausage', wanted: false },
    { name: 'Black Olives', wanted: true },
    { name: 'Green Peppers', wanted: false }
  ];

  $scope.settings = [
    { name: 'Wi-Fi', extraScreen: 'Wi-fi menu', icon: 'device:network-wifi', enabled: true },
    { name: 'Bluetooth', extraScreen: 'Bluetooth menu', icon: 'device:bluetooth', enabled: false },
  ];

  $scope.messages = [
    {id: 1, title: "Message A", selected: false},
    {id: 2, title: "Message B", selected: true},
    {id: 3, title: "Message C", selected: true},
  ];

  $scope.people = [
    { name: 'Janet Perkins', img: 'assets/angular-material-assets/img/100-0.jpeg', newMessage: true },
    { name: 'Mary Johnson', img: 'assets/angular-material-assets/img/100-1.jpeg', newMessage: false },
    { name: 'Peter Carlsson', img: 'assets/angular-material-assets/img/100-2.jpeg', newMessage: false }
  ];

  $scope.goToPerson = function(person, event) {
    $mdDialog.show(
      $mdDialog.alert()
        .title('Navigating')
        .textContent('Inspect ' + person)
        .ariaLabel('Person inspect demo')
        .ok('Neat!')
        .targetEvent(event)
    );
  };

  $scope.navigateTo = function(to, event) {
    $mdDialog.show(
      $mdDialog.alert()
        .title('Navigating')
        .textContent('Imagine being taken to ' + to)
        .ariaLabel('Navigation demo')
        .ok('Neat!')
        .targetEvent(event)
    );
  };

  $scope.doPrimaryAction = function(event) {
    $mdDialog.show(
      $mdDialog.alert()
        .title('Primary Action')
        .textContent('Primary actions can be used for one click actions')
        .ariaLabel('Primary click demo')
        .ok('Awesome!')
        .targetEvent(event)
    );
  };

  $scope.doSecondaryAction = function(event) {
    $mdDialog.show(
      $mdDialog.alert()
        .title('Secondary Action')
        .textContent('Secondary actions can be used for one click actions')
        .ariaLabel('Secondary click demo')
        .ok('Neat!')
        .targetEvent(event)
    );
  };

}]);


angular.module('listDemo1', ['ngMaterial'])
.config(["$mdIconProvider", function($mdIconProvider) {
  $mdIconProvider
    .iconSet('communication', 'assets/angular-material-assets/img/icons/sets/communication-icons.svg', 24);
}])
.controller('AppCtrl', ["$scope", function($scope) {
    var imagePath = 'assets/angular-material-assets/img/list/60.jpeg';

    $scope.phones = [
      { type: 'Home', number: '(555) 251-1234' },
      { type: 'Cell', number: '(555) 786-9841' },
      { type: 'Office', number: '(555) 314-1592' }
    ];
    $scope.todos = [
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
      {
        face : imagePath,
        what: 'Brunch this weekend?',
        who: 'Min Li Chan',
        when: '3:08PM',
        notes: " I'll be in your neighborhood doing errands"
      },
    ];
}]);

angular
  .module('inputIconDemo', ['ngMaterial', 'ngMessages'])
  .controller('DemoCtrl', ["$scope", function($scope) {
    $scope.user = {
      name: 'John Doe',
      email: '',
      phone: '',
      address: 'Mountain View, CA',
      donation: 19.99
    };
  }]);

angular.module('inputErrorsAdvancedApp', ['ngMaterial', 'ngMessages'])

  .controller('AppCtrl', ["$scope", function($scope) {
    $scope.showHints = true;

    $scope.user = {
      name: "",
      email: "",
      social: "123456789",
      phone: "N/A"
    };
  }]);

angular.module('inputErrorsApp', ['ngMaterial', 'ngMessages'])

.controller('AppCtrl', ["$scope", function($scope) {
  $scope.project = {
    description: 'Nuclear Missile Defense System',
    rate: 500
  };
}]);

angular
  .module('inputBasicDemo', ['ngMaterial', 'ngMessages'])
  .controller('DemoCtrl', ["$scope", function($scope) {
    $scope.user = {
      title: 'Developer',
      email: 'ipsum@lorem.com',
      firstName: '',
      lastName: '',
      company: 'Google',
      address: '1600 Amphitheatre Pkwy',
      city: 'Mountain View',
      state: 'CA',
      biography: 'Loves kittens, snowboarding, and can type at 130 WPM.\n\nAnd rumor has it she bouldered up Castle Craig!',
      postalCode: '94043'
    };

    $scope.states = ('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS ' +
    'MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI ' +
    'WY').split(' ').map(function(state) {
        return {abbrev: state};
      })
  }])
  .config(["$mdThemingProvider", function($mdThemingProvider) {

    // Configure a dark theme with primary foreground yellow

    $mdThemingProvider.theme('docs-dark', 'default')
      .primaryPalette('yellow')
      .dark();

  }]);


angular.module('appUsingTemplateCache', ['ngMaterial'])
  .controller('DemoCtrl', ["$scope", function($scope) {}])
  .config(["$mdIconProvider", function($mdIconProvider) {

    // Register icon IDs with sources. Future $mdIcon( <id> ) lookups
    // will load by url and retrieve the data via the $http and $templateCache

    $mdIconProvider
      .iconSet('core', 'assets/angular-material-assets/img/icons/sets/core-icons.svg',24)
      .icon('social:cake', 'assets/angular-material-assets/img/icons/cake.svg',24);

  }])
  .run(["$http", "$templateCache", function($http, $templateCache) {

    var urls = [
      'assets/angular-material-assets/img/icons/sets/core-icons.svg',
      'assets/angular-material-assets/img/icons/cake.svg',
      'assets/angular-material-assets/img/icons/android.svg'
    ];

    // Pre-fetch icons sources by URL and cache in the $templateCache...
    // subsequent $http calls will look there first.

    angular.forEach(urls, function(url) {
      $http.get(url, {cache: $templateCache});
    });

  }])
  ;


angular.module('appSvgIconSets', ['ngMaterial'])
  .controller('DemoCtrl', ["$scope", function($scope) {}])
  .config(['$mdIconProvider', function($mdIconProvider) {
    $mdIconProvider
      .iconSet('social', 'assets/angular-material-assets/img/icons/sets/social-icons.svg', 24)
      .defaultIconSet('assets/angular-material-assets/img/icons/sets/core-icons.svg', 24);
  }]);


angular.module('appDemoSvgIcons', ['ngMaterial'])
.controller('DemoCtrl', ["$scope", function( $scope ) {

    $scope.insertDriveIconURL = 'assets/angular-material-assets/img/icons/ic_insert_drive_file_24px.svg';
    $scope.getAndroid = function() {
      return 'assets/angular-material-assets/img/icons/android.svg';
    }
}]);


angular
  .module('appDemoFontIconsWithLigatures', ['ngMaterial'])
  .controller('DemoCtrl', ["$scope", function( $scope ) {
      // Specify a list of font-icons with ligatures and color overrides
      var iconData = [
            {name: 'accessibility'  , color: "#777" },
            {name: 'question_answer', color: "rgb(89, 226, 168)" },
            {name: 'backup'         , color: "#A00" },
            {name: 'email'          , color: "#00A" }
          ];

      $scope.fonts = [].concat(iconData);

      // Create a set of sizes...
      $scope.sizes = [
        {size:"md-18",padding:0},
        {size:"md-24",padding:2},
        {size:"md-36",padding:6},
        {size:"md-48",padding:10}
      ];

  }]);


angular
  .module('appDemoFontIconsWithClassnames', ['ngMaterial'])
  .controller('DemoCtrl', ["$scope", function( $scope ) {
      // Create list of font-icon names with color overrides
      var iconData = [
            {name: 'icon-home'        , color: "#777" },
            {name: 'icon-user-plus'   , color: "rgb(89, 226, 168)" },
            {name: 'icon-google-plus2', color: "#A00" },
            {name: 'icon-youtube4'    , color:"#00A" },
             // Use theming to color the font-icon
            {name: 'icon-settings'    , color:"#A00", theme:"md-warn md-hue-5"}
          ];

      // Create a set of sizes...
      $scope.sizes = [
        {size:48,padding:10},
        {size:36,padding:6},
        {size:24,padding:2},
        {size:12,padding:0}
      ];

      $scope.fonts = [].concat(iconData);



  }])
  .config(["$mdThemingProvider", function($mdThemingProvider){
    // Update the theme colors to use themes on font-icons
    $mdThemingProvider.theme('default')
          .primaryPalette("red")
          .accentPalette('green')
          .warnPalette('blue');
  }]);


angular.module('gridListDemo1', ['ngMaterial'])
.controller('AppCtrl', ["$scope", function($scope) {
  var COLORS = ['#ffebee', '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#f44336', '#e53935', '#d32f2f', '#c62828', '#b71c1c', '#ff8a80', '#ff5252', '#ff1744', '#d50000', '#f8bbd0', '#f48fb1', '#f06292', '#ec407a', '#e91e63', '#d81b60', '#c2185b', '#ad1457', '#880e4f', '#ff80ab', '#ff4081', '#f50057', '#c51162', '#e1bee7', '#ce93d8', '#ba68c8', '#ab47bc', '#9c27b0', '#8e24aa', '#7b1fa2', '#4a148c', '#ea80fc', '#e040fb', '#d500f9', '#aa00ff', '#ede7f6', '#d1c4e9', '#b39ddb', '#9575cd', '#7e57c2', '#673ab7', '#5e35b1', '#4527a0', '#311b92', '#b388ff', '#7c4dff', '#651fff', '#6200ea', '#c5cae9', '#9fa8da', '#7986cb', '#5c6bc0', '#3f51b5', '#3949ab', '#303f9f', '#283593', '#1a237e', '#8c9eff', '#536dfe', '#3d5afe', '#304ffe', '#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3', '#1e88e5', '#1976d2', '#1565c0', '#0d47a1', '#82b1ff', '#448aff', '#2979ff', '#2962ff', '#b3e5fc', '#81d4fa', '#4fc3f7', '#29b6f6', '#03a9f4', '#039be5', '#0288d1', '#0277bd', '#01579b', '#80d8ff', '#40c4ff', '#00b0ff', '#0091ea', '#e0f7fa', '#b2ebf2', '#80deea', '#4dd0e1', '#26c6da', '#00bcd4', '#00acc1', '#0097a7', '#00838f', '#006064', '#84ffff', '#18ffff', '#00e5ff', '#00b8d4', '#e0f2f1', '#b2dfdb', '#80cbc4', '#4db6ac', '#26a69a', '#009688', '#00897b', '#00796b', '#00695c', '#a7ffeb', '#64ffda', '#1de9b6', '#00bfa5', '#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4caf50', '#43a047', '#388e3c', '#2e7d32', '#1b5e20', '#b9f6ca', '#69f0ae', '#00e676', '#00c853', '#f1f8e9', '#dcedc8', '#c5e1a5', '#aed581', '#9ccc65', '#8bc34a', '#7cb342', '#689f38', '#558b2f', '#33691e', '#ccff90', '#b2ff59', '#76ff03', '#64dd17', '#f9fbe7', '#f0f4c3', '#e6ee9c', '#dce775', '#d4e157', '#cddc39', '#c0ca33', '#afb42b', '#9e9d24', '#827717', '#f4ff81', '#eeff41', '#c6ff00', '#aeea00', '#fffde7', '#fff9c4', '#fff59d', '#fff176', '#ffee58', '#ffeb3b', '#fdd835', '#fbc02d', '#f9a825', '#f57f17', '#ffff8d', '#ffff00', '#ffea00', '#ffd600', '#fff8e1', '#ffecb3', '#ffe082', '#ffd54f', '#ffca28', '#ffc107', '#ffb300', '#ffa000', '#ff8f00', '#ff6f00', '#ffe57f', '#ffd740', '#ffc400', '#ffab00', '#fff3e0', '#ffe0b2', '#ffcc80', '#ffb74d', '#ffa726', '#ff9800', '#fb8c00', '#f57c00', '#ef6c00', '#e65100', '#ffd180', '#ffab40', '#ff9100', '#ff6d00', '#fbe9e7', '#ffccbc', '#ffab91', '#ff8a65', '#ff7043', '#ff5722', '#f4511e', '#e64a19', '#d84315', '#bf360c', '#ff9e80', '#ff6e40', '#ff3d00', '#dd2c00', '#d7ccc8', '#bcaaa4', '#795548', '#d7ccc8', '#bcaaa4', '#8d6e63', '#eceff1', '#cfd8dc', '#b0bec5', '#90a4ae', '#78909c', '#607d8b', '#546e7a', '#cfd8dc', '#b0bec5', '#78909c'];

  this.colorTiles = (function() {
    var tiles = [];
    for (var i = 0; i < 46; i++) {
      tiles.push({
        color: randomColor(),
        colspan: randomSpan(),
        rowspan: randomSpan()
      });
    }
    return tiles;
  })();


  function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  function randomSpan() {
    var r = Math.random();
    if (r < 0.8) {
      return 1;
    } else if (r < 0.9) {
      return 2;
    } else {
      return 3;
    }
  }
}]);


angular
  .module('gridListDemoApp', ['ngMaterial'])
  .controller('gridListDemoCtrl', ["$scope", function($scope) {

    this.tiles = buildGridModel({
            icon : "avatar:svg-",
            title: "Svg-",
            background: ""
          });

    function buildGridModel(tileTmpl){
      var it, results = [ ];

      for (var j=0; j<11; j++) {

        it = angular.extend({},tileTmpl);
        it.icon  = it.icon + (j+1);
        it.title = it.title + (j+1);
        it.span  = { row : 1, col : 1 };

        switch(j+1) {
          case 1:
            it.background = "red";
            it.span.row = it.span.col = 2;
            break;

          case 2: it.background = "green";         break;
          case 3: it.background = "darkBlue";      break;
          case 4:
            it.background = "blue";
            it.span.col = 2;
            break;

          case 5:
            it.background = "yellow";
            it.span.row = it.span.col = 2;
            break;

          case 6: it.background = "pink";          break;
          case 7: it.background = "darkBlue";      break;
          case 8: it.background = "purple";        break;
          case 9: it.background = "deepBlue";      break;
          case 10: it.background = "lightPurple";  break;
          case 11: it.background = "yellow";       break;
        }

        results.push(it);
      }
      return results;
    }
  }])
  .config( ["$mdIconProvider", function( $mdIconProvider ){
    $mdIconProvider.iconSet("avatar", 'assets/angular-material-assets/icons//avatar-icons.svg', 128);
  }]);


angular.module('gridListDemo1', ['ngMaterial'])
.controller('AppCtrl', ["$scope", function($scope) {}]);

(function() {
  'use strict';

  angular.module('fabToolbarBasicUsageDemo', ['ngMaterial'])
    .controller('AppCtrl', ["$scope", function($scope) {
      $scope.isOpen = false;

      $scope.demo = {
        isOpen: false,
        count: 0,
        selectedDirection: 'left'
      };
    }]);
})();
(function() {
  'use strict';

  angular.module('fabSpeedDialDemoMoreOptions', ['ngMaterial'])
    .controller('DemoCtrl', ["$scope", "$mdDialog", "$timeout", function($scope, $mdDialog, $timeout) {
      var self = this;

      self.hidden = false;
      self.isOpen = false;
      self.hover = false;

      // On opening, add a delayed property which shows tooltips after the speed dial has opened
      // so that they have the proper position; if closing, immediately hide the tooltips
      $scope.$watch('demo.isOpen', function(isOpen) {
        if (isOpen) {
          $timeout(function() {
            $scope.tooltipVisible = self.isOpen;
          }, 600);
        } else {
          $scope.tooltipVisible = self.isOpen;
        }
      });

      self.items = [
        { name: "Twitter", icon: "assets/angular-material-assets/img/icons/twitter.svg", direction: "bottom" },
        { name: "Facebook", icon: "assets/angular-material-assets/img/icons/facebook.svg", direction: "top" },
        { name: "Google Hangout", icon: "assets/angular-material-assets/img/icons/hangout.svg", direction: "bottom" }
      ];

      self.openDialog = function($event, item) {
        // Show the dialog
        $mdDialog.show({
          clickOutsideToClose: true,
          controller: ["$mdDialog", function($mdDialog) {
            // Save the clicked item
            this.item = item;

            // Setup some handlers
            this.close = function() {
              $mdDialog.cancel();
            };
            this.submit = function() {
              $mdDialog.hide();
            };
          }],
          controllerAs: 'dialog',
          templateUrl: 'dialog.html',
          targetEvent: $event
        });
      }
    }]);
})();

(function() {
  'use strict';

  angular.module('fabSpeedDialDemoBasicUsage', ['ngMaterial'])
    .controller('DemoCtrl', function() {
      this.topDirections = ['left', 'up'];
      this.bottomDirections = ['down', 'right'];

      this.isOpen = false;

      this.availableModes = ['md-fling', 'md-scale'];
      this.selectedMode = 'md-fling';

      this.availableDirections = ['up', 'down', 'left', 'right'];
      this.selectedDirection = 'up';
    });
})();

angular.module('dividerDemo1', ['ngMaterial'])
  .controller('AppCtrl', ["$scope", function($scope) {
    var imagePath = 'assets/angular-material-assets/img/list/60.jpeg';
    $scope.messages = [{
      face : imagePath,
      what: 'Brunch this weekend?',
      who: 'Min Li Chan',
      when: '3:08PM',
      notes: " I'll be in your neighborhood doing errands"
    }, {
      face : imagePath,
      what: 'Brunch this weekend?',
      who: 'Min Li Chan',
      when: '3:08PM',
      notes: " I'll be in your neighborhood doing errands"
    }, {
      face : imagePath,
      what: 'Brunch this weekend?',
      who: 'Min Li Chan',
      when: '3:08PM',
      notes: " I'll be in your neighborhood doing errands"
    }, {
      face : imagePath,
      what: 'Brunch this weekend?',
      who: 'Min Li Chan',
      when: '3:08PM',
      notes: " I'll be in your neighborhood doing errands"
    }, {
      face : imagePath,
      what: 'Brunch this weekend?',
      who: 'Min Li Chan',
      when: '3:08PM',
      notes: " I'll be in your neighborhood doing errands"
    }];
  }]);

angular.module('dialogDemo2', ['ngMaterial'])

.controller('AppCtrl', ["$scope", "$mdDialog", function($scope, $mdDialog) {
  $scope.openFromLeft = function() {
    $mdDialog.show(
      $mdDialog.alert()
        .clickOutsideToClose(true)
        .title('Opening from the left')
        .textContent('Closing to the right!')
        .ariaLabel('Left to right demo')
        .parent(angular.element(document.body))
        .ok('Nice!')
        // You can specify either sting with query selector
        .openFrom('#left')
        // or an element
        .closeTo(angular.element(document.querySelector('#right')))
    );
  };

  $scope.openOffscreen = function() {
    $mdDialog.show(
      $mdDialog.alert()
        .clickOutsideToClose(true)
        .title('Opening from offscreen')
        .textContent('Closing to offscreen')
        .ariaLabel('Offscreen Demo')
        .parent(angular.element(document.body))
        .ok('Amazing!')
        // Or you can specify the rect to do the transition from
        .openFrom({
          top: -50,
          width: 30,
          height: 80
        })
        .closeTo({
          left: 1500
        })
    );
  };
}]);

angular.module('dialogDemo1', ['ngMaterial'])

.controller('AppCtrl', ["$scope", "$mdDialog", "$mdMedia", function($scope, $mdDialog, $mdMedia) {
  $scope.status = '  ';
  $scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');

  $scope.showAlert = function(ev) {
    // Appending dialog to document.body to cover sidenav in docs app
    // Modal dialogs should fully cover application
    // to prevent interaction outside of dialog
    $mdDialog.show(
      $mdDialog.alert()
        .parent(angular.element(document.querySelector('#popupContainer')))
        .clickOutsideToClose(true)
        .parent(angular.element(document.body))
        .title('This is an alert title')
        .textContent('You can specify some description text in here.')
        .ariaLabel('Alert Dialog Demo')
        .ok('Got it!')
        .targetEvent(ev)
    );
  };

  $scope.showConfirm = function(ev) {
    // Appending dialog to document.body to cover sidenav in docs app
    var confirm = $mdDialog.confirm()
          .title('Would you like to delete your debt?')
          .textContent('All of the banks have agreed to forgive you your debts.')
          .ariaLabel('Lucky day')
          .targetEvent(ev)
          .clickOutsideToClose(true)
          .parent(angular.element(document.body))
          .ok('Please do it!')
          .cancel('Sounds like a scam');

    $mdDialog.show(confirm).then(function() {
      $scope.status = 'You decided to get rid of your debt.';
    }, function() {
      $scope.status = 'You decided to keep your debt.';
    });
  };

  $scope.showAdvanced = function(ev) {
    var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;

    $mdDialog.show({
      controller: DialogController,
      templateUrl: 'dialog1.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose:true,
      fullscreen: useFullScreen
    })
    .then(function(answer) {
      $scope.status = 'You said the information was "' + answer + '".';
    }, function() {
      $scope.status = 'You cancelled the dialog.';
    });



    $scope.$watch(function() {
      return $mdMedia('xs') || $mdMedia('sm');
    }, function(wantsFullScreen) {
      $scope.customFullscreen = (wantsFullScreen === true);
    });

  };

  $scope.showTabDialog = function(ev) {
    $mdDialog.show({
      controller: DialogController,
      templateUrl: 'tabDialog.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose:true
    })
        .then(function(answer) {
          $scope.status = 'You said the information was "' + answer + '".';
        }, function() {
          $scope.status = 'You cancelled the dialog.';
        });
  };
}]);

function DialogController($scope, $mdDialog) {
  $scope.hide = function() {
    $mdDialog.hide();
  };

  $scope.cancel = function() {
    $mdDialog.cancel();
  };

  $scope.answer = function(answer) {
    $mdDialog.hide(answer);
  };
}

angular.module('datepickerBasicUsage',
    ['ngMaterial', 'ngMessages']).controller('AppCtrl', ["$scope", function($scope) {
  $scope.myDate = new Date();

  $scope.minDate = new Date(
      $scope.myDate.getFullYear(),
      $scope.myDate.getMonth() - 2,
      $scope.myDate.getDate());

  $scope.maxDate = new Date(
      $scope.myDate.getFullYear(),
      $scope.myDate.getMonth() + 2,
      $scope.myDate.getDate());
  
  $scope.onlyWeekendsPredicate = function(date) {
    var day = date.getDay();
    return day === 0 || day === 6;
  }
}]);


angular.module('contentDemo1', ['ngMaterial'])

.controller('AppCtrl', ["$scope", function($scope) {

}]);

(function () {
  'use strict';
  DemoCtrl.$inject = ["$timeout", "$q"];
  angular
      .module('staticChipsDemo', ['ngMaterial'])
      .controller('DemoCtrl', DemoCtrl);

  function DemoCtrl ($timeout, $q) {
    this.chipText = 'Football';
  }
})();

(function () {
  'use strict';
  DemoCtrl.$inject = ["$mdConstant"];
  angular
      .module('chipsCustomSeparatorDemo', ['ngMaterial'])
      .controller('CustomSeparatorCtrl', DemoCtrl);

  function DemoCtrl ($mdConstant) {
    // Use common key codes found in $mdConstant.KEY_CODE...
    this.keys = [$mdConstant.KEY_CODE.ENTER, $mdConstant.KEY_CODE.COMMA];
    this.tags = [];

    // Any key code can be used to create a custom separator
    var semicolon = 186;
    this.customKeys = [$mdConstant.KEY_CODE.ENTER, $mdConstant.KEY_CODE.COMMA, semicolon];
    this.contacts = ['test@example.com'];
  }
})();

(function () {
  'use strict';
  DemoCtrl.$inject = ["$timeout", "$q"];
  angular
      .module('chipsCustomInputDemo', ['ngMaterial'])
      .controller('CustomInputDemoCtrl', DemoCtrl);

  function DemoCtrl ($timeout, $q) {
    var self = this;

    self.readonly = false;
    self.selectedItem = null;
    self.searchText = null;
    self.querySearch = querySearch;
    self.vegetables = loadVegetables();
    self.selectedVegetables = [];
    self.numberChips = [];
    self.numberChips2 = [];
    self.numberBuffer = '';
    self.autocompleteDemoRequireMatch = true;
    self.transformChip = transformChip;

    /**
     * Return the proper object when the append is called.
     */
    function transformChip(chip) {
      // If it is an object, it's already a known chip
      if (angular.isObject(chip)) {
        return chip;
      }

      // Otherwise, create a new one
      return { name: chip, type: 'new' }
    }

    /**
     * Search for vegetables.
     */
    function querySearch (query) {
      var results = query ? self.vegetables.filter(createFilterFor(query)) : [];
      return results;
    }

    /**
     * Create filter function for a query string
     */
    function createFilterFor(query) {
      var lowercaseQuery = angular.lowercase(query);

      return function filterFn(vegetable) {
        return (vegetable._lowername.indexOf(lowercaseQuery) === 0) ||
            (vegetable._lowertype.indexOf(lowercaseQuery) === 0);
      };

    }

    function loadVegetables() {
      var veggies = [
        {
          'name': 'Broccoli',
          'type': 'Brassica'
        },
        {
          'name': 'Cabbage',
          'type': 'Brassica'
        },
        {
          'name': 'Carrot',
          'type': 'Umbelliferous'
        },
        {
          'name': 'Lettuce',
          'type': 'Composite'
        },
        {
          'name': 'Spinach',
          'type': 'Goosefoot'
        }
      ];

      return veggies.map(function (veg) {
        veg._lowername = veg.name.toLowerCase();
        veg._lowertype = veg.type.toLowerCase();
        return veg;
      });
    }
  }
})();

(function () {
  'use strict';
  DemoCtrl.$inject = ["$timeout", "$q"];
  angular
      .module('contactChipsDemo', ['ngMaterial'])
      .controller('ContactChipDemoCtrl', DemoCtrl);

  function DemoCtrl ($timeout, $q) {
    var self = this;

    self.querySearch = querySearch;
    self.allContacts = loadContacts();
    self.contacts = [self.allContacts[0]];
    self.filterSelected = true;

    /**
     * Search for contacts.
     */
    function querySearch (query) {
      var results = query ?
          self.allContacts.filter(createFilterFor(query)) : [];
      return results;
    }

    /**
     * Create filter function for a query string
     */
    function createFilterFor(query) {
      var lowercaseQuery = angular.lowercase(query);

      return function filterFn(contact) {
        return (contact._lowername.indexOf(lowercaseQuery) != -1);;
      };

    }

    function loadContacts() {
      var contacts = [
        'Marina Augustine',
        'Oddr Sarno',
        'Nick Giannopoulos',
        'Narayana Garner',
        'Anita Gros',
        'Megan Smith',
        'Tsvetko Metzger',
        'Hector Simek',
        'Some-guy withalongalastaname'
      ];

      return contacts.map(function (c, index) {
        var cParts = c.split(' ');
        var contact = {
          name: c,
          email: cParts[0][0].toLowerCase() + '.' + cParts[1].toLowerCase() + '@example.com',
          image: 'http://lorempixel.com/50/50/people?' + index
        };
        contact._lowername = contact.name.toLowerCase();
        return contact;
      });
    }
  }


})();

(function () {
  'use strict';
  DemoCtrl.$inject = ["$timeout", "$q"];
  angular
      .module('chipsDemo', ['ngMaterial'])
      .controller('BasicDemoCtrl', DemoCtrl);

  function DemoCtrl ($timeout, $q) {
    var self = this;

    self.readonly = false;

    // Lists of fruit names and Vegetable objects
    self.fruitNames = ['Apple', 'Banana', 'Orange'];
    self.roFruitNames = angular.copy(self.fruitNames);
    self.tags = [];
    self.vegObjs = [
      {
        'name' : 'Broccoli',
        'type' : 'Brassica'
      },
      {
        'name' : 'Cabbage',
        'type' : 'Brassica'
      },
      {
        'name' : 'Carrot',
        'type' : 'Umbelliferous'
      }
    ];

    self.newVeg = function(chip) {
      return {
        name: chip,
        type: 'unknown'
      };
    };
  }
})();


angular.module('checkboxDemo2', ['ngMaterial'])

.controller('AppCtrl', ["$scope", function($scope) {

    $scope.items = [1,2,3,4,5];
      $scope.selected = [];

      $scope.toggle = function (item, list) {
        var idx = list.indexOf(item);
        if (idx > -1) list.splice(idx, 1);
        else list.push(item);
      };

      $scope.exists = function (item, list) {
        return list.indexOf(item) > -1;
      };
}]);


angular.module('checkboxDemo1', ['ngMaterial'])

.controller('AppCtrl', ["$scope", function($scope) {

  $scope.data = {};
  $scope.data.cb1 = true;
  $scope.data.cb2 = false;
  $scope.data.cb3 = false;
  $scope.data.cb4 = false;
  $scope.data.cb5 = false;

}]);


angular.module('cardDemo1', ['ngMaterial'])

.controller('AppCtrl', ["$scope", function($scope) {
  $scope.imagePath = 'assets/angular-material-assets/img/washedout.png';
}]);


angular.module('cardDemo1', ['ngMaterial'])

.controller('AppCtrl', ["$scope", function($scope) {
  $scope.imagePath = 'assets/angular-material-assets/img/washedout.png';
}]);


angular.module('cardDemo1', ['ngMaterial'])

.controller('AppCtrl', ["$scope", function($scope) {
  $scope.imagePath = 'assets/angular-material-assets/img/washedout.png';
}]);


angular.module('buttonsDemo1', ['ngMaterial'])

.controller('AppCtrl', ["$scope", function($scope) {
  $scope.title1 = 'Button';
  $scope.title4 = 'Warn';
  $scope.isDisabled = true;

  $scope.googleUrl = 'http://google.com';

}]);

angular.module('bottomSheetDemo1', ['ngMaterial'])
.config(["$mdIconProvider", function($mdIconProvider) {
    $mdIconProvider
      .icon('share-arrow', 'assets/angular-material-assets/img/icons/share-arrow.svg', 24)
      .icon('upload', 'assets/angular-material-assets/img/icons/upload.svg', 24)
      .icon('copy', 'assets/angular-material-assets/img/icons/copy.svg', 24)
      .icon('print', 'assets/angular-material-assets/img/icons/print.svg', 24)
      .icon('hangout', 'assets/angular-material-assets/img/icons/hangout.svg', 24)
      .icon('mail', 'assets/angular-material-assets/img/icons/mail.svg', 24)
      .icon('message', 'assets/angular-material-assets/img/icons/message.svg', 24)
      .icon('copy2', 'assets/angular-material-assets/img/icons/copy2.svg', 24)
      .icon('facebook', 'assets/angular-material-assets/img/icons/facebook.svg', 24)
      .icon('twitter', 'assets/angular-material-assets/img/icons/twitter.svg', 24);
  }])
.controller('BottomSheetExample', ["$scope", "$timeout", "$mdBottomSheet", "$mdToast", function($scope, $timeout, $mdBottomSheet, $mdToast) {
  $scope.alert = '';

  $scope.showListBottomSheet = function() {
    $scope.alert = '';
    $mdBottomSheet.show({
      templateUrl: 'bottom-sheet-list-template.html',
      controller: 'ListBottomSheetCtrl'
    }).then(function(clickedItem) {
      $scope.alert = clickedItem['name'] + ' clicked!';
    });
  };

  $scope.showGridBottomSheet = function() {
    $scope.alert = '';
    $mdBottomSheet.show({
      templateUrl: 'bottom-sheet-grid-template.html',
      controller: 'GridBottomSheetCtrl',
      clickOutsideToClose: false
    }).then(function(clickedItem) {
      $mdToast.show(
            $mdToast.simple()
              .textContent(clickedItem['name'] + ' clicked!')
              .position('top right')
              .hideDelay(1500)
          );
    });
  };
}])

.controller('ListBottomSheetCtrl', ["$scope", "$mdBottomSheet", function($scope, $mdBottomSheet) {

  $scope.items = [
    { name: 'Share', icon: 'share-arrow' },
    { name: 'Upload', icon: 'upload' },
    { name: 'Copy', icon: 'copy' },
    { name: 'Print this page', icon: 'print' },
  ];

  $scope.listItemClick = function($index) {
    var clickedItem = $scope.items[$index];
    $mdBottomSheet.hide(clickedItem);
  };
}])
.controller('GridBottomSheetCtrl', ["$scope", "$mdBottomSheet", function($scope, $mdBottomSheet) {
  $scope.items = [
    { name: 'Hangout', icon: 'hangout' },
    { name: 'Mail', icon: 'mail' },
    { name: 'Message', icon: 'message' },
    { name: 'Copy', icon: 'copy2' },
    { name: 'Facebook', icon: 'facebook' },
    { name: 'Twitter', icon: 'twitter' },
  ];

  $scope.listItemClick = function($index) {
    var clickedItem = $scope.items[$index];
    $mdBottomSheet.hide(clickedItem);
  };
}])
.run(["$http", "$templateCache", function($http, $templateCache) {

    var urls = [
      'assets/angular-material-assets/img/icons/share-arrow.svg',
      'assets/angular-material-assets/img/icons/upload.svg',
      'assets/angular-material-assets/img/icons/copy.svg',
      'assets/angular-material-assets/img/icons/print.svg',
      'assets/angular-material-assets/img/icons/hangout.svg',
      'assets/angular-material-assets/img/icons/mail.svg',
      'assets/angular-material-assets/img/icons/message.svg',
      'assets/angular-material-assets/img/icons/copy2.svg',
      'assets/angular-material-assets/img/icons/facebook.svg',
      'assets/angular-material-assets/img/icons/twitter.svg'
    ];

    angular.forEach(urls, function(url) {
      $http.get(url, {cache: $templateCache});
    });

  }]);

(function () {
  'use strict';
  DemoCtrl.$inject = ["$mdDialog"];
  DialogCtrl.$inject = ["$timeout", "$q", "$scope", "$mdDialog"];
  angular
      .module('autocompleteDemoInsideDialog', ['ngMaterial'])
      .controller('DemoCtrl', DemoCtrl);

  function DemoCtrl($mdDialog) {
    var self = this;

    self.openDialog = function($event) {
      $mdDialog.show({
        controller: DialogCtrl,
        controllerAs: 'ctrl',
        templateUrl: 'dialog.tmpl.html',
        parent: angular.element(document.body),
        targetEvent: $event,
        clickOutsideToClose:true
      })
    }
  }

  function DialogCtrl ($timeout, $q, $scope, $mdDialog) {
    var self = this;

    // list of `state` value/display objects
    self.states        = loadAll();
    self.querySearch   = querySearch;

    // ******************************
    // Template methods
    // ******************************

    self.cancel = function($event) {
      $mdDialog.cancel();
    };
    self.finish = function($event) {
      $mdDialog.hide();
    };

    // ******************************
    // Internal methods
    // ******************************

    /**
     * Search for states... use $timeout to simulate
     * remote dataservice call.
     */
    function querySearch (query) {
      return query ? self.states.filter( createFilterFor(query) ) : self.states;
    }

    /**
     * Build `states` list of key/value pairs
     */
    function loadAll() {
      var allStates = 'Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware,\
              Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana,\
              Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana,\
              Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina,\
              North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, Rhode Island, South Carolina,\
              South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia,\
              Wisconsin, Wyoming';

      return allStates.split(/, +/g).map( function (state) {
        return {
          value: state.toLowerCase(),
          display: state
        };
      });
    }

    /**
     * Create filter function for a query string
     */
    function createFilterFor(query) {
      var lowercaseQuery = angular.lowercase(query);

      return function filterFn(state) {
        return (state.value.indexOf(lowercaseQuery) === 0);
      };

    }
  }
})();

(function () {
  'use strict';
  DemoCtrl.$inject = ["$timeout", "$q"];
  angular
      .module('autocompleteFloatingLabelDemo', ['ngMaterial', 'ngMessages'])
      .controller('DemoCtrl', DemoCtrl);

  function DemoCtrl ($timeout, $q) {
    var self = this;

    // list of `state` value/display objects
    self.states        = loadAll();
    self.selectedItem  = null;
    self.searchText    = null;
    self.querySearch   = querySearch;

    // ******************************
    // Internal methods
    // ******************************

    /**
     * Search for states... use $timeout to simulate
     * remote dataservice call.
     */
    function querySearch (query) {
      var results = query ? self.states.filter( createFilterFor(query) ) : [];
      return results;
    }

    /**
     * Build `states` list of key/value pairs
     */
    function loadAll() {
      var allStates = 'Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware,\
              Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana,\
              Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana,\
              Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina,\
              North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, Rhode Island, South Carolina,\
              South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia,\
              Wisconsin, Wyoming';

      return allStates.split(/, +/g).map( function (state) {
        return {
          value: state.toLowerCase(),
          display: state
        };
      });
    }

    /**
     * Create filter function for a query string
     */
    function createFilterFor(query) {
      var lowercaseQuery = angular.lowercase(query);

      return function filterFn(state) {
        return (state.value.indexOf(lowercaseQuery) === 0);
      };

    }
  }
})();

(function () {
  'use strict';
  DemoCtrl.$inject = ["$timeout", "$q", "$log"];
  angular
      .module('autocompleteCustomTemplateDemo', ['ngMaterial'])
      .controller('DemoCtrl', DemoCtrl);

  function DemoCtrl ($timeout, $q, $log) {
    var self = this;

    self.simulateQuery = false;
    self.isDisabled    = false;

    self.repos         = loadAll();
    self.querySearch   = querySearch;
    self.selectedItemChange = selectedItemChange;
    self.searchTextChange   = searchTextChange;

    // ******************************
    // Internal methods
    // ******************************

    /**
     * Search for repos... use $timeout to simulate
     * remote dataservice call.
     */
    function querySearch (query) {
      var results = query ? self.repos.filter( createFilterFor(query) ) : self.repos,
          deferred;
      if (self.simulateQuery) {
        deferred = $q.defer();
        $timeout(function () { deferred.resolve( results ); }, Math.random() * 1000, false);
        return deferred.promise;
      } else {
        return results;
      }
    }

    function searchTextChange(text) {
      $log.info('Text changed to ' + text);
    }

    function selectedItemChange(item) {
      $log.info('Item changed to ' + JSON.stringify(item));
    }

    /**
     * Build `components` list of key/value pairs
     */
    function loadAll() {
      var repos = [
        {
          'name'      : 'Angular 1',
          'url'       : 'https://github.com/angular/angular.js',
          'watchers'  : '3,623',
          'forks'     : '16,175',
        },
        {
          'name'      : 'Angular 2',
          'url'       : 'https://github.com/angular/angular',
          'watchers'  : '469',
          'forks'     : '760',
        },
        {
          'name'      : 'Angular Material',
          'url'       : 'https://github.com/angular/material',
          'watchers'  : '727',
          'forks'     : '1,241',
        },
        {
          'name'      : 'Bower Material',
          'url'       : 'https://github.com/angular/bower-material',
          'watchers'  : '42',
          'forks'     : '84',
        },
        {
          'name'      : 'Material Start',
          'url'       : 'https://github.com/angular/material-start',
          'watchers'  : '81',
          'forks'     : '303',
        }
      ];
      return repos.map( function (repo) {
        repo.value = repo.name.toLowerCase();
        return repo;
      });
    }

    /**
     * Create filter function for a query string
     */
    function createFilterFor(query) {
      var lowercaseQuery = angular.lowercase(query);

      return function filterFn(item) {
        return (item.value.indexOf(lowercaseQuery) === 0);
      };

    }
  }
})();

(function () {
  'use strict';
  DemoCtrl.$inject = ["$timeout", "$q", "$log"];
  angular
      .module('autocompleteDemo', ['ngMaterial'])
      .controller('DemoCtrl', DemoCtrl);

  function DemoCtrl ($timeout, $q, $log) {
    var self = this;

    self.simulateQuery = false;
    self.isDisabled    = false;

    // list of `state` value/display objects
    self.states        = loadAll();
    self.querySearch   = querySearch;
    self.selectedItemChange = selectedItemChange;
    self.searchTextChange   = searchTextChange;

    self.newState = newState;

    function newState(state) {
      alert("Sorry! You'll need to create a Constituion for " + state + " first!");
    }

    // ******************************
    // Internal methods
    // ******************************

    /**
     * Search for states... use $timeout to simulate
     * remote dataservice call.
     */
    function querySearch (query) {
      var results = query ? self.states.filter( createFilterFor(query) ) : self.states,
          deferred;
      if (self.simulateQuery) {
        deferred = $q.defer();
        $timeout(function () { deferred.resolve( results ); }, Math.random() * 1000, false);
        return deferred.promise;
      } else {
        return results;
      }
    }

    function searchTextChange(text) {
      $log.info('Text changed to ' + text);
    }

    function selectedItemChange(item) {
      $log.info('Item changed to ' + JSON.stringify(item));
    }

    /**
     * Build `states` list of key/value pairs
     */
    function loadAll() {
      var allStates = 'Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware,\
              Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana,\
              Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana,\
              Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina,\
              North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, Rhode Island, South Carolina,\
              South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia,\
              Wisconsin, Wyoming';

      return allStates.split(/, +/g).map( function (state) {
        return {
          value: state.toLowerCase(),
          display: state
        };
      });
    }

    /**
     * Create filter function for a query string
     */
    function createFilterFor(query) {
      var lowercaseQuery = angular.lowercase(query);

      return function filterFn(state) {
        return (state.value.indexOf(lowercaseQuery) === 0);
      };

    }
  }
})();

(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.theme-colors', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_theme-colors', {
            url      : '/ui/theme-colors',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/ui/theme-colors/theme-colors.html',
                    controller : 'ThemeColorsController as vm'
                }
            },
            bodyClass: 'theme-colors'
        });
    }

})();
(function ()
{
    'use strict';

    CustomThemeDialogController.$inject = ["fuseTheming", "$mdDialog", "fuseGenerator", "$cookies", "$window"];
    angular
        .module('app.ui.theme-colors')
        .controller('CustomThemeDialogController', CustomThemeDialogController);

    /** @ngInject */
    function CustomThemeDialogController(fuseTheming, $mdDialog, fuseGenerator, $cookies, $window)
    {
        // Data
        var vm = this;
        vm.palettes = fuseTheming.getRegisteredPalettes();
        vm.themes = fuseTheming.getRegisteredThemes();

        // Delete Unnecessary hue value
        delete vm.palettes.grey['1000'];

        // Methods
        vm.rgba = fuseGenerator.rgba;
        vm.setTheme = setTheme;
        vm.closeDialog = closeDialog;

        //////////

        // If custom theme exist keep using it otherwise set default as a custom
        if ( !vm.themes.custom )
        {
            vm.theme = angular.copy(vm.themes['default'].colors);
        }
        else
        {
            vm.theme = vm.themes.custom.colors;
        }

        /**
         * Put custom theme into the cookies
         * and reload for generate styles
         */
        function setTheme()
        {
            $cookies.putObject('customTheme', vm.theme);
            $cookies.put('selectedTheme', 'custom');
            $window.location.reload();
        }

        /**
         * Close dialog
         */
        function closeDialog()
        {
            $mdDialog.hide();
        }
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.page-layouts.simple.tabbed', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_page-layouts_simple_tabbed', {
            url  : '/ui/page-layouts/simple/tabbed',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/page-layouts/simple/tabbed/tabbed.html',
                    controller : 'SimpleTabbedController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.ui.page-layouts.simple.tabbed')
        .controller('SimpleTabbedController', SimpleTabbedController);

    /** @ngInject */
    function SimpleTabbedController()
    {
        // Data

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.page-layouts.simple.right-sidenav-ii', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_page-layouts_simple_right-sidenav-ii', {
            url  : '/ui/page-layouts/simple/right-sidenav-ii',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/page-layouts/simple/right-sidenav-ii/right-sidenav-ii.html',
                    controller : 'SimpleRightSidenavIIController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    SimpleRightSidenavIIController.$inject = ["$mdSidenav"];
    angular
        .module('app.ui.page-layouts.simple.right-sidenav-ii')
        .controller('SimpleRightSidenavIIController', SimpleRightSidenavIIController);

    /** @ngInject */
    function SimpleRightSidenavIIController($mdSidenav)
    {
        var vm = this;

        // Data

        // Methods
        vm.toggleSidenav = toggleSidenav;

        //////////

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.page-layouts.simple.right-sidenav', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_page-layouts_simple_right-sidenav', {
            url  : '/ui/page-layouts/simple/right-sidenav',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/page-layouts/simple/right-sidenav/right-sidenav.html',
                    controller : 'SimpleRightSidenavController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    SimpleRightSidenavController.$inject = ["$mdSidenav"];
    angular
        .module('app.ui.page-layouts.simple.right-sidenav')
        .controller('SimpleRightSidenavController', SimpleRightSidenavController);

    /** @ngInject */
    function SimpleRightSidenavController($mdSidenav)
    {
        var vm = this;

        // Data

        // Methods
        vm.toggleSidenav = toggleSidenav;

        //////////

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.page-layouts.simple.left-sidenav-ii', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_page-layouts_simple_left-sidenav-ii', {
            url  : '/ui/page-layouts/simple/left-sidenav-ii',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/page-layouts/simple/left-sidenav-ii/left-sidenav-ii.html',
                    controller : 'SimpleLeftSidenavIIController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    SimpleLeftSidenavIIController.$inject = ["$mdSidenav"];
    angular
        .module('app.ui.page-layouts.simple.left-sidenav-ii')
        .controller('SimpleLeftSidenavIIController', SimpleLeftSidenavIIController);

    /** @ngInject */
    function SimpleLeftSidenavIIController($mdSidenav)
    {
        var vm = this;

        // Data

        // Methods
        vm.toggleSidenav = toggleSidenav;

        //////////

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.page-layouts.simple.left-sidenav', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_page-layouts_simple_left-sidenav', {
            url  : '/ui/page-layouts/simple/left-sidenav',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/page-layouts/simple/left-sidenav/left-sidenav.html',
                    controller : 'SimpleLeftSidenavController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    SimpleLeftSidenavController.$inject = ["$mdSidenav"];
    angular
        .module('app.ui.page-layouts.simple.left-sidenav')
        .controller('SimpleLeftSidenavController', SimpleLeftSidenavController);

    /** @ngInject */
    function SimpleLeftSidenavController($mdSidenav)
    {
        var vm = this;

        // Data

        // Methods
        vm.toggleSidenav = toggleSidenav;

        //////////

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.page-layouts.simple.fullwidth', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_page-layouts_simple_fullwidth', {
            url  : '/ui/page-layouts/simple/fullwidth',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/page-layouts/simple/fullwidth/fullwidth.html',
                    controller : 'SimpleFullwidthController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.ui.page-layouts.simple.fullwidth')
        .controller('SimpleFullwidthController', SimpleFullwidthController);

    /** @ngInject */
    function SimpleFullwidthController()
    {
        // Data

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.page-layouts.carded.right-sidenav-ii', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_page-layouts_carded_right-sidenav-ii', {
            url  : '/ui/page-layouts/carded/right-sidenav-ii',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/page-layouts/carded/right-sidenav-ii/right-sidenav-ii.html',
                    controller : 'CardedRightSidenavIIController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    CardedRightSidenavIIController.$inject = ["$mdSidenav"];
    angular
        .module('app.ui.page-layouts.carded.right-sidenav-ii')
        .controller('CardedRightSidenavIIController', CardedRightSidenavIIController);

    /** @ngInject */
    function CardedRightSidenavIIController($mdSidenav)
    {
        var vm = this;

        // Data

        // Methods
        vm.toggleSidenav = toggleSidenav;

        //////////

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.page-layouts.carded.right-sidenav', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_page-layouts_carded_right-sidenav', {
            url  : '/ui/page-layouts/carded/right-sidenav',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/page-layouts/carded/right-sidenav/right-sidenav.html',
                    controller : 'CardedRightSidenavController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    CardedRightSidenavController.$inject = ["$mdSidenav"];
    angular
        .module('app.ui.page-layouts.carded.right-sidenav')
        .controller('CardedRightSidenavController', CardedRightSidenavController);

    /** @ngInject */
    function CardedRightSidenavController($mdSidenav)
    {
        var vm = this;

        // Data

        // Methods
        vm.toggleSidenav = toggleSidenav;

        //////////

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.page-layouts.carded.left-sidenav-ii', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_page-layouts_carded_left-sidenav-ii', {
            url  : '/ui/page-layouts/carded/left-sidenav-ii',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/page-layouts/carded/left-sidenav-ii/left-sidenav-ii.html',
                    controller : 'CardedLeftSidenavIIController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    CardedLeftSidenavIIController.$inject = ["$mdSidenav"];
    angular
        .module('app.ui.page-layouts.carded.left-sidenav-ii')
        .controller('CardedLeftSidenavIIController', CardedLeftSidenavIIController);

    /** @ngInject */
    function CardedLeftSidenavIIController($mdSidenav)
    {
        var vm = this;

        // Data

        // Methods
        vm.toggleSidenav = toggleSidenav;

        //////////

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.page-layouts.carded.left-sidenav', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_page-layouts_carded_left-sidenav', {
            url  : '/ui/page-layouts/carded/left-sidenav',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/page-layouts/carded/left-sidenav/left-sidenav.html',
                    controller : 'CardedLeftSidenavController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    CardedLeftSidenavController.$inject = ["$mdSidenav"];
    angular
        .module('app.ui.page-layouts.carded.left-sidenav')
        .controller('CardedLeftSidenavController', CardedLeftSidenavController);

    /** @ngInject */
    function CardedLeftSidenavController($mdSidenav)
    {
        var vm = this;

        // Data

        // Methods
        vm.toggleSidenav = toggleSidenav;

        //////////

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.page-layouts.carded.fullwidth-ii', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_page-layouts_carded_fullwidth-ii', {
            url  : '/ui/page-layouts/carded/fullwidth-ii',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/page-layouts/carded/fullwidth-ii/fullwidth-ii.html',
                    controller : 'CardedFullwidthIIController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.ui.page-layouts.carded.fullwidth-ii')
        .controller('CardedFullwidthIIController', CardedFullwidthIIController);

    /** @ngInject */
    function CardedFullwidthIIController()
    {
        // Data

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.page-layouts.carded.fullwidth', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_page-layouts_carded_fullwidth', {
            url  : '/ui/page-layouts/carded/fullwidth',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/page-layouts/carded/fullwidth/fullwidth.html',
                    controller : 'CardedFullwidthController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.ui.page-layouts.carded.fullwidth')
        .controller('CardedFullwidthController', CardedFullwidthController);

    /** @ngInject */
    function CardedFullwidthController()
    {
        // Data

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.todo', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.to-do', {
            url      : '/to-do',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/apps/todo/todo.html',
                    controller : 'TodoController as vm'
                }
            },
            resolve  : {
                Tasks: ["msApi", function (msApi)
                {
                    return msApi.resolve('todo.tasks@get');
                }],
                Tags : ["msApi", function (msApi)
                {
                    return msApi.resolve('todo.tags@get');
                }]
            },
            bodyClass: 'todo'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/todo');

        // Api
        msApiProvider.register('todo.tasks', ['app/data/todo/tasks.json']);
        msApiProvider.register('todo.tags', ['app/data/todo/tags.json']);

        // Navigation
        msNavigationServiceProvider.saveItem('apps.to-do', {
            title : 'To-Do',
            icon  : 'icon-checkbox-marked',
            state : 'app.to-do',
            badge : {
                content: 3,
                color  : '#4CAF50'
            },
            weight: 7
        });
    }

})();
(function ()
{
    'use strict';

    TaskDialogController.$inject = ["$mdDialog", "Task", "Tasks", "event"];
    angular
        .module('app.todo')
        .controller('TaskDialogController', TaskDialogController);

    /** @ngInject */
    function TaskDialogController($mdDialog, Task, Tasks, event)
    {
        var vm = this;

        // Data
        vm.title = 'Edit Task';
        vm.task = angular.copy(Task);
        vm.tasks = Tasks;
        vm.newTask = false;

        if ( !vm.task )
        {
            vm.task = {
                'id'                : '',
                'title'             : '',
                'notes'             : '',
                'startDate'         : new Date(),
                'startDateTimeStamp': new Date().getTime(),
                'dueDate'           : '',
                'dueDateTimeStamp'  : '',
                'completed'         : false,
                'starred'           : false,
                'important'         : false,
                'deleted'           : false,
                'tags'              : []
            };
            vm.title = 'New Task';
            vm.newTask = true;
            vm.task.tags = [];
        }

        // Methods
        vm.addNewTask = addNewTask;
        vm.saveTask = saveTask;
        vm.deleteTask = deleteTask;
        vm.newTag = newTag;
        vm.closeDialog = closeDialog;

        //////////

        /**
         * Add new task
         */
        function addNewTask()
        {
            vm.tasks.unshift(vm.task);

            closeDialog();
        }

        /**
         * Save task
         */
        function saveTask()
        {
            // Dummy save action
            for ( var i = 0; i < vm.tasks.length; i++ )
            {
                if ( vm.tasks[i].id === vm.task.id )
                {
                    vm.tasks[i] = angular.copy(vm.task);
                    break;
                }
            }

            closeDialog();
        }

        /**
         * Delete task
         */
        function deleteTask()
        {
            var confirm = $mdDialog.confirm()
                .title('Are you sure?')
                .content('The Task will be deleted.')
                .ariaLabel('Delete Task')
                .ok('Delete')
                .cancel('Cancel')
                .targetEvent(event);

            $mdDialog.show(confirm).then(function ()
            {
                // Dummy delete action
                for ( var i = 0; i < vm.tasks.length; i++ )
                {
                    if ( vm.tasks[i].id === vm.task.id )
                    {
                        vm.tasks[i].deleted = true;
                        break;
                    }
                }
            }, function ()
            {
                // Cancel Action
            });
        }


        /**
         * New tag
         *
         * @param chip
         * @returns {{label: *, color: string}}
         */
        function newTag(chip)
        {
            var tagColors = ['#388E3C', '#F44336', '#FF9800', '#0091EA', '#9C27B0'];

            return {
                name : chip,
                label: chip,
                color: tagColors[Math.floor(Math.random() * (tagColors.length))]
            };
        }

        /**
         * Close dialog
         */
        function closeDialog()
        {
            $mdDialog.hide();
        }
    }
})();
(function ()
{
    'use strict';

    CalendarViewController.$inject = ["$scope", "$document", "$mdDialog", "$mdSidenav", "BoardService", "DialogService"];
    angular
        .module('app.scrumboard')
        .controller('CalendarViewController', CalendarViewController);

    /** @ngInject */
    function CalendarViewController($scope, $document, $mdDialog, $mdSidenav, BoardService, DialogService)
    {
        var vm = this;

        // Data
        vm.board = BoardService.data;
        vm.eventSources = [];

        vm.calendarUiConfig = {
            calendar: {
                editable                 : true,
                eventLimit               : true,
                header                   : '',
                handleWindowResize       : false,
                aspectRatio              : 1,
                dayNames                 : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                dayNamesShort            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                timezone                 : 'local',
                eventDurationEditable    : false,
                defaultTimedEventDuration: '01:00:00',
                viewRender               : function (view)
                {
                    vm.calendarView = view;
                    vm.calendar = vm.calendarView.calendar;
                    vm.currentMonthShort = vm.calendar.getDate().format('MMM');
                },
                columnFormat             : {
                    month: 'ddd',
                    week : 'ddd D',
                    day  : 'ddd D'
                },
                eventClick               : function eventDetail(calendarEvent, ev)
                {
                    vm.openCardDialog(ev, calendarEvent.idCard);
                },
                eventDrop                : function (event)
                {
                    vm.board.cards.getById(event.idCard).due = moment.utc(event.start).format('x');
                },
                selectable               : true,
                selectHelper             : true,
                dayClick                 : function (date, ev)
                {
                    var offset = moment().utcOffset();
                    var corrDate = '';

                    if ( offset < 0 )
                    {
                        corrDate = moment.utc(date).subtract(offset, 'm').format('x');
                    }
                    else
                    {
                        corrDate = moment.utc(date).add(offset, 'm').format('x');
                    }

                    eventDialog(corrDate, ev);
                }
            }
        };

        // Methods
        vm.next = next;
        vm.prev = prev;
        vm.goToDate = goToDate;
        vm.openCardDialog = DialogService.openCardDialog;
        vm.toggleSidenav = toggleSidenav;

        //////////

        init();

        /**
         * Initialize
         */
        function init()
        {
            vm.cards = getScheduledCards();
            vm.eventSources[0] = vm.cards;
        }

        /**
         * Get scheduled cards and prepare
         * them to show on the calendar
         *
         * @returns {Array}
         */
        function getScheduledCards()
        {
            var cards = [];

            angular.forEach(vm.board.cards, function (card)
            {
                if ( card.due )
                {
                    cards.push({
                        idCard         : card.id,
                        title          : card.name,
                        start          : moment.utc(card.due, 'x'),
                        due            : card.due,
                        backgroundColor: getEventBgColor(card.due)
                    });
                }
            });

            return cards;
        }

        /**
         * Get background color
         *
         * @param cardDue
         * @returns {*}
         */
        function getEventBgColor(cardDue)
        {
            if ( moment() > moment(cardDue, 'x') )
            {
                return '#F44336';
            }

            return '#4CAF50';
        }

        /**
         * Watch board changes
         */
        $scope.$watch('vm.board', function (current, old)
        {
            if ( angular.equals(current, old) )
            {
                return;
            }

            init();

        }, true);

        /**
         * Go to Date
         *
         * @param date
         */
        function goToDate(date)
        {
            vm.calendarView.calendar.gotoDate(date);
            $mdSidenav('scheduled-tasks-sidenav').close();
        }

        /**
         * Go to next on current view (week, month etc.)
         */
        function next()
        {
            vm.calendarView.calendar.next();
        }

        /**
         * Go to previous on current view (week, month etc.)
         */
        function prev()
        {
            vm.calendarView.calendar.prev();
        }

        /**
         * Event Dialog
         */
        function eventDialog(date, ev)
        {
            $mdDialog.show({
                templateUrl        : 'app/main/apps/scrumboard/views/calendar/dialogs/event/event-dialog.html',
                controller         : 'ScrumboardCalendarEventDialogController',
                controllerAs       : 'vm',
                parent             : $document.find('#scrumboard'),
                targetEvent        : ev,
                clickOutsideToClose: true,
                locals             : {
                    dueDate: date
                }
            });
        }

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }

    }
})();
(function ()
{
    'use strict';

    BoardsViewController.$inject = ["BoardList"];
    angular
        .module('app.scrumboard')
        .controller('BoardsViewController', BoardsViewController);

    /** @ngInject */
    function BoardsViewController(BoardList)
    {
        var vm = this;

        // Data
        vm.boardList = BoardList.data;

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    BoardViewController.$inject = ["$document", "$window", "$timeout", "$mdDialog", "msUtils", "BoardList", "BoardService", "CardFilters", "DialogService"];
    angular
        .module('app.scrumboard')
        .controller('BoardViewController', BoardViewController);

    /** @ngInject */
    function BoardViewController($document, $window, $timeout, $mdDialog, msUtils, BoardList, BoardService, CardFilters, DialogService)
    {
        var vm = this;

        // Data
        vm.currentView = 'board';
        vm.board = BoardService.data;
        vm.boardList = BoardList.data;
        vm.cardFilters = CardFilters;
        vm.card = {};
        vm.cardOptions = {};
        vm.newListName = '';
        vm.sortableListOptions = {
            axis       : 'x',
            delay      : 75,
            distance   : 7,
            items      : '> .list-wrapper',
            handle     : '.list-header',
            placeholder: 'list-wrapper list-sortable-placeholder',
            tolerance  : 'pointer',
            start      : function (event, ui)
            {
                var width = ui.item[0].children[0].clientWidth;
                var height = ui.item[0].children[0].clientHeight;
                ui.placeholder.css({
                    'min-width': width + 'px',
                    'width'    : width + 'px',
                    'height'   : height + 'px'
                });
            }
        };
        vm.sortableCardOptions = {
            appendTo            : 'body',
            connectWith         : '.list-cards',
            delay               : 75,
            distance            : 7,
            forceHelperSize     : true,
            forcePlaceholderSize: true,
            handle              : msUtils.isMobile() ? '.list-card-sort-handle' : false,
            helper              : function (event, el)
            {
                return el.clone().addClass('list-card-sort-helper');
            },
            placeholder         : 'list-card card-sortable-placeholder',
            tolerance           : 'pointer',
            scroll              : true,
            sort                : function (event, ui)
            {
                var listContentEl = ui.placeholder.closest('.list-content');
                var boardContentEl = ui.placeholder.closest('#board');

                if ( listContentEl )
                {
                    var listContentElHeight = listContentEl[0].clientHeight,
                        listContentElScrollHeight = listContentEl[0].scrollHeight;

                    if ( listContentElHeight !== listContentElScrollHeight )
                    {
                        var itemTop = ui.position.top,
                            itemBottom = itemTop + ui.item.height(),
                            listTop = listContentEl.offset().top,
                            listBottom = listTop + listContentElHeight;

                        if ( itemTop < listTop + 25 )
                        {
                            listContentEl.scrollTop(listContentEl.scrollTop() - 25);
                        }

                        if ( itemBottom > listBottom - 25 )
                        {
                            listContentEl.scrollTop(listContentEl.scrollTop() + 25);
                        }
                    }
                }

                if ( boardContentEl )
                {
                    var boardContentElWidth = boardContentEl[0].clientWidth;
                    var boardContentElScrollWidth = boardContentEl[0].scrollWidth;

                    if ( boardContentElWidth !== boardContentElScrollWidth )
                    {
                        var itemLeft = ui.position.left,
                            itemRight = itemLeft + ui.item.width(),
                            boardLeft = boardContentEl.offset().left,
                            boardRight = boardLeft + boardContentElWidth;

                        if ( itemLeft < boardLeft + 25 )
                        {
                            boardContentEl.scrollLeft(boardContentEl.scrollLeft() - 25);
                        }

                        if ( itemRight > boardRight )
                        {
                            boardContentEl.scrollLeft(boardContentEl.scrollLeft() + 25);
                        }
                    }
                }
            }
        };

        // Methods
        vm.openCardDialog = DialogService.openCardDialog;
        vm.addNewList = addNewList;
        vm.removeList = removeList;
        vm.cardFilter = cardFilter;
        vm.isOverdue = isOverdue;

        //////////

        init();

        /**
         * Initialize
         */
        function init()
        {

            $timeout(function ()
            {
                // IE list-content max-height hack
                if ( angular.element('html').hasClass('explorer') )
                {
                    // Calculate the height for the first time
                    calculateListContentHeight();

                    // Attach calculateListContentHeight function to window resize
                    $window.onresize = function ()
                    {
                        calculateListContentHeight();
                    };
                }
            }, 0);

        }

        /**
         * IE ONLY
         * Calculate the list-content height
         * IE ONLY
         */
        function calculateListContentHeight()
        {
            var boardEl = angular.element('#board');
            var boardElHeight = boardEl.height();

            boardEl.find('.list-wrapper').each(function (index, el)
            {
                // Get the required heights for calculations
                var listWrapperEl = angular.element(el),
                    listHeaderElHeight = listWrapperEl.find('.list-header').height(),
                    listFooterElHeight = listWrapperEl.find('.list-footer').height();

                // Calculate the max height
                var maxHeight = boardElHeight - listHeaderElHeight - listFooterElHeight;

                // Add the max height
                listWrapperEl.find('.list-content').css({'max-height': maxHeight});
            });
        }

        /**
         * Add new list
         */
        function addNewList()
        {
            if ( vm.newListName === '' )
            {
                return;
            }

            vm.board.lists.push({
                id     : msUtils.guidGenerator(),
                name   : vm.newListName,
                idCards: []
            });

            vm.newListName = '';
        }

        /**
         * Remove list
         *
         * @param ev
         * @param list
         */
        function removeList(ev, list)
        {
            var confirm = $mdDialog.confirm({
                title              : 'Remove List',
                parent             : $document.find('#scrumboard'),
                textContent        : 'Are you sure want to remove list?',
                ariaLabel          : 'remove list',
                targetEvent        : ev,
                clickOutsideToClose: true,
                escapeToClose      : true,
                ok                 : 'Remove',
                cancel             : 'Cancel'
            });
            $mdDialog.show(confirm).then(function ()
            {
                vm.board.lists.splice(vm.board.lists.indexOf(list), 1);
            }, function ()
            {
                // Canceled
            });

        }

        /**
         * Card filter
         *
         * @param cardId
         * @returns {*}
         */
        function cardFilter(cardId)
        {
            var card = vm.board.cards.getById(cardId);

            try
            {
                if ( angular.lowercase(card.name).indexOf(angular.lowercase(vm.cardFilters.name)) < 0 )
                {
                    throw false;
                }

                angular.forEach(vm.cardFilters.labels, function (label)
                {
                    if ( !msUtils.exists(label, card.idLabels) )
                    {
                        throw false;
                    }
                });

                angular.forEach(vm.cardFilters.members, function (member)
                {
                    if ( !msUtils.exists(member, card.idMembers) )
                    {
                        throw false;
                    }
                });


            } catch ( err )
            {
                return err;
            }

            return true;
        }

        /**
         * Is the card overdue?
         *
         * @param cardDate
         * @returns {boolean}
         */
        function isOverdue(cardDate)
        {
            return moment() > moment(cardDate, 'x');
        }
    }
})();
(function ()
{
    'use strict';

    SettingsSidenavController.$inject = ["$mdColorPalette", "BoardService"];
    angular
        .module('app.scrumboard')
        .controller('SettingsSidenavController', SettingsSidenavController);

    /** @ngInject */
    function SettingsSidenavController($mdColorPalette, BoardService)
    {
        var vm = this;

        // Data
        vm.board = BoardService.data;
        vm.palettes = $mdColorPalette;
        vm.selectedMenu = 'Settings';

        // Methods

        ////////

    }
})();
(function ()
{
    'use strict';

    FiltersSidenavController.$inject = ["msUtils", "BoardService", "CardFilters"];
    angular
        .module('app.scrumboard')
        .controller('FiltersSidenavController', FiltersSidenavController);

    /** @ngInject */
    function FiltersSidenavController(msUtils, BoardService, CardFilters)
    {
        var vm = this;

        // Data
        vm.board = BoardService.data;
        vm.cardFilters = CardFilters;
        vm.labels = vm.board.labels;
        vm.members = vm.board.members;
        vm.selectedMenu = 'Settings';

        // Methods
        vm.exists = msUtils.exists;
        vm.toggleInArray = msUtils.toggleInArray;
        vm.clearFilters = CardFilters.clear;
        vm.filteringIsOn = CardFilters.isOn;

        ////////
    }
})();
(function ()
{
    'use strict';

    msSbAddCardController.$inject = ["$scope", "$timeout", "BoardService", "msUtils"];
    msSbAddCardDirective.$inject = ["$document", "$window", "$timeout"];
    angular
        .module('app.scrumboard')
        .controller('msSbAddCardController', msSbAddCardController)
        .directive('msSbAddCard', msSbAddCardDirective);

    /** @ngInject */
    function msSbAddCardController($scope, $timeout, BoardService, msUtils)
    {
        var vm = this;

        vm.newCardName = '';
        vm.listId = $scope.msListId;
        vm.board = BoardService.data;
        vm.cards = vm.board.cards;
        vm.list = vm.board.lists.getById(vm.listId);

        // Methods
        vm.addNewCard = addNewCard;

        /////

        /**
         * Add New Card
         */
        function addNewCard()
        {
            if ( vm.newCardName === '' )
            {
                return;
            }

            var newCardId = msUtils.guidGenerator();

            vm.cards.push({
                id               : newCardId,
                name             : vm.newCardName,
                description      : '',
                idAttachmentCover: '',
                idMembers        : [],
                idLabels         : [],
                attachments      : [],
                subscribed       : false,
                checklists       : [],
                checkItems       : 0,
                checkItemsChecked: 0,
                comments         : [],
                activities       : [],
                due              : null
            });

            vm.list.idCards.push(newCardId);

            $timeout(function ()
            {
                $scope.scrollListContentBottom();
            });

            vm.newCardName = '';
        }
    }

    /** @ngInject */
    function msSbAddCardDirective($document, $window, $timeout)
    {
        return {
            restrict   : 'E',
            controller : 'msSbAddCardController as vm',
            templateUrl: 'app/main/apps/scrumboard/directives/ms-sb-add-card/ms-sb-add-card.html',
            scope      : {
                msListId: '='
            },
            link       : function (scope, iElement)
            {
                scope.formActive = false;
                scope.toggleForm = toggleForm;
                scope.scrollListContentBottom = scrollListContentBottom;

                var buttonEl = iElement.find('.ms-sb-add-card-button'),
                    formEl = iElement.find('.ms-sb-add-card-form'),
                    listCards = iElement.parent().prev().find('.list-cards');

                /**
                 * Click Event
                 */
                buttonEl.on('click', toggleForm);

                /**
                 * Toggle Form
                 */
                function toggleForm()
                {
                    scope.$evalAsync(function ()
                    {
                        scope.formActive = !scope.formActive;

                        if ( scope.formActive )
                        {
                            $timeout(function ()
                            {
                                formEl.find('input').focus();

                                scrollListContentBottom();
                            });

                            $document.on('click', outSideClick);
                        }
                        else
                        {
                            PerfectScrollbar.update(listCards[0]);
                            $document.off('click', outSideClick);
                        }

                        $timeout(function ()
                        {
                            // IE list-content max-height hack
                            if ( angular.element('html').hasClass('explorer') )
                            {
                                angular.element($window).trigger('resize');
                            }
                        });

                    });
                }

                /**
                 * Scroll List to the Bottom
                 */
                function scrollListContentBottom()
                {
                    listCards[0].scrollTop = listCards[0].scrollHeight;
                }

                /**
                 * Click Outside Event Handler
                 * @param event
                 */
                var outSideClick = function (event)
                {
                    var isChild = formEl.has(event.target).length > 0;
                    var isSelf = formEl[0] === event.target;
                    var isInside = isChild || isSelf;

                    if ( !isInside )
                    {
                        toggleForm();
                    }
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    ScrumboardCardDialogController.$inject = ["$document", "$mdDialog", "fuseTheming", "fuseGenerator", "msUtils", "BoardService", "cardId"];
    angular
        .module('app.scrumboard')
        .controller('ScrumboardCardDialogController', ScrumboardCardDialogController);

    /** @ngInject */
    function ScrumboardCardDialogController($document, $mdDialog, fuseTheming, fuseGenerator, msUtils, BoardService, cardId)
    {
        var vm = this;

        // Data
        vm.board = BoardService.data;
        vm.card = vm.board.cards.getById(cardId);
        vm.newLabelColor = 'red';
        vm.members = vm.board.members;
        vm.labels = vm.board.labels;

        // Methods
        vm.palettes = fuseTheming.getRegisteredPalettes();
        vm.rgba = fuseGenerator.rgba;
        vm.toggleInArray = msUtils.toggleInArray;
        vm.exists = msUtils.exists;
        vm.closeDialog = closeDialog;
        vm.getCardList = getCardList;
        vm.removeCard = removeCard;
        /* Attachment */
        vm.toggleCoverImage = toggleCoverImage;
        vm.removeAttachment = removeAttachment;
        /* Labels */
        vm.labelQuerySearch = labelQuerySearch;
        vm.filterLabel = filterLabel;
        vm.addNewLabel = addNewLabel;
        vm.removeLabel = removeLabel;
        /* Members */
        vm.memberQuerySearch = memberQuerySearch;
        vm.filterMember = filterMember;
        /* Checklist */
        vm.updateCheckedCount = updateCheckedCount;
        vm.addCheckItem = addCheckItem;
        vm.removeChecklist = removeChecklist;
        vm.createCheckList = createCheckList;
        /* Comment */
        vm.addNewComment = addNewComment;

        //////////

        /**
         * Close Dialog
         */
        function closeDialog()
        {
            $mdDialog.hide();
        }

        /**
         * Get Card List
         */
        function getCardList()
        {
            var response;
            for ( var i = 0, len = vm.board.lists.length; i < len; i++ )
            {
                if ( vm.board.lists[i].idCards.indexOf(vm.card.id) > -1 )
                {
                    response = vm.board.lists[i];
                    break;
                }
            }
            return response;
        }

        /**
         * Remove card
         *
         * @param ev
         */
        function removeCard(ev)
        {
            var confirm = $mdDialog.confirm({
                title              : 'Remove Card',
                parent             : $document.find('#scrumboard'),
                textContent        : 'Are you sure want to remove card?',
                ariaLabel          : 'remove card',
                targetEvent        : ev,
                clickOutsideToClose: true,
                escapeToClose      : true,
                ok                 : 'Remove',
                cancel             : 'Cancel'
            });

            $mdDialog.show(confirm).then(function ()
            {
                var cardList = getCardList();

                cardList.idCards.splice(cardList.idCards.indexOf(vm.card.id), 1);

                vm.board.cards.splice(vm.board.cards.indexOf(vm.card), 1);

            }, function ()
            {
                // Canceled
            });
        }

        /**
         * Toggle cover image
         *
         * @param attachmentId
         */
        function toggleCoverImage(attachmentId)
        {
            if ( attachmentId === vm.card.idAttachmentCover )
            {
                vm.card.idAttachmentCover = null;
            }
            else
            {
                vm.card.idAttachmentCover = attachmentId;
            }
        }

        /**
         * Remove attachment
         *
         * @param item
         */
        function removeAttachment(item)
        {
            if ( vm.card.idAttachmentCover === item.id )
            {
                vm.card.idAttachmentCover = '';
            }
            vm.card.attachments.splice(vm.card.attachments.indexOf(item), 1);
        }

        /**
         * Add label chips
         *
         * @param query
         * @returns {filterFn}
         */
        function labelQuerySearch(query)
        {
            return query ? vm.labels.filter(createFilterFor(query)) : [];
        }

        /**
         * Label filter
         *
         * @param label
         * @returns {boolean}
         */
        function filterLabel(label)
        {
            if ( !vm.labelSearchText || vm.labelSearchText === '' )
            {
                return true;
            }

            return angular.lowercase(label.name).indexOf(angular.lowercase(vm.labelSearchText)) >= 0;
        }

        /**
         * Add new label
         */
        function addNewLabel()
        {
            vm.board.labels.push({
                id   : msUtils.guidGenerator(),
                name : vm.newLabelName,
                color: vm.newLabelColor
            });

            vm.newLabelName = '';
        }

        /**
         * Remove label
         */
        function removeLabel()
        {
            var arr = vm.board.labels;
            arr.splice(arr.indexOf(arr.getById(vm.editLabelId)), 1);

            angular.forEach(vm.board.cards, function (card)
            {
                if ( card.idLabels && card.idLabels.indexOf(vm.editLabelId) > -1 )
                {
                    card.idLabels.splice(card.idLabels.indexOf(vm.editLabelId), 1);
                }
            });

            vm.newLabelName = '';
        }

        /**
         * Add member chips
         *
         * @param query
         * @returns {Array}
         */
        function memberQuerySearch(query)
        {
            return query ? vm.members.filter(createFilterFor(query)) : [];
        }

        /**
         * Member filter
         *
         * @param member
         * @returns {boolean}
         */
        function filterMember(member)
        {
            if ( !vm.memberSearchText || vm.memberSearchText === '' )
            {
                return true;
            }

            return angular.lowercase(member.name).indexOf(angular.lowercase(vm.memberSearchText)) >= 0;
        }

        /**
         * Update check list stats
         * @param list
         */
        function updateCheckedCount(list)
        {
            var checkItems = list.checkItems;
            var checkedItems = 0;
            var allCheckedItems = 0;
            var allCheckItems = 0;

            angular.forEach(checkItems, function (checkItem)
            {
                if ( checkItem.checked )
                {
                    checkedItems++;
                }
            });

            list.checkItemsChecked = checkedItems;

            angular.forEach(vm.card.checklists, function (item)
            {
                allCheckItems += item.checkItems.length;
                allCheckedItems += item.checkItemsChecked;
            });

            vm.card.checkItems = allCheckItems;
            vm.card.checkItemsChecked = allCheckedItems;
        }

        /**
         * Add checklist item
         *
         * @param text
         * @param checkList
         */
        function addCheckItem(text, checkList)
        {
            if ( !text || text === '' )
            {
                return;
            }

            var newCheckItem = {
                'name'   : text,
                'checked': false
            };

            checkList.checkItems.push(newCheckItem);

            updateCheckedCount(checkList);
        }

        /**
         * Remove checklist
         *
         * @param item
         */
        function removeChecklist(item)
        {
            vm.card.checklists.splice(vm.card.checklists.indexOf(item), 1);

            angular.forEach(vm.card.checklists, function (list)
            {
                updateCheckedCount(list);
            });
        }

        /**
         * Create checklist
         */
        function createCheckList()
        {
            vm.card.checklists.push({
                id               : msUtils.guidGenerator(),
                name             : vm.newCheckListTitle,
                checkItemsChecked: 0,
                checkItems       : []
            });

            vm.newCheckListTitle = '';
        }

        /**
         * Add new comment
         *
         * @param newCommentText
         */
        function addNewComment(newCommentText)
        {
            var newComment = {
                idMember: '36027j1930450d8bf7b10158',
                message : newCommentText,
                time    : 'now'
            };

            vm.card.comments.unshift(newComment);
        }

        /**
         * Filter for chips
         *
         * @param query
         * @returns {filterFn}
         */
        function createFilterFor(query)
        {
            var lowercaseQuery = angular.lowercase(query);
            return function filterFn(item)
            {
                return angular.lowercase(item.name).indexOf(lowercaseQuery) >= 0;
            };
        }
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.mail', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.mail', {
            url      : '/mail',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/apps/mail/mail.html',
                    controller : 'MailController as vm'
                }
            },
            resolve  : {
                Inbox: ["msApi", function (msApi)
                {
                    return msApi.resolve('mail.inbox@get');
                }]
            },
            bodyClass: 'mail'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/mail');

        // Api
        msApiProvider.register('mail.inbox', ['app/data/mail/inbox.json']);

        // Navigation
        msNavigationServiceProvider.saveItem('apps.mail', {
            title : 'Mail',
            icon  : 'icon-email',
            state : 'app.mail',
            badge : {
                content: 25,
                color  : '#F44336'
            },
            weight: 3
        });
    }
})();
(function ()
{
    'use strict';

    ComposeDialogController.$inject = ["$mdDialog", "selectedMail"];
    angular
        .module('app.mail')
        .controller('ComposeDialogController', ComposeDialogController);

    /** @ngInject */
    function ComposeDialogController($mdDialog, selectedMail)
    {
        var vm = this;

        // Data
        vm.form = {
            from: 'johndoe@creapond.com'
        };

        vm.hiddenCC = true;
        vm.hiddenBCC = true;

        // If replying
        if ( angular.isDefined(selectedMail) )
        {
            vm.form.to = selectedMail.from.email;
            vm.form.subject = 'RE: ' + selectedMail.subject;
            vm.form.message = '<blockquote>' + selectedMail.message + '</blockquote>';
        }

        // Methods
        vm.closeDialog = closeDialog;

        //////////

        function closeDialog()
        {
            $mdDialog.hide();
        }
    }
})();

(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider", "msApiProvider"];
    angular
        .module('app.gantt-chart', [
            'gantt',
            'gantt.sortable',
            'gantt.movable',
            'gantt.drawtask',
            'gantt.tooltips',
            'gantt.bounds',
            'gantt.progress',
            'gantt.table',
            'gantt.tree',
            'gantt.groups',
            'gantt.dependencies',
            'gantt.overlap',
            'ngAnimate',
            'gantt.resizeSensor'
        ])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider, msApiProvider)
    {

        $stateProvider.state('app.gantt-chart', {
            url    : '/gantt-chart',
            views  : {
                'content@app': {
                    templateUrl: 'app/main/apps/gantt-chart/gantt-chart.html',
                    controller : 'GanttChartController as vm'
                }
            },
            resolve: {
                Tasks    : ["msApi", function (msApi)
                {
                    return msApi.resolve('ganttChart.tasks@get');
                }],
                Timespans: ["msApi", function (msApi)
                {
                    return msApi.resolve('ganttChart.timespans@get');
                }]
            }
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/gantt-chart');

        // Navigation
        msNavigationServiceProvider.saveItem('apps.gantt-chart', {
            title : 'Gantt Chart',
            icon  : 'icon-calendar-text',
            state : 'app.gantt-chart',
            weight: 5
        });

        // Api
        msApiProvider.register('ganttChart.tasks', ['app/data/gantt-chart/tasks.json']);
        msApiProvider.register('ganttChart.timespans', ['app/data/gantt-chart/timespans.json']);

    }

})();
(function ()
{
    'use strict';

    GanttChartAddEditDialogController.$inject = ["$mdDialog", "ganttUtils", "dialogData", "fuseGenerator"];
    angular.module('app.gantt-chart')
        .controller('GanttChartAddEditDialogController', GanttChartAddEditDialogController);

    /** @ngInject */
    function GanttChartAddEditDialogController($mdDialog, ganttUtils, dialogData, fuseGenerator)
    {
        var vm = this;

        // Data
        vm.chartData = dialogData.chartData;
        vm.dialogType = dialogData.dialogType;

        /// Edit Dialog
        if ( vm.dialogType === 'edit' )
        {
            vm.formView = dialogData.formView;
            vm.row = vm.task = angular.copy(dialogData.formData.model);
        }

        /// Add Dialog
        else if ( vm.dialogType === 'add' )
        {
            vm.row = {
                id      : ganttUtils.randomUuid(),
                name    : '',
                tasks   : [],
                classes : ['', ''],
                sortable: true,
                parent  : ''
            };
            vm.task = {
                id      : ganttUtils.randomUuid(),
                name    : '',
                classes : ['', ''],
                from    : '',
                to      : '',
                progress: ''
            };
            vm.taskRowId = '';
        }

        // Methods
        vm.addNewRow = addNewRow;
        vm.saveRow = saveRow;
        vm.removeRow = removeRow;
        vm.addNewTask = addNewTask;
        vm.saveTask = saveTask;
        vm.removeTask = removeTask;
        vm.closeDialog = closeDialog;
        vm.rgba = fuseGenerator.rgba;

        //////////

        /**
         * Add New Row
         */
        function addNewRow()
        {
            vm.chartData.push(vm.row);

            closeDialog();
        }

        /**
         * Save Row
         */
        function saveRow()
        {
            dialogData.formData.model = vm.row;

            closeDialog();
        }

        /**
         * Remove Row
         */
        function removeRow()
        {
            vm.chartData.splice(vm.chartData.indexOf(vm.chartData.getById(vm.row.id)), 1);

            closeDialog();
        }

        /**
         * Add New Task
         */
        function addNewTask()
        {
            vm.chartData.getById(vm.taskRowId).tasks.push(vm.task);

            closeDialog();
        }

        /**
         * Save Task
         */
        function saveTask()
        {
            dialogData.formData.model = vm.task;

            closeDialog();
        }

        /**
         * Remove Task
         */
        function removeTask()
        {
            var taskRow = vm.chartData.getById(dialogData.formData.row.model.id);

            taskRow.tasks.splice(taskRow.tasks.indexOf(taskRow.tasks.getById(vm.task.id)), 1);

            closeDialog();
        }


        /**
         * Close Dialog
         */
        function closeDialog()
        {
            $mdDialog.hide();
        }

        /**
         * Array prototype
         *
         * Get by id
         *
         * @param value
         * @returns {T}
         */
        Array.prototype.getById = function (value)
        {
            return this.filter(function (x)
            {
                return x.id === value;
            })[0];
        };
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.calendar', [
            'ui.calendar'
        ])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.calendar', {
            url      : '/calendar',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/apps/calendar/calendar.html',
                    controller : 'CalendarController as vm'
                }
            },
            bodyClass: 'calendar'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/calendar');

        // Navigation
        msNavigationServiceProvider.saveItem('apps.calendar', {
            title : 'Calendar',
            icon  : 'icon-calendar-today',
            state : 'app.calendar',
            weight: 2
        });
    }
})();
(function ()
{
    'use strict';

    EventFormDialogController.$inject = ["$mdDialog", "dialogData"];
    angular.module('app.calendar')
        .controller('EventFormDialogController', EventFormDialogController);

    /** @ngInject */
    function EventFormDialogController($mdDialog, dialogData)
    {
        var vm = this;

        // Data
        vm.dialogData = dialogData;
        vm.notifications = ['15 minutes before', '30 minutes before', '1 hour before'];

        // Methods
        vm.saveEvent = saveEvent;
        vm.closeDialog = closeDialog;

        init();

        //////////

        /**
         * Initialize
         */
        function init()
        {
            vm.dialogTitle = (vm.dialogData.type === 'add' ? 'Add Event' : 'Edit Event');

            // Edit
            if ( vm.dialogData.calendarEvent )
            {
                // Clone the calendarEvent object before doing anything
                // to make sure we are not going to brake the Full Calendar
                vm.calendarEvent = angular.copy(vm.dialogData.calendarEvent);

                // Convert moment.js dates to javascript date object
                if ( moment.isMoment(vm.calendarEvent.start) )
                {
                    vm.calendarEvent.start = vm.calendarEvent.start.toDate();
                }

                if ( moment.isMoment(vm.calendarEvent.end) )
                {
                    vm.calendarEvent.end = vm.calendarEvent.end.toDate();
                }
            }
            // Add
            else
            {
                // Convert moment.js dates to javascript date object
                if ( moment.isMoment(vm.dialogData.start) )
                {
                    vm.dialogData.start = vm.dialogData.start.toDate();
                }

                if ( moment.isMoment(vm.dialogData.end) )
                {
                    vm.dialogData.end = vm.dialogData.end.toDate();
                }

                vm.calendarEvent = {
                    start        : vm.dialogData.start,
                    end          : vm.dialogData.end,
                    notifications: []
                };
            }
        }

        function saveEvent()
        {
            var response = {
                type         : vm.dialogData.type,
                calendarEvent: vm.calendarEvent
            };

            $mdDialog.hide(response);
        }

        /**
         * Close the dialog
         */
        function closeDialog()
        {
            $mdDialog.cancel();
        }
    }
})();

(function ()
{
    'use strict';

    EventDetailDialogController.$inject = ["$mdDialog", "calendarEvent", "showEventFormDialog", "event"];
    angular.module('app.calendar')
        .controller('EventDetailDialogController', EventDetailDialogController);

    /** @ngInject */
    function EventDetailDialogController($mdDialog, calendarEvent, showEventFormDialog, event)
    {
        var vm = this;

        // Data
        vm.calendarEvent = calendarEvent;

        // Methods
        vm.editEvent = editEvent;
        vm.closeDialog = closeDialog;

        //////////

        function closeDialog()
        {
            $mdDialog.hide();
        }

        function editEvent(calendarEvent)
        {
            showEventFormDialog('edit', calendarEvent, false, false, event);
        }
    }
})();

(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.page-layouts.blank', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_page-layouts_blank', {
            url  : '/ui/page-layouts/blank',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/page-layouts/blank/blank.html',
                    controller : 'BlankController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.ui.page-layouts.blank')
        .controller('BlankController', BlankController);

    /** @ngInject */
    function BlankController()
    {
        // Data

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.error-500', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.pages_errors_error-500', {
            url      : '/pages/errors/error-500',
            views    : {
                'main@'                             : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.pages_errors_error-500': {
                    templateUrl: 'app/main/pages/errors/500/error-500.html',
                    controller : 'Error500Controller as vm'
                }
            },
            bodyClass: 'error-500'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/pages/errors/500');

        // Navigation
        msNavigationServiceProvider.saveItem('pages.errors.error-500', {
            title : '500',
            state : 'app.pages_errors_error-500',
            weight: 2
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.pages.error-500')
        .controller('Error500Controller', Error500Controller);

    /** @ngInject */
    function Error500Controller()
    {
        // Data

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.error-404', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.pages_errors_error-404', {
            url      : '/pages/errors/error-404',
            views    : {
                'main@'                             : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.pages_errors_error-404': {
                    templateUrl: 'app/main/pages/errors/404/error-404.html',
                    controller : 'Error404Controller as vm'
                }
            },
            bodyClass: 'error-404'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/pages/errors/404');

        // Navigation
        msNavigationServiceProvider.saveItem('pages.errors', {
            title : 'Errors',
            icon  : 'icon-alert',
            weight: 3
        });

        msNavigationServiceProvider.saveItem('pages.errors.error-404', {
            title : '404',
            state : 'app.pages_errors_error-404',
            weight: 1
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.pages.error-404')
        .controller('Error404Controller', Error404Controller);

    /** @ngInject */
    function Error404Controller()
    {
        // Data

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.auth.reset-password', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.pages_auth_reset-password', {
            url      : '/pages/auth/reset-password',
            views    : {
                'main@'                                : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.pages_auth_reset-password': {
                    templateUrl: 'app/main/pages/auth/reset-password/reset-password.html',
                    controller : 'ResetPasswordController as vm'
                }
            },
            bodyClass: 'reset-password'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/pages/auth/reset-password');

        // Navigation
        msNavigationServiceProvider.saveItem('pages.auth.reset-password', {
            title : 'Reset Password',
            state : 'app.pages_auth_reset-password',
            weight: 6
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.pages.auth.reset-password')
        .controller('ResetPasswordController', ResetPasswordController);

    /** @ngInject */
    function ResetPasswordController()
    {
        // Data

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.auth.register-v2', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.pages_auth_register-v2', {
            url      : '/pages/auth/register-v2',
            views    : {
                'main@'                          : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.pages_auth_register-v2': {
                    templateUrl: 'app/main/pages/auth/register-v2/register-v2.html',
                    controller : 'RegisterV2Controller as vm'
                }
            },
            bodyClass: 'register-v2'
        });

        // Translate
        $translatePartialLoaderProvider.addPart('app/main/pages/auth/register-v2');

        // Navigation
        msNavigationServiceProvider.saveItem('pages.auth.register-v2', {
            title : 'Register v2',
            state : 'app.pages_auth_register-v2',
            weight: 4
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.pages.auth.register-v2')
        .controller('RegisterV2Controller', RegisterV2Controller);

    /** @ngInject */
    function RegisterV2Controller()
    {
        // Data

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.auth.register', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.pages_auth_register', {
            url      : '/pages/auth/register',
            views    : {
                'main@'                          : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.pages_auth_register': {
                    templateUrl: 'app/main/pages/auth/register/register.html',
                    controller : 'RegisterController as vm'
                }
            },
            bodyClass: 'register'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/pages/auth/register');

        // Navigation
        msNavigationServiceProvider.saveItem('pages.auth.register', {
            title : 'Register',
            state : 'app.pages_auth_register',
            weight: 3
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.pages.auth.register')
        .controller('RegisterController', RegisterController);

    /** @ngInject */
    function RegisterController()
    {
        // Data

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.auth.login', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.pages_auth_login', {
            url      : '/pages/auth/login',
            views    : {
                'main@'                       : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.pages_auth_login': {
                    templateUrl: 'app/main/pages/auth/login/login.html',
                    controller : 'LoginController as vm'
                }
            },
            bodyClass: 'login'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/pages/auth/login');

        // Navigation
        msNavigationServiceProvider.saveItem('pages.auth', {
            title : 'Authentication',
            icon  : 'icon-lock',
            weight: 1
        });

        msNavigationServiceProvider.saveItem('pages.auth.login', {
            title : 'Login',
            state : 'app.pages_auth_login',
            weight: 1
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.pages.auth.login')
        .controller('LoginV2Controller', LoginV2Controller);

    /** @ngInject */
    function LoginV2Controller()
    {
        // Data

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.pages.auth.login')
        .controller('LoginController', LoginController);

    /** @ngInject */
    function LoginController()
    {
        // Data

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.auth.lock', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.pages_auth_lock', {
            url      : '/pages/auth/lock',
            views    : {
                'main@'                      : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.pages_auth_lock': {
                    templateUrl: 'app/main/pages/auth/lock/lock.html',
                    controller : 'LockController as vm'
                }
            },
            bodyClass: 'lock'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/pages/auth/lock');

        // Navigation
        msNavigationServiceProvider.saveItem('pages.auth.lock', {
            title : 'Lock Screen',
            state : 'app.pages_auth_lock',
            weight: 7
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.pages.auth.lock')
        .controller('LockController', LockController);

    /** @ngInject */
    function LockController()
    {
        var vm = this;

        // Data
        vm.form = {
            username: 'Jane Doe'
        };

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.auth.forgot-password', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.pages_auth_forgot-password', {
            url      : '/pages/auth/forgot-password',
            views    : {
                'main@'                                 : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.pages_auth_forgot-password': {
                    templateUrl: 'app/main/pages/auth/forgot-password/forgot-password.html',
                    controller : 'ForgotPasswordController as vm'
                }
            },
            bodyClass: 'forgot-password'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/pages/auth/forgot-password');

        // Navigation
        msNavigationServiceProvider.saveItem('pages.auth.forgot-password', {
            title : 'Forgot Password',
            state : 'app.pages_auth_forgot-password',
            weight: 5
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.pages.auth.forgot-password')
        .controller('ForgotPasswordController', ForgotPasswordController);

    /** @ngInject */
    function ForgotPasswordController()
    {
        // Data

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "msApiProvider"];
    angular
        .module('app.components.tables.simple-table', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, msApiProvider)
    {
        $stateProvider.state('app.components_tables_simple-table', {
            url  : '/components/table/simple-table',
            views: {
                'content@app': {
                    templateUrl: 'app/main/components/tables/simple-table/simple-table.html',
                    controller : 'SimpleTableController as vm'
                }
            },
            resolve: {
                Employees: ["msApi", function (msApi)
                {
                    return msApi.resolve('tables.employees@get');
                }]
            }
        });

        // Api
        msApiProvider.register('tables.employees', ['app/data/tables/employees.json']);
    }

})();
(function ()
{
    'use strict';

    SimpleTableController.$inject = ["Employees"];
    angular
        .module('app.components.tables.simple-table')
        .controller('SimpleTableController', SimpleTableController);

    /** @ngInject */
    function SimpleTableController(Employees)
    {
        var vm = this;

        // Data
        vm.employees = Employees.data;

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "msApiProvider"];
    angular
        .module('app.components.tables.datatable', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, msApiProvider)
    {
        $stateProvider.state('app.components_tables_datatable', {
            url    : '/components/table/datatable',
            views  : {
                'content@app': {
                    templateUrl: 'app/main/components/tables/datatable/datatable.html',
                    controller : 'DatatableController as vm'
                }
            },
            resolve: {
                Employees: ["msApi", function (msApi)
                {
                    return msApi.resolve('tables.employees100@get');
                }]
            }
        });

        // Api
        msApiProvider.register('tables.employees100', ['app/data/tables/employees100.json']);
    }

})();
(function ()
{
    'use strict';

    DatatableController.$inject = ["Employees"];
    angular
        .module('app.components.tables.datatable')
        .controller('DatatableController', DatatableController);

    /** @ngInject */
    function DatatableController(Employees)
    {
        var vm = this;

        // Data
        vm.employees = Employees.data;

        vm.dtOptions = {
            dom       : '<"top"f>rt<"bottom"<"left"<"length"l>><"right"<"info"i><"pagination"p>>>',
            pagingType: 'simple',
            autoWidth : false,
            responsive: true
        };

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    /**
     * Replace those for demo assets
     * img/                     >>>            assets/angular-material-assets/img/
     * 'icons                   >>>            'assets/angular-material-assets/icons/
     */
    config.$inject = ["msNavigationServiceProvider", "$stateProvider", "ELEMENTS_NAVIGATION", "LAYOUT_NAVIGATION"];
    angular
        .module('app.components.material-docs', ['ngMaterial', 'ngMessages'])
        .config(config);

    /** @ngInject */
    function config(msNavigationServiceProvider, $stateProvider, ELEMENTS_NAVIGATION, LAYOUT_NAVIGATION)
    {
        msNavigationServiceProvider.saveItem('components.elements', {
            title : 'Angular Material Elements',
            icon  : 'icon-layers',
            weight: 0
        });

        msNavigationServiceProvider.saveItem('components.elements.inputs', {
            title : 'Inputs',
            weight: 0
        });

        msNavigationServiceProvider.saveItem('components.elements.buttons', {
            title : 'Buttons',
            weight: 1
        });

        msNavigationServiceProvider.saveItem('components.elements.content-elements', {
            title : 'Content Elements',
            weight: 2
        });

        msNavigationServiceProvider.saveItem('components.elements.lists', {
            title : 'Lists',
            weight: 3
        });

        msNavigationServiceProvider.saveItem('components.elements.menus', {
            title : 'Menus',
            weight: 4
        });

        msNavigationServiceProvider.saveItem('components.elements.progress', {
            title : 'Progress',
            weight: 5
        });

        msNavigationServiceProvider.saveItem('components.elements.others', {
            title : 'Others',
            weight: 6
        });

        msNavigationServiceProvider.saveItem('components.material_layout', {
            title : 'Angular Material Layout',
            icon  : 'icon-view-quilt',
            weight: 1
        });


        angular.forEach(ELEMENTS_NAVIGATION, function (component)
        {

            $stateProvider.state('app.docs_' + component.stateName, {
                url  : '/components/angular-material-elements/' + component.url,
                views: {
                    'content@app': {
                        templateUrl: 'app/main/components/material-docs/material-doc-template.html',
                        controller : 'DocTemplateController as vm'
                    }
                },
                data : component
            });

            // Navigation
            msNavigationServiceProvider.saveItem(component.navPath + '.' + component.url, {
                title : component.name,
                state : 'app.docs_' + component.stateName,
                weight: component.weight
            });
        });

        angular.forEach(LAYOUT_NAVIGATION, function (component)
        {

            $stateProvider.state('app.docs_' + component.stateName, {
                url  : '/components/angular-material-elements/' + component.url,
                views: {
                    'content@app': {
                        templateUrl: 'app/main/components/material-docs/layout/layout-template.html',
                        controller : 'LayoutTemplateController as vm',
                    },
                },
                data : component
            });

            // Navigation
            msNavigationServiceProvider.saveItem('components.material_layout.' + component.url, {
                title : component.name,
                state : 'app.docs_' + component.stateName,
                weight: component.weight
            });
        });

    }
})();
(function ()
{
    'use strict';

    LayoutCtrl.$inject = ["$scope", "$attrs", "$location", "$rootScope"];
    angular
        .module('app.components.material-docs')
        .controller('LayoutCtrl', LayoutCtrl)
        .controller('LayoutTipsCtrl', LayoutTipsCtrl);

    /** @ngInject */
    function LayoutCtrl($scope, $attrs, $location, $rootScope)
    {
        $rootScope.currentComponent = $rootScope.currentDoc = null;

        $scope.exampleNotEditable = true;
        $scope.layoutDemo = {
            mainAxis : 'center',
            crossAxis: 'center',
            direction: 'row'
        };
        $scope.layoutAlign = function ()
        {
            return $scope.layoutDemo.mainAxis +
                   ($scope.layoutDemo.crossAxis ? ' ' + $scope.layoutDemo.crossAxis : '');
        };
    }

    /** @ngInject */
    function LayoutTipsCtrl()
    {
        var self = this;

        /*
         * Flex Sizing - Odd
         */
        self.toggleButtonText = 'Hide';

        self.toggleContentSize = function ()
        {
            var contentEl = angular.element(document.getElementById('toHide'));

            contentEl.toggleClass('ng-hide');

            self.toggleButtonText = contentEl.hasClass('ng-hide') ? 'Show' : 'Hide';
        };
    }

})();
(function ()
{
    'use strict';

    LayoutTemplateController.$inject = ["$state"];
    angular
        .module('app.components.material-docs')
        .controller('LayoutTemplateController', LayoutTemplateController);

    /** @ngInject */
    function LayoutTemplateController($state)
    {
        var vm = this;
        vm.materialVersion = '1.0.5';
        vm.component = $state.current.data;
    }

})();
(function ()
{
    'use strict';
    angular
        .module('app.components.material-docs')
        .factory('$demoAngularScripts', DemoAngularScripts);

    function DemoAngularScripts()
    {
        var scripts = [
            'angular.js',
            'angular-animate.min.js',
            'angular-route.min.js',
            'angular-aria.min.js',
            'angular-messages.min.js'
        ];

        return {
            all: allAngularScripts
        };

        function allAngularScripts()
        {
            return scripts.map(fullPathToScript);
        }

        function fullPathToScript(script)
        {
            return "https://ajax.googleapis.com/ajax/libs/angularjs/1.4.8/" + script;
            //return "https://ajax.googleapis.com/ajax/libs/angularjs/" + BUILDCONFIG.ngVersion + "/" + script;
        }
    }
})();

(function ()
{
    'use strict';

    demoInclude.$inject = ["$q", "$http", "$compile", "$templateCache", "$timeout"];
    angular
        .module('app.components.material-docs')
        .directive('demoInclude', demoInclude)

    function demoInclude($q, $http, $compile, $templateCache, $timeout)
    {
        return {
            restrict: 'E',
            link    : postLink
        };

        function postLink(scope, element, attr)
        {
            var demoContainer;

            // Interpret the expression given as `demo-include files="something"`
            var files = scope.$eval(attr.files) || {};
            var ngModule = scope.$eval(attr.module) || '';

            $timeout(handleDemoIndexFile);

            /**
             * Fetch the index file, and if it contains its own ngModule
             * then bootstrap a new angular app with that ngModule. Otherwise, compile
             * the demo into the current ng-app.
             */
            function handleDemoIndexFile()
            {
                files.index.contentsPromise.then(function (contents)
                {
                    demoContainer = angular.element(
                        '<div class="demo-content ' + ngModule + '">'
                    );

                    var isStandalone = !!ngModule;
                    var demoScope;
                    var demoCompileService;
                    if ( isStandalone )
                    {
                        angular.bootstrap(demoContainer[0], [ngModule]);
                        demoScope = demoContainer.scope();
                        demoCompileService = demoContainer.injector().get('$compile');

                        scope.$on('$destroy', function ()
                        {
                            demoScope.$destroy();
                        });

                    }
                    else
                    {
                        demoScope = scope.$new();
                        demoCompileService = $compile;
                    }

                    // Once everything is loaded, put the demo into the DOM
                    $q.all([
                        handleDemoStyles(),
                        handleDemoTemplates()
                    ]).finally(function ()
                    {

                        demoScope.$evalAsync(function ()
                        {
                            element.append(demoContainer);
                            demoContainer.html(contents);
                            demoCompileService(demoContainer.contents())(demoScope);
                        });


                    });
                });

            }


            /**
             * Fetch the demo styles, and append them to the DOM.
             */
            function handleDemoStyles()
            {
                return $q.all(files.css.map(function (file)
                    {
                        return file.contentsPromise;
                    }))
                    .then(function (styles)
                    {
                        styles = styles.join('\n'); //join styles as one string

                        var styleElement = angular.element('<style>' + styles + '</style>');
                        document.body.appendChild(styleElement[0]);

                        scope.$on('$destroy', function ()
                        {
                            styleElement.remove();
                        });
                    });

            }

            /**
             * Fetch the templates for this demo, and put the templates into
             * the demo app's templateCache, with a url that allows the demo apps
             * to reference their templates local to the demo index file.
             *
             * For example, make it so the dialog demo can reference templateUrl
             * 'my-dialog.tmpl.html' instead of having to reference the url
             * 'generated/material.components.dialog/demo/demo1/my-dialog.tmpl.html'.
             */
            function handleDemoTemplates()
            {

                return $q.all(files.html.map(function (file)
                {

                    return file.contentsPromise.then(function (contents)
                    {
                        // Get the $templateCache instance that goes with the demo's specific ng-app.
                        var demoTemplateCache = demoContainer.injector().get('$templateCache');
                        demoTemplateCache.put(file.name, contents);

                        scope.$on('$destroy', function ()
                        {
                            demoTemplateCache.remove(file.name);
                        });

                    });

                }));

            }

        }

    }
})();
(function ()
{
    'use strict';
    docsDemo.$inject = ["$mdUtil"];
    demoFile.$inject = ["$q", "$interpolate"];
    toHtml.$inject = ["$sce"];
    angular
        .module('app.components.material-docs')
        .directive('docsDemo', docsDemo)
        .directive('demoFile', demoFile)
        .filter('toHtml', toHtml)
        .directive('layoutAlign', function ()
        {
            return angular.noop;
        })
        .directive('layout', function ()
        {
            return angular.noop;
        });

    /** @ngInject */
    function docsDemo($mdUtil)
    {
        DocsDemoCtrl.$inject = ["$scope", "$element", "$attrs", "$interpolate"];
        return {
            restrict        : 'E',
            scope           : true,
            templateUrl     : 'app/main/components/material-docs/demo/docs-demo.tmpl.html',
            transclude      : true,
            controller      :DocsDemoCtrl,
            controllerAs    : 'demoCtrl',
            bindToController: true
        };

        function DocsDemoCtrl($scope, $element, $attrs, $interpolate)
        {
            var self = this;

            self.interpolateCode = angular.isDefined($attrs.interpolateCode);
            self.demoId = $interpolate($attrs.demoId || '')($scope.$parent);
            self.demoTitle = $interpolate($attrs.demoTitle || '')($scope.$parent);
            self.demoModule = $interpolate($attrs.demoModule || '')($scope.$parent);
            self.files = {
                css : [],
                js  : [],
                html: []
            };

            self.addFile = function (name, contentsPromise)
            {
                var file = {
                    name           : convertName(name),
                    contentsPromise: contentsPromise,
                    fileType       : name.split('.').pop()
                };
                contentsPromise.then(function (contents)
                {
                    file.contents = contents;
                });

                if ( name === 'index.html' )
                {
                    self.files.index = file;
                }
                else if ( name === 'readme.html' )
                {
                    self.demoDescription = file;
                }
                else
                {
                    self.files[file.fileType] = self.files[file.fileType] || [];
                    self.files[file.fileType].push(file);
                }

                self.orderedFiles = []
                    .concat(self.files.index || [])
                    .concat(self.files.js || [])
                    .concat(self.files.css || [])
                    .concat(self.files.html || []);

            };

            self.editOnCodepen = function ()
            {
                codepen.editOnCodepen({
                    title : self.demoTitle,
                    files : self.files,
                    id    : self.demoId,
                    module: self.demoModule
                });
            };

            function convertName(name)
            {
                switch ( name )
                {
                    case "index.html" :
                        return "HTML";
                    case "script.js" :
                        return "JS";
                    case "style.css" :
                        return "CSS";
                    default :
                        return name;
                }
            }

        }
    }

    /** @ngInject */
    function demoFile($q, $interpolate)
    {
        return {
            restrict: 'E',
            require : '^docsDemo',
            compile : compile
        };

        function compile(element, attr)
        {
            var contentsAttr = attr.contents;
            var html = element.html();
            var name = attr.name;
            element.contents().remove();

            return function postLink(scope, element, attr, docsDemoCtrl)
            {
                docsDemoCtrl.addFile(
                    $interpolate(name)(scope),
                    $q.when(scope.$eval(contentsAttr) || html)
                );
                element.remove();
            };
        }
    }

    /** @ngInject */
    function toHtml($sce)
    {
        return function (str)
        {
            return $sce.trustAsHtml(str);
        };
    }
})();
(function ()
{
    'use strict';
    angular
        .module('app.components.material-docs')
        .factory('$demoAngularScripts', DemoAngularScripts);

    function DemoAngularScripts()
    {
        var scripts = [
            'angular.js',
            'angular-animate.min.js',
            'angular-route.min.js',
            'angular-aria.min.js',
            'angular-messages.min.js'
        ];

        return {
            all: allAngularScripts
        };

        function allAngularScripts()
        {
            return scripts.map(fullPathToScript);
        }

        function fullPathToScript(script)
        {
            return "https://ajax.googleapis.com/ajax/libs/angularjs/" + angular.version.full + "/" + script;
        }
    }
})();

angular.module('app.components.material-docs')
    .constant('LAYOUT_NAVIGATION', [
        {
            name       : 'Introduction',
            stateName  : 'material_components_layout_introduction',
            id         : 'layoutIntro',
            url        : 'layout/introduction',
            templateUrl: 'layout-introduction',
            weight     : 1
        },
        {
            name       : 'Layout Containers',
            stateName  : 'material_components_layout_containers',
            id         : 'layoutContainers',
            url        : 'layout/container',
            templateUrl: 'layout-container',
            weight     : 2
        },
        {
            name       : 'Layout Children',
            stateName  : 'material_components_layout_grid',
            id         : 'layoutGrid',
            url        : 'layout/children',
            templateUrl: 'layout-children',
            weight     : 3
        },
        {
            name       : 'Child Alignment',
            stateName  : 'material_components_layout_align',
            id         : 'layoutAlign',
            url        : 'layout/alignment',
            templateUrl: 'layout-alignment',
            weight     : 4
        },
        {
            name       : 'Extra Options',
            stateName  : 'material_components_layout_options',
            id         : 'layoutOptions',
            url        : 'layout/options',
            templateUrl: 'layout-options',
            weight     : 5
        },
        {
            name       : 'Troubleshooting',
            stateName  : 'material_components_layout_tips',
            id         : 'layoutTips',
            url        : 'layout/tips',
            templateUrl: 'layout-tips',
            weight     : 6
        }
    ]);
(function ()
{
    'use strict';

    angular
        .module('app.components.material-docs')
        .constant('ELEMENTS_NAVIGATION', [
            /* INPUTS */
            {
                name      : 'Autocomplete',
                url       : 'autocomplete',
                navPath   : 'components.elements.inputs',
                moduleName: 'material.components.autocomplete',
                stateName : 'material_components_autocomplete',
                weight    : 1
            },
            {
                name      : 'Checkbox',
                url       : 'checkbox',
                navPath   : 'components.elements.inputs',
                moduleName: 'material.components.checkbox',
                stateName : 'material_components_checkbox',
                weight    : 2
            },
            {
                name      : 'Chips',
                url       : 'chips',
                navPath   : 'components.elements.inputs',
                moduleName: 'material.components.chips',
                stateName : 'material_components_chips',
                weight    : 3
            },
            {
                name      : 'Date Picker',
                url       : 'date-picker',
                navPath   : 'components.elements.inputs',
                moduleName: 'material.components.datepicker',
                stateName : 'material_components_datepicker',
                weight    : 4
            },
            {
                name      : 'Input',
                url       : 'input',
                navPath   : 'components.elements.inputs',
                moduleName: 'material.components.input',
                stateName : 'material_components_input',
                weight    : 5
            },
            {
                name      : 'Radio Button',
                url       : 'radio-button',
                navPath   : 'components.elements.inputs',
                moduleName: 'material.components.radioButton',
                stateName : 'material_components_radioButton',
                weight    : 6
            },
            {
                name      : 'Select',
                url       : 'select',
                navPath   : 'components.elements.inputs',
                moduleName: 'material.components.select',
                stateName : 'material_components_select',
                weight    : 7
            },
            {
                name      : 'Slider',
                url       : 'slider',
                navPath   : 'components.elements.inputs',
                moduleName: 'material.components.slider',
                stateName : 'material_components_slider',
                weight    : 8
            },
            {
                name      : 'Switch',
                url       : 'switch',
                navPath   : 'components.elements.inputs',
                moduleName: 'material.components.switch',
                stateName : 'material_components_switch',
                weight    : 9
            },
            /* BUTTONS */
            {
                name      : 'Button',
                url       : 'button',
                navPath   : 'components.elements.buttons',
                moduleName: 'material.components.button',
                stateName : 'material_components_button',
                weight    : 1
            },
            {
                name      : 'Fab Actions',
                url       : 'fab-actions',
                navPath   : 'components.elements.buttons',
                moduleName: 'material.components.fabActions',
                stateName : 'material_components_fabActions',
                weight    : 2
            },
            {
                name      : 'Fab Speed Dial',
                url       : 'fab-speed-dial',
                navPath   : 'components.elements.buttons',
                moduleName: 'material.components.fabSpeedDial',
                stateName : 'material_components_fabSpeedDial',
                weight    : 3
            },
            {
                name      : 'Fab Toolbar',
                url       : 'fab-toolbar',
                navPath   : 'components.elements.buttons',
                moduleName: 'material.components.fabToolbar',
                stateName : 'material_components_fabToolbar',
                weight    : 4
            },
            /* CONTENT ELEMENTS */
            {
                name      : 'Bottom Sheet',
                url       : 'bottom-sheet',
                navPath   : 'components.elements.content-elements',
                moduleName: 'material.components.bottomSheet',
                stateName : 'material_components_bottomSheet',
                weight    : 1
            },
            {
                name      : 'Card',
                url       : 'card',
                navPath   : 'components.elements.content-elements',
                moduleName: 'material.components.card',
                stateName : 'material_components_card',
                weight    : 2
            },
            {
                name      : 'Content',
                url       : 'content',
                navPath   : 'components.elements.content-elements',
                moduleName: 'material.components.content',
                stateName : 'material_components_content',
                weight    : 3
            },
            {
                name      : 'Dialog',
                url       : 'dialog',
                navPath   : 'components.elements.content-elements',
                moduleName: 'material.components.dialog',
                stateName : 'material_components_dialog',
                weight    : 4
            },
            {
                name       : 'Icon',
                url        : 'icon',
                navPath    : 'components.elements.content-elements',
                moduleName : 'material.components.icon',
                stateName  : 'material_components_icon',
                excludeDemo: true,
                weight     : 5
            },
            {
                name      : 'Sidenav',
                url       : 'sidenav',
                navPath   : 'components.elements.content-elements',
                moduleName: 'material.components.sidenav',
                stateName : 'material_components_sidenav',
                weight    : 6
            },
            {
                name      : 'Subheader',
                url       : 'subheader',
                navPath   : 'components.elements.content-elements',
                moduleName: 'material.components.subheader',
                stateName : 'material_components_subheader',
                weight    : 7
            },
            {
                name      : 'Tabs',
                url       : 'tabs',
                navPath   : 'components.elements.content-elements',
                moduleName: 'material.components.tabs',
                stateName : 'material_components_tabs',
                weight    : 8
            },
            {
                name      : 'Toast',
                url       : 'toast',
                navPath   : 'components.elements.content-elements',
                moduleName: 'material.components.toast',
                stateName : 'material_components_toast',
                weight    : 9
            },
            {
                name      : 'Toolbar',
                url       : 'toolbar',
                navPath   : 'components.elements.content-elements',
                moduleName: 'material.components.toolbar',
                stateName : 'material_components_toolbar',
                weight    : 10
            },
            {
                name      : 'Tooltip',
                url       : 'tooltip',
                navPath   : 'components.elements.content-elements',
                moduleName: 'material.components.tooltip',
                stateName : 'material_components_tooltip',
                weight    : 11
            },
            {
                name      : 'Whiteframe',
                url       : 'whiteframe',
                navPath   : 'components.elements.content-elements',
                moduleName: 'material.components.whiteframe',
                stateName : 'material_components_whiteframe',
                weight    : 12
            },
            /* LISTS */
            {
                name      : 'Grid List',
                url       : 'grid-list',
                navPath   : 'components.elements.lists',
                moduleName: 'material.components.gridList',
                stateName : 'material_components_gridList',
                weight    : 1
            },
            {
                name      : 'List',
                url       : 'list',
                navPath   : 'components.elements.lists',
                moduleName: 'material.components.list',
                stateName : 'material_components_list',
                weight    : 2
            },
            /* MENUS */
            {
                name      : 'Menu',
                url       : 'menu',
                navPath   : 'components.elements.menus',
                moduleName: 'material.components.menu',
                stateName : 'material_components_menu',
                weight    : 1
            },
            {
                name      : 'Menu Bar',
                url       : 'menu-bar',
                navPath   : 'components.elements.menus',
                moduleName: 'material.components.menuBar',
                stateName : 'material_components_menu-bar',
                weight    : 2
            },
            /* PROGRESS */
            {
                name      : 'Progress Circular',
                url       : 'progress-circular',
                navPath   : 'components.elements.progress',
                moduleName: 'material.components.progressCircular',
                stateName : 'material_components_progressCircular',
                weight    : 1
            },
            {
                name      : 'Progress Linear',
                url       : 'progress-linear',
                navPath   : 'components.elements.progress',
                moduleName: 'material.components.progressLinear',
                stateName : 'material_components_progressLinear',
                weight    : 2
            },
            /* OTHERS */
            {
                name      : 'Divider',
                url       : 'divider',
                navPath   : 'components.elements.others',
                moduleName: 'material.components.divider',
                stateName : 'material_components_divider',
                weight    : 1
            },
            {
                name      : 'Ripple',
                url       : 'ripple',
                navPath   : 'components.elements.others',
                moduleName: 'material.core.ripple',
                stateName : 'material_core_ripple',
                weight    : 2
            },
            {
                name      : 'Sticky',
                url       : 'sticky',
                navPath   : 'components.elements.others',
                moduleName: 'material.components.sticky',
                stateName : 'material_components_sticky',
                weight    : 3
            },
            {
                name      : 'Swipe',
                url       : 'swipe',
                navPath   : 'components.elements.others',
                moduleName: 'material.components.swipe',
                stateName : 'material_components_swipe',
                weight    : 4
            },
            {
                name      : 'Util',
                url       : 'util',
                navPath   : 'components.elements.others',
                moduleName: 'material.core.util',
                stateName : 'material_core_util',
                weight    : 5
            },
            {
                name      : 'Virtual Repeat',
                url       : 'virtual-repeat',
                navPath   : 'components.elements.others',
                moduleName: 'material.components.virtualRepeat',
                stateName : 'material_components_virtualRepeat',
                weight    : 6
            }
        ]);
})();
angular.module('app.components.material-docs')
    .constant('DEMOS', [
        {
            'name'      : 'autocomplete',
            'moduleName': 'material.components.autocomplete',
            'label'     : 'Autocomplete',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'autocompleteDemo',
                        'module'      : 'autocompleteDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'autocompletedemoBasicUsage',
                    'css'       : [],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/autocomplete/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.autocomplete',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/autocomplete/demoBasicUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'autocompleteCustomTemplateDemo',
                        'module'      : 'autocompleteCustomTemplateDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'autocompletedemoCustomTemplate',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/autocomplete/demoCustomTemplate/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/autocomplete/demoCustomTemplate/script.js'
                        }
                    ],
                    'moduleName': 'material.components.autocomplete',
                    'name'      : 'demoCustomTemplate',
                    'label'     : 'Custom Template',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/autocomplete/demoCustomTemplate/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'autocompleteFloatingLabelDemo',
                        'module'      : 'autocompleteFloatingLabelDemo',
                        'dependencies': [
                            'ngMaterial',
                            'ngMessages'
                        ]
                    },
                    'id'        : 'autocompletedemoFloatingLabel',
                    'css'       : [],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/autocomplete/demoFloatingLabel/script.js'
                        }
                    ],
                    'moduleName': 'material.components.autocomplete',
                    'name'      : 'demoFloatingLabel',
                    'label'     : 'Floating Label',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/autocomplete/demoFloatingLabel/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'autocompleteDemoInsideDialog',
                        'module'      : 'autocompleteDemoInsideDialog',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'autocompletedemoInsideDialog',
                    'css'       : [],
                    'html'      : [
                        {
                            'name'      : 'dialog.tmpl.html',
                            'label'     : 'dialog.tmpl.html',
                            'fileType'  : 'html',
                            'outputPath': 'demo-partials/autocomplete/demoInsideDialog/dialog.tmpl.html'
                        }
                    ],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/autocomplete/demoInsideDialog/script.js'
                        }
                    ],
                    'moduleName': 'material.components.autocomplete',
                    'name'      : 'demoInsideDialog',
                    'label'     : 'Inside Dialog',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/autocomplete/demoInsideDialog/index.html'
                    }
                }
            ],
            'url'       : 'demo/autocomplete'
        },
        {
            'name'      : 'bottomSheet',
            'moduleName': 'material.components.bottomSheet',
            'label'     : 'Bottom Sheet',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'bottomSheetDemo1',
                        'module'      : 'bottomSheetDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'bottomSheetdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/bottomSheet/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [
                        {
                            'name'      : 'bottom-sheet-grid-template.html',
                            'label'     : 'bottom-sheet-grid-template.html',
                            'fileType'  : 'html',
                            'outputPath': 'demo-partials/bottomSheet/demoBasicUsage/bottom-sheet-grid-template.html'
                        },
                        {
                            'name'      : 'bottom-sheet-list-template.html',
                            'label'     : 'bottom-sheet-list-template.html',
                            'fileType'  : 'html',
                            'outputPath': 'demo-partials/bottomSheet/demoBasicUsage/bottom-sheet-list-template.html'
                        },
                        {
                            'name'      : 'readme.html',
                            'label'     : 'readme.html',
                            'fileType'  : 'html',
                            'outputPath': 'demo-partials/bottomSheet/demoBasicUsage/readme.html'
                        }
                    ],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/bottomSheet/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.bottomSheet',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/bottomSheet/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/bottomSheet'
        },
        {
            'name'      : 'button',
            'moduleName': 'material.components.button',
            'label'     : 'Button',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'buttonsDemo1',
                        'module'      : 'buttonsDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'buttondemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/button/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/button/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.button',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/button/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/button'
        },
        {
            'name'      : 'card',
            'moduleName': 'material.components.card',
            'label'     : 'Card',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'cardDemo1',
                        'module'      : 'cardDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'carddemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/card/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/card/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.card',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/card/demoBasicUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'cardDemo1',
                        'module'      : 'cardDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'carddemoCardActionButtons',
                    'css'       : [],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/card/demoCardActionButtons/script.js'
                        }
                    ],
                    'moduleName': 'material.components.card',
                    'name'      : 'demoCardActionButtons',
                    'label'     : 'Card Action Buttons',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/card/demoCardActionButtons/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'cardDemo1',
                        'module'      : 'cardDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'carddemoInCardActions',
                    'css'       : [],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/card/demoInCardActions/script.js'
                        }
                    ],
                    'moduleName': 'material.components.card',
                    'name'      : 'demoInCardActions',
                    'label'     : 'In Card Actions',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/card/demoInCardActions/index.html'
                    }
                }
            ],
            'url'       : 'demo/card'
        },
        {
            'name'      : 'checkbox',
            'moduleName': 'material.components.checkbox',
            'label'     : 'Checkbox',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'checkboxDemo1',
                        'module'      : 'checkboxDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'checkboxdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/checkbox/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/checkbox/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.checkbox',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/checkbox/demoBasicUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'checkboxDemo1',
                        'module'      : 'checkboxDemo2',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'checkboxdemoSyncing',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/checkbox/demoSyncing/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/checkbox/demoSyncing/script.js'
                        }
                    ],
                    'moduleName': 'material.components.checkbox',
                    'name'      : 'demoSyncing',
                    'label'     : 'Syncing',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/checkbox/demoSyncing/index.html'
                    }
                }
            ],
            'url'       : 'demo/checkbox'
        },
        {
            'name'      : 'chips',
            'moduleName': 'material.components.chips',
            'label'     : 'Chips',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'chipsDemo',
                        'module'      : 'chipsDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'chipsdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/chips/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/chips/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.chips',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/chips/demoBasicUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'contactChipsDemo',
                        'module'      : 'contactChipsDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'chipsdemoContactChips',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/chips/demoContactChips/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/chips/demoContactChips/script.js'
                        }
                    ],
                    'moduleName': 'material.components.chips',
                    'name'      : 'demoContactChips',
                    'label'     : 'Contact Chips',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/chips/demoContactChips/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'chipsCustomInputDemo',
                        'module'      : 'chipsCustomInputDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'chipsdemoCustomInputs',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/chips/demoCustomInputs/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/chips/demoCustomInputs/script.js'
                        }
                    ],
                    'moduleName': 'material.components.chips',
                    'name'      : 'demoCustomInputs',
                    'label'     : 'Custom Inputs',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/chips/demoCustomInputs/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'chipsCustomSeparatorDemo',
                        'module'      : 'chipsCustomSeparatorDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'chipsdemoCustomSeparatorKeys',
                    'css'       : [],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/chips/demoCustomSeparatorKeys/script.js'
                        }
                    ],
                    'moduleName': 'material.components.chips',
                    'name'      : 'demoCustomSeparatorKeys',
                    'label'     : 'Custom Separator Keys',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/chips/demoCustomSeparatorKeys/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'staticChipsDemo',
                        'module'      : 'staticChipsDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'chipsdemoStaticChips',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/chips/demoStaticChips/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/chips/demoStaticChips/script.js'
                        }
                    ],
                    'moduleName': 'material.components.chips',
                    'name'      : 'demoStaticChips',
                    'label'     : 'Static Chips',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/chips/demoStaticChips/index.html'
                    }
                }
            ],
            'url'       : 'demo/chips'
        },
        {
            'name'      : 'content',
            'moduleName': 'material.components.content',
            'label'     : 'Content',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'contentDemo1',
                        'module'      : 'contentDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'contentdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/content/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/content/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.content',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/content/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/content'
        },
        {
            'name'      : 'datepicker',
            'moduleName': 'material.components.datepicker',
            'label'     : 'Datepicker',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'datepickerBasicUsage',
                        'module'      : 'datepickerBasicUsage',
                        'dependencies': [
                            'ngMaterial',
                            'ngMessages'
                        ]
                    },
                    'id'        : 'datepickerdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/datepicker/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/datepicker/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.datepicker',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/datepicker/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/datepicker'
        },
        {
            'name'      : 'dialog',
            'moduleName': 'material.components.dialog',
            'label'     : 'Dialog',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'dialogDemo1',
                        'module'      : 'dialogDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'dialogdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/dialog/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [
                        {
                            'name'      : 'dialog1.tmpl.html',
                            'label'     : 'dialog1.tmpl.html',
                            'fileType'  : 'html',
                            'outputPath': 'demo-partials/dialog/demoBasicUsage/dialog1.tmpl.html'
                        },
                        {
                            'name'      : 'tabDialog.tmpl.html',
                            'label'     : 'tabDialog.tmpl.html',
                            'fileType'  : 'html',
                            'outputPath': 'demo-partials/dialog/demoBasicUsage/tabDialog.tmpl.html'
                        }
                    ],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/dialog/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.dialog',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/dialog/demoBasicUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'dialogDemo2',
                        'module'      : 'dialogDemo2',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'dialogdemoOpenFromCloseTo',
                    'css'       : [],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/dialog/demoOpenFromCloseTo/script.js'
                        }
                    ],
                    'moduleName': 'material.components.dialog',
                    'name'      : 'demoOpenFromCloseTo',
                    'label'     : 'Open From Close To',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/dialog/demoOpenFromCloseTo/index.html'
                    }
                }
            ],
            'url'       : 'demo/dialog'
        },
        {
            'name'      : 'divider',
            'moduleName': 'material.components.divider',
            'label'     : 'Divider',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'dividerDemo1',
                        'module'      : 'dividerDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'dividerdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/divider/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/divider/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.divider',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/divider/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/divider'
        },
        {
            'name'      : 'fabSpeedDial',
            'moduleName': 'material.components.fabSpeedDial',
            'label'     : 'FAB Speed Dial',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'fabSpeedDialDemoBasicUsage',
                        'module'      : 'fabSpeedDialDemoBasicUsage',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'fabSpeedDialdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/fabSpeedDial/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/fabSpeedDial/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.fabSpeedDial',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/fabSpeedDial/demoBasicUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'fabSpeedDialDemoMoreOptions',
                        'module'      : 'fabSpeedDialDemoMoreOptions',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'fabSpeedDialdemoMoreOptions',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/fabSpeedDial/demoMoreOptions/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/fabSpeedDial/demoMoreOptions/script.js'
                        }
                    ],
                    'moduleName': 'material.components.fabSpeedDial',
                    'name'      : 'demoMoreOptions',
                    'label'     : 'More Options',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/fabSpeedDial/demoMoreOptions/index.html'
                    }
                }
            ],
            'url'       : 'demo/fabSpeedDial'
        },
        {
            'name'      : 'fabToolbar',
            'moduleName': 'material.components.fabToolbar',
            'label'     : 'FAB Toolbar',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'fabToolbarBasicUsageDemo',
                        'module'      : 'fabToolbarBasicUsageDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'fabToolbardemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/fabToolbar/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/fabToolbar/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.fabToolbar',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/fabToolbar/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/fabToolbar'
        },
        {
            'name'      : 'gridList',
            'moduleName': 'material.components.gridList',
            'label'     : 'Grid List',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'gridListDemo1',
                        'module'      : 'gridListDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'gridListdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'styles.css',
                            'label'     : 'styles.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/gridList/demoBasicUsage/styles.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/gridList/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.gridList',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/gridList/demoBasicUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'gridListDemoApp',
                        'module'      : 'gridListDemoApp',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'gridListdemoDynamicTiles',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/gridList/demoDynamicTiles/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/gridList/demoDynamicTiles/script.js'
                        }
                    ],
                    'moduleName': 'material.components.gridList',
                    'name'      : 'demoDynamicTiles',
                    'label'     : 'Dynamic Tiles',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/gridList/demoDynamicTiles/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'gridListDemo1',
                        'module'      : 'gridListDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'gridListdemoResponsiveUsage',
                    'css'       : [],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/gridList/demoResponsiveUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.gridList',
                    'name'      : 'demoResponsiveUsage',
                    'label'     : 'Responsive Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/gridList/demoResponsiveUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/gridList'
        },
        {
            'name'      : 'icon',
            'moduleName': 'material.components.icon',
            'label'     : 'Icon',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'appDemoFontIconsWithClassnames',
                        'module'      : 'appDemoFontIconsWithClassnames',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'icondemoFontIconsWithClassnames',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/icon/demoFontIconsWithClassnames/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/icon/demoFontIconsWithClassnames/script.js'
                        }
                    ],
                    'moduleName': 'material.components.icon',
                    'name'      : 'demoFontIconsWithClassnames',
                    'label'     : 'Font Icons With Classnames',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/icon/demoFontIconsWithClassnames/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'appDemoFontIconsWithLigatures',
                        'module'      : 'appDemoFontIconsWithLigatures',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'icondemoFontIconsWithLigatures',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/icon/demoFontIconsWithLigatures/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/icon/demoFontIconsWithLigatures/script.js'
                        }
                    ],
                    'moduleName': 'material.components.icon',
                    'name'      : 'demoFontIconsWithLigatures',
                    'label'     : 'Font Icons With Ligatures',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/icon/demoFontIconsWithLigatures/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'appDemoSvgIcons',
                        'module'      : 'appDemoSvgIcons',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'icondemoLoadSvgIconsFromUrl',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/icon/demoLoadSvgIconsFromUrl/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/icon/demoLoadSvgIconsFromUrl/script.js'
                        }
                    ],
                    'moduleName': 'material.components.icon',
                    'name'      : 'demoLoadSvgIconsFromUrl',
                    'label'     : 'Load Svg Icons From Url',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/icon/demoLoadSvgIconsFromUrl/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'appSvgIconSets',
                        'module'      : 'appSvgIconSets',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'icondemoSvgIconSets',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/icon/demoSvgIconSets/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/icon/demoSvgIconSets/script.js'
                        }
                    ],
                    'moduleName': 'material.components.icon',
                    'name'      : 'demoSvgIconSets',
                    'label'     : 'Svg Icon Sets',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/icon/demoSvgIconSets/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'appUsingTemplateCache',
                        'module'      : 'appUsingTemplateCache',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'icondemoUsingTemplateCache',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/icon/demoUsingTemplateCache/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/icon/demoUsingTemplateCache/script.js'
                        }
                    ],
                    'moduleName': 'material.components.icon',
                    'name'      : 'demoUsingTemplateCache',
                    'label'     : 'Using Template Cache',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/icon/demoUsingTemplateCache/index.html'
                    }
                }
            ],
            'url'       : 'demo/icon'
        },
        {
            'name'      : 'input',
            'moduleName': 'material.components.input',
            'label'     : 'Input',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'inputBasicDemo',
                        'module'      : 'inputBasicDemo',
                        'dependencies': [
                            'ngMaterial',
                            'ngMessages'
                        ]
                    },
                    'id'        : 'inputdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/input/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/input/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.input',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/input/demoBasicUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'inputErrorsApp',
                        'module'      : 'inputErrorsApp',
                        'dependencies': [
                            'ngMaterial',
                            'ngMessages'
                        ]
                    },
                    'id'        : 'inputdemoErrors',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/input/demoErrors/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/input/demoErrors/script.js'
                        }
                    ],
                    'moduleName': 'material.components.input',
                    'name'      : 'demoErrors',
                    'label'     : 'Errors',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/input/demoErrors/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'inputErrorsAdvancedApp',
                        'module'      : 'inputErrorsAdvancedApp',
                        'dependencies': [
                            'ngMaterial',
                            'ngMessages'
                        ]
                    },
                    'id'        : 'inputdemoErrorsAdvanced',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/input/demoErrorsAdvanced/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/input/demoErrorsAdvanced/script.js'
                        }
                    ],
                    'moduleName': 'material.components.input',
                    'name'      : 'demoErrorsAdvanced',
                    'label'     : 'Errors Advanced',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/input/demoErrorsAdvanced/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'inputIconDemo',
                        'module'      : 'inputIconDemo',
                        'dependencies': [
                            'ngMaterial',
                            'ngMessages'
                        ]
                    },
                    'id'        : 'inputdemoIcons',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/input/demoIcons/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/input/demoIcons/script.js'
                        }
                    ],
                    'moduleName': 'material.components.input',
                    'name'      : 'demoIcons',
                    'label'     : 'Icons',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/input/demoIcons/index.html'
                    }
                }
            ],
            'url'       : 'demo/input'
        },
        {
            'name'      : 'list',
            'moduleName': 'material.components.list',
            'label'     : 'List',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'listDemo1',
                        'module'      : 'listDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'listdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/list/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/list/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.list',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/list/demoBasicUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'listDemo2',
                        'module'      : 'listDemo2',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'listdemoListControls',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/list/demoListControls/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/list/demoListControls/script.js'
                        }
                    ],
                    'moduleName': 'material.components.list',
                    'name'      : 'demoListControls',
                    'label'     : 'List Controls',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/list/demoListControls/index.html'
                    }
                }
            ],
            'url'       : 'demo/list'
        },
        {
            'name'      : 'menu',
            'moduleName': 'material.components.menu',
            'label'     : 'Menu',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'menuDemoBasic',
                        'module'      : 'menuDemoBasic',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'menudemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/menu/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/menu/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.menu',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/menu/demoBasicUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'menuDemoPosition',
                        'module'      : 'menuDemoPosition',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'menudemoMenuPositionModes',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/menu/demoMenuPositionModes/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/menu/demoMenuPositionModes/script.js'
                        }
                    ],
                    'moduleName': 'material.components.menu',
                    'name'      : 'demoMenuPositionModes',
                    'label'     : 'Menu Position Modes',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/menu/demoMenuPositionModes/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'menuDemoWidth',
                        'module'      : 'menuDemoWidth',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'menudemoMenuWidth',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/menu/demoMenuWidth/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/menu/demoMenuWidth/script.js'
                        }
                    ],
                    'moduleName': 'material.components.menu',
                    'name'      : 'demoMenuWidth',
                    'label'     : 'Menu Width',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/menu/demoMenuWidth/index.html'
                    }
                }
            ],
            'url'       : 'demo/menu'
        },
        {
            'name'      : 'menuBar',
            'moduleName': 'material.components.menuBar',
            'label'     : 'Menu Bar',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'menuBarDemoBasic',
                        'module'      : 'menuBarDemoBasic',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'menuBardemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/menuBar/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/menuBar/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.menuBar',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/menuBar/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/menuBar'
        },
        {
            'name'      : 'progressCircular',
            'moduleName': 'material.components.progressCircular',
            'label'     : 'Progress Circular',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'progressCircularDemo1',
                        'module'      : 'progressCircularDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'progressCirculardemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/progressCircular/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/progressCircular/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.progressCircular',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/progressCircular/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/progressCircular'
        },
        {
            'name'      : 'progressLinear',
            'moduleName': 'material.components.progressLinear',
            'label'     : 'Progress Linear',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'progressLinearDemo1',
                        'module'      : 'progressLinearDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'progressLineardemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/progressLinear/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/progressLinear/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.progressLinear',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/progressLinear/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/progressLinear'
        },
        {
            'name'      : 'radioButton',
            'moduleName': 'material.components.radioButton',
            'label'     : 'Radio Button',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'radioDemo1',
                        'module'      : 'radioDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'radioButtondemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/radioButton/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/radioButton/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.radioButton',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/radioButton/demoBasicUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'radioDemo2',
                        'module'      : 'radioDemo2',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'radioButtondemoMultiColumn',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/radioButton/demoMultiColumn/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/radioButton/demoMultiColumn/script.js'
                        }
                    ],
                    'moduleName': 'material.components.radioButton',
                    'name'      : 'demoMultiColumn',
                    'label'     : 'Multi Column',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/radioButton/demoMultiColumn/index.html'
                    }
                }
            ],
            'url'       : 'demo/radioButton'
        },
        {
            'name'      : 'select',
            'moduleName': 'material.components.select',
            'label'     : 'Select',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'selectDemoBasic',
                        'module'      : 'selectDemoBasic',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'selectdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/select/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/select/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.select',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/select/demoBasicUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'selectDemoOptGroups',
                        'module'      : 'selectDemoOptGroups',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'selectdemoOptionGroups',
                    'css'       : [],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/select/demoOptionGroups/script.js'
                        }
                    ],
                    'moduleName': 'material.components.select',
                    'name'      : 'demoOptionGroups',
                    'label'     : 'Option Groups',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/select/demoOptionGroups/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'selectDemoOptionsAsync',
                        'module'      : 'selectDemoOptionsAsync',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'selectdemoOptionsWithAsyncSearch',
                    'css'       : [],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/select/demoOptionsWithAsyncSearch/script.js'
                        }
                    ],
                    'moduleName': 'material.components.select',
                    'name'      : 'demoOptionsWithAsyncSearch',
                    'label'     : 'Options With Async Search',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/select/demoOptionsWithAsyncSearch/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'selectDemoValidation',
                        'module'      : 'selectDemoValidation',
                        'dependencies': [
                            'ngMaterial',
                            'ngMessages'
                        ]
                    },
                    'id'        : 'selectdemoValidations',
                    'css'       : [],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/select/demoValidations/script.js'
                        }
                    ],
                    'moduleName': 'material.components.select',
                    'name'      : 'demoValidations',
                    'label'     : 'Validations',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/select/demoValidations/index.html'
                    }
                }
            ],
            'url'       : 'demo/select'
        },
        {
            'name'      : 'sidenav',
            'moduleName': 'material.components.sidenav',
            'label'     : 'Sidenav',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'sidenavDemo1',
                        'module'      : 'sidenavDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'sidenavdemoBasicUsage',
                    'css'       : [],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/sidenav/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.sidenav',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/sidenav/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/sidenav'
        },
        {
            'name'      : 'slider',
            'moduleName': 'material.components.slider',
            'label'     : 'Slider',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'sliderDemo1',
                        'module'      : 'sliderDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'sliderdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/slider/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/slider/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.slider',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/slider/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/slider'
        },
        {
            'name'      : 'subheader',
            'moduleName': 'material.components.subheader',
            'label'     : 'Subheader',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'subheaderBasicDemo',
                        'module'      : 'subheaderBasicDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'subheaderdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/subheader/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/subheader/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.subheader',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/subheader/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/subheader'
        },
        {
            'name'      : 'swipe',
            'moduleName': 'material.components.swipe',
            'label'     : 'Swipe',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'demoSwipe',
                        'module'      : 'demoSwipe',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'swipedemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/swipe/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [
                        {
                            'name'      : 'readme.html',
                            'label'     : 'readme.html',
                            'fileType'  : 'html',
                            'outputPath': 'demo-partials/swipe/demoBasicUsage/readme.html'
                        }
                    ],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/swipe/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.swipe',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/swipe/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/swipe'
        },
        {
            'name'      : 'switch',
            'moduleName': 'material.components.switch',
            'label'     : 'Switch',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'switchDemo1',
                        'module'      : 'switchDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'switchdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/switch/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/switch/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.switch',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/switch/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/switch'
        },
        {
            'name'      : 'tabs',
            'moduleName': 'material.components.tabs',
            'label'     : 'Tabs',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'tabsDemoDynamicHeight',
                        'module'      : 'tabsDemoDynamicHeight',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'tabsdemoDynamicHeight',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/tabs/demoDynamicHeight/style.css'
                        }
                    ],
                    'html'      : [
                        {
                            'name'      : 'readme.html',
                            'label'     : 'readme.html',
                            'fileType'  : 'html',
                            'outputPath': 'demo-partials/tabs/demoDynamicHeight/readme.html'
                        }
                    ],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/tabs/demoDynamicHeight/script.js'
                        }
                    ],
                    'moduleName': 'material.components.tabs',
                    'name'      : 'demoDynamicHeight',
                    'label'     : 'Dynamic Height',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/tabs/demoDynamicHeight/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'tabsDemoDynamicTabs',
                        'module'      : 'tabsDemoDynamicTabs',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'tabsdemoDynamicTabs',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/tabs/demoDynamicTabs/style.css'
                        }
                    ],
                    'html'      : [
                        {
                            'name'      : 'readme.html',
                            'label'     : 'readme.html',
                            'fileType'  : 'html',
                            'outputPath': 'demo-partials/tabs/demoDynamicTabs/readme.html'
                        }
                    ],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/tabs/demoDynamicTabs/script.js'
                        }
                    ],
                    'moduleName': 'material.components.tabs',
                    'name'      : 'demoDynamicTabs',
                    'label'     : 'Dynamic Tabs',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/tabs/demoDynamicTabs/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'tabsDemoStaticTabs',
                        'module'      : 'tabsDemoStaticTabs',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'tabsdemoStaticTabs',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/tabs/demoStaticTabs/style.css'
                        }
                    ],
                    'html'      : [
                        {
                            'name'      : 'readme.html',
                            'label'     : 'readme.html',
                            'fileType'  : 'html',
                            'outputPath': 'demo-partials/tabs/demoStaticTabs/readme.html'
                        }
                    ],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/tabs/demoStaticTabs/script.js'
                        }
                    ],
                    'moduleName': 'material.components.tabs',
                    'name'      : 'demoStaticTabs',
                    'label'     : 'Static Tabs',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/tabs/demoStaticTabs/index.html'
                    }
                }
            ],
            'url'       : 'demo/tabs'
        },
        {
            'name'      : 'toast',
            'moduleName': 'material.components.toast',
            'label'     : 'Toast',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'toastDemo1',
                        'module'      : 'toastDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'toastdemoBasicUsage',
                    'css'       : [],
                    'html'      : [
                        {
                            'name'      : 'toast-template.html',
                            'label'     : 'toast-template.html',
                            'fileType'  : 'html',
                            'outputPath': 'demo-partials/toast/demoBasicUsage/toast-template.html'
                        }
                    ],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/toast/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.toast',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/toast/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/toast'
        },
        {
            'name'      : 'toolbar',
            'moduleName': 'material.components.toolbar',
            'label'     : 'Toolbar',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'toolbarDemo1',
                        'module'      : 'toolbarDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'toolbardemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/toolbar/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/toolbar/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.toolbar',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/toolbar/demoBasicUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'toolbarDemo2',
                        'module'      : 'toolbarDemo2',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'toolbardemoScrollShrink',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/toolbar/demoScrollShrink/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/toolbar/demoScrollShrink/script.js'
                        }
                    ],
                    'moduleName': 'material.components.toolbar',
                    'name'      : 'demoScrollShrink',
                    'label'     : 'Scroll Shrink',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/toolbar/demoScrollShrink/index.html'
                    }
                }
            ],
            'url'       : 'demo/toolbar'
        },
        {
            'name'      : 'tooltip',
            'moduleName': 'material.components.tooltip',
            'label'     : 'Tooltip',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'tooltipDemo1',
                        'module'      : 'tooltipDemo1',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'tooltipdemoBasicUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/tooltip/demoBasicUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/tooltip/demoBasicUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.tooltip',
                    'name'      : 'demoBasicUsage',
                    'label'     : 'Basic Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/tooltip/demoBasicUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/tooltip'
        },
        {
            'name'      : 'virtualRepeat',
            'moduleName': 'material.components.virtualRepeat',
            'label'     : 'Virtual Repeat',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'virtualRepeatDeferredLoadingDemo',
                        'module'      : 'virtualRepeatDeferredLoadingDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'virtualRepeatdemoDeferredLoading',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/virtualRepeat/demoDeferredLoading/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/virtualRepeat/demoDeferredLoading/script.js'
                        }
                    ],
                    'moduleName': 'material.components.virtualRepeat',
                    'name'      : 'demoDeferredLoading',
                    'label'     : 'Deferred Loading',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/virtualRepeat/demoDeferredLoading/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'virtualRepeatHorizontalDemo',
                        'module'      : 'virtualRepeatHorizontalDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'virtualRepeatdemoHorizontalUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/virtualRepeat/demoHorizontalUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/virtualRepeat/demoHorizontalUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.virtualRepeat',
                    'name'      : 'demoHorizontalUsage',
                    'label'     : 'Horizontal Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/virtualRepeat/demoHorizontalUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'virtualRepeatInfiniteScrollDemo',
                        'module'      : 'virtualRepeatInfiniteScrollDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'virtualRepeatdemoInfiniteScroll',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/virtualRepeat/demoInfiniteScroll/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/virtualRepeat/demoInfiniteScroll/script.js'
                        }
                    ],
                    'moduleName': 'material.components.virtualRepeat',
                    'name'      : 'demoInfiniteScroll',
                    'label'     : 'Infinite Scroll',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/virtualRepeat/demoInfiniteScroll/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'virtualRepeatScrollToDemo',
                        'module'      : 'virtualRepeatScrollToDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'virtualRepeatdemoScrollTo',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/virtualRepeat/demoScrollTo/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/virtualRepeat/demoScrollTo/script.js'
                        }
                    ],
                    'moduleName': 'material.components.virtualRepeat',
                    'name'      : 'demoScrollTo',
                    'label'     : 'Scroll To',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/virtualRepeat/demoScrollTo/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'virtualRepeatVerticalDemo',
                        'module'      : 'virtualRepeatVerticalDemo',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'virtualRepeatdemoVerticalUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/virtualRepeat/demoVerticalUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/virtualRepeat/demoVerticalUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.virtualRepeat',
                    'name'      : 'demoVerticalUsage',
                    'label'     : 'Vertical Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/virtualRepeat/demoVerticalUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/virtualRepeat'
        },
        {
            'name'      : 'whiteframe',
            'moduleName': 'material.components.whiteframe',
            'label'     : 'Whiteframe',
            'demos'     : [
                {
                    'ngModule'  : {
                        'name'        : 'whiteframeBasicUsage',
                        'module'      : 'whiteframeBasicUsage',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'whiteframedemoBasicClassUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/whiteframe/demoBasicClassUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/whiteframe/demoBasicClassUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.whiteframe',
                    'name'      : 'demoBasicClassUsage',
                    'label'     : 'Basic Class Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/whiteframe/demoBasicClassUsage/index.html'
                    }
                },
                {
                    'ngModule'  : {
                        'name'        : 'whiteframeDirectiveUsage',
                        'module'      : 'whiteframeDirectiveUsage',
                        'dependencies': [
                            'ngMaterial'
                        ]
                    },
                    'id'        : 'whiteframedemoDirectiveAttributeUsage',
                    'css'       : [
                        {
                            'name'      : 'style.css',
                            'label'     : 'style.css',
                            'fileType'  : 'css',
                            'outputPath': 'demo-partials/whiteframe/demoDirectiveAttributeUsage/style.css'
                        }
                    ],
                    'html'      : [],
                    'js'        : [
                        {
                            'name'      : 'script.js',
                            'label'     : 'script.js',
                            'fileType'  : 'js',
                            'outputPath': 'demo-partials/whiteframe/demoDirectiveAttributeUsage/script.js'
                        }
                    ],
                    'moduleName': 'material.components.whiteframe',
                    'name'      : 'demoDirectiveAttributeUsage',
                    'label'     : 'Directive Attribute Usage',
                    'index'     : {
                        'name'      : 'index.html',
                        'label'     : 'index.html',
                        'fileType'  : 'html',
                        'outputPath': 'demo-partials/whiteframe/demoDirectiveAttributeUsage/index.html'
                    }
                }
            ],
            'url'       : 'demo/whiteframe'
        }
    ]);
angular.module('app.components.material-docs')
    .constant('COMPONENTS', [
        {
            'name'      : 'material.components.autocomplete',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.autocomplete/index.html',
            'url'       : 'api/material.components.autocomplete',
            'label'     : 'material.components.autocomplete',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/autocomplete/autocomplete.js',
            'docs'      : [
                {
                    'name'      : 'mdAutocomplete',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.autocomplete/directive/mdAutocomplete.html',
                    'url'       : 'api/directive/mdAutocomplete',
                    'label'     : 'mdAutocomplete',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/autocomplete/js/autocompleteDirective.js',
                    'hasDemo'   : true
                },
                {
                    'name'      : 'mdHighlightText',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.autocomplete/directive/mdHighlightText.html',
                    'url'       : 'api/directive/mdHighlightText',
                    'label'     : 'mdHighlightText',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/autocomplete/js/highlightDirective.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.bottomSheet',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.bottomSheet/index.html',
            'url'       : 'api/material.components.bottomSheet',
            'label'     : 'material.components.bottomSheet',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/bottomSheet/bottom-sheet.js',
            'docs'      : [
                {
                    'name'      : '$mdBottomSheet',
                    'type'      : 'service',
                    'outputPath': 'partials/api/material.components.bottomSheet/service/$mdBottomSheet.html',
                    'url'       : 'api/service/$mdBottomSheet',
                    'label'     : '$mdBottomSheet',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/bottomSheet/bottom-sheet.js',
                    'hasDemo'   : false
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.button',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.button/index.html',
            'url'       : 'api/material.components.button',
            'label'     : 'material.components.button',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/button/button.js',
            'docs'      : [
                {
                    'name'      : 'mdButton',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.button/directive/mdButton.html',
                    'url'       : 'api/directive/mdButton',
                    'label'     : 'mdButton',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/button/button.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.card',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.card/index.html',
            'url'       : 'api/material.components.card',
            'label'     : 'material.components.card',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/card/card.js',
            'docs'      : [
                {
                    'name'      : 'mdCard',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.card/directive/mdCard.html',
                    'url'       : 'api/directive/mdCard',
                    'label'     : 'mdCard',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/card/card.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.checkbox',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.checkbox/index.html',
            'url'       : 'api/material.components.checkbox',
            'label'     : 'material.components.checkbox',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/checkbox/checkbox.js',
            'docs'      : [
                {
                    'name'      : 'mdCheckbox',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.checkbox/directive/mdCheckbox.html',
                    'url'       : 'api/directive/mdCheckbox',
                    'label'     : 'mdCheckbox',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/checkbox/checkbox.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.chips',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.chips/index.html',
            'url'       : 'api/material.components.chips',
            'label'     : 'material.components.chips',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/chips/chips.js',
            'docs'      : [
                {
                    'name'      : 'mdChip',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.chips/directive/mdChip.html',
                    'url'       : 'api/directive/mdChip',
                    'label'     : 'mdChip',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/chips/js/chipDirective.js',
                    'hasDemo'   : true
                },
                {
                    'name'      : 'mdChipRemove',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.chips/directive/mdChipRemove.html',
                    'url'       : 'api/directive/mdChipRemove',
                    'label'     : 'mdChipRemove',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/chips/js/chipRemoveDirective.js'
                },
                {
                    'name'      : 'mdChips',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.chips/directive/mdChips.html',
                    'url'       : 'api/directive/mdChips',
                    'label'     : 'mdChips',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/chips/js/chipsDirective.js'
                },
                {
                    'name'      : 'mdContactChips',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.chips/directive/mdContactChips.html',
                    'url'       : 'api/directive/mdContactChips',
                    'label'     : 'mdContactChips',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/chips/js/contactChipsDirective.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.content',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.content/index.html',
            'url'       : 'api/material.components.content',
            'label'     : 'material.components.content',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/content/content.js',
            'docs'      : [
                {
                    'name'      : 'mdContent',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.content/directive/mdContent.html',
                    'url'       : 'api/directive/mdContent',
                    'label'     : 'mdContent',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/content/content.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.datepicker',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.datepicker/index.html',
            'url'       : 'api/material.components.datepicker',
            'label'     : 'material.components.datepicker',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/datepicker/calendar.js',
            'docs'      : [
                {
                    'name'      : '$mdDateLocaleProvider',
                    'type'      : 'service',
                    'outputPath': 'partials/api/material.components.datepicker/service/$mdDateLocaleProvider.html',
                    'url'       : 'api/service/$mdDateLocaleProvider',
                    'label'     : '$mdDateLocaleProvider',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/datepicker/dateLocaleProvider.js',
                    'hasDemo'   : false
                },
                {
                    'name'      : 'mdDatepicker',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.datepicker/directive/mdDatepicker.html',
                    'url'       : 'api/directive/mdDatepicker',
                    'label'     : 'mdDatepicker',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/datepicker/datePicker.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.dialog',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.dialog/index.html',
            'url'       : 'api/material.components.dialog',
            'label'     : 'material.components.dialog',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/dialog/dialog.js',
            'docs'      : [
                {
                    'name'      : 'mdDialog',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.dialog/directive/mdDialog.html',
                    'url'       : 'api/directive/mdDialog',
                    'label'     : 'mdDialog',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/dialog/dialog.js',
                    'hasDemo'   : true
                },
                {
                    'name'      : '$mdDialog',
                    'type'      : 'service',
                    'outputPath': 'partials/api/material.components.dialog/service/$mdDialog.html',
                    'url'       : 'api/service/$mdDialog',
                    'label'     : '$mdDialog',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/dialog/dialog.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.divider',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.divider/index.html',
            'url'       : 'api/material.components.divider',
            'label'     : 'material.components.divider',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/divider/divider.js',
            'docs'      : [
                {
                    'name'      : 'mdDivider',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.divider/directive/mdDivider.html',
                    'url'       : 'api/directive/mdDivider',
                    'label'     : 'mdDivider',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/divider/divider.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.fabActions',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.fabActions/index.html',
            'url'       : 'api/material.components.fabActions',
            'label'     : 'material.components.fabActions',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/fabActions/fabActions.js',
            'docs'      : [
                {
                    'name'      : 'mdFabActions',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.fabActions/directive/mdFabActions.html',
                    'url'       : 'api/directive/mdFabActions',
                    'label'     : 'mdFabActions',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/fabActions/fabActions.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.fabSpeedDial',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.fabSpeedDial/index.html',
            'url'       : 'api/material.components.fabSpeedDial',
            'label'     : 'material.components.fabSpeedDial',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/fabSpeedDial/fabSpeedDial.js',
            'docs'      : [
                {
                    'name'      : 'mdFabSpeedDial',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.fabSpeedDial/directive/mdFabSpeedDial.html',
                    'url'       : 'api/directive/mdFabSpeedDial',
                    'label'     : 'mdFabSpeedDial',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/fabSpeedDial/fabSpeedDial.js',
                    'hasDemo'   : true
                },
                {
                    'name'      : 'mdFabTrigger',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.fabSpeedDial/directive/mdFabTrigger.html',
                    'url'       : 'api/directive/mdFabTrigger',
                    'label'     : 'mdFabTrigger',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/fabTrigger/fabTrigger.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.fabToolbar',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.fabToolbar/index.html',
            'url'       : 'api/material.components.fabToolbar',
            'label'     : 'material.components.fabToolbar',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/fabToolbar/fabToolbar.js',
            'docs'      : [
                {
                    'name'      : 'mdFabToolbar',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.fabToolbar/directive/mdFabToolbar.html',
                    'url'       : 'api/directive/mdFabToolbar',
                    'label'     : 'mdFabToolbar',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/fabToolbar/fabToolbar.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.gridList',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.gridList/index.html',
            'url'       : 'api/material.components.gridList',
            'label'     : 'material.components.gridList',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/gridList/grid-list.js',
            'docs'      : [
                {
                    'name'      : 'mdGridList',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.gridList/directive/mdGridList.html',
                    'url'       : 'api/directive/mdGridList',
                    'label'     : 'mdGridList',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/gridList/grid-list.js',
                    'hasDemo'   : true
                },
                {
                    'name'      : 'mdGridTile',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.gridList/directive/mdGridTile.html',
                    'url'       : 'api/directive/mdGridTile',
                    'label'     : 'mdGridTile',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/gridList/grid-list.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.icon',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.icon/index.html',
            'url'       : 'api/material.components.icon',
            'label'     : 'material.components.icon',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/icon/icon.js',
            'docs'      : [
                {
                    'name'      : 'mdIcon',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.icon/directive/mdIcon.html',
                    'url'       : 'api/directive/mdIcon',
                    'label'     : 'mdIcon',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/icon/js/iconDirective.js',
                    'hasDemo'   : true
                },
                {
                    'name'      : '$mdIconProvider',
                    'type'      : 'service',
                    'outputPath': 'partials/api/material.components.icon/service/$mdIconProvider.html',
                    'url'       : 'api/service/$mdIconProvider',
                    'label'     : '$mdIconProvider',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/icon/js/iconService.js'
                },
                {
                    'name'      : '$mdIcon',
                    'type'      : 'service',
                    'outputPath': 'partials/api/material.components.icon/service/$mdIcon.html',
                    'url'       : 'api/service/$mdIcon',
                    'label'     : '$mdIcon',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/icon/js/iconService.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.input',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.input/index.html',
            'url'       : 'api/material.components.input',
            'label'     : 'material.components.input',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/input/input.js',
            'docs'      : [
                {
                    'name'      : 'mdInputContainer',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.input/directive/mdInputContainer.html',
                    'url'       : 'api/directive/mdInputContainer',
                    'label'     : 'mdInputContainer',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/input/input.js',
                    'hasDemo'   : true
                },
                {
                    'name'      : 'mdInput',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.input/directive/mdInput.html',
                    'url'       : 'api/directive/mdInput',
                    'label'     : 'mdInput',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/input/input.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.list',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.list/index.html',
            'url'       : 'api/material.components.list',
            'label'     : 'material.components.list',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/list/list.js',
            'docs'      : [
                {
                    'name'      : 'mdList',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.list/directive/mdList.html',
                    'url'       : 'api/directive/mdList',
                    'label'     : 'mdList',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/list/list.js',
                    'hasDemo'   : true
                },
                {
                    'name'      : 'mdListItem',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.list/directive/mdListItem.html',
                    'url'       : 'api/directive/mdListItem',
                    'label'     : 'mdListItem',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/list/list.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.menu',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.menu/index.html',
            'url'       : 'api/material.components.menu',
            'label'     : 'material.components.menu',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/menu/menu.js',
            'docs'      : [
                {
                    'name'      : 'mdMenu',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.menu/directive/mdMenu.html',
                    'url'       : 'api/directive/mdMenu',
                    'label'     : 'mdMenu',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/menu/js/menuDirective.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.menu-bar',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.menu-bar/index.html',
            'url'       : 'api/material.components.menu-bar',
            'label'     : 'material.components.menu-bar',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/menuBar/menu-bar.js',
            'docs'      : [
                {
                    'name'      : 'mdMenuBar',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.menu-bar/directive/mdMenuBar.html',
                    'url'       : 'api/directive/mdMenuBar',
                    'label'     : 'mdMenuBar',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/menuBar/js/menuBarDirective.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.progressCircular',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.progressCircular/index.html',
            'url'       : 'api/material.components.progressCircular',
            'label'     : 'material.components.progressCircular',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/progressCircular/progress-circular.js',
            'docs'      : [
                {
                    'name'      : 'mdProgressCircular',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.progressCircular/directive/mdProgressCircular.html',
                    'url'       : 'api/directive/mdProgressCircular',
                    'label'     : 'mdProgressCircular',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/progressCircular/progress-circular.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.progressLinear',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.progressLinear/index.html',
            'url'       : 'api/material.components.progressLinear',
            'label'     : 'material.components.progressLinear',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/progressLinear/progress-linear.js',
            'docs'      : [
                {
                    'name'      : 'mdProgressLinear',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.progressLinear/directive/mdProgressLinear.html',
                    'url'       : 'api/directive/mdProgressLinear',
                    'label'     : 'mdProgressLinear',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/progressLinear/progress-linear.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.radioButton',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.radioButton/index.html',
            'url'       : 'api/material.components.radioButton',
            'label'     : 'material.components.radioButton',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/radioButton/radio-button.js',
            'docs'      : [
                {
                    'name'      : 'mdRadioGroup',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.radioButton/directive/mdRadioGroup.html',
                    'url'       : 'api/directive/mdRadioGroup',
                    'label'     : 'mdRadioGroup',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/radioButton/radio-button.js',
                    'hasDemo'   : true
                },
                {
                    'name'      : 'mdRadioButton',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.radioButton/directive/mdRadioButton.html',
                    'url'       : 'api/directive/mdRadioButton',
                    'label'     : 'mdRadioButton',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/radioButton/radio-button.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.select',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.select/index.html',
            'url'       : 'api/material.components.select',
            'label'     : 'material.components.select',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/select/select.js',
            'docs'      : [
                {
                    'name'      : 'mdSelect',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.select/directive/mdSelect.html',
                    'url'       : 'api/directive/mdSelect',
                    'label'     : 'mdSelect',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/select/select.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.sidenav',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.sidenav/index.html',
            'url'       : 'api/material.components.sidenav',
            'label'     : 'material.components.sidenav',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/sidenav/sidenav.js',
            'docs'      : [
                {
                    'name'      : '$mdSidenav',
                    'type'      : 'service',
                    'outputPath': 'partials/api/material.components.sidenav/service/$mdSidenav.html',
                    'url'       : 'api/service/$mdSidenav',
                    'label'     : '$mdSidenav',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/sidenav/sidenav.js',
                    'hasDemo'   : false
                },
                {
                    'name'      : 'mdSidenavFocus',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.sidenav/directive/mdSidenavFocus.html',
                    'url'       : 'api/directive/mdSidenavFocus',
                    'label'     : 'mdSidenavFocus',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/sidenav/sidenav.js'
                },
                {
                    'name'      : 'mdSidenav',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.sidenav/directive/mdSidenav.html',
                    'url'       : 'api/directive/mdSidenav',
                    'label'     : 'mdSidenav',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/sidenav/sidenav.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.slider',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.slider/index.html',
            'url'       : 'api/material.components.slider',
            'label'     : 'material.components.slider',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/slider/slider.js',
            'docs'      : [
                {
                    'name'      : 'mdSlider',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.slider/directive/mdSlider.html',
                    'url'       : 'api/directive/mdSlider',
                    'label'     : 'mdSlider',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/slider/slider.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.sticky',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.sticky/index.html',
            'url'       : 'api/material.components.sticky',
            'label'     : 'material.components.sticky',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/sticky/sticky.js',
            'docs'      : [
                {
                    'name'      : '$mdSticky',
                    'type'      : 'service',
                    'outputPath': 'partials/api/material.components.sticky/service/$mdSticky.html',
                    'url'       : 'api/service/$mdSticky',
                    'label'     : '$mdSticky',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/sticky/sticky.js',
                    'hasDemo'   : false
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.subheader',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.subheader/index.html',
            'url'       : 'api/material.components.subheader',
            'label'     : 'material.components.subheader',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/subheader/subheader.js',
            'docs'      : [
                {
                    'name'      : 'mdSubheader',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.subheader/directive/mdSubheader.html',
                    'url'       : 'api/directive/mdSubheader',
                    'label'     : 'mdSubheader',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/subheader/subheader.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.swipe',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.swipe/index.html',
            'url'       : 'api/material.components.swipe',
            'label'     : 'material.components.swipe',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/swipe/swipe.js',
            'docs'      : [
                {
                    'name'      : 'mdSwipeLeft',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.swipe/directive/mdSwipeLeft.html',
                    'url'       : 'api/directive/mdSwipeLeft',
                    'label'     : 'mdSwipeLeft',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/swipe/swipe.js',
                    'hasDemo'   : true
                },
                {
                    'name'      : 'mdSwipeRight',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.swipe/directive/mdSwipeRight.html',
                    'url'       : 'api/directive/mdSwipeRight',
                    'label'     : 'mdSwipeRight',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/swipe/swipe.js'
                },
                {
                    'name'      : 'mdSwipeUp',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.swipe/directive/mdSwipeUp.html',
                    'url'       : 'api/directive/mdSwipeUp',
                    'label'     : 'mdSwipeUp',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/swipe/swipe.js'
                },
                {
                    'name'      : 'mdSwipeDown',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.swipe/directive/mdSwipeDown.html',
                    'url'       : 'api/directive/mdSwipeDown',
                    'label'     : 'mdSwipeDown',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/swipe/swipe.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.switch',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.switch/index.html',
            'url'       : 'api/material.components.switch',
            'label'     : 'material.components.switch',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/switch/switch.js',
            'docs'      : [
                {
                    'name'      : 'mdSwitch',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.switch/directive/mdSwitch.html',
                    'url'       : 'api/directive/mdSwitch',
                    'label'     : 'mdSwitch',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/switch/switch.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.tabs',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.tabs/index.html',
            'url'       : 'api/material.components.tabs',
            'label'     : 'material.components.tabs',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/tabs/tabs.js',
            'docs'      : [
                {
                    'name'      : 'mdTab',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.tabs/directive/mdTab.html',
                    'url'       : 'api/directive/mdTab',
                    'label'     : 'mdTab',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/tabs/js/tabDirective.js',
                    'hasDemo'   : true
                },
                {
                    'name'      : 'mdTabs',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.tabs/directive/mdTabs.html',
                    'url'       : 'api/directive/mdTabs',
                    'label'     : 'mdTabs',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/tabs/js/tabsDirective.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.toast',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.toast/index.html',
            'url'       : 'api/material.components.toast',
            'label'     : 'material.components.toast',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/toast/toast.js',
            'docs'      : [
                {
                    'name'      : '$mdToast',
                    'type'      : 'service',
                    'outputPath': 'partials/api/material.components.toast/service/$mdToast.html',
                    'url'       : 'api/service/$mdToast',
                    'label'     : '$mdToast',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/toast/toast.js',
                    'hasDemo'   : false
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.toolbar',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.toolbar/index.html',
            'url'       : 'api/material.components.toolbar',
            'label'     : 'material.components.toolbar',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/toolbar/toolbar.js',
            'docs'      : [
                {
                    'name'      : 'mdToolbar',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.toolbar/directive/mdToolbar.html',
                    'url'       : 'api/directive/mdToolbar',
                    'label'     : 'mdToolbar',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/toolbar/toolbar.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.tooltip',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.tooltip/index.html',
            'url'       : 'api/material.components.tooltip',
            'label'     : 'material.components.tooltip',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/tooltip/tooltip.js',
            'docs'      : [
                {
                    'name'      : 'mdTooltip',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.tooltip/directive/mdTooltip.html',
                    'url'       : 'api/directive/mdTooltip',
                    'label'     : 'mdTooltip',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/tooltip/tooltip.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.virtualRepeat',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.virtualRepeat/index.html',
            'url'       : 'api/material.components.virtualRepeat',
            'label'     : 'material.components.virtualRepeat',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/virtualRepeat/virtual-repeater.js',
            'docs'      : [
                {
                    'name'      : 'mdVirtualRepeatContainer',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.virtualRepeat/directive/mdVirtualRepeatContainer.html',
                    'url'       : 'api/directive/mdVirtualRepeatContainer',
                    'label'     : 'mdVirtualRepeatContainer',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/virtualRepeat/virtual-repeater.js',
                    'hasDemo'   : true
                },
                {
                    'name'      : 'mdVirtualRepeat',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.virtualRepeat/directive/mdVirtualRepeat.html',
                    'url'       : 'api/directive/mdVirtualRepeat',
                    'label'     : 'mdVirtualRepeat',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/virtualRepeat/virtual-repeater.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.components.whiteframe',
            'type'      : 'module',
            'outputPath': 'partials/api/material.components.whiteframe/index.html',
            'url'       : 'api/material.components.whiteframe',
            'label'     : 'material.components.whiteframe',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/whiteframe/whiteframe.js',
            'docs'      : [
                {
                    'name'      : 'mdWhiteframe',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.components.whiteframe/directive/mdWhiteframe.html',
                    'url'       : 'api/directive/mdWhiteframe',
                    'label'     : 'mdWhiteframe',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/whiteframe/whiteframe.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.core.ripple',
            'type'      : 'module',
            'outputPath': 'partials/api/material.core.ripple/index.html',
            'url'       : 'api/material.core.ripple',
            'label'     : 'material.core.ripple',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/l/src/core/services/ripple/ripple.js',
            'docs'      : [
                {
                    'name'      : 'mdInkRipple',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.core.ripple/directive/mdInkRipple.html',
                    'url'       : 'api/directive/mdInkRipple',
                    'label'     : 'mdInkRipple',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/l/src/core/services/ripple/ripple.js',
                    'hasDemo'   : true
                },
                {
                    'name'      : '$mdInkRipple',
                    'type'      : 'service',
                    'outputPath': 'partials/api/material.core.ripple/service/$mdInkRipple.html',
                    'url'       : 'api/service/$mdInkRipple',
                    'label'     : '$mdInkRipple',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/l/src/core/services/ripple/ripple.js'
                }
            ],
            'hasDemo'   : false
        },
        {
            'name'      : 'material.core.util',
            'type'      : 'module',
            'outputPath': 'partials/api/material.core.util/index.html',
            'url'       : 'api/material.core.util',
            'label'     : 'material.core.util',
            'module'    : 'material.components',
            'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/l/src/core/util/util.js',
            'docs'      : [
                {
                    'name'      : 'mdAutofocus',
                    'type'      : 'directive',
                    'outputPath': 'partials/api/material.core.util/directive/mdAutofocus.html',
                    'url'       : 'api/directive/mdAutofocus',
                    'label'     : 'mdAutofocus',
                    'module'    : 'material.components',
                    'githubUrl' : 'https://github.com/angular/material/blob/master/src/components/l/src/core/util/autofocus.js',
                    'hasDemo'   : true
                }
            ],
            'hasDemo'   : false
        }
    ]);
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.components.charts.nvd3', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.components_charts_nvd3', {
            url  : '/components/charts/nvd3',
            views: {
                'content@app': {
                    templateUrl: 'app/main/components/charts/nvd3/nvd3.html',
                    controller : 'Nvd3Controller as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    Nvd3Controller.$inject = ["fuseTheming"];
    angular
        .module('app.components.charts.nvd3')
        .controller('Nvd3Controller', Nvd3Controller);

    function Nvd3Controller(fuseTheming)
    {
        var vm = this;

        // Data
        vm.themes = fuseTheming.themes;

        vm.lineChart = {
            options: {
                chart   : {
                    type                   : 'lineChart',
                    height                 : 450,
                    margin                 : {
                        top   : 20,
                        right : 20,
                        bottom: 40,
                        left  : 55
                    },
                    x                      : function (d)
                    {
                        return d.x;
                    },
                    y                      : function (d)
                    {
                        return d.y;
                    },
                    useInteractiveGuideline: true,
                    xAxis                  : {
                        axisLabel: 'Time (ms)'
                    },
                    yAxis                  : {
                        axisLabel        : 'Voltage (v)',
                        tickFormat       : function (d)
                        {
                            return d3.format('.02f')(d);
                        },
                        axisLabelDistance: 30
                    }
                },
                title   : {
                    enable: true,
                    text  : 'Title for Line Chart'
                },
                subtitle: {
                    enable: true,
                    text  : 'Subtitle for simple line chart. Lorem ipsum dolor sit amet, at eam blandit sadipscing, vim adhuc sanctus disputando ex, cu usu affert alienum urbanitas.',
                    css   : {
                        'text-align': 'center',
                        'margin'    : '10px 13px 0px 7px'
                    }
                },
                caption : {
                    enable: true,
                    html  : '<b>Figure 1.</b> Lorem ipsum dolor sit amet, at eam blandit sadipscing, <span style="text-decoration: underline;">vim adhuc sanctus disputando ex</span>, cu usu affert alienum urbanitas. <i>Cum in purto erat, mea ne nominavi persecuti reformidans.</i> Docendi blandit abhorreant ea has, minim tantas alterum pro eu. <span style="color: darkred;">Exerci graeci ad vix, elit tacimates ea duo</span>. Id mel eruditi fuisset. Stet vidit patrioque in pro, eum ex veri verterem abhorreant, id unum oportere intellegam nec<sup>[1, <a href="https://github.com/krispo/angular-nvd3" target="_blank">2</a>, 3]</sup>.',
                    css   : {
                        'text-align': 'justify',
                        'margin'    : '10px 13px 0px 7px'
                    }
                }
            },
            data   : sinAndCos()
        };

        vm.stackedAreaChart = {
            options: {
                chart: {
                    type                   : 'stackedAreaChart',
                    height                 : 450,
                    margin                 : {
                        top   : 20,
                        right : 20,
                        bottom: 60,
                        left  : 40
                    },
                    x                      : function (d)
                    {
                        return d[0];
                    },
                    y                      : function (d)
                    {
                        return d[1];
                    },
                    useVoronoi             : false,
                    clipEdge               : true,
                    transitionDuration     : 500,
                    useInteractiveGuideline: true,
                    xAxis                  : {
                        showMaxMin: false,
                        tickFormat: function (d)
                        {
                            return d3.time.format('%x')(new Date(d));
                        }
                    },
                    yAxis                  : {
                        tickFormat: function (d)
                        {
                            return d3.format(',.2f')(d);
                        }
                    }
                }
            },

            data: [
                {
                    'key'   : 'North America',
                    'values': [[1025409600000, 23.041422681023], [1028088000000, 19.854291255832], [1030766400000, 21.02286281168], [1033358400000, 22.093608385173], [1036040400000, 25.108079299458], [1038632400000, 26.982389242348], [1041310800000, 19.828984957662], [1043989200000, 19.914055036294], [1046408400000, 19.436150539916], [1049086800000, 21.558650338602], [1051675200000, 24.395594061773], [1054353600000, 24.747089309384], [1056945600000, 23.491755498807], [1059624000000, 23.376634878164], [1062302400000, 24.581223154533], [1064894400000, 24.922476843538], [1067576400000, 27.357712939042], [1070168400000, 26.503020572593], [1072846800000, 26.658901244878], [1075525200000, 27.065704156445], [1078030800000, 28.735320452588], [1080709200000, 31.572277846319], [1083297600000, 30.932161503638], [1085976000000, 31.627029785554], [1088568000000, 28.728743674232], [1091246400000, 26.858365172675], [1093924800000, 27.279922830032], [1096516800000, 34.408301211324], [1099195200000, 34.794362930439], [1101790800000, 35.609978198951], [1104469200000, 33.574394968037], [1107147600000, 31.979405070598], [1109566800000, 31.19009040297], [1112245200000, 31.083933968994], [1114833600000, 29.668971113185], [1117512000000, 31.490638014379], [1120104000000, 31.818617451128], [1122782400000, 32.960314008183], [1125460800000, 31.313383196209], [1128052800000, 33.125486081852], [1130734800000, 32.791805509149], [1133326800000, 33.506038030366], [1136005200000, 26.96501697216], [1138683600000, 27.38478809681], [1141102800000, 27.371377218209], [1143781200000, 26.309915460827], [1146369600000, 26.425199957518], [1149048000000, 26.823411519396], [1151640000000, 23.850443591587], [1154318400000, 23.158355444054], [1156996800000, 22.998689393695], [1159588800000, 27.9771285113], [1162270800000, 29.073672469719], [1164862800000, 28.587640408904], [1167541200000, 22.788453687637], [1170219600000, 22.429199073597], [1172638800000, 22.324103271052], [1175313600000, 17.558388444187], [1177905600000, 16.769518096208], [1180584000000, 16.214738201301], [1183176000000, 18.729632971229], [1185854400000, 18.814523318847], [1188532800000, 19.789986451358], [1191124800000, 17.070049054933], [1193803200000, 16.121349575716], [1196398800000, 15.141659430091], [1199077200000, 17.175388025297], [1201755600000, 17.286592443522], [1204261200000, 16.323141626568], [1206936000000, 19.231263773952], [1209528000000, 18.446256391095], [1212206400000, 17.822632399764], [1214798400000, 15.53936647598], [1217476800000, 15.255131790217], [1220155200000, 15.660963922592], [1222747200000, 13.254482273698], [1225425600000, 11.920796202299], [1228021200000, 12.122809090924], [1230699600000, 15.691026271393], [1233378000000, 14.720881635107], [1235797200000, 15.387939360044], [1238472000000, 13.765436672228], [1241064000000, 14.631445864799], [1243742400000, 14.292446536221], [1246334400000, 16.170071367017], [1249012800000, 15.948135554337], [1251691200000, 16.612872685134], [1254283200000, 18.778338719091], [1256961600000, 16.756026065421], [1259557200000, 19.385804443146], [1262235600000, 22.950590240168], [1264914000000, 23.61159018141], [1267333200000, 25.708586989581], [1270008000000, 26.883915999885], [1272600000000, 25.893486687065], [1275278400000, 24.678914263176], [1277870400000, 25.937275793024], [1280548800000, 29.461381693838], [1283227200000, 27.357322961861], [1285819200000, 29.057235285673], [1288497600000, 28.549434189386], [1291093200000, 28.506352379724], [1293771600000, 29.449241421598], [1296450000000, 25.796838168807], [1298869200000, 28.740145449188], [1301544000000, 22.091744141872], [1304136000000, 25.07966254541], [1306814400000, 23.674906973064], [1309406400000, 23.418002742929], [1312084800000, 23.24364413887], [1314763200000, 31.591854066817], [1317355200000, 31.497112374114], [1320033600000, 26.67238082043], [1322629200000, 27.297080015495], [1325307600000, 20.174315530051], [1327986000000, 19.631084213898], [1330491600000, 20.366462219461], [1333166400000, 19.284784434185], [1335758400000, 19.157810257624]]
                },

                {
                    'key'   : 'Africa',
                    'values': [[1025409600000, 7.9356392949025], [1028088000000, 7.4514668527298], [1030766400000, 7.9085410566608], [1033358400000, 5.8996782364764], [1036040400000, 6.0591869346923], [1038632400000, 5.9667815800451], [1041310800000, 8.65528925664], [1043989200000, 8.7690763386254], [1046408400000, 8.6386160387453], [1049086800000, 5.9895557449743], [1051675200000, 6.3840324338159], [1054353600000, 6.5196511461441], [1056945600000, 7.0738618553114], [1059624000000, 6.5745957367133], [1062302400000, 6.4658359184444], [1064894400000, 2.7622758754954], [1067576400000, 2.9794782986241], [1070168400000, 2.8735432712019], [1072846800000, 1.6344817513645], [1075525200000, 1.5869248754883], [1078030800000, 1.7172279157246], [1080709200000, 1.9649927409867], [1083297600000, 2.0261695079196], [1085976000000, 2.0541261923929], [1088568000000, 3.9466318927569], [1091246400000, 3.7826770946089], [1093924800000, 3.9543021004028], [1096516800000, 3.8309891064711], [1099195200000, 3.6340958946166], [1101790800000, 3.5289755762525], [1104469200000, 5.702378559857], [1107147600000, 5.6539569019223], [1109566800000, 5.5449506370392], [1112245200000, 4.7579993280677], [1114833600000, 4.4816139372906], [1117512000000, 4.5965558568606], [1120104000000, 4.3747066116976], [1122782400000, 4.4588822917087], [1125460800000, 4.4460351848286], [1128052800000, 3.7989113035136], [1130734800000, 3.7743883140088], [1133326800000, 3.7727852823828], [1136005200000, 7.2968111448895], [1138683600000, 7.2800122043237], [1141102800000, 7.1187787503354], [1143781200000, 8.351887016482], [1146369600000, 8.4156698763993], [1149048000000, 8.1673298604231], [1151640000000, 5.5132447126042], [1154318400000, 6.1152537710599], [1156996800000, 6.076765091942], [1159588800000, 4.6304473798646], [1162270800000, 4.6301068469402], [1164862800000, 4.3466656309389], [1167541200000, 6.830104897003], [1170219600000, 7.241633040029], [1172638800000, 7.1432372054153], [1175313600000, 10.608942063374], [1177905600000, 10.914964549494], [1180584000000, 10.933223880565], [1183176000000, 8.3457524851265], [1185854400000, 8.1078413081882], [1188532800000, 8.2697185922474], [1191124800000, 8.4742436475968], [1193803200000, 8.4994601179319], [1196398800000, 8.7387319683243], [1199077200000, 6.8829183612895], [1201755600000, 6.984133637885], [1204261200000, 7.0860136043287], [1206936000000, 4.3961787956053], [1209528000000, 3.8699674365231], [1212206400000, 3.6928925238305], [1214798400000, 6.7571718894253], [1217476800000, 6.4367313362344], [1220155200000, 6.4048441521454], [1222747200000, 5.4643833239669], [1225425600000, 5.3150786833374], [1228021200000, 5.3011272612576], [1230699600000, 4.1203601430809], [1233378000000, 4.0881783200525], [1235797200000, 4.1928665957189], [1238472000000, 7.0249415663205], [1241064000000, 7.006530880769], [1243742400000, 6.994835633224], [1246334400000, 6.1220222336254], [1249012800000, 6.1177436137653], [1251691200000, 6.1413396231981], [1254283200000, 4.8046006145874], [1256961600000, 4.6647600660544], [1259557200000, 4.544865006255], [1262235600000, 6.0488249316539], [1264914000000, 6.3188669540206], [1267333200000, 6.5873958262306], [1270008000000, 6.2281189839578], [1272600000000, 5.8948915746059], [1275278400000, 5.5967320482214], [1277870400000, 0.99784432084837], [1280548800000, 1.0950794175359], [1283227200000, 0.94479734407491], [1285819200000, 1.222093988688], [1288497600000, 1.335093106856], [1291093200000, 1.3302565104985], [1293771600000, 1.340824670897], [1296450000000, 0], [1298869200000, 0], [1301544000000, 0], [1304136000000, 0], [1306814400000, 0], [1309406400000, 0], [1312084800000, 0], [1314763200000, 0], [1317355200000, 4.4583692315], [1320033600000, 3.6493043348059], [1322629200000, 3.8610064091761], [1325307600000, 5.5144800685202], [1327986000000, 5.1750695220791], [1330491600000, 5.6710066952691], [1333166400000, 5.5611890039181], [1335758400000, 5.5979368839939]]
                },

                {
                    'key'   : 'South America',
                    'values': [[1025409600000, 7.9149900245423], [1028088000000, 7.0899888751059], [1030766400000, 7.5996132380614], [1033358400000, 8.2741174301034], [1036040400000, 9.3564460833513], [1038632400000, 9.7066786059904], [1041310800000, 10.213363052343], [1043989200000, 10.285809585273], [1046408400000, 10.222053149228], [1049086800000, 8.6188592137975], [1051675200000, 9.3335447543566], [1054353600000, 8.9312402186628], [1056945600000, 8.1895089343658], [1059624000000, 8.260622135079], [1062302400000, 7.7700786851364], [1064894400000, 7.9907428771318], [1067576400000, 8.7769091865606], [1070168400000, 8.4855077060661], [1072846800000, 9.6277203033655], [1075525200000, 9.9685913452624], [1078030800000, 10.615085181759], [1080709200000, 9.2902488079646], [1083297600000, 8.8610439830061], [1085976000000, 9.1075344931229], [1088568000000, 9.9156737639203], [1091246400000, 9.7826003238782], [1093924800000, 10.55403610555], [1096516800000, 10.926900264097], [1099195200000, 10.903144818736], [1101790800000, 10.862890389067], [1104469200000, 10.64604998964], [1107147600000, 10.042790814087], [1109566800000, 9.7173391591038], [1112245200000, 9.6122415755443], [1114833600000, 9.4337921146562], [1117512000000, 9.814827171183], [1120104000000, 12.059260396788], [1122782400000, 12.139649903873], [1125460800000, 12.281290663822], [1128052800000, 8.8037085409056], [1130734800000, 8.6300618239176], [1133326800000, 9.1225708491432], [1136005200000, 12.988124170836], [1138683600000, 13.356778764353], [1141102800000, 13.611196863271], [1143781200000, 6.8959030061189], [1146369600000, 6.9939633271353], [1149048000000, 6.7241510257676], [1151640000000, 5.5611293669517], [1154318400000, 5.6086488714041], [1156996800000, 5.4962849907033], [1159588800000, 6.9193153169278], [1162270800000, 7.0016334389778], [1164862800000, 6.7865422443273], [1167541200000, 9.0006454225383], [1170219600000, 9.2233916171431], [1172638800000, 8.8929316009479], [1175313600000, 10.345937520404], [1177905600000, 10.075914677026], [1180584000000, 10.089006188111], [1183176000000, 10.598330295008], [1185854400000, 9.9689546533009], [1188532800000, 9.7740580198146], [1191124800000, 10.558483060626], [1193803200000, 9.9314651823603], [1196398800000, 9.3997715873769], [1199077200000, 8.4086493387262], [1201755600000, 8.9698309085926], [1204261200000, 8.2778357995396], [1206936000000, 8.8585045600123], [1209528000000, 8.7013756413322], [1212206400000, 7.7933605469443], [1214798400000, 7.0236183483064], [1217476800000, 6.9873088186829], [1220155200000, 6.8031713070097], [1222747200000, 6.6869531315723], [1225425600000, 6.138256993963], [1228021200000, 5.6434994016354], [1230699600000, 5.495220262512], [1233378000000, 4.6885326869846], [1235797200000, 4.4524349883438], [1238472000000, 5.6766520778185], [1241064000000, 5.7675774480752], [1243742400000, 5.7882863168337], [1246334400000, 7.2666010034924], [1249012800000, 7.5191821322261], [1251691200000, 7.849651451445], [1254283200000, 10.383992037985], [1256961600000, 9.0653691861818], [1259557200000, 9.6705248324159], [1262235600000, 10.856380561349], [1264914000000, 11.27452370892], [1267333200000, 11.754156529088], [1270008000000, 8.2870811422455], [1272600000000, 8.0210264360699], [1275278400000, 7.5375074474865], [1277870400000, 8.3419527338039], [1280548800000, 9.4197471818443], [1283227200000, 8.7321733185797], [1285819200000, 9.6627062648126], [1288497600000, 10.187962234548], [1291093200000, 9.8144201733476], [1293771600000, 10.275723361712], [1296450000000, 16.796066079353], [1298869200000, 17.543254984075], [1301544000000, 16.673660675083], [1304136000000, 17.963944353609], [1306814400000, 16.63774086721], [1309406400000, 15.84857094609], [1312084800000, 14.767303362181], [1314763200000, 24.778452182433], [1317355200000, 18.370353229999], [1320033600000, 15.253137429099], [1322629200000, 14.989600840649], [1325307600000, 16.052539160125], [1327986000000, 16.424390322793], [1330491600000, 17.884020741104], [1333166400000, 18.372698836036], [1335758400000, 18.315881576096]]
                },

                {
                    'key'   : 'Asia',
                    'values': [[1025409600000, 13.153938631352], [1028088000000, 12.456410521864], [1030766400000, 12.537048663919], [1033358400000, 13.947386398309], [1036040400000, 14.421680682568], [1038632400000, 14.143238262286], [1041310800000, 12.229635347478], [1043989200000, 12.508479916948], [1046408400000, 12.155368409526], [1049086800000, 13.335455563994], [1051675200000, 12.888210138167], [1054353600000, 12.842092790511], [1056945600000, 12.513816474199], [1059624000000, 12.21453674494], [1062302400000, 11.750848343935], [1064894400000, 10.526579636787], [1067576400000, 10.873596086087], [1070168400000, 11.019967131519], [1072846800000, 11.235789380602], [1075525200000, 11.859910850657], [1078030800000, 12.531031616536], [1080709200000, 11.360451067019], [1083297600000, 11.456244780202], [1085976000000, 11.436991407309], [1088568000000, 11.638595744327], [1091246400000, 11.190418301469], [1093924800000, 11.835608007589], [1096516800000, 11.540980244475], [1099195200000, 10.958762325687], [1101790800000, 10.885791159509], [1104469200000, 13.605810720109], [1107147600000, 13.128978067437], [1109566800000, 13.119012086882], [1112245200000, 13.003706129783], [1114833600000, 13.326996807689], [1117512000000, 13.547947991743], [1120104000000, 12.807959646616], [1122782400000, 12.931763821068], [1125460800000, 12.795359993008], [1128052800000, 9.6998935538319], [1130734800000, 9.3473740089131], [1133326800000, 9.36902067716], [1136005200000, 14.258619539875], [1138683600000, 14.21241095603], [1141102800000, 13.973193618249], [1143781200000, 15.218233920664], [1146369600000, 14.382109727451], [1149048000000, 13.894310878491], [1151640000000, 15.593086090031], [1154318400000, 16.244839695189], [1156996800000, 16.017088850647], [1159588800000, 14.183951830057], [1162270800000, 14.148523245696], [1164862800000, 13.424326059971], [1167541200000, 12.974450435754], [1170219600000, 13.232470418021], [1172638800000, 13.318762655574], [1175313600000, 15.961407746104], [1177905600000, 16.287714639805], [1180584000000, 16.24659058389], [1183176000000, 17.564505594808], [1185854400000, 17.872725373164], [1188532800000, 18.018998508756], [1191124800000, 15.584518016602], [1193803200000, 15.480850647182], [1196398800000, 15.699120036985], [1199077200000, 19.184281817226], [1201755600000, 19.691226605205], [1204261200000, 18.982314051293], [1206936000000, 18.707820309008], [1209528000000, 17.459630929759], [1212206400000, 16.500616076782], [1214798400000, 18.086324003978], [1217476800000, 18.929464156259], [1220155200000, 18.233728682084], [1222747200000, 16.315776297325], [1225425600000, 14.632892190251], [1228021200000, 14.667835024479], [1230699600000, 13.946993947309], [1233378000000, 14.394304684398], [1235797200000, 13.724462792967], [1238472000000, 10.930879035807], [1241064000000, 9.8339915513708], [1243742400000, 10.053858541872], [1246334400000, 11.786998438286], [1249012800000, 11.780994901769], [1251691200000, 11.305889670277], [1254283200000, 10.918452290083], [1256961600000, 9.6811395055706], [1259557200000, 10.971529744038], [1262235600000, 13.330210480209], [1264914000000, 14.592637568961], [1267333200000, 14.605329141157], [1270008000000, 13.936853794037], [1272600000000, 12.189480759072], [1275278400000, 11.676151385046], [1277870400000, 13.058852800018], [1280548800000, 13.62891543203], [1283227200000, 13.811107569918], [1285819200000, 13.786494560786], [1288497600000, 14.045162857531], [1291093200000, 13.697412447286], [1293771600000, 13.677681376221], [1296450000000, 19.96151186453], [1298869200000, 21.049198298156], [1301544000000, 22.687631094009], [1304136000000, 25.469010617433], [1306814400000, 24.88379943712], [1309406400000, 24.203843814249], [1312084800000, 22.138760964036], [1314763200000, 16.034636966228], [1317355200000, 15.394958944555], [1320033600000, 12.62564246197], [1322629200000, 12.973735699739], [1325307600000, 15.78601833615], [1327986000000, 15.227368020134], [1330491600000, 15.899752650733], [1333166400000, 15.661317319168], [1335758400000, 15.359891177281]]
                },

                {
                    'key'   : 'Europe',
                    'values': [[1025409600000, 9.3433263069351], [1028088000000, 8.4583069475546], [1030766400000, 8.0342398154196], [1033358400000, 8.1538966876572], [1036040400000, 10.743604786849], [1038632400000, 12.349366155851], [1041310800000, 10.742682503899], [1043989200000, 11.360983869935], [1046408400000, 11.441336039535], [1049086800000, 10.897508791837], [1051675200000, 11.469101547709], [1054353600000, 12.086311476742], [1056945600000, 8.0697180773504], [1059624000000, 8.2004392233445], [1062302400000, 8.4566434900643], [1064894400000, 7.9565760979059], [1067576400000, 9.3764619255827], [1070168400000, 9.0747664160538], [1072846800000, 10.508939004673], [1075525200000, 10.69936754483], [1078030800000, 10.681562399145], [1080709200000, 13.184786109406], [1083297600000, 12.668213052351], [1085976000000, 13.430509403986], [1088568000000, 12.393086349213], [1091246400000, 11.942374044842], [1093924800000, 12.062227685742], [1096516800000, 11.969974363623], [1099195200000, 12.14374574055], [1101790800000, 12.69422821995], [1104469200000, 9.1235211044692], [1107147600000, 8.758211757584], [1109566800000, 8.8072309258443], [1112245200000, 11.687595946835], [1114833600000, 11.079723082664], [1117512000000, 12.049712896076], [1120104000000, 10.725319428684], [1122782400000, 10.844849996286], [1125460800000, 10.833535488461], [1128052800000, 17.180932407865], [1130734800000, 15.894764896516], [1133326800000, 16.412751299498], [1136005200000, 12.573569093402], [1138683600000, 13.242301508051], [1141102800000, 12.863536342041], [1143781200000, 21.034044171629], [1146369600000, 21.419084618802], [1149048000000, 21.142678863692], [1151640000000, 26.56848967753], [1154318400000, 24.839144939906], [1156996800000, 25.456187462166], [1159588800000, 26.350164502825], [1162270800000, 26.478333205189], [1164862800000, 26.425979547846], [1167541200000, 28.191461582256], [1170219600000, 28.930307448808], [1172638800000, 29.521413891117], [1175313600000, 28.188285966466], [1177905600000, 27.704619625831], [1180584000000, 27.49086242483], [1183176000000, 28.770679721286], [1185854400000, 29.06048067145], [1188532800000, 28.240998844973], [1191124800000, 33.004893194128], [1193803200000, 34.075180359928], [1196398800000, 32.548560664834], [1199077200000, 30.629727432729], [1201755600000, 28.642858788159], [1204261200000, 27.973575227843], [1206936000000, 27.393351882726], [1209528000000, 28.476095288522], [1212206400000, 29.29667866426], [1214798400000, 29.222333802896], [1217476800000, 28.092966093842], [1220155200000, 28.107159262922], [1222747200000, 25.482974832099], [1225425600000, 21.208115993834], [1228021200000, 20.295043095268], [1230699600000, 15.925754618402], [1233378000000, 17.162864628346], [1235797200000, 17.084345773174], [1238472000000, 22.24600710228], [1241064000000, 24.530543998508], [1243742400000, 25.084184918241], [1246334400000, 16.606166527359], [1249012800000, 17.239620011628], [1251691200000, 17.336739127379], [1254283200000, 25.478492475754], [1256961600000, 23.017152085244], [1259557200000, 25.617745423684], [1262235600000, 24.061133998641], [1264914000000, 23.223933318646], [1267333200000, 24.425887263936], [1270008000000, 35.501471156693], [1272600000000, 33.775013878675], [1275278400000, 30.417993630285], [1277870400000, 30.023598978467], [1280548800000, 33.327519522436], [1283227200000, 31.963388450372], [1285819200000, 30.49896723209], [1288497600000, 32.403696817913], [1291093200000, 31.47736071922], [1293771600000, 31.53259666241], [1296450000000, 41.760282761548], [1298869200000, 45.605771243237], [1301544000000, 39.986557966215], [1304136000000, 43.84633051005], [1306814400000, 39.857316881858], [1309406400000, 37.675127768207], [1312084800000, 35.775077970313], [1314763200000, 48.631009702578], [1317355200000, 42.830831754505], [1320033600000, 35.611502589362], [1322629200000, 35.320136981738], [1325307600000, 31.564136901516], [1327986000000, 32.074407502433], [1330491600000, 35.053013769977], [1333166400000, 33.873085184128], [1335758400000, 32.321039427046]]
                },

                {
                    'key'   : 'Australia',
                    'values': [[1025409600000, 5.1162447683392], [1028088000000, 4.2022848306513], [1030766400000, 4.3543715758736], [1033358400000, 5.4641223667245], [1036040400000, 6.0041275884577], [1038632400000, 6.6050520064486], [1041310800000, 5.0154059912793], [1043989200000, 5.1835708554647], [1046408400000, 5.1142682006164], [1049086800000, 5.0271381717695], [1051675200000, 5.3437782653456], [1054353600000, 5.2105844515767], [1056945600000, 6.552565997799], [1059624000000, 6.9873363581831], [1062302400000, 7.010986789097], [1064894400000, 4.4254242025515], [1067576400000, 4.9613848042174], [1070168400000, 4.8854920484764], [1072846800000, 4.0441111794228], [1075525200000, 4.0219596813179], [1078030800000, 4.3065749225355], [1080709200000, 3.9148434915404], [1083297600000, 3.8659430654512], [1085976000000, 3.9572824600686], [1088568000000, 4.7372190641522], [1091246400000, 4.6871476374455], [1093924800000, 5.0398702564196], [1096516800000, 5.5221787544964], [1099195200000, 5.424646299798], [1101790800000, 5.9240223067349], [1104469200000, 5.9936860983601], [1107147600000, 5.8499523215019], [1109566800000, 6.4149040329325], [1112245200000, 6.4547895561969], [1114833600000, 5.9385382611161], [1117512000000, 6.0486751030592], [1120104000000, 5.23108613838], [1122782400000, 5.5857797121029], [1125460800000, 5.3454665096987], [1128052800000, 5.0439154120119], [1130734800000, 5.054634702913], [1133326800000, 5.3819451380848], [1136005200000, 5.2638869269803], [1138683600000, 5.5806167415681], [1141102800000, 5.4539047069985], [1143781200000, 7.6728842432362], [1146369600000, 7.719946716654], [1149048000000, 8.0144619912942], [1151640000000, 7.942223133434], [1154318400000, 8.3998279827444], [1156996800000, 8.532324572605], [1159588800000, 4.7324285199763], [1162270800000, 4.7402397487697], [1164862800000, 4.9042069355168], [1167541200000, 5.9583963430882], [1170219600000, 6.3693899239171], [1172638800000, 6.261153903813], [1175313600000, 5.3443942184584], [1177905600000, 5.4932111235361], [1180584000000, 5.5747393101109], [1183176000000, 5.3833633060013], [1185854400000, 5.5125898831832], [1188532800000, 5.8116112661327], [1191124800000, 4.3962296939996], [1193803200000, 4.6967663605521], [1196398800000, 4.7963004350914], [1199077200000, 4.1817985183351], [1201755600000, 4.3797643870182], [1204261200000, 4.6966642197965], [1206936000000, 4.3609995132565], [1209528000000, 4.4736290996496], [1212206400000, 4.3749762738128], [1214798400000, 3.3274661194507], [1217476800000, 3.0316184691337], [1220155200000, 2.5718140204728], [1222747200000, 2.7034994044603], [1225425600000, 2.2033786591364], [1228021200000, 1.9850621240805], [1230699600000, 0], [1233378000000, 0], [1235797200000, 0], [1238472000000, 0], [1241064000000, 0], [1243742400000, 0], [1246334400000, 0], [1249012800000, 0], [1251691200000, 0], [1254283200000, 0.44495950017788], [1256961600000, 0.33945469262483], [1259557200000, 0.38348269455195], [1262235600000, 0], [1264914000000, 0], [1267333200000, 0], [1270008000000, 0], [1272600000000, 0], [1275278400000, 0], [1277870400000, 0], [1280548800000, 0], [1283227200000, 0], [1285819200000, 0], [1288497600000, 0], [1291093200000, 0], [1293771600000, 0], [1296450000000, 0.52216435716176], [1298869200000, 0.59275786698454], [1301544000000, 0], [1304136000000, 0], [1306814400000, 0], [1309406400000, 0], [1312084800000, 0], [1314763200000, 0], [1317355200000, 0], [1320033600000, 0], [1322629200000, 0], [1325307600000, 0], [1327986000000, 0], [1330491600000, 0], [1333166400000, 0], [1335758400000, 0]]
                },

                {
                    'key'   : 'Antarctica',
                    'values': [[1025409600000, 1.3503144674343], [1028088000000, 1.2232741112434], [1030766400000, 1.3930470790784], [1033358400000, 1.2631275030593], [1036040400000, 1.5842699103708], [1038632400000, 1.9546996043116], [1041310800000, 0.8504048300986], [1043989200000, 0.85340686311353], [1046408400000, 0.843061357391], [1049086800000, 2.119846992476], [1051675200000, 2.5285382124858], [1054353600000, 2.5056570712835], [1056945600000, 2.5212789901005], [1059624000000, 2.6192011642534], [1062302400000, 2.5382187823805], [1064894400000, 2.3393223047168], [1067576400000, 2.491219888698], [1070168400000, 2.497555874906], [1072846800000, 1.734018115546], [1075525200000, 1.9307268299646], [1078030800000, 2.2261679836799], [1080709200000, 1.7608893704206], [1083297600000, 1.6242690616808], [1085976000000, 1.7161663801295], [1088568000000, 1.7183554537038], [1091246400000, 1.7179780759145], [1093924800000, 1.7314274801784], [1096516800000, 1.2596883356752], [1099195200000, 1.381177053009], [1101790800000, 1.4408819615814], [1104469200000, 3.4743581836444], [1107147600000, 3.3603749903192], [1109566800000, 3.5350883257893], [1112245200000, 3.0949644237828], [1114833600000, 3.0796455899995], [1117512000000, 3.3441247640644], [1120104000000, 4.0947643978168], [1122782400000, 4.4072631274052], [1125460800000, 4.4870979780825], [1128052800000, 4.8404549457934], [1130734800000, 4.8293016233697], [1133326800000, 5.2238093263952], [1136005200000, 3.382306337815], [1138683600000, 3.7056975170243], [1141102800000, 3.7561118692318], [1143781200000, 2.861913700854], [1146369600000, 2.9933744103381], [1149048000000, 2.7127537218463], [1151640000000, 3.1195497076283], [1154318400000, 3.4066964004508], [1156996800000, 3.3754571113569], [1159588800000, 2.2965579982924], [1162270800000, 2.4486818633018], [1164862800000, 2.4002308848517], [1167541200000, 1.9649579750349], [1170219600000, 1.9385263638056], [1172638800000, 1.9128975336387], [1175313600000, 2.3412869836298], [1177905600000, 2.4337870351445], [1180584000000, 2.62179703171], [1183176000000, 3.2642864957929], [1185854400000, 3.3200396223709], [1188532800000, 3.3934212707572], [1191124800000, 4.2822327088179], [1193803200000, 4.1474964228541], [1196398800000, 4.1477082879801], [1199077200000, 5.2947122916128], [1201755600000, 5.2919843508028], [1204261200000, 5.198978305031], [1206936000000, 3.5603057673513], [1209528000000, 3.3009087690692], [1212206400000, 3.1784852603792], [1214798400000, 4.5889503538868], [1217476800000, 4.401779617494], [1220155200000, 4.2208301828278], [1222747200000, 3.89396671475], [1225425600000, 3.0423832241354], [1228021200000, 3.135520611578], [1230699600000, 1.9631418164089], [1233378000000, 1.8963543874958], [1235797200000, 1.8266636017025], [1238472000000, 0.93136635895188], [1241064000000, 0.92737801918888], [1243742400000, 0.97591889805002], [1246334400000, 2.6841193805515], [1249012800000, 2.5664341140531], [1251691200000, 2.3887523699873], [1254283200000, 1.1737801663681], [1256961600000, 1.0953582317281], [1259557200000, 1.2495674976653], [1262235600000, 0.36607452464754], [1264914000000, 0.3548719047291], [1267333200000, 0.36769242398939], [1270008000000, 0], [1272600000000, 0], [1275278400000, 0], [1277870400000, 0], [1280548800000, 0], [1283227200000, 0], [1285819200000, 0.85450741275337], [1288497600000, 0.91360317921637], [1291093200000, 0.89647678692269], [1293771600000, 0.87800687192639], [1296450000000, 0], [1298869200000, 0], [1301544000000, 0.43668720882994], [1304136000000, 0.4756523602692], [1306814400000, 0.46947368328469], [1309406400000, 0.45138896152316], [1312084800000, 0.43828726648117], [1314763200000, 2.0820861395316], [1317355200000, 0.9364411075395], [1320033600000, 0.60583907839773], [1322629200000, 0.61096950747437], [1325307600000, 0], [1327986000000, 0], [1330491600000, 0], [1333166400000, 0], [1335758400000, 0]]
                }

            ]
        };

        vm.historicalBarChart = {
            options: {
                chart: {
                    type              : 'historicalBarChart',
                    height            : 450,
                    margin            : {
                        top   : 20,
                        right : 20,
                        bottom: 60,
                        left  : 50
                    },
                    x                 : function (d)
                    {
                        return d[0];
                    },
                    y                 : function (d)
                    {
                        return d[1] / 100000;
                    },
                    showValues        : true,
                    valueFormat       : function (d)
                    {
                        return d3.format(',.1f')(d);
                    },
                    transitionDuration: 500,
                    xAxis             : {
                        axisLabel   : 'X Axis',
                        tickFormat  : function (d)
                        {
                            return d3.time.format('%x')(new Date(d));
                        },
                        rotateLabels: 50,
                        showMaxMin  : false
                    },
                    yAxis             : {
                        axisLabel        : 'Y Axis',
                        axisLabelDistance: 35,
                        tickFormat       : function (d)
                        {
                            return d3.format(',.1f')(d);
                        }
                    }
                }
            },

            data: [
                {
                    'key'   : 'Quantity',
                    'bar'   : true,
                    'values': [[1159588800000, 3899486.0], [1162270800000, 3899486.0], [1164862800000, 3899486.0], [1167541200000, 3564700.0], [1170219600000, 3564700.0], [1172638800000, 3564700.0], [1175313600000, 2648493.0], [1177905600000, 2648493.0], [1180584000000, 2648493.0], [1183176000000, 2522993.0], [1185854400000, 2522993.0], [1188532800000, 2522993.0], [1191124800000, 2906501.0], [1193803200000, 2906501.0], [1196398800000, 2906501.0], [1199077200000, 2206761.0], [1201755600000, 2206761.0], [1204261200000, 2206761.0], [1206936000000, 2287726.0], [1209528000000, 2287726.0], [1212206400000, 2287726.0], [1214798400000, 2732646.0], [1217476800000, 2732646.0], [1220155200000, 2732646.0], [1222747200000, 2599196.0], [1225425600000, 2599196.0], [1228021200000, 2599196.0], [1230699600000, 1924387.0], [1233378000000, 1924387.0], [1235797200000, 1924387.0], [1238472000000, 1756311.0], [1241064000000, 1756311.0], [1243742400000, 1756311.0], [1246334400000, 1743470.0], [1249012800000, 1743470.0], [1251691200000, 1743470.0], [1254283200000, 1519010.0], [1256961600000, 1519010.0], [1259557200000, 1519010.0], [1262235600000, 1591444.0], [1264914000000, 1591444.0], [1267333200000, 1591444.0], [1270008000000, 1543784.0], [1272600000000, 1543784.0], [1275278400000, 1543784.0], [1277870400000, 1309915.0], [1280548800000, 1309915.0], [1283227200000, 1309915.0], [1285819200000, 1331875.0], [1288497600000, 1331875.0], [1291093200000, 1331875.0], [1293771600000, 1331875.0], [1296450000000, 1154695.0], [1298869200000, 1154695.0], [1301544000000, 1194025.0], [1304136000000, 1194025.0], [1306814400000, 1194025.0], [1309406400000, 1194025.0], [1312084800000, 1194025.0], [1314763200000, 1244525.0], [1317355200000, 475000.0], [1320033600000, 475000.0], [1322629200000, 475000.0], [1325307600000, 690033.0], [1327986000000, 690033.0], [1330491600000, 690033.0], [1333166400000, 514733.0], [1335758400000, 514733.0]]
                }]
        };

        vm.multiBarHorizontalChart = {
            options: {
                chart: {
                    type              : 'multiBarHorizontalChart',
                    height            : 450,
                    x                 : function (d)
                    {
                        return d.label;
                    },
                    y                 : function (d)
                    {
                        return d.value;
                    },
                    showControls      : true,
                    showValues        : true,
                    transitionDuration: 500,
                    xAxis             : {
                        showMaxMin: false
                    },
                    yAxis             : {
                        axisLabel : 'Values',
                        tickFormat: function (d)
                        {
                            return d3.format(',.2f')(d);
                        }
                    }
                }
            },
            data   : [
                {
                    'key'   : 'Series1',
                    'color' : '#d62728',
                    'values': [
                        {
                            'label': 'Group A',
                            'value': -1.8746444827653
                        },
                        {
                            'label': 'Group B',
                            'value': -8.0961543492239
                        },
                        {
                            'label': 'Group C',
                            'value': -0.57072943117674
                        },
                        {
                            'label': 'Group D',
                            'value': -2.4174010336624
                        },
                        {
                            'label': 'Group E',
                            'value': -0.72009071426284
                        },
                        {
                            'label': 'Group F',
                            'value': -0.77154485523777
                        },
                        {
                            'label': 'Group G',
                            'value': -0.90152097798131
                        },
                        {
                            'label': 'Group H',
                            'value': -0.91445417330854
                        },
                        {
                            'label': 'Group I',
                            'value': -0.055746319141851
                        }
                    ]
                },
                {
                    'key'   : 'Series2',
                    'color' : '#1f77b4',
                    'values': [
                        {
                            'label': 'Group A',
                            'value': 25.307646510375
                        },
                        {
                            'label': 'Group B',
                            'value': 16.756779544553
                        },
                        {
                            'label': 'Group C',
                            'value': 18.451534877007
                        },
                        {
                            'label': 'Group D',
                            'value': 8.6142352811805
                        },
                        {
                            'label': 'Group E',
                            'value': 7.8082472075876
                        },
                        {
                            'label': 'Group F',
                            'value': 5.259101026956
                        },
                        {
                            'label': 'Group G',
                            'value': 0.30947953487127
                        },
                        {
                            'label': 'Group H',
                            'value': 0
                        },
                        {
                            'label': 'Group I',
                            'value': 0
                        }
                    ]
                }
            ]
        };

        vm.pieChart = {
            options: {
                chart: {
                    type              : 'pieChart',
                    height            : 500,
                    x                 : function (d)
                    {
                        return d.key;
                    },
                    y                 : function (d)
                    {
                        return d.y;
                    },
                    showLabels        : true,
                    transitionDuration: 500,
                    labelThreshold    : 0.01,
                    legend            : {
                        margin: {
                            top   : 5,
                            right : 35,
                            bottom: 5,
                            left  : 0
                        }
                    }
                }
            },
            data   : [
                {
                    key: 'One',
                    y  : 5
                },
                {
                    key: 'Two',
                    y  : 2
                },
                {
                    key: 'Three',
                    y  : 9
                },
                {
                    key: 'Four',
                    y  : 7
                },
                {
                    key: 'Five',
                    y  : 4
                },
                {
                    key: 'Six',
                    y  : 3
                },
                {
                    key: 'Seven',
                    y  : 0.5
                }
            ]
        };

        vm.donutChart = {
            options: {
                chart: {
                    type      : 'pieChart',
                    height    : 450,
                    donut     : true,
                    x         : function (d)
                    {
                        return d.key;
                    },
                    y         : function (d)
                    {
                        return d.y;
                    },
                    showLabels: true,

                    pie               : {
                        startAngle: function (d)
                        {
                            return d.startAngle / 2 - Math.PI / 2;
                        },
                        endAngle  : function (d)
                        {
                            return d.endAngle / 2 - Math.PI / 2;
                        }
                    },
                    transitionDuration: 500,
                    legend            : {
                        margin: {
                            top   : 5,
                            right : 70,
                            bottom: 5,
                            left  : 0
                        }
                    }
                }
            },

            data: [
                {
                    key: 'One',
                    y  : 5
                },
                {
                    key: 'Two',
                    y  : 2
                },
                {
                    key: 'Three',
                    y  : 9
                },
                {
                    key: 'Four',
                    y  : 7
                },
                {
                    key: 'Five',
                    y  : 4
                },
                {
                    key: 'Six',
                    y  : 3
                },
                {
                    key: 'Seven',
                    y  : 0.5
                }
            ]

        };

        vm.sparklineChart = {
            options: {
                chart: {
                    type              : 'sparklinePlus',
                    height            : 450,
                    x                 : function (d, i)
                    {
                        return i;
                    },
                    xTickFormat       : function (d)
                    {
                        return d3.time.format('%x')(new Date(vm.sparklineChart.data[d].x));
                    },
                    transitionDuration: 250
                }
            },

            //$scope.data = sine();
            data: volatileChart(130.0, 0.02)
        };

        vm.bulletChart = {
            options: {
                chart: {
                    type              : 'bulletChart',
                    transitionDuration: 500
                }
            },
            data   : {
                'title'   : 'Revenue',
                'subtitle': 'US$, in thousands',
                'ranges'  : [150, 225, 300],
                'measures': [220],
                'markers' : [250]
            }
        };

        vm.scatterChart = {
            options: {
                chart: {
                    type              : 'scatterChart',
                    height            : 450,
                    color             : d3.scale.category10().range(),
                    scatter           : {
                        onlyCircles: false
                    },
                    showDistX         : true,
                    showDistY         : true,
                    tooltipContent    : function (key)
                    {
                        return '<h3>' + key + '</h3>';
                    },
                    transitionDuration: 350,
                    xAxis             : {
                        axisLabel : 'X Axis',
                        tickFormat: function (d)
                        {
                            return d3.format('.02f')(d);
                        }
                    },
                    yAxis             : {
                        axisLabel        : 'Y Axis',
                        tickFormat       : function (d)
                        {
                            return d3.format('.02f')(d);
                        },
                        axisLabelDistance: 30
                    }
                }
            },
            data   : generateData(4, 5)
        };

        // Methods


        //////////

        /*Random Data Generator */
        function sinAndCos()
        {
            var sin = [], sin2 = [],
                cos = [];

            //Data is represented as an array of {x,y} pairs.
            for ( var i = 0; i < 100; i++ )
            {
                sin.push({
                    x: i,
                    y: Math.sin(i / 10)
                });
                sin2.push({
                    x: i,
                    y: (i % 10 === 5 ? null : Math.sin(i / 10) * 0.25 + 0.5)
                });
                cos.push({
                    x: i,
                    y: 0.5 * Math.cos(i / 10 + 2) + Math.random() / 10
                });
            }

            //Line chart data should be sent as an array of series objects.
            return [
                {
                    values: sin,      //values - represents the array of {x,y} data points
                    key   : 'Sine Wave', //key  - the name of the series.
                    color : '#ff7f0e'  //color - optional: choose your own line color.
                },
                {
                    values: cos,
                    key   : 'Cosine Wave',
                    color : '#2ca02c'
                },
                {
                    values: sin2,
                    key   : 'Another sine wave',
                    color : '#7777ff',
                    area  : true      //area - set to true if you want this line to turn into a filled area chart.
                }
            ];
        }

        function volatileChart(startPrice, volatility, numPoints)
        {
            var rval = [];
            var now = +new Date();
            numPoints = numPoints || 100;
            for ( var i = 1; i < numPoints; i++ )
            {
                rval.push({
                    x: now + i * 1000 * 60 * 60 * 24,
                    y: startPrice
                });
                var rnd = Math.random();
                var changePct = 2 * volatility * rnd;
                if ( changePct > volatility )
                {
                    changePct -= (2 * volatility);
                }
                startPrice = startPrice + startPrice * changePct;
            }
            return rval;
        }

        /* Random Data Generator (took from nvd3.org) */
        function generateData(groups, points)
        {
            var data = [],
                shapes = ['circle', 'cross', 'triangle-up', 'triangle-down', 'diamond', 'square'],
                random = d3.random.normal();

            for ( var i = 0; i < groups; i++ )
            {
                data.push({
                    key   : 'Group ' + i,
                    values: []
                });

                for ( var j = 0; j < points; j++ )
                {
                    data[i].values.push(
                        {
                            x    : random(),
                            y    : random(),
                            size : Math.random(),
                            shape: shapes[j % 6]
                        });
                }
            }
            return data;
        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.components.charts.chartist', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.components_charts_chartist', {
            url  : '/components/charts/chartist',
            views: {
                'content@app': {
                    templateUrl: 'app/main/components/charts/chartist/chartist.html',
                    controller : 'ChartistController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    ChartistController.$inject = ["fuseTheming"];
    angular
        .module('app.components.charts.chartist')
        .controller('ChartistController', ChartistController);

    function ChartistController(fuseTheming)
    {
        var vm = this;

        // Data
        vm.themes = fuseTheming.themes;


        // line chart
        vm.lineChart = {
            data   : {
                labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                series: [
                    [12, 9, 7, 8, 5],
                    [2, 1, 3.5, 7, 3],
                    [1, 3, 4, 5, 6]
                ]
            },
            options: {
                fullWidth   : true,
                chartPadding: {
                    right: 40
                }
            }
        };

        // line Area chart
        vm.lineAreaChart = {
            data   : {
                labels: [1, 2, 3, 4, 5, 6, 7, 8],
                series: [
                    [5, 9, 7, 8, 5, 3, 5, 4]
                ]
            },
            options: {
                low     : 0,
                showArea: true
            }
        };

        vm.biPolarLineChart = {
            data   : {
                labels: [1, 2, 3, 4, 5, 6, 7, 8],
                series: [
                    [1, 2, 3, 1, -2, 0, 1, 0],
                    [-2, -1, -2, -1, -2.5, -1, -2, -1],
                    [0, 0, 0, 1, 2, 2.5, 2, 1],
                    [2.5, 2, 1, 0.5, 1, 0.5, -1, -2.5]
                ]
            },
            options: {
                high     : 3,
                low      : -3,
                showArea : true,
                showLine : false,
                showPoint: false,
                fullWidth: true,
                axisX    : {
                    showLabel: false,
                    showGrid : false
                }
            }
        };

        vm.stackedBarChart = {
            data   : {
                labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                series: [
                    [800000, 1200000, 1400000, 1300000],
                    [200000, 400000, 500000, 300000],
                    [100000, 200000, 400000, 600000]
                ]
            },
            options: {
                stackBars: true,
                axisY    : {
                    labelInterpolationFnc: function (value)
                    {
                        return (value / 1000) + 'k';
                    }
                }
            },
            events : {
                draw: function (data)
                {
                    if ( data.type === 'bar' )
                    {
                        data.element.attr({
                            style: 'stroke-width: 30px'
                        });
                    }
                }
            }
        };

        // bar chart
        vm.barChart = {
            data             : {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                series: [
                    [5, 4, 3, 7, 5, 10, 3, 4, 8, 10, 6, 8],
                    [3, 2, 9, 5, 4, 6, 4, 6, 7, 8, 7, 4]
                ]
            },
            options          : {
                seriesBarDistance: 15
            },
            responsiveOptions: [
                ['screen and (min-width: 641px) and (max-width: 1024px)', {
                    seriesBarDistance: 10,
                    axisX            : {
                        labelInterpolationFnc: function (value)
                        {
                            return value;
                        }
                    }
                }],
                ['screen and (max-width: 640px)', {
                    seriesBarDistance: 5,
                    axisX            : {
                        labelInterpolationFnc: function (value)
                        {
                            return value[0];
                        }
                    }
                }]
            ]
        };

        // Horizontal bar chart
        vm.horizontalBarChart = {
            data   : {
                labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                series: [
                    [5, 4, 3, 7, 5, 10, 3],
                    [3, 2, 9, 5, 4, 6, 4]
                ]
            },
            options: {
                seriesBarDistance: 10,
                reverseData      : true,
                horizontalBars   : true,
                axisY            : {
                    offset: 70
                }
            }
        };

        vm.biPolarBarChart = {
            data   : {
                labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10'],
                series: [
                    [1, 2, 4, 8, 6, -2, -1, -4, -6, -2]
                ]
            },
            options: {
                high : 10,
                low  : -10,
                axisX: {
                    labelInterpolationFnc: function (value, index)
                    {
                        return index % 2 === 0 ? value : null;
                    }
                }
            }
        };

        // pie chart
        vm.pieChart = {
            data             : {
                labels: ['Bananas', 'Apples', 'Grapes'],
                series: [20, 15, 40]
            },
            options          : {
                labelInterpolationFnc: function (value)
                {
                    return value[0];
                }
            },
            responsiveOptions: [
                ['screen and (min-width: 640px)', {
                    chartPadding         : 40,
                    labelOffset          : 150,
                    labelDirection       : 'explode',
                    labelInterpolationFnc: function (value)
                    {
                        return value;
                    }
                }],
                ['screen and (min-width: 1024px)', {
                    labelOffset : 120,
                    chartPadding: 30
                }]
            ]

        };

        // donut chart
        vm.donutChart = {
            data   : {
                series: [20, 10, 30, 40]
            },
            options: {
                donut: true
            }
        };

        vm.gaugeChart = {
            data   : {
                series: [20, 10, 30, 40]
            },
            options: {
                donut     : true,
                donutWidth: 60,
                startAngle: 270,
                total     : 200,
                showLabel : true
            }
        };
        // Methods

        //////////

    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.components.charts.chart-js', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.components_charts_chart-js', {
            url  : '/components/charts/chart-js',
            views: {
                'content@app': {
                    templateUrl: 'app/main/components/charts/chart-js/chart-js.html',
                    controller : 'ChartJsController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    ChartJsController.$inject = ["fuseTheming"];
    angular
        .module('app.components.charts.chart-js')
        .controller('ChartJsController', ChartJsController);

    function ChartJsController(fuseTheming)
    {
        var vm = this;

        // Data
        vm.themes = fuseTheming.themes;

        vm.lineChart = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            series: ['Series A', 'Series B'],
            data  : [
                [65, 59, 80, 81, 56, 55, 40],
                [28, 48, 40, 19, 86, 27, 90]
            ]
        };

        vm.barChart = {
            labels: ['2006', '2007', '2008', '2009', '2010', '2011', '2012'],
            series: ['Series A', 'Series B'],
            data  : [
                [65, 59, 80, 81, 56, 55, 40],
                [28, 48, 40, 19, 86, 27, 90]
            ]
        };

        vm.doughnutChart = {
            labels: ['Download Sales', 'In-Store Sales', 'Mail-Order Sales'],
            data  : [300, 500, 100]
        };

        vm.radarChart = {
            labels: ['Eating', 'Drinking', 'Sleeping', 'Designing', 'Coding', 'Cycling', 'Running'],
            data  : [
                [65, 59, 90, 81, 56, 55, 40],
                [28, 48, 40, 19, 96, 27, 100]
            ]
        };

        vm.pieChart = {
            labels: ['Download Sales', 'In-Store Sales', 'Mail-Order Sales'],
            data  : [300, 500, 100]
        };

        vm.polarChart = {
            labels: ['Download Sales', 'In-Store Sales', 'Mail-Order Sales', 'Tele Sales', 'Corporate Sales'],
            data  : [300, 500, 100, 40, 120]
        };

        // Methods

        //////////

    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.components.charts.c3', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.components_charts_c3', {
            url  : '/components/charts/c3',
            views: {
                'content@app': {
                    templateUrl: 'app/main/components/charts/c3/c3.html',
                    controller : 'C3Controller as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    C3Controller.$inject = ["fuseTheming"];
    angular
        .module('app.components.charts.c3')
        .controller('C3Controller', C3Controller);

    function C3Controller(fuseTheming)
    {
        var vm = this;

        // Data
        vm.themes = fuseTheming.themes;

        // Methods

        //////////

    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.scrumboard')
        .factory('CardFilters', CardFiltersService);

    /** @ngInject */
    function CardFiltersService()
    {
        var service = {
            name   : '',
            labels : [],
            members: [],
            clear  : clear,
            isOn   : isOn
        };

        /**
         * Clear
         */
        function clear()
        {
            service.name = '';
            service.labels = [];
            service.members = [];
        }

        /**
         * Is on
         *
         * @returns {boolean}
         */
        function isOn()
        {
            return (service.name === '' && service.labels.length === 0 && service.members.length === 0 ) ? false : true;
        }

        return service;
    }
})();
(function ()
{
    'use strict';

    DialogService.$inject = ["$mdDialog", "$document"];
    angular
        .module('app.scrumboard')
        .factory('DialogService', DialogService);

    /** @ngInject */
    function DialogService($mdDialog, $document)
    {
        var service = {
            openCardDialog: openCardDialog
        };

        //////////

        /**
         * Open card dialog
         *
         * @param ev
         * @param cardId
         */
        function openCardDialog(ev, cardId)
        {
            $mdDialog.show({
                templateUrl        : 'app/main/apps/scrumboard/dialogs/card/card-dialog.html',
                controller         : 'ScrumboardCardDialogController',
                controllerAs       : 'vm',
                parent             : $document.find('#scrumboard'),
                targetEvent        : ev,
                clickOutsideToClose: true,
                escapeToClose      : true,
                locals             : {
                    cardId: cardId
                }
            });
        }

        return service;
    }
})();
(function ()
{
    'use strict';

    BoardService.$inject = ["$q", "msApi"];
    angular
        .module('app.scrumboard')
        .factory('BoardService', BoardService);

    /** @ngInject */
    function BoardService($q, msApi)
    {
        var service = {
            data        : {},
            addNewBoard : addNewBoard,
            getBoardData: getBoardData
        };

        /**
         * Get board data from the server
         *
         * @param boardId
         * @returns {*}
         */
        function getBoardData(boardId)
        {
            // Create a new deferred object
            var deferred = $q.defer();

            msApi.request('scrumboard.board@get', {id: boardId},

                // SUCCESS
                function (response)
                {
                    // Attach the data
                    service.data = response.data;

                    // Resolve the promise
                    deferred.resolve(response);
                },

                // ERROR
                function (response)
                {
                    // Reject the promise
                    deferred.reject(response);
                }
            );

            return deferred.promise;
        }

        /**
         * Create an empty board object and set it.
         *
         * For the demonstration purposes, we are creating the
         * empty object in the javascript which you wouldn't do
         * it in real life. Rather, you would make an API call
         * to your server to generate an empty object that fills
         * some of the areas for you like an ID, labels, members
         * or the default board settings.
         *
         * Then you would grab the response that comes from
         * the API call and attach it to the service.data object.
         */
        function addNewBoard()
        {
            // Create a new deferred object
            var deferred = $q.defer();

            // Here you would make an API call to your server...
            _generateEmptyScrumboardObject().then(
                // SUCCESS
                function (response)
                {
                    // Attach the data
                    service.data = response.data;

                    // Resolve the response
                    deferred.resolve(response);
                },
                // ERROR
                function (response)
                {
                    // Reject the response
                    deferred.reject(response);
                }
            );

            return deferred.promise;
        }

        /**
         * Dummy function for generating an empty
         * scrumboard object for demonstration
         * purposes
         *
         * @private
         * returns {$promise}
         */
        function _generateEmptyScrumboardObject()
        {
            // Create a new deferred object
            var deferred = $q.defer();

            // Fake id generator
            var id = parseInt(new Date().valueOf(), 16);

            // Prepare an empty scrumboard object
            var emptyObject = {
                data: {
                    name    : 'Untitled Board',
                    uri     : 'untitled-board',
                    id      : id,
                    settings: {
                        color          : '',
                        subscribed     : false,
                        cardCoverImages: true
                    },
                    lists   : [],
                    cards   : [],
                    members : [
                        {
                            id    : '56027c1930450d8bf7b10758',
                            name  : 'Alice Freeman',
                            avatar: 'assets/images/avatars/alice.jpg'
                        },
                        {
                            id    : '26027s1930450d8bf7b10828',
                            name  : 'Danielle Obrien',
                            avatar: 'assets/images/avatars/danielle.jpg'
                        },
                        {
                            id    : '76027g1930450d8bf7b10958',
                            name  : 'James Lewis',
                            avatar: 'assets/images/avatars/james.jpg'
                        },
                        {
                            id    : '36027j1930450d8bf7b10158',
                            name  : 'Vincent Munoz',
                            avatar: 'assets/images/avatars/vincent.jpg'
                        }
                    ],
                    labels  : [
                        {
                            id   : '26022e4129ad3a5sc28b36cd',
                            name : 'High Priority',
                            color: 'red'
                        },
                        {
                            id   : '56027e4119ad3a5dc28b36cd',
                            name : 'Design',
                            color: 'orange'
                        },
                        {
                            id   : '5640635e19ad3a5dc21416b2',
                            name : 'App',
                            color: 'blue'
                        },
                        {
                            id   : '6540635g19ad3s5dc31412b2',
                            name : 'Feature',
                            color: 'green'
                        }
                    ]
                }
            };

            // Resolve the promise
            deferred.resolve(emptyObject);

            return deferred.promise;
        }

        return service;
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "msApiProvider"];
    angular
        .module('app.dashboards.server', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, msApiProvider)
    {
        // State
        $stateProvider.state('app.dashboards_server', {
            url      : '/dashboard-server',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/apps/dashboards/server/dashboard-server.html',
                    controller : 'DashboardServerController as vm'
                }
            },
            resolve  : {
                DashboardData: ["msApi", function (msApi)
                {
                    return msApi.resolve('dashboard.server@get');
                }]
            },
            bodyClass: 'dashboard-server'
        });

        // Api
        msApiProvider.register('dashboard.server', ['app/data/dashboard/server/data.json']);
    }

})();
(function ()
{
    'use strict';

    DashboardServerController.$inject = ["$scope", "$interval", "DashboardData"];
    angular
        .module('app.dashboards.server')
        .controller('DashboardServerController', DashboardServerController);

    /** @ngInject */
    function DashboardServerController($scope, $interval, DashboardData)
    {
        var vm = this;

        // Data
        vm.dashboardData = DashboardData;

        // Widget 1
        vm.widget1 = {
            title: vm.dashboardData.widget1.title,
            chart: {
                options: {
                    chart: {
                        type                   : 'lineChart',
                        color                  : ['#4caf50', '#3f51b5', '#ff5722'],
                        height                 : 320,
                        margin                 : {
                            top   : 32,
                            right : 32,
                            bottom: 32,
                            left  : 48
                        },
                        useInteractiveGuideline: true,
                        clipVoronoi            : false,
                        interpolate            : 'cardinal',
                        x                      : function (d)
                        {
                            return d.x;
                        },
                        y                      : function (d)
                        {
                            return d.y;
                        },
                        xAxis                  : {
                            tickFormat: function (d)
                            {
                                return d + ' min.';
                            },
                            showMaxMin: false
                        },
                        yAxis                  : {
                            tickFormat: function (d)
                            {
                                return d + ' MB';
                            }
                        },
                        interactiveLayer       : {
                            tooltip: {
                                gravity: 's',
                                classes: 'gravity-s'
                            }
                        },
                        legend                 : {
                            margin    : {
                                top   : 8,
                                right : 0,
                                bottom: 32,
                                left  : 0
                            },
                            rightAlign: false
                        }
                    }
                },
                data   : vm.dashboardData.widget1.chart
            }
        };

        // Widget 2
        vm.widget2 = vm.dashboardData.widget2;

        // Widget 3
        vm.widget3 = vm.dashboardData.widget3;

        // Widget 4
        vm.widget4 = {
            title   : vm.dashboardData.widget4.title,
            value   : vm.dashboardData.widget4.value,
            footnote: vm.dashboardData.widget4.footnote,
            detail  : vm.dashboardData.widget4.detail,
            chart   : {
                config : {
                    refreshDataOnly: true,
                    deepWatchData  : true
                },
                options: {
                    chart: {
                        type        : 'lineChart',
                        color       : ['rgba(0, 0, 0, 0.27)'],
                        height      : 50,
                        margin      : {
                            top   : 8,
                            right : 0,
                            bottom: 0,
                            left  : 0
                        },
                        duration    : 1,
                        clipEdge    : true,
                        interpolate : 'cardinal',
                        interactive : false,
                        isArea      : true,
                        showLegend  : false,
                        showControls: false,
                        showXAxis   : false,
                        showYAxis   : false,
                        x           : function (d)
                        {
                            return d.x;
                        },
                        y           : function (d)
                        {
                            return d.y;
                        },
                        yDomain     : [0, 4]
                    }
                },
                data   : vm.dashboardData.widget4.chart
            },
            init    : function ()
            {
                // Run this function once to initialize the widget

                // Grab the x value
                var lastIndex = vm.dashboardData.widget4.chart[0].values.length - 1,
                    x = vm.dashboardData.widget4.chart[0].values[lastIndex].x;

                /**
                 * Emulate constant data flow
                 *
                 * @param min
                 * @param max
                 */
                function latencyTicker(min, max)
                {
                    // Increase the x value
                    x++;

                    var randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

                    var newValue = {
                        x: x,
                        y: randomNumber
                    };

                    vm.widget4.chart.data[0].values.shift();
                    vm.widget4.chart.data[0].values.push(newValue);

                    // Randomize the value
                    vm.widget4.value = 20 + randomNumber + 'ms';
                }

                // Set interval
                var latencyTickerInterval = $interval(function ()
                {
                    latencyTicker(1, 4);
                }, 1000);

                // Cleanup
                $scope.$on('$destroy', function ()
                {
                    $interval.cancel(latencyTickerInterval);
                });
            }
        };

        // Widget 5
        vm.widget5 = vm.dashboardData.widget5;

        // Widget 6
        vm.widget6 = {
            title: vm.dashboardData.widget6.title,
            chart: {
                config : {
                    refreshDataOnly: true,
                    deepWatchData  : true
                },
                options: {
                    chart: {
                        type                   : 'lineChart',
                        color                  : ['#03A9F4'],
                        height                 : 140,
                        margin                 : {
                            top   : 8,
                            right : 32,
                            bottom: 16,
                            left  : 48
                        },
                        duration               : 1,
                        clipEdge               : true,
                        clipVoronoi            : false,
                        interpolate            : 'cardinal',
                        isArea                 : true,
                        useInteractiveGuideline: true,
                        showLegend             : false,
                        showControls           : false,
                        x                      : function (d)
                        {
                            return d.x;
                        },
                        y                      : function (d)
                        {
                            return d.y;
                        },
                        yDomain                : [0, 100],
                        xAxis                  : {
                            tickFormat: function (d)
                            {
                                return d + ' sec.';
                            },
                            showMaxMin: false
                        },
                        yAxis                  : {
                            tickFormat: function (d)
                            {
                                return d + '%';
                            }
                        },
                        interactiveLayer       : {
                            tooltip: {
                                gravity: 's',
                                classes: 'gravity-s'
                            }
                        }
                    }
                },
                data   : vm.dashboardData.widget6.chart
            },
            init : function ()
            {
                // Run this function once to initialize the widget

                // Grab the x value
                var lastIndex = vm.dashboardData.widget6.chart[0].values.length - 1,
                    x = vm.dashboardData.widget6.chart[0].values[lastIndex].x;

                /**
                 * Emulate constant data flow
                 *
                 * @param min
                 * @param max
                 */
                function cpuTicker(min, max)
                {
                    // Increase the x value
                    x = x + 5;

                    var newValue = {
                        x: x,
                        y: Math.floor(Math.random() * (max - min + 1)) + min
                    };

                    vm.widget6.chart.data[0].values.shift();
                    vm.widget6.chart.data[0].values.push(newValue);
                }

                // Set interval
                var cpuTickerInterval = $interval(function ()
                {
                    cpuTicker(0, 100);
                }, 5000);

                // Cleanup
                $scope.$on('$destroy', function ()
                {
                    $interval.cancel(cpuTickerInterval);
                });
            }
        };

        // Widget 7
        vm.widget7 = {
            title    : vm.dashboardData.widget7.title,
            table    : vm.dashboardData.widget7.table,
            dtOptions: {
                dom       : '<"top"f>rt<"bottom"<"left"<"length"l>><"right"<"info"i><"pagination"p>>>',
                pagingType: 'simple',
                pageLength: 10,
                lengthMenu: [10, 20, 50, 100],
                autoWidth : false,
                responsive: true,
                columnDefs: [
                    {
                        width  : '20%',
                        targets: [0, 1, 2, 3, 4]
                    }
                ],
                columns   : [
                    {},
                    {},
                    {
                        render: function (data, type)
                        {
                            if ( type === 'display' )
                            {
                                return data + ' KB/s';
                            }
                            else
                            {
                                return data;
                            }
                        }
                    },
                    {
                        render: function (data, type)
                        {
                            if ( type === 'display' )
                            {
                                return data + '%';
                            }
                            else
                            {
                                return data;
                            }
                        }
                    },
                    {
                        render: function (data, type)
                        {
                            if ( type === 'display' )
                            {
                                var el = angular.element(data);
                                el.html(el.text() + ' MB');

                                return el[0].outerHTML;
                            }
                            else
                            {
                                return data;
                            }
                        }
                    }
                ]
            }
        };

        // Widget 8
        vm.widget8 = vm.dashboardData.widget8;

        // Methods

        //////////

        // Init Widget 4
        vm.widget4.init();

        // Init Widget 6
        vm.widget6.init();
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "msApiProvider"];
    angular
        .module('app.dashboards.project', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, msApiProvider)
    {
        // State
        $stateProvider.state('app.dashboards_project', {
            url      : '/dashboard-project',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/apps/dashboards/project/dashboard-project.html',
                    controller : 'DashboardProjectController as vm'
                }
            },
            resolve  : {
                DashboardData: ["msApi", function (msApi)
                {
                    return msApi.resolve('dashboard.project@get');
                }]
            },
            bodyClass: 'dashboard-project'
        });

        // Api
        msApiProvider.register('dashboard.project', ['app/data/dashboard/project/data.json']);
    }

})();
(function ()
{
    'use strict';

    DashboardProjectController.$inject = ["$scope", "$interval", "$mdSidenav", "DashboardData"];
    angular
        .module('app.dashboards.project')
        .controller('DashboardProjectController', DashboardProjectController);

    /** @ngInject */
    function DashboardProjectController($scope, $interval, $mdSidenav, DashboardData)
    {
        var vm = this;

        // Data
        vm.dashboardData = DashboardData;
        vm.projects = vm.dashboardData.projects;

        // Widget 1
        vm.widget1 = vm.dashboardData.widget1;

        // Widget 2
        vm.widget2 = vm.dashboardData.widget2;

        // Widget 3
        vm.widget3 = vm.dashboardData.widget3;

        // Widget 4
        vm.widget4 = vm.dashboardData.widget4;

        // Widget 5
        vm.widget5 = {
            title       : vm.dashboardData.widget5.title,
            mainChart   : {
                config : {
                    refreshDataOnly: true,
                    deepWatchData  : true
                },
                options: {
                    chart: {
                        type        : 'multiBarChart',
                        color       : ['#03a9f4', '#b3e5fc'],
                        height      : 420,
                        margin      : {
                            top   : 8,
                            right : 16,
                            bottom: 32,
                            left  : 32
                        },
                        clipEdge    : true,
                        groupSpacing: 0.3,
                        reduceXTicks: false,
                        stacked     : true,
                        duration    : 250,
                        x           : function (d)
                        {
                            return d.x;
                        },
                        y           : function (d)
                        {
                            return d.y;
                        },
                        yAxis       : {
                            tickFormat: function (d)
                            {
                                return d;
                            }
                        },
                        legend      : {
                            margin: {
                                top   : 8,
                                bottom: 32
                            }
                        },
                        controls    : {
                            margin: {
                                top   : 8,
                                bottom: 32
                            }
                        },
                        tooltip     : {
                            gravity: 's',
                            classes: 'gravity-s'
                        }
                    }
                },
                data   : []
            },
            supporting  : {
                widgets: {
                    created  : {
                        data : vm.dashboardData.widget5.supporting.created,
                        chart: {
                            data: []
                        }
                    },
                    closed   : {
                        data : vm.dashboardData.widget5.supporting.closed,
                        chart: {
                            data: []
                        }
                    },
                    reOpened : {
                        data : vm.dashboardData.widget5.supporting.reOpened,
                        chart: {
                            data: []
                        }
                    },
                    wontFix  : {
                        data : vm.dashboardData.widget5.supporting.wontFix,
                        chart: {
                            data: []
                        }
                    },
                    needsTest: {
                        data : vm.dashboardData.widget5.supporting.needsTest,
                        chart: {
                            data: []
                        }
                    },
                    fixed    : {
                        data : vm.dashboardData.widget5.supporting.fixed,
                        chart: {
                            data: []
                        }
                    }
                },
                chart  : {
                    config : {
                        refreshDataOnly: true,
                        deepWatchData  : true
                    },
                    options: {
                        chart: {
                            type                   : 'lineChart',
                            color                  : ['#03A9F4'],
                            height                 : 50,
                            margin                 : {
                                top   : 8,
                                right : 0,
                                bottom: 0,
                                left  : 0
                            },
                            isArea                 : true,
                            interpolate            : 'cardinal',
                            clipEdge               : true,
                            duration               : 500,
                            showXAxis              : false,
                            showYAxis              : false,
                            showLegend             : false,
                            useInteractiveGuideline: true,
                            x                      : function (d)
                            {
                                return d.x;
                            },
                            y                      : function (d)
                            {
                                return d.y;
                            },
                            yDomain                : [0, 9],
                            xAxis                  : {
                                tickFormat: function (d)
                                {
                                    return vm.widget5.days[d];
                                }
                            },
                            interactiveLayer       : {
                                tooltip: {
                                    gravity: 'e',
                                    classes: 'gravity-e'
                                }
                            }
                        }
                    },
                    data   : []
                }
            },
            days        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            ranges      : vm.dashboardData.widget5.ranges,
            currentRange: '',
            changeRange : function (range)
            {
                vm.widget5.currentRange = range;

                /**
                 * Update main chart data by iterating through the
                 * chart dataset and separately adding every single
                 * dataset by hand.
                 *
                 * You MUST NOT swap the entire data object by doing
                 * something similar to this:
                 * vm.widget.mainChart.data = chartData
                 *
                 * It would be easier but it won't work with the
                 * live updating / animated charts due to how d3
                 * works.
                 *
                 * If you don't need animated / live updating charts,
                 * you can simplify these greatly.
                 */
                angular.forEach(vm.dashboardData.widget5.mainChart, function (chartData, index)
                {
                    vm.widget5.mainChart.data[index] = {
                        key   : chartData.key,
                        values: chartData.values[range]
                    };
                });

                /**
                 * Do the same thing for the supporting widgets but they
                 * only have 1 dataset so we can do [0] without needing to
                 * iterate through in their data arrays
                 */
                angular.forEach(vm.dashboardData.widget5.supporting, function (widget, name)
                {
                    vm.widget5.supporting.widgets[name].chart.data[0] = {
                        key   : widget.chart.key,
                        values: widget.chart.values[range]
                    };
                });
            },
            init        : function ()
            {
                // Run this function once to initialize widget

                /**
                 * Update the range for the first time
                 */
                vm.widget5.changeRange('TW');
            }
        };

        // Widget 6
        vm.widget6 = {
            title       : vm.dashboardData.widget6.title,
            mainChart   : {
                config : {
                    refreshDataOnly: true,
                    deepWatchData  : true
                },
                options: {
                    chart: {
                        type        : 'pieChart',
                        color       : ['#f44336', '#9c27b0', '#03a9f4', '#e91e63'],
                        height      : 400,
                        margin      : {
                            top   : 0,
                            right : 0,
                            bottom: 0,
                            left  : 0
                        },
                        donut       : true,
                        clipEdge    : true,
                        cornerRadius: 0,
                        labelType   : 'percent',
                        padAngle    : 0.02,
                        x           : function (d)
                        {
                            return d.label;
                        },
                        y           : function (d)
                        {
                            return d.value;
                        },
                        tooltip     : {
                            gravity: 's',
                            classes: 'gravity-s'
                        }
                    }
                },
                data   : []
            },
            footerLeft  : vm.dashboardData.widget6.footerLeft,
            footerRight : vm.dashboardData.widget6.footerRight,
            ranges      : vm.dashboardData.widget6.ranges,
            currentRange: '',
            changeRange : function (range)
            {
                vm.widget6.currentRange = range;

                /**
                 * Update main chart data by iterating through the
                 * chart dataset and separately adding every single
                 * dataset by hand.
                 *
                 * You MUST NOT swap the entire data object by doing
                 * something similar to this:
                 * vm.widget.mainChart.data = chartData
                 *
                 * It would be easier but it won't work with the
                 * live updating / animated charts due to how d3
                 * works.
                 *
                 * If you don't need animated / live updating charts,
                 * you can simplify these greatly.
                 */
                angular.forEach(vm.dashboardData.widget6.mainChart, function (data, index)
                {
                    vm.widget6.mainChart.data[index] = {
                        label: data.label,
                        value: data.values[range]
                    };
                });
            },
            init        : function ()
            {
                // Run this function once to initialize widget

                /**
                 * Update the range for the first time
                 */
                vm.widget6.changeRange('TW');
            }
        };

        // Widget 7
        vm.widget7 = {
            title       : vm.dashboardData.widget7.title,
            ranges      : vm.dashboardData.widget7.ranges,
            schedule    : vm.dashboardData.widget7.schedule,
            currentRange: 'T'
        };

        // Widget 8
        vm.widget8 = {
            title    : vm.dashboardData.widget8.title,
            mainChart: {
                options: {
                    chart: {
                        type     : 'pieChart',
                        color    : ['#f44336', '#9c27b0', '#03a9f4', '#e91e63', '#ffc107'],
                        height   : 400,
                        margin   : {
                            top   : 0,
                            right : 0,
                            bottom: 0,
                            left  : 0
                        },
                        labelType: 'percent',
                        x        : function (d)
                        {
                            return d.label;
                        },
                        y        : function (d)
                        {
                            return d.value;
                        },
                        tooltip  : {
                            gravity: 's',
                            classes: 'gravity-s'
                        }
                    }
                },
                data   : vm.dashboardData.widget8.mainChart
            }
        };

        // Widget 9
        vm.widget9 = {
            title       : vm.dashboardData.widget9.title,
            weeklySpent : {
                title    : vm.dashboardData.widget9.weeklySpent.title,
                count    : vm.dashboardData.widget9.weeklySpent.count,
                chartData: []
            },
            totalSpent  : {
                title    : vm.dashboardData.widget9.totalSpent.title,
                count    : vm.dashboardData.widget9.totalSpent.count,
                chartData: []
            },
            remaining   : {
                title    : vm.dashboardData.widget9.remaining.title,
                count    : vm.dashboardData.widget9.remaining.count,
                chartData: []
            },
            totalBudget : vm.dashboardData.widget9.totalBudget,
            chart       : {
                config : {
                    refreshDataOnly: true,
                    deepWatchData  : true
                },
                options: {
                    chart: {
                        type                   : 'lineChart',
                        color                  : ['#00BCD4'],
                        height                 : 50,
                        margin                 : {
                            top   : 8,
                            right : 0,
                            bottom: 0,
                            left  : 0
                        },
                        isArea                 : true,
                        interpolate            : 'cardinal',
                        clipEdge               : true,
                        duration               : 500,
                        showXAxis              : false,
                        showYAxis              : false,
                        showLegend             : false,
                        useInteractiveGuideline: true,
                        x                      : function (d)
                        {
                            return d.x;
                        },
                        y                      : function (d)
                        {
                            return d.y;
                        },
                        yDomain                : [0, 9],
                        xAxis                  : {
                            tickFormat: function (d)
                            {
                                return vm.widget9.days[d];
                            }
                        },
                        interactiveLayer       : {
                            tooltip: {
                                gravity: 'e',
                                classes: 'gravity-e'
                            }
                        }
                    }
                }
            },
            days        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            ranges      : vm.dashboardData.widget9.ranges,
            currentRange: '',
            changeRange : function (range)
            {
                vm.widget9.currentRange = range;

                /**
                 * Update mini charts. They only have 1 dataset
                 * so we can do [0] without needing to iterate
                 * through in their data arrays
                 */
                vm.widget9.weeklySpent.chartData[0] = {
                    key   : vm.dashboardData.widget9.weeklySpent.chart.label,
                    values: vm.dashboardData.widget9.weeklySpent.chart.values[range]
                };

                vm.widget9.totalSpent.chartData[0] = {
                    key   : vm.dashboardData.widget9.totalSpent.chart.label,
                    values: vm.dashboardData.widget9.totalSpent.chart.values[range]
                };

                vm.widget9.remaining.chartData[0] = {
                    key   : vm.dashboardData.widget9.remaining.chart.label,
                    values: vm.dashboardData.widget9.remaining.chart.values[range]
                };
            },
            init        : function ()
            {
                // Run this function once to initialize widget

                /**
                 * Update the range for the first time
                 */
                vm.widget9.changeRange('TW');
            }
        };

        // Widget 10
        vm.widget10 = vm.dashboardData.widget10;

        // Widget 11
        vm.widget11 = {
            title    : vm.dashboardData.widget11.title,
            table    : vm.dashboardData.widget11.table,
            dtOptions: {
                dom       : '<"top"f>rt<"bottom"<"left"<"length"l>><"right"<"info"i><"pagination"p>>>',
                pagingType: 'simple',
                autoWidth : false,
                responsive: true,
                order     : [1, 'asc'],
                columnDefs: [
                    {
                        width    : '40',
                        orderable: false,
                        targets  : [0]
                    },
                    {
                        width  : '20%',
                        targets: [1, 2, 3, 4, 5]
                    }
                ]
            }
        };

        // Now widget
        vm.nowWidget = {
            now   : {
                second: '',
                minute: '',
                hour  : '',
                day   : '',
                month : '',
                year  : ''
            },
            ticker: function ()
            {
                var now = moment();
                vm.nowWidget.now = {
                    second : now.format('ss'),
                    minute : now.format('mm'),
                    hour   : now.format('HH'),
                    day    : now.format('D'),
                    weekDay: now.format('dddd'),
                    month  : now.format('MMMM'),
                    year   : now.format('YYYY')
                };
            }
        };

        // Weather widget
        vm.weatherWidget = vm.dashboardData.weatherWidget;

        // Methods
        vm.toggleSidenav = toggleSidenav;
        vm.selectProject = selectProject;

        //////////
        vm.selectedProject = vm.projects[0];

        // Initialize Widget 5
        vm.widget5.init();

        // Initialize Widget 6
        vm.widget6.init();

        // Initialize Widget 9
        vm.widget9.init();

        // Now widget ticker
        vm.nowWidget.ticker();

        var nowWidgetTicker = $interval(vm.nowWidget.ticker, 1000);

        $scope.$on('$destroy', function ()
        {
            $interval.cancel(nowWidgetTicker);
        });

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }

        /**
         * Select project
         */
        function selectProject(project)
        {
            vm.selectedProject = project;
        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "msApiProvider"];
    angular
        .module('app.dashboards.analytics', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, msApiProvider)
    {
        // State
        $stateProvider.state('app.dashboards_analytics', {
            url      : '/dashboard-analytics',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/apps/dashboards/analytics/dashboard-analytics.html',
                    controller : 'DashboardAnalyticsController as vm'
                }
            },
            resolve  : {
                DashboardData: ["msApi", function (msApi)
                {
                    return msApi.resolve('dashboard.analytics@get');
                }]
            },
            bodyClass: 'dashboard-analytics'
        });

        // Api
        msApiProvider.register('dashboard.analytics', ['app/data/dashboard/analytics/data.json']);
    }

})();
(function ()
{
    'use strict';

    DashboardAnalyticsController.$inject = ["DashboardData", "uiGmapGoogleMapApi"];
    angular
        .module('app.dashboards.analytics')
        .controller('DashboardAnalyticsController', DashboardAnalyticsController);

    /** @ngInject */
    function DashboardAnalyticsController(DashboardData, uiGmapGoogleMapApi)
    {
        var vm = this;

        // Data
        vm.dashboardData = DashboardData;
        vm.colors = ['blue-bg', 'blue-grey-bg', 'orange-bg', 'pink-bg', 'purple-bg'];

        vm.widget1 = {
            title             : vm.dashboardData.widget1.title,
            onlineUsers       : vm.dashboardData.widget1.onlineUsers,
            bigChart          : {
                options: {
                    chart: {
                        type                   : 'lineWithFocusChart',
                        color                  : ['#2196F3'],
                        height                 : 400,
                        margin                 : {
                            top   : 32,
                            right : 32,
                            bottom: 64,
                            left  : 48
                        },
                        isArea                 : true,
                        useInteractiveGuideline: true,
                        duration               : 1,
                        clipEdge               : true,
                        clipVoronoi            : false,
                        interpolate            : 'cardinal',
                        showLegend             : false,
                        x                      : function (d)
                        {
                            return d.x;
                        },
                        y                      : function (d)
                        {
                            return d.y;
                        },
                        xAxis                  : {
                            showMaxMin: false,
                            tickFormat: function (d)
                            {
                                var date = new Date(new Date().setDate(new Date().getDate() + d));
                                return d3.time.format('%b %d')(date);
                            }
                        },
                        yAxis                  : {
                            showMaxMin: false
                        },
                        x2Axis                 : {
                            showMaxMin: false,
                            tickFormat: function (d)
                            {
                                var date = new Date(new Date().setDate(new Date().getDate() + d));
                                return d3.time.format('%b %d')(date);
                            }
                        },
                        y2Axis                 : {
                            showMaxMin: false
                        },
                        interactiveLayer       : {
                            tooltip: {
                                gravity: 's',
                                classes: 'gravity-s'
                            }
                        },
                        legend                 : {
                            margin    : {
                                top   : 8,
                                right : 0,
                                bottom: 32,
                                left  : 0
                            },
                            rightAlign: false
                        }
                    }
                },
                data   : vm.dashboardData.widget1.bigChart.chart
            },
            sessions          : {
                title   : vm.dashboardData.widget1.sessions.title,
                value   : vm.dashboardData.widget1.sessions.value,
                previous: vm.dashboardData.widget1.sessions.previous,
                options : {
                    chart: {
                        type                   : 'lineChart',
                        color                  : ['#03A9F4'],
                        height                 : 40,
                        margin                 : {
                            top   : 4,
                            right : 4,
                            bottom: 4,
                            left  : 4
                        },
                        isArea                 : true,
                        interpolate            : 'cardinal',
                        clipEdge               : true,
                        duration               : 500,
                        showXAxis              : false,
                        showYAxis              : false,
                        showLegend             : false,
                        useInteractiveGuideline: true,
                        x                      : function (d)
                        {
                            return d.x;
                        },
                        y                      : function (d)
                        {
                            return d.y;
                        },
                        xAxis                  : {
                            tickFormat: function (d)
                            {
                                var date = new Date(new Date().setDate(new Date().getDate() + d));
                                return d3.time.format('%A, %B %d, %Y')(date);
                            }
                        },
                        interactiveLayer       : {
                            tooltip: {
                                gravity: 's',
                                classes: 'gravity-s'
                            }
                        }
                    }
                },
                data    : vm.dashboardData.widget1.sessions.chart
            },
            pageviews         : {
                title   : vm.dashboardData.widget1.pageviews.title,
                value   : vm.dashboardData.widget1.pageviews.value,
                previous: vm.dashboardData.widget1.pageviews.previous,
                options : {
                    chart: {
                        type                   : 'lineChart',
                        color                  : ['#3F51B5'],
                        height                 : 40,
                        margin                 : {
                            top   : 4,
                            right : 4,
                            bottom: 4,
                            left  : 4
                        },
                        isArea                 : true,
                        interpolate            : 'cardinal',
                        clipEdge               : true,
                        duration               : 500,
                        showXAxis              : false,
                        showYAxis              : false,
                        showLegend             : false,
                        useInteractiveGuideline: true,
                        x                      : function (d)
                        {
                            return d.x;
                        },
                        y                      : function (d)
                        {
                            return d.y;
                        },
                        xAxis                  : {
                            tickFormat: function (d)
                            {
                                var date = new Date(new Date().setDate(new Date().getDate() + d));
                                return d3.time.format('%A, %B %d, %Y')(date);
                            }
                        },
                        interactiveLayer       : {
                            tooltip: {
                                gravity: 's',
                                classes: 'gravity-s'
                            }
                        }
                    }
                },
                data    : vm.dashboardData.widget1.pageviews.chart
            },
            pagesSessions     : {
                title   : vm.dashboardData.widget1.pagesSessions.title,
                value   : vm.dashboardData.widget1.pagesSessions.value,
                previous: vm.dashboardData.widget1.pagesSessions.previous,
                options : {
                    chart: {
                        type                   : 'lineChart',
                        color                  : ['#E91E63'],
                        height                 : 40,
                        margin                 : {
                            top   : 4,
                            right : 4,
                            bottom: 4,
                            left  : 4
                        },
                        isArea                 : true,
                        interpolate            : 'cardinal',
                        clipEdge               : true,
                        duration               : 500,
                        showXAxis              : false,
                        showYAxis              : false,
                        showLegend             : false,
                        useInteractiveGuideline: true,
                        x                      : function (d)
                        {
                            return d.x;
                        },
                        y                      : function (d)
                        {
                            return d.y;
                        },
                        xAxis                  : {
                            tickFormat: function (d)
                            {
                                var date = new Date(new Date().setDate(new Date().getDate() + d));
                                return d3.time.format('%A, %B %d, %Y')(date);
                            }
                        },
                        interactiveLayer       : {
                            tooltip: {
                                gravity: 's',
                                classes: 'gravity-s'
                            }
                        }
                    }
                },
                data    : vm.dashboardData.widget1.pagesSessions.chart
            },
            avgSessionDuration: {
                title   : vm.dashboardData.widget1.avgSessionDuration.title,
                value   : vm.dashboardData.widget1.avgSessionDuration.value,
                previous: vm.dashboardData.widget1.avgSessionDuration.previous,
                options : {
                    chart: {
                        type                   : 'lineChart',
                        color                  : ['#009688'],
                        height                 : 40,
                        margin                 : {
                            top   : 4,
                            right : 4,
                            bottom: 4,
                            left  : 4
                        },
                        isArea                 : true,
                        interpolate            : 'cardinal',
                        clipEdge               : true,
                        duration               : 500,
                        showXAxis              : false,
                        showYAxis              : false,
                        showLegend             : false,
                        useInteractiveGuideline: true,
                        x                      : function (d)
                        {
                            return d.x;
                        },
                        y                      : function (d)
                        {
                            return d.y;
                        },
                        xAxis                  : {
                            tickFormat: function (d)
                            {
                                var date = new Date(new Date().setDate(new Date().getDate() + d));
                                return d3.time.format('%A, %B %d, %Y')(date);
                            }
                        },
                        yAxis                  : {
                            tickFormat: function (d)
                            {
                                var formatTime = d3.time.format('%M:%S');
                                return formatTime(new Date('2012', '0', '1', '0', '0', d));
                            }
                        },
                        interactiveLayer       : {
                            tooltip: {
                                gravity: 's',
                                classes: 'gravity-s'
                            }
                        }
                    }
                },
                data    : vm.dashboardData.widget1.avgSessionDuration.chart
            }
        };

        // Widget 2
        vm.widget2 = {
            title: vm.dashboardData.widget2.title
        };

        // Widget 3
        vm.widget3 = {
            title       : vm.dashboardData.widget3.title,
            pages       : vm.dashboardData.widget3.pages,
            ranges      : vm.dashboardData.widget3.ranges,
            currentRange: vm.dashboardData.widget3.currentRange,
            changeRange : function (range)
            {
                vm.widget3.currentRange(range);
            }
        };

        // Widget 4
        vm.widget4 = vm.dashboardData.widget4;


        // Methods

        //////////

        // Widget 2
        uiGmapGoogleMapApi.then(function ()
        {
            vm.widget2.map = vm.dashboardData.widget2.map;
        });
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$translatePartialLoaderProvider", "msApiProvider"];
    angular
        .module('app.quick-panel', [])
        .config(config);

    /** @ngInject */
    function config($translatePartialLoaderProvider, msApiProvider)
    {
        // Translation
        $translatePartialLoaderProvider.addPart('app/quick-panel');

        // Api
        msApiProvider.register('quickPanel.activities', ['app/data/quick-panel/activities.json']);
        msApiProvider.register('quickPanel.contacts', ['app/data/quick-panel/contacts.json']);
        msApiProvider.register('quickPanel.events', ['app/data/quick-panel/events.json']);
        msApiProvider.register('quickPanel.notes', ['app/data/quick-panel/notes.json']);
    }
})();

(function ()
{
    'use strict';

    ChatTabController.$inject = ["msApi", "$timeout"];
    angular
        .module('app.quick-panel')
        .controller('ChatTabController', ChatTabController);

    /** @ngInject */
    function ChatTabController(msApi, $timeout)
    {
        var vm = this;

        // Data
        vm.chat = {};
        vm.chatActive = false;
        vm.replyMessage = '';

        msApi.request('quickPanel.contacts@get', {},
            // Success
            function (response)
            {
                vm.contacts = response.data;
            }
        );

        // Methods
        vm.toggleChat = toggleChat;
        vm.reply = reply;

        //////////

        function toggleChat(contact)
        {
            vm.chatActive = !vm.chatActive;

            if ( vm.chatActive )
            {
                vm.replyMessage = '';
                vm.chat.contact = contact;
                scrollToBottomOfChat(0);
            }
        }

        function reply()
        {
            if ( vm.replyMessage === '' )
            {
                return;
            }

            if ( !vm.chat.contact.dialog )
            {
                vm.chat.contact.dialog = [];
            }

            vm.chat.contact.dialog.push({
                who    : 'user',
                message: vm.replyMessage,
                time   : 'Just now'
            });

            vm.replyMessage = '';

            scrollToBottomOfChat(400);
        }

        function scrollToBottomOfChat(speed)
        {
            var chatDialog = angular.element('#chat-dialog');

            $timeout(function ()
            {
                chatDialog.animate({
                    scrollTop: chatDialog[0].scrollHeight
                }, speed);
            }, 0);

        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.typography', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_typography', {
            url      : '/ui/typography',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/ui/typography/typography.html',
                    controller : 'TypographyController as vm'
                }
            },
            bodyClass: 'typography'
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.ui.typography')
        .controller('TypographyController', TypographyController);

    /** @ngInject */
    function TypographyController()
    {
        // Data

        // Methods

        //////////
    }
})();



(function ()
{
    'use strict';

    ThemeColorsController.$inject = ["fuseTheming", "$mdDialog", "$document"];
    angular
        .module('app.ui.theme-colors')
        .controller('ThemeColorsController', ThemeColorsController);

    /** @ngInject */
    function ThemeColorsController(fuseTheming, $mdDialog, $document)
    {
        var vm = this;
        // Data
        vm.themes = fuseTheming.themes;

        // Methods
        vm.createTheme = createTheme;
        //////////

        function createTheme(ev)
        {
            $mdDialog.show({
                controller         : 'CustomThemeDialogController',
                controllerAs       : 'vm',
                templateUrl        : 'app/main/ui/theme-colors/dialogs/custom-theme/custom-theme-dialog.html',
                parent             : angular.element($document.body),
                targetEvent        : ev,
                clickOutsideToClose: true
            });
        }

    }
})();



(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.material-colors', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_material-colors', {
            url  : '/ui/material-colors',
            views: {
                'content@app': {
                    templateUrl: 'app/main/ui/material-colors/material-colors.html',
                    controller : 'MaterialColorsController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    MaterialColorsController.$inject = ["$mdColorPalette"];
    angular
        .module('app.ui.material-colors')
        .controller('MaterialColorsController', MaterialColorsController);

    /** @ngInject */
    function MaterialColorsController($mdColorPalette)
    {
        var vm = this;

        // Data
        vm.palettes = $mdColorPalette;

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "msApiProvider"];
    angular
        .module('app.ui.icons', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, msApiProvider)
    {
        $stateProvider.state('app.ui_icons', {
            url      : '/ui/icons',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/ui/icons/icons.html',
                    controller : 'IconsController as vm'
                }
            },
            resolve  : {
                Icons: ["msApi", function (msApi)
                {
                    return msApi.resolve('icons@get');
                }]
            },
            bodyClass: 'icons'
        });

        // Api
        msApiProvider.register('icons', ['assets/icons/selection.json']);
    }

})();
(function ()
{
    'use strict';

    IconsController.$inject = ["Icons"];
    angular
        .module('app.ui.icons')
        .controller('IconsController', IconsController);

    /** @ngInject */
    function IconsController(Icons)
    {
        var vm = this;

        // Data
        vm.icons = Icons.icons;

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.ui.forms', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.ui_forms', {
            url      : '/ui/forms',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/ui/forms/forms.html',
                    controller : 'FormsController as vm'
                }
            },
            bodyClass: 'forms'
        });
    }

})();
(function ()
{
    'use strict';

    FormsController.$inject = ["$mdDialog"];
    angular
        .module('app.ui.forms')
        .controller('FormsController', FormsController);

    /** @ngInject */
    function FormsController($mdDialog)
    {
        var vm = this;

        // Data
        vm.stepper = {
            step1: {},
            step2: {},
            step3: {}
        };

        vm.basicForm = {};
        vm.formWizard = {};
        vm.states = ('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS ' +
        'MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI ' +
        'WY').split(' ').map(function (state)
        {
            return {abbrev: state};
        });

        // Methods
        vm.sendForm = sendForm;
        vm.submitStepper = submitStepper;

        //////////

        /**
         * Submit stepper form
         *
         * @param ev
         */
        function submitStepper(ev)
        {
            // You can do an API call here to send the form to your server

            // Show the sent data.. you can delete this safely.
            $mdDialog.show({
                controller         : ["$scope", "$mdDialog", "formWizardData", function ($scope, $mdDialog, formWizardData)
                {
                    $scope.formWizardData = formWizardData;
                    $scope.closeDialog = function ()
                    {
                        $mdDialog.hide();
                    }
                }],
                template           : '<md-dialog>' +
                '  <md-dialog-content><h1>You have sent the form with the following data</h1><div><pre>{{formWizardData | json}}</pre></div></md-dialog-content>' +
                '  <md-dialog-actions>' +
                '    <md-button ng-click="closeDialog()" class="md-primary">' +
                '      Close' +
                '    </md-button>' +
                '  </md-dialog-actions>' +
                '</md-dialog>',
                parent             : angular.element('body'),
                targetEvent        : ev,
                locals             : {
                    formWizardData: vm.stepper
                },
                clickOutsideToClose: true
            });

            // Reset the form model
            vm.stepper = {
                step1: {},
                step2: {},
                step3: {}
            };
        }

        /**
         * Send form
         */
        function sendForm(ev)
        {
            // You can do an API call here to send the form to your server

            // Show the sent data.. you can delete this safely.
            $mdDialog.show({
                controller         : ["$scope", "$mdDialog", "formWizardData", function ($scope, $mdDialog, formWizardData)
                {
                    $scope.formWizardData = formWizardData;
                    $scope.closeDialog = function ()
                    {
                        $mdDialog.hide();
                    }
                }],
                template           : '<md-dialog>' +
                '  <md-dialog-content><h1>You have sent the form with the following data</h1><div><pre>{{formWizardData | json}}</pre></div></md-dialog-content>' +
                '  <md-dialog-actions>' +
                '    <md-button ng-click="closeDialog()" class="md-primary">' +
                '      Close' +
                '    </md-button>' +
                '  </md-dialog-actions>' +
                '</md-dialog>',
                parent             : angular.element('body'),
                targetEvent        : ev,
                locals             : {
                    formWizardData: vm.formWizard
                },
                clickOutsideToClose: true
            });

            // Clear the form data
            vm.formWizard = {};
        }
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.timeline', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.pages_timeline', {
                url      : '/pages/timeline',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/pages/timeline/timeline.html',
                        controller : 'TimelineController as vm'
                    }
                },
                resolve  : {
                    Timeline: ["msApi", function (msApi)
                    {
                        return msApi.resolve('timeline.page1@get');
                    }]
                },
                bodyClass: 'timeline'
            })
            .state('app.pages_timeline_left', {
                url      : '/pages/timeline-left',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/pages/timeline/timeline-left.html',
                        controller : 'TimelineController as vm'
                    }
                },
                resolve  : {
                    Timeline: ["msApi", function (msApi)
                    {
                        return msApi.resolve('timeline.page1@get');
                    }]
                },
                bodyClass: 'timeline-left'
            })
            .state('app.pages_timeline_right', {
                url      : '/pages/timeline-right',
                views    : {
                    'content@app': {
                        templateUrl: 'app/main/pages/timeline/timeline-right.html',
                        controller : 'TimelineController as vm'
                    }
                },
                resolve  : {
                    Timeline: ["msApi", function (msApi)
                    {
                        return msApi.resolve('timeline.page1@get');
                    }]
                },
                bodyClass: 'timeline-right'
            });

        // API
        msApiProvider.register('timeline.page1', ['app/data/timeline/page-1.json']);
        msApiProvider.register('timeline.page2', ['app/data/timeline/page-2.json']);
        msApiProvider.register('timeline.page3', ['app/data/timeline/page-3.json']);

        // Navigation
        msNavigationServiceProvider.saveItem('pages.timeline', {
            title : 'Timeline',
            icon  : 'icon-view-stream',
            weight: 8
        });

        msNavigationServiceProvider.saveItem('pages.timeline.default', {
            title: 'Default',
            state: 'app.pages_timeline'
        });

        msNavigationServiceProvider.saveItem('pages.timeline.left-aligned', {
            title: 'Left Aligned',
            state: 'app.pages_timeline_left'
        });

        msNavigationServiceProvider.saveItem('pages.timeline.right-aligned', {
            title: 'Right Aligned',
            state: 'app.pages_timeline_right'
        });
    }

})();
(function ()
{
    'use strict';

    TimelineController.$inject = ["$q", "msApi", "Timeline"];
    angular
        .module('app.pages.timeline')
        .controller('TimelineController', TimelineController);

    /** @ngInject */
    function TimelineController($q, msApi, Timeline)
    {
        var vm = this;

        // Data
        vm.timeline = Timeline.data;
        vm.currentPage = 1;
        vm.totalPages = 3;
        vm.pauseScroll = false;

        // Methods
        vm.loadNextPage = loadNextPage;

        //////////

        /**
         * Load next page
         * @returns promise
         */
        function loadNextPage()
        {
            // Create a new deferred object
            var deferred = $q.defer();

            // Increase the current page number
            vm.currentPage = vm.currentPage + 1;

            // Check if we still have pages that we can load
            if ( vm.currentPage > vm.totalPages )
            {
                // Reject the promise
                deferred.reject('No more pages');
            }
            else
            {
                // Emulate the api call and load new timeline items in
                var pageName = 'timeline.page' + vm.currentPage + '@get';

                msApi.request(pageName, {},

                    // SUCCESS
                    function (response)
                    {
                        for ( var i = 0; i < response.data.length; i++ )
                        {
                            vm.timeline.push(response.data[i]);
                        }

                        // Resolve the promise
                        deferred.resolve(response);
                    },

                    // ERROR
                    function (response)
                    {
                        // Reject the promise
                        deferred.reject(response);
                    }
                );
            }

            return deferred.promise;
        }
    }
})();

(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.search', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.pages_search', {
            url      : '/pages/search',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/pages/search/search.html',
                    controller : 'SearchController as vm'
                }
            },
            resolve  : {
                Classic : ["msApi", function (msApi)
                {
                    return msApi.resolve('search.classic@get');
                }],
                Mails   : ["msApi", function (msApi)
                {
                    return msApi.resolve('search.mails@get');
                }],
                Users   : ["msApi", function (msApi)
                {
                    return msApi.resolve('search.users@get');
                }],
                Contacts: ["msApi", function (msApi)
                {
                    return msApi.resolve('search.contacts@get');
                }]
            },
            bodyClass: 'search'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/pages/search');

        // Api
        msApiProvider.register('search.classic', ['app/data/search/classic.json']);
        msApiProvider.register('search.mails', ['app/data/search/mails.json']);
        msApiProvider.register('search.users', ['app/data/search/users.json']);
        msApiProvider.register('search.contacts', ['app/data/search/contacts.json']);

        // Navigation
        msNavigationServiceProvider.saveItem('pages.search', {
            title : 'Search',
            icon  : 'icon-magnify',
            state : 'app.pages_search',
            weight: 7
        });
    }

})();
(function ()
{
    'use strict';

    SearchController.$inject = ["Classic", "Mails", "Users", "Contacts"];
    angular
        .module('app.pages.search')
        .controller('SearchController', SearchController);

    /** @ngInject */
    function SearchController(Classic, Mails, Users, Contacts)
    {
        var vm = this;

        // Data
        vm.colors = ['blue-bg', 'blue-grey-bg', 'orange-bg', 'pink-bg', 'purple-bg'];

        vm.classic = Classic.data;
        vm.mails = Mails.data;
        vm.users = Users.data;
        vm.contacts = Contacts.data;

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.profile', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        $stateProvider.state('app.pages_profile', {
            url      : '/pages/profile',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/pages/profile/profile.html',
                    controller : 'ProfileController as vm'
                }
            },
            resolve  : {
                Timeline    : ["msApi", function (msApi)
                {
                    return msApi.resolve('profile.timeline@get');
                }],
                About       : ["msApi", function (msApi)
                {
                    return msApi.resolve('profile.about@get');
                }],
                PhotosVideos: ["msApi", function (msApi)
                {
                    return msApi.resolve('profile.photosVideos@get');
                }]
            },
            bodyClass: 'profile'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/pages/profile');

        // Api
        msApiProvider.register('profile.timeline', ['app/data/profile/timeline.json']);
        msApiProvider.register('profile.about', ['app/data/profile/about.json']);
        msApiProvider.register('profile.photosVideos', ['app/data/profile/photos-videos.json']);

        // Navigation
        msNavigationServiceProvider.saveItem('pages.profile', {
            title : 'Profile',
            icon  : 'icon-account',
            state : 'app.pages_profile',
            weight: 6
        });
    }

})();
(function ()
{
    'use strict';

    ProfileController.$inject = ["Timeline", "About", "PhotosVideos"];
    angular
        .module('app.pages.profile')
        .controller('ProfileController', ProfileController);

    /** @ngInject */
    function ProfileController(Timeline, About, PhotosVideos)
    {
        var vm = this;

        // Data
        vm.posts = Timeline.posts;
        vm.activities = Timeline.activities;
        vm.about = About.data;
        vm.photosVideos = PhotosVideos.data;

        // Methods

        //////////
    }

})();

(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.maintenance', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.pages_maintenance', {
            url      : '/pages/maintenance',
            views    : {
                'main@'                        : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.pages_maintenance': {
                    templateUrl: 'app/main/pages/maintenance/maintenance.html',
                    controller : 'MaintenanceController as vm'
                }
            },
            bodyClass: 'maintenance'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/pages/maintenance');

        // Navigation
        msNavigationServiceProvider.saveItem('pages.maintenance', {
            title : 'Maintenance',
            icon  : 'icon-oil',
            state : 'app.pages_maintenance',
            weight: 5
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.pages.maintenance')
        .controller('MaintenanceController', MaintenanceController);

    /** @ngInject */
    function MaintenanceController()
    {
        // Data

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.invoice', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.pages_invoice', {
            url      : '/pages/invoice',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/pages/invoice/invoice.html',
                    controller : 'InvoiceController as vm'
                }
            },
            resolve  : {
                Invoice: ["msApi", function (msApi)
                {
                    return msApi.resolve('invoice@get');
                }]
            },
            bodyClass: 'invoice printable'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/pages/invoice');

        // Api
        msApiProvider.register('invoice', ['app/data/invoice/invoice.json']);

        // Navigation
        msNavigationServiceProvider.saveItem('pages.invoice', {
            title : 'Invoice',
            icon  : 'icon-receipt',
            state : 'app.pages_invoice',
            weight: 4
        });
    }

})();
(function ()
{
    'use strict';

    InvoiceController.$inject = ["Invoice"];
    angular
        .module('app.pages.invoice')
        .controller('InvoiceController', InvoiceController);

    /** @ngInject */
    function InvoiceController(Invoice)
    {
        var vm = this;

        // Data
        vm.invoice = Invoice.data;

        // Methods

        //////////
    }
})();

(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.coming-soon', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.pages_coming-soon', {
            url      : '/pages/coming-soon',
            views    : {
                'main@'                        : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.pages_coming-soon': {
                    templateUrl: 'app/main/pages/coming-soon/coming-soon.html',
                    controller : 'ComingSoonController as vm'
                }
            },
            bodyClass: 'coming-soon'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/pages/coming-soon');

        // Navigation
        msNavigationServiceProvider.saveItem('pages.coming-soon', {
            title : 'Coming Soon',
            icon  : 'icon-alarm-check',
            state : 'app.pages_coming-soon',
            weight: 2
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.pages.coming-soon')
        .controller('ComingSoonController', ComingSoonController);

    /** @ngInject */
    function ComingSoonController()
    {
        var vm = this;

        // Data
        vm.endTime = 1472975790000;

        // Methods

        //////////
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.components.widgets', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.components_widgets', {
            url  : '/components/widgets',
            views: {
                'content@app': {
                    templateUrl: 'app/main/components/widgets/widgets.html',
                    controller : 'WidgetsController as vm'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.components.widgets')
        .controller('WidgetsController', WidgetsController);

    /** @ngInject */
    function WidgetsController()
    {
        var vm = this;

        // Data
        vm.widget1 = {
            title        : 'WEEKLY TRANSACTIONS',
            value        : 30342,
            lastWeekValue: 30002,
            lastWeekDiff : '+ 1,12%',
            detail       : 'This is the back side. You can show detailed information here.'
        };

        vm.widget2 = {
            title        : 'SALES QUOTA',
            value        : 40,
            lastWeekValue: 85,
            lastWeekDiff : '- 45%',
            detail       : 'This is the back side. You can show detailed information here.'
        };

        vm.widget3 = {
            title : 'BOUNCE RATE',
            value : 80,
            detail: 'This is the back side. You can show detailed information here.'
        };

        vm.widget4 = {
            title        : 'STOCK COUNT',
            value        : 5583,
            lastWeekValue: 5583,
            lastWeekDiff : '- 0%',
            detail       : 'This is the back side. You can show detailed information here.'
        };

        vm.widget5 = {
            title: 'USERS ONLINE',
            value: 658
        };

        vm.widget6 = {
            title: 'WASTELANDERS',
            value: 358
        };

        vm.widget7 = {
            title: 'VAULTS SEALED',
            value: 24
        };

        vm.widget8 = {
            title: 'VAULTS OPEN',
            value: 62
        };

        vm.widget9 = {
            title: 'SONGS',
            value: 210
        };

        vm.widget10 = {
            title: 'VIDEOS',
            value: 54
        };

        vm.widget11 = {
            title: 'DOCUMENTS',
            value: 1252
        };

        vm.widget12 = {
            date       : 'June 27, Saturday',
            temperature: 28,
            event      : 'Sunny',
            icon       : 'icon-weather-cloudy',
            location   : 'New York, NY',
            detail     : [
                {
                    day        : 'Sun',
                    icon       : 'icon-weather-rainy',
                    temperature: 24,
                    event      : 'Rainy'
                },
                {
                    day        : 'Mon',
                    icon       : 'icon-weather-pouring',
                    temperature: 23,
                    event      : 'Rainy'
                },
                {
                    day        : 'Tue',
                    icon       : 'icon-weather-cloudy',
                    temperature: 29,
                    event      : 'Overcast'
                },
                {
                    day        : 'Wed',
                    icon       : 'icon-weather-partlycloudy',
                    temperature: 28,
                    event      : 'Sunny'
                },
                {
                    day        : 'Thu',
                    icon       : 'icon-weather-partlycloudy',
                    temperature: 31,
                    event      : 'Sunny'
                }
            ]
        };

        vm.widget13 = {
            date       : 'June 28, Saturday',
            temperature: 16,
            event      : 'Rainy',
            icon       : 'icon-weather-rainy',
            location   : 'Moscow',
            detail     : [
                {
                    day        : 'Sun',
                    icon       : 'icon-weather-rainy',
                    temperature: 24,
                    event      : 'Rainy'
                },
                {
                    day        : 'Mon',
                    icon       : 'icon-weather-pouring',
                    temperature: 23,
                    event      : 'Rainy'
                },
                {
                    day        : 'Tue',
                    icon       : 'icon-weather-cloudy',
                    temperature: 29,
                    event      : 'Overcast'
                },
                {
                    day        : 'Wed',
                    icon       : 'icon-weather-partlycloudy',
                    temperature: 28,
                    event      : 'Sunny'
                },
                {
                    day        : 'Thu',
                    icon       : 'icon-weather-partlycloudy',
                    temperature: 31,
                    event      : 'Sunny'
                }
            ]
        };

        vm.widget14 = {
            title: 'Visitor Demographics',
            tabs : [
                {
                    label : '30 days',
                    groups: [
                        {
                            title: 'Genders',
                            data : [
                                {
                                    title: 'Male',
                                    value: 40
                                },
                                {
                                    title: 'Female',
                                    value: 41
                                }
                            ]
                        },
                        {
                            title: 'Age',
                            data : [
                                {
                                    title: '25 - 34',
                                    value: 32
                                },
                                {
                                    title: '35 - 44',
                                    value: 85
                                }
                            ]
                        }
                    ]
                },
                {
                    label : '10 days',
                    groups: [
                        {
                            title: 'Genders',
                            data : [
                                {
                                    title: 'Male',
                                    value: 32
                                },
                                {
                                    title: 'Female',
                                    value: 49
                                }
                            ]
                        },
                        {
                            title: 'Age',
                            data : [
                                {
                                    title: '25 - 34',
                                    value: 85
                                },
                                {
                                    title: '35 - 44',
                                    value: 60
                                }
                            ]
                        }
                    ]
                },
                {
                    label : '1 day',
                    groups: [
                        {
                            title: 'Genders',
                            data : [
                                {
                                    title: 'Male',
                                    value: 28
                                },
                                {
                                    title: 'Female',
                                    value: 60
                                }
                            ]
                        },
                        {
                            title: 'Age',
                            data : [
                                {
                                    title: '25 - 34',
                                    value: 17
                                },
                                {
                                    title: '35 - 44',
                                    value: 64
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        vm.widget15 = {
            title: 'CPU USAGE',
            value: 200,
            chart: {
                columns: [
                    {
                        id    : 'CPU',
                        name  : 'CPU',
                        color : 'white',
                        values: '30,200,100,400,150,250',
                        type  : 'spline'
                    }
                ]
            }
        };

        vm.widget16 = {
            title        : 'STOCK COUNT',
            value        : 5583,
            lastWeekValue: 5583,
            lastWeekDiff : '- 0%',
            chart        : {
                columns: [
                    {
                        id    : 'STOCK',
                        name  : 'STOCK',
                        color : 'purple',
                        values: '30,200,100,400,150,250',
                        type  : 'area'
                    }
                ]
            }
        };

        vm.widget17 = {
            title   : 'IO RATE',
            subtitle: 'Showing last 5 hours',
            chart   : {
                columns: [
                    {
                        id    : 'Input',
                        name  : 'Input',
                        color : 'green',
                        values: '30,75,290,400,150,250',
                        type  : 'spline'
                    },
                    {
                        id    : 'Output',
                        name  : 'Output',
                        color : 'blue',
                        values: '500,300,120,600,50,80',
                        type  : 'spline'
                    }
                ]
            }
        };

        vm.widget18 = {
            title        : 'WEEKLY VISITORS',
            value        : 30342,
            lastWeekValue: 30002,
            lastWeekDiff : '1.12%',
            chart        : {
                columns: [
                    {
                        id    : 'Visitors',
                        name  : 'Visitors',
                        color : 'steelblue',
                        values: '30,75,290,400,150,250,75,210,125,92,30,75,290,400',
                        type  : 'bar'
                    }
                ]
            }
        };

        vm.widget19 = {
            title   : 'Google Inc.',
            subtitle: 'NASDAQ: GOOG',
            value   : '531.69',
            diff    : '2.29%',
            chart   : {
                columns: [
                    {
                        id    : 'GOOG',
                        name  : 'GOOG',
                        color : 'white',
                        values: '30,75,290,400,150,250,75,210,125,92,30,75,290,400',
                        type  : 'bar'
                    }
                ]
            }
        };

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.components.price-tables', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider.state('app.components_price-tables', {
            url  : '/components/price-tables',
            views: {
                'content@app': {
                    templateUrl: 'app/main/components/price-tables/price-tables.html'
                }
            }
        });
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.components.price-tables')
        .controller('PriceTablesController', PriceTablesController);

    /** @ngInject */
    function PriceTablesController()
    {
        // Data

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    DocTemplateController.$inject = ["DEMOS", "COMPONENTS", "$state", "$http", "$templateCache"];
    angular
        .module('app.components.material-docs')
        .controller('DocTemplateController', DocTemplateController);

    /** @ngInject */
    function DocTemplateController(DEMOS, COMPONENTS, $state, $http, $templateCache)
    {
        var vm = this;
        var component = $state.current.data;
        vm.materialVersion = '1.0.5';

        vm.componentName = component.name;

        vm.component = getComponent(component.moduleName);

        if ( !component.excludeDemo )
        {
            vm.demo = getDemo(component.moduleName);
        }

        if ( vm.component )
        {
            vm.docs = vm.component.docs;
        }

        if ( vm.demo )
        {
            vm.demos = [];

            angular.forEach(vm.demo.demos, function (demo)
            {
                // Get displayed contents (un-minified)
                var files = [demo.index]
                    .concat(demo.js || [])
                    .concat(demo.css || [])
                    .concat(demo.html || []);
                files.forEach(function (file)
                {
                    file.httpPromise = $http.get('app/main/components/material-docs/' + file.outputPath, {cache: $templateCache})
                        .then(function (response)
                        {
                            file.contents = response.data
                                .replace('<head/>', '');
                            return file.contents;
                        });
                });
                demo.$files = files;
                vm.demos.push(demo);
            });

            vm.demos = vm.demos.sort(function (a, b)
            {
                return a.name > b.name ? 1 : -1;
            });
        }

        // Data

        // Methods

        //////////

        function getDemo(value)
        {
            return DEMOS.filter(function (x)
            {
                return x.moduleName === value;
            })[0];
        }

        function getComponent(value)
        {
            return COMPONENTS.filter(function (x)
            {
                return x.name === value;
            })[0];
        }
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider"];
    angular
        .module('app.components.maps', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider)
    {
        $stateProvider
            .state('app.components_maps', {
                url  : '/components/maps',
                views: {
                    'content@app'                   : {
                        templateUrl: 'app/main/components/maps/maps.html',
                        controller : 'MapsController as vm'
                    },
                    'tabContent@app.components_maps': {
                        templateUrl: 'app/main/components/maps/tabs/simple.html'
                    }
                }
            })

            .state('app.components_maps.satellite', {
                url  : '/satellite',
                views: {
                    'tabContent': {
                        templateUrl: 'app/main/components/maps/tabs/satellite.html'
                    }
                }
            })

            .state('app.components_maps.terrain', {
                url  : '/terrain',
                views: {
                    'tabContent': {
                        templateUrl: 'app/main/components/maps/tabs/terrain.html'
                    }
                }
            })

            .state('app.components_maps.simple-marker', {
                url  : '/simple-marker',
                views: {
                    'tabContent': {
                        templateUrl: 'app/main/components/maps/tabs/simple-marker.html'
                    }
                }
            })

            .state('app.components_maps.custom-marker', {
                url  : '/custom-marker',
                views: {
                    'tabContent': {
                        templateUrl: 'app/main/components/maps/tabs/custom-marker.html'
                    }
                }
            })

            .state('app.components_maps.info-window', {
                url  : '/info-window',
                views: {
                    'tabContent': {
                        templateUrl: 'app/main/components/maps/tabs/info-window.html'
                    }
                }
            });
    }

})();
(function ()
{
    'use strict';

    MapsController.$inject = ["$state", "uiGmapGoogleMapApi"];
    angular
        .module('app.components.maps')
        .controller('MapsController', MapsController);

    /** @ngInject */
    function MapsController($state, uiGmapGoogleMapApi)
    {
        var vm = this;

        // Data
        var currentState = $state.current.name;

        switch ( currentState )
        {
            case 'app.components_maps':
                vm.selectedIndex = 0;
                break;

            case 'app.components_maps.satellite':
                vm.selectedIndex = 1;
                break;

            case 'app.components_maps.terrain':
                vm.selectedIndex = 2;
                break;

            case 'app.components_maps.simple-marker':
                vm.selectedIndex = 3;
                break;

            case 'app.components_maps.custom-marker':
                vm.selectedIndex = 4;
                break;

            case 'app.components_maps.info-window':
                vm.selectedIndex = 5;
                break;

            default:
                vm.selectedIndex = 0;
        }

        // Methods

        //////////

        uiGmapGoogleMapApi.then(function (maps)
        {
            vm.simpleMap = {
                center: {
                    latitude : -34.397,
                    longitude: 150.644
                },
                zoom  : 8
            };

            vm.satelliteMap = {
                center : {
                    latitude : -34.397,
                    longitude: 150.644
                },
                zoom   : 8,
                options: {
                    mapTypeId: maps.MapTypeId.SATELLITE
                }
            };

            vm.terrainMap = {
                center : {
                    latitude : -34.397,
                    longitude: 150.644
                },
                zoom   : 8,
                options: {
                    mapTypeId: maps.MapTypeId.TERRAIN
                }
            };

            vm.simpleMarkerMap = {
                center: {
                    latitude : -25.363882,
                    longitude: 131.044922
                },
                zoom  : 8,
                marker: {
                    id    : 0,
                    coords: {
                        latitude : -25.363882,
                        longitude: 131.044922
                    }
                }
            };

            vm.customMarkerMap = {
                center: {
                    latitude : -25.363882,
                    longitude: 131.044922
                },
                zoom  : 8,
                marker: {
                    id     : 0,
                    coords : {
                        latitude : -25.363882,
                        longitude: 131.044922
                    },
                    options: {
                        icon: {
                            anchor: new maps.Point(36, 36),
                            origin: new maps.Point(0, 0),
                            url   : '//google-developers.appspot.com/maps/documentation/javascript/examples/full/images/beachflag.png'
                        }
                    }
                }
            };

        });
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "msApiProvider"];
    angular
        .module('app.components.cards', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, msApiProvider)
    {
        $stateProvider.state('app.components_cards', {
            url    : '/components/cards',
            views  : {
                'content@app': {
                    templateUrl: 'app/main/components/cards/cards.html',
                    controller : 'CardsController as vm'
                }
            },
            resolve: {
                Cards: ["msApi", function (msApi)
                {
                    return msApi.resolve('cards@get');
                }]
            }
        });

        // Api
        msApiProvider.register('cards', ['app/data/cards/cards.json']);
    }

})();
(function ()
{
    'use strict';

    CardsController.$inject = ["Cards"];
    angular
        .module('app.components.cards')
        .controller('CardsController', CardsController);

    /** @ngInject */
    function CardsController(Cards)
    {
        var vm = this;

        // Data
        vm.cards = Cards.data;

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    TodoController.$inject = ["$document", "$mdDialog", "$mdSidenav", "Tasks", "Tags"];
    angular
        .module('app.todo')
        .controller('TodoController', TodoController);

    /** @ngInject */
    function TodoController($document, $mdDialog, $mdSidenav, Tasks, Tags)
    {
        var vm = this;

        // Data
        vm.tasks = Tasks.data;
        vm.tags = Tags.data;
        vm.completed = [];
        vm.colors = ['blue', 'blue-grey', 'orange', 'pink', 'purple'];
        vm.projects = {
            'creapond'    : 'Project Creapond',
            'withinpixels': 'Project Withinpixels'
        };
        vm.selectedFilter = {
            filter : 'Start Date',
            dueDate: 'Next 3 days'
        };
        vm.selectedProject = 'creapond';

        // Tasks will be filtered against these models
        vm.taskFilters = {
            search   : '',
            tags     : [],
            completed: '',
            deleted  : false,
            important: '',
            starred  : '',
            startDate: '',
            dueDate  : ''
        };
        vm.taskFiltersDefaults = angular.copy(vm.taskFilters);
        vm.showAllTasks = true;

        vm.taskOrder = '';
        vm.taskOrderDescending = false;

        vm.sortableOptions = {
            handle        : '.handle',
            forceFallback : true,
            ghostClass    : 'todo-item-placeholder',
            fallbackClass : 'todo-item-ghost',
            fallbackOnBody: true,
            sort          : true
        };
        vm.msScrollOptions = {
            suppressScrollX: true
        };

        // Methods
        vm.preventDefault = preventDefault;
        vm.openTaskDialog = openTaskDialog;
        vm.toggleCompleted = toggleCompleted;
        vm.toggleSidenav = toggleSidenav;
        vm.toggleFilter = toggleFilter;
        vm.toggleFilterWithEmpty = toggleFilterWithEmpty;
        vm.filterByStartDate = filterByStartDate;
        vm.filterByDueDate = filterByDueDate;
        vm.resetFilters = resetFilters;
        vm.toggleTagFilter = toggleTagFilter;
        vm.isTagFilterExists = isTagFilterExists;

        init();

        //////////

        /**
         * Initialize the controller
         */
        function init()
        {
            angular.forEach(vm.tasks, function (task)
            {
                if ( task.startDate )
                {
                    task.startDate = new Date(task.startDate);
                    task.startDateTimestamp = task.startDate.getTime();
                }

                if ( task.dueDate )
                {
                    task.dueDate = new Date(task.dueDate);
                    task.dueDateTimestamp = task.dueDate.getTime();
                }
            });
        }

        /**
         * Prevent default
         *
         * @param e
         */
        function preventDefault(e)
        {
            e.preventDefault();
            e.stopPropagation();
        }

        /**
         * Open new task dialog
         *
         * @param ev
         * @param task
         */
        function openTaskDialog(ev, task)
        {
            $mdDialog.show({
                controller         : 'TaskDialogController',
                controllerAs       : 'vm',
                templateUrl        : 'app/main/apps/todo/dialogs/task/task-dialog.html',
                parent             : angular.element($document.body),
                targetEvent        : ev,
                clickOutsideToClose: true,
                locals             : {
                    Task : task,
                    Tasks: vm.tasks,
                    event: ev
                }
            });
        }

        /**
         * Toggle completed status of the task
         *
         * @param task
         * @param event
         */
        function toggleCompleted(task, event)
        {
            event.stopPropagation();
            task.completed = !task.completed;
        }

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }

        /**
         * Toggles filter with true or false
         *
         * @param filter
         */
        function toggleFilter(filter)
        {
            vm.taskFilters[filter] = !vm.taskFilters[filter];

            checkFilters();
        }

        /**
         * Toggles filter with true or empty string
         * @param filter
         */
        function toggleFilterWithEmpty(filter)
        {
            if ( vm.taskFilters[filter] === '' )
            {
                vm.taskFilters[filter] = true;
            }
            else
            {
                vm.taskFilters[filter] = '';
            }

            checkFilters();
        }

        /**
         * Reset filters
         */
        function resetFilters()
        {
            vm.showAllTasks = true;
            vm.taskFilters = angular.copy(vm.taskFiltersDefaults);
        }

        /**
         * Check filters and mark showAllTasks
         * as true if no filters selected
         */
        function checkFilters()
        {
            vm.showAllTasks = !!angular.equals(vm.taskFiltersDefaults, vm.taskFilters);
        }

        /**
         * Filter by startDate
         *
         * @param item
         * @returns {boolean}
         */
        function filterByStartDate(item)
        {
            if ( vm.taskFilters.startDate === true )
            {
                return item.startDate === new Date();
            }

            return true;
        }

        /**
         * Filter Due Date
         *
         * @param item
         * @returns {boolean}
         */
        function filterByDueDate(item)
        {
            if ( vm.taskFilters.dueDate === true )
            {
                return !(item.dueDate === null || item.dueDate.length === 0);
            }

            return true;
        }

        /**
         * Toggles tag filter
         *
         * @param tag
         */
        function toggleTagFilter(tag)
        {
            var i = vm.taskFilters.tags.indexOf(tag);

            if ( i > -1 )
            {
                vm.taskFilters.tags.splice(i, 1);
            }
            else
            {
                vm.taskFilters.tags.push(tag);
            }

            checkFilters();
        }

        /**
         * Returns if tag exists in the tagsFilter
         *
         * @param tag
         * @returns {boolean}
         */
        function isTagFilterExists(tag)
        {
            return vm.taskFilters.tags.indexOf(tag) > -1;
        }
    }
})();
(function ()
{
    'use strict';

    ScrumboardController.$inject = ["$mdSidenav", "BoardService", "BoardList", "CardFilters"];
    angular
        .module('app.scrumboard')
        .controller('ScrumboardController', ScrumboardController);

    /** @ngInject */
    function ScrumboardController($mdSidenav, BoardService, BoardList, CardFilters)
    {
        var vm = this;

        // Data
        vm.currentView = 'board';
        vm.board = BoardService.data;
        vm.boardList = BoardList.data;
        vm.boardSelectorVisible = false;

        // Methods
        vm.toggleSidenav = toggleSidenav;
        vm.updateBoardUri = updateBoardUri;
        vm.clearFilters = CardFilters.clear;
        vm.filteringIsOn = CardFilters.isOn;

        ////////

        /**
         * Update Board Uri
         *
         * Once you connect your app to your server,
         * you would do this on your API server.
         */
        function updateBoardUri()
        {
            if ( vm.boardList.getById(vm.board.id) )
            {
                vm.boardList.getById(vm.board.id).name = vm.board.name;
                vm.boardList.getById(vm.board.id).uri = vm.board.uri = encodeURIComponent(vm.board.name).replace(/%20/g, '-').toLowerCase();
            }
        }

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }

        /**
         * Array prototype
         *
         * Get by id
         *
         * @param value
         * @returns {T}
         */
        Array.prototype.getById = function (value)
        {
            return this.filter(function (x)
            {
                return x.id === value;
            })[0];
        };

    }
})();
(function ()
{
    'use strict';

    MailController.$inject = ["$scope", "$document", "$timeout", "$mdDialog", "$mdMedia", "$mdSidenav", "Inbox"];
    angular
        .module('app.mail')
        .controller('MailController', MailController);

    /** @ngInject */
    function MailController($scope, $document, $timeout, $mdDialog, $mdMedia, $mdSidenav, Inbox)
    {
        var vm = this;

        // Data
        vm.accounts = {
            'creapond'    : 'johndoe@creapond.com',
            'withinpixels': 'johndoe@withinpixels.com'
        };
        vm.checked = [];
        vm.colors = ['blue-bg', 'blue-grey-bg', 'orange-bg', 'pink-bg', 'purple-bg'];
        vm.selectedAccount = 'creapond';
        vm.selectedMail = {};
        vm.toggleSidenav = toggleSidenav;

        vm.responsiveReadPane = undefined;
        vm.activeMailPaneIndex = 0;
        vm.dynamicHeight = false;

        vm.scrollPos = 0;
        vm.scrollEl = angular.element('#content');

        vm.inbox = Inbox.data;
        vm.selectedMail = vm.inbox[0];
        vm.selectedMailShowDetails = false;

        // Methods
        vm.checkAll = checkAll;
        vm.closeReadPane = closeReadPane;
        vm.composeDialog = composeDialog;
        vm.isChecked = isChecked;
        vm.replyDialog = replyDialog;
        vm.selectMail = selectMail;
        vm.toggleStarred = toggleStarred;
        vm.toggleCheck = toggleCheck;

        //////////

        // Watch screen size to activate responsive read pane
        $scope.$watch(function ()
        {
            return $mdMedia('gt-md');
        }, function (current)
        {
            vm.responsiveReadPane = !current;
        });

        // Watch screen size to activate dynamic height on tabs
        $scope.$watch(function ()
        {
            return $mdMedia('xs');
        }, function (current)
        {
            vm.dynamicHeight = current;
        });

        /**
         * Select mail
         *
         * @param mail
         */
        function selectMail(mail)
        {
            vm.selectedMail = mail;

            $timeout(function ()
            {
                // If responsive read pane is
                // active, navigate to it
                if ( angular.isDefined(vm.responsiveReadPane) && vm.responsiveReadPane )
                {
                    vm.activeMailPaneIndex = 1;
                }

                // Store the current scrollPos
                vm.scrollPos = vm.scrollEl.scrollTop();

                // Scroll to the top
                vm.scrollEl.scrollTop(0);
            });
        }

        /**
         * Close read pane
         */
        function closeReadPane()
        {
            if ( angular.isDefined(vm.responsiveReadPane) && vm.responsiveReadPane )
            {
                vm.activeMailPaneIndex = 0;

                $timeout(function ()
                {
                    vm.scrollEl.scrollTop(vm.scrollPos);
                }, 650);
            }
        }

        /**
         * Toggle starred
         *
         * @param mail
         * @param event
         */
        function toggleStarred(mail, event)
        {
            event.stopPropagation();
            mail.starred = !mail.starred;
        }

        /**
         * Toggle checked status of the mail
         *
         * @param mail
         * @param event
         */
        function toggleCheck(mail, event)
        {
            if ( event )
            {
                event.stopPropagation();
            }

            var idx = vm.checked.indexOf(mail);

            if ( idx > -1 )
            {
                vm.checked.splice(idx, 1);
            }
            else
            {
                vm.checked.push(mail);
            }
        }

        /**
         * Return checked status of the mail
         *
         * @param mail
         * @returns {boolean}
         */
        function isChecked(mail)
        {
            return vm.checked.indexOf(mail) > -1;
        }

        /**
         * Check all
         */
        function checkAll()
        {
            if ( vm.allChecked )
            {
                vm.checked = [];
                vm.allChecked = false;
            }
            else
            {
                angular.forEach(vm.inbox, function (mail)
                {
                    if ( !isChecked(mail) )
                    {
                        toggleCheck(mail);
                    }
                });

                vm.allChecked = true;
            }
        }

        /**
         * Open compose dialog
         *
         * @param ev
         */
        function composeDialog(ev)
        {
            $mdDialog.show({
                controller         : 'ComposeDialogController',
                controllerAs       : 'vm',
                locals             : {
                    selectedMail: undefined
                },
                templateUrl        : 'app/main/apps/mail/dialogs/compose/compose-dialog.html',
                parent             : angular.element($document.body),
                targetEvent        : ev,
                clickOutsideToClose: true
            });
        }

        /**
         * Open reply dialog
         *
         * @param ev
         */
        function replyDialog(ev)
        {
            $mdDialog.show({
                controller         : 'ComposeDialogController',
                controllerAs       : 'vm',
                locals             : {
                    selectedMail: vm.selectedMail
                },
                templateUrl        : 'app/main/apps/mail/dialogs/compose/compose-dialog.html',
                parent             : angular.element($document.body),
                targetEvent        : ev,
                clickOutsideToClose: true
            });
        }

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }
    }
})();
(function ()
{
    'use strict';

    GanttChartController.$inject = ["$mdDialog", "$document", "$animate", "$scope", "$timeout", "ganttUtils", "GanttObjectModel", "ganttDebounce", "moment", "Tasks", "Timespans", "$window", "$mdSidenav", "msApi"];
    angular.module('app.gantt-chart')
        .controller('GanttChartController', GanttChartController);

    /** @ngInject */
    function GanttChartController($mdDialog, $document, $animate, $scope, $timeout, ganttUtils, GanttObjectModel, ganttDebounce, moment, Tasks, Timespans, $window, $mdSidenav, msApi)
    {
        var vm = this;
        var objectModel;

        // Data
        vm.live = {};
        vm.options = {
            mode                    : 'custom',
            scale                   : 'day',
            sortMode                : undefined,
            sideMode                : 'Tree',
            daily                   : true,
            maxHeight               : 300,
            width                   : true,
            zoom                    : 1,
            rowSortable             : true,
            columns                 : ['model.name', 'from', 'to'],
            treeTableColumns        : ['from', 'to'],
            columnsHeaders          : {
                'model.name': 'Name',
                'from'      : 'Start Time',
                'to'        : 'End Time'
            },
            columnsClasses          : {
                'model.name': 'gantt-column-name',
                'from'      : 'gantt-column-from',
                'to'        : 'gantt-column-to'
            },
            columnsFormatters       : {
                'from': function (from)
                {
                    return angular.isDefined(from) ? from.format('lll') : undefined;
                },
                'to'  : function (to)
                {
                    return angular.isDefined(to) ? to.format('lll') : undefined;
                }
            },
            treeHeaderContent       : '{{getHeader()}}',
            columnsHeaderContents   : {
                'model.name': '{{getHeader()}}',
                'from'      : '{{getHeader()}}',
                'to'        : '{{getHeader()}}'
            },
            autoExpand              : 'both',
            taskOutOfRange          : 'truncate',
            fromDate                : '',
            toDate                  : '',
            rowContentEnabled       : true,
            rowContent              : '{{row.model.name}}',
            taskContentEnabled      : true,
            taskContent             : '<i ng-click="scope.vm.editDialog($event, \'task\', task)" class="gantt-task-edit-button icon-pencil s12 icon"\n   aria-label="edit task">\n</i>\n<span class="gantt-task-name">\n    {{task.model.name}}\n    <md-tooltip md-direction="top" class="gantt-chart-task-tooltip">\n        <div layout="column" layout-align="center center">\n            <div class="tooltip-name">\n                {{task.model.name}}\n            </div>\n            <div class="tooltip-date">\n                <span>\n                    {{task.model.from.format(\'MMM DD, HH:mm\')}}\n                </span>\n                <span>-</span>\n                <span>\n                    {{task.model.to.format(\'MMM DD, HH:mm\')}}\n                </span>\n            </div>\n        </div>\n    </md-tooltip>\n</span>',
            allowSideResizing       : false,
            labelsEnabled           : true,
            currentDate             : 'line',
            currentDateValue        : new Date(),
            draw                    : true,
            readOnly                : false,
            groupDisplayMode        : 'group',
            filterTask              : '',
            filterRow               : '',
            timeFrames              : {
                'day'    : {
                    start  : moment('8:00', 'HH:mm'),
                    end    : moment('20:00', 'HH:mm'),
                    working: true,
                    default: true
                },
                'noon'   : {
                    start  : moment('12:00', 'HH:mm'),
                    end    : moment('13:30', 'HH:mm'),
                    working: false,
                    default: true
                },
                'weekend': {
                    working: false
                },
                'holiday': {
                    working: false,
                    color  : 'red',
                    classes: ['gantt-timeframe-holiday']
                }
            },
            dateFrames              : {
                'weekend'    : {
                    evaluator: function (date)
                    {
                        return date.isoWeekday() === 6 || date.isoWeekday() === 7;
                    },
                    targets  : ['weekend']
                },
                '11-november': {
                    evaluator: function (date)
                    {
                        return date.month() === 10 && date.date() === 11;
                    },
                    targets  : ['holiday']
                }
            },
            timeFramesWorkingMode   : 'hidden',
            timeFramesNonWorkingMode: 'visible',
            columnMagnet            : '15 minutes',
            timeFramesMagnet        : true,
            dependencies            : true,
            canDraw                 : function (event)
            {
                var isLeftMouseButton = event.button === 0 || event.button === 1;
                return vm.options.draw && !vm.options.readOnly && isLeftMouseButton;
            },
            drawTaskFactory         : function ()
            {
                return {
                    id   : ganttUtils.randomUuid(),  // Unique id of the task.
                    name : 'Drawn task', // Name shown on top of each task.
                    color: '#AA8833' // Color of the task in HEX format (Optional).
                };
            },
            api                     : function (ganttApi)
            {
                // API Object is used to control methods and events from angular-gantt.
                vm.api = ganttApi;

                vm.api.core.on.ready($scope, function ()
                {
                    // When gantt is ready, load data.
                    // `data` attribute could have been used too.
                    vm.load();

                    // DOM events
                    vm.api.directives.on.new($scope, function (directiveName, directiveScope, element)
                    {
                        /**
                         * Gantt Task
                         */
                        if ( directiveName === 'ganttTask' )
                        {
                            element.on('mousedown touchstart', function (event)
                            {
                                event.preventDefault();
                                event.stopPropagation();
                                vm.live.row = directiveScope.task.row.model;
                                if ( angular.isDefined(directiveScope.task.originalModel) )
                                {
                                    vm.live.task = directiveScope.task.originalModel;
                                }
                                else
                                {
                                    vm.live.task = directiveScope.task.model;
                                }
                                $scope.$digest();
                            });

                        }

                        /**
                         * Gantt Row
                         */
                        else if ( directiveName === 'ganttRow' )
                        {

                            element.on('click', function (event)
                            {
                                event.stopPropagation();
                            });

                            element.on('mousedown touchstart', function (event)
                            {
                                event.stopPropagation();
                                vm.live.row = directiveScope.row.model;
                                $scope.$digest();
                            });

                        }

                        /**
                         * Gantt Row Label
                         */
                        else if ( directiveName === 'ganttRowLabel' )
                        {
                            // Fix for double trigger due to gantt-sortable plugin
                            element.off('click');

                            element.on('click', function (event)
                            {
                                event.preventDefault();
                                editDialog(event, 'row', directiveScope.row);
                            });

                            element.on('mousedown touchstart', function ()
                            {
                                vm.live.row = directiveScope.row.model;
                                $scope.$digest();
                            });

                        }
                    });

                    vm.api.tasks.on.rowChange($scope, function (task)
                    {
                        vm.live.row = task.row.model;
                    });

                    objectModel = new GanttObjectModel(vm.api);
                });
            }
        };

        // Methods
        vm.toggleSidenav = toggleSidenav;
        vm.search = search;
        vm.setSortMode = setSortMode;
        vm.addDialog = addDialog;
        vm.editDialog = editDialog;
        vm.canAutoWidth = canAutoWidth;
        vm.getColumnWidth = getColumnWidth;
        vm.load = load;
        vm.reload = reload;

        //////////

        init();

        /**
         * Initialize
         */
        function init()
        {
            // Set Gantt Chart height at the init
            calculateHeight();

            angular.element($window).on('resize', function ()
            {
                $scope.$apply(function ()
                {
                    calculateHeight();
                });
            });
        }

        /**
         * Max Height Fix
         */
        function calculateHeight()
        {
            vm.options.maxHeight = $document.find('#chart-container').offsetHeight;
        }

        /**
         * Add New Row
         */
        function addDialog(ev)
        {
            $mdDialog.show({
                controller         : 'GanttChartAddEditDialogController',
                controllerAs       : 'vm',
                templateUrl        : 'app/main/apps/gantt-chart/dialogs/add-edit/add-dialog.html',
                parent             : angular.element($document.body),
                targetEvent        : ev,
                clickOutsideToClose: true,
                locals             : {
                    dialogData: {
                        chartData : vm.data,
                        dialogType: 'add'
                    }
                }
            });
        }

        /**
         * Edit Dialog
         */
        function editDialog(ev, formView, formData)
        {
            $mdDialog.show({
                controller         : 'GanttChartAddEditDialogController',
                controllerAs       : 'vm',
                templateUrl        : 'app/main/apps/gantt-chart/dialogs/add-edit/edit-dialog.html',
                parent             : angular.element($document.body),
                targetEvent        : ev,
                clickOutsideToClose: true,
                locals             : {
                    dialogData: {
                        chartData : vm.data,
                        dialogType: 'edit',
                        formView  : formView,
                        formData  : formData
                    }
                }
            });
        }

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }

        /**
         * Search
         * @param sidenavId
         */
        function search(option, keyword)
        {
            if ( option === 'rows' )
            {
                vm.options.filterRow = keyword;
            }
            else if ( option === 'tasks' )
            {
                vm.options.filterTask = keyword;
            }
        }

        /**
         * Sort Mode
         * @param mode
         */
        function setSortMode(mode)
        {
            vm.options.sortMode = mode;

            if ( angular.isUndefined(mode) )
            {
                vm.options.rowSortable = true;
            }
            else
            {
                vm.options.rowSortable = false;
            }
        }

        /**
         * Side Mode
         */
        $scope.$watch('vm.options.sideMode', function (newValue, oldValue)
        {
            if ( newValue !== oldValue )
            {
                vm.api.side.setWidth(undefined);

                $timeout(function ()
                {
                    vm.api.columns.refresh();
                });
            }
        });

        function canAutoWidth(scale)
        {
            if ( scale.match(/.*?hour.*?/) || scale.match(/.*?minute.*?/) )
            {
                return false;
            }

            return true;
        }

        function getColumnWidth(widthEnabled, scale, zoom)
        {
            if ( !widthEnabled && vm.canAutoWidth(scale) )
            {
                return undefined;
            }

            if ( scale.match(/.*?week.*?/) )
            {
                return 150 * zoom;
            }

            if ( scale.match(/.*?month.*?/) )
            {
                return 300 * zoom;
            }

            if ( scale.match(/.*?quarter.*?/) )
            {
                return 500 * zoom;
            }

            if ( scale.match(/.*?year.*?/) )
            {
                return 800 * zoom;
            }

            return 40 * zoom;
        }

        // Reload data action
        function load()
        {
            vm.data = Tasks.data;
            vm.timespans = Timespans.data;

            // Fix for Angular-gantt-chart issue
            $animate.enabled(true);
            $animate.enabled($document.find('#gantt'), false);

        }

        /**
         * Reload Data
         */
        function reload()
        {
            msApi.resolve('ganttChart.tasks@get', function (response)
            {
                vm.data = response.data;
            });

            msApi.resolve('ganttChart.timespans@get', function (response)
            {
                vm.timespans = response.data;
            });
        }

        // Visual two way binding.
        var ganttDebounceValue = 1000;

        var listenTaskJson = ganttDebounce(function (taskJson)
        {
            if ( angular.isDefined(taskJson) )
            {
                var task = angular.fromJson(taskJson);
                objectModel.cleanTask(task);
                var model = vm.live.task;
                angular.extend(model, task);
            }
        }, ganttDebounceValue);

        $scope.$watch('vm.live.taskJson', listenTaskJson);

        var listenRowJson = ganttDebounce(function (rowJson)
        {
            if ( angular.isDefined(rowJson) )
            {
                var row = angular.fromJson(rowJson);
                objectModel.cleanRow(row);
                var tasks = row.tasks;

                delete row.tasks;
                var rowModel = vm.live.row;

                angular.extend(rowModel, row);

                var newTasks = {};
                var i, l;

                if ( angular.isDefined(tasks) )
                {
                    for ( i = 0, l = tasks.length; i < l; i++ )
                    {
                        objectModel.cleanTask(tasks[i]);
                    }

                    for ( i = 0, l = tasks.length; i < l; i++ )
                    {
                        newTasks[tasks[i].id] = tasks[i];
                    }

                    if ( angular.isUndefined(rowModel.tasks) )
                    {
                        rowModel.tasks = [];
                    }

                    for ( i = rowModel.tasks.length - 1; i >= 0; i-- )
                    {
                        var existingTask = rowModel.tasks[i];
                        var newTask = newTasks[existingTask.id];

                        if ( angular.isUndefined(newTask) )
                        {
                            rowModel.tasks.splice(i, 1);
                        }
                        else
                        {
                            objectModel.cleanTask(newTask);
                            angular.extend(existingTask, newTask);

                            delete newTasks[existingTask.id];
                        }
                    }
                }
                else
                {
                    delete rowModel.tasks;
                }

                angular.forEach(newTasks, function (newTask)
                {
                    rowModel.tasks.push(newTask);
                });
            }
        }, ganttDebounceValue);

        $scope.$watch('vm.live.rowJson', listenRowJson);

        $scope.$watchCollection('vm.live.task', function (task)
        {
            vm.live.taskJson = angular.toJson(task, true);
            vm.live.rowJson = angular.toJson(vm.live.row, true);
        });

        $scope.$watchCollection('vm.live.row', function (row)
        {
            vm.live.rowJson = angular.toJson(row, true);
            if ( angular.isDefined(row) && angular.isDefined(row.tasks) && row.tasks.indexOf(vm.live.task) < 0 )
            {
                vm.live.task = row.tasks[0];
            }
        });

        $scope.$watchCollection('vm.live.row.tasks', function ()
        {
            vm.live.rowJson = angular.toJson(vm.live.row, true);
        });
    }

})();

(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msApiProvider", "msNavigationServiceProvider"];
    angular
        .module('app.file-manager', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.file-manager', {
            url      : '/file-manager',
            views    : {
                'content@app': {
                    templateUrl: 'app/main/apps/file-manager/file-manager.html',
                    controller : 'FileManagerController as vm'
                }
            },
            resolve  : {
                Documents: ["msApi", function (msApi)
                {
                    return msApi.resolve('fileManager.documents@get');
                }]
            },
            bodyClass: 'file-manager'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/apps/file-manager');

        // Api
        msApiProvider.register('fileManager.documents', ['app/data/file-manager/documents.json']);

        // Navigation
        msNavigationServiceProvider.saveItem('apps.file-manager', {
            title : 'File Manager',
            icon  : 'icon-folder',
            state : 'app.file-manager',
            weight: 4
        });
    }

})();
(function ()
{
    'use strict';

    FileManagerController.$inject = ["$mdSidenav", "Documents"];
    angular
        .module('app.file-manager')
        .controller('FileManagerController', FileManagerController);

    /** @ngInject */
    function FileManagerController($mdSidenav, Documents)
    {
        var vm = this;

        // Data
        vm.accounts = {
            'creapond'    : 'johndoe@creapond.com',
            'withinpixels': 'johndoe@withinpixels.com'
        };
        vm.selectedAccount = 'creapond';
        vm.currentView = 'list';
        vm.showDetails = true;

        vm.path = Documents.data.path;
        vm.folders = Documents.data.folders;
        vm.files = Documents.data.files;
        vm.selected = vm.files[0];

        // Methods
        vm.select = select;
        vm.toggleDetails = toggleDetails;
        vm.toggleSidenav = toggleSidenav;
        vm.toggleView = toggleView;

        //////////

        /**
         * Select an item
         *
         * @param item
         */
        function select(item)
        {
            vm.selected = item;
        }

        /**
         * Toggle details
         *
         * @param item
         */
        function toggleDetails(item)
        {
            vm.selected = item;
            toggleSidenav('details-sidenav');
        }

        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }

        /**
         * Toggle view
         */
        function toggleView()
        {
            vm.currentView = vm.currentView === 'list' ? 'grid' : 'list';
        }
    }
})();
(function ()
{
    'use strict';

    CalendarController.$inject = ["$mdDialog", "$document"];
    angular
        .module('app.calendar')
        .controller('CalendarController', CalendarController);

    /** @ngInject */
    function CalendarController($mdDialog, $document)
    {
        var vm = this;

        // Data
        var date = new Date();
        var d = date.getDate();
        var m = date.getMonth();
        var y = date.getFullYear();

        vm.events = [
            [
                {
                    id   : 1,
                    title: 'All Day Event',
                    start: new Date(y, m, 1),
                    end  : null
                },
                {
                    id   : 2,
                    title: 'Long Event',
                    start: new Date(y, m, d - 5),
                    end  : new Date(y, m, d - 2)
                },
                {
                    id   : 3,
                    title: 'Some Event',
                    start: new Date(y, m, d - 3, 16, 0),
                    end  : null
                },
                {
                    id   : 4,
                    title: 'Repeating Event',
                    start: new Date(y, m, d + 4, 16, 0),
                    end  : null
                },
                {
                    id   : 5,
                    title: 'Birthday Party',
                    start: new Date(y, m, d + 1, 19, 0),
                    end  : new Date(y, m, d + 1, 22, 30)
                },
                {
                    id   : 6,
                    title: 'All Day Event',
                    start: new Date(y, m, d + 8, 16, 0),
                    end  : null
                },
                {
                    id   : 7,
                    title: 'Long Event',
                    start: new Date(y, m, d + 12, 16, 0),
                    end  : null
                },
                {
                    id   : 8,
                    title: 'Repeating Event',
                    start: new Date(y, m, d + 14, 2, 0),
                    end  : null
                },
                {
                    id   : 9,
                    title: 'Repeating Event',
                    start: new Date(y, m, d + 14, 4, 0),
                    end  : null
                },
                {
                    id   : 10,
                    title: 'Repeating Event',
                    start: new Date(y, m, d + 14, 2, 0),
                    end  : null
                },
                {
                    id   : 11,
                    title: 'Repeating Event',
                    start: new Date(y, m, d + 14, 4, 0),
                    end  : null
                },
                {
                    id   : 12,
                    title: 'Repeating Event',
                    start: new Date(y, m, d + 14, 2, 0),
                    end  : null
                },
                {
                    id   : 13,
                    title: 'Repeating Event',
                    start: new Date(y, m, d + 14, 4, 0),
                    end  : null
                },
                {
                    id   : 14,
                    title: 'Conference',
                    start: new Date(y, m, d + 17, 4, 0),
                    end  : null
                },
                {
                    id   : 15,
                    title: 'Meeting',
                    start: new Date(y, m, d + 22, 4, 0),
                    end  : new Date(y, m, d + 24, 4, 0)
                }
            ]
        ];

        vm.calendarUiConfig = {
            calendar: {
                editable          : true,
                eventLimit        : true,
                header            : '',
                handleWindowResize: false,
                aspectRatio       : 1,
                dayNames          : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                dayNamesShort     : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                viewRender        : function (view)
                {
                    vm.calendarView = view;
                    vm.calendar = vm.calendarView.calendar;
                    vm.currentMonthShort = vm.calendar.getDate().format('MMM');
                },
                columnFormat      : {
                    month: 'ddd',
                    week : 'ddd D',
                    day  : 'ddd M'
                },
                eventClick        : eventDetail,
                selectable        : true,
                selectHelper      : true,
                select            : select
            }
        };

        // Methods
        vm.addEvent = addEvent;
        vm.next = next;
        vm.prev = prev;

        //////////

        /**
         * Go to next on current view (week, month etc.)
         */
        function next()
        {
            vm.calendarView.calendar.next();
        }

        /**
         * Go to previous on current view (week, month etc.)
         */
        function prev()
        {
            vm.calendarView.calendar.prev();
        }

        /**
         * Show event detail
         *
         * @param calendarEvent
         * @param e
         */
        function eventDetail(calendarEvent, e)
        {
            showEventDetailDialog(calendarEvent, e);
        }

        /**
         * Add new event in between selected dates
         *
         * @param start
         * @param end
         * @param e
         */
        function select(start, end, e)
        {
            showEventFormDialog('add', false, start, end, e);
        }

        /**
         * Add event
         *
         * @param e
         */
        function addEvent(e)
        {
            var start = new Date(),
                end = new Date();

            showEventFormDialog('add', false, start, end, e);
        }

        /**
         * Show event detail dialog
         * @param calendarEvent
         * @param e
         */
        function showEventDetailDialog(calendarEvent, e)
        {
            $mdDialog.show({
                controller         : 'EventDetailDialogController',
                controllerAs       : 'vm',
                templateUrl        : 'app/main/apps/calendar/dialogs/event-detail/event-detail-dialog.html',
                parent             : angular.element($document.body),
                targetEvent        : e,
                clickOutsideToClose: true,
                locals             : {
                    calendarEvent      : calendarEvent,
                    showEventFormDialog: showEventFormDialog,
                    event              : e
                }
            });
        }

        /**
         * Show event add/edit form dialog
         *
         * @param type
         * @param calendarEvent
         * @param start
         * @param end
         * @param e
         */
        function showEventFormDialog(type, calendarEvent, start, end, e)
        {
            var dialogData = {
                type         : type,
                calendarEvent: calendarEvent,
                start        : start,
                end          : end
            };

            $mdDialog.show({
                controller         : 'EventFormDialogController',
                controllerAs       : 'vm',
                templateUrl        : 'app/main/apps/calendar/dialogs/event-form/event-form-dialog.html',
                parent             : angular.element($document.body),
                targetEvent        : e,
                clickOutsideToClose: true,
                locals             : {
                    dialogData: dialogData
                }
            }).then(function (response)
            {
                if ( response.type === 'add' )
                {
                    // Add new
                    vm.events[0].push({
                        id   : vm.events[0].length + 20,
                        title: response.calendarEvent.title,
                        start: response.calendarEvent.start,
                        end  : response.calendarEvent.end
                    });
                }
                else
                {
                    for ( var i = 0; i < vm.events[0].length; i++ )
                    {
                        // Update
                        if ( vm.events[0][i].id === response.calendarEvent.id )
                        {
                            vm.events[0][i] = {
                                title: response.calendarEvent.title,
                                start: response.calendarEvent.start,
                                end  : response.calendarEvent.end
                            };

                            break;
                        }
                    }
                }
            });
        }

    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.core',
            [
                'ngAnimate',
                'ngAria',
                'ngCookies',
                'ngMessages',
                'ngResource',
                'ngSanitize',
                'ngMaterial',
                'angular-chartist',
                'chart.js',
                'datatables',
                'gridshore.c3js.chart',
                'nvd3',
                'pascalprecht.translate',
                'timer',
                'ui.router',
                'uiGmapgoogle-maps',
                'textAngular',
                'ui.sortable',
                'ng-sortable',
                'xeditable',
                'moment-picker'
            ]);
})();
(function ()
{
    'use strict';

    MsWidgetController.$inject = ["$scope", "$element"];
    angular
        .module('app.core')
        .controller('MsWidgetController', MsWidgetController)
        .directive('msWidget', msWidgetDirective)
        .directive('msWidgetFront', msWidgetFrontDirective)
        .directive('msWidgetBack', msWidgetBackDirective);

    /** @ngInject */
    function MsWidgetController($scope, $element)
    {
        var vm = this;

        // Data
        vm.flipped = false;

        // Methods
        vm.flip = flip;

        //////////

        /**
         * Flip the widget
         */
        function flip()
        {
            if ( !isFlippable() )
            {
                return;
            }

            // Toggle flipped status
            vm.flipped = !vm.flipped;

            // Toggle the 'flipped' class
            $element.toggleClass('flipped', vm.flipped);
        }

        /**
         * Check if widget is flippable
         *
         * @returns {boolean}
         */
        function isFlippable()
        {
            return (angular.isDefined($scope.flippable) && $scope.flippable === true);
        }
    }

    /** @ngInject */
    function msWidgetDirective()
    {
        return {
            restrict  : 'E',
            scope     : {
                flippable: '=?'
            },
            controller: 'MsWidgetController',
            transclude: true,
            compile   : function (tElement)
            {
                tElement.addClass('ms-widget');

                return function postLink(scope, iElement, iAttrs, MsWidgetCtrl, transcludeFn)
                {
                    // Custom transclusion
                    transcludeFn(function (clone)
                    {
                        iElement.empty();
                        iElement.append(clone);
                    });

                    //////////
                };
            }
        };
    }

    /** @ngInject */
    function msWidgetFrontDirective()
    {
        return {
            restrict  : 'E',
            require   : '^msWidget',
            transclude: true,
            compile   : function (tElement)
            {
                tElement.addClass('ms-widget-front');

                return function postLink(scope, iElement, iAttrs, MsWidgetCtrl, transcludeFn)
                {
                    // Custom transclusion
                    transcludeFn(function (clone)
                    {
                        iElement.empty();
                        iElement.append(clone);
                    });

                    // Methods
                    scope.flipWidget = MsWidgetCtrl.flip;
                };
            }
        };
    }

    /** @ngInject */
    function msWidgetBackDirective()
    {
        return {
            restrict  : 'E',
            require   : '^msWidget',
            transclude: true,
            compile   : function (tElement)
            {
                tElement.addClass('ms-widget-back');

                return function postLink(scope, iElement, iAttrs, MsWidgetCtrl, transcludeFn)
                {
                    // Custom transclusion
                    transcludeFn(function (clone)
                    {
                        iElement.empty();
                        iElement.append(clone);
                    });

                    // Methods
                    scope.flipWidget = MsWidgetCtrl.flip;
                };
            }
        };
    }

})();
(function ()
{
    'use strict';

    msTimelineItemDirective.$inject = ["$timeout", "$q"];
    angular
        .module('app.core')
        .controller('MsTimelineController', MsTimelineController)
        .directive('msTimeline', msTimelineDirective)
        .directive('msTimelineItem', msTimelineItemDirective);

    /** @ngInject */
    function MsTimelineController()
    {
        var vm = this;

        // Data
        vm.scrollEl = undefined;

        // Methods
        vm.setScrollEl = setScrollEl;
        vm.getScrollEl = getScrollEl;

        //////////

        /**
         * Set scroll element
         *
         * @param scrollEl
         */
        function setScrollEl(scrollEl)
        {
            vm.scrollEl = scrollEl;
        }

        /**
         * Get scroll element
         *
         * @returns {undefined|*}
         */
        function getScrollEl()
        {
            return vm.scrollEl;
        }
    }

    /** @ngInject */
    function msTimelineDirective()
    {
        return {
            scope     : {
                loadMore: '&?msTimelineLoadMore'
            },
            controller: 'MsTimelineController',
            compile   : function (tElement)
            {
                tElement.addClass('ms-timeline');

                return function postLink(scope, iElement, iAttrs, MsTimelineCtrl)
                {
                    // Create an element for triggering the load more action and append it
                    var loadMoreEl = angular.element('<div class="ms-timeline-loader md-accent-bg md-whiteframe-4dp"><span class="spinner animate-rotate"></span></div>');
                    iElement.append(loadMoreEl);

                    // Grab the scrollable element and store it in the controller for general use
                    var scrollEl = angular.element('#content');
                    MsTimelineCtrl.setScrollEl(scrollEl);

                    // Threshold
                    var threshold = 144;

                    // Register onScroll event for the first time
                    registerOnScroll();

                    /**
                     * onScroll Event
                     */
                    function onScroll()
                    {
                        if ( scrollEl.scrollTop() + scrollEl.height() + threshold > loadMoreEl.position().top )
                        {
                            // Show the loader
                            loadMoreEl.addClass('show');

                            // Unregister scroll event to prevent triggering the function over and over again
                            unregisterOnScroll();

                            // Trigger load more event
                            scope.loadMore().then(
                                // Success
                                function ()
                                {
                                    // Hide the loader
                                    loadMoreEl.removeClass('show');

                                    // Register the onScroll event again
                                    registerOnScroll();
                                },

                                // Error
                                function ()
                                {
                                    // Remove the loader completely
                                    loadMoreEl.remove();
                                }
                            );
                        }
                    }

                    /**
                     * onScroll event registerer
                     */
                    function registerOnScroll()
                    {
                        scrollEl.on('scroll', onScroll);
                    }

                    /**
                     * onScroll event unregisterer
                     */
                    function unregisterOnScroll()
                    {
                        scrollEl.off('scroll', onScroll);
                    }

                    // Cleanup
                    scope.$on('$destroy', function ()
                    {
                        unregisterOnScroll();
                    });
                };
            }
        };
    }

    /** @ngInject */
    function msTimelineItemDirective($timeout, $q)
    {
        return {
            scope  : true,
            require: '^msTimeline',
            compile: function (tElement)
            {
                tElement.addClass('ms-timeline-item').addClass('hidden');

                return function postLink(scope, iElement, iAttrs, MsTimelineCtrl)
                {
                    var threshold = 72,
                        itemLoaded = false,
                        itemInViewport = false,
                        scrollEl = MsTimelineCtrl.getScrollEl();

                    //////////

                    init();

                    /**
                     * Initialize
                     */
                    function init()
                    {
                        // Check if the timeline item has ms-card
                        if ( iElement.find('ms-card') )
                        {
                            // If the ms-card template loaded...
                            scope.$on('msCard::cardTemplateLoaded', function (event, args)
                            {
                                var cardEl = angular.element(args[0]);

                                // Test the card to see if there is any image on it
                                testForImage(cardEl).then(function ()
                                {
                                    $timeout(function ()
                                    {
                                        itemLoaded = true;
                                    });
                                });
                            });
                        }
                        else
                        {
                            // Test the element to see if there is any image on it
                            testForImage(iElement).then(function ()
                            {
                                $timeout(function ()
                                {
                                    itemLoaded = true;
                                });
                            });
                        }

                        // Check if the loaded element also in the viewport
                        scrollEl.on('scroll', testForVisibility);

                        // Test for visibility for the first time without waiting for the scroll event
                        testForVisibility();
                    }

                    // Item ready watcher
                    var itemReadyWatcher = scope.$watch(
                        function ()
                        {
                            return itemLoaded && itemInViewport;
                        },
                        function (current, old)
                        {
                            if ( angular.equals(current, old) )
                            {
                                return;
                            }

                            if ( current )
                            {
                                iElement.removeClass('hidden').addClass('animate');

                                // Unbind itemReadyWatcher
                                itemReadyWatcher();
                            }
                        }, true);

                    /**
                     * Test the given element for image
                     *
                     * @param element
                     * @returns promise
                     */
                    function testForImage(element)
                    {
                        var deferred = $q.defer(),
                            imgEl = element.find('img');

                        if ( imgEl.length > 0 )
                        {
                            imgEl.on('load', function ()
                            {
                                deferred.resolve('Image is loaded');
                            });
                        }
                        else
                        {
                            deferred.resolve('No images');
                        }

                        return deferred.promise;
                    }

                    /**
                     * Test the element for visibility
                     */
                    function testForVisibility()
                    {
                        if ( scrollEl.scrollTop() + scrollEl.height() > iElement.position().top + threshold )
                        {
                            $timeout(function ()
                            {
                                itemInViewport = true;
                            });

                            // Unbind the scroll event
                            scrollEl.off('scroll', testForVisibility);
                        }
                    }
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    MsStepperController.$inject = ["$timeout"];
    angular
        .module('app.core')
        .controller('MsStepperController', MsStepperController)
        .directive('msStepper', msStepperDirective)
        .directive('msStepperStep', msStepperStepDirective);

    /** @ngInject */
    function MsStepperController($timeout)
    {
        var vm = this;

        // Data
        vm.mainForm = undefined;

        vm.steps = [];
        vm.currentStep = undefined;
        vm.currentStepNumber = 1;

        // Methods
        vm.registerMainForm = registerMainForm;
        vm.registerStep = registerStep;
        vm.setupSteps = setupSteps;
        vm.resetForm = resetForm;

        vm.setCurrentStep = setCurrentStep;

        vm.gotoStep = gotoStep;
        vm.gotoPreviousStep = gotoPreviousStep;
        vm.gotoNextStep = gotoNextStep;
        vm.gotoFirstStep = gotoFirstStep;
        vm.gotoLastStep = gotoLastStep;

        vm.isFirstStep = isFirstStep;
        vm.isLastStep = isLastStep;

        vm.isStepCurrent = isStepCurrent;
        vm.isStepDisabled = isStepDisabled;
        vm.isStepOptional = isStepOptional;
        vm.isStepValid = isStepValid;
        vm.isStepNumberValid = isStepNumberValid;

        vm.isFormValid = isFormValid;

        //////////

        /**
         * Register the main form
         *
         * @param form
         */
        function registerMainForm(form)
        {
            vm.mainForm = form;
        }

        /**
         * Register a step
         *
         * @param element
         * @param scope
         * @param form
         */
        function registerStep(element, scope, form)
        {
            var step = {
                element   : element,
                scope     : scope,
                form      : form,
                stepNumber: scope.step || (vm.steps.length + 1),
                stepTitle : scope.stepTitle
            };

            // Push the step into steps array
            vm.steps.push(step);

            // Sort steps by stepNumber
            vm.steps.sort(function (a, b)
            {
                return a.stepNumber - b.stepNumber;
            });
        }

        /**
         * Setup steps for the first time
         */
        function setupSteps()
        {
            vm.setCurrentStep(vm.currentStepNumber);
        }

        /**
         * Reset steps and the main form
         */
        function resetForm()
        {
            // Timeout is required here because we need to
            // let form model to reset before setting the
            // statuses
            $timeout(function ()
            {
                // Reset all the steps
                for ( var x = 0; x < vm.steps.length; x++ )
                {
                    vm.steps[x].form.$setPristine();
                    vm.steps[x].form.$setUntouched();
                }

                // Reset the main form
                vm.mainForm.$setPristine();
                vm.mainForm.$setUntouched();

                // Go to first step
                gotoFirstStep();
            })
        }

        /**
         * Set current step
         *
         * @param stepNumber
         */
        function setCurrentStep(stepNumber)
        {
            // If the stepNumber is not a valid step number, bail...
            if ( !isStepNumberValid(stepNumber) )
            {
                return;
            }

            // Update the current step number
            vm.currentStepNumber = stepNumber;

            // Hide all steps
            for ( var i = 0; i < vm.steps.length; i++ )
            {
                vm.steps[i].element.hide();
            }

            // Show the current step
            vm.steps[vm.currentStepNumber - 1].element.show();
        }

        /**
         * Go to a step
         *
         * @param stepNumber
         */
        function gotoStep(stepNumber)
        {
            vm.setCurrentStep(stepNumber);
        }

        /**
         * Go to the previous step
         */
        function gotoPreviousStep()
        {
            vm.setCurrentStep(vm.currentStepNumber - 1);
        }

        /**
         * Go to the next step
         */
        function gotoNextStep()
        {
            vm.setCurrentStep(vm.currentStepNumber + 1);
        }

        /**
         * Go to the first step
         */
        function gotoFirstStep()
        {
            vm.setCurrentStep(1);
        }

        /**
         * Go to the last step
         */
        function gotoLastStep()
        {
            vm.setCurrentStep(vm.steps.length);
        }

        /**
         * Check if the current step is the first step
         *
         * @returns {boolean}
         */
        function isFirstStep()
        {
            return vm.currentStepNumber === 1;
        }

        /**
         * Check if the current step is the last step
         *
         * @returns {boolean}
         */
        function isLastStep()
        {
            return vm.currentStepNumber === vm.steps.length;
        }

        /**
         * Check if the given step is the current one
         *
         * @param stepNumber
         * @returns {null|boolean}
         */
        function isStepCurrent(stepNumber)
        {
            // If the stepNumber is not a valid step number, bail...
            if ( !isStepNumberValid(stepNumber) )
            {
                return null;
            }

            return vm.currentStepNumber === stepNumber;
        }

        /**
         * Check if the given step should be disabled
         *
         * @param stepNumber
         * @returns {null|boolean}
         */
        function isStepDisabled(stepNumber)
        {
            // If the stepNumber is not a valid step number, bail...
            if ( !isStepNumberValid(stepNumber) )
            {
                return null;
            }

            var disabled = false;

            for ( var i = 1; i < stepNumber; i++ )
            {
                if ( !isStepValid(i) )
                {
                    disabled = true;
                    break;
                }
            }

            return disabled;
        }

        /**
         * Check if the given step is optional
         *
         * @param stepNumber
         * @returns {null|boolean}
         */
        function isStepOptional(stepNumber)
        {
            // If the stepNumber is not a valid step number, bail...
            if ( !isStepNumberValid(stepNumber) )
            {
                return null;
            }

            return vm.steps[stepNumber - 1].scope.optionalStep;
        }

        /**
         * Check if the given step is valid
         *
         * @param stepNumber
         * @returns {null|boolean}
         */
        function isStepValid(stepNumber)
        {
            // If the stepNumber is not a valid step number, bail...
            if ( !isStepNumberValid(stepNumber) )
            {
                return null;
            }

            // If the step is optional, always return true
            if ( isStepOptional(stepNumber) )
            {
                return true;
            }

            return vm.steps[stepNumber - 1].form.$valid;
        }

        /**
         * Check if the given step number is a valid step number
         *
         * @param stepNumber
         * @returns {boolean}
         */
        function isStepNumberValid(stepNumber)
        {
            return !(stepNumber < 1 || stepNumber > vm.steps.length);
        }

        /**
         * Check if the entire form is valid
         *
         * @returns {boolean}
         */
        function isFormValid()
        {
            return vm.mainForm.$valid;
        }
    }

    /** @ngInject */
    function msStepperDirective()
    {
        return {
            restrict        : 'A',
            require         : ['form', 'msStepper'],
            priority        : 1001,
            controller      : 'MsStepperController as MsStepper',
            bindToController: {
                model: '=ngModel'
            },
            transclude      : true,
            templateUrl     : 'app/core/directives/ms-stepper/templates/horizontal/horizontal.html',
            compile         : function (tElement)
            {
                tElement.addClass('ms-stepper');

                return function postLink(scope, iElement, iAttrs, ctrls)
                {
                    var FormCtrl = ctrls[0],
                        MsStepperCtrl = ctrls[1];

                    // Register the main form and setup
                    // the steps for the first time
                    MsStepperCtrl.registerMainForm(FormCtrl);
                    MsStepperCtrl.setupSteps();
                };
            }
        }
    }

    /** @ngInject */
    function msStepperStepDirective()
    {
        return {
            restrict: 'E',
            require : ['form', '^msStepper'],
            priority: 1000,
            scope   : {
                step        : '=?',
                stepTitle   : '=?',
                optionalStep: '=?'
            },
            compile : function (tElement)
            {
                tElement.addClass('ms-stepper-step');

                return function postLink(scope, iElement, iAttrs, ctrls)
                {
                    var FormCtrl = ctrls[0],
                        MsStepperCtrl = ctrls[1];

                    // Is it an optional step?
                    scope.optionalStep = angular.isDefined(iAttrs.optionalStep);

                    // Register the step
                    MsStepperCtrl.registerStep(iElement, scope, FormCtrl);

                    // Hide the step by default
                    iElement.hide();
                };
            }
        }
    }
})();
(function ()
{
    'use strict';

    msSplashScreenDirective.$inject = ["$animate"];
    angular
        .module('app.core')
        .directive('msSplashScreen', msSplashScreenDirective);

    /** @ngInject */
    function msSplashScreenDirective($animate)
    {
        return {
            restrict: 'E',
            link    : function (scope, iElement)
            {
                var splashScreenRemoveEvent = scope.$on('msSplashScreen::remove', function ()
                {
                    $animate.leave(iElement).then(function ()
                    {
                        // De-register scope event
                        splashScreenRemoveEvent();

                        // Null-ify everything else
                        scope = iElement = null;
                    });
                });
            }
        };
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .directive('msSidenavHelper', msSidenavHelperDirective);

    /** @ngInject */
    function msSidenavHelperDirective()
    {
        return {
            restrict: 'A',
            require : '^mdSidenav',
            link    : function (scope, iElement, iAttrs, MdSidenavCtrl)
            {
                // Watch md-sidenav open & locked open statuses
                // and add class to the ".page-layout" if only
                // the sidenav open and NOT locked open
                scope.$watch(function ()
                {
                    return MdSidenavCtrl.isOpen() && !MdSidenavCtrl.isLockedOpen();
                }, function (current)
                {
                    if ( angular.isUndefined(current) )
                    {
                        return;
                    }

                    iElement.parent().toggleClass('full-height', current);
                    angular.element('html').toggleClass('sidenav-open', current);
                });
            }
        };
    }
})();
(function ()
{
    'use strict';

    msSearchBarDirective.$inject = ["$document"];
    angular
        .module('app.core')
        .directive('msSearchBar', msSearchBarDirective);

    /** @ngInject */
    function msSearchBarDirective($document)
    {
        return {
            restrict   : 'E',
            scope      : true,
            templateUrl: 'app/core/directives/ms-search-bar/ms-search-bar.html',
            compile    : function (tElement)
            {
                // Add class
                tElement.addClass('ms-search-bar');

                return function postLink(scope, iElement)
                {
                    var expanderEl,
                        collapserEl;

                    // Initialize
                    init();

                    function init()
                    {
                        expanderEl = iElement.find('#ms-search-bar-expander');
                        collapserEl = iElement.find('#ms-search-bar-collapser');

                        expanderEl.on('click', expand);
                        collapserEl.on('click', collapse);
                    }

                    /**
                     * Expand
                     */
                    function expand()
                    {
                        iElement.addClass('expanded');

                        // Esc key event
                        $document.on('keyup', escKeyEvent);
                    }

                    /**
                     * Collapse
                     */
                    function collapse()
                    {
                        iElement.removeClass('expanded');
                    }

                    /**
                     * Escape key event
                     *
                     * @param e
                     */
                    function escKeyEvent(e)
                    {
                        if ( e.keyCode === 27 )
                        {
                            collapse();
                            $document.off('keyup', escKeyEvent);
                        }
                    }
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    msScrollDirective.$inject = ["$timeout", "msScrollConfig", "msUtils", "fuseConfig"];
    angular
        .module('app.core')
        .provider('msScrollConfig', msScrollConfigProvider)
        .directive('msScroll', msScrollDirective);

    /** @ngInject */
    function msScrollConfigProvider()
    {
        // Default configuration
        var defaultConfiguration = {
            wheelSpeed            : 1,
            wheelPropagation      : false,
            swipePropagation      : true,
            minScrollbarLength    : null,
            maxScrollbarLength    : null,
            useBothWheelAxes      : false,
            useKeyboard           : true,
            suppressScrollX       : false,
            suppressScrollY       : false,
            scrollXMarginOffset   : 0,
            scrollYMarginOffset   : 0,
            stopPropagationOnClick: true
        };

        // Methods
        this.config = config;

        //////////

        /**
         * Extend default configuration with the given one
         *
         * @param configuration
         */
        function config(configuration)
        {
            defaultConfiguration = angular.extend({}, defaultConfiguration, configuration);
        }

        /**
         * Service
         */
        this.$get = function ()
        {
            var service = {
                getConfig: getConfig
            };

            return service;

            //////////

            /**
             * Return the config
             */
            function getConfig()
            {
                return defaultConfiguration;
            }
        };
    }

    /** @ngInject */
    function msScrollDirective($timeout, msScrollConfig, msUtils, fuseConfig)
    {
        return {
            restrict: 'AE',
            compile : function (tElement)
            {
                // Do not replace scrollbars if
                // 'disableCustomScrollbars' config enabled
                if ( fuseConfig.getConfig('disableCustomScrollbars') )
                {
                    return;
                }

                // Do not replace scrollbars on mobile devices
                // if 'disableCustomScrollbarsOnMobile' config enabled
                if ( fuseConfig.getConfig('disableCustomScrollbarsOnMobile') && msUtils.isMobile() )
                {
                    return;
                }

                // Add class
                tElement.addClass('ms-scroll');

                return function postLink(scope, iElement, iAttrs)
                {
                    var options = {};

                    // If options supplied, evaluate the given
                    // value. This is because we don't want to
                    // have an isolated scope but still be able
                    // to use scope variables.
                    // We don't want an isolated scope because
                    // we should be able to use this everywhere
                    // especially with other directives
                    if ( iAttrs.msScroll )
                    {
                        options = scope.$eval(iAttrs.msScroll);
                    }

                    // Extend the given config with the ones from provider
                    options = angular.extend({}, msScrollConfig.getConfig(), options);

                    // Initialize the scrollbar
                    $timeout(function ()
                    {
                        PerfectScrollbar.initialize(iElement[0], options);
                    }, 0);

                    // Update the scrollbar on element mouseenter
                    iElement.on('mouseenter', updateScrollbar);

                    // Watch scrollHeight and update
                    // the scrollbar if it changes
                    scope.$watch(function ()
                    {
                        return iElement.prop('scrollHeight');
                    }, function (current, old)
                    {
                        if ( angular.isUndefined(current) || angular.equals(current, old) )
                        {
                            return;
                        }

                        updateScrollbar();
                    });

                    // Watch scrollWidth and update
                    // the scrollbar if it changes
                    scope.$watch(function ()
                    {
                        return iElement.prop('scrollWidth');
                    }, function (current, old)
                    {
                        if ( angular.isUndefined(current) || angular.equals(current, old) )
                        {
                            return;
                        }

                        updateScrollbar();
                    });

                    /**
                     * Update the scrollbar
                     */
                    function updateScrollbar()
                    {
                        PerfectScrollbar.update(iElement[0]);
                    }

                    // Cleanup on destroy
                    scope.$on('$destroy', function ()
                    {
                        iElement.off('mouseenter');
                        PerfectScrollbar.destroy(iElement[0]);
                    });
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .directive('msResponsiveTable', msResponsiveTableDirective);

    /** @ngInject */
    function msResponsiveTableDirective()
    {
        return {
            restrict: 'A',
            link    : function (scope, iElement)
            {
                // Wrap the table
                var wrapper = angular.element('<div class="ms-responsive-table-wrapper"></div>');
                iElement.after(wrapper);
                wrapper.append(iElement);

                //////////
            }
        };
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .directive('msRandomClass', msRandomClassDirective);

    /** @ngInject */
    function msRandomClassDirective()
    {
        return {
            restrict: 'A',
            scope   : {
                msRandomClass: '='
            },
            link    : function (scope, iElement)
            {
                var randomClass = scope.msRandomClass[Math.floor(Math.random() * (scope.msRandomClass.length))];
                iElement.addClass(randomClass);
            }
        };
    }
})();
(function ()
{
    'use strict';

    MsNavigationController.$inject = ["$scope", "msNavigationService"];
    msNavigationDirective.$inject = ["$rootScope", "$timeout", "$mdSidenav", "msNavigationService"];
    MsNavigationNodeController.$inject = ["$scope", "$element", "$rootScope", "$animate", "$state", "msNavigationService"];
    msNavigationHorizontalDirective.$inject = ["msNavigationService"];
    MsNavigationHorizontalNodeController.$inject = ["$scope", "$element", "$rootScope", "$state", "msNavigationService"];
    msNavigationHorizontalItemDirective.$inject = ["$mdMedia"];
    angular
        .module('app.core')
        .provider('msNavigationService', msNavigationServiceProvider)
        .controller('MsNavigationController', MsNavigationController)
        // Vertical
        .directive('msNavigation', msNavigationDirective)
        .controller('MsNavigationNodeController', MsNavigationNodeController)
        .directive('msNavigationNode', msNavigationNodeDirective)
        .directive('msNavigationItem', msNavigationItemDirective)
        //Horizontal
        .directive('msNavigationHorizontal', msNavigationHorizontalDirective)
        .controller('MsNavigationHorizontalNodeController', MsNavigationHorizontalNodeController)
        .directive('msNavigationHorizontalNode', msNavigationHorizontalNodeDirective)
        .directive('msNavigationHorizontalItem', msNavigationHorizontalItemDirective);

    /** @ngInject */
    function msNavigationServiceProvider()
    {
        // Inject $log service
        var $log = angular.injector(['ng']).get('$log');

        // Navigation array
        var navigation = [];

        var service = this;

        // Methods
        service.saveItem = saveItem;
        service.deleteItem = deleteItem;
        service.sortByWeight = sortByWeight;

        //////////

        /**
         * Create or update the navigation item
         *
         * @param path
         * @param item
         */
        function saveItem(path, item)
        {
            if ( !angular.isString(path) )
            {
                $log.error('path must be a string (eg. `dashboard.project`)');
                return;
            }

            var parts = path.split('.');

            // Generate the object id from the parts
            var id = parts[parts.length - 1];

            // Get the parent item from the parts
            var parent = _findOrCreateParent(parts);

            // Decide if we are going to update or create
            var updateItem = false;

            for ( var i = 0; i < parent.length; i++ )
            {
                if ( parent[i]._id === id )
                {
                    updateItem = parent[i];

                    break;
                }
            }

            // Update
            if ( updateItem )
            {
                angular.extend(updateItem, item);

                // Add proper ui-sref
                updateItem.uisref = _getUiSref(updateItem);
            }
            // Create
            else
            {
                // Create an empty children array in the item
                item.children = [];

                // Add the default weight if not provided or if it's not a number
                if ( angular.isUndefined(item.weight) || !angular.isNumber(item.weight) )
                {
                    item.weight = 1;
                }

                // Add the item id
                item._id = id;

                // Add the item path
                item._path = path;

                // Add proper ui-sref
                item.uisref = _getUiSref(item);

                // Push the item into the array
                parent.push(item);
            }
        }

        /**
         * Delete navigation item
         *
         * @param path
         */
        function deleteItem(path)
        {
            if ( !angular.isString(path) )
            {
                $log.error('path must be a string (eg. `dashboard.project`)');
                return;
            }

            // Locate the item by using given path
            var item = navigation,
                parts = path.split('.');

            for ( var p = 0; p < parts.length; p++ )
            {
                var id = parts[p];

                for ( var i = 0; i < item.length; i++ )
                {
                    if ( item[i]._id === id )
                    {
                        // If we have a matching path,
                        // we have found our object:
                        // remove it.
                        if ( item[i]._path === path )
                        {
                            item.splice(i, 1);
                            return true;
                        }

                        // Otherwise grab the children of
                        // the current item and continue
                        item = item[i].children;
                        break;
                    }
                }
            }

            return false;
        }

        /**
         * Sort the navigation items by their weights
         *
         * @param parent
         */
        function sortByWeight(parent)
        {
            // If parent not provided, sort the root items
            if ( !parent )
            {
                parent = navigation;
                parent.sort(_byWeight);
            }

            // Sort the children
            for ( var i = 0; i < parent.length; i++ )
            {
                var children = parent[i].children;

                if ( children.length > 1 )
                {
                    children.sort(_byWeight);
                }

                if ( children.length > 0 )
                {
                    sortByWeight(children);
                }
            }
        }

        /* ----------------- */
        /* Private Functions */
        /* ----------------- */

        /**
         * Find or create parent
         *
         * @param parts
         * @returns {Array|Boolean}
         * @private
         */
        function _findOrCreateParent(parts)
        {
            // Store the main navigation
            var parent = navigation;

            // If it's going to be a root item
            // return the navigation itself
            if ( parts.length === 1 )
            {
                return parent;
            }

            // Remove the last element from the parts as
            // we don't need that to figure out the parent
            parts.pop();

            // Find and return the parent
            for ( var i = 0; i < parts.length; i++ )
            {
                var _id = parts[i],
                    createParent = true;

                for ( var p = 0; p < parent.length; p++ )
                {
                    if ( parent[p]._id === _id )
                    {
                        parent = parent[p].children;
                        createParent = false;

                        break;
                    }
                }

                // If there is no parent found, create one, push
                // it into the current parent and assign it as a
                // new parent
                if ( createParent )
                {
                    var item = {
                        _id     : _id,
                        _path   : parts.join('.'),
                        title   : _id,
                        weight  : 1,
                        children: []
                    };

                    parent.push(item);
                    parent = item.children;
                }
            }

            return parent;
        }

        /**
         * Sort by weight
         *
         * @param x
         * @param y
         * @returns {number}
         * @private
         */
        function _byWeight(x, y)
        {
            return parseInt(x.weight) - parseInt(y.weight);
        }

        /**
         * Setup the ui-sref using state & state parameters
         *
         * @param item
         * @returns {string}
         * @private
         */
        function _getUiSref(item)
        {
            var uisref = '';

            if ( angular.isDefined(item.state) )
            {
                uisref = item.state;

                if ( angular.isDefined(item.stateParams) && angular.isObject(item.stateParams) )
                {
                    uisref = uisref + '(' + angular.toJson(item.stateParams) + ')';
                }
            }

            return uisref;
        }

        /* ----------------- */
        /* Service           */
        /* ----------------- */

        this.$get = function ()
        {
            var activeItem = null,
                navigationScope = null,
                folded = null,
                foldedOpen = null;

            var service = {
                saveItem           : saveItem,
                deleteItem         : deleteItem,
                sort               : sortByWeight,
                clearNavigation    : clearNavigation,
                setActiveItem      : setActiveItem,
                getActiveItem      : getActiveItem,
                getNavigationObject: getNavigationObject,
                setNavigationScope : setNavigationScope,
                setFolded          : setFolded,
                getFolded          : getFolded,
                setFoldedOpen      : setFoldedOpen,
                getFoldedOpen      : getFoldedOpen,
                toggleFolded       : toggleFolded
            };

            return service;

            //////////

            /**
             * Clear the entire navigation
             */
            function clearNavigation()
            {
                // Clear the navigation array
                navigation = [];

                // Clear the vm.navigation from main controller
                if ( navigationScope )
                {
                    navigationScope.vm.navigation = [];
                }
            }

            /**
             * Set active item
             *
             * @param node
             * @param scope
             */
            function setActiveItem(node, scope)
            {
                activeItem = {
                    node : node,
                    scope: scope
                };
            }

            /**
             * Return active item
             */
            function getActiveItem()
            {
                return activeItem;
            }

            /**
             * Return navigation object
             *
             * @param root
             * @returns {Array}
             */
            function getNavigationObject(root)
            {
                if ( root )
                {
                    for ( var i = 0; i < navigation.length; i++ )
                    {
                        if ( navigation[i]._id === root )
                        {
                            return [navigation[i]];
                        }
                    }
                }

                return navigation;
            }

            /**
             * Store navigation's scope for later use
             *
             * @param scope
             */
            function setNavigationScope(scope)
            {
                navigationScope = scope;
            }

            /**
             * Set folded status
             *
             * @param status
             */
            function setFolded(status)
            {
                folded = status;
            }

            /**
             * Return folded status
             *
             * @returns {*}
             */
            function getFolded()
            {
                return folded;
            }

            /**
             * Set folded open status
             *
             * @param status
             */
            function setFoldedOpen(status)
            {
                foldedOpen = status;
            }

            /**
             * Return folded open status
             *
             * @returns {*}
             */
            function getFoldedOpen()
            {
                return foldedOpen;
            }


            /**
             * Toggle fold on stored navigation's scope
             */
            function toggleFolded()
            {
                navigationScope.toggleFolded();
            }
        };
    }

    /** @ngInject */
    function MsNavigationController($scope, msNavigationService)
    {
        var vm = this;

        // Data
        if ( $scope.root )
        {
            vm.navigation = msNavigationService.getNavigationObject($scope.root);
        }
        else
        {
            vm.navigation = msNavigationService.getNavigationObject();
        }

        // Methods
        vm.toggleHorizontalMobileMenu = toggleHorizontalMobileMenu;

        //////////

        init();

        /**
         * Initialize
         */
        function init()
        {
            // Sort the navigation before doing anything else
            msNavigationService.sort();
        }

        /**
         * Toggle horizontal mobile menu
         */
        function toggleHorizontalMobileMenu()
        {
            angular.element('body').toggleClass('ms-navigation-horizontal-mobile-menu-active');
        }
    }

    /** @ngInject */
    function msNavigationDirective($rootScope, $timeout, $mdSidenav, msNavigationService)
    {
        return {
            restrict   : 'E',
            scope      : {
                folded: '=',
                root  : '@'
            },
            controller : 'MsNavigationController as vm',
            templateUrl: 'app/core/directives/ms-navigation/templates/vertical.html',
            transclude : true,
            compile    : function (tElement)
            {
                tElement.addClass('ms-navigation');

                return function postLink(scope, iElement)
                {
                    var bodyEl = angular.element('body'),
                        foldExpanderEl = angular.element('<div id="ms-navigation-fold-expander"></div>'),
                        foldCollapserEl = angular.element('<div id="ms-navigation-fold-collapser"></div>'),
                        sidenav = $mdSidenav('navigation');

                    // Store the navigation in the service for public access
                    msNavigationService.setNavigationScope(scope);

                    // Initialize
                    init();

                    /**
                     * Initialize
                     */
                    function init()
                    {
                        // Set the folded status for the first time.
                        // First, we have to check if we have a folded
                        // status available in the service already. This
                        // will prevent navigation to act weird if we already
                        // set the fold status, remove the navigation and
                        // then re-initialize it, which happens if we
                        // change to a view without a navigation and then
                        // come back with history.back() function.

                        // If the service didn't initialize before, set
                        // the folded status from scope, otherwise we
                        // won't touch anything because the folded status
                        // already set in the service...
                        if ( msNavigationService.getFolded() === null )
                        {
                            msNavigationService.setFolded(scope.folded);
                        }

                        if ( msNavigationService.getFolded() )
                        {
                            // Collapse everything.
                            // This must be inside a $timeout because by the
                            // time we call this, the 'msNavigation::collapse'
                            // event listener is not registered yet. $timeout
                            // will ensure that it will be called after it is
                            // registered.
                            $timeout(function ()
                            {
                                $rootScope.$broadcast('msNavigation::collapse');
                            });

                            // Add class to the body
                            bodyEl.addClass('ms-navigation-folded');

                            // Set fold expander
                            setFoldExpander();
                        }
                    }

                    // Sidenav locked open status watcher
                    scope.$watch(function ()
                    {
                        return sidenav.isLockedOpen();
                    }, function (current, old)
                    {
                        if ( angular.isUndefined(current) || angular.equals(current, old) )
                        {
                            return;
                        }

                        var folded = msNavigationService.getFolded();

                        if ( folded )
                        {
                            if ( current )
                            {
                                // Collapse everything
                                $rootScope.$broadcast('msNavigation::collapse');
                            }
                            else
                            {
                                // Expand the active one and its parents
                                var activeItem = msNavigationService.getActiveItem();
                                if ( activeItem )
                                {
                                    activeItem.scope.$emit('msNavigation::stateMatched');
                                }
                            }
                        }
                    });

                    // Folded status watcher
                    scope.$watch('folded', function (current, old)
                    {
                        if ( angular.isUndefined(current) || angular.equals(current, old) )
                        {
                            return;
                        }

                        setFolded(current);
                    });

                    /**
                     * Set folded status
                     *
                     * @param folded
                     */
                    function setFolded(folded)
                    {
                        // Store folded status on the service for global access
                        msNavigationService.setFolded(folded);

                        if ( folded )
                        {
                            // Collapse everything
                            $rootScope.$broadcast('msNavigation::collapse');

                            // Add class to the body
                            bodyEl.addClass('ms-navigation-folded');

                            // Set fold expander
                            setFoldExpander();
                        }
                        else
                        {
                            // Expand the active one and its parents
                            var activeItem = msNavigationService.getActiveItem();
                            if ( activeItem )
                            {
                                activeItem.scope.$emit('msNavigation::stateMatched');
                            }

                            // Remove body class
                            bodyEl.removeClass('ms-navigation-folded ms-navigation-folded-open');

                            // Remove fold collapser
                            removeFoldCollapser();
                        }
                    }

                    /**
                     * Set fold expander
                     */
                    function setFoldExpander()
                    {
                        iElement.parent().append(foldExpanderEl);

                        // Let everything settle for a moment
                        // before registering the event listener
                        $timeout(function ()
                        {
                            foldExpanderEl.on('mouseenter touchstart', onFoldExpanderHover);
                        });
                    }

                    /**
                     * Set fold collapser
                     */
                    function setFoldCollapser()
                    {
                        bodyEl.find('#main').append(foldCollapserEl);
                        foldCollapserEl.on('mouseenter touchstart', onFoldCollapserHover);
                    }

                    /**
                     * Remove fold collapser
                     */
                    function removeFoldCollapser()
                    {
                        foldCollapserEl.remove();
                    }

                    /**
                     * onHover event of foldExpander
                     */
                    function onFoldExpanderHover(event)
                    {
                        if ( event )
                        {
                            event.preventDefault();
                        }

                        // Set folded open status
                        msNavigationService.setFoldedOpen(true);

                        // Expand the active one and its parents
                        var activeItem = msNavigationService.getActiveItem();
                        if ( activeItem )
                        {
                            activeItem.scope.$emit('msNavigation::stateMatched');
                        }

                        // Add class to the body
                        bodyEl.addClass('ms-navigation-folded-open');

                        // Remove the fold opener
                        foldExpanderEl.remove();

                        // Set fold collapser
                        setFoldCollapser();
                    }

                    /**
                     * onHover event of foldCollapser
                     */
                    function onFoldCollapserHover(event)
                    {
                        if ( event )
                        {
                            event.preventDefault();
                        }

                        // Set folded open status
                        msNavigationService.setFoldedOpen(false);

                        // Collapse everything
                        $rootScope.$broadcast('msNavigation::collapse');

                        // Remove body class
                        bodyEl.removeClass('ms-navigation-folded-open');

                        // Remove the fold collapser
                        foldCollapserEl.remove();

                        // Set fold expander
                        setFoldExpander();
                    }

                    /**
                     * Public access for toggling folded status externally
                     */
                    scope.toggleFolded = function ()
                    {
                        var folded = msNavigationService.getFolded();

                        setFolded(!folded);
                    };

                    /**
                     * On $stateChangeStart
                     */
                    scope.$on('$stateChangeStart', function ()
                    {
                        // Close the sidenav
                        sidenav.close();

                        // If navigation is folded open, close it
                        if ( msNavigationService.getFolded() )
                        {
                            onFoldCollapserHover();
                        }
                    });

                    // Cleanup
                    scope.$on('$destroy', function ()
                    {
                        foldCollapserEl.off('mouseenter touchstart');
                        foldExpanderEl.off('mouseenter touchstart');
                    });
                };
            }
        };
    }

    /** @ngInject */
    function MsNavigationNodeController($scope, $element, $rootScope, $animate, $state, msNavigationService)
    {
        var vm = this;

        // Data
        vm.element = $element;
        vm.node = $scope.node;
        vm.hasChildren = undefined;
        vm.collapsed = undefined;
        vm.collapsable = undefined;
        vm.group = undefined;
        vm.animateHeightClass = 'animate-height';

        // Methods
        vm.toggleCollapsed = toggleCollapsed;
        vm.collapse = collapse;
        vm.expand = expand;
        vm.getClass = getClass;
        vm.isHidden = isHidden;

        //////////

        init();

        /**
         * Initialize
         */
        function init()
        {
            // Setup the initial values

            // Has children?
            vm.hasChildren = vm.node.children.length > 0;

            // Is group?
            vm.group = !!(angular.isDefined(vm.node.group) && vm.node.group === true);

            // Is collapsable?
            if ( !vm.hasChildren || vm.group )
            {
                vm.collapsable = false;
            }
            else
            {
                vm.collapsable = !!(angular.isUndefined(vm.node.collapsable) || typeof vm.node.collapsable !== 'boolean' || vm.node.collapsable === true);
            }

            // Is collapsed?
            if ( !vm.collapsable )
            {
                vm.collapsed = false;
            }
            else
            {
                vm.collapsed = !!(angular.isUndefined(vm.node.collapsed) || typeof vm.node.collapsed !== 'boolean' || vm.node.collapsed === true);
            }

            // Expand all parents if we have a matching state or
            // the current state is a child of the node's state
            if ( vm.node.state === $state.current.name || $state.includes(vm.node.state) )
            {
                // If state params are defined, make sure they are
                // equal, otherwise do not set the active item
                if ( angular.isDefined(vm.node.stateParams) && angular.isDefined($state.params) && !angular.equals(vm.node.stateParams, $state.params) )
                {
                    return;
                }

                $scope.$emit('msNavigation::stateMatched');

                // Also store the current active menu item
                msNavigationService.setActiveItem(vm.node, $scope);
            }

            $scope.$on('msNavigation::stateMatched', function ()
            {
                // Expand if the current scope is collapsable and is collapsed
                if ( vm.collapsable && vm.collapsed )
                {
                    $scope.$evalAsync(function ()
                    {
                        vm.collapsed = false;
                    });
                }
            });

            // Listen for collapse event
            $scope.$on('msNavigation::collapse', function (event, path)
            {
                if ( vm.collapsed || !vm.collapsable )
                {
                    return;
                }

                // If there is no path defined, collapse
                if ( angular.isUndefined(path) )
                {
                    vm.collapse();
                }
                // If there is a path defined, do not collapse
                // the items that are inside that path. This will
                // prevent parent items from collapsing
                else
                {
                    var givenPathParts = path.split('.'),
                        activePathParts = [];

                    var activeItem = msNavigationService.getActiveItem();
                    if ( activeItem )
                    {
                        activePathParts = activeItem.node._path.split('.');
                    }

                    // Test for given path
                    if ( givenPathParts.indexOf(vm.node._id) > -1 )
                    {
                        return;
                    }

                    // Test for active path
                    if ( activePathParts.indexOf(vm.node._id) > -1 )
                    {
                        return;
                    }

                    vm.collapse();
                }
            });

            // Listen for $stateChangeSuccess event
            $scope.$on('$stateChangeSuccess', function ()
            {
                if ( vm.node.state === $state.current.name )
                {
                    // If state params are defined, make sure they are
                    // equal, otherwise do not set the active item
                    if ( angular.isDefined(vm.node.stateParams) && angular.isDefined($state.params) && !angular.equals(vm.node.stateParams, $state.params) )
                    {
                        return;
                    }

                    // Update active item on state change
                    msNavigationService.setActiveItem(vm.node, $scope);

                    // Collapse everything except the one we're using
                    $rootScope.$broadcast('msNavigation::collapse', vm.node._path);
                }
            });
        }

        /**
         * Toggle collapsed
         */
        function toggleCollapsed()
        {
            if ( vm.collapsed )
            {
                vm.expand();
            }
            else
            {
                vm.collapse();
            }
        }

        /**
         * Collapse
         */
        function collapse()
        {
            // Grab the element that we are going to collapse
            var collapseEl = vm.element.children('ul');

            // Grab the height
            var height = collapseEl[0].offsetHeight;

            $scope.$evalAsync(function ()
            {
                // Set collapsed status
                vm.collapsed = true;

                // Add collapsing class to the node
                vm.element.addClass('collapsing');

                // Animate the height
                $animate.animate(collapseEl,
                    {
                        'display': 'block',
                        'height' : height + 'px'
                    },
                    {
                        'height': '0px'
                    },
                    vm.animateHeightClass
                ).then(
                    function ()
                    {
                        // Clear the inline styles after animation done
                        collapseEl.css({
                            'display': '',
                            'height' : ''
                        });

                        // Clear collapsing class from the node
                        vm.element.removeClass('collapsing');
                    }
                );

                // Broadcast the collapse event so child items can also be collapsed
                $scope.$broadcast('msNavigation::collapse');
            });
        }

        /**
         * Expand
         */
        function expand()
        {
            // Grab the element that we are going to expand
            var expandEl = vm.element.children('ul');

            // Move the element out of the dom flow and
            // make it block so we can get its height
            expandEl.css({
                'position'  : 'absolute',
                'visibility': 'hidden',
                'display'   : 'block',
                'height'    : 'auto'
            });

            // Grab the height
            var height = expandEl[0].offsetHeight;

            // Reset the style modifications
            expandEl.css({
                'position'  : '',
                'visibility': '',
                'display'   : '',
                'height'    : ''
            });

            $scope.$evalAsync(function ()
            {
                // Set collapsed status
                vm.collapsed = false;

                // Add expanding class to the node
                vm.element.addClass('expanding');

                // Animate the height
                $animate.animate(expandEl,
                    {
                        'display': 'block',
                        'height' : '0px'
                    },
                    {
                        'height': height + 'px'
                    },
                    vm.animateHeightClass
                ).then(
                    function ()
                    {
                        // Clear the inline styles after animation done
                        expandEl.css({
                            'height': ''
                        });

                        // Clear expanding class from the node
                        vm.element.removeClass('expanding');
                    }
                );

                // If item expanded, broadcast the collapse event from rootScope so that the other expanded items
                // can be collapsed. This is necessary for keeping only one parent expanded at any time
                $rootScope.$broadcast('msNavigation::collapse', vm.node._path);
            });
        }

        /**
         * Return the class
         *
         * @returns {*}
         */
        function getClass()
        {
            return vm.node.class;
        }

        /**
         * Check if node should be hidden
         *
         * @returns {boolean}
         */
        function isHidden()
        {
            if ( angular.isDefined(vm.node.hidden) && angular.isFunction(vm.node.hidden) )
            {
                return vm.node.hidden();
            }

            return false;
        }
    }

    /** @ngInject */
    function msNavigationNodeDirective()
    {
        return {
            restrict        : 'A',
            bindToController: {
                node: '=msNavigationNode'
            },
            controller      : 'MsNavigationNodeController as vm',
            compile         : function (tElement)
            {
                tElement.addClass('ms-navigation-node');

                return function postLink(scope, iElement, iAttrs, MsNavigationNodeCtrl)
                {
                    // Add custom classes
                    iElement.addClass(MsNavigationNodeCtrl.getClass());

                    // Add group class if it's a group
                    if ( MsNavigationNodeCtrl.group )
                    {
                        iElement.addClass('group');
                    }
                };
            }
        };
    }

    /** @ngInject */
    function msNavigationItemDirective()
    {
        return {
            restrict: 'A',
            require : '^msNavigationNode',
            compile : function (tElement)
            {
                tElement.addClass('ms-navigation-item');

                return function postLink(scope, iElement, iAttrs, MsNavigationNodeCtrl)
                {
                    // If the item is collapsable...
                    if ( MsNavigationNodeCtrl.collapsable )
                    {
                        iElement.on('click', MsNavigationNodeCtrl.toggleCollapsed);
                    }

                    // Cleanup
                    scope.$on('$destroy', function ()
                    {
                        iElement.off('click');
                    });
                };
            }
        };
    }

    /** @ngInject */
    function msNavigationHorizontalDirective(msNavigationService)
    {
        return {
            restrict   : 'E',
            scope      : {
                root: '@'
            },
            controller : 'MsNavigationController as vm',
            templateUrl: 'app/core/directives/ms-navigation/templates/horizontal.html',
            transclude : true,
            compile    : function (tElement)
            {
                tElement.addClass('ms-navigation-horizontal');

                return function postLink(scope)
                {
                    // Store the navigation in the service for public access
                    msNavigationService.setNavigationScope(scope);
                };
            }
        };
    }

    /** @ngInject */
    function MsNavigationHorizontalNodeController($scope, $element, $rootScope, $state, msNavigationService)
    {
        var vm = this;

        // Data
        vm.element = $element;
        vm.node = $scope.node;
        vm.hasChildren = undefined;
        vm.group = undefined;

        // Methods
        vm.getClass = getClass;

        //////////

        init();

        /**
         * Initialize
         */
        function init()
        {
            // Setup the initial values

            // Is active
            vm.isActive = false;

            // Has children?
            vm.hasChildren = vm.node.children.length > 0;

            // Is group?
            vm.group = !!(angular.isDefined(vm.node.group) && vm.node.group === true);

            // Mark all parents as active if we have a matching state
            // or the current state is a child of the node's state
            if ( vm.node.state === $state.current.name || $state.includes(vm.node.state) )
            {
                // If state params are defined, make sure they are
                // equal, otherwise do not set the active item
                if ( angular.isDefined(vm.node.stateParams) && angular.isDefined($state.params) && !angular.equals(vm.node.stateParams, $state.params) )
                {
                    return;
                }

                $scope.$emit('msNavigation::stateMatched');

                // Also store the current active menu item
                msNavigationService.setActiveItem(vm.node, $scope);
            }

            $scope.$on('msNavigation::stateMatched', function ()
            {
                // Mark as active if has children
                if ( vm.hasChildren )
                {
                    $scope.$evalAsync(function ()
                    {
                        vm.isActive = true;
                    });
                }
            });

            // Listen for clearActive event
            $scope.$on('msNavigation::clearActive', function ()
            {
                if ( !vm.hasChildren )
                {
                    return;
                }

                var activePathParts = [];

                var activeItem = msNavigationService.getActiveItem();
                if ( activeItem )
                {
                    activePathParts = activeItem.node._path.split('.');
                }

                // Test for active path
                if ( activePathParts.indexOf(vm.node._id) > -1 )
                {
                    $scope.$evalAsync(function ()
                    {
                        vm.isActive = true;
                    });
                }
                else
                {
                    $scope.$evalAsync(function ()
                    {
                        vm.isActive = false;
                    });
                }

            });

            // Listen for $stateChangeSuccess event
            $scope.$on('$stateChangeSuccess', function ()
            {
                if ( vm.node.state === $state.current.name )
                {
                    // If state params are defined, make sure they are
                    // equal, otherwise do not set the active item
                    if ( angular.isDefined(vm.node.stateParams) && angular.isDefined($state.params) && !angular.equals(vm.node.stateParams, $state.params) )
                    {
                        return;
                    }

                    // Update active item on state change
                    msNavigationService.setActiveItem(vm.node, $scope);

                    // Clear all active states everything except the one we're using
                    $rootScope.$broadcast('msNavigation::clearActive');
                }
            });
        }

        /**
         * Return the class
         *
         * @returns {*}
         */
        function getClass()
        {
            return vm.node.class;
        }
    }

    /** @ngInject */
    function msNavigationHorizontalNodeDirective()
    {
        return {
            restrict        : 'A',
            bindToController: {
                node: '=msNavigationHorizontalNode'
            },
            controller      : 'MsNavigationHorizontalNodeController as vm',
            compile         : function (tElement)
            {
                tElement.addClass('ms-navigation-horizontal-node');

                return function postLink(scope, iElement, iAttrs, MsNavigationHorizontalNodeCtrl)
                {
                    // Add custom classes
                    iElement.addClass(MsNavigationHorizontalNodeCtrl.getClass());

                    // Add group class if it's a group
                    if ( MsNavigationHorizontalNodeCtrl.group )
                    {
                        iElement.addClass('group');
                    }
                };
            }
        };
    }

    /** @ngInject */
    function msNavigationHorizontalItemDirective($mdMedia)
    {
        return {
            restrict: 'A',
            require : '^msNavigationHorizontalNode',
            compile : function (tElement)
            {
                tElement.addClass('ms-navigation-horizontal-item');

                return function postLink(scope, iElement, iAttrs, MsNavigationHorizontalNodeCtrl)
                {
                    iElement.on('click', onClick);

                    function onClick()
                    {
                        if ( !MsNavigationHorizontalNodeCtrl.hasChildren || $mdMedia('gt-md') )
                        {
                            return;
                        }

                        iElement.toggleClass('expanded');
                    }

                    // Cleanup
                    scope.$on('$destroy', function ()
                    {
                        iElement.off('click');
                    });
                };
            }
        };
    }

})();
(function ()
{
    'use strict';

    msNavIsFoldedDirective.$inject = ["$document", "$rootScope", "msNavFoldService"];
    msNavDirective.$inject = ["$rootScope", "$mdComponentRegistry", "msNavFoldService"];
    msNavToggleDirective.$inject = ["$rootScope", "$q", "$animate", "$state"];
    angular
        .module('app.core')
        .factory('msNavFoldService', msNavFoldService)
        .directive('msNavIsFolded', msNavIsFoldedDirective)
        .controller('MsNavController', MsNavController)
        .directive('msNav', msNavDirective)
        .directive('msNavTitle', msNavTitleDirective)
        .directive('msNavButton', msNavButtonDirective)
        .directive('msNavToggle', msNavToggleDirective);

    /** @ngInject */
    function msNavFoldService()
    {
        var foldable = {};

        var service = {
            setFoldable    : setFoldable,
            isNavFoldedOpen: isNavFoldedOpen,
            toggleFold     : toggleFold,
            openFolded     : openFolded,
            closeFolded    : closeFolded
        };

        return service;

        //////////

        /**
         * Set the foldable
         *
         * @param scope
         * @param element
         */
        function setFoldable(scope, element)
        {
            foldable = {
                'scope'  : scope,
                'element': element
            };
        }

        /**
         * Is folded open
         */
        function isNavFoldedOpen()
        {
            return foldable.scope.isNavFoldedOpen();
        }

        /**
         * Toggle fold
         */
        function toggleFold()
        {
            foldable.scope.toggleFold();
        }

        /**
         * Open folded navigation
         */
        function openFolded()
        {
            foldable.scope.openFolded();
        }

        /**
         * Close folded navigation
         */
        function closeFolded()
        {
            foldable.scope.closeFolded();
        }
    }

    /** @ngInject */
    function msNavIsFoldedDirective($document, $rootScope, msNavFoldService)
    {
        return {
            restrict: 'A',
            link    : function (scope, iElement, iAttrs)
            {
                var isFolded = (iAttrs.msNavIsFolded === 'true'),
                    isFoldedOpen = false,
                    body = angular.element($document[0].body),
                    openOverlay = angular.element('<div id="ms-nav-fold-open-overlay"></div>'),
                    closeOverlay = angular.element('<div id="ms-nav-fold-close-overlay"></div>'),
                    sidenavEl = iElement.parent();

                // Initialize the service
                msNavFoldService.setFoldable(scope, iElement, isFolded);

                // Set the fold status for the first time
                if ( isFolded )
                {
                    fold();
                }
                else
                {
                    unfold();
                }

                /**
                 * Is nav folded open
                 */
                function isNavFoldedOpen()
                {
                    return isFoldedOpen;
                }

                /**
                 * Toggle fold
                 */
                function toggleFold()
                {
                    isFolded = !isFolded;

                    if ( isFolded )
                    {
                        fold();
                    }
                    else
                    {
                        unfold();
                    }
                }

                /**
                 * Fold the navigation
                 */
                function fold()
                {
                    // Add classes
                    body.addClass('ms-nav-folded');

                    // Collapse everything and scroll to the top
                    $rootScope.$broadcast('msNav::forceCollapse');
                    iElement.scrollTop(0);

                    // Append the openOverlay to the element
                    sidenavEl.append(openOverlay);

                    // Event listeners
                    openOverlay.on('mouseenter touchstart', function (event)
                    {
                        openFolded(event);
                        isFoldedOpen = true;
                    });
                }

                /**
                 * Open folded navigation
                 */
                function openFolded(event)
                {
                    if ( angular.isDefined(event) )
                    {
                        event.preventDefault();
                    }

                    body.addClass('ms-nav-folded-open');

                    // Update the location
                    $rootScope.$broadcast('msNav::expandMatchingToggles');

                    // Remove open overlay
                    sidenavEl.find(openOverlay).remove();

                    // Append close overlay and bind its events
                    sidenavEl.parent().append(closeOverlay);
                    closeOverlay.on('mouseenter touchstart', function (event)
                    {
                        closeFolded(event);
                        isFoldedOpen = false;
                    });
                }

                /**
                 * Close folded navigation
                 */
                function closeFolded(event)
                {
                    if ( angular.isDefined(event) )
                    {
                        event.preventDefault();
                    }

                    // Collapse everything and scroll to the top
                    $rootScope.$broadcast('msNav::forceCollapse');
                    iElement.scrollTop(0);

                    body.removeClass('ms-nav-folded-open');

                    // Remove close overlay
                    sidenavEl.parent().find(closeOverlay).remove();

                    // Append open overlay and bind its events
                    sidenavEl.append(openOverlay);
                    openOverlay.on('mouseenter touchstart', function (event)
                    {
                        openFolded(event);
                        isFoldedOpen = true;
                    });
                }

                /**
                 * Unfold the navigation
                 */
                function unfold()
                {
                    body.removeClass('ms-nav-folded ms-nav-folded-open');

                    // Update the location
                    $rootScope.$broadcast('msNav::expandMatchingToggles');

                    iElement.off('mouseenter mouseleave');
                }

                // Expose functions to the scope
                scope.toggleFold = toggleFold;
                scope.openFolded = openFolded;
                scope.closeFolded = closeFolded;
                scope.isNavFoldedOpen = isNavFoldedOpen;

                // Cleanup
                scope.$on('$destroy', function ()
                {
                    openOverlay.off('mouseenter touchstart');
                    closeOverlay.off('mouseenter touchstart');
                    iElement.off('mouseenter mouseleave');
                });
            }
        };
    }


    /** @ngInject */
    function MsNavController()
    {
        var vm = this,
            disabled = false,
            toggleItems = [],
            lockedItems = [];

        // Data

        // Methods
        vm.isDisabled = isDisabled;
        vm.enable = enable;
        vm.disable = disable;
        vm.setToggleItem = setToggleItem;
        vm.getLockedItems = getLockedItems;
        vm.setLockedItem = setLockedItem;
        vm.clearLockedItems = clearLockedItems;

        //////////

        /**
         * Is navigation disabled
         *
         * @returns {boolean}
         */
        function isDisabled()
        {
            return disabled;
        }

        /**
         * Disable the navigation
         */
        function disable()
        {
            disabled = true;
        }

        /**
         * Enable the navigation
         */
        function enable()
        {
            disabled = false;
        }

        /**
         * Set toggle item
         *
         * @param element
         * @param scope
         */
        function setToggleItem(element, scope)
        {
            toggleItems.push({
                'element': element,
                'scope'  : scope
            });
        }

        /**
         * Get locked items
         *
         * @returns {Array}
         */
        function getLockedItems()
        {
            return lockedItems;
        }

        /**
         * Set locked item
         *
         * @param element
         * @param scope
         */
        function setLockedItem(element, scope)
        {
            lockedItems.push({
                'element': element,
                'scope'  : scope
            });
        }

        /**
         * Clear locked items list
         */
        function clearLockedItems()
        {
            lockedItems = [];
        }
    }

    /** @ngInject */
    function msNavDirective($rootScope, $mdComponentRegistry, msNavFoldService)
    {
        return {
            restrict  : 'E',
            scope     : {},
            controller: 'MsNavController',
            compile   : function (tElement)
            {
                tElement.addClass('ms-nav');

                return function postLink(scope)
                {
                    // Update toggle status according to the ui-router current state
                    $rootScope.$broadcast('msNav::expandMatchingToggles');

                    // Update toggles on state changes
                    var stateChangeSuccessEvent = $rootScope.$on('$stateChangeSuccess', function ()
                    {
                        $rootScope.$broadcast('msNav::expandMatchingToggles');

                        // Close navigation sidenav on stateChangeSuccess
                        $mdComponentRegistry.when('navigation').then(function (navigation)
                        {
                            navigation.close();

                            if ( msNavFoldService.isNavFoldedOpen() )
                            {
                                msNavFoldService.closeFolded();
                            }
                        });
                    });

                    // Cleanup
                    scope.$on('$destroy', function ()
                    {
                        stateChangeSuccessEvent();
                    })
                };
            }
        };
    }

    /** @ngInject */
    function msNavTitleDirective()
    {
        return {
            restrict: 'A',
            compile : function (tElement)
            {
                tElement.addClass('ms-nav-title');

                return function postLink()
                {

                };
            }
        };
    }

    /** @ngInject */
    function msNavButtonDirective()
    {
        return {
            restrict: 'AE',
            compile : function (tElement)
            {
                tElement.addClass('ms-nav-button');

                return function postLink()
                {

                };
            }
        };
    }

    /** @ngInject */
    function msNavToggleDirective($rootScope, $q, $animate, $state)
    {
        return {
            restrict: 'A',
            require : '^msNav',
            scope   : true,
            compile : function (tElement, tAttrs)
            {
                tElement.addClass('ms-nav-toggle');

                // Add collapsed attr
                if ( angular.isUndefined(tAttrs.collapsed) )
                {
                    tAttrs.collapsed = true;
                }

                tElement.attr('collapsed', tAttrs.collapsed);

                return function postLink(scope, iElement, iAttrs, MsNavCtrl)
                {
                    var classes = {
                        expanded         : 'expanded',
                        expandAnimation  : 'expand-animation',
                        collapseAnimation: 'collapse-animation'
                    };

                    // Store all related states
                    var links = iElement.find('a');
                    var states = [];
                    var regExp = /\(.*\)/g;

                    angular.forEach(links, function (link)
                    {
                        var state = angular.element(link).attr('ui-sref');

                        if ( angular.isUndefined(state) )
                        {
                            return;
                        }

                        // Remove any parameter definition from the state name before storing it
                        state = state.replace(regExp, '');

                        states.push(state);
                    });

                    // Store toggle-able element and its scope in the main nav controller
                    MsNavCtrl.setToggleItem(iElement, scope);

                    // Click handler
                    iElement.children('.ms-nav-button').on('click', toggle);

                    // Toggle function
                    function toggle()
                    {
                        // If navigation is disabled, do nothing...
                        if ( MsNavCtrl.isDisabled() )
                        {
                            return;
                        }

                        // Disable the entire navigation to prevent spamming
                        MsNavCtrl.disable();

                        if ( isCollapsed() )
                        {
                            // Clear the locked items list
                            MsNavCtrl.clearLockedItems();

                            // Emit pushToLockedList event
                            scope.$emit('msNav::pushToLockedList');

                            // Collapse everything but locked items
                            $rootScope.$broadcast('msNav::collapse');

                            // Expand and then...
                            expand().then(function ()
                            {
                                // Enable the entire navigation after animations completed
                                MsNavCtrl.enable();
                            });
                        }
                        else
                        {
                            // Collapse with all children
                            scope.$broadcast('msNav::forceCollapse');
                        }
                    }

                    // Cleanup
                    scope.$on('$destroy', function ()
                    {
                        iElement.children('.ms-nav-button').off('click');
                    });

                    /*---------------------*/
                    /* Scope Events        */
                    /*---------------------*/

                    /**
                     * Collapse everything but locked items
                     */
                    scope.$on('msNav::collapse', function ()
                    {
                        // Only collapse toggles that are not locked
                        var lockedItems = MsNavCtrl.getLockedItems();
                        var locked = false;

                        angular.forEach(lockedItems, function (lockedItem)
                        {
                            if ( angular.equals(lockedItem.scope, scope) )
                            {
                                locked = true;
                            }
                        });

                        if ( locked )
                        {
                            return;
                        }

                        // Collapse and then...
                        collapse().then(function ()
                        {
                            // Enable the entire navigation after animations completed
                            MsNavCtrl.enable();
                        });
                    });

                    /**
                     * Collapse everything
                     */
                    scope.$on('msNav::forceCollapse', function ()
                    {
                        // Collapse and then...
                        collapse().then(function ()
                        {
                            // Enable the entire navigation after animations completed
                            MsNavCtrl.enable();
                        });
                    });

                    /**
                     * Expand toggles that match with the current states
                     */
                    scope.$on('msNav::expandMatchingToggles', function ()
                    {
                        var currentState = $state.current.name;
                        var shouldExpand = false;

                        angular.forEach(states, function (state)
                        {
                            if ( currentState === state )
                            {
                                shouldExpand = true;
                            }
                        });

                        if ( shouldExpand )
                        {
                            expand();
                        }
                        else
                        {
                            collapse();
                        }
                    });

                    /**
                     * Add toggle to the locked list
                     */
                    scope.$on('msNav::pushToLockedList', function ()
                    {
                        // Set expanded item on main nav controller
                        MsNavCtrl.setLockedItem(iElement, scope);
                    });

                    /*---------------------*/
                    /* Internal functions  */
                    /*---------------------*/

                    /**
                     * Is element collapsed
                     *
                     * @returns {bool}
                     */
                    function isCollapsed()
                    {
                        return iElement.attr('collapsed') === 'true';
                    }

                    /**
                     * Is element expanded
                     *
                     * @returns {bool}
                     */
                    function isExpanded()
                    {
                        return !isCollapsed();
                    }

                    /**
                     * Expand the toggle
                     *
                     * @returns $promise
                     */
                    function expand()
                    {
                        // Create a new deferred object
                        var deferred = $q.defer();

                        // If the menu item is already expanded, do nothing..
                        if ( isExpanded() )
                        {
                            // Reject the deferred object
                            deferred.reject({'error': true});

                            // Return the promise
                            return deferred.promise;
                        }

                        // Set element attr
                        iElement.attr('collapsed', false);

                        // Grab the element to expand
                        var elementToExpand = angular.element(iElement.find('ms-nav-toggle-items')[0]);

                        // Move the element out of the dom flow and
                        // make it block so we can get its height
                        elementToExpand.css({
                            'position'  : 'absolute',
                            'visibility': 'hidden',
                            'display'   : 'block',
                            'height'    : 'auto'
                        });

                        // Grab the height
                        var height = elementToExpand[0].offsetHeight;

                        // Reset the style modifications
                        elementToExpand.css({
                            'position'  : '',
                            'visibility': '',
                            'display'   : '',
                            'height'    : ''
                        });

                        // Animate the height
                        scope.$evalAsync(function ()
                        {
                            $animate.animate(elementToExpand,
                                {
                                    'display': 'block',
                                    'height' : '0px'
                                },
                                {
                                    'height': height + 'px'
                                },
                                classes.expandAnimation
                            ).then(
                                function ()
                                {
                                    // Add expanded class
                                    elementToExpand.addClass(classes.expanded);

                                    // Clear the inline styles after animation done
                                    elementToExpand.css({'height': ''});

                                    // Resolve the deferred object
                                    deferred.resolve({'success': true});
                                }
                            );
                        });

                        // Return the promise
                        return deferred.promise;
                    }

                    /**
                     * Collapse the toggle
                     *
                     * @returns $promise
                     */
                    function collapse()
                    {
                        // Create a new deferred object
                        var deferred = $q.defer();

                        // If the menu item is already collapsed, do nothing..
                        if ( isCollapsed() )
                        {
                            // Reject the deferred object
                            deferred.reject({'error': true});

                            // Return the promise
                            return deferred.promise;
                        }

                        // Set element attr
                        iElement.attr('collapsed', true);

                        // Grab the element to collapse
                        var elementToCollapse = angular.element(iElement.find('ms-nav-toggle-items')[0]);

                        // Grab the height
                        var height = elementToCollapse[0].offsetHeight;

                        // Animate the height
                        scope.$evalAsync(function ()
                        {
                            $animate.animate(elementToCollapse,
                                {
                                    'height': height + 'px'
                                },
                                {
                                    'height': '0px'
                                },
                                classes.collapseAnimation
                            ).then(
                                function ()
                                {
                                    // Remove expanded class
                                    elementToCollapse.removeClass(classes.expanded);

                                    // Clear the inline styles after animation done
                                    elementToCollapse.css({
                                        'display': '',
                                        'height' : ''
                                    });

                                    // Resolve the deferred object
                                    deferred.resolve({'success': true});
                                }
                            );
                        });

                        // Return the promise
                        return deferred.promise;
                    }
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    msMaterialColorPicker.$inject = ["$mdMenu", "$mdColorPalette", "fuseGenerator"];
    angular
        .module('app.core')
        .directive('msMaterialColorPicker', msMaterialColorPicker);

    /** @ngInject */
    function msMaterialColorPicker($mdMenu, $mdColorPalette, fuseGenerator)
    {
        return {
            require    : 'ngModel',
            restrict   : 'E',
            scope      : {
                ngModel    : '=',
                msModelType: '@?'
            },
            templateUrl: 'app/core/directives/ms-material-color-picker/ms-material-color-picker.html',
            link       : function ($scope, element, attrs, ngModel)
            {
                // Material Color Palette
                $scope.palettes = $mdColorPalette;
                $scope.selectedPalette = false;
                $scope.selectedHues = false;

                /**
                 * ModelType: 'obj', 'class'(default)
                 * @type {string|string}
                 */
                $scope.msModelType = $scope.msModelType || 'class';

                /**
                 * Initialize / Watch model changes
                 */
                $scope.$watch('ngModel', setSelectedColor);

                /**
                 * Activate Hue Selection
                 * @param palette
                 * @param hues
                 */
                $scope.activateHueSelection = function (palette, hues)
                {
                    $scope.selectedPalette = palette;
                    $scope.selectedHues = hues;
                };

                /**
                 * Select Color
                 * @type {selectColor}
                 */
                $scope.selectColor = function (palette, hue)
                {
                    // Update Selected Color
                    updateSelectedColor(palette, hue);

                    // Update Model Value
                    updateModel();

                    // Hide The picker
                    $mdMenu.hide();
                };

                $scope.removeColor = function ()
                {

                    $scope.selectedColor = {
                        palette: '',
                        hue    : '',
                        class  : ''
                    };

                    $scope.activateHueSelection(false, false);

                    updateModel();
                };

                /**
                 * Set SelectedColor by model type
                 */
                function setSelectedColor()
                {
                    if ( !ngModel.$viewValue || ngModel.$viewValue === '' )
                    {
                        return;
                    }

                    var palette, hue;

                    // If ModelType Class
                    if ( $scope.msModelType === 'class' )
                    {
                        var color = ngModel.$viewValue.split('-');
                        if ( color.length >= 5 )
                        {
                            palette = color[1] + '-' + color[2];
                            hue = color[3];
                        }
                        else
                        {
                            palette = color[1];
                            hue = color[2];
                        }
                    }
                    // If ModelType Object
                    else if ( $scope.msModelType === 'obj' )
                    {
                        palette = ngModel.$viewValue.palette;
                        hue = ngModel.$viewValue.hue || 500;
                    }

                    // Update Selected Color
                    updateSelectedColor(palette, hue);
                }


                /**
                 * Update Selected Color
                 * @param palette
                 * @param hue
                 */
                function updateSelectedColor(palette, hue)
                {
                    $scope.selectedColor = {
                        palette     : palette,
                        hue         : hue,
                        class       : 'md-' + palette + '-' + hue + '-bg',
                        bgColorValue: fuseGenerator.rgba($scope.palettes[palette][hue].value),
                        fgColorValue: fuseGenerator.rgba($scope.palettes[palette][hue].contrast)
                    };

                    // If Model object not Equals the selectedColor update it
                    // it can be happen when the model only have pallete and hue values
                    if ( $scope.msModelType === 'obj' && !angular.equals($scope.selectedColor, ngModel.$viewValue) )
                    {
                        // Update Model Value
                        updateModel();
                    }

                    $scope.activateHueSelection(palette, $scope.palettes[palette]);
                }

                /**
                 * Update Model Value by model type
                 */
                function updateModel()
                {
                    if ( $scope.msModelType === 'class' )
                    {
                        ngModel.$setViewValue($scope.selectedColor.class);
                    }
                    else if ( $scope.msModelType === 'obj' )
                    {
                        ngModel.$setViewValue($scope.selectedColor);
                    }
                }
            }
        };
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .controller('MsFormWizardController', MsFormWizardController)
        .directive('msFormWizard', msFormWizardDirective)
        .directive('msFormWizardForm', msFormWizardFormDirective);

    /** @ngInject */
    function MsFormWizardController()
    {
        var vm = this;

        // Data
        vm.forms = [];
        vm.selectedIndex = 0;

        // Methods
        vm.registerForm = registerForm;

        vm.previousStep = previousStep;
        vm.nextStep = nextStep;
        vm.firstStep = firstStep;
        vm.lastStep = lastStep;

        vm.totalSteps = totalSteps;
        vm.isFirstStep = isFirstStep;
        vm.isLastStep = isLastStep;

        vm.currentStepInvalid = currentStepInvalid;
        vm.previousStepInvalid = previousStepInvalid;
        vm.formsIncomplete = formsIncomplete;
        vm.resetForm = resetForm;

        //////////

        /**
         * Register form
         *
         * @param form
         */
        function registerForm(form)
        {
            vm.forms.push(form);
        }

        /**
         * Go to previous step
         */
        function previousStep()
        {
            if ( isFirstStep() )
            {
                return;
            }

            vm.selectedIndex--;
        }

        /**
         * Go to next step
         */
        function nextStep()
        {
            if ( isLastStep() )
            {
                return;
            }

            vm.selectedIndex++;
        }

        /**
         * Go to first step
         */
        function firstStep()
        {
            vm.selectedIndex = 0;
        }

        /**
         * Go to last step
         */
        function lastStep()
        {
            vm.selectedIndex = totalSteps() - 1;
        }

        /**
         * Return total steps
         *
         * @returns {int}
         */
        function totalSteps()
        {
            return vm.forms.length;
        }

        /**
         * Is first step?
         *
         * @returns {boolean}
         */
        function isFirstStep()
        {
            return vm.selectedIndex === 0;
        }

        /**
         * Is last step?
         *
         * @returns {boolean}
         */
        function isLastStep()
        {
            return vm.selectedIndex === totalSteps() - 1;
        }

        /**
         * Is current step invalid?
         *
         * @returns {boolean}
         */
        function currentStepInvalid()
        {
            return angular.isDefined(vm.forms[vm.selectedIndex]) && vm.forms[vm.selectedIndex].$invalid;
        }

        /**
         * Is previous step invalid?
         *
         * @returns {boolean}
         */
        function previousStepInvalid()
        {
            return vm.selectedIndex > 0 && angular.isDefined(vm.forms[vm.selectedIndex - 1]) && vm.forms[vm.selectedIndex - 1].$invalid;
        }

        /**
         * Check if there is any incomplete forms
         *
         * @returns {boolean}
         */
        function formsIncomplete()
        {
            for ( var x = 0; x < vm.forms.length; x++ )
            {
                if ( vm.forms[x].$invalid )
                {
                    return true;
                }
            }

            return false;
        }

        /**
         * Reset form
         */
        function resetForm()
        {
            // Go back to the first step
            vm.selectedIndex = 0;

            // Make sure all the forms are back in the $pristine & $untouched status
            for ( var x = 0; x < vm.forms.length; x++ )
            {
                vm.forms[x].$setPristine();
                vm.forms[x].$setUntouched();
            }
        }
    }

    /** @ngInject */
    function msFormWizardDirective()
    {
        return {
            restrict  : 'E',
            scope     : true,
            controller: 'MsFormWizardController as msWizard',
            compile   : function (tElement)
            {
                tElement.addClass('ms-form-wizard');

                return function postLink()
                {

                };
            }
        }

    }

    /** @ngInject */
    function msFormWizardFormDirective()
    {
        return {
            restrict: 'A',
            require : ['form', '^msFormWizard'],
            compile : function (tElement)
            {
                tElement.addClass('ms-form-wizard-form');

                return function postLink(scope, iElement, iAttrs, ctrls)
                {
                    var formCtrl = ctrls[0],
                        MsFormWizardCtrl = ctrls[1];

                    MsFormWizardCtrl.registerForm(formCtrl);
                }
            }
        }
    }

})();
(function ()
{
    'use strict';

    msDatepickerFix.$inject = ["msDatepickerFixConfig"];
    angular
        .module('app.core')
        .provider('msDatepickerFixConfig', msDatepickerFixConfigProvider)
        .directive('msDatepickerFix', msDatepickerFix);

    /** @ngInject */
    function msDatepickerFixConfigProvider()
    {

        // Default configuration
        var defaultConfiguration = {
            // To view
            formatter: function (val)
            {
                if ( !val )
                {
                    return '';
                }

                return val === '' ? val : new Date(val);
            },
            // To model
            parser   : function (val)
            {
                if ( !val )
                {
                    return '';
                }
                var offset = moment(val).utcOffset();
                var date = new Date(moment(val).add(offset, 'm'));
                return date;
            }
        };

        // Methods
        this.config = config;

        //////////

        /**
         * Extend default configuration with the given one
         *
         * @param configuration
         */
        function config(configuration)
        {
            defaultConfiguration = angular.extend({}, defaultConfiguration, configuration);
        }

        /**
         * Service
         */
        this.$get = function ()
        {
            return defaultConfiguration;
        };
    }

    /** @ngInject */
    function msDatepickerFix(msDatepickerFixConfig)
    {
        return {
            require: 'ngModel',
            link   : function (scope, elem, attrs, ngModel)
            {
                ngModel.$formatters.unshift(msDatepickerFixConfig.formatter); // to view
                ngModel.$parsers.unshift(msDatepickerFixConfig.parser); // to model
            }
        };
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .directive('msCard', msCardDirective);

    /** @ngInject */
    function msCardDirective()
    {
        return {
            restrict: 'E',
            scope   : {
                templatePath: '=template',
                card        : '=ngModel',
                vm          : '=viewModel'
            },
            template: '<div class="ms-card-content-wrapper" ng-include="templatePath" onload="cardTemplateLoaded()"></div>',
            compile : function (tElement)
            {
                // Add class
                tElement.addClass('ms-card');

                return function postLink(scope, iElement)
                {
                    // Methods
                    scope.cardTemplateLoaded = cardTemplateLoaded;

                    //////////

                    /**
                     * Emit cardTemplateLoaded event
                     */
                    function cardTemplateLoaded()
                    {
                        scope.$emit('msCard::cardTemplateLoaded', iElement);
                    }
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .provider('fuseTheming', fuseThemingProvider);

    /** @ngInject */
    function fuseThemingProvider()
    {
        // Inject Cookies Service
        var $cookies;

        angular.injector(['ngCookies']).invoke([
            '$cookies', function (_$cookies)
            {
                $cookies = _$cookies;
            }
        ]);

        // Inject $log service
        var $log = angular.injector(['ng']).get('$log');

        var registeredPalettes,
            registeredThemes;

        // Methods
        this.setRegisteredPalettes = setRegisteredPalettes;
        this.setRegisteredThemes = setRegisteredThemes;

        //////////

        /**
         * Set registered palettes
         *
         * @param _registeredPalettes
         */
        function setRegisteredPalettes(_registeredPalettes)
        {
            registeredPalettes = _registeredPalettes;
        }

        /**
         * Set registered themes
         *
         * @param _registeredThemes
         */
        function setRegisteredThemes(_registeredThemes)
        {
            registeredThemes = _registeredThemes;
        }

        /**
         * Service
         */
        this.$get = function ()
        {
            var service = {
                getRegisteredPalettes: getRegisteredPalettes,
                getRegisteredThemes  : getRegisteredThemes,
                setActiveTheme       : setActiveTheme,
                setThemesList        : setThemesList,
                themes               : {
                    list  : {},
                    active: {
                        'name' : '',
                        'theme': {}
                    }
                }
            };

            return service;

            //////////

            /**
             * Get registered palettes
             *
             * @returns {*}
             */
            function getRegisteredPalettes()
            {
                return registeredPalettes;
            }

            /**
             * Get registered themes
             *
             * @returns {*}
             */
            function getRegisteredThemes()
            {
                return registeredThemes;
            }

            /**
             * Set active theme
             *
             * @param themeName
             */
            function setActiveTheme(themeName)
            {
                // If theme does not exist, fallback to the default theme
                if ( angular.isUndefined(service.themes.list[themeName]) )
                {
                    // If there is no theme called "default"...
                    if ( angular.isUndefined(service.themes.list.default) )
                    {
                        $log.error('You must have at least one theme named "default"');
                        return;
                    }

                    $log.warn('The theme "' + themeName + '" does not exist! Falling back to the "default" theme.');

                    // Otherwise set theme to default theme
                    service.themes.active.name = 'default';
                    service.themes.active.theme = service.themes.list.default;
                    $cookies.put('selectedTheme', service.themes.active.name);

                    return;
                }

                service.themes.active.name = themeName;
                service.themes.active.theme = service.themes.list[themeName];
                $cookies.put('selectedTheme', themeName);
            }

            /**
             * Set available themes list
             *
             * @param themeList
             */
            function setThemesList(themeList)
            {
                service.themes.list = themeList;
            }
        };
    }
})();

(function ()
{
    'use strict';

    config.$inject = ["$mdThemingProvider", "fusePalettes", "fuseThemes", "fuseThemingProvider"];
    angular
        .module('app.core')
        .config(config);

    /** @ngInject */
    function config($mdThemingProvider, fusePalettes, fuseThemes, fuseThemingProvider)
    {
        // Inject Cookies Service
        var $cookies;
        angular.injector(['ngCookies']).invoke([
            '$cookies', function (_$cookies)
            {
                $cookies = _$cookies;
            }
        ]);

        // Check if custom theme exist in cookies
        var customTheme = $cookies.getObject('customTheme');
        if ( customTheme )
        {
            fuseThemes['custom'] = customTheme;
        }

        $mdThemingProvider.alwaysWatchTheme(true);

        // Define custom palettes
        angular.forEach(fusePalettes, function (palette)
        {
            $mdThemingProvider.definePalette(palette.name, palette.options);
        });

        // Register custom themes
        angular.forEach(fuseThemes, function (theme, themeName)
        {
            $mdThemingProvider.theme(themeName)
                .primaryPalette(theme.primary.name, theme.primary.hues)
                .accentPalette(theme.accent.name, theme.accent.hues)
                .warnPalette(theme.warn.name, theme.warn.hues)
                .backgroundPalette(theme.background.name, theme.background.hues);
        });

        // Store generated PALETTES and THEMES objects from $mdThemingProvider
        // in our custom provider, so we can inject them into other areas
        fuseThemingProvider.setRegisteredPalettes($mdThemingProvider._PALETTES);
        fuseThemingProvider.setRegisteredThemes($mdThemingProvider._THEMES);
    }

})();
(function ()
{
    'use strict';

    var fuseThemes = {
        'default'  : {
            primary   : {
                name: 'fuse-pale-blue',
                hues: {
                    'default': '700',
                    'hue-1'  : '500',
                    'hue-2'  : '600',
                    'hue-3'  : '400'
                }
            },
            accent    : {
                name: 'light-blue',
                hues: {
                    'default': '600',
                    'hue-1'  : '400',
                    'hue-2'  : '700',
                    'hue-3'  : 'A100'
                }
            },
            warn      : {name: 'red'},
            background: {
                name: 'grey',
                hues: {
                    'default': 'A100',
                    'hue-1'  : '100',
                    'hue-2'  : '50',
                    'hue-3'  : '300'
                }
            }
        },
        'pink': {
            primary   : {
                name: 'blue-grey',
                hues: {
                    'default': '800',
                    'hue-1'  : '600',
                    'hue-2'  : '400',
                    'hue-3'  : 'A100'
                }
            },
            accent    : {
                name: 'pink',
                hues: {
                    'default': '400',
                    'hue-1'  : '300',
                    'hue-2'  : '600',
                    'hue-3'  : 'A100'
                }
            },
            warn      : {name: 'blue'},
            background: {
                name: 'grey',
                hues: {
                    'default': 'A100',
                    'hue-1'  : '100',
                    'hue-2'  : '50',
                    'hue-3'  : '300'
                }
            }
        },
        'teal'     : {
            primary   : {
                name: 'fuse-blue',
                hues: {
                    'default': '900',
                    'hue-1'  : '600',
                    'hue-2'  : '500',
                    'hue-3'  : 'A100'
                }
            },
            accent    : {
                name: 'teal',
                hues: {
                    'default': '500',
                    'hue-1'  : '400',
                    'hue-2'  : '600',
                    'hue-3'  : 'A100'
                }
            },
            warn      : {name: 'deep-orange'},
            background: {
                name: 'grey',
                hues: {
                    'default': 'A100',
                    'hue-1'  : '100',
                    'hue-2'  : '50',
                    'hue-3'  : '300'
                }
            }
        }
    };

    angular
        .module('app.core')
        .constant('fuseThemes', fuseThemes);
})();
(function () {
    'use strict';

    var fusePalettes = [
        {
            name: 'fuse-blue',
            options: {
                '50': '#ebf1fa',
                '100': '#c2d4ef',
                '200': '#9ab8e5',
                '300': '#78a0dc',
                '400': '#5688d3',
                '500': '#3470ca',
                '600': '#2e62b1',
                '700': '#275498',
                '800': '#21467e',
                '900': '#1a3865',
                'A100': '#c2d4ef',
                'A200': '#9ab8e5',
                'A400': '#5688d3',
                'A700': '#275498',
                'contrastDefaultColor': 'light',
                'contrastDarkColors': '50 100 200 A100',
                'contrastStrongLightColors': '300 400'
            }
        },
        {
            name: 'fuse-pale-blue',
            options: {
                '50': '#ececee',
                '100': '#c5c6cb',
                '200': '#9ea1a9',
                '300': '#7d818c',
                '400': '#5c616f',
                '500': '#3c4252',
                '600': '#353a48',
                '700': '#2d323e',
                '800': '#262933',
                '900': '#1e2129',
                'A100': '#c5c6cb',
                'A200': '#9ea1a9',
                'A400': '#5c616f',
                'A700': '#2d323e',
                'contrastDefaultColor': 'light',
                'contrastDarkColors': '50 100 200 A100',
                'contrastStrongLightColors': '300 400'
            }
        }
    ];

    angular
        .module('app.core')
        .constant('fusePalettes', fusePalettes);
})();
(function ()
{
    'use strict';

    fuseGeneratorService.$inject = ["$cookies", "$log", "fuseTheming"];
    angular
        .module('app.core')
        .factory('fuseGenerator', fuseGeneratorService);

    /** @ngInject */
    function fuseGeneratorService($cookies, $log, fuseTheming)
    {
        // Storage for simplified themes object
        var themes = {};

        var service = {
            generate: generate,
            rgba    : rgba
        };

        return service;

        //////////

        /**
         * Generate less variables for each theme from theme's
         * palette by using material color naming conventions
         */
        function generate()
        {
            var registeredThemes = fuseTheming.getRegisteredThemes();
            var registeredPalettes = fuseTheming.getRegisteredPalettes();

            // First, create a simplified object that stores
            // all registered themes and their colors

            // Iterate through registered themes
            angular.forEach(registeredThemes, function (registeredTheme)
            {
                themes[registeredTheme.name] = {};

                // Iterate through color types (primary, accent, warn & background)
                angular.forEach(registeredTheme.colors, function (colorType, colorTypeName)
                {
                    themes[registeredTheme.name][colorTypeName] = {
                        'name'  : colorType.name,
                        'levels': {
                            'default': {
                                'color'    : rgba(registeredPalettes[colorType.name][colorType.hues.default].value),
                                'contrast1': rgba(registeredPalettes[colorType.name][colorType.hues.default].contrast, 1),
                                'contrast2': rgba(registeredPalettes[colorType.name][colorType.hues.default].contrast, 2),
                                'contrast3': rgba(registeredPalettes[colorType.name][colorType.hues.default].contrast, 3),
                                'contrast4': rgba(registeredPalettes[colorType.name][colorType.hues.default].contrast, 4)
                            },
                            'hue1'   : {
                                'color'    : rgba(registeredPalettes[colorType.name][colorType.hues['hue-1']].value),
                                'contrast1': rgba(registeredPalettes[colorType.name][colorType.hues['hue-1']].contrast, 1),
                                'contrast2': rgba(registeredPalettes[colorType.name][colorType.hues['hue-1']].contrast, 2),
                                'contrast3': rgba(registeredPalettes[colorType.name][colorType.hues['hue-1']].contrast, 3),
                                'contrast4': rgba(registeredPalettes[colorType.name][colorType.hues['hue-1']].contrast, 4)
                            },
                            'hue2'   : {
                                'color'    : rgba(registeredPalettes[colorType.name][colorType.hues['hue-2']].value),
                                'contrast1': rgba(registeredPalettes[colorType.name][colorType.hues['hue-2']].contrast, 1),
                                'contrast2': rgba(registeredPalettes[colorType.name][colorType.hues['hue-2']].contrast, 2),
                                'contrast3': rgba(registeredPalettes[colorType.name][colorType.hues['hue-2']].contrast, 3),
                                'contrast4': rgba(registeredPalettes[colorType.name][colorType.hues['hue-2']].contrast, 4)
                            },
                            'hue3'   : {
                                'color'    : rgba(registeredPalettes[colorType.name][colorType.hues['hue-3']].value),
                                'contrast1': rgba(registeredPalettes[colorType.name][colorType.hues['hue-3']].contrast, 1),
                                'contrast2': rgba(registeredPalettes[colorType.name][colorType.hues['hue-3']].contrast, 2),
                                'contrast3': rgba(registeredPalettes[colorType.name][colorType.hues['hue-3']].contrast, 3),
                                'contrast4': rgba(registeredPalettes[colorType.name][colorType.hues['hue-3']].contrast, 4)
                            }
                        }
                    };
                });
            });

            // Process themes one more time and then store them in the service for external use
            processAndStoreThemes(themes);

            // Iterate through simplified themes
            // object and create style variables
            var styleVars = {};

            // Iterate through registered themes
            angular.forEach(themes, function (theme, themeName)
            {
                styleVars = {};
                styleVars['@themeName'] = themeName;

                // Iterate through color types (primary, accent, warn & background)
                angular.forEach(theme, function (colorTypes, colorTypeName)
                {
                    // Iterate through color levels (default, hue1, hue2 & hue3)
                    angular.forEach(colorTypes.levels, function (colors, colorLevelName)
                    {
                        // Iterate through color name (color, contrast1, contrast2, contrast3 & contrast4)
                        angular.forEach(colors, function (color, colorName)
                        {
                            styleVars['@' + colorTypeName + ucfirst(colorLevelName) + ucfirst(colorName)] = color;
                        });
                    });
                });

                // Render styles
                render(styleVars);
            });
        }

        // ---------------------------
        //  INTERNAL HELPER FUNCTIONS
        // ---------------------------

        /**
         * Process and store themes for global use
         *
         * @param _themes
         */
        function processAndStoreThemes(_themes)
        {
            // Here we will go through every registered theme one more time
            // and try to simplify their objects as much as possible for
            // easier access to their properties.
            var themes = angular.copy(_themes);

            // Iterate through themes
            angular.forEach(themes, function (theme)
            {
                // Iterate through color types (primary, accent, warn & background)
                angular.forEach(theme, function (colorType, colorTypeName)
                {
                    theme[colorTypeName] = colorType.levels;
                    theme[colorTypeName].color = colorType.levels.default.color;
                    theme[colorTypeName].contrast1 = colorType.levels.default.contrast1;
                    theme[colorTypeName].contrast2 = colorType.levels.default.contrast2;
                    theme[colorTypeName].contrast3 = colorType.levels.default.contrast3;
                    theme[colorTypeName].contrast4 = colorType.levels.default.contrast4;
                    delete theme[colorTypeName].default;
                });
            });

            // Store themes and set selected theme for the first time
            fuseTheming.setThemesList(themes);

            // Remember selected theme.
            var selectedTheme = $cookies.get('selectedTheme');

            if ( selectedTheme )
            {
                fuseTheming.setActiveTheme(selectedTheme);
            }
            else
            {
                fuseTheming.setActiveTheme('default');
            }
        }


        /**
         * Render css files
         *
         * @param styleVars
         */
        function render(styleVars)
        {
            var cssTemplate = '[md-theme="@themeName"] a {\n    color: @accentDefaultColor;\n}\n\n[md-theme="@themeName"] .secondary-text,\n[md-theme="@themeName"] .icon {\n    color: @backgroundDefaultContrast2;\n}\n\n[md-theme="@themeName"] .hint-text,\n[md-theme="@themeName"] .disabled-text {\n    color: @backgroundDefaultContrast3;\n}\n\n[md-theme="@themeName"] .fade-text,\n[md-theme="@themeName"] .divider {\n    color: @backgroundDefaultContrast4;\n}\n\n/* Primary */\n[md-theme="@themeName"] .md-primary-bg {\n    background-color: @primaryDefaultColor;\n    color: @primaryDefaultContrast1;\n}\n\n[md-theme="@themeName"] .md-primary-bg .secondary-text,\n[md-theme="@themeName"] .md-primary-bg .icon {\n    color: @primaryDefaultContrast2;\n}\n\n[md-theme="@themeName"] .md-primary-bg .hint-text,\n[md-theme="@themeName"] .md-primary-bg .disabled-text {\n    color: @primaryDefaultContrast3;\n}\n\n[md-theme="@themeName"] .md-primary-bg .fade-text,\n[md-theme="@themeName"] .md-primary-bg .divider {\n    color: @primaryDefaultContrast4;\n}\n\n/* Primary, Hue-1 */\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 {\n    background-color: @primaryHue1Color;\n    color: @primaryHue1Contrast1;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 .secondary-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 .icon {\n    color: @primaryHue1Contrast2;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 .hint-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 .disabled-text {\n    color: @primaryHue1Contrast3;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 .fade-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-1 .divider {\n    color: @primaryHue1Contrast4;\n}\n\n/* Primary, Hue-2 */\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 {\n    background-color: @primaryHue2Color;\n    color: @primaryHue2Contrast1;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 .secondary-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 .icon {\n    color: @primaryHue2Contrast2;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 .hint-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 .disabled-text {\n    color: @primaryHue2Contrast3;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 .fade-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-2 .divider {\n    color: @primaryHue2Contrast4;\n}\n\n/* Primary, Hue-3 */\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 {\n    background-color: @primaryHue3Color;\n    color: @primaryHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 .secondary-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 .icon {\n    color: @primaryHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 .hint-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 .disabled-text {\n    color: @primaryHue3Contrast3;\n}\n\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 .fade-text,\n[md-theme="@themeName"] .md-primary-bg.md-hue-3 .divider {\n    color: @primaryHue3Contrast4;\n}\n\n/* Primary foreground */\n[md-theme="@themeName"] .md-primary-fg {\n    color: @primaryDefaultColor !important;\n}\n\n/* Primary foreground, Hue-1 */\n[md-theme="@themeName"] .md-primary-fg.md-hue-1 {\n    color: @primaryHue1Color !important;\n}\n\n/* Primary foreground, Hue-2 */\n[md-theme="@themeName"] .md-primary-fg.md-hue-2 {\n    color: @primaryHue2Color !important;\n}\n\n/* Primary foreground, Hue-3 */\n[md-theme="@themeName"] .md-primary-fg.md-hue-3 {\n    color: @primaryHue3Color !important;\n}\n\n\n/* Accent */\n[md-theme="@themeName"] .md-accent-bg {\n    background-color: @accentDefaultColor;\n    color: @accentDefaultContrast1;\n}\n\n[md-theme="@themeName"] .md-accent-bg .secondary-text,\n[md-theme="@themeName"] .md-accent-bg .icon {\n    color: @accentDefaultContrast2;\n}\n\n[md-theme="@themeName"] .md-accent-bg .hint-text,\n[md-theme="@themeName"] .md-accent-bg .disabled-text {\n    color: @accentDefaultContrast3;\n}\n\n[md-theme="@themeName"] .md-accent-bg .fade-text,\n[md-theme="@themeName"] .md-accent-bg .divider {\n    color: @accentDefaultContrast4;\n}\n\n/* Accent, Hue-1 */\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 {\n    background-color: @accentHue1Color;\n    color: @accentHue1Contrast1;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 .secondary-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 .icon {\n    color: @accentHue1Contrast2;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 .hint-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 .disabled-text {\n    color: @accentHue1Contrast3;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 .fade-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-1 .divider {\n    color: @accentHue1Contrast4;\n}\n\n/* Accent, Hue-2 */\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 {\n    background-color: @accentHue2Color;\n    color: @accentHue2Contrast1;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 .secondary-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 .icon {\n    color: @accentHue2Contrast2;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 .hint-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 .disabled-text {\n    color: @accentHue2Contrast3;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 .fade-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-2 .divider {\n    color: @accentHue2Contrast4;\n}\n\n/* Accent, Hue-3 */\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 {\n    background-color: @accentHue3Color;\n    color: @accentHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 .secondary-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 .icon {\n    color: @accentHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 .hint-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 .disabled-text {\n    color: @accentHue3Contrast3;\n}\n\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 .fade-text,\n[md-theme="@themeName"] .md-accent-bg.md-hue-3 .divider {\n    color: @accentHue3Contrast4;\n}\n\n/* Accent foreground */\n[md-theme="@themeName"] .md-accent-fg {\n    color: @accentDefaultColor !important;\n}\n\n/* Accent foreground, Hue-1 */\n[md-theme="@themeName"] .md-accent-fg.md-hue-1 {\n    color: @accentHue1Color !important;\n}\n\n/* Accent foreground, Hue-2 */\n[md-theme="@themeName"] .md-accent-fg.md-hue-2 {\n    color: @accentHue2Color !important;\n}\n\n/* Accent foreground, Hue-3 */\n[md-theme="@themeName"] .md-accent-fg.md-hue-3 {\n    color: @accentHue3Color !important;\n}\n\n\n/* Warn */\n[md-theme="@themeName"] .md-warn-bg {\n    background-color: @warnDefaultColor;\n    color: @warnDefaultContrast1;\n}\n\n[md-theme="@themeName"] .md-warn-bg .secondary-text,\n[md-theme="@themeName"] .md-warn-bg .icon {\n    color: @warnDefaultContrast2;\n}\n\n[md-theme="@themeName"] .md-warn-bg .hint-text,\n[md-theme="@themeName"] .md-warn-bg .disabled-text {\n    color: @warnDefaultContrast3;\n}\n\n[md-theme="@themeName"] .md-warn-bg .fade-text,\n[md-theme="@themeName"] .md-warn-bg .divider {\n    color: @warnDefaultContrast4;\n}\n\n/* Warn, Hue-1 */\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 {\n    background-color: @warnHue1Color;\n    color: @warnHue1Contrast1;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 .secondary-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 .icon {\n    color: @warnHue1Contrast2;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 .hint-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 .disabled-text {\n    color: @warnHue1Contrast3;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 .fade-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-1 .divider {\n    color: @warnHue1Contrast4;\n}\n\n/* Warn, Hue-2 */\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 {\n    background-color: @warnHue2Color;\n    color: @warnHue2Contrast1;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 .secondary-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 .icon {\n    color: @warnHue2Contrast2;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 .hint-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 .disabled-text {\n    color: @warnHue2Contrast3;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 .fade-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-2 .divider {\n    color: @warnHue2Contrast4;\n}\n\n/* Warn, Hue-3 */\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 {\n    background-color: @warnHue3Color;\n    color: @warnHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 .secondary-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 .icon {\n    color: @warnHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 .hint-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 .disabled-text {\n    color: @warnHue3Contrast3;\n}\n\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 .fade-text,\n[md-theme="@themeName"] .md-warn-bg.md-hue-3 .divider {\n    color: @warnHue3Contrast4;\n}\n\n/* Warn foreground */\n[md-theme="@themeName"] .md-warn-fg {\n    color: @warnDefaultColor !important;\n}\n\n/* Warn foreground, Hue-1 */\n[md-theme="@themeName"] .md-warn-fg.md-hue-1 {\n    color: @warnHue1Color !important;\n}\n\n/* Warn foreground, Hue-2 */\n[md-theme="@themeName"] .md-warn-fg.md-hue-2 {\n    color: @warnHue2Color !important;\n}\n\n/* Warn foreground, Hue-3 */\n[md-theme="@themeName"] .md-warn-fg.md-hue-3 {\n    color: @warnHue3Color !important;\n}\n\n/* Background */\n[md-theme="@themeName"] .md-background-bg {\n    background-color: @backgroundDefaultColor;\n    color: @backgroundDefaultContrast1;\n}\n\n[md-theme="@themeName"] .md-background-bg .secondary-text,\n[md-theme="@themeName"] .md-background-bg .icon {\n    color: @backgroundDefaultContrast2;\n}\n\n[md-theme="@themeName"] .md-background-bg .hint-text,\n[md-theme="@themeName"] .md-background-bg .disabled-text {\n    color: @backgroundDefaultContrast3;\n}\n\n[md-theme="@themeName"] .md-background-bg .fade-text,\n[md-theme="@themeName"] .md-background-bg .divider {\n    color: @backgroundDefaultContrast4;\n}\n\n/* Background, Hue-1 */\n[md-theme="@themeName"] .md-background-bg.md-hue-1 {\n    background-color: @backgroundHue1Color;\n    color: @backgroundHue1Contrast1;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-1 .secondary-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-1 .icon {\n    color: @backgroundHue1Contrast2;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-1 .hint-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-1 .disabled-text {\n    color: @backgroundHue1Contrast3;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-1 .fade-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-1 .divider {\n    color: @backgroundHue1Contrast4;\n}\n\n/* Background, Hue-2 */\n[md-theme="@themeName"] .md-background-bg.md-hue-2 {\n    background-color: @backgroundHue2Color;\n    color: @backgroundHue2Contrast1;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-2 .secondary-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-2 .icon {\n    color: @backgroundHue2Contrast2;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-2 .hint-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-2 .disabled-text {\n    color: @backgroundHue2Contrast3;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-2 .fade-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-2 .divider {\n    color: @backgroundHue2Contrast4;\n}\n\n/* Background, Hue-3 */\n[md-theme="@themeName"] .md-background-bg.md-hue-3 {\n    background-color: @backgroundHue3Color;\n    color: @backgroundHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-3 .secondary-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-3 .icon {\n    color: @backgroundHue3Contrast1;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-3 .hint-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-3 .disabled-text {\n    color: @backgroundHue3Contrast3;\n}\n\n[md-theme="@themeName"] .md-background-bg.md-hue-3 .fade-text,\n[md-theme="@themeName"] .md-background-bg.md-hue-3 .divider {\n    color: @backgroundHue3Contrast4;\n}\n\n/* Background foreground */\n[md-theme="@themeName"] .md-background-fg {\n    color: @backgroundDefaultColor !important;\n}\n\n/* Background foreground, Hue-1 */\n[md-theme="@themeName"] .md-background-fg.md-hue-1 {\n    color: @backgroundHue1Color !important;\n}\n\n/* Background foreground, Hue-2 */\n[md-theme="@themeName"] .md-background-fg.md-hue-2 {\n    color: @backgroundHue2Color !important;\n}\n\n/* Background foreground, Hue-3 */\n[md-theme="@themeName"] .md-background-fg.md-hue-3 {\n    color: @backgroundHue3Color !important;\n}';

            var regex = new RegExp(Object.keys(styleVars).join('|'), 'gi');
            var css = cssTemplate.replace(regex, function (matched)
            {
                return styleVars[matched];
            });

            var headEl = angular.element('head');
            var styleEl = angular.element('<style type="text/css"></style>');
            styleEl.html(css);
            headEl.append(styleEl);
        }

        /**
         * Convert color array to rgb/rgba
         * Also apply contrasts if needed
         *
         * @param color
         * @param _contrastLevel
         * @returns {string}
         */
        function rgba(color, _contrastLevel)
        {
            var contrastLevel = _contrastLevel || false;

            // Convert 255,255,255,0.XX to 255,255,255
            // According to Google's Material design specs, white primary
            // text must have opacity of 1 and we will fix that here
            // because Angular Material doesn't care about that spec
            if ( color.length === 4 && color[0] === 255 && color[1] === 255 && color[2] === 255 )
            {
                color.splice(3, 4);
            }

            // If contrast level provided, apply it to the current color
            if ( contrastLevel )
            {
                color = applyContrast(color, contrastLevel);
            }

            // Convert color array to color string (rgb/rgba)
            if ( color.length === 3 )
            {
                return 'rgb(' + color.join(',') + ')';
            }
            else if ( color.length === 4 )
            {
                return 'rgba(' + color.join(',') + ')';
            }
            else
            {
                $log.error('Invalid number of arguments supplied in the color array: ' + color.length + '\n' + 'The array must have 3 or 4 colors.');
            }
        }

        /**
         * Apply given contrast level to the given color
         *
         * @param color
         * @param contrastLevel
         */
        function applyContrast(color, contrastLevel)
        {
            var contrastLevels = {
                'white': {
                    '1': '1',
                    '2': '0.7',
                    '3': '0.3',
                    '4': '0.12'
                },
                'black': {
                    '1': '0.87',
                    '2': '0.54',
                    '3': '0.26',
                    '4': '0.12'
                }
            };

            // If white
            if ( color[0] === 255 && color[1] === 255 && color[2] === 255 )
            {
                color[3] = contrastLevels.white[contrastLevel];
            }
            // If black
            else if ( color[0] === 0 && color[1] === 0, color[2] === 0 )
            {
                color[3] = contrastLevels.black[contrastLevel];
            }

            return color;
        }

        /**
         * Uppercase first
         */
        function ucfirst(string)
        {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }
    }

})();
(function ()
{
    'use strict';

    MsThemeOptionsController.$inject = ["$cookies", "fuseTheming"];
    angular
        .module('app.core')
        .controller('MsThemeOptionsController', MsThemeOptionsController)
        .directive('msThemeOptions', msThemeOptions);

    /** @ngInject */
    function MsThemeOptionsController($cookies, fuseTheming)
    {
        var vm = this;

        // Data
        vm.themes = fuseTheming.themes;
        vm.layoutMode = 'wide';
        vm.layoutStyle = $cookies.get('layoutStyle') || 'verticalNavigation';

        // Methods
        vm.setActiveTheme = setActiveTheme;
        vm.updateLayoutMode = updateLayoutMode;
        vm.updateLayoutStyle = updateLayoutStyle;

        //////////

        /**
         * Set active theme
         *
         * @param themeName
         */
        function setActiveTheme(themeName)
        {
            // Set active theme
            fuseTheming.setActiveTheme(themeName);
        }

        /**
         * Update layout mode
         */
        function updateLayoutMode()
        {
            var bodyEl = angular.element('body');

            // Update class on body element
            bodyEl.toggleClass('boxed', (vm.layoutMode === 'boxed'));
        }

        /**
         * Update layout style
         */
        function updateLayoutStyle()
        {
            // Update the cookie
            $cookies.put('layoutStyle', vm.layoutStyle);

            // Reload the page to apply the changes
            location.reload();
        }
    }

    /** @ngInject */
    function msThemeOptions()
    {
        return {
            restrict   : 'E',
            scope      : {
                panelOpen: '=?'
            },
            controller : 'MsThemeOptionsController as vm',
            templateUrl: 'app/core/theme-options/theme-options.html',
            compile    : function (tElement)
            {
                tElement.addClass('ms-theme-options');

                return function postLink(scope, iElement)
                {
                    var bodyEl = angular.element('body'),
                        backdropEl = angular.element('<div class="ms-theme-options-backdrop"></div>');

                    // Panel open status
                    scope.panelOpen = scope.panelOpen || false;

                    /**
                     * Toggle options panel
                     */
                    function toggleOptionsPanel()
                    {
                        if ( scope.panelOpen )
                        {
                            closeOptionsPanel();
                        }
                        else
                        {
                            openOptionsPanel();
                        }
                    }

                    function openOptionsPanel()
                    {
                        // Set panelOpen status
                        scope.panelOpen = true;

                        // Add open class
                        iElement.addClass('open');

                        // Append the backdrop
                        bodyEl.append(backdropEl);

                        // Register the event
                        backdropEl.on('click touch', closeOptionsPanel);
                    }

                    /**
                     * Close options panel
                     */
                    function closeOptionsPanel()
                    {
                        // Set panelOpen status
                        scope.panelOpen = false;

                        // Remove open class
                        iElement.removeClass('open');

                        // De-register the event
                        backdropEl.off('click touch', closeOptionsPanel);

                        // Remove the backdrop
                        backdropEl.remove();
                    }

                    // Expose the toggle function
                    scope.toggleOptionsPanel = toggleOptionsPanel;
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    msUtils.$inject = ["$window"];
    angular
        .module('app.core')
        .factory('msUtils', msUtils);

    /** @ngInject */
    function msUtils($window)
    {
        // Private variables
        var mobileDetect = new MobileDetect($window.navigator.userAgent),
            browserInfo = null;

        var service = {
            exists       : exists,
            detectBrowser: detectBrowser,
            guidGenerator: guidGenerator,
            isMobile     : isMobile,
            toggleInArray: toggleInArray
        };

        return service;

        //////////

        /**
         * Check if item exists in a list
         *
         * @param item
         * @param list
         * @returns {boolean}
         */
        function exists(item, list)
        {
            return list.indexOf(item) > -1;
        }

        /**
         * Returns browser information
         * from user agent data
         *
         * Found at http://www.quirksmode.org/js/detect.html
         * but modified and updated to fit for our needs
         */
        function detectBrowser()
        {
            // If we already tested, do not test again
            if ( browserInfo )
            {
                return browserInfo;
            }

            var browserData = [
                {
                    string       : $window.navigator.userAgent,
                    subString    : 'Edge',
                    versionSearch: 'Edge',
                    identity     : 'Edge'
                },
                {
                    string   : $window.navigator.userAgent,
                    subString: 'Chrome',
                    identity : 'Chrome'
                },
                {
                    string       : $window.navigator.userAgent,
                    subString    : 'OmniWeb',
                    versionSearch: 'OmniWeb/',
                    identity     : 'OmniWeb'
                },
                {
                    string       : $window.navigator.vendor,
                    subString    : 'Apple',
                    versionSearch: 'Version',
                    identity     : 'Safari'
                },
                {
                    prop    : $window.opera,
                    identity: 'Opera'
                },
                {
                    string   : $window.navigator.vendor,
                    subString: 'iCab',
                    identity : 'iCab'
                },
                {
                    string   : $window.navigator.vendor,
                    subString: 'KDE',
                    identity : 'Konqueror'
                },
                {
                    string   : $window.navigator.userAgent,
                    subString: 'Firefox',
                    identity : 'Firefox'
                },
                {
                    string   : $window.navigator.vendor,
                    subString: 'Camino',
                    identity : 'Camino'
                },
                {
                    string   : $window.navigator.userAgent,
                    subString: 'Netscape',
                    identity : 'Netscape'
                },
                {
                    string       : $window.navigator.userAgent,
                    subString    : 'MSIE',
                    identity     : 'Explorer',
                    versionSearch: 'MSIE'
                },
                {
                    string       : $window.navigator.userAgent,
                    subString    : 'Trident/7',
                    identity     : 'Explorer',
                    versionSearch: 'rv'
                },
                {
                    string       : $window.navigator.userAgent,
                    subString    : 'Gecko',
                    identity     : 'Mozilla',
                    versionSearch: 'rv'
                },
                {
                    string       : $window.navigator.userAgent,
                    subString    : 'Mozilla',
                    identity     : 'Netscape',
                    versionSearch: 'Mozilla'
                }
            ];

            var osData = [
                {
                    string   : $window.navigator.platform,
                    subString: 'Win',
                    identity : 'Windows'
                },
                {
                    string   : $window.navigator.platform,
                    subString: 'Mac',
                    identity : 'Mac'
                },
                {
                    string   : $window.navigator.platform,
                    subString: 'Linux',
                    identity : 'Linux'
                },
                {
                    string   : $window.navigator.platform,
                    subString: 'iPhone',
                    identity : 'iPhone'
                },
                {
                    string   : $window.navigator.platform,
                    subString: 'iPod',
                    identity : 'iPod'
                },
                {
                    string   : $window.navigator.platform,
                    subString: 'iPad',
                    identity : 'iPad'
                },
                {
                    string   : $window.navigator.platform,
                    subString: 'Android',
                    identity : 'Android'
                }
            ];

            var versionSearchString = '';

            function searchString(data)
            {
                for ( var i = 0; i < data.length; i++ )
                {
                    var dataString = data[i].string;
                    var dataProp = data[i].prop;

                    versionSearchString = data[i].versionSearch || data[i].identity;

                    if ( dataString )
                    {
                        if ( dataString.indexOf(data[i].subString) !== -1 )
                        {
                            return data[i].identity;

                        }
                    }
                    else if ( dataProp )
                    {
                        return data[i].identity;
                    }
                }
            }

            function searchVersion(dataString)
            {
                var index = dataString.indexOf(versionSearchString);

                if ( index === -1 )
                {
                    return;
                }

                return parseInt(dataString.substring(index + versionSearchString.length + 1));
            }

            var browser = searchString(browserData) || 'unknown-browser';
            var version = searchVersion($window.navigator.userAgent) || searchVersion($window.navigator.appVersion) || 'unknown-version';
            var os = searchString(osData) || 'unknown-os';

            // Prepare and store the object
            browser = browser.toLowerCase();
            version = browser + '-' + version;
            os = os.toLowerCase();

            browserInfo = {
                browser: browser,
                version: version,
                os     : os
            };

            return browserInfo;
        }

        /**
         * Generates a globally unique id
         *
         * @returns {*}
         */
        function guidGenerator()
        {
            var S4 = function ()
            {
                return (((1 + Math.random()) * 0x10000) || 0).toString(16).substring(1);
            };
            return (S4() + S4() + S4() + S4() + S4() + S4());
        }

        /**
         * Return if current device is a
         * mobile device or not
         */
        function isMobile()
        {
            return mobileDetect.mobile();
        }

        /**
         * Toggle in array (push or splice)
         *
         * @param item
         * @param array
         */
        function toggleInArray(item, array)
        {
            if ( array.indexOf(item) === -1 )
            {
                array.push(item);
            }
            else
            {
                array.splice(array.indexOf(item), 1);
            }
        }
    }
}());
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .provider('msApi', msApiProvider);

    /** @ngInject **/
    function msApiProvider()
    {
        /* ----------------- */
        /* Provider          */
        /* ----------------- */
        var provider = this;

        // Inject required services
        var $log = angular.injector(['ng']).get('$log'),
            $resource = angular.injector(['ngResource']).get('$resource');

        // Data
        var baseUrl = '';
        var api = [];

        // Methods
        provider.setBaseUrl = setBaseUrl;
        provider.getBaseUrl = getBaseUrl;
        provider.getApiObject = getApiObject;
        provider.register = register;

        //////////

        /**
         * Set base url for API endpoints
         *
         * @param url {string}
         */
        function setBaseUrl(url)
        {
            baseUrl = url;
        }

        /**
         * Return the base url
         *
         * @returns {string}
         */
        function getBaseUrl()
        {
            return baseUrl;
        }

        /**
         * Return the api object
         *
         * @returns {object}
         */
        function getApiObject()
        {
            return api;
        }

        /**
         * Register API endpoint
         *
         * @param key
         * @param resource
         */
        function register(key, resource)
        {
            if ( !angular.isString(key) )
            {
                $log.error('"path" must be a string (eg. `dashboard.project`)');
                return;
            }

            if ( !angular.isArray(resource) )
            {
                $log.error('"resource" must be an array and it must follow $resource definition');
                return;
            }

            // Prepare the resource object
            var resourceObj = {
                url          : baseUrl + (resource[0] || ''),
                paramDefaults: resource[1] || [],
                actions      : resource[2] || [],
                options      : resource[3] || {}
            };

            // Assign the resource
            api[key] = $resource(resourceObj.url, resourceObj.paramDefaults, resourceObj.actions, resourceObj.options);
        }

        /* ----------------- */
        /* Service           */
        /* ----------------- */
        this.$get = ["$q", "$log", function ($q, $log)
        {
            // Data

            // Methods
            var service = {
                setBaseUrl: setBaseUrl,
                getBaseUrl: getBaseUrl,
                register  : register,
                resolve   : resolve,
                request   : request
            };

            return service;

            //////////

            /**
             * Resolve an API endpoint
             *
             * @param action {string}
             * @param parameters {object}
             * @returns {promise|boolean}
             */
            function resolve(action, parameters)
            {
                var actionParts = action.split('@'),
                    resource = actionParts[0],
                    method = actionParts[1],
                    params = parameters || {};

                if ( !resource || !method )
                {
                    $log.error('msApi.resolve requires correct action parameter (resourceName@methodName)');
                    return false;
                }

                // Create a new deferred object
                var deferred = $q.defer();

                // Get the correct resource definition from api object
                var apiObject = api[resource];

                if ( !apiObject )
                {
                    $log.error('Resource "' + resource + '" is not defined in the api service!');
                    deferred.reject('Resource "' + resource + '" is not defined in the api service!');
                }
                else
                {
                    apiObject[method](params,

                        // Success
                        function (response)
                        {
                            deferred.resolve(response);
                        },

                        // Error
                        function (response)
                        {
                            deferred.reject(response);
                        }
                    );
                }

                // Return the promise
                return deferred.promise;
            }

            /**
             * Make a request to an API endpoint
             *
             * @param action {string}
             * @param [parameters] {object}
             * @param [success] {function}
             * @param [error] {function}
             *
             * @returns {promise|boolean}
             */
            function request(action, parameters, success, error)
            {
                var actionParts = action.split('@'),
                    resource = actionParts[0],
                    method = actionParts[1],
                    params = parameters || {};

                if ( !resource || !method )
                {
                    $log.error('msApi.resolve requires correct action parameter (resourceName@methodName)');
                    return false;
                }

                // Create a new deferred object
                var deferred = $q.defer();

                // Get the correct resource definition from api object
                var apiObject = api[resource];

                if ( !apiObject )
                {
                    $log.error('Resource "' + resource + '" is not defined in the api service!');
                    deferred.reject('Resource "' + resource + '" is not defined in the api service!');
                }
                else
                {
                    apiObject[method](params,

                        // SUCCESS
                        function (response)
                        {
                            // Resolve the promise
                            deferred.resolve(response);

                            // Call the success function if there is one
                            if ( angular.isDefined(success) && angular.isFunction(success) )
                            {
                                success(response);
                            }
                        },

                        // ERROR
                        function (response)
                        {
                            // Reject the promise
                            deferred.reject(response);

                            // Call the error function if there is one
                            if ( angular.isDefined(error) && angular.isFunction(error) )
                            {
                                error(response);
                            }
                        }
                    );
                }

                // Return the promise
                return deferred.promise;
            }
        }];
    }
})();
(function ()
{
    'use strict';

    apiResolverService.$inject = ["$q", "$log", "api"];
    angular
        .module('app.core')
        .factory('apiResolver', apiResolverService);

    /** @ngInject */
    function apiResolverService($q, $log, api)
    {
        var service = {
            resolve: resolve
        };

        return service;

        //////////
        /**
         * Resolve api
         * @param action
         * @param parameters
         */
        function resolve(action, parameters)
        {
            var actionParts = action.split('@'),
                resource = actionParts[0],
                method = actionParts[1],
                params = parameters || {};

            if ( !resource || !method )
            {
                $log.error('apiResolver.resolve requires correct action parameter (ResourceName@methodName)');
                return false;
            }

            // Create a new deferred object
            var deferred = $q.defer();

            // Get the correct api object from api service
            var apiObject = getApiObject(resource);

            if ( !apiObject )
            {
                $log.error('Resource "' + resource + '" is not defined in the api service!');
                deferred.reject('Resource "' + resource + '" is not defined in the api service!');
            }
            else
            {
                apiObject[method](params,

                    // Success
                    function (response)
                    {
                        deferred.resolve(response);
                    },

                    // Error
                    function (response)
                    {
                        deferred.reject(response);
                    }
                );
            }

            // Return the promise
            return deferred.promise;
        }

        /**
         * Get correct api object
         *
         * @param resource
         * @returns {*}
         */
        function getApiObject(resource)
        {
            // Split the resource in case if we have a dot notated object
            var resourceParts = resource.split('.'),
                apiObject = api;

            // Loop through the resource parts and go all the way through
            // the api object and return the correct one
            for ( var l = 0; l < resourceParts.length; l++ )
            {
                if ( angular.isUndefined(apiObject[resourceParts[l]]) )
                {
                    $log.error('Resource part "' + resourceParts[l] + '" is not defined!');
                    apiObject = false;
                    break;
                }

                apiObject = apiObject[resourceParts[l]];
            }

            if ( !apiObject )
            {
                return false;
            }

            return apiObject;
        }
    }

})();
(function ()
{
    'use strict';

    hljsDirective.$inject = ["$timeout", "$q", "$interpolate"];
    angular
        .module('app.core')
        .directive('hljs', hljsDirective);

    /** @ngInject */
    function hljsDirective($timeout, $q, $interpolate)
    {
        return {
            restrict: 'EA',
            compile : function (tElement, tAttrs)
            {
                var code;
                //No attribute? code is the content
                if ( !tAttrs.code )
                {
                    code = tElement.html();
                    tElement.empty();
                }

                return function (scope, iElement, iAttrs)
                {
                    if ( iAttrs.code )
                    {
                        // Attribute? code is the evaluation
                        code = scope.$eval(iAttrs.code);
                    }
                    var shouldInterpolate = scope.$eval(iAttrs.shouldInterpolate);

                    $q.when(code).then(function (code)
                    {
                        if ( code )
                        {
                            if ( shouldInterpolate )
                            {
                                code = $interpolate(code)(scope);
                            }

                            var contentParent = angular.element(
                                '<pre><code class="highlight" ng-non-bindable></code></pre>'
                            );

                            iElement.append(contentParent);

                            // Defer highlighting 1-frame to prevent GA interference...
                            $timeout(function ()
                            {
                                render(code, contentParent);
                            }, 34, false);
                        }
                    });

                    function render(contents, parent)
                    {
                        var codeElement = parent.find('code');
                        var lines = contents.split('\n');

                        // Remove empty lines
                        lines = lines.filter(function (line)
                        {
                            return line.trim().length;
                        });

                        // Make it so each line starts at 0 whitespace
                        var firstLineWhitespace = lines[0].match(/^\s*/)[0];
                        var startingWhitespaceRegex = new RegExp('^' + firstLineWhitespace);

                        lines = lines.map(function (line)
                        {
                            return line
                                .replace(startingWhitespaceRegex, '')
                                .replace(/\s+$/, '');
                        });

                        var highlightedCode = hljs.highlight(iAttrs.language || iAttrs.lang, lines.join('\n'), true);
                        highlightedCode.value = highlightedCode.value
                            .replace(/=<span class="hljs-value">""<\/span>/gi, '')
                            .replace('<head>', '')
                            .replace('<head/>', '');
                        codeElement.append(highlightedCode.value).addClass('highlight');
                    }
                };
            }
        };
    }
})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .filter('filterByTags', filterByTags)
        .filter('filterSingleByTags', filterSingleByTags);

    /** @ngInject */
    function filterByTags()
    {
        return function (items, tags)
        {
            if ( items.length === 0 || tags.length === 0 )
            {
                return items;
            }

            var filtered = [];

            items.forEach(function (item)
            {
                var match = tags.every(function (tag)
                {
                    var tagExists = false;

                    item.tags.forEach(function (itemTag)
                    {
                        if ( itemTag.name === tag.name )
                        {
                            tagExists = true;
                            return;
                        }
                    });

                    return tagExists;
                });

                if ( match )
                {
                    filtered.push(item);
                }
            });

            return filtered;
        };
    }

    /** @ngInject */
    function filterSingleByTags()
    {
        return function (itemTags, tags)
        {
            if ( itemTags.length === 0 || tags.length === 0 )
            {
                return;
            }

            if ( itemTags.length < tags.length )
            {
                return [];
            }

            var filtered = [];

            var match = tags.every(function (tag)
            {
                var tagExists = false;

                itemTags.forEach(function (itemTag)
                {
                    if ( itemTag.name === tag.name )
                    {
                        tagExists = true;
                        return;
                    }
                });

                return tagExists;
            });

            if ( match )
            {
                filtered.push(itemTags);
            }

            return filtered;
        };
    }

})();
(function ()
{
    'use strict';

    toTrustedFilter.$inject = ["$sce"];
    angular
        .module('app.core')
        .filter('toTrusted', toTrustedFilter)
        .filter('htmlToPlaintext', htmlToPlainTextFilter)
        .filter('nospace', nospaceFilter)
        .filter('humanizeDoc', humanizeDocFilter);

    /** @ngInject */
    function toTrustedFilter($sce)
    {
        return function (value)
        {
            return $sce.trustAsHtml(value);
        };
    }

    /** @ngInject */
    function htmlToPlainTextFilter()
    {
        return function (text)
        {
            return String(text).replace(/<[^>]+>/gm, '');
        };
    }

    /** @ngInject */
    function nospaceFilter()
    {
        return function (value)
        {
            return (!value) ? '' : value.replace(/ /g, '');
        };
    }

    /** @ngInject */
    function humanizeDocFilter()
    {
        return function (doc)
        {
            if ( !doc )
            {
                return;
            }
            if ( doc.type === 'directive' )
            {
                return doc.name.replace(/([A-Z])/g, function ($1)
                {
                    return '-' + $1.toLowerCase();
                });
            }
            return doc.label || doc.name;
        };
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.core')
        .provider('fuseConfig', fuseConfigProvider);

    /** @ngInject */
    function fuseConfigProvider()
    {
        // Default configuration
        var fuseConfiguration = {
            'disableCustomScrollbars'        : false,
            'disableMdInkRippleOnMobile'     : true,
            'disableCustomScrollbarsOnMobile': true
        };

        // Methods
        this.config = config;

        //////////

        /**
         * Extend default configuration with the given one
         *
         * @param configuration
         */
        function config(configuration)
        {
            fuseConfiguration = angular.extend({}, fuseConfiguration, configuration);
        }

        /**
         * Service
         */
        this.$get = function ()
        {
            var service = {
                getConfig: getConfig,
                setConfig: setConfig
            };

            return service;

            //////////

            /**
             * Returns a config value
             */
            function getConfig(configName)
            {
                if ( angular.isUndefined(fuseConfiguration[configName]) )
                {
                    return false;
                }

                return fuseConfiguration[configName];
            }

            /**
             * Creates or updates config object
             *
             * @param configName
             * @param configValue
             */
            function setConfig(configName, configValue)
            {
                fuseConfiguration[configName] = configValue;
            }
        };
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$translatePartialLoaderProvider"];
    angular
        .module('app.toolbar', [])
        .config(config);

    /** @ngInject */
    function config($translatePartialLoaderProvider)
    {
        $translatePartialLoaderProvider.addPart('app/toolbar');
    }
})();

(function ()
{
    'use strict';

    ToolbarController.$inject = ["$rootScope", "$mdSidenav", "$translate", "$mdToast"];
    angular
        .module('app.toolbar')
        .controller('ToolbarController', ToolbarController);

    /** @ngInject */
    function ToolbarController($rootScope, $mdSidenav, $translate, $mdToast)
    {
        var vm = this;

        // Data
        $rootScope.global = {
            search: ''
        };

        vm.bodyEl = angular.element('body');
        vm.userStatusOptions = [
            {
                'title': 'Online',
                'icon' : 'icon-checkbox-marked-circle',
                'color': '#4CAF50'
            },
            {
                'title': 'Away',
                'icon' : 'icon-clock',
                'color': '#FFC107'
            },
            {
                'title': 'Do not Disturb',
                'icon' : 'icon-minus-circle',
                'color': '#F44336'
            },
            {
                'title': 'Invisible',
                'icon' : 'icon-checkbox-blank-circle-outline',
                'color': '#BDBDBD'
            },
            {
                'title': 'Offline',
                'icon' : 'icon-checkbox-blank-circle-outline',
                'color': '#616161'
            }
        ];
        vm.languages = {
            en: {
                'title'      : 'English',
                'translation': 'TOOLBAR.ENGLISH',
                'code'       : 'en',
                'flag'       : 'us'
            },
            es: {
                'title'      : 'Spanish',
                'translation': 'TOOLBAR.SPANISH',
                'code'       : 'es',
                'flag'       : 'es'
            },
            tr: {
                'title'      : 'Turkish',
                'translation': 'TOOLBAR.TURKISH',
                'code'       : 'tr',
                'flag'       : 'tr'
            }
        };

        // Methods
        vm.toggleSidenav = toggleSidenav;
        vm.logout = logout;
        vm.changeLanguage = changeLanguage;
        vm.setUserStatus = setUserStatus;
        vm.toggleHorizontalMobileMenu = toggleHorizontalMobileMenu;

        //////////

        init();

        /**
         * Initialize
         */
        function init()
        {
            // Select the first status as a default
            vm.userStatus = vm.userStatusOptions[0];

            // Get the selected language directly from angular-translate module setting
            vm.selectedLanguage = vm.languages[$translate.preferredLanguage()];
        }


        /**
         * Toggle sidenav
         *
         * @param sidenavId
         */
        function toggleSidenav(sidenavId)
        {
            $mdSidenav(sidenavId).toggle();
        }

        /**
         * Sets User Status
         * @param status
         */
        function setUserStatus(status)
        {
            vm.userStatus = status;
        }

        /**
         * Logout Function
         */
        function logout()
        {
            // Do logout here..
        }

        /**
         * Change Language
         */
        function changeLanguage(lang)
        {
            vm.selectedLanguage = lang;

            /**
             * Show temporary message if user selects a language other than English
             *
             * angular-translate module will try to load language specific json files
             * as soon as you change the language. And because we don't have them, there
             * will be a lot of errors in the page potentially breaking couple functions
             * of the template.
             *
             * To prevent that from happening, we added a simple "return;" statement at the
             * end of this if block. If you have all the translation files, remove this if
             * block and the translations should work without any problems.
             */
            if ( lang.code !== 'en' )
            {
                var message = 'Fuse supports translations through angular-translate module, but currently we do not have any translations other than English language. If you want to help us, send us a message through ThemeForest profile page.';

                $mdToast.show({
                    template : '<md-toast id="language-message" layout="column" layout-align="center start"><div class="md-toast-content">' + message + '</div></md-toast>',
                    hideDelay: 7000,
                    position : 'top right',
                    parent   : '#content'
                });

                return;
            }

            // Change the language
            $translate.use(lang.code);
        }

        /**
         * Toggle horizontal mobile menu
         */
        function toggleHorizontalMobileMenu()
        {
            vm.bodyEl.toggleClass('ms-navigation-horizontal-mobile-menu-active');
        }
    }

})();
(function ()
{
    'use strict';

    QuickPanelController.$inject = ["msApi"];
    angular
        .module('app.quick-panel')
        .controller('QuickPanelController', QuickPanelController);

    /** @ngInject */
    function QuickPanelController(msApi)
    {
        var vm = this;

        // Data
        vm.date = new Date();
        vm.settings = {
            notify: true,
            cloud : false,
            retro : true
        };

        msApi.request('quickPanel.activities@get', {},
            // Success
            function (response)
            {
                vm.activities = response.data;
            }
        );

        msApi.request('quickPanel.events@get', {},
            // Success
            function (response)
            {
                vm.events = response.data;
            }
        );

        msApi.request('quickPanel.notes@get', {},
            // Success
            function (response)
            {
                vm.notes = response.data;
            }
        );

        // Methods

        //////////
    }

})();
(function ()
{
    'use strict';

    angular
        .module('app.navigation', [])
        .config(config);

    /** @ngInject */
    function config()
    {
        
    }

})();
(function ()
{
    'use strict';

    NavigationController.$inject = ["$scope"];
    angular
        .module('app.navigation')
        .controller('NavigationController', NavigationController);

    /** @ngInject */
    function NavigationController($scope)
    {
        var vm = this;

        // Data
        vm.bodyEl = angular.element('body');
        vm.folded = false;
        vm.msScrollOptions = {
            suppressScrollX: true
        };

        // Methods
        vm.toggleMsNavigationFolded = toggleMsNavigationFolded;

        //////////

        /**
         * Toggle folded status
         */
        function toggleMsNavigationFolded()
        {
            vm.folded = !vm.folded;
        }

        // Close the mobile menu on $stateChangeSuccess
        $scope.$on('$stateChangeSuccess', function ()
        {
            vm.bodyEl.removeClass('ms-navigation-horizontal-mobile-menu-active');
        });
    }

})();
(function ()
{
    'use strict';

    /**
     * Main module of the Fuse
     */
    angular
        .module('fuse', [

            // Core
            'app.core',

            // Navigation
            'app.navigation',

            // Toolbar
            'app.toolbar',

            // Quick panel
            'app.quick-panel',

            // Apps
            'app.dashboards',
            'app.calendar',
            'app.mail',
            'app.file-manager',
            'app.scrumboard',
            'app.gantt-chart',
            'app.todo',

            // Pages
            'app.pages',

            // User Interface
            'app.ui',

            // Components
            'app.components'
        ]);
})();
(function ()
{
    'use strict';

    MainController.$inject = ["$scope", "$rootScope"];
    angular
        .module('fuse')
        .controller('MainController', MainController);

    /** @ngInject */
    function MainController($scope, $rootScope)
    {
        // Data

        //////////

        // Remove the splash screen
        $scope.$on('$viewContentAnimationEnded', function (event)
        {
            if ( event.targetScope.$id === $scope.$id )
            {
                $rootScope.$broadcast('msSplashScreen::remove');
            }
        });
    }
})();
(function ()
{
    'use strict';

    runBlock.$inject = ["msUtils", "fuseGenerator", "fuseConfig"];
    angular
        .module('app.core')
        .run(runBlock);

    /** @ngInject */
    function runBlock(msUtils, fuseGenerator, fuseConfig)
    {
        /**
         * Generate extra classes based on registered themes so we
         * can use same colors with non-angular-material elements
         */
        fuseGenerator.generate();

        /**
         * Disable md-ink-ripple effects on mobile
         * if 'disableMdInkRippleOnMobile' config enabled
         */
        if ( fuseConfig.getConfig('disableMdInkRippleOnMobile') && msUtils.isMobile() )
        {
            var bodyEl = angular.element('body');
            bodyEl.attr('md-no-ink', true);
        }

        /**
         * Put isMobile() to the html as a class
         */
        if ( msUtils.isMobile() )
        {
            angular.element('html').addClass('is-mobile');
        }

        /**
         * Put browser information to the html as a class
         */
        var browserInfo = msUtils.detectBrowser();
        if ( browserInfo )
        {
            var htmlClass = browserInfo.browser + ' ' + browserInfo.version + ' ' + browserInfo.os;
            angular.element('html').addClass(htmlClass);
        }
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["$ariaProvider", "$logProvider", "msScrollConfigProvider", "uiGmapGoogleMapApiProvider", "$translateProvider", "$provide", "fuseConfigProvider"];
    angular
        .module('app.core')
        .config(config);

    /** @ngInject */
    function config($ariaProvider, $logProvider, msScrollConfigProvider, uiGmapGoogleMapApiProvider, $translateProvider, $provide, fuseConfigProvider)
    {
        // Enable debug logging
        $logProvider.debugEnabled(true);

        // toastr configuration
        toastr.options.timeOut = 3000;
        toastr.options.positionClass = 'toast-top-right';
        toastr.options.preventDuplicates = true;
        toastr.options.progressBar = true;

        // uiGmapgoogle-maps configuration
        uiGmapGoogleMapApiProvider.configure({
            //    key: 'your api key',
            v        : '3.exp',
            libraries: 'weather,geometry,visualization'
        });

        // angular-translate configuration
        $translateProvider.useLoader('$translatePartialLoader', {
            urlTemplate: '{part}/i18n/{lang}.json'
        });
        $translateProvider.preferredLanguage('en');
        $translateProvider.useSanitizeValueStrategy('sanitize');

        // Text Angular options
        $provide.decorator('taOptions', [
            '$delegate', function (taOptions)
            {
                taOptions.toolbar = [
                    ['bold', 'italics', 'underline', 'ul', 'ol', 'quote']
                ];

                taOptions.classes = {
                    focussed           : 'focussed',
                    toolbar            : 'ta-toolbar',
                    toolbarGroup       : 'ta-group',
                    toolbarButton      : 'md-button',
                    toolbarButtonActive: 'active',
                    disabled           : '',
                    textEditor         : 'form-control',
                    htmlEditor         : 'form-control'
                };

                return taOptions;
            }
        ]);

        // Text Angular tools
        $provide.decorator('taTools', [
            '$delegate', function (taTools)
            {
                taTools.bold.iconclass = 'icon-format-bold';
                taTools.italics.iconclass = 'icon-format-italic';
                taTools.underline.iconclass = 'icon-format-underline';
                taTools.ul.iconclass = 'icon-format-list-bulleted';
                taTools.ol.iconclass = 'icon-format-list-numbers';
                taTools.quote.iconclass = 'icon-format-quote';

                return taTools;
            }
        ]);

        /*eslint-disable */

        // ng-aria configuration
        $ariaProvider.config({
            tabindex: false
        });

        // Fuse theme configurations
        fuseConfigProvider.config({
            'disableCustomScrollbars'        : false,
            'disableCustomScrollbarsOnMobile': true,
            'disableMdInkRippleOnMobile'     : true
        });

        // msScroll configuration
        msScrollConfigProvider.config({
            wheelPropagation: true
        });

        /*eslint-enable */
    }
})();
(function ()
{
    'use strict';

    runBlock.$inject = ["$rootScope", "$timeout", "$state"];
    angular
        .module('fuse')
        .run(runBlock);

    /** @ngInject */
    function runBlock($rootScope, $timeout, $state)
    {
        // Activate loading indicator
        var stateChangeStartEvent = $rootScope.$on('$stateChangeStart', function ()
        {
            $rootScope.loadingProgress = true;
        });

        // De-activate loading indicator
        var stateChangeSuccessEvent = $rootScope.$on('$stateChangeSuccess', function ()
        {
            $timeout(function ()
            {
                $rootScope.loadingProgress = false;
            });
        });

        // Store state in the root scope for easy access
        $rootScope.state = $state;

        // Cleanup
        $rootScope.$on('$destroy', function ()
        {
            stateChangeStartEvent();
            stateChangeSuccessEvent();
        });
    }
})();
(function ()
{
    'use strict';

    routeConfig.$inject = ["$stateProvider", "$urlRouterProvider", "$locationProvider"];
    angular
        .module('fuse')
        .config(routeConfig);

    /** @ngInject */
    function routeConfig($stateProvider, $urlRouterProvider, $locationProvider)
    {
        $locationProvider.html5Mode(true);

        $urlRouterProvider.otherwise('/dashboard-project');

        /**
         * Layout Style Switcher
         *
         * This code is here for demonstration purposes.
         * If you don't need to switch between the layout
         * styles like in the demo, you can set one manually by
         * typing the template urls into the `State definitions`
         * area and remove this code
         */
        // Inject $cookies
        var $cookies;

        angular.injector(['ngCookies']).invoke([
            '$cookies', function (_$cookies)
            {
                $cookies = _$cookies;
            }
        ]);

        // Get active layout
        var layoutStyle = $cookies.get('layoutStyle') || 'verticalNavigation';

        var layouts = {
            verticalNavigation  : {
                main      : 'app/core/layouts/vertical-navigation.html',
                toolbar   : 'app/toolbar/layouts/vertical-navigation/toolbar.html',
                navigation: 'app/navigation/layouts/vertical-navigation/navigation.html'
            },
            horizontalNavigation: {
                main      : 'app/core/layouts/horizontal-navigation.html',
                toolbar   : 'app/toolbar/layouts/horizontal-navigation/toolbar.html',
                navigation: 'app/navigation/layouts/horizontal-navigation/navigation.html'
            },
            contentOnly         : {
                main      : 'app/core/layouts/content-only.html',
                toolbar   : '',
                navigation: ''
            },
            contentWithToolbar  : {
                main      : 'app/core/layouts/content-with-toolbar.html',
                toolbar   : 'app/toolbar/layouts/content-with-toolbar/toolbar.html',
                navigation: ''
            }
        };
        // END - Layout Style Switcher

        // State definitions
        $stateProvider
            .state('app', {
                abstract: true,
                views   : {
                    'main@'         : {
                        templateUrl: layouts[layoutStyle].main,
                        controller : 'MainController as vm'
                    },
                    'toolbar@app'   : {
                        templateUrl: layouts[layoutStyle].toolbar,
                        controller : 'ToolbarController as vm'
                    },
                    'navigation@app': {
                        templateUrl: layouts[layoutStyle].navigation,
                        controller : 'NavigationController as vm'
                    },
                    'quickPanel@app': {
                        templateUrl: 'app/quick-panel/quick-panel.html',
                        controller : 'QuickPanelController as vm'
                    }
                }
            });
    }

})();
(function ()
{
    'use strict';

    IndexController.$inject = ["fuseTheming"];
    angular
        .module('fuse')
        .controller('IndexController', IndexController);

    /** @ngInject */
    function IndexController(fuseTheming)
    {
        var vm = this;

        // Data
        vm.themes = fuseTheming.themes;

        //////////
    }
})();
(function ()
{
    'use strict';

    angular
        .module('fuse');
})();

(function ()
{
    'use strict';

    angular
        .module('fuse')
        .config(config);

    /** @ngInject */
    function config()
    {
        // Put your custom configurations here
    }

})();
(function ()
{
    'use strict';

    apiService.$inject = ["$resource"];
    angular
        .module('fuse')
        .factory('api', apiService);

    /** @ngInject */
    function apiService($resource)
    {
        /**
         * You can use this service to define your API urls. The "api" service
         * is designed to work in parallel with "apiResolver" service which you can
         * find in the "app/core/services/api-resolver.service.js" file.
         *
         * You can structure your API urls whatever the way you want to structure them.
         * You can either use very simple definitions, or you can use multi-dimensional
         * objects.
         *
         * Here's a very simple API url definition example:
         *
         *      api.getBlogList = $resource('http://api.example.com/getBlogList');
         *
         * While this is a perfectly valid $resource definition, most of the time you will
         * find yourself in a more complex situation where you want url parameters:
         *
         *      api.getBlogById = $resource('http://api.example.com/blog/:id', {id: '@id'});
         *
         * You can also define your custom methods. Custom method definitions allow you to
         * add hardcoded parameters to your API calls that you want to sent every time you
         * make that API call:
         *
         *      api.getBlogById = $resource('http://api.example.com/blog/:id', {id: '@id'}, {
         *         'getFromHomeCategory' : {method: 'GET', params: {blogCategory: 'home'}}
         *      });
         *
         * In addition to these definitions, you can also create multi-dimensional objects.
         * They are nothing to do with the $resource object, it's just a more convenient
         * way that we have created for you to packing your related API urls together:
         *
         *      api.blog = {
         *                   list     : $resource('http://api.example.com/blog'),
         *                   getById  : $resource('http://api.example.com/blog/:id', {id: '@id'}),
         *                   getByDate: $resource('http://api.example.com/blog/:date', {id: '@date'}, {
         *                       get: {
         *                            method: 'GET',
         *                            params: {
         *                                getByDate: true
         *                            }
         *                       }
         *                   })
         *       }
         *
         * If you look at the last example from above, we overrode the 'get' method to put a
         * hardcoded parameter. Now every time we make the "getByDate" call, the {getByDate: true}
         * object will also be sent along with whatever data we are sending.
         *
         * All the above methods are using standard $resource service. You can learn more about
         * it at: https://docs.angularjs.org/api/ngResource/service/$resource
         *
         * -----
         *
         * After you defined your API urls, you can use them in Controllers, Services and even
         * in the UIRouter state definitions.
         *
         * If we use the last example from above, you can do an API call in your Controllers and
         * Services like this:
         *
         *      function MyController (api)
         *      {
         *          // Get the blog list
         *          api.blog.list.get({},
         *
         *              // Success
         *              function (response)
         *              {
         *                  console.log(response);
         *              },
         *
         *              // Error
         *              function (response)
         *              {
         *                  console.error(response);
         *              }
         *          );
         *
         *          // Get the blog with the id of 3
         *          var id = 3;
         *          api.blog.getById.get({'id': id},
         *
         *              // Success
         *              function (response)
         *              {
         *                  console.log(response);
         *              },
         *
         *              // Error
         *              function (response)
         *              {
         *                  console.error(response);
         *              }
         *          );
         *
         *          // Get the blog with the date by using custom defined method
         *          var date = 112314232132;
         *          api.blog.getByDate.get({'date': date},
         *
         *              // Success
         *              function (response)
         *              {
         *                  console.log(response);
         *              },
         *
         *              // Error
         *              function (response)
         *              {
         *                  console.error(response);
         *              }
         *          );
         *      }
         *
         * Because we are directly using $resource service, all your API calls will return a
         * $promise object.
         *
         * --
         *
         * If you want to do the same calls in your UI Router state definitions, you need to use
         * "apiResolver" service we have prepared for you:
         *
         *      $stateProvider.state('app.blog', {
         *          url      : '/blog',
         *          views    : {
         *               'content@app': {
         *                   templateUrl: 'app/main/apps/blog/blog.html',
         *                   controller : 'BlogController as vm'
         *               }
         *          },
         *          resolve  : {
         *              Blog: function (apiResolver)
         *              {
         *                  return apiResolver.resolve('blog.list@get');
         *              }
         *          }
         *      });
         *
         *  You can even use parameters with apiResolver service:
         *
         *      $stateProvider.state('app.blog.show', {
         *          url      : '/blog/:id',
         *          views    : {
         *               'content@app': {
         *                   templateUrl: 'app/main/apps/blog/blog.html',
         *                   controller : 'BlogController as vm'
         *               }
         *          },
         *          resolve  : {
         *              Blog: function (apiResolver, $stateParams)
         *              {
         *                  return apiResolver.resolve('blog.getById@get', {'id': $stateParams.id);
         *              }
         *          }
         *      });
         *
         *  And the "Blog" object will be available in your BlogController:
         *
         *      function BlogController(Blog)
         *      {
         *          var vm = this;
         *
         *          // Data
         *          vm.blog = Blog;
         *
         *          ...
         *      }
         */

        var api = {};

        // Base Url
        api.baseUrl = 'app/data/';

        /**
         * Here you can find all the definitions that the Demo Project requires
         *
         * If you wish to use this method, you can create your API definitions
         * in a similar way.
         */

        /*
         api.dashboard = {
         project  : $resource(api.baseUrl + 'dashboard/project/data.json'),
         server   : $resource(api.baseUrl + 'dashboard/server/data.json'),
         analytics: $resource(api.baseUrl + 'dashboard/analytics/data.json')
         };

         api.cards = $resource(api.baseUrl + 'cards/cards.json');

         api.fileManager = {
         documents: $resource(api.baseUrl + 'file-manager/documents.json')
         };

         api.ganttChart = {
         tasks: $resource(api.baseUrl + 'gantt-chart/tasks.json'),
         timespans : $resource(api.baseUrl + 'gantt-chart/timespans.json')
         };

         api.icons = $resource('assets/icons/selection.json');

         api.invoice = $resource(api.baseUrl + 'invoice/invoice.json');

         api.mail = {
         inbox: $resource(api.baseUrl + 'mail/inbox.json')
         };

         api.profile = {
         timeline    : $resource(api.baseUrl + 'profile/timeline.json'),
         about       : $resource(api.baseUrl + 'profile/about.json'),
         photosVideos: $resource(api.baseUrl + 'profile/photos-videos.json')
         };

         api.quickPanel = {
         activities: $resource(api.baseUrl + 'quick-panel/activities.json'),
         contacts  : $resource(api.baseUrl + 'quick-panel/contacts.json'),
         events    : $resource(api.baseUrl + 'quick-panel/events.json'),
         notes     : $resource(api.baseUrl + 'quick-panel/notes.json')
         };

         api.search = {
         classic : $resource(api.baseUrl + 'search/classic.json'),
         mails   : $resource(api.baseUrl + 'search/mails.json'),
         users   : $resource(api.baseUrl + 'search/users.json'),
         contacts: $resource(api.baseUrl + 'search/contacts.json')
         };

         api.scrumboard = {
         boardList: $resource(api.baseUrl + 'scrumboard/boardList.json'),
         board    : $resource(api.baseUrl + 'scrumboard/boards/:id.json')
         };

         api.tables = {
         employees   : $resource(api.baseUrl + 'tables/employees.json'),
         employees100: $resource(api.baseUrl + 'tables/employees100.json')
         };

         api.timeline = {
         page1: $resource(api.baseUrl + 'timeline/page-1.json'),
         page2: $resource(api.baseUrl + 'timeline/page-2.json'),
         page3: $resource(api.baseUrl + 'timeline/page-3.json')
         };

         api.todo = {
         tasks: $resource(api.baseUrl + 'todo/tasks.json'),
         tags : $resource(api.baseUrl + 'todo/tags.json')
         };
         */

        return api;
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["$stateProvider", "$translatePartialLoaderProvider", "msNavigationServiceProvider"];
    angular
        .module('app.pages.auth.login-v2', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider.state('app.pages_auth_login-v2', {
            url      : '/pages/auth/login-v2',
            views    : {
                'main@'                          : {
                    templateUrl: 'app/core/layouts/content-only.html',
                    controller : 'MainController as vm'
                },
                'content@app.pages_auth_login-v2': {
                    templateUrl: 'app/main/pages/auth/login-v2/login-v2.html',
                    controller : 'LoginV2Controller as vm'
                }
            },
            bodyClass: 'login-v2'
        });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/pages/auth/login-v2');

        // Navigation
        msNavigationServiceProvider.saveItem('pages.auth.login-v2', {
            title : 'Login v2',
            state : 'app.pages_auth_login-v2',
            weight: 2
        });
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["msNavigationServiceProvider"];
    angular
        .module('app.dashboards', [
            'app.dashboards.project',
            'app.dashboards.server',
            'app.dashboards.analytics'
        ])
        .config(config);

    /** @ngInject */
    function config(msNavigationServiceProvider)
    {
        // Navigation
        msNavigationServiceProvider.saveItem('apps', {
            title : 'APPS',
            group : true,
            weight: 1
        });

        msNavigationServiceProvider.saveItem('apps.dashboards', {
            title : 'Dashboards',
            icon  : 'icon-tile-four',
            weight: 1
        });

        msNavigationServiceProvider.saveItem('apps.dashboards.project', {
            title: 'Project',
            state: 'app.dashboards_project'
        });

        msNavigationServiceProvider.saveItem('apps.dashboards.server', {
            title: 'Server',
            state: 'app.dashboards_server'
        });

        msNavigationServiceProvider.saveItem('apps.dashboards.analytics', {
            title: 'Analytics',
            state: 'app.dashboards_analytics'
        });
    }

})();
(function ()
{
    'use strict';

    config.$inject = ["msNavigationServiceProvider"];
    angular
        .module('app.ui', [
            'app.ui.forms',
            'app.ui.icons',
            'app.ui.material-colors',
            'app.ui.page-layouts.blank',
            'app.ui.page-layouts.carded.fullwidth',
            'app.ui.page-layouts.carded.fullwidth-ii',
            'app.ui.page-layouts.carded.left-sidenav',
            'app.ui.page-layouts.carded.left-sidenav-ii',
            'app.ui.page-layouts.carded.right-sidenav',
            'app.ui.page-layouts.carded.right-sidenav-ii',
            'app.ui.page-layouts.simple.fullwidth',
            'app.ui.page-layouts.simple.left-sidenav',
            'app.ui.page-layouts.simple.left-sidenav-ii',
            'app.ui.page-layouts.simple.right-sidenav',
            'app.ui.page-layouts.simple.right-sidenav-ii',
            'app.ui.page-layouts.simple.tabbed',
            'app.ui.theme-colors',
            'app.ui.typography'
        ])
        .config(config);

    /** @ngInject */
    function config(msNavigationServiceProvider)
    {
        // Navigation
        msNavigationServiceProvider.saveItem('ui', {
            title : 'USER INTERFACE',
            group : true,
            weight: 3
        });

        msNavigationServiceProvider.saveItem('ui.forms', {
            title: 'Forms',
            icon : 'icon-window-restore',
            state: 'app.ui_forms'
        });

        msNavigationServiceProvider.saveItem('ui.icons', {
            title: 'Icons',
            icon : 'icon-file-image-box',
            state: 'app.ui_icons'
        });

        msNavigationServiceProvider.saveItem('ui.typography', {
            title: 'Typography',
            icon : 'icon-format-size',
            state: 'app.ui_typography'
        });

        msNavigationServiceProvider.saveItem('ui.theme-colors', {
            title: 'Theme Colors',
            icon : 'icon-palette-advanced',
            state: 'app.ui_theme-colors'
        });

        msNavigationServiceProvider.saveItem('ui.material-colors', {
            title: 'Material Colors',
            icon : 'icon-palette',
            state: 'app.ui_material-colors'
        });


        msNavigationServiceProvider.saveItem('ui.page-layouts', {
            title: 'Page Layouts',
            icon : 'icon-view-quilt'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.carded', {
            title: 'Carded'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.carded.fullwidth', {
            title: 'Full Width (I)',
            state: 'app.ui_page-layouts_carded_fullwidth'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.carded.fullwidth-ii', {
            title: 'Full Width (II)',
            state: 'app.ui_page-layouts_carded_fullwidth-ii'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.carded.left-sidenav', {
            title: 'Left Sidenav (I)',
            state: 'app.ui_page-layouts_carded_left-sidenav'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.carded.left-sidenav-ii', {
            title: 'Left Sidenav (II)',
            state: 'app.ui_page-layouts_carded_left-sidenav-ii'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.carded.right-sidenav', {
            title: 'Right Sidenav (I)',
            state: 'app.ui_page-layouts_carded_right-sidenav'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.carded.right-sidenav-ii', {
            title: 'Right Sidenav (II)',
            state: 'app.ui_page-layouts_carded_right-sidenav-ii'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.simple', {
            title: 'Simple'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.simple.fullwidth', {
            title: 'Full Width (I)',
            state: 'app.ui_page-layouts_simple_fullwidth'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.simple.left-sidenav', {
            title: 'Left Sidenav (I)',
            state: 'app.ui_page-layouts_simple_left-sidenav'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.simple.left-sidenav-ii', {
            title: 'Left Sidenav (II)',
            state: 'app.ui_page-layouts_simple_left-sidenav-ii'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.simple.right-sidenav', {
            title: 'Right Sidenav (I)',
            state: 'app.ui_page-layouts_simple_right-sidenav'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.simple.right-sidenav-ii', {
            title: 'Right Sidenav (II)',
            state: 'app.ui_page-layouts_simple_right-sidenav-ii'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.simple.tabbed', {
            title: 'Tabbed',
            state: 'app.ui_page-layouts_simple_tabbed'
        });

        msNavigationServiceProvider.saveItem('ui.page-layouts.blank', {
            title: 'Blank',
            state: 'app.ui_page-layouts_blank'
        });
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["msNavigationServiceProvider"];
    angular
        .module('app.pages', [
            'app.pages.auth.login',
            'app.pages.auth.login-v2',
            'app.pages.auth.register',
            'app.pages.auth.register-v2',
            'app.pages.auth.forgot-password',
            'app.pages.auth.reset-password',
            'app.pages.auth.lock',
            'app.pages.coming-soon',
            'app.pages.error-404',
            'app.pages.error-500',
            'app.pages.invoice',
            'app.pages.maintenance',
            'app.pages.profile',
            'app.pages.search',
            'app.pages.timeline'
        ])
        .config(config);

    /** @ngInject */
    function config(msNavigationServiceProvider)
    {
        // Navigation
        msNavigationServiceProvider.saveItem('pages', {
            title : 'PAGES',
            group : true,
            weight: 2
        });
    }
})();
(function ()
{
    'use strict';

    config.$inject = ["msNavigationServiceProvider"];
    angular
        .module('app.components', [
            'app.components.cards',
            'app.components.charts.c3',
            'app.components.charts.chartist',
            'app.components.charts.chart-js',
            'app.components.charts.nvd3',
            'app.components.maps',
            'app.components.price-tables',
            'app.components.tables.simple-table',
            'app.components.tables.datatable',
            'app.components.widgets',
            'app.components.material-docs'
        ])
        .config(config);

    /** @ngInject */
    function config(msNavigationServiceProvider)
    {
        // Navigation
        msNavigationServiceProvider.saveItem('components', {
            title : 'COMPONENTS',
            group : true,
            weight: 4
        });

        msNavigationServiceProvider.saveItem('components.cards', {
            title : 'Cards',
            icon  : 'icon-content-copy',
            state : 'app.components_cards'
        });

        msNavigationServiceProvider.saveItem('components.charts', {
            title: 'Charts',
            icon : 'icon-poll'
        });

        msNavigationServiceProvider.saveItem('components.charts.c3', {
            title: 'C3',
            state: 'app.components_charts_c3'
        });

        msNavigationServiceProvider.saveItem('components.charts.chart-js', {
            title: 'Chart.js',
            state: 'app.components_charts_chart-js'
        });

        msNavigationServiceProvider.saveItem('components.charts.chartist', {
            title: 'Chartist',
            state: 'app.components_charts_chartist'
        });

        msNavigationServiceProvider.saveItem('components.charts.nvd3', {
            title: 'nvD3',
            state: 'app.components_charts_nvd3'
        });

        msNavigationServiceProvider.saveItem('components.maps', {
            title: 'Maps',
            icon : 'icon-map-marker',
            state: 'app.components_maps'
        });

        msNavigationServiceProvider.saveItem('components.price-tables', {
            title: 'Price Tables',
            icon : 'icon-view-carousel',
            state: 'app.components_price-tables'
        });

        msNavigationServiceProvider.saveItem('components.tables', {
            title: 'Tables',
            icon : 'icon-table-large'
        });

        msNavigationServiceProvider.saveItem('components.tables.simple-table', {
            title: 'Simple Table',
            state: 'app.components_tables_simple-table'
        });

        msNavigationServiceProvider.saveItem('components.tables.datatable', {
            title: 'Datatable',
            state: 'app.components_tables_datatable'
        });

        msNavigationServiceProvider.saveItem('components.widgets', {
            title: 'Widgets',
            icon : 'icon-apps',
            state: 'app.components_widgets'
        });
    }
})();
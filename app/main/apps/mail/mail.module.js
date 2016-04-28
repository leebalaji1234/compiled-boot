(function ()
{
    'use strict';

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
                Inbox: function (msApi)
                {
                    return msApi.resolve('mail.inbox@get');
                }
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
/* global angular */
'use strict'
angular.module('app', [])

angular.module('app').directive(
  'devices',
  function ($http, $interval) {
    return {
      template: `<ul class="list-group">
        <li class="list-group-item" ng-repeat="device in devicesCtrl.devices">
          <h4>{{device.path}}
            {{device.properties.udev.SIZE*512 /(1024*1024*1024) | number:1}}GiB
            {{material}}
          </h4>
          <div class="container">
            <div ng-repeat="(k,v) in device.properties.udev">udev {{k}}: {{v}}</div>
            <div ng-repeat="(k,v) in device.properties.smart">smart {{k}}: {{v}}</div>
            <div>Status:
              <pre>{{device.status | json}}</pre>
            </div>
            <device-list device="device" ng-show="showFind"></device-list>
            Material: <input ng-model="material">
            <div>
              <button class="btn btn-primary" ng-click="devicesCtrl.action('check',device, material)">Check</button>
              <button class="btn btn-primary" ng-click="devicesCtrl.action('register',device, material)">Register</button>
              <button class="btn btn-primary" ng-click="devicesCtrl.action('image',device, material)">Image</button>
            </div>
            <pre>{{device.error | json}}</pre>
          </div>
        </li>
        <pre>{{devicesCtrl.message | json}}</pre>
      </ul>`,
      link: function (scope, elem, attrs) {
      },
      controller: function ($scope) {
        this.showFind = false
        this.update = () => {
          $http.get('./api/')
          .then((response) => {
            this.devices = response.data
          })
          .catch((response) => {
            this.message = response.error
          })
        }
        $interval(this.update, 2000)
        this.action = (action, device, material) => {
          $http.get(`./api/${device.id}/${action}/?material=${material}`)
          .then((response) => {
            this.message = response.data
          })
          .catch((response) => {
            this.message = response.error
          })
        }
      },
      controllerAs: 'devicesCtrl'
    }
  }
)

angular.module('app').directive('deviceList', function ($http) {
  return {
    scope: {
      device: '='
    },
    template: `
    <div>
      <button class="btn btn-primary" ng-click="showFind = !showFind">Find</button>
    </div>
    <div ng-repeat="item in data">
      <h4>{{item.material}}</h4>
      <ul>
        <li ng-repeat="(k,v) in item">
        {{k}}: {{v}}
        </li>
      </ul>
    </div>`,
    link: function (scope, element, attrs) {
    },
    controller: function ($http) {
      this.click = () => {
        this.update()
        this.showFind = !this.showFind
      }
      this.update = () => {
        $http.get(`./api/${this.device.id}/list`)
        .success((data) => {
          this.scope.data = data
        })
      }
    },
    controllerAs: 'deviceCtrl'
  }
})

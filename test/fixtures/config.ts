let INIT_NOTIFIER_CONFIG = {
    "$DEFAULT": {
      "notify": [
        {
          "enabled": true,
          "priority": 3,
          "verbName": "notify",
          "methodName": "notify",
          "params": [
            {
              "name": "title",
              "pattern": "$^"
            },
            {
              "name": "message",
              "pattern": "$^"
            }
          ],
          "moduleName": "notifier"
        }
      ]
    },
    "notifier": {
      "name": "notifier",
      "npmModuleName": "rpscript-api-notifier",
      "npmVersion": "0.4.0",
      "enabled":true,
      "actions": {
        "notify": {
          "enabled": true,
          "priority": 3,
          "verbName": "notify",
          "methodName": "notify",
          "params": [
            {
              "name": "title",
              "pattern": "$^"
            },
            {
              "name": "message",
              "pattern": "$^"
            }
          ],
          "moduleName": "notifier"
        }
      }
    }
  }
  
let FAKE_MOD = {
  "name": "fakeTest",
  "npmModuleName": "rpscript-faketest",
  "npmVersion": "0.0.0",
  "enabled":true
}
let UPDATING_ACTIONS_INITIAL = 
  [{
    "enabled": true,
    "priority": 3,
    "verbName": "fakeAction1",
    "methodName": "fakeAction1",
    "params": [
      {
        "name": "first",
        "pattern": "$^"
      }
    ],
    "moduleName": "fakeTest"
  },
  {
    "enabled": true,
    "priority": 3,
    "verbName": "fakeAction2",
    "methodName": "fakeAction2",
    "params": [{"name": "first","pattern": "$^"}],
    "moduleName": "fakeTest"
  }]

  let FAKE_MOD_OVERLAP = {
    "name": "fakeTestOverlap",
    "npmModuleName": "rpscript-faketestoverlap",
    "npmVersion": "0.0.0",
    "enabled":true
  }
  let UPDATING_ACTIONS_OVERLAP = 
    [{
      "enabled": true,
      "priority": 3,
      "verbName": "fakeAction1",
      "methodName": "fakeAction1",
      "params": [
        {
          "name": "first",
          "pattern": "$^"
        },
        {
          "name": "second",
          "pattern": "$^"
        }
      ],
      "moduleName": "fakeTestOverlap"
    },
    {
      "enabled": true,
      "priority": 1,
      "verbName": "fakeAction2",
      "methodName": "fakeAction2",
      "params": [{"name": "first","pattern": "$^"}],
      "moduleName": "fakeTestOverlap"
    }]

  export {
    INIT_NOTIFIER_CONFIG, UPDATING_ACTIONS_INITIAL, FAKE_MOD, FAKE_MOD_OVERLAP, UPDATING_ACTIONS_OVERLAP
  };
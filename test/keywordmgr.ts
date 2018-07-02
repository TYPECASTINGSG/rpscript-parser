import 'mocha';
import ConfigStore from 'configstore';
import {expect} from 'chai';
import {KeywordsMgr} from '../src/core/keywordsmgr';
import {INIT_NOTIFIER_CONFIG,FAKE_MOD,UPDATING_ACTIONS_INITIAL,
UPDATING_ACTIONS_OVERLAP, FAKE_MOD_OVERLAP} from './fixtures/config';
import {RpsContext,RpsModuleModel} from 'rpscript-interface';

let mgr;
describe('Keywords Manager', () => {

  //test updateModule, updateDefault, removeModuleDefaults ,isvalidkeyword

  beforeEach(() => {
    mgr = new KeywordsMgr;
    mgr.configStore = new ConfigStore('rps-test-keymgr');
    mgr.configStore.clear();
  })


  it('should display default actions in JSON', async function() {
    mgr.configStore.set(INIT_NOTIFIER_CONFIG);

    expect(mgr.getDefaultActions()).to.be.deep.equals(INIT_NOTIFIER_CONFIG['$DEFAULT']);
  });

  it('should update new module with existing modules correctly', async function() {
    mgr.configStore.set(INIT_NOTIFIER_CONFIG);

    mgr.updateModule(FAKE_MOD, UPDATING_ACTIONS_INITIAL);
    mgr.updateDefaults(FAKE_MOD.name, UPDATING_ACTIONS_INITIAL);

    expect(mgr.configStore.all).to.be.deep.equals(UPDATED_CONFIG);


    mgr.updateModule(FAKE_MOD_OVERLAP, UPDATING_ACTIONS_OVERLAP);
    mgr.updateDefaults(FAKE_MOD_OVERLAP.name, UPDATING_ACTIONS_OVERLAP);

    expect(mgr.configStore.all).to.be.deep.equals(UPDATED_CONFIG_OVERLAP);


    mgr.removeModuleDefaults(FAKE_MOD_OVERLAP.name);

    expect(mgr.getDefaultActions()).to.be.deep.equals(UPDATED_CONFIG['$DEFAULT']);
    

    mgr.removeModuleDefaults(FAKE_MOD.name);

    expect(mgr.getDefaultActions()).to.be.deep.equals(INIT_NOTIFIER_CONFIG['$DEFAULT']);
    

    mgr.removeModuleDefaults('notifier');

    expect(mgr.getDefaultActions()).to.be.deep.equals({});
    
  });

  it('should select top priority action', function () {
    let fake1 = UPDATED_CONFIG_OVERLAP['$DEFAULT']['fakeAction1'];
    let fake2 = UPDATED_CONFIG_OVERLAP['$DEFAULT']['fakeAction2'];

    let action1 = mgr.selectBestFitByPriority(fake1);
    let action2 = mgr.selectBestFitByPriority(fake2);

    expect(action1).to.be.deep.equals({
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
    });

    expect(action2).to.be.deep.equals({
      "enabled": true,
      "priority": 3,
      "verbName": "fakeAction2",
      "methodName": "fakeAction2",
      "params": [
        {
          "name": "first",
          "pattern": "$^"
        }
      ],
      "moduleName": "fakeTest"
    });

    let ctx:RpsContext = new RpsContext;
    ctx.configStore = new ConfigStore('rps-test-keymgr');
    ctx.configStore.set(UPDATED_CONFIG_OVERLAP);
    ctx.updatePriority('fakeTest','fakeAction1',5);

    let action3 = mgr.selectBestFitByPriority( ctx.configStore.all['$DEFAULT']['fakeAction1'] );

    expect(action3).to.be.deep.equals({
      "enabled": true,
      "priority": 5,
      "verbName": "fakeAction1",
      "methodName": "fakeAction1",
      "params": [
        {"name": "first","pattern": "$^"}
      ],
      "moduleName": "fakeTest"
    });

  });
})


let UPDATED_CONFIG = {
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
    ],
    "fakeAction1": [
      {
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
      }
    ],
    "fakeAction2": [
      {
        "enabled": true,
        "priority": 3,
        "verbName": "fakeAction2",
        "methodName": "fakeAction2",
        "params": [
          {
            "name": "first",
            "pattern": "$^"
          }
        ],
        "moduleName": "fakeTest"
      }
    ]
  },
  "notifier": {
    "name": "notifier",
    "npmModuleName": "rpscript-api-notifier",
    "npmVersion": "",
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
  },
  "fakeTest": {
    "name": "fakeTest",
    "npmModuleName": "rpscript-faketest",
    "npmVersion": "0.0.0",
    "enabled":true,
    "actions": {
      "fakeAction1": {
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
      "fakeAction2": {
        "enabled": true,
        "priority": 3,
        "verbName": "fakeAction2",
        "methodName": "fakeAction2",
        "params": [
          {
            "name": "first",
            "pattern": "$^"
          }
        ],
        "moduleName": "fakeTest"
      }
    }
  }
}

let UPDATED_CONFIG_OVERLAP = {
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
    ],
    "fakeAction1": [
      {
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
      }
    ],
    "fakeAction2": [
      {
        "enabled": true,
        "priority": 3,
        "verbName": "fakeAction2",
        "methodName": "fakeAction2",
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
        "priority": 1,
        "verbName": "fakeAction2",
        "methodName": "fakeAction2",
        "params": [
          {
            "name": "first",
            "pattern": "$^"
          }
        ],
        "moduleName": "fakeTestOverlap"
      }
    ]
  },
  "notifier": {
    "name": "notifier",
    "npmModuleName": "rpscript-api-notifier",
    "npmVersion": "",
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
  },
  "fakeTest": {
    "name": "fakeTest",
    "npmModuleName": "rpscript-faketest",
    "npmVersion": "0.0.0",
    "enabled":true,
    "actions": {
      "fakeAction1": {
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
      "fakeAction2": {
        "enabled": true,
        "priority": 3,
        "verbName": "fakeAction2",
        "methodName": "fakeAction2",
        "params": [
          {
            "name": "first",
            "pattern": "$^"
          }
        ],
        "moduleName": "fakeTest"
      }
    }
  },
  "fakeTestOverlap": {
    "name": "fakeTestOverlap",
    "npmModuleName": "rpscript-faketestoverlap",
    "npmVersion": "0.0.0",
    "enabled":true,
    "actions": {
      "fakeAction1": {
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
      "fakeAction2": {
        "enabled": true,
        "priority": 1,
        "verbName": "fakeAction2",
        "methodName": "fakeAction2",
        "params": [
          {
            "name": "first",
            "pattern": "$^"
          }
        ],
        "moduleName": "fakeTestOverlap"
      }
    }
  }
}
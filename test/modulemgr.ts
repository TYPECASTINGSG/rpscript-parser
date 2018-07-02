import 'mocha';
import {expect} from 'chai';
import {ModuleMgr} from '../src/core/modulemgr';


describe('Module Manager', () => {

  xit('should install plugin', async function() {
    // let mgr = new ModuleMgr;
    
    // let mod = await mgr.installModule('error-module');

    // console.log(mod);
    // mgr.removeModule('rpscript-api-notifier');

  }).timeout(0);

  xit('install and remove notifier module',async function(){
    let mgr = new ModuleMgr;

    let info = await mgr.installModule('notifier');
    let rawJson = mgr.listInstalledModules();

    expect(info).to.be.deep.equals(INIT_NOTIFIER_CONFIG['notifier']);
    expect(rawJson).to.be.deep.equals(INIT_NOTIFIER_CONFIG);

    await mgr.removeModule('notifier');
    rawJson = mgr.listInstalledModules();

    expect(rawJson).to.be.deep.equals({"$DEFAULT": {}});

  }).timeout(0)

})

let INIT_NOTIFIER_CONFIG = {
  "$DEFAULT": {
    "notifier": [
      {
        "defaultEnabled": true,
        "defaultPriority": 3,
        "defaultName": "notifier",
        "actionName": "notify",
        "params": [
          {
            "name": "title",
            "defaultPattern": "$^"
          },
          {
            "name": "message",
            "defaultPattern": "$^"
          }
        ],
        "modName": "notifier"
      }
    ]
  },
  "notifier": {
    "name": "notifier",
    "npmModuleName": "rpscript-api-notifier",
    "npmVersion": "",
    "actions": {
      "notify": {
        "defaultEnabled": true,
        "defaultPriority": 3,
        "defaultName": "notifier",
        "actionName": "notify",
        "params": [
          {
            "name": "title",
            "defaultPattern": "$^"
          },
          {
            "name": "message",
            "defaultPattern": "$^"
          }
        ],
        "modName": "notifier"
      }
    }
  }
}


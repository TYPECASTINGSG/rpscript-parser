import 'mocha';
import {expect} from 'chai';
import ConfigStore from 'configstore';
import {ModuleMgr} from '../src/core/modulemgr';

import {INIT_NOTIFIER_CONFIG} from './fixtures/config';

describe('Module Manager', () => {


  xit('install and remove notifier module',async function(){
    // let mgr = new ModuleMgr;
    // mgr.configStore = new ConfigStore('rps_test_clean_config');

    // let info = await mgr.installModule('notifier@0.3.0');
    // let rawJson = mgr.listInstalledModules();

    // expect(info).to.be.deep.equals(INIT_NOTIFIER_CONFIG['notifier']);
    // expect(rawJson).to.be.deep.equals(INIT_NOTIFIER_CONFIG);

    // await mgr.removeModule('notifier');
    // rawJson = mgr.listInstalledModules();

    // expect(rawJson).to.be.deep.equals({"$DEFAULT": {}});

  }).timeout(0)

})


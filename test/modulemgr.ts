import 'mocha';
import {expect} from 'chai';
import {ModuleMgr} from '../src/core/modulemgr';

import {INIT_NOTIFIER_CONFIG} from './fixtures/config';

describe.skip('Module Manager', () => {


  it('install and remove notifier module',async function(){
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


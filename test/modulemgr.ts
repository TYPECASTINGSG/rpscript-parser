import 'mocha';
import {expect} from 'chai';
import {ModuleMgr} from '../src/core/modulemgr';


describe.skip('Module Manager', () => {

  xit('should install plugin', async () => {
    let mgr = new ModuleMgr;
    
    let mod = await mgr.installModule('error-module');

    // console.log(mod);
    // mgr.removeModule('rpscript-api-notifier');

  }).timeout(0);

  it('helper',async()=>{
    let mgr = new ModuleMgr;
    // mgr.configStore.delete('rpscript-api-notifier');
    console.log( mgr.listModuleNames() );
    console.log( mgr.listModuleFull() );
    // mgr.configStore.clear();
  })

})



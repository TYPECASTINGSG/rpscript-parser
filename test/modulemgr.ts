import 'mocha';
import {expect} from 'chai';
import {ModuleMgr} from '../src/core/modulemgr';


describe('Module Manager', () => {

  xit('should install plugin', async () => {
    let mgr = new ModuleMgr;
    
    let mod = await mgr.installModule('error-module');

    // console.log(mod);
    // mgr.removeModule('rpscript-api-notifier');

  }).timeout(0);

  xit('should extract module info', async() => {
    let mgr = new ModuleMgr
    let result = await mgr.storeModuleInfo('rpscript-api-notifier');
    
    console.log( JSON.stringify(result) );
  });

  it('helper',async()=>{
    let mgr = new ModuleMgr;
    // mgr.configStore.delete('rpscript-api-notifier');
    console.log( mgr.configStore.all );
    // mgr.configStore.clear();
  })

})



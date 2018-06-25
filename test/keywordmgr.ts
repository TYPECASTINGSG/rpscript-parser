import 'mocha';
import ConfigStore from 'configstore';
import {expect} from 'chai';
import {ModuleMgr} from '../src/core/modulemgr';
import {KeywordsMgr} from '../src/core/keywordsmgr';
import { ActionConfig } from 'rpscript-interface';


describe('Keywords Manager', () => {

  it('should update and remove default keywords', async () => {
    let mgr = new KeywordsMgr;
    mgr.configStore = new ConfigStore('rps-test-keymgr');
    mgr.configStore.clear();
    
    mgr.configStore.set('$DEFAULT',{});

    //notify module
    let notify:ActionConfig = {actionName:'action', defaultName:'act', defaultParamPatterns:{title:/.*/}};
    let open:ActionConfig = {actionName:'open', defaultName:'open'};

    mgr.updateDefaults('notify',[notify,open]);

    console.log( JSON.stringify(mgr.getDefaultActions() ,null,2 ) );

    console.log('**************************');

    //xdg open module

    mgr.updateDefaults('xdg-open',[open]);

    console.log( JSON.stringify(mgr.getDefaultActions() ,null,2 ) );

    console.log('**************************');

    mgr.removeModuleDefaults('notify');

    console.log( JSON.stringify(mgr.getDefaultActions() ,null,2 ) );

    console.log('**************************');
  });


})



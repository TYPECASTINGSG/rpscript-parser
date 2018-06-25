import ConfigStore from 'configstore';
import R from 'ramda';
import {KeywordsMgr} from './keywordsmgr';
var npm = require ('npm-programmatic');

export class ModuleMgr {
    readonly CONFIG_NAME = "rpscript";
    configStore:ConfigStore;

    wordMgr:KeywordsMgr;

    constructor() {
        this.configStore = new ConfigStore(this.CONFIG_NAME);
        this.wordMgr = new KeywordsMgr;
    }

    async installModule (npmModuleName:string) :Promise<void> {

        try{
            if(!npmModuleName.trim().startsWith('rpscript-api-')) throw Error("invalid module name");

            await npm.install([npmModuleName], {cwd:process.cwd(), save:false, global:false});

            const mod = await import(npmModuleName);
            let modClazz = mod.default;
            let modName = modClazz['rpsModuleName'];
    
            this.configStore.set(modName,{ name:modName, moduleName:npmModuleName});

            this.wordMgr.saveModuleKeywords(modName,modClazz);

        }catch(err){
            throw err;
        }
    }
    async removeModule (npmModuleName:string) : Promise<void>{
        try{
            await npm.uninstall([npmModuleName], {cwd:process.cwd(), save:false, global:false});

            let all = this.configStore.all;

            let output = R.values(all);
            output = R.find( R.propEq('moduleName', npmModuleName)  , output );
    
            this.configStore.delete(output['name']);
            this.wordMgr.removeModuleDefaults(output['name']);

        }catch(err){
            throw err;
        }
    }
    listModuleNames () : string[]{
        return R.keys(this.configStore.all);
    }
    listModuleFull () : string{
        return JSON.stringify(this.configStore.all, null, 2);
    }



    // {
    //     <actionName> : [{
    //         moduleName:<name>, actionName:<name>,
    //         param : [{paramName:'title',paramPattern},{paramName:'message',paramPattern}]
    //     }]
    // }

}

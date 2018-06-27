import ConfigStore from 'configstore';
import R from 'ramda';
import {RpsContext} from 'rpscript-interface';
import {KeywordsMgr} from './keywordsmgr';
import { InvalidKeywordException } from '../antlr/InvalidKeywordException';
import {ModAction} from './keywordsmgr';

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

            const mod = await import(`../../../${npmModuleName}`);
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

    async loadModuleObjs () : Promise<Object>{
        let allModules:Object = this.configStore.all;
        let moduleNames = R.filter( m => m!=='$DEFAULT', R.keys(allModules));
        let defaultConfig = this.configStore.get('$DEFAULT');

        let moduleObj:Object = {};

        for(let i =0;i<moduleNames.length;i++){
            let modName = allModules[ moduleNames[i] ].moduleName;
            let mod = await import (`../../../${modName}`);

            moduleObj[ moduleNames[i] ] = new mod.default;
        }
        moduleObj['api'] = this.genDefaultApi(moduleObj, defaultConfig);

        return moduleObj;
    }

    // api(keyword, $CONTEXT , {} , "12121");
    private genDefaultApi (modObj:Object, defaultConfig:Object) : Function{
        return (keyword:string, ctx:RpsContext, opt:Object,  ...params) => {
            if(!modObj[keyword]) throw new InvalidKeywordException("Keyword not found");

            else {
                let defSettings:ModAction[] = defaultConfig[keyword];

                let bestFit:ModAction = this.selectBestFit (defSettings, keyword, params);

                let args = [ctx,opt].concat(params);
                return modObj[bestFit.modName][bestFit.actionName].apply(this,args);
            }
        }
    }

    private selectBestFit(settings:ModAction[], keywords:string, params:any[]) : ModAction{

        let assignPriority = R.map( setting => {
            let mVals = R.addIndex(R.mapObjIndexed)((reg, key, obj,index) => {
                //@ts-ignore
                let pValue = params[index];
                //@ts-ignore
                return new RegExp(reg).test(pValue);
            }, setting.defaultParamPatterns);
            
            setting.count = R.filter(v=> !v, R.values(mVals)).length;

            return setting;
        } ,settings );

        assignPriority = R.sortBy(R.prop('count')) (assignPriority);

        return assignPriority[ assignPriority.length-1 ];
    }
    // "notifier": [
    //     {
    //       "modName": "notifier",
    //       "actionName": "notify",
    //       "defaultParamPatterns": {
    //         "title": {}
    //       }
    //     }
    //   ]
  

}

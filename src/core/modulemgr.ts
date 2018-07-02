import ConfigStore from 'configstore';
import R from 'ramda';
import {RpsContext,RpsModuleModel,RpsActionModel} from 'rpscript-interface';
import {KeywordsMgr} from './keywordsmgr';
import {NpmModHelper} from '../helper/npmMod';
import { EventEmitter } from 'events';

export class ModuleMgr {
    readonly CONFIG_NAME = "rpscript";
    configStore:ConfigStore;

    wordMgr:KeywordsMgr;
    event:EventEmitter;

    constructor() {
        this.configStore = new ConfigStore(this.CONFIG_NAME);
        this.wordMgr = new KeywordsMgr;
        this.event = new EventEmitter;
    }

    async installModule (npmModuleName:string) :Promise<RpsModuleModel> {

        try{
            if(!npmModuleName.trim().startsWith('rpscript-api-')) 
                npmModuleName = 'rpscript-api-' + npmModuleName.trim();

            let installedInfo = await this.installFromNpm(npmModuleName);
    
            //save module info
            this.configStore.set(installedInfo['name'],{
                name:installedInfo['name'],
                npmModuleName:npmModuleName,
                npmVersion:installedInfo['version'],
                enabled:true
            });

            //save keywords info
            this.wordMgr.saveModuleKeywords(installedInfo['name'] , installedInfo['clazz']);

            let modInfo:RpsModuleModel = this.configStore.get(installedInfo['name']);
            return modInfo;

        }catch(err){
            throw err;
        }
    }

    private async installFromNpm (npmModuleName) : Promise<Object> {
        NpmModHelper.installNpmModule(npmModuleName);

        const mod = await import(`../../../${npmModuleName}`);
        let modClazz = mod.default;
        let moduleName = modClazz['rpsModuleName'];

        return {clazz:modClazz,name:moduleName,version:''};
    }


    async removeModule (npmModuleName:string) : Promise<void>{
        try{
            if(!npmModuleName.trim().startsWith('rpscript-api-')) 
                npmModuleName = 'rpscript-api-' + npmModuleName.trim();

            NpmModHelper.removeNpmModule(npmModuleName);

            let removedMod = this.removeModuleConfig(npmModuleName);

            this.wordMgr.removeModuleDefaults(removedMod['name']);

        }catch(err){
            throw err;
        }
    }
    private removeModuleConfig (npmModuleName:string) : RpsModuleModel{
        let all = this.configStore.all;

        let output = R.values(all);
        //npm name and module name assume to be different
        let modConfig:RpsModuleModel = R.find( R.propEq('npmModuleName', npmModuleName)  , output );
    
        this.configStore.delete(modConfig['name']);
        
        return modConfig;
    }

    listModuleNames () : string[]{ return R.keys(this.configStore.all); }
    listInstalledModules () : Object{ return this.configStore.all; }
    listAvailableModules () : Object{ return {}; }

    async loadModuleObjs (rpsContext:RpsContext) : Promise<Object>{
        let allModules:Object = this.configStore.all;
        let moduleNames = R.filter( m => m!=='$DEFAULT', R.keys(allModules));

        let moduleObj:Object = {};

        //TODO: import issue
        //rem: runtime config at rpsContext
        //load all modules
        for(let i =0;i<moduleNames.length;i++){
            let module = allModules[ moduleNames[i] ];
            let moduleName = module.moduleName;

            if(module.enabled) {
                let mod = await import (`../../../${moduleName}`); //maybe. find node_module path

                moduleObj[ moduleNames[i] ] = new mod.default(rpsContext);

                this.event.emit('runner.module.loaded',moduleNames[i]);
            }else {
                this.event.emit('runner.module.disabled',moduleNames[i]);
            }
        }

        moduleObj['api'] = this.genDefaultApi(moduleObj,rpsContext);

        return moduleObj;
    }

    // api(keyword, $CONTEXT , {} , "12121");
    private genDefaultApi (modObj:Object,rpsContext:RpsContext) : Function{

        return (keyword:string, ctx:RpsContext, opt:Object,  ...params) => {

            let actions:RpsActionModel[] = rpsContext.getRuntimeDefault()[keyword];

            let bestFit:RpsActionModel = this.wordMgr.selectBestFitByPriority (actions);

            let args = [ctx,opt].concat(params);

            //modObject.module.action(ctx,opt,...params)
            return modObj[bestFit.moduleName][bestFit.methodName].apply(this,args);
            
        }
    }



}

    // private selectBestFitByParamPattern(settings:RpsActionModel[], keywords:string, params:any[]) : RpsActionModel{

    //     let assignPriority = R.map( setting => {
    //         let mVals = R.addIndex(R.mapObjIndexed)((reg, key, obj,index) => {
    //             //@ts-ignore
    //             let pValue = params[index];
    //             //@ts-ignore
    //             return new RegExp(reg).test(pValue);
    //         }, setting.defaultParamPatterns);
            
    //         setting.count = R.filter(v=> !v, R.values(mVals)).length;

    //         return setting;
    //     } ,settings );

    //     assignPriority = R.sortBy(R.prop('count')) (assignPriority);

    //     return assignPriority[ assignPriority.length-1 ];
    // }
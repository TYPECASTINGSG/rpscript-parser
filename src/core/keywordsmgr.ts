import ConfigStore from 'configstore';
import{RpsActionModel, RpsModuleModel,RpsDefaultModel} from 'rpscript-interface';
import R from 'ramda';


export class KeywordsMgr {
    readonly CONFIG_NAME = "rpscript";
    configStore:ConfigStore;

    constructor() {
        this.configStore = new ConfigStore(this.CONFIG_NAME);

        let deflt = this.configStore.get('$DEFAULT');
        if(!deflt) this.configStore.set('$DEFAULT',{});
    }

    saveModuleKeywords (moduleName:string, modClazz:Function) {
        let mod:RpsModuleModel = this.configStore.get(moduleName);
        let actionConfigs:RpsActionModel[] = this.extractClazzActions(modClazz,moduleName);
        
        this.updateModule(mod,actionConfigs);
        
        this.updateDefaults(moduleName, actionConfigs);
    }

    updateModule (mod:RpsModuleModel, actionConfigs:RpsActionModel[]) {
        mod.actions = {};
        for(let index in actionConfigs){
            let config = actionConfigs[index];
            mod.actions[config.methodName ] = actionConfigs[index];
        }

        this.configStore.set(mod.name,mod);
    }

    updateDefaults(moduleName:string, clazzActions:RpsActionModel[]){
        let deflt:RpsDefaultModel = this.configStore.get('$DEFAULT');

        let actionsWithDefault = R.filter( config => !!config.verbName , clazzActions );

        actionsWithDefault.forEach( action => {
            let verbName = action.verbName;

            if(deflt[verbName]) {
                let newList = R.filter( a => a['moduleName'] !== action.moduleName, deflt[verbName]);
                
                newList.push(action);
                deflt[verbName] = newList;

            }else deflt[verbName] = [action];
            
        });

        this.configStore.set('$DEFAULT',deflt);
    }

    // iterate keywords
    // filter away action list match moduleName
    removeModuleDefaults (moduleName:string) {
        let deflts:RpsDefaultModel = this.configStore.get('$DEFAULT');

        R.forEachObjIndexed((vals:RpsActionModel[],key:string) => {
            let output:RpsActionModel[] = R.filter( action => action.moduleName !== moduleName , vals);
            
            if(output.length == 0) delete deflts[key];
            else deflts[key] = output;
        },deflts);

        this.configStore.set('$DEFAULT',deflts);
    }

    getDefaultActions () {
        return this.configStore.get('$DEFAULT');
    }
    
    selectBestFitByPriority(settings:RpsActionModel[]) : RpsActionModel {
        let sort = R.sortBy(R.prop('priority'));

        return sort(settings)[settings.length-1];
    }

    private extractClazzActions (modClazz:Function,moduleName:string) : RpsActionModel[]{
        let actionConfigs:RpsActionModel[] = [];
        let methods = Object.getOwnPropertyNames(modClazz.prototype);

        for(var i in methods){
          let availConfig:RpsActionModel = modClazz.prototype[methods[i]]['rpsActionConfig'];

          if(availConfig) {
            availConfig.moduleName = moduleName;
            actionConfigs.push(availConfig);
          }
        }

        return actionConfigs;
    }

    isValidKeyword (keyword:string) : boolean {
        let moduleName = '',word = '';
        if(keyword.split('.').length === 2){
            moduleName = keyword.split('.')[0];
            word = keyword.split('.')[1];
        }else word = keyword

        if(moduleName) {
            let mod = this.configStore.get(moduleName);
            return !!mod.actions[word];
        }else {
            let deflt = this.configStore.get('$DEFAULT');
            return !!deflt[word];
        }
    }
}
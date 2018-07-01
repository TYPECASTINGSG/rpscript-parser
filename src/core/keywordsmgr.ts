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

    saveModuleKeywords (modName:string, modClazz:Function) {
        let mod:RpsModuleModel = this.configStore.get(modName);
        let actionConfigs:RpsActionModel[] = this.extractClazzActions(modClazz);
        
        this.updateModule(mod,actionConfigs);
        
        this.updateDefaults(modName, actionConfigs);
    }

    updateModule (mod:RpsModuleModel, actionConfigs:RpsActionModel[]) {
        mod.actions = {};
        for(let index in actionConfigs){
            let config = actionConfigs[index];
            mod.actions[config.actionName ] = actionConfigs[index];
        }

        this.configStore.set(mod.name,mod);
    }

    updateDefaults(modName:string, clazzActions:RpsActionModel[]){
        let deflt:RpsDefaultModel = this.configStore.get('$DEFAULT');

        let actionsWithDefault = R.filter( config => !!config.defaultName , clazzActions );

        actionsWithDefault.forEach( action => {
            let defaultName = action.defaultName;

            if(deflt[defaultName]) {
                let newList = R.filter( a => a.modName !== action.modName, deflt[defaultName]);
                newList.push(action);
                deflt[defaultName] = newList;
            }else deflt[defaultName] = [action];
            
        });

        this.configStore.set('$DEFAULT',deflt);
    }

    // iterate keywords
    // filter away action list match modName
    removeModuleDefaults (modName:string) {
        let deflts:RpsDefaultModel = this.configStore.get('$DEFAULT');

        R.forEachObjIndexed((vals:RpsActionModel[],key:string) => {
            let output:RpsActionModel[] = R.filter( action => action.modName !== modName , vals);
            
            if(output.length == 0) delete deflts[key];
            else deflts[key] = output;
        },deflts);

        this.configStore.set('$DEFAULT',deflts);
    }

    getDefaultActions () {
        return this.configStore.get('$DEFAULT');
    }
    

    private extractClazzActions (modClazz:Function) : RpsActionModel[]{
        let actionConfigs:RpsActionModel[] = [];
        let methods = Object.getOwnPropertyNames(modClazz.prototype);

        for(var i in methods){
          let availConfig = modClazz.prototype[methods[i]]['rpsActionConfig'];
          if(availConfig) actionConfigs.push(availConfig);
        }

        return actionConfigs;
    }

    isValidKeyword (keyword:string) : boolean {
        let modName = '',word = '';
        if(keyword.split('.').length === 2){
            modName = keyword.split('.')[0];
            word = keyword.split('.')[1];
        }else word = keyword

        if(modName) {
            let mod = this.configStore.get(modName);
            return !!mod.actions[word];
        }else {
            let deflt = this.configStore.get('$DEFAULT');
            return !!deflt[word];
        }
    }
}
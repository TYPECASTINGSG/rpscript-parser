import ConfigStore from 'configstore';
import{ActionConfig,ActionDefaultParamPattern} from 'rpscript-interface';
import R from 'ramda';

export interface DefaultAction {
    [name:string]: ModAction[]
}
export interface ModAction {
    modName:string;
    actionName:string;
    defaultParamPatterns?:ActionDefaultParamPattern;
}

export class KeywordsMgr {
    readonly CONFIG_NAME = "rpscript";
    configStore:ConfigStore;

    constructor() {
        this.configStore = new ConfigStore(this.CONFIG_NAME);

        let deflt = this.configStore.get('$DEFAULT');
        if(!deflt) this.configStore.set('$DEFAULT',{});
    }

    saveModuleKeywords (modName:string, modClazz:Function) {
        let mod:Object = this.configStore.get(modName);
        let actionConfigs = this.extractClazzActions(modClazz);
        
        mod['actions'] = actionConfigs;

        let deflt = this.configStore.get('$DEFAULT');
        this.updateDefaults(modName, actionConfigs);
    }
// {
//     keywordName: [ { modName:aa, actionName, { paramName1:REGEX, paramName2:REGEX}  } ]
// }
// actionConfig =  {actionName:'action', defaultName:'act', defaultParamPatterns:{title:/.*/} }
    updateDefaults(modName:string, actionConfigs:ActionConfig[]){
        let deflt:DefaultAction[] = this.configStore.get('$DEFAULT');

        let actionsWithDefault = R.filter( config => !!config.defaultName , actionConfigs );

        actionsWithDefault.forEach( action => {
            let defaultName = action.defaultName;
            let existingDefaultKeywords:string[] = R.keys(deflt);

            let deflAction = {modName:modName, actionName:action.actionName, defaultParamPatterns:action.defaultParamPatterns};

            if(R.contains(  defaultName , existingDefaultKeywords ) ) {
                deflt[defaultName].push(deflAction);
            }else {
                deflt[defaultName] = [deflAction];
            }
        });

        this.configStore.set('$DEFAULT',deflt);
    }

    removeModuleDefaults (modName:string) {
        let deflt:DefaultAction[] = this.configStore.get('$DEFAULT');
        let removed = R.map( dfWord => {
            let vals = R.values(dfWord);
            return R.filter( action => action['modName'] !== modName , vals );
        }, deflt);

        R.forEach( 
            key => removed[key].length === 0 ? delete removed[key] : '',
            R.keys(removed)
        );

        this.configStore.set('$DEFAULT',removed);
    }

    getDefaultActions () {
        return this.configStore.get('$DEFAULT');
    }
    

    private extractClazzActions (modClazz:Function) : ActionConfig[]{
        let actionConfigs:ActionConfig[] = [];
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
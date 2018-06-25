import ConfigStore from 'configstore';
import R from 'ramda';
var npm = require ('npm-programmatic');

export class ModuleMgr {
    readonly CONFIG_NAME = "rpscript";
    configStore:ConfigStore;

    constructor() {
        this.configStore = new ConfigStore(this.CONFIG_NAME);
    }

    async installModule (npmModuleName:string) :Promise<Object> {

        try{
            if(!npmModuleName.trim().startsWith('rpscript-api-')) throw Error("invalid module name");
            
            await npm.install([npmModuleName], {cwd:process.cwd(), save:false, global:false});

            return this.storeModuleInfo(npmModuleName);

        }catch(err){
            throw err;
        }
    }
    async removeModule (npmModuleName:string) : Promise<void>{
        try{
            await npm.uninstall([npmModuleName], {cwd:process.cwd(), save:false, global:false});

            this.removeModuleInfo(npmModuleName);

        }catch(err){
            throw err;
        }
    }

    private updateInstalledModConfig(modName:string) {
        //1. look into node_module modName folder
        //2. scan classes for RpsModuleInt interface -> extract mod name
        //3. scan for class method PropertyDescriptor for 'rpsActionConfig'
        //4. update to configStore

        //side node: instantiation by dynamic import, then pass it to runtime context
        // static vs object method
        // static is ok if everything is updated to context
        // plugin does not have it's own runtime lifecycle
        // cons, additional step to instantiate the class, instead of using static class directly

    }

    async storeModuleInfo (npmModuleName:string) : Promise<Object>{
        const mod = await import(npmModuleName);
        let info = this.extractClazzInfo( mod.default );

        this.configStore.set(info[0],{ name:info[0], moduleName:npmModuleName , actions:info[1] });

        return this.configStore.all;
    }
    removeModuleInfo (npmModuleName:string) : void {
        let all = this.configStore.all;

        let output = R.values(all);
        output = R.find( R.propEq('moduleName', npmModuleName)  , output );

        this.configStore.delete(output['name']);
    }

    private extractClazzInfo (modClazz:Function) {
        let modName = modClazz['rpsModuleName'];
        let clazzActions = this.getClazzActions(modClazz);

        return [modName,clazzActions];
    }

    private getClazzActions (modClazz:Function) {
        let actions:Object = {};
        let methods = Object.getOwnPropertyNames(modClazz.prototype);

        for(var i in methods){
          let availConfig = modClazz.prototype[methods[i]]['rpsActionConfig'];
          if(availConfig) actions[ methods[i] ] = availConfig;
        }

        return actions;
    }

    

}

// installed module
// {
//     <modname>:  {
//         importPath:'<path>', 
//         actions:{
//             <actionName>:{
//                 defaultName:'name',
//                 defaultParamPatterns:{
//                     <paramName>:<regex> ...
//                 }
//             }
//             ...
//         }
//     }
// }


//table data structure
// {
//     common : {
//         version:'aa',
//         actions:{
//             "echo": {
                
//             }
//         }
//     }
// }

//version take from npm
// module name
// @rpsModule("common")
// export class ModClazz {
    
//     //action name , arg pattern match

//     @action
//     @action("echo",{
//         content:"*"
//     })
//      @doc
//     echo ($CONTEXT,{},content:string) {

//     }
// }
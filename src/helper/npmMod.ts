import shell from 'shelljs';

export class NpmModHelper {
    
    static installNpmModule (moduleName:string) : any{
        return shell.exec(`npm install --no-save ${moduleName}`,{silent:false});
    }

    static removeNpmModule (moduleName:string) : any{
        return shell.exec(`npm remove ${moduleName}`,{silent:false});
    }

}
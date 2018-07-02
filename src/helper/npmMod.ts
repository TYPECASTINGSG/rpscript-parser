import shell from 'shelljs';

export class NpmModHelper {
    
    static installNpmModule (modName:string) : any{
        return shell.exec(`npm install --no-save ${modName}`,{silent:false});
    }

    static removeNpmModule (modName:string) : any{
        return shell.exec(`npm remove ${modName}`,{silent:false});
    }

}
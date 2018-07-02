import shell from 'shelljs';

export class NpmModHelper {
    
    static installNpmModule (moduleName:string) : any{
        let child = shell.exec(`npm install --no-save ${moduleName}`,{silent:true});

        if(child.stderr) throw new Error(''+child.stderr);

        return child.stdout;
    }

    static removeNpmModule (moduleName:string) : any{
        let child = shell.exec(`npm remove --no-save ${moduleName}`,{silent:true});
        
        if(child.stderr) throw new Error(''+child.stderr);

        return child.stdout;
    }

}
import shell from 'shelljs';

export class NpmModHelper {
    
    static installNpmModule (moduleName:string) : any{
        let child = shell.exec(`npm install --no-save ${moduleName}`,{silent:true});

        if(child.stderr) throw new Error(''+child.stderr);

        let result = ''+child.stdout;
        let version = result.substring(result.lastIndexOf('@')+1,result.indexOf('\n')).trim();
        let mod = result.substring(result.indexOf('+')+1,result.lastIndexOf('@')).trim();

        return {
            version:version,
            moduleName:mod,
            text:child.stdout
        }
    }

    static removeNpmModule (moduleName:string) : any{
        let child = shell.exec(`npm remove --no-save ${moduleName}`,{silent:true});
        
        if(child.stderr) throw new Error(''+child.stderr);

        return child.stdout;
    }

}
export class InvalidKeywordException extends Error {
    actionContext?:any;
    constructor(context:any){
        super('invalid keyword : '+context.WORD().text);
        this.actionContext = context;
    }
}
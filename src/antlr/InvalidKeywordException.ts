export class InvalidKeywordException extends Error {
    actionContext?:any;
    recommended?:string;
    constructor(context:any, recommended:string){
        super('invalid keyword : '+context.WORD().text);

        this.actionContext = context;
        this.recommended = recommended;
    }
}
import {Deferred} from "ts-deferred";
// import {Logger} from '../core/logger';
import fs from 'fs';
import R from 'ramda';
import {ParserRuleContext} from 'antlr4ts';

import {RPScriptListener} from './grammar/RPScriptListener';
import {ExeFnContext, IncludeContext,SymbolContext, VariableContext,LiteralContext,OptListContext,ParamContext,ParamListContext,ProgramContext, BlockContext,PipeActionsContext, SingleActionContext,
CommentContext, IfStatementContext , NamedFnContext, ActionContext, AnonFnContext, OptContext} from './grammar/RPScriptParser';

import {ParseTreeProperty} from 'antlr4ts/tree';
import {RPScriptParser} from '../antlr/grammar/RPScriptParser';

import {KeywordsMgr} from '../core/keywordsmgr';
import {Runner} from '../core/runner';
import { InvalidKeywordException } from "./InvalidKeywordException";

export interface TranspileContent {
  mainContent?:string;
  fnContent?:string;
  fullContent?:string;
}
export interface IncludeContent {
  dir:string;
  rpsContent:string;
  tsContent?:string;
}

export class RpsTranspileListener implements RPScriptListener {

  readonly globalEventDeclare:string = `module.exports = new EventEmitter();\n`;
  readonly mainSectionStart:string = 
  `async function main(){
    module.exports.emit('runner.start');\n
`;
  readonly mainSectionEnd:string = `
    module.exports.emit('runner.end');
}`;
readonly runSect:string = `
$CONTEXT.event.on ('action', (...params) => {
    module.exports.emit('action',params);
    //TODO: if 'action end' , $CONTEXT.$RESULT = params[params.length-1]
});
setTimeout(main, 500);
`
  logger;

  deferred:Deferred<any>;

  // translator:Translator;
  
  filepath:string;

  parseTreeProperty:ParseTreeProperty<string>;

  scope:string;

  content:TranspileContent;
  includeContent:IncludeContent[];
  parser:RPScriptParser;

  keywordMgr:KeywordsMgr;

  constructor(defer:Deferred<any>,filepath:string, parser:RPScriptParser){
    this.deferred = defer;
    // this.logger = Logger.getInstance();
    this.filepath = filepath;
    this.parseTreeProperty = new ParseTreeProperty();
    this.scope = "root";
    this.parser=parser;
    this.content = {
      mainContent:"", fullContent:"",fnContent:""
    }
    this.includeContent = [];
    this.keywordMgr = new KeywordsMgr;
  }

  public enterProgram(ctx: ProgramContext) : void{
  }
  public exitProgram(ctx: ProgramContext) : void{
    if(ctx.exception) throw ctx.exception;
    // if(ctx.exception) this.deferred.reject(ctx.exception)
    else {
      this.getAllIncludeContents().then( fnContents => {
        this.content.fullContent += this.globalEventDeclare;
        this.content.fullContent += this.mainSectionStart;
        this.content.fullContent += this.content.mainContent;
        this.content.fullContent += this.mainSectionEnd;
        this.content.fullContent += this.content.fnContent;

        fnContents.forEach(c => this.content.fullContent += c);

        this.content.fullContent += this.runSect;
  
        this.deferred.resolve(this.content);

      });
      
    }
  }

  public enterBlock(ctx:BlockContext) : void {
    if(this.hasFnParent(ctx)) this.scope = "function";
    else this.scope = "root";
  }
  public exitBlock(ctx:BlockContext) : void {
    if(this.hasFnParent(ctx)) this.scope = "function";
    else this.scope = "root";
  }

  public enterPipeActions(ctx:PipeActionsContext) : void {
  }

  public enterComment(ctx:CommentContext) : void {
  }
  public enterIfStatement(ctx:IfStatementContext) : void {
  }

  public enterNamedFn(ctx:NamedFnContext) : void {
    let vars = R.map(v=>v.text, ctx.VARIABLE());
    this.content.fnContent += `\nasync function ${ctx.WORD().text} (${vars}){\n`;
  }
  public exitNamedFn(ctx:NamedFnContext) : void {
    this.content.fnContent += '\n}';
  }
  public enterExeFn(ctx:ExeFnContext) : void {
    let vars = R.map(v=>v.text, ctx.param());
    if(this.scope === 'root') this.content.mainContent += `\n\t${ctx.WORD().text}(${vars});\n`;
    else this.content.fnContent += `\n\t${ctx.WORD().text}(${vars});\n`;
  }

  public enterAction(ctx:ActionContext) : void {
    if(!this.keywordMgr.isValidKeyword(ctx.WORD().text))
      throw new InvalidKeywordException('invalid keyword : '+ctx.WORD().text);

    this.parseTreeProperty.set(ctx,`\t${ctx.WORD().text}`);
  }
  public exitAction(ctx:ActionContext) : void {
    let keyword = this.parseTreeProperty.get(ctx);

    let pList:string[] = R.map(param => {
      return this.parseTreeProperty.get(param.getChild(0));
    },ctx.paramList().param());

    let opt = this.parseOpt(ctx.optList().opt());

    let joinList = pList.join(' , ');

    if(keyword.split('.').length>1){
      this.parseTreeProperty.set(ctx,`${keyword.trim()}( $CONTEXT , ${opt} , ${joinList})`);
    }else
      this.parseTreeProperty.set(ctx,`api("${keyword.trim()}" , $CONTEXT , ${opt} , ${joinList})`);

    if(!this.hasActionParent(ctx)){
      if(this.hasFnParent(ctx)) this.content.fnContent += "\t"+this.parseTreeProperty.get(ctx)+";\n";
      else  this.content.mainContent += "\t"+this.parseTreeProperty.get(ctx)+";\n";
    }
  }
  // literal | variable | anonFn | symbol | action;
  public enterLiteral(ctx:LiteralContext) : void {
    this.parseTreeProperty.set(ctx,`${ctx.text}`);
  }
  public exitLiteral(ctx:LiteralContext) : void {
  }
  public enterVariable(ctx:VariableContext) : void {
    this.parseTreeProperty.set(ctx,`${ctx.text}`);
  }
  public exitVariable(ctx:VariableContext) : void {
  }
  public enterSymbol(ctx:SymbolContext) : void {
    this.parseTreeProperty.set(ctx,`${ctx.text}`);
  }
  public exitSymbol(ctx:SymbolContext) : void {
  }
  public enterAnonFn(ctx:AnonFnContext) : void{
    let vars = R.map(v=>v.text, ctx.VARIABLE());

    if(this.scope === 'function')
      this.content.fnContent += `\nasync function (${vars}){\n`;
    if(this.scope === 'root')
      this.content.mainContent += `\nasync function (${vars}){\n`;

    this.parseTreeProperty.set(ctx,`${ctx.text}`);
  }
  public exitAnonFn(ctx:AnonFnContext) : void{
    this.content.fnContent += '\n}';
  }

  private containsActionContext(params:ParamContext[]) : boolean{
    return R.any( p => {
      return p.getChild(0) instanceof ActionContext
    }, params );
  }

  private capitalize(word:string): string {
    return word.trim().charAt(0).toUpperCase() + word.trim().slice(1);
  }

  private hasActionParent(ctx:ParserRuleContext) : boolean{
    return this.hasParent(ctx,'ActionContext');
  }
  private hasFnParent(ctx:ParserRuleContext) : boolean{
    return this.hasParent(ctx,'NamedFnContext');
  }

  hasParent(ctx:ParserRuleContext,parentName:string) : boolean{
    let ctxTemp:any = ctx.parent;
    let isFnParent:boolean = false;
    while (ctxTemp){
      if(parentName === ctxTemp.constructor.name){
        isFnParent = true;
        break;
      }
      ctxTemp = ctxTemp.parent;
    }
    return isFnParent;
}

  public enterInclude(ctx:IncludeContext) : void {
    let includeDir = ctx.StringLiteral().text.replace(/"/g,"");
    let content = fs.readFileSync(includeDir,'utf8');
    
    this.addInclude(includeDir,content);

    let runner = new Runner({skipRun:true});
    runner.convertToTS(includeDir,content).then(tsContent => {
      this.updateIncludeTranslator(includeDir,tsContent.fnContent);
    }).catch(err => {
      console.error('HIGH ALERT!!!!!!');
      console.error(err);
      this.removeInclude(includeDir);
    });

  }
  public exitInclude(ctx:IncludeContext) : void {}

  addInclude(dir:string,rpsContent:string) {
    this.includeContent.push({dir,rpsContent});
  }
  removeInclude(dir:string) {
    this.includeContent = 
        R.filter( incl => incl.dir !== dir, this.includeContent);
  }
  updateIncludeTranslator(dir:string, tsContent:string) {
    let t = R.find(R.propEq('dir', dir))(this.includeContent);
    t.tsContent = tsContent;
  }
  private hasAllIncludeCompleted(): boolean{
    return R.all( (incl) => !!incl.tsContent, this.includeContent);
}

  includeInterval = null;
  getAllIncludeContents () :Promise<string[]>{
      return new Promise((resolve,reject) => {
          this.includeInterval = setInterval( () => {
              if(this.hasAllIncludeCompleted()) {
                  clearInterval(this.includeInterval);
                  resolve(R.map( incl => incl.tsContent, this.includeContent));
              } 
          },100);
      })
  }

  private parseOpt (opts:OptContext[]):string{
    let obj = {};
    R.forEach(x => {
        obj[x.optName().text] = x.literal().text
    } , opts);

    return JSON.stringify(obj);
  }

}

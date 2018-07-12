import {Deferred} from "ts-deferred";
// import {Logger} from '../core/logger';
import fs from 'fs';
import R from 'ramda';
import {ParserRuleContext} from 'antlr4ts';

import {RPScriptListener} from './grammar/RPScriptListener';
import {ExeFnContext, IncludeContext,SymbolContext, VariableContext,LiteralContext,OptListContext,ParamContext,ParamListContext,ProgramContext, BlockContext,PipeActionsContext, SingleActionContext,
  SingleExpressionContext,IfelseStatementContext, ElifStatementContext,ElseStatementContext,IfStatementContext , StatementContext,NamedFnContext, ActionContext, AnonFnContext, OptContext, ArrayLiteralContext} from './grammar/RPScriptParser';

import {ParseTreeProperty} from 'antlr4ts/tree';
import {RPScriptParser} from '../antlr/grammar/RPScriptParser';

import {KeywordsMgr} from '../core/keywordsmgr';
import {Runner} from '../core/runner';
import { InvalidKeywordException } from "./InvalidKeywordException";

export interface TranspileContent {
  mainContent?:string;
  fnContent?:string;
  fullContent?:string;
  verbs?:string[];
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
    let evt = params[2];
    if(evt === 'end') $CONTEXT.$RESULT = params[3];

    module.exports.emit('action',params);
});
setTimeout(main, 100);
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
      mainContent:"", fullContent:"",fnContent:"",verbs:[]
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
    if(this.hasFnParent(ctx.parent)) this.scope = "function";
    else this.scope = "root";
  }

  public exitPipeActions(ctx:PipeActionsContext) : void {
    
    let firstActionContext = this.parseTreeProperty.get(ctx.action()[0]);
    let secActionContext = this.parseTreeProperty.get(ctx.action()[1]);

    let content = '\t'+secActionContext.replace(')', ', '+firstActionContext) + ');\n';
    
    if(this.hasActionParent(ctx)) this.parseTreeProperty.set(ctx,content);
    else this.appendToScope(content);
  }

  public exitIfelseStatement(ctx:IfelseStatementContext) : void {
    let ifText = this.parseTreeProperty.get(ctx.ifStatement());
    let elIfText:string[] = R.map(elIf => this.parseTreeProperty.get(elIf) , ctx.elifStatement());
    let elseText = ctx.elseStatement() ? this.parseTreeProperty.get(ctx.elseStatement()) : '';

    let fullText = ifText + elIfText.join('\n') + elseText;

    this.parseTreeProperty.set(ctx,fullText);
  }
  public enterIfStatement(ctx:IfStatementContext) : void {
    let content = `\n\tif(${ctx.singleExpression().text} ){\n`;
   
    if(this.hasActionParent(ctx)) this.parseTreeProperty.set(ctx,content);    
    else this.appendToScope(content);
  }
  public exitIfStatement(ctx:IfStatementContext) : void {
    let content = this.parseExitProperty(ctx,ctx.statementList().statement());

    if(this.hasActionParent(ctx)) this.parseTreeProperty.set(ctx,content);
    else this.appendToScope(`\t}`);
  }

  private parseExitProperty (ctx:ParserRuleContext, childrenList:ParserRuleContext[]) : string{
    let anon = this.parseTreeProperty.get(ctx);

    let sList:string[] = R.map(child => {
      return this.parseTreeProperty.get(child);
    }, childrenList);
    
    let content = anon + sList.join('\n') + '\n}';
    return content;
  }

  public enterElifStatement(ctx:ElifStatementContext) : void {
    let content = `\n\telse if(${ctx.singleExpression().text} ){\n`;

    if(this.hasActionParent(ctx)) this.parseTreeProperty.set(ctx,content);    
    else this.appendToScope(`\t}`);
  }
  public exitElifStatement(ctx:ElifStatementContext) : void {
    let content = this.parseExitProperty(ctx,ctx.statementList().statement());

    if(this.hasActionParent(ctx)) this.parseTreeProperty.set(ctx,content);
    else this.appendToScope(`\t}`);
  }
  public enterElseStatement(ctx:ElseStatementContext) : void {
    let content = `\n\telse{\n`;

    if(this.hasActionParent(ctx)) this.parseTreeProperty.set(ctx,content);    
    else this.appendToScope(content);
  }
  public exitElseStatement(ctx:ElseStatementContext) : void {
    let content = this.parseExitProperty(ctx,ctx.statementList().statement());

    if(this.hasActionParent(ctx)) this.parseTreeProperty.set(ctx,content);
    else this.appendToScope(`\t}`);
  }

  public enterNamedFn(ctx:NamedFnContext) : void {
    let vars = R.map(v=>v.text, ctx.variable());
    
    this.content.fnContent += `\nasync function ${ctx.WORD().text} (${vars}){\n`;
  }
  public exitNamedFn(ctx:NamedFnContext) : void {
    if(!this.lastContentWithSemiCon(this.content.fnContent)) this.content.fnContent += ';';
    this.content.fnContent += '\treturn $CONTEXT.$RESULT;\n';
    this.content.fnContent += '\n}';
  }
  public enterExeFn(ctx:ExeFnContext) : void {
    let vars = R.map(v=>{
      if(v.variable()) return this.parseVar(v.variable());
      else return v.text;
    }, ctx.param());

    let content = `\n\tawait ${ctx.WORD().text}(${vars});\n`;
    
    if(this.hasActionParent(ctx)) this.parseTreeProperty.set(ctx,content);
    else this.appendToScope(content);
  }

  public enterStatement(ctx:StatementContext) : void {}
  public exitStatement(ctx:StatementContext) : void {
    if(!!ctx.singleAction()){
      let action = this.parseTreeProperty.get(ctx.singleAction().action());
      this.parseTreeProperty.set(ctx,action);
    }
    else if(!!ctx.ifelseStatement()){
      let context = this.parseTreeProperty.get(ctx.ifelseStatement());
      this.parseTreeProperty.set(ctx,context);
    }
    else if(!!ctx.exeFn()){
      let context = this.parseTreeProperty.get(ctx.exeFn());
      this.parseTreeProperty.set(ctx,context);
    }
    else if(!!ctx.pipeActions()){
      let context = this.parseTreeProperty.get(ctx.pipeActions());
      this.parseTreeProperty.set(ctx,context);
    }
  }

  public enterAction(ctx:ActionContext) : void {
    if(!this.keywordMgr.isValidKeyword(ctx.WORD().text))
      throw new InvalidKeywordException(ctx);

    this.content.verbs.push(ctx.WORD().text.trim());
    
    this.parseTreeProperty.set(ctx,`\t${ctx.WORD().text}`);
  }
  public exitAction(ctx:ActionContext) : void {
    let keyword = this.parseTreeProperty.get(ctx);

    let pList:string[] = R.map(param => {
      return this.parseTreeProperty.get(param.getChild(0));
    },ctx.paramList().param());

    let opt = this.parseOpt(ctx.optList().opt());

    let joinList = pList.join(' , ');

    // if(keyword.split('.').length>1){
    //   this.parseTreeProperty.set(ctx,`${keyword.trim()}( $CONTEXT , ${opt} , ${joinList})`);
    // }else
    if(joinList)
      this.parseTreeProperty.set(ctx,`await api("${keyword.trim()}" , $CONTEXT , ${opt} , ${joinList})`);
    else
      this.parseTreeProperty.set(ctx,`await api("${keyword.trim()}" , $CONTEXT , ${opt} )`);

    if(!this.hasActionParent(ctx)){
      let content = "\t"+this.parseTreeProperty.get(ctx)+";\n";

      if(this.hasPipeParent(ctx)) {} //skip
      else if(this.hasFnParent(ctx)) this.content.fnContent += content;
      else  this.content.mainContent += content;

    }
  }
  // literal | variable | anonFn | symbol | action;
  public enterLiteral(ctx:LiteralContext) : void {
    this.parseTreeProperty.set(ctx,`${ctx.text}`);
  }
  public exitLiteral(ctx:LiteralContext) : void {
  }
  public enterVariable(ctx:VariableContext) : void {
    let variable = this.parseVar(ctx);

    this.parseTreeProperty.set(ctx,`${variable}`);
  }
  public exitVariable(ctx:VariableContext) : void {
  }
  public enterSymbol(ctx:SymbolContext) : void {
    this.parseTreeProperty.set(ctx,`${ctx.text}`);
  }
  public exitSymbol(ctx:SymbolContext) : void {
  }
  public enterAnonFn(ctx:AnonFnContext) : void{
    let vars = R.map(v=>v.text, ctx.variable());

    this.parseTreeProperty.set(ctx,`async function (${vars}){\n`);
  }
  public exitAnonFn(ctx:AnonFnContext) : void{
    let anon = this.parseTreeProperty.get(ctx);

    let sList:string[] = R.map(statement => {

      return this.parseTreeProperty.get(statement);
    }, ctx.block().statementList().statement());

    
    let content = anon + sList.join('\n');
    
    if(!this.lastContentWithSemiCon(this.content.fnContent)) content += ';';
    content += '\treturn $CONTEXT.$RESULT;\n';
    content += '\n}';
    
    this.parseTreeProperty.set(ctx,content);
  }

  public enterSingleExpression(ctx:SingleExpressionContext) : void {
    this.parseTreeProperty.set(ctx,ctx.text);
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
    return this.hasParent(ctx,'NamedFnContext') || this.hasParent(ctx,'AnonFnContext');
  }
  private hasPipeParent(ctx:ParserRuleContext) : boolean{
    return this.hasParent(ctx,'PipeActionsContext');
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
        let text = x.literal().StringLiteral() ? x.literal().StringLiteral().text.replace(/["']/g,'') : x.literal().text;
        
        obj[x.optName().text] = text;
    } , opts);

    return JSON.stringify(obj);
  }

  private parseVar (ctx:VariableContext) :string {
    let variable = ctx.text;
    if(ctx.text.trim().startsWith('$RESULT')) variable = '$CONTEXT.'+variable;
    else if(!this.hasFnParent(ctx))variable = '$CONTEXT.variables.'+variable;

    return variable;
  }


  private appendToScope (content:string) : void{
    if(this.scope === 'root') this.content.mainContent += content;
    else this.content.fnContent += content;
  }

  private lastContentWithSemiCon (content:string) : boolean {
    let temp = content.trim();
    let lastchar = temp[ temp.length - 1 ];

    if(lastchar===';')return true;
    else return false;
  }
}
